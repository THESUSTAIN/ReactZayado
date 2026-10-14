"""Test: GET /api/copilote/radar/entreprise/{siren} rejects invalid SIREN (422)
and returns a valid fiche (with BODACC/INPI links) for a real SIREN (200)."""
import os
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "test.essentielle@zayado.net"
PASSWORD = "Test!2026"


def _token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def test_radar_entreprise_invalid_siren_returns_422():
    token = _token()
    r = requests.get(
        f"{API}/copilote/radar/entreprise/123",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r.status_code == 422, f"expected 422 for invalid SIREN, got {r.status_code}: {r.text}"


def test_radar_entreprise_valid_siren_returns_detail():
    token = _token()
    headers = {"Authorization": f"Bearer {token}"}
    # Carrefour SIREN, from /radar/fiche search
    r = requests.get(f"{API}/copilote/radar/entreprise/652014051", headers=headers, timeout=20)
    assert r.status_code == 200, f"expected 200 for valid SIREN, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("siren") == "652014051", f"unexpected payload: {data}"
    assert "annonces" in data and isinstance(data["annonces"], list), f"missing annonces list: {data}"
    assert "inpi" in data, f"missing inpi info: {data}"
