// Embeddings: client for the self-hosted embedding service (embedding-service/, Python)
// and the text we embed for each listing.
const crypto = require("crypto");

const EMBEDDING_SERVICE_URL = (process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
const LISTINGS_COLLECTION = "properties20Jan";
const EMBEDDINGS_COLLECTION = "listing_embeddings";
const VECTOR_INDEX = "listing_vector_index";
const MAX_TEXT_CHARS = 1500; // stays under the model's 512-token limit
const REQUEST_TIMEOUT_MS = 60000;

// ---------- Service client ----------

async function callService(path, options = {}) {
  let res;
  try {
    res = await fetch(`${EMBEDDING_SERVICE_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `Embedding service not reachable at ${EMBEDDING_SERVICE_URL} (${error.cause?.code || error.name}). ` +
        "Start it with: embedding-service/.venv/Scripts/python -m uvicorn app:app --app-dir embedding-service --port 8000",
    );
  }
  if (!res.ok) {
    throw new Error(`Embedding service ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// { model, dimensions, device }
function serviceInfo() {
  return callService("/health");
}

// Returns one normalized vector per text. type: "document" for listings, "query" for searches.
async function embed(texts, type = "document") {
  const data = await callService("/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, type }),
  });
  return data.embeddings;
}

// ---------- Listing text ----------

// Sentences about contacting agents add noise, not meaning: drop them whole.
const DROP_SENTENCE = new RegExp(
  [
    "contact", "\\bcall", "whatsapp", "wasap", "\\bwa\\b", "\\bsms\\b", "\\bpm\\b", "hotline",
    "viewing", "view today", "appointment", "enquir", "inquir", "interested",
    "\\bren\\s?\\d", "\\bpea\\b", "agent", "agency", "negotiator", "realty", "list with us",
    "https?:", "www\\.", "@", "\\bzero\\b",
    "\\d{2,4}[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}", // phone numbers like 012-345 6789 or 018.2671 313
  ].join("|"),
  "i",
);

// Price talk is removed inline (it often sits in the same glued run as real facts).
const PRICE_FRAGMENTS = [
  /\b(asking|selling|sale|sales|nett?|offer)?\s*price\s*[:\-]?\s*/gi,
  /\basking\b\s*:?/gi,
  /\brm\s?[\d.,]+\s*(k|mil(lion)?|m)?/gi, // no trailing \b: amounts are often glued ("RM900k3%")
  /\b[\d.]+\s?(mil(lion)?)\b/gi,
  /\bmarket value\s*:?|\bmv\s*:?\s*/gi,
  /\(?nego(tiable)?(?![a-z])\)?/gi,
  /\(\s*(cost|only)?\s*\)/gi,
];

function cleanDetails(raw) {
  let t = String(raw || "")
    .replace(/\[contact hidden\]/gi, " ")
    .replace(/\r/g, "\n")
    .replace(/whats\s?app/gi, "whatsapp") // keep the word whole before splitting glued words
    .replace(/\bsq\.?\s?ft\.?/gi, "sqft");

  t = t
    // Separator runs and pipes become sentence breaks.
    .replace(/[=_#|]{1,}/g, ". ")
    // Glued sentences: "renovated.Freehold" -> "renovated. Freehold" (decimals like 1.2 stay intact).
    .replace(/([A-Za-z)\]'"])([.!?])(?=[A-Za-z0-9])/g, "$1$2 ")
    // Glued words: "bedroomNestled" -> "bedroom. Nestled", "SaleASKING" -> "Sale. ASKING".
    .replace(/([a-z])(?=[A-Z][a-z]|[A-Z]{2,})/g, "$1. ")
    // Bullet markers become sentence breaks: *, •, ~, "- x", "park-Renovated", "sqft-2".
    // Hyphens inside words (semi-detached, 2-storey) stay.
    .replace(/\s*[*•~]+\s*/g, ". ")
    .replace(/(^|\s)-+\s*(?=[\dA-Za-z])/g, ". ")
    .replace(/([A-Za-z])-+\s+/g, "$1. ")
    .replace(/(?<![Ss]emi)([a-z)])-(?=[A-Z][a-z]|\d)/g, "$1. ");

  // Price talk, removed after glued words are split so its leftovers don't stick to facts.
  for (const re of PRICE_FRAGMENTS) t = t.replace(re, " ");
  t = t.replace(/\s+([,.;:])/g, "$1").replace(/([,;:])(\s*[,;:])+/g, "$1");

  const seen = new Set();
  const sentences = t
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").replace(/^[\s.,;:!?-]+|[\s.,;:]+$/g, "").trim())
    .filter((s) => s.length > 2 && !DROP_SENTENCE.test(s))
    .filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return sentences.map((s) => (/[.!?]$/.test(s) ? s : `${s}.`)).join(" ");
}

function present(v) {
  const s = String(v ?? "").trim();
  return s && !/^(n\/a|-|null|undefined)$/i.test(s) ? s : null;
}

// The text we embed for one listing. Price, psf, beds, baths and sqft are left out on
// purpose: the MongoDB filters handle numbers exactly, embeddings handle them poorly.
function buildEmbeddingText(doc) {
  const facts = [];
  const title = present(doc.title);
  if (title) facts.push(title);
  const type = present(doc.house_type);
  const address = present(doc.address)?.replace(/,\s*,/g, ",");
  if (type || address) facts.push([type, address && `in ${address}`].filter(Boolean).join(" "));
  if (present(doc.lease_type)) facts.push(present(doc.lease_type));
  if (present(doc.furnishing)) facts.push(present(doc.furnishing));
  const facilities = Array.isArray(doc.facilities) ? doc.facilities.map(present).filter(Boolean) : [];
  if (facilities.length) facts.push(`Facilities: ${facilities.join(", ")}`);

  const text = [facts.map((f) => `${f}.`).join(" "), cleanDetails(doc.details)]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (text.length <= MAX_TEXT_CHARS) return text;
  const cut = text.slice(0, MAX_TEXT_CHARS);
  return cut.slice(0, cut.lastIndexOf(" ")).trim();
}

// ---------- Semantic ranking (hybrid search) ----------

// Ranks the candidate listings (already filtered by MongoDB) by how close their text is
// to the user's description. Returns [{ id, score }] best first, at most k.
// Atlas Search allows at most 1024 values in one $in filter, so big candidate sets are
// searched in chunks and the scores merged. Each chunk is exact, so the result is exact.
const FILTER_CHUNK = 1000;

async function semanticRank(db, query, candidateIds, k = 50) {
  if (!query || !candidateIds.length) return [];
  const [queryVector] = await embed([query], "query");
  const collection = db.collection(EMBEDDINGS_COLLECTION);

  const chunks = [];
  for (let i = 0; i < candidateIds.length; i += FILTER_CHUNK) {
    chunks.push(candidateIds.slice(i, i + FILTER_CHUNK));
  }
  const perChunk = await Promise.all(
    chunks.map((ids) =>
      collection
        .aggregate([
          {
            $vectorSearch: {
              index: VECTOR_INDEX,
              path: "embedding",
              queryVector,
              filter: { _id: { $in: ids } },
              exact: true, // compare against every candidate; fine at a few thousand docs
              limit: Math.min(k, ids.length),
            },
          },
          { $project: { _id: 1, score: { $meta: "vectorSearchScore" } } },
        ])
        .toArray(),
    ),
  );

  return perChunk
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => ({ id: String(r._id), score: r.score }));
}

function textHash(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

module.exports = {
  EMBEDDING_SERVICE_URL,
  LISTINGS_COLLECTION,
  EMBEDDINGS_COLLECTION,
  VECTOR_INDEX,
  serviceInfo,
  embed,
  cleanDetails,
  buildEmbeddingText,
  textHash,
  semanticRank,
};
