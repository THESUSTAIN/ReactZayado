"""Backend tests for Kairos by Zayado API."""
import json
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    # Fallback: read frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
BASE_URL = BASE_URL.rstrip('/')


# --- Root endpoint ---
def test_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "Kairos" in data.get("message", "")


def _consume_sse(message, token=None, timeout=90):
    """POST /api/copilote/chat et assemble les deltas SSE."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    with requests.post(
        f"{BASE_URL}/api/copilote/chat",
        json={"message": message},
        headers=headers,
        stream=True,
        timeout=timeout,
    ) as r:
        assert r.status_code == 200, r.text
        assert "text/event-stream" in r.headers.get("content-type", "")
        full = ""
        done = False
        for raw in r.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("data: "):
                obj = json.loads(raw[6:])
                if "delta" in obj:
                    full += obj["delta"]
                elif obj.get("done"):
                    done = True
                    break
                elif "error" in obj:
                    pytest.fail(f"Stream error: {obj['error']}")
    assert done, "Stream did not send done=True"
    assert full.strip(), "Assembled reply is empty"
    return full


# --- Chat copilote (réponse en français, streaming SSE) ---
def test_chat_stream_elan():
    reply = _consume_sse("Bonjour Kairos, présente-toi en une phrase.")
    print(f"[copilote reply]: {reply}")
    lc = reply.lower()
    assert any(w in lc for w in ["je", "tu", "kairos", "bonjour", "salut", "ravi"]), \
        f"Reply doesn't seem French/coherent: {reply}"


# --- Historique copilote : vide sur compte neuf, puis rempli après un message ---
def test_chat_stream_recuperation_and_history():
    # Compte jetable pour un historique déterministe (le fallback démo est partagé)
    email = f"TEST_{uuid.uuid4().hex[:8]}@zayado.fr"
    reg = requests.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": "TestCopilote2026!"}, timeout=15)
    assert reg.status_code == 200, reg.text
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    h0 = requests.get(f"{BASE_URL}/api/copilote/history", headers=headers, timeout=15)
    assert h0.status_code == 200 and h0.json() == []

    reply = _consume_sse("Je suis épuisé aujourd'hui, que dois-je faire ?", token=token)
    print(f"[recup reply]: {reply}")
    assert reply.strip()

    time.sleep(1)
    h = requests.get(f"{BASE_URL}/api/copilote/history", headers=headers, timeout=15)
    assert h.status_code == 200
    msgs = h.json()
    assert isinstance(msgs, list)
    assert len(msgs) >= 2
    roles = [m["role"] for m in msgs]
    assert "user" in roles and "assistant" in roles
    for m in msgs:
        assert "_id" not in m
        assert "contenu" in m
