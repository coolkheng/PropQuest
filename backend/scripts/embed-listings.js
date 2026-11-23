// Embeds every listing in properties20Jan with the self-hosted model and stores the
// vectors in listing_embeddings (one doc per listing), then makes sure the Atlas
// vector search index exists. Safe to re-run: unchanged listings are skipped.
//
//   npm run embed                       embed new/changed listings + ensure the index
//   npm run embed -- --preview 5        show raw vs cleaned text, no model call, no writes
//   npm run embed -- --force            re-embed everything
//   npm run embed -- --test "near LRT"  run a vector search and print the top 5
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { connectToDatabase, client } = require("../config/db");
const {
  LISTINGS_COLLECTION,
  EMBEDDINGS_COLLECTION,
  VECTOR_INDEX,
  serviceInfo,
  embed,
  buildEmbeddingText,
  textHash,
} = require("../services/embeddings");

const BATCH_SIZE = 64;
const INDEX_WAIT_MS = 5 * 60 * 1000;
const LISTING_FIELDS = {
  title: 1, address: 1, house_type: 1, lease_type: 1, furnishing: 1, facilities: 1, details: 1,
};

function parseArgs(argv) {
  const args = { preview: null, force: false, test: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--preview") {
      const n = Number(argv[i + 1]);
      args.preview = Number.isInteger(n) && n > 0 ? (i++, n) : 5;
    } else if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--test") args.test = argv[++i] || "near LRT station";
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- --preview ----------

async function preview(db, n) {
  const docs = await db
    .collection(LISTINGS_COLLECTION)
    .aggregate([{ $sample: { size: n } }, { $project: LISTING_FIELDS }])
    .toArray();
  for (const doc of docs) {
    console.log("\n" + "=".repeat(80));
    console.log(`RAW details (${String(doc.details || "").length} chars):`);
    console.log(String(doc.details || "").slice(0, 800));
    const text = buildEmbeddingText(doc);
    console.log(`\nEMBEDDED text (${text.length} chars):`);
    console.log(text);
  }
}

// ---------- vector index ----------

async function ensureVectorIndex(collection, dimensions) {
  const existing = await collection.listSearchIndexes(VECTOR_INDEX).toArray();
  if (existing.length) {
    const vectorField = existing[0].latestDefinition?.fields?.find((f) => f.type === "vector");
    if (vectorField && vectorField.numDimensions !== dimensions) {
      console.warn(
        `⚠ ${VECTOR_INDEX} has ${vectorField.numDimensions} dimensions but the model gives ${dimensions}. ` +
          "Drop the index in Atlas and run this script again.",
      );
      return existing[0];
    }
  } else {
    console.log(`Creating vector search index "${VECTOR_INDEX}" (${dimensions} dims, cosine)…`);
    await collection.createSearchIndex({
      name: VECTOR_INDEX,
      type: "vectorSearch",
      definition: {
        fields: [
          { type: "vector", path: "embedding", numDimensions: dimensions, similarity: "cosine" },
          { type: "filter", path: "_id" },
        ],
      },
    });
  }

  const start = Date.now();
  while (Date.now() - start < INDEX_WAIT_MS) {
    const [index] = await collection.listSearchIndexes(VECTOR_INDEX).toArray();
    if (index?.queryable) return index;
    process.stdout.write(`  index status: ${index?.status || "pending"}…\r`);
    await sleep(5000);
  }
  console.warn(`\n⚠ ${VECTOR_INDEX} is not queryable yet. Check its status in Atlas → Search.`);
  const [index] = await collection.listSearchIndexes(VECTOR_INDEX).toArray();
  return index;
}

// ---------- --test ----------

async function testQuery(db, query) {
  const [queryVector] = await embed([query], "query");
  const results = await db
    .collection(EMBEDDINGS_COLLECTION)
    .aggregate([
      { $vectorSearch: { index: VECTOR_INDEX, path: "embedding", queryVector, numCandidates: 200, limit: 5 } },
      { $project: { text: 1, score: { $meta: "vectorSearchScore" } } },
    ])
    .toArray();
  console.log(`\nTop ${results.length} for "${query}":`);
  results.forEach((r, i) =>
    console.log(`${i + 1}. [${r.score.toFixed(4)}] ${String(r.text).slice(0, 160)}…`),
  );
}

// ---------- default run ----------

async function run(db, { force }) {
  const info = await serviceInfo();
  console.log(`Embedding service: ${info.model} (${info.dimensions} dims, ${info.device})`);

  const listings = db.collection(LISTINGS_COLLECTION);
  const embeddings = db.collection(EMBEDDINGS_COLLECTION);

  const existing = new Map();
  for await (const e of embeddings.find({}, { projection: { text_hash: 1, model: 1 } })) {
    existing.set(String(e._id), e);
  }

  const queue = [];
  const listingIds = [];
  let unchanged = 0;
  let empty = 0;
  for await (const doc of listings.find({}, { projection: LISTING_FIELDS })) {
    listingIds.push(doc._id);
    const text = buildEmbeddingText(doc);
    if (!text) {
      empty++;
      continue;
    }
    const hash = textHash(text);
    const prev = existing.get(String(doc._id));
    if (!force && prev && prev.text_hash === hash && prev.model === info.model) {
      unchanged++;
      continue;
    }
    queue.push({ _id: doc._id, text, hash });
  }
  console.log(
    `${listingIds.length} listings: ${queue.length} to embed, ${unchanged} unchanged, ${empty} without text.`,
  );

  const start = Date.now();
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const vectors = await embed(batch.map((b) => b.text), "document");
    const now = new Date();
    await embeddings.bulkWrite(
      batch.map((b, j) => ({
        replaceOne: {
          filter: { _id: b._id },
          replacement: {
            embedding: vectors[j],
            text: b.text,
            text_hash: b.hash,
            model: info.model,
            dimensions: info.dimensions,
            updatedAt: now,
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    const done = Math.min(i + BATCH_SIZE, queue.length);
    const secs = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(`  embedded ${done}/${queue.length} (${secs}s)\r`);
  }
  if (queue.length) console.log(`\nEmbedded ${queue.length} listings in ${((Date.now() - start) / 1000).toFixed(1)}s.`);

  const { deletedCount } = await embeddings.deleteMany({ _id: { $nin: listingIds } });
  if (deletedCount) console.log(`Removed ${deletedCount} embeddings of deleted listings.`);

  const index = await ensureVectorIndex(embeddings, info.dimensions);
  const total = await embeddings.countDocuments();

  console.log("\nSummary");
  console.table({
    embedded: queue.length,
    unchanged,
    "skipped (no text)": empty,
    "orphans removed": deletedCount,
    "total in listing_embeddings": total,
    [`${VECTOR_INDEX}`]: index ? `${index.status}${index.queryable ? " (queryable)" : ""}` : "missing",
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = await connectToDatabase();
  try {
    if (args.preview) await preview(db, args.preview);
    else if (args.test) await testQuery(db, args.test);
    else await run(db, args);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("\n✖", error.message);
  process.exit(1);
});
