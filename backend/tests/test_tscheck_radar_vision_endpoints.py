"""Test: Radar API returns 3 opportunities tied to Vision objectives,
and Vision board / wheel / roadmap / countdown / objectifs endpoints
respond 200 for the seeded client account."""
import os
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8002").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "test.analyse@zayado.local"
PASSWORD = "Analyse2026!"

SEEDED_OBJECTIVE_TITLES = {
    "Signer 2 clients recurrents",
    "Lancer l offre Marque Etape",
    "Publier chaque semaine sur LinkedIn",
}


def _client_token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def test_radar_returns_three_ia_opportunities_tied_to_objectives():
    token = _client_token()
    r = requests.get(
        f"{API}/cockpit/radar",
        params={"refresh": "true"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=90,
    )
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("source") == "ia", f"expected source='ia' now that MAMMOTH_API_KEY is configured, got: {data.get('source')}"
    opportunities = data.get("opportunities")
    assert isinstance(opportunities, list) and len(opportunities) == 3, f"expected 3 opportunities, got: {opportunities}"

    objectifs_seen = set()
    for item in opportunities:
        assert isinstance(item.get("score"), (int, float)), f"score not numeric: {item}"
        assert isinstance(item.get("message"), str) and item["message"], f"message missing: {item}"
        if item.get("objectif"):
            objectifs_seen.add(item["objectif"])

    matched = {seen for seen in objectifs_seen if any(seen.startswith(title) for title in SEEDED_OBJECTIVE_TITLES)}
    assert matched, (
        f"no opportunity objectif matches a seeded objective title; seen={objectifs_seen}"
    )


def test_vision_board_and_subendpoints_respond_200():
    token = _client_token()
    headers = {"Authorization": f"Bearer {token}"}

    for path in ("/vision/board", "/vision/wheel", "/vision/roadmap", "/vision/countdown", "/objectifs"):
        r = requests.get(f"{API}{path}", headers=headers, timeout=15)
        assert r.status_code == 200, f"{path} expected 200, got {r.status_code}: {r.text}"

    objectifs = requests.get(f"{API}/objectifs", headers=headers, timeout=15).json()
    titres = {o.get("titre") for o in objectifs}
    assert SEEDED_OBJECTIVE_TITLES.issubset(titres), f"seeded objective titles missing: {titres}"

    board = requests.get(f"{API}/vision/board", headers=headers, timeout=15).json()
    assert "cards" in board, f"board missing 'cards' key: {board}"
