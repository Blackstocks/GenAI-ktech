# pip install fastapi uvicorn
# comand to run ---> uvicorn main:app --reload
# pip install python-multipart pypdf
# pip install sentence-transformers

from fastapi import FastAPI, UploadFile, File
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import os
import re



app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")

# cleaning the text
def clean_text(text):
    text = re.sub(r'\s+',' ',text)
    return text.strip()

# chunking the text
def chunk(text,chunk_size=1000,chunk_overlap=200):
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i+chunk_size])
    return chunks


@app.get("/health")
def health_check():
    return {"message":"Server is running"}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    # save pdf in the upload folder
    path = os.path.join("upload", file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())

    pdf_reader = PdfReader(path)

    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()

    cleaned_text = clean_text(text)
    page_chunk = chunk(cleaned_text)
    embeddings = model.encode(page_chunk)

    return {
        "filename": file.filename,
        "saved":path,
        "charecter_count": len(text),
        "preview": text[:100],
        "first_chunk": page_chunk[0]
    }