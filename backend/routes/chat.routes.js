const express = require("express");
const { connectToDatabase } = require("../config/db");
const { openai, OPENAI_MODEL } = require("../config/openai");
const { parseFilters, searchProperties } = require("../services/propertySearch");
const {
  RAG_TOP_N,
  buildStats,
  sortByValue,
  toContextItem,
  sanitizeHistory,
  findPropertiesByIds,
} = require("../services/rag");
const chat = require("../services/chat");
const memory = require("../services/memory");
const { PREFERENCES_SEARCH_TEXT } = require("../prompts/chat.prompts");

const router = express.Router();

// Mounted at /api/chat (optionalAuth sets req.user when logged in)

// ---------- Session memory ----------

// One call per message: the server loads memory, classifies, searches/answers and saves.
router.post("/message", async (req, res) => {
  const { message, sessionId } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }
  try {
    const db = await connectToDatabase();
    const result = await chat.handleMessage(db, {
      sessionId,
      message: message.trim().slice(0, 2000),
      user: req.user,
    });
    res.json(result);
  } catch (error) {
    console.error("Chat message error:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Restore a chat after a reload: messages + the last search re-run for the map.
router.get("/session/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const view = await chat.getSessionView(db, req.params.id, req.user);
    if (!view) return res.status(404).json({ error: "Session not found" });
    res.json(view);
  } catch (error) {
    console.error("Chat session load error:", error);
    res.status(500).json({ error: "Failed to load session" });
  }
});

// "New chat": forget this session.
router.delete("/session/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    await memory.deleteSession(db, req.params.id, req.user);
    res.status(204).end();
  } catch (error) {
    console.error("Chat session delete error:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// ---------- Legacy endpoints (client-driven flow). Remove once the frontend is verified. ----------

router.post("/search", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
    const { filters } = await chat.extractFilters(message);
    res.json({ reply: JSON.stringify(filters) });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

router.post("/answer", async (req, res) => {
  const { message, propertyIds, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const isFollowUp = Array.isArray(propertyIds) && propertyIds.length > 0;
  let filters = {};
  let results;
  let top;
  try {
    const db = await connectToDatabase();
    if (isFollowUp) {
      top = await findPropertiesByIds(db, propertyIds);
      results = top;
    } else {
      filters = parseFilters(req.body.filters);
      results = sortByValue(await searchProperties(db, filters));
      top = results.slice(0, RAG_TOP_N);
    }
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return res.status(500).json({ error: "Search failed" });
  }

  const stats = buildStats(results);
  const payload = {
    properties: isFollowUp ? undefined : results,
    stats,
    context_ids: top.map((p) => String(p._id)),
  };
  try {
    const { reply, recommended_ids } = await chat.generateRagAnswer({
      history: sanitizeHistory(history),
      data: {
        ...(isFollowUp ? {} : { filters }),
        stats: isFollowUp ? { ...stats, note: "stats over the listings being discussed" } : stats,
        listings: top.map(toContextItem),
      },
      message,
    });
    res.json({ ...payload, reply, recommended_ids });
  } catch (error) {
    console.error("RAG generation error:", error?.response?.data || error);
    res.json({
      ...payload,
      reply: isFollowUp
        ? "Sorry, I couldn't answer that right now. Please try again."
        : `I found ${results.length} properties matching your criteria. Check them out on the map!`,
      recommended_ids: [],
      fallback: true,
    });
  }
});

router.post("/classify", async (req, res) => {
  const { message, hasResults, lastAssistantMessage } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
    const intent = await chat.classifyIntent(message, { hasResults, lastAssistantMessage });
    res.json({ intent });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to classify intent" });
  }
});

router.post("/questions", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
    res.json({ reply: await chat.answerQuestion(message) });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// Endpoint to handle user preferences
router.post("/preferences", async (req, res) => {
  const { conversation } = req.body;
  console.log("Received Conversation:", conversation);

  if (!conversation) {
    return res.status(400).json({ error: "Conversation is required" });
  }
  const message = [
    {
      role: "system",
      content: PREFERENCES_SEARCH_TEXT,
    },
  ];

  // Add conversation messages with role
  conversation.forEach((msg) => {
    message.push({
      role: "user",
      content: msg.content,
    });
  });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "none", // reasoning off: required for temperature, and keeps replies fast/cheap
      messages: message,
      max_completion_tokens: 150,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "property_preference_schema",
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["ask", "search"],
              },
              question_asking_preferences: {
                type: ["string", "null"],
                enum: [
                  "price_min",
                  "price_max",
                  "beds_min",
                  "baths_min",
                  "sqft_min",
                  "sqft_max",
                  "house_type",
                  "lease_type",
                  "furnishing",
                  "facilities",
                ],
              },
              question: {
                type: ["string", "null"],
              },
              preferences: {
                type: "object",
                properties: {
                  price_min: { type: "integer", nullable: true },
                  price_max: { type: "integer", nullable: true },
                  beds_min: { type: "integer", nullable: true },
                  baths_min: { type: "integer", nullable: true },
                  sqft_min: { type: "integer", nullable: true },
                  sqft_max: { type: "integer", nullable: true },
                  house_type: { type: "string", nullable: true },
                  lease_type: { type: "string", nullable: true },
                  furnishing: { type: "string", nullable: true },
                  facilities: {
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                  },
                },
              },
            },
            required: ["intent", "question"],
            additionalProperties: false,
          },
        },
      },
    });

    const reply = JSON.parse(openaiResponse.choices[0].message.content);
    res.json({ reply });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to process preferences" });
  }
});

module.exports = router;
