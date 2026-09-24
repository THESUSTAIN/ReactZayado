"""Test: Agent Business chatbot tester endpoint now answers with the real AI
(MAMMOTH_API_KEY configured), referencing the knowledge base, and rejects an
empty message with 422."""
import os
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8002").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "test.analyse@zayado.local"
PASSWORD = "Analyse2026!"

FALLBACK_SENTENCE = (
    "Merci pour votre message ! Je le transmets a l'equipe, "
    "qui vous repondra rapidement."
)


def _client_token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _seeded_agent_id(headers):
    r = requests.get(f"{API}/agent-business", headers=headers, timeout=15)
    assert r.status_code == 200, f"agent-business list failed: {r.status_code} {r.text}"
    agents = r.json().get("agents", [])
    assert agents, f"no seeded agent found: {r.json()}"
    studio = next((a for a in agents if a.get("nom_marque") == "Studio Camille"), agents[0])
    return studio["id"]


def test_tester_returns_real_ia_reply_referencing_knowledge_base():
    token = _client_token()
    headers = {"Authorization": f"Bearer {token}"}
    agent_id = _seeded_agent_id(headers)

    r = requests.post(
        f"{API}/agent-business/{agent_id}/tester",
        headers=headers,
        json={"message": "Quels sont vos tarifs pour une identite de marque ?", "historique": []},
        timeout=60,
    )
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert isinstance(data.get("reponse"), str) and data["reponse"], f"empty/missing reponse: {data}"
    assert data.get("ia") is True, f"expected ia=True now that MAMMOTH_API_KEY is configured, got: {data}"
    assert data["reponse"] != FALLBACK_SENTENCE, f"AI returned the canned fallback sentence: {data['reponse']!r}"
    assert "1 200" in data["reponse"] or "1200" in data["reponse"], (
        f"expected reply to reference the Pack Identite price (1 200 EUR), got: {data['reponse']!r}"
    )


def test_tester_rejects_empty_message_with_422():
    token = _client_token()
    headers = {"Authorization": f"Bearer {token}"}
    agent_id = _seeded_agent_id(headers)

    r = requests.post(
        f"{API}/agent-business/{agent_id}/tester",
        headers=headers,
        json={"message": "", "historique": []},
        timeout=15,
    )
    assert r.status_code == 422, f"expected 422 for empty message, got {r.status_code}: {r.text}"
