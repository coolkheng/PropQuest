# PropQuest Embedding Service

A small Python service that self-hosts an open-source embedding model from Hugging Face and
turns text into vectors over HTTP. The Node backend will call it for semantic search
("quiet", "near LRT", "renovated"…) over the listings.

- **Model:** [`BAAI/bge-small-en-v1.5`](https://huggingface.co/BAAI/bge-small-en-v1.5)
  - About 33M parameters and 384 dimensions, MIT licence.
  - Fast on a CPU, and ranks well for English retrieval.
- **Stack:** FastAPI + sentence-transformers (PyTorch).
- **Cost:** free. It runs on your own machine. The weights (about 130 MB) download once from
  Hugging Face into the local cache, with no API key.

## Setup

```powershell
cd embedding-service
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

## Run

```powershell
.venv\Scripts\python -m uvicorn app:app --port 8000
```

Interactive API docs: http://localhost:8000/docs

Environment variables (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | Any sentence-transformers model from Hugging Face |
| `EMBEDDING_DEVICE` | `cuda` if available, else `cpu` | Force a device |
| `EMBEDDING_QUERY_PREFIX` | bge instruction for bge models, otherwise empty | Prefix added to queries |

If you switch models, every stored vector must be re-embedded with the new model.

## Endpoints

### `GET /health`
```json
{ "model": "BAAI/bge-small-en-v1.5", "dimensions": 384, "device": "cpu" }
```

### `POST /embed`
Takes 1–128 texts. Each text is cut to 2,000 characters, about the model's 512-token limit.
```json
{ "texts": ["walking distance to LRT", "renovated corner lot"], "type": "document" }
```
- Use `"type": "query"` for search queries: bge adds a query instruction for better retrieval.
- Use `"document"` for listing text.

It returns `{ model, dimensions, embeddings }`. The vectors are normalized, so a dot product equals cosine similarity.

### `POST /similarity`
For testing and learning: it scores each text against a query, highest first.
```json
{ "query": "near LRT station", "texts": ["walking distance to LRT Lembah Subang", "swimming pool and gym"] }
```

## Docker

```powershell
docker build -t propquest-embeddings embedding-service
docker run -p 8000:8000 propquest-embeddings
```
The image uses CPU-only PyTorch and downloads the model at build time, so it starts offline.
