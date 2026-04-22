import pandas as pd
import numpy as np
import requests
import json
import os
import faiss
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "skincare_large_dataset.csv")
INDEX_PATH = os.path.join(os.path.dirname(__file__), "skincare.index")
METADATA_PATH = os.path.join(os.path.dirname(__file__), "skincare_metadata.json")

def get_gemini_embeddings(texts):
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not set.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    
    import time
    all_embeddings = []
    max_retries = 3
    
    for text in texts:
        payload = {
            "model": "models/gemini-embedding-001",
            "content": {"parts": [{"text": text}]}
        }
        success = False
        for i in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    all_embeddings.append(data["embedding"]["values"])
                    success = True
                    break
                elif response.status_code in [429, 503]:
                    if i < max_retries - 1:
                        time.sleep(2)
                        continue
                raise Exception(f"Gemini API Error: {response.status_code} {response.text}")
            except requests.exceptions.RequestException as e:
                if i < max_retries - 1:
                    time.sleep(2)
                    continue
                raise Exception(f"Gemini API Request failed: {e}")
        if not success:
             raise Exception("Failed after retries")
             
    return all_embeddings

def embed_dataset():
    print(f"Loading dataset from {DATASET_PATH}...")
    df = pd.read_csv(DATASET_PATH)
    
    records = []
    texts_to_embed = []
    
    for _, row in df.iterrows():
        text = (f"Routine Type: {row['routine_type']}, Focus Area: {row['focus_area']}, "
                f"Skin Type: {row['skin_type']}, Age Range: {row['age_range']}, "
                f"Experience Level: {row['experience_level']}.")
        
        texts_to_embed.append(text)
        records.append({
            "routine_type": str(row['routine_type']),
            "focus_area": str(row['focus_area']),
            "skin_type": str(row['skin_type']),
            "age_range": str(row['age_range']),
            "experience_level": str(row['experience_level']),
            "recommended_routine": str(row['recommended_routine']),
            "product_recommendations": str(row['product_recommendations']),
            "text": text
        })
    
    print(f"Embedding {len(texts_to_embed)} rows using Gemini API...")
    
    batch_size = 10
    all_embeddings = []
    
    for i in range(0, len(texts_to_embed), batch_size):
        batch = texts_to_embed[i:i+batch_size]
        print(f"Embedding batch {i} to {i+len(batch)}...")
        embs = get_gemini_embeddings(batch)
        all_embeddings.extend(embs)
        
    # Convert to float32 for FAISS
    embeddings_np = np.array(all_embeddings).astype('float32')
    
    # Create FAISS index
    dimension = embeddings_np.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings_np)
    
    print(f"Saving FAISS index to {INDEX_PATH}...")
    faiss.write_index(index, INDEX_PATH)
    
    print(f"Saving metadata to {METADATA_PATH}...")
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f)
    
    print("Done! FAISS index created successfully.")

def retrieve_top_k(user_profile: dict, k=3):
    if not os.path.exists(INDEX_PATH) or not os.path.exists(METADATA_PATH):
        raise FileNotFoundError("FAISS Index or Metadata not found. Run embed_dataset() first.")
        
    # Load index and metadata
    index = faiss.read_index(INDEX_PATH)
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    # Create the text representation from user data
    parts = []
    for key, val in user_profile.items():
        if isinstance(val, list):
            val = ", ".join(val)
        parts.append(f"{key.replace('_', ' ').title()}: {val}")
    user_text = " | ".join(parts)
                 
    # Embed the user query
    user_emb = np.array(get_gemini_embeddings([user_text])[0]).astype('float32').reshape(1, -1)
    
    # Search index
    distances, indices = index.search(user_emb, k)
    
    results = []
    for i in range(len(indices[0])):
        idx = int(indices[0][i])
        if idx != -1: # FAISS returns -1 for no matches
            results.append({
                "score": float(distances[0][i]),
                "record": records[idx]
            })
        
    return results

if __name__ == "__main__":
    embed_dataset()
