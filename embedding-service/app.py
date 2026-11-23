"""PropQuest embedding service.

Self-hosts an open-source Hugging Face embedding model (default: BAAI/bge-small-en-v1.5)
and exposes it over HTTP so the Node backend can turn text into vectors.

Run:  uvicorn app:app --port 8000
"""

import os
from contextlib import asynccontextmanager
from typing import Annotated, Literal

import torch
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, StringConstraints
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
DEVICE = os.getenv("EMBEDDING_DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")

# bge models expect this instruction in front of search queries (not in front of documents).
DEFAULT_QUERY_PREFIX = (
    "Represent this sentence for searching relevant passages: "
    if MODEL_NAME.startswith("BAAI/bge")
    else ""
)
QUERY_PREFIX = os.getenv("EMBEDDING_QUERY_PREFIX", DEFAULT_QUERY_PREFIX)

MAX_TEXTS = 128  # texts per request
MAX_CHARS = 2000  # about the model's 512-token limit; longer text is cut
BATCH_SIZE = 32

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

state: dict = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load once at startup. The first run downloads the weights from Hugging Facepp
    # into the local cache; later runs load from disk.
    model = SentenceTransformer(MODEL_NAME, device=DEVICE)
    state["model"] = model
    # Renamed in sentence-transformers 6; keep the old name as a fallback for older versions.
    get_dim = getattr(model, "get_embedding_dimension", None) or model.get_sentence_embedding_dimension
    state["dimensions"] = get_dim()
    print(f"Loaded {MODEL_NAME} on {DEVICE} ({state['dimensions']} dimensions)")
    yield
    state.clear()


app = FastAPI(title="PropQuest Embedding Service", lifespan=lifespan)


def encode(texts: list[str], kind: Literal["query", "document"]):
    """Embed texts as unit vectors, so a dot product equals cosine similarity."""
    prefix = QUERY_PREFIX if kind == "query" else ""
    inputs = [prefix + t[:MAX_CHARS] for t in texts]
    return state["model"].encode(
        inputs,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        convert_to_tensor=True,
    )


class EmbedRequest(BaseModel):
    texts: list[Text] = Field(min_length=1, max_length=MAX_TEXTS)
    type: Literal["query", "document"] = "document"


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    embeddings: list[list[float]]


class SimilarityRequest(BaseModel):
    query: Text
    texts: list[Text] = Field(min_length=1, max_length=MAX_TEXTS)


class SimilarityResult(BaseModel):
    text: str
    score: float


class SimilarityResponse(BaseModel):
    model: str
    query: str
    results: list[SimilarityResult]


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/health")
def health():
    return {"model": MODEL_NAME, "dimensions": state.get("dimensions"), "device": DEVICE}


# Plain `def` endpoints run in FastAPI's thread pool, so encoding doesn't block the server.
@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    vectors = encode(req.texts, req.type)
    return EmbedResponse(
        model=MODEL_NAME,
        dimensions=state["dimensions"],
        embeddings=vectors.cpu().tolist(),
    )


# For testing and learning: how close is each text to the query?
@app.post("/similarity", response_model=SimilarityResponse)
def similarity(req: SimilarityRequest):
    query_vec = encode([req.query], "query")[0]
    text_vecs = encode(req.texts, "document")
    scores = (text_vecs @ query_vec).cpu().tolist()
    results = sorted(
        (SimilarityResult(text=t, score=round(s, 4)) for t, s in zip(req.texts, scores)),
        key=lambda r: r.score,
        reverse=True,
    )
    return SimilarityResponse(model=MODEL_NAME, query=req.query, results=results)
