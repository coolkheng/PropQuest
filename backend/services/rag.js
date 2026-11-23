// RAG: helpers that turn retrieved listings into compact context for the model.
const { ObjectId } = require("mongodb");

// Caps that keep the prompt (and cost) roughly flat per message.
const RAG_TOP_N = 8; // listings sent to the model in detail
const RAG_DETAILS_CHARS = 400; // characters of each listing's description
const RAG_HISTORY_MESSAGES = 4; // earlier chat messages sent with a follow-up
const RAG_HISTORY_CHARS = 800; // max characters per history message

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function toNumber(v) {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Summary numbers over ALL results, computed in code so the model can't get them wrong.
function buildStats(results) {
  const prices = results.map((p) => toNumber(p.price)).filter((n) => n > 0);
  const psfs = results.map((p) => toNumber(p.psf)).filter((n) => n > 0);
  const byType = {};
  results.forEach((p) => {
    const t = p.house_type || "Unknown";
    byType[t] = (byType[t] || 0) + 1;
  });
  return {
    total_matches: results.length,
    price: prices.length
      ? { min: Math.min(...prices), median: median(prices), max: Math.max(...prices) }
      : null,
    median_psf: median(psfs),
    by_type: byType,
  };
}

// Pick the listings to show the model in detail: best value (lowest price per sqft).
// Every result already matches the user's filters (budget included), so value is the
// most useful tie-breaker. Listings without a valid psf go last.
function sortByValue(results) {
  const psf = (p) => toNumber(p.psf) || Infinity;
  return [...results].sort((a, b) => psf(a) - psf(b));
}

// Trimmed listing for the prompt: key facts only, no images/urls.
function toContextItem(doc) {
  const details = String(doc.details || "").replace(/\s+/g, " ").trim();
  return {
    id: String(doc._id),
    title: doc.title,
    address: doc.address,
    price: toNumber(doc.price),
    beds: doc.beds,
    baths: doc.baths,
    sqft: toNumber(doc.sqft),
    psf: toNumber(doc.psf),
    house_type: doc.house_type,
    furnishing: doc.furnishing,
    lease_type: doc.lease_type,
    facilities: Array.isArray(doc.facilities) ? doc.facilities : [],
    date_listed: String(doc.date_listed || "").replace(/^Listed on\s*/i, ""),
    details:
      details.length > RAG_DETAILS_CHARS
        ? details.slice(0, RAG_DETAILS_CHARS) + "…"
        : details,
    price_history: Array.isArray(doc.historical_prices)
      ? doc.historical_prices.slice(0, 3).map((h) => ({ date: h.date, price: h.price }))
      : [],
  };
}

// Compact preview card for the chat UI: listing facts from the doc + AI badge/highlights.
function toCard(doc, rec) {
  return {
    id: String(doc._id),
    title: doc.title,
    image: Array.isArray(doc.images) && doc.images[0] ? doc.images[0] : null,
    price: toNumber(doc.price),
    psf: toNumber(doc.psf),
    beds: doc.beds ?? null,
    baths: doc.baths ?? null,
    sqft: toNumber(doc.sqft),
    badge: rec.badge,
    highlights: rec.highlights,
  };
}

// Only keep the last few user/assistant text messages; never trust the client to cap it.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .slice(-RAG_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, RAG_HISTORY_CHARS) }));
}

// Load listings by id (for follow-ups), keeping the order the user saw them in.
async function findPropertiesByIds(db, ids) {
  const clean = ids.filter((id) => typeof id === "string").slice(0, RAG_TOP_N);
  const objectIds = clean.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const docs = await db
    .collection("properties20Jan")
    .find({ _id: { $in: [...objectIds, ...clean] } })
    .toArray();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

// Debug: print exactly what is sent to the model and how big each part is.
// Tokens are estimated as chars / 4; compare with "RAG token usage" (the real count) logged after the call.
function logContextSize(messages, data, question) {
  const size = (v) => {
    const chars = (typeof v === "string" ? v : JSON.stringify(v ?? "")).length;
    return { chars, tokens: Math.ceil(chars / 4) };
  };
  const rows = [];
  messages.forEach((m, i) => {
    if (i === 0) rows.push({ part: "system prompt", ...size(m.content) });
    else if (i < messages.length - 1)
      rows.push({ part: `history[${i - 1}] (${m.role})`, ...size(m.content) });
  });
  if (data.filters) rows.push({ part: "DATA.filters", ...size(data.filters) });
  rows.push({ part: "DATA.stats", ...size(data.stats) });
  data.listings.forEach((l, i) =>
    rows.push({ part: `DATA.listings[${i}] ${String(l.title || "").slice(0, 30)}`, ...size(l) }),
  );
  rows.push({ part: "QUESTION", ...size(question) });
  const total = size(messages.map((m) => m.content).join(""));

  console.log("\n===== RAG context sent to the model =====");
  console.log(
    JSON.stringify(
      messages.map((m, i) =>
        i === messages.length - 1 ? { role: m.role, content: { DATA: data, QUESTION: question } } : m,
      ),
      null,
      2,
    ),
  );
  console.log("----- size breakdown (≈ tokens = chars / 4) -----");
  console.table(rows);
  console.log(`TOTAL ≈ ${total.chars} chars ≈ ${total.tokens} tokens in ${messages.length} messages`);
  console.log("=========================================\n");
}

module.exports = {
  logContextSize,
  RAG_TOP_N,
  RAG_DETAILS_CHARS,
  RAG_HISTORY_MESSAGES,
  RAG_HISTORY_CHARS,
  median,
  toNumber,
  buildStats,
  sortByValue,
  toContextItem,
  toCard,
  sanitizeHistory,
  findPropertiesByIds,
};
