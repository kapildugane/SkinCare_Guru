import requests, os
from dotenv import load_dotenv
load_dotenv("backend/.env")
key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
res = requests.get(url)
for m in res.json().get("models", []):
    if "embed" in m["name"].lower():
        print(m["name"], m.get("supportedGenerationMethods"))
