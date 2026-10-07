"""Test: GET /api/ia/statut reports the AI as genuinely active now that
MAMMOTH_API_KEY is configured, requires auth, and never leaks the API key
value found in backend/.env."""
import os
import pathlib
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8002").rstrip("/")
API = f"{BASE_URL}/api"

CLIENT_EMAIL = "test.analyse@zayado.local"
CLIENT_PASSWORD = "Analyse2026!"

ENV_PATH = pathlib.Path(__file__).resolve().parents[1] / ".env"


def _client_token():
    r = requests.post(f"{API}/auth/login", json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _mammoth_key_value():
    if not ENV_PATH.exists():
        return None
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("MAMMOTH_API_KEY="):
            return line.partition("=")[2].strip()
    return None


def test_ia_statut_requires_auth():
    r = requests.get(f"{API}/ia/statut", timeout=15)
    assert r.status_code == 401, f"expected 401 with no token, got {r.status_code}: {r.text}"


def test_ia_statut_active_and_no_key_leak():
    token = _client_token()
    r = requests.get(f"{API}/ia/statut", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    raw_text = r.text
    data = r.json()
    assert data.get("ia_active") is True, f"expected ia_active=True, got: {data}"
    assert data.get("modele") == "claude-sonnet-4-5", f"unexpected modele: {data}"
    assert data.get("message") is None, f"expected message=None when AI active, got: {data}"

    key_value = _mammoth_key_value()
    if key_value:
        assert key_value not in raw_text, "MAMMOTH_API_KEY value leaked in /api/ia/statut response"
