// Server-side chat memory: one document per chat session in `chat_sessions`.
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { sanitizeHistory } = require("./rag");

const COLLECTION = "chat_sessions";
const SESSION_TTL_SECONDS = 7 * 24 * 3600; // deleted after 7 days idle
const MAX_STORED_MESSAGES = 20;

const emptyState = () => ({
  filters: {},
  resultIds: [],
  stats: null,
  lastIntent: null,
});

// Idempotent: creates the collection and indexes on first run.
async function ensureIndexes(db) {
  const col = db.collection(COLLECTION);
  await col.createIndex({ updatedAt: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS });
  await col.createIndex({ userId: 1, updatedAt: -1 });
}

function toObjectId(id) {
  return id && ObjectId.isValid(id) ? new ObjectId(id) : null;
}

// A session is usable by the request if it is a guest session or belongs to this user.
function canUse(session, userId) {
  if (!session.userId) return true;
  return userId != null && String(session.userId) === String(userId);
}

// Returns the session only if this user may read it; otherwise null.
async function getSessionForUser(db, sessionId, user) {
  if (typeof sessionId !== "string" || !sessionId) return null;
  const session = await db.collection(COLLECTION).findOne({ _id: sessionId });
  if (!session || !canUse(session, user?.userId)) return null;
  return session;
}

// Loads the session, or creates a new one when the id is missing, unknown,
// expired or owned by another user. A guest session is claimed on login.
async function getOrCreateSession(db, sessionId, user) {
  const col = db.collection(COLLECTION);
  const userId = toObjectId(user?.userId);
  const existing = await getSessionForUser(db, sessionId, user);

  if (existing) {
    if (!existing.userId && userId) {
      await col.updateOne({ _id: existing._id, userId: null }, { $set: { userId } });
      existing.userId = userId;
    }
    return existing;
  }

  const now = new Date();
  const session = {
    _id: crypto.randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    messages: [],
    state: emptyState(),
  };
  await col.insertOne(session);
  return session;
}

// One atomic write per turn: append both messages and update state.
async function saveTurn(db, sessionId, userMsg, assistantMsg, statePatch = {}) {
  const now = new Date();
  const $set = { updatedAt: now };
  for (const [key, value] of Object.entries(statePatch)) {
    $set[`state.${key}`] = value;
  }
  await db.collection(COLLECTION).updateOne(
    { _id: sessionId },
    {
      $push: {
        messages: {
          $each: [
            { ...userMsg, role: "user", at: now },
            { ...assistantMsg, role: "assistant", at: now },
          ],
          $slice: -MAX_STORED_MESSAGES,
        },
      },
      $set,
    },
  );
}

// Last few messages in OpenAI format. Fallback replies are left out so the model
// never treats them as real answers.
function recentMessages(session) {
  return sanitizeHistory((session.messages || []).filter((m) => !m.fallback));
}

function lastAssistantMessage(session) {
  const msgs = session.messages || [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "assistant" && !msgs[i].fallback) return msgs[i].content;
  }
  return undefined;
}

async function deleteSession(db, sessionId, user) {
  const session = await getSessionForUser(db, sessionId, user);
  if (!session) return false;
  await db.collection(COLLECTION).deleteOne({ _id: session._id });
  return true;
}

module.exports = {
  ensureIndexes,
  getSessionForUser,
  getOrCreateSession,
  saveTurn,
  recentMessages,
  lastAssistantMessage,
  deleteSession,
  emptyState,
};
