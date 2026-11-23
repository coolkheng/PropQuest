// Chat orchestration: AI calls (classify, extract filters, answer) and the
// per-message flow that uses server-side session memory.
const { openai, OPENAI_MODEL } = require("../config/openai");
const { parseFilters, searchProperties } = require("./propertySearch");
const {
  RAG_TOP_N,
  buildStats,
  sortByValue,
  toContextItem,
  toCard,
  findPropertiesByIds,
  logContextSize,
} = require("./rag");
const memory = require("./memory");
const { semanticRank } = require("./embeddings");
const {
  RAG_ANSWER_TEXT,
  INTENT_CLASSIFICATION_TEXT,
  FOLLOWUP_CLASSIFICATION_TEXT,
  QUESTION_TEXT,
  FILTER_EXTRACTION_TEXT,
} = require("../prompts/chat.prompts");

const MAX_CARDS = 3;
const SEMANTIC_K = 50; // how many of the filter matches get ranked by meaning

const UNKNOWN_REPLY =
  "Sorry, I couldn't process your request. Could you please rephrase with more specific words?";

const FILTER_FIELDS = {
  price_min: { type: "integer", nullable: true },
  price_max: { type: "integer", nullable: true },
  location: { type: "string", nullable: true },
  beds_min: { type: "integer", nullable: true },
  baths_min: { type: "integer", nullable: true },
  sqft_min: { type: "integer", nullable: true },
  sqft_max: { type: "integer", nullable: true },
  house_type: { type: "string", nullable: true },
  lease_type: { type: "string", nullable: true },
  furnishing: { type: "string", nullable: true },
  facilities: { type: "array", items: { type: "string" }, nullable: true },
  // Descriptive wishes with no field ("quiet, near LRT"): ranked by embeddings, not filtered.
  semantic_query: { type: "string", nullable: true },
};

// ---------- AI calls ----------

async function classifyIntent(message, { hasResults, lastAssistantMessage } = {}) {
  const intents = hasResults
    ? ["search", "question", "followup", "unknown"]
    : ["search", "question", "unknown"];
  const messages = [
    {
      role: "system",
      content: INTENT_CLASSIFICATION_TEXT + (hasResults ? FOLLOWUP_CLASSIFICATION_TEXT : ""),
    },
  ];
  // The last AI reply helps tell "which one is cheapest?" (follow-up) from a new search.
  if (hasResults && typeof lastAssistantMessage === "string") {
    messages.push({ role: "assistant", content: lastAssistantMessage.slice(0, 500) });
  }
  messages.push({ role: "user", content: message });

  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    reasoning_effort: "none", // reasoning off: required for temperature, and keeps replies fast/cheap
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intent_classification",
        schema: {
          type: "object",
          properties: { intent: { type: "string", enum: intents } },
          required: ["intent"],
          additionalProperties: false,
        },
      },
    },
    max_completion_tokens: 20,
    temperature: 0,
  });
  const { intent } = JSON.parse(res.choices[0].message.content);
  return intents.includes(intent) ? intent : "unknown";
}

// Drops nulls, empty strings and empty arrays so only real filters are kept.
function cleanFilters(raw) {
  const out = {};
  for (const key of Object.keys(FILTER_FIELDS)) {
    const v = raw?.[key];
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[key] = v;
  }
  return out;
}

// Returns { filters, reset }. With current filters, "cheaper" refines the search.
async function extractFilters(message, currentFilters = {}, currentStats = null) {
  const hasCurrent = currentFilters && Object.keys(currentFilters).length > 0;
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    reasoning_effort: "none",
    messages: [
      { role: "system", content: FILTER_EXTRACTION_TEXT },
      {
        role: "user",
        content:
          `CURRENT_FILTERS: ${JSON.stringify(hasCurrent ? currentFilters : {})}\n` +
          `CURRENT_STATS: ${JSON.stringify(hasCurrent ? currentStats : null)}\n` +
          `MESSAGE: ${message}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "property_filters",
        schema: {
          type: "object",
          properties: { reset: { type: "boolean" }, ...FILTER_FIELDS },
          additionalProperties: false,
          required: ["reset"],
        },
      },
    },
    max_completion_tokens: 250,
    temperature: 0.3,
  });
  const parsed = JSON.parse(res.choices[0].message.content);
  const reset = !hasCurrent || parsed.reset !== false;
  return { filters: cleanFilters(parsed), reset };
}

async function generateRagAnswer({ history = [], data, message }) {
  const messages = [
    { role: "system", content: RAG_ANSWER_TEXT },
    ...history,
    { role: "user", content: `DATA:\n${JSON.stringify(data)}\n\nQUESTION: ${message}` },
  ];
  logContextSize(messages, data, message);

  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    reasoning_effort: "none",
    messages,
    max_completion_tokens: 700,
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "rag_answer",
        strict: true,
        schema: {
          type: "object",
          properties: {
            reply: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  badge: { type: "string" },
                  highlights: { type: "array", items: { type: "string" } },
                },
                required: ["id", "badge", "highlights"],
                additionalProperties: false,
              },
            },
          },
          required: ["reply", "recommendations"],
          additionalProperties: false,
        },
      },
    },
  });
  const { reply, recommendations } = JSON.parse(res.choices[0].message.content);

  // Only keep listings that were actually in the context; trim to card size.
  const contextIds = new Set(data.listings.map((l) => l.id));
  const seen = new Set();
  const recs = (recommendations || [])
    .filter((r) => r && contextIds.has(r.id) && !seen.has(r.id) && seen.add(r.id))
    .slice(0, MAX_CARDS)
    .map((r) => ({
      id: r.id,
      badge: String(r.badge || "").trim().slice(0, 24),
      highlights: (r.highlights || [])
        .map((h) => String(h).trim())
        .filter(Boolean)
        .slice(0, 3),
    }));
  return { reply, recommendations: recs, recommended_ids: recs.map((r) => r.id) };
}

// Preview cards for the recommended listings, built from docs already loaded.
function buildCards(recommendations, docs) {
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return recommendations
    .map((r) => (byId.has(r.id) ? toCard(byId.get(r.id), r) : null))
    .filter(Boolean);
}

async function answerQuestion(message, history = []) {
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    reasoning_effort: "none",
    messages: [{ role: "system", content: QUESTION_TEXT }, ...history, { role: "user", content: message }],
    max_completion_tokens: 200,
    temperature: 0.7,
  });
  return res.choices[0].message.content;
}

// ---------- Retrieval ----------

// Same development is often posted by several agents; keep one per title in the top list.
function pickTop(results, n) {
  const titleKey = (p) => String(p.title || p._id).toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set();
  const unique = [];
  const repeats = [];
  for (const p of results) {
    const key = titleKey(p);
    (seen.has(key) ? repeats : unique).push(p);
    seen.add(key);
    if (unique.length === n) break;
  }
  return [...unique, ...repeats].slice(0, n); // fall back to repeats only if too few titles
}

// Hybrid retrieval: MongoDB filters decide WHICH listings match (hard rules), then the
// embeddings decide the ORDER when the user described something ("quiet, near LRT").
// Without a description, or if the embedding service is down, order by value (psf).
async function runSearch(db, filters) {
  const matches = await searchProperties(db, parseFilters(filters));
  let results = sortByValue(matches);
  const relevance = new Map();

  const query = filters?.semantic_query;
  if (query && matches.length) {
    try {
      const ranked = await semanticRank(db, query, matches.map((p) => p._id), SEMANTIC_K);
      ranked.forEach((r) => relevance.set(r.id, r.score));
      const rankedIds = new Set(ranked.map((r) => r.id));
      const byId = new Map(matches.map((p) => [String(p._id), p]));
      results = [
        ...ranked.map((r) => byId.get(r.id)).filter(Boolean),
        ...results.filter((p) => !rankedIds.has(String(p._id))),
      ];
      console.log(`Semantic ranking "${query}": ${ranked.length} of ${matches.length} matches ranked`);
    } catch (error) {
      console.warn(`Semantic ranking skipped, ordering by value: ${error.message}`);
    }
  }

  return { results, top: pickTop(results, RAG_TOP_N), relevance };
}

// Listing context for the answer model, with the semantic score when there is one.
function contextItems(top, relevance) {
  return top.map((p) => {
    const item = toContextItem(p);
    const score = relevance?.get(String(p._id));
    return score == null ? item : { ...item, relevance: Math.round(score * 100) / 100 };
  });
}

// ---------- Per-message flow (POST /api/chat/message) ----------

async function handleMessage(db, { sessionId, message, user }) {
  const session = await memory.getOrCreateSession(db, sessionId, user);
  const state = { ...memory.emptyState(), ...(session.state || {}) };
  const history = memory.recentMessages(session);

  // 1. Classify
  let intent;
  try {
    intent = await classifyIntent(message, {
      hasResults: state.resultIds.length > 0,
      lastAssistantMessage: memory.lastAssistantMessage(session),
    });
  } catch (error) {
    console.error("Classify error:", error?.response?.data || error);
    intent = "unknown";
  }

  let reply;
  let recommendedIds = [];
  let cards = [];
  let fallback = false;
  let properties;
  let statePatch = { lastIntent: intent };
  let responseStats = state.stats;
  let responseFilters = state.filters;

  if (intent === "search") {
    // 2a. Extract filters (refine or reset) and retrieve
    let extracted;
    try {
      extracted = await extractFilters(message, state.filters, state.stats);
    } catch (error) {
      console.error("Filter extraction error:", error?.response?.data || error);
    }

    if (!extracted) {
      reply = "Sorry, I couldn't understand that search. Please try again.";
      fallback = true;
    } else {
      const { filters, reset } = extracted;
      console.log(`Filters (${reset ? "new search" : "refine"}):`, filters);
      const { results, top, relevance } = await runSearch(db, filters);
      const stats = buildStats(results);
      properties = results;
      responseStats = stats;
      responseFilters = filters;
      statePatch = {
        ...statePatch,
        filters,
        resultIds: top.map((p) => String(p._id)),
        stats,
      };

      try {
        const answer = await generateRagAnswer({
          history,
          data: { filters, stats, listings: contextItems(top, relevance) },
          message,
        });
        ({ reply, recommended_ids: recommendedIds } = answer);
        cards = buildCards(answer.recommendations, top);
      } catch (error) {
        console.error("RAG generation error:", error?.response?.data || error);
        reply = `I found ${results.length} properties matching your criteria. Check them out on the map!`;
        fallback = true;
      }
    }
  } else if (intent === "followup") {
    // 2b. Same listings as last time, no new search
    const top = await findPropertiesByIds(db, state.resultIds);
    const stats = buildStats(top);
    try {
      const answer = await generateRagAnswer({
        history,
        data: {
          stats: { ...stats, note: "stats over the listings being discussed" },
          listings: top.map(toContextItem),
        },
        message,
      });
      ({ reply, recommended_ids: recommendedIds } = answer);
      cards = buildCards(answer.recommendations, top);
    } catch (error) {
      console.error("RAG generation error:", error?.response?.data || error);
      reply = "Sorry, I couldn't answer that right now. Please try again.";
      fallback = true;
    }
  } else if (intent === "question") {
    try {
      reply = await answerQuestion(message, history);
    } catch (error) {
      console.error("Question error:", error?.response?.data || error);
      reply = "Sorry, I couldn't answer that right now. Please try again.";
      fallback = true;
    }
  } else {
    reply = UNKNOWN_REPLY;
  }

  // 3. Save the turn and state in one write
  await memory.saveTurn(
    db,
    session._id,
    { content: message },
    { content: reply, intent, recommendedIds, cards, ...(fallback ? { fallback: true } : {}) },
    statePatch,
  );

  return {
    sessionId: session._id,
    intent,
    reply,
    properties,
    stats: responseStats,
    recommended_ids: recommendedIds,
    cards,
    filters: responseFilters,
    ...(fallback ? { fallback: true } : {}),
  };
}

// ---------- Restore (GET /api/chat/session/:id) ----------

async function getSessionView(db, sessionId, user) {
  const session = await memory.getSessionForUser(db, sessionId, user);
  if (!session) return null;
  const state = { ...memory.emptyState(), ...(session.state || {}) };

  let properties;
  // Re-run the last search (no AI call) so the map comes back after a reload.
  if (state.stats) {
    ({ results: properties } = await runSearch(db, state.filters));
  }
  const lastAssistant = [...(session.messages || [])].reverse().find((m) => m.role === "assistant");

  return {
    sessionId: session._id,
    messages: (session.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
      at: m.at,
      ...(m.cards?.length ? { cards: m.cards } : {}),
    })),
    filters: state.filters,
    stats: state.stats,
    recommended_ids: lastAssistant?.recommendedIds || [],
    properties,
  };
}

module.exports = {
  classifyIntent,
  extractFilters,
  generateRagAnswer,
  buildCards,
  answerQuestion,
  handleMessage,
  getSessionView,
};
