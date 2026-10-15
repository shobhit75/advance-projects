import os, uuid, asyncio
from pathlib import Path
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import httpx
import chromadb
import pypdf
from docx import Document

# ── Config ────────────────────────────────────────────────────────────────────
UPLOAD_DIR = Path.home() / "docrag_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Persist ChromaDB to disk so index survives restarts
CHROMA_DIR = Path.home() / "docrag_chroma"
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

OLLAMA_BASE  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
EMBED_MODEL  = os.getenv("EMBED_MODEL",  "nomic-embed-text")
ANSWER_MODEL = os.getenv("ANSWER_MODEL", "llama3.2")

# ── Shared HTTP client (created once, reused everywhere) ──────────────────────
_http: httpx.AsyncClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http
    _http = httpx.AsyncClient(timeout=300.0)
    yield
    await _http.aclose()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="DocRAG API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ChromaDB (persistent) ─────────────────────────────────────────────────────
chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = chroma_client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},
)

# ── In-memory registry (rebuilt from ChromaDB on startup) ─────────────────────
doc_registry: dict[str, dict] = {}

def _rebuild_registry():
    """Restore doc_registry from whatever is already in ChromaDB."""
    results = collection.get(include=["metadatas"])
    seen: dict[str, dict] = {}
    for meta in results["metadatas"]:
        did = meta["doc_id"]
        if did not in seen:
            seen[did] = {
                "id":       did,
                "filename": meta["filename"],
                "type":     Path(meta["filename"]).suffix.lstrip(".").upper(),
                "chunks":   0,
                "chars":    meta.get("chars", 0),
            }
        seen[did]["chunks"] += 1
    doc_registry.update(seen)

_rebuild_registry()

# ── Ollama helpers ────────────────────────────────────────────────────────────

async def _embed_one(text: str) -> List[float]:
    """Embed a single text. Called concurrently via asyncio.gather."""
    resp = await _http.post(
        f"{OLLAMA_BASE}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


async def ollama_embed(texts: List[str]) -> List[List[float]]:
    """
    Embed all texts concurrently instead of one at a time.
    For a 50-chunk doc this is ~50× faster on a local Ollama instance.
    """
    return list(await asyncio.gather(*(_embed_one(t) for t in texts)))


async def ollama_answer(query: str, context_chunks: List[str]) -> str:
    """Non-streaming answer (used by /query)."""
    context = "\n\n---\n\n".join(context_chunks)
    system_prompt = (
        "You are a helpful assistant that answers questions strictly based on "
        "the provided document excerpts. If the answer is not in the context, "
        "say so clearly. Be concise and cite relevant details from the context."
    )
    user_prompt = (
        f"Context from documents:\n\n{context}\n\n"
        f"Question: {query}\n\nAnswer based only on the context above:"
    )
    resp = await _http.post(
        f"{OLLAMA_BASE}/api/generate",
        json={
            "model":  ANSWER_MODEL,
            "prompt": user_prompt,
            "system": system_prompt,
            "stream": False,
        },
    )
    resp.raise_for_status()
    return resp.json()["response"].strip()


async def ollama_answer_stream(query: str, context_chunks: List[str]):
    """
    Streaming answer generator (used by /query/stream).
    Yields Server-Sent Event lines so the browser can display tokens
    as they arrive instead of waiting for the full response.
    """
    context = "\n\n---\n\n".join(context_chunks)
    system_prompt = (
        "You are a helpful assistant that answers questions strictly based on "
        "the provided document excerpts. If the answer is not in the context, "
        "say so clearly. Be concise and cite relevant details from the context."
    )
    user_prompt = (
        f"Context from documents:\n\n{context}\n\n"
        f"Question: {query}\n\nAnswer based only on the context above:"
    )
    async with _http.stream(
        "POST",
        f"{OLLAMA_BASE}/api/generate",
        json={
            "model":  ANSWER_MODEL,
            "prompt": user_prompt,
            "system": system_prompt,
            "stream": True,
        },
    ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line:
                continue
            import json
            try:
                chunk = json.loads(line)
            except Exception:
                continue
            token = chunk.get("response", "")
            if token:
                # SSE format
                yield f"data: {json.dumps({'token': token})}\n\n"
            if chunk.get("done"):
                yield "data: [DONE]\n\n"
                return

# ── Text helpers ──────────────────────────────────────────────────────────────

def extract_text_pdf(path: Path) -> str:
    reader = pypdf.PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_docx(path: Path) -> str:
    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs)


def chunk_text(text: str, size: int = 400, overlap: int = 60) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + size]))
        i += size - overlap
    return [c for c in chunks if len(c.strip()) > 20]

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Check whether Ollama is reachable and which models are available."""
    try:
        resp = await _http.get(f"{OLLAMA_BASE}/api/tags", timeout=5.0)
        resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
    except Exception as e:
        raise HTTPException(503, f"Ollama unreachable: {e}")
    return {
        "ollama": "ok",
        "models": models,
        "embed_model":  EMBED_MODEL,
        "answer_model": ANSWER_MODEL,
        "embed_ready":  any(EMBED_MODEL  in m for m in models),
        "answer_ready": any(ANSWER_MODEL in m for m in models),
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    name = file.filename or "unknown"
    ext  = Path(name).suffix.lower()

    # Reject legacy .doc early with a clear message
    if ext == ".doc":
        raise HTTPException(
            400,
            "Legacy .doc files are not supported. "
            "Please re-save as .docx in Word or LibreOffice.",
        )
    if ext not in (".pdf", ".docx"):
        raise HTTPException(400, "Only PDF and Word (.docx) files are supported.")

    doc_id    = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{doc_id}{ext}"
    save_path.write_bytes(await file.read())

    try:
        text = extract_text_pdf(save_path) if ext == ".pdf" else extract_text_docx(save_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to parse document: {e}")

    if not text.strip():
        raise HTTPException(422, "No readable text found in the document.")

    chunks = chunk_text(text)
    ids    = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metas  = [
        {"doc_id": doc_id, "filename": name, "chunk": i, "chars": len(text)}
        for i in range(len(chunks))
    ]

    try:
        # ✅ All chunks embedded concurrently — no more serial loop
        embeddings = await ollama_embed(chunks)
    except Exception as e:
        raise HTTPException(
            503,
            f"Embedding failed — is Ollama running with {EMBED_MODEL}? Error: {e}",
        )

    collection.add(documents=chunks, ids=ids, metadatas=metas, embeddings=embeddings)

    doc_registry[doc_id] = {
        "id":       doc_id,
        "filename": name,
        "type":     ext.lstrip(".").upper(),
        "chunks":   len(chunks),
        "chars":    len(text),
    }

    return {"doc_id": doc_id, "filename": name, "chunks": len(chunks), "chars": len(text)}


@app.get("/documents")
def list_documents():
    return list(doc_registry.values())


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if doc_id not in doc_registry:
        raise HTTPException(404, "Document not found.")
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
    del doc_registry[doc_id]
    return {"status": "deleted"}


class QueryRequest(BaseModel):
    query:     str
    n_results: int = 5


async def _retrieve_hits(req: QueryRequest):
    """Shared retrieval logic for both /query and /query/stream."""
    if collection.count() == 0:
        raise HTTPException(400, "No documents ingested yet.")
    try:
        query_embedding = await ollama_embed([req.query])
    except Exception as e:
        raise HTTPException(
            503,
            f"Embedding failed — is Ollama running with {EMBED_MODEL}? Error: {e}",
        )
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(req.n_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    hits = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({
            "text":     doc,
            "filename": meta["filename"],
            "doc_id":   meta["doc_id"],
            "chunk":    meta["chunk"],
            "score":    round(1 - dist, 4),
        })
    return hits


@app.post("/query")
async def query_documents(req: QueryRequest):
    """Non-streaming: waits for the full answer before responding."""
    hits       = await _retrieve_hits(req)
    top_chunks = [h["text"] for h in hits[:3]]
    try:
        answer = await ollama_answer(req.query, top_chunks)
    except Exception as e:
        answer = f"⚠️ Answer generation failed — is Ollama running with {ANSWER_MODEL}? Error: {e}"
    return {"query": req.query, "answer": answer, "results": hits}


@app.post("/query/stream")
async def query_documents_stream(req: QueryRequest):
    """
    Streaming: returns retrieved chunks immediately, then streams the
    answer token-by-token as Server-Sent Events (text/event-stream).

    Frontend usage:
        const es = new EventSource('/query/stream', { ... });
        es.onmessage = e => {
            if (e.data === '[DONE]') return es.close();
            const { token } = JSON.parse(e.data);
            answerDiv.textContent += token;
        };
    """
    hits       = await _retrieve_hits(req)
    top_chunks = [h["text"] for h in hits[:3]]

    import json

    async def event_stream():
        # Send retrieved hits first so the UI can render sources immediately
        yield f"data: {json.dumps({'type': 'hits', 'hits': hits})}\n\n"
        try:
            async for sse_line in ollama_answer_stream(req.query, top_chunks):
                yield sse_line
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/stats")
def stats():
    return {
        "total_docs":   len(doc_registry),
        "total_chunks": collection.count(),
        "embed_model":  EMBED_MODEL,
        "answer_model": ANSWER_MODEL,
    }


# ── Serve frontend ────────────────────────────────────────────────────────────
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="static")
