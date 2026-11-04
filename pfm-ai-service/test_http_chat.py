import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

payload = {
    "question": "số dư của tôi còn bao nhiêu",
    "user_id": "b5f7482d-74a0-4582-8fa2-9c586211a583"
}

res = requests.post("http://127.0.0.1:8000/api/chat", json=payload, timeout=30)
print("Status:", res.status_code)
data = res.json()
print("Answer:")
print(data.get("answer"))

