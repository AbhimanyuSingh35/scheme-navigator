import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import string
from rank_bm25 import BM25Okapi

# Download NLTK data
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)

app = FastAPI()

# Global variables
bm25_index = None
corpus_data = []
CORPUS_FILE = "./elastic/processed_data/corpus.json"

class SearchQuery(BaseModel):
    query: str
    top_n: int = 3

def preprocess(text):
    stop_words = set(stopwords.words('english'))
    text = text.lower().translate(str.maketrans('', '', string.punctuation))
    return [w for w in word_tokenize(text) if w not in stop_words]

@app.on_event("startup")
def load_index():
    global bm25_index, corpus_data
    
    if not os.path.exists(CORPUS_FILE):
        print(f"Warning: {CORPUS_FILE} not found. Did you run build_index.py?")
        return
        
    print("Loading chunks from JSON...")
    with open(CORPUS_FILE, "r", encoding="utf-8") as f:
        corpus_data = json.load(f)
    
    print("Building BM25 Index in memory...")
    tokenized_corpus = [preprocess(item["text"]) for item in corpus_data]
    bm25_index = BM25Okapi(tokenized_corpus)
    print("Search API is ready!")

@app.post("/search")
def search(req: SearchQuery):
    if not bm25_index:
        raise HTTPException(status_code=500, detail="Index not loaded.")
        
    tokenized_query = preprocess(req.query)
    doc_scores = bm25_index.get_scores(tokenized_query)
    
    # Get top N indices
    top_indices = sorted(range(len(doc_scores)), key=lambda i: doc_scores[i], reverse=True)[:req.top_n]
    
    results = []
    for idx in top_indices:
        results.append({
            "score": doc_scores[idx],
            "source": corpus_data[idx]["source"],
            "text": corpus_data[idx]["text"]
        })
    return {"results": results}