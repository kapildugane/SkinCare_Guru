import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("GROQ_API_KEY")
print("Key length:", len(key) if key else "None")

groq_url = "https://api.groq.com/openai/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}
payload = {
    "model": "llama3-8b-8192",
    "messages": [{"role": "user", "content": "hi"}]
}
try:
    res = requests.post(groq_url, headers=headers, json=payload)
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(e)
