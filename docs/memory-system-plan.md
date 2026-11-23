# PropQuest Chatbot Memory System Plan

## 1. Goal

Give the chatbot a server-side memory so it can:

- understand follow-ups ("which of these has a pool?") without the browser re-sending context,
- refine the previous search ("cheaper", "make it freehold", "only 3 bedrooms"),
- keep context after a page reload or in a new tab,
- later, remember a logged-in user across sessions.

Memory is about **the conversation and the user**. RAG (already built) is about **the listing data**. The two work together: memory decides *which* listings and filters are in play; RAG loads their data into the prompt.

## 2. Current state (what exists today)

| Part | Where | Notes |
|---|---|---|
| Chat messages | Browser `sessionStorage` (`aiChatMessages`) | Includes the UI greeting, which is wrongly sent as history |
| Listings being discussed | Browser `sessionStorage` (`aiChatResultIds`) | 8 ids, sent as `propertyIds` on follow-ups |
| History sent to model | Frontend `recentHistory()` → `history` | Last 4 messages; server re-caps with `sanitizeHistory()` (4 msgs × 800 chars) |
| Last search filters | **Nowhere** | Why refinements fail (e.g. "cheaper but premium" → 0 results) |
| Request flow | 3 calls per search: `/classify` → `/search` → `/answer` | Context assembled by the client |

Measured prompt size: ~2.6–2.9k tokens per answer (≈80% is the 8 listings).

Limitations: no filter memory, lost on reload/new tab, the client controls what goes into the prompt, and there is no path to long-term memory.

## 3. Target design

### 3.1 Memory layers

| Layer | Holds | Lifetime | Phase |
|---|---|---|---|
| Short-term (session) memory | Recent messages + structured state (filters, shown listings) | One chat, 7-day idle TTL | **1** |
| Summary memory | Compressed older messages | One chat | 2 |
| Long-term (user) memory | Stable user facts (budget, areas, family size…) | Across sessions, logged-in users | 3 |

### 3.2 Storage: `chat_sessions` collection (MongoDB Atlas)

No Redis needed; a TTL index gives the same auto-expiry.

```js
{
  _id: "3f9c2b1e-…",               // crypto.randomUUID(): unguessable
  userId: ObjectId | null,          // set when the user is logged in
  createdAt: Date,
  updatedAt: Date,                  // TTL index → deleted after 7 days idle

  messages: [                       // capped at the last 20 with $slice
    { role: "user", content: "find me condo in PJ", at: Date },
    { role: "assistant", content: "There are 1,005 condos…", at: Date,
      intent: "search", recommendedIds: ["…"] }
  ],

  state: {                          // structured "working memory"
    filters: { house_type: "Condominium", location: "Petaling Jaya", price_max: 800000 },
    resultIds: ["…8 ids…"],         // listings sent as DATA last time
    totalMatches: 1005,
    lastIntent: "search"
  },

  summary: ""                       // Phase 2
}
```

Indexes:

```js
db.chat_sessions.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
db.chat_sessions.createIndex({ userId: 1, updatedAt: -1 });
```

### 3.3 One orchestrating endpoint

Replace the three client-driven calls with one server-side flow.

`POST /api/chat/message`

```json
// request
{ "sessionId": "3f9c2b1e-…" | null, "message": "cheaper ones?" }

// response
{
  "sessionId": "3f9c2b1e-…",
  "intent": "refine",
  "reply": "…",
  "properties": [ … ] | undefined,   // only when the search changed
  "stats": { … },
  "recommended_ids": [ … ],
  "filters": { … }                   // current filters, so the UI can show them
}
```

The old endpoints (`/classify`, `/search`, `/answer`) stay during migration and are removed once the frontend has switched.

### 3.4 Flow per message

```
1. LOAD      session = getOrCreateSession(sessionId, req.user)
                 unknown / expired id → create a new session silently
2. CLASSIFY  intent ∈ { search, refine, followup, question, unknown }
                 refine/followup only offered when session.state.resultIds is non-empty
3. ROUTE
   search   → extract filters from message                   → new state.filters
   refine   → extract filters with session.state.filters as base → updated state.filters
   followup → reuse session.state.resultIds (no new search)
   question → general answer (QUESTION_TEXT), state unchanged
4. RETRIEVE  search/refine: searchProperties(filters) → sortByValue → top 8
             followup:      findPropertiesByIds(state.resultIds)
5. GENERATE  [system RAG_ANSWER_TEXT] + [summary?] + messages.slice(-4) + DATA + QUESTION
6. SAVE      $push messages (user + assistant, $slice -20),
             $set state.filters / resultIds / totalMatches / lastIntent, updatedAt
7. RESPOND   { sessionId, intent, reply, properties?, stats, recommended_ids, filters }
```

### 3.5 Refinements (the main new capability)

- Add a `refine` intent: "the user is changing the current search" (cheaper, bigger, freehold, another area, remove the budget).
- The filter extractor receives the **current filters** and returns the **complete updated filter set**. This works better than a blind merge, because it can also remove or replace values ("forget the budget", "PJ instead of Subang").
- Extractor rule: only use values the user said or that are already in the current filters; never invent category values (this prevents "Premium" being placed in `house_type`).
- Vague words with no matching field ("premium", "quiet") are left out of the filters for now. Phase 4 (vector search) handles them.

### 3.6 Session lifecycle

| Event | Behaviour |
|---|---|
| First message | No `sessionId` → server creates one and returns it; frontend saves it in `localStorage` |
| Each later message | Frontend sends `{ sessionId, message }` only |
| "New chat" button | Frontend clears `sessionId` → next message starts a fresh session |
| 7 days idle | TTL index deletes the session |
| Unknown / expired id | Server creates a new session, returns the new id (never an error) |
| User logs in | `userId` set on the session; links to long-term memory (Phase 3) |

### 3.7 Security and privacy

- Session ids are random UUIDs, never sequential.
- If a session has a `userId`, only that logged-in user (JWT cookie) can use it.
- The server is the only source of prompt context; client-sent history/ids are ignored.
- The greeting and UI-only messages are never stored as conversation.
- Phase 3 adds "Clear my memory" (delete sessions + stored facts).

## 4. Code changes

### Backend

| File | Change |
|---|---|
| `services/memory.js` (new) | `getOrCreateSession`, `saveTurn`, `recentMessages`, `ensureIndexes` |
| `services/chat.js` (new) | Orchestration: classify → extract → retrieve → generate (logic moved out of routes) |
| `prompts/chat.prompts.js` | Add `refine` to the intent prompt; extractor prompt that takes current filters |
| `routes/chat.routes.js` | Add `POST /message`; keep old routes until the frontend migration is done |
| `api/index.js` | Call `ensureIndexes()` on startup |

### Frontend (`components/ai-chat-panel.tsx`)

- Store only `chatSessionId` in `localStorage`.
- Normal chat: one call to `/api/chat/message`; update properties/map when `properties` is returned.
- Remove `recentHistory()`, `lastAiMessage()`, `lastResultIds` and the `aiChatResultIds` key.
- Add a "New chat" button (clears `chatSessionId` and the visible messages).
- Optional: show the active filters as chips from `response.filters`.
- The personalized preferences flow stays as it is in Phase 1.

## 5. Phases and tasks

### Phase 1: Server-side session memory (short-term)

1. `services/memory.js` + TTL indexes.
2. `refine` intent + extractor that accepts current filters.
3. `services/chat.js` orchestration + `POST /api/chat/message`.
4. Frontend switches the normal chat to `/message`, and adds `sessionId` and a "New chat" button.
5. Remove the old client-side memory code; keep the old endpoints until verified, then delete them.

**Done when:** search → refine ("cheaper") → follow-up ("which has a pool?") works across a page reload, with the frontend sending only `{ sessionId, message }`.

### Phase 2: Summary memory

- When messages fall out of the 4-message window, fold them into `summary` (one cheap call, batched every ~4 turns).
- Inject `summary` after the system prompt.

**Done when:** a fact from early in a long chat is still used later. Expected cost: +5–10% tokens per message.

### Phase 3: Long-term user memory (logged-in users)

- At session end (or every N turns), extract stable facts into the user profile (reuse `/api/users/me/preferences` data).
- Inject a short "Known about this user" line into new sessions; use the facts as default filters.
- Add a "Clear my memory" option.

### Phase 4 (related, not memory): Semantic retrieval

- Atlas Vector Search over listing embeddings, combined with the structured filters (hybrid search).
- Handles vague words like "premium", "quiet", "near LRT" that filters cannot express.

## 6. Token budget

| | Today | Phase 1 | Phase 2 |
|---|---|---|---|
| System prompt | ~230 | ~230 | ~230 |
| History (4 msgs) | ~100–800 | same | same |
| Summary | – | – | +60–100 |
| Filters in extractor | – | +30–50 | +30–50 |
| DATA (8 listings + stats) | ~1,800 | same | same |
| **Total per answer** | **~2.6–2.9k** | **≈ same** | **+5–10%** |

The client→server change does not affect tokens; only what goes into the prompt does. The biggest lever for cost stays the size of DATA (`RAG_TOP_N`, `RAG_DETAILS_CHARS`).

## 7. Testing

- **Unit:** `getOrCreateSession` with null / valid / expired / foreign-user ids; history `$slice` cap; filter refinement cases (add, replace, remove).
- **API (curl):**
  1. Search "condo in PJ under 800k", then check that the session stores the filters.
  2. Refine "cheaper", then check that `price_max` is lowered and the other filters are kept.
  3. Follow up "which has a pool?", then check that the same `resultIds` are used and there's no new search.
  4. Send "new search: terrace house in Subang", then check that the filters are replaced, not merged.
  5. Send an expired/unknown `sessionId`, then check that a new session is returned without an error.
- **Logs:** `logContextSize` confirms the prompt contains the session history and DATA, not client-sent data.
- **Browser:** the same flow end-to-end, including a reload in the middle; "New chat" resets.
- **TTL:** create a session with an old `updatedAt` and confirm MongoDB removes it (TTL runs about every 60s).

## 8. Risks and decisions

| Risk / decision | Mitigation |
|---|---|
| Classifier confuses `search` vs `refine` | Give examples in the prompt; when unsure, prefer `refine` if filters exist (cheap to correct with a new search) |
| Concurrent messages in one session | Single atomic `updateOne` per turn; the frontend disables Send while waiting |
| Extra DB latency | +1 read/+1 write per message (~10–50 ms); one endpoint removes two HTTP round trips, so it's a net gain |
| Storage growth | `$slice -20` on messages + 7-day TTL |
| Merge conflicts with teammates | Coordinate before changing `chat.routes.js` / `ai-chat-panel.tsx` |

## 9. Out of scope (for now)

- Redis or another cache (MongoDB TTL is enough at this scale).
- Memory for the personalized preferences flow (later, after Phase 1).
- Vector "semantic memory" over past conversations.
