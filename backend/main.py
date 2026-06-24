from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pypdf import PdfReader

from sentence_transformers import SentenceTransformer

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
)

from openai import OpenAI
from dotenv import load_dotenv

import uuid
import os
import re


# =========================
# LOAD ENV
# =========================

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")




# =========================
# APP
# =========================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("upload", exist_ok=True)


# =========================
# MODELS
# =========================

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

openai_client = OpenAI(
    api_key=OPENAI_API_KEY
)


# =========================
# QDRANT
# =========================

qdrant = QdrantClient(
    url=QDRANT_URL,           # ✅ loaded from .env
    api_key=QDRANT_API_KEY,   # ✅ loaded from .env
    prefer_grpc=False,
    timeout=30
)

COLLECTION_NAME = "pdf_chunks"

existing_collections = [
    c.name
    for c in qdrant.get_collections().collections
]

if COLLECTION_NAME not in existing_collections:
    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE
        )
    )

# ✅ Create payload index for "filename" so filtered search works
qdrant.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="filename",
    field_schema=PayloadSchemaType.KEYWORD,
)


# =========================
# HELPERS
# =========================

def clean_text(text):
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_text(
    text,
    chunk_size=1000,
    overlap=200
):
    chunks = []
    start = 0

    while start < len(text):
        chunks.append(
            text[start:start + chunk_size]
        )
        start += (chunk_size - overlap)

    return chunks


# =========================
# REQUEST MODEL
# =========================

class ChatRequest(BaseModel):
    filename: str
    question: str


# =========================
# HEALTH
# =========================

@app.get("/health")
def health():
    return {"message": "Server running"}


# =========================
# COLLECTIONS
# =========================

@app.get("/collections")
def collections():
    return qdrant.get_collections()


# =========================
# UPLOAD PDF
# =========================

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...)
):
    file_path = os.path.join("upload", file.filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    pdf_reader = PdfReader(file_path)

    text = ""
    for page in pdf_reader.pages:
        text += (page.extract_text() or "")

    text = clean_text(text)
    chunks = chunk_text(text)
    embeddings = embedding_model.encode(chunks)

    points = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding.tolist(),
                payload={
                    "filename": file.filename,
                    "chunk_id": idx,
                    "text": chunk
                }
            )
        )

    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )

    return {
        "filename": file.filename,
        "chunks": len(chunks),
        "status": "stored in qdrant"
    }


# =========================
# SEARCH
# =========================

@app.post("/search")
def search_pdf(
    request: ChatRequest
):
    query_embedding = (
        embedding_model.encode(request.question).tolist()
    )

    results = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="filename",
                    match=MatchValue(value=request.filename)
                )
            ]
        ),
        limit=3
    )

    chunks = [result.payload["text"] for result in results]

    return {"results": chunks}


# =========================
# CHAT
# =========================

@app.post("/chat")
def chat_pdf(
    request: ChatRequest
):
    query_embedding = (
        embedding_model.encode(request.question).tolist()
    )

    results = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
    )

    context = "\n\n".join(
        result.payload["text"] for result in results
    )

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer only from the provided context. "
                    "If the answer does not exist say: "
                    "I could not find that information in the PDF."
                )
            },
            {
                "role": "user",
                "content": f"Context:\n\n{context}\n\nQuestion:\n\n{request.question}"
            }
        ]
    )

    answer = response.choices[0].message.content

    return {"answer": answer}