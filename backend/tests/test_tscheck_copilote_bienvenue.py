"""Personalized AI welcome message on the first chat opening (Copilote).

- test.solo@zayado.net has an empty chat history: setting a profile (prenom +
  contexte_metier) then calling POST /copilote/bienvenue must create exactly
  one assistant message, personalized with the prenom, the activity/offer and
  3 numbered steps (1., 2., 3.).
- The message is written only once: a second call returns {cree:false,
  message:null} and history still has exactly 1 message.
- The endpoint requires auth: no token -> 401.
"""
import os
import re

import pytest
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "test.solo@zayado.net"
PASSWORD = "Test!2026"


def _headers():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_bienvenue_personalized_once_then_blocked():
    headers = _headers()

    # Profile the account the way the matrix describes it (safe to redo: idempotent PUT).
    profil = {
        "prenom": "Lucas",
        "texte_vision": "Dans un an : 10 clients récurrents",
        "onboarded": True,
        "contexte_metier": {
            "activite_type": "Développement web",
            "offre": "sites vitrines pour artisans",
            "clientele": "b2b",
        },
    }
    r = requests.put(f"{API}/profile", json=profil, headers=headers, timeout=20)
    assert r.status_code == 200, f"PUT /profile failed: {r.status_code} {r.text}"

    # Rerun-safety: the welcome message can only ever be written once per account
    # (by design — see criterion "written only once"), so a prior run of this very
    # test already consumed the "first call". Detect that case via history instead
    # of assuming a pristine account.
    rh0 = requests.get(f"{API}/copilote/history", headers=headers, timeout=15)
    assert rh0.status_code == 200, f"GET /copilote/history failed: {rh0.status_code} {rh0.text}"
    already_written = len(rh0.json()) >= 1

    r1 = requests.post(f"{API}/copilote/bienvenue", headers=headers, timeout=30)
    assert r1.status_code == 200, f"POST /copilote/bienvenue failed: {r1.status_code} {r1.text}"
    body1 = r1.json()

    if not already_written:
        assert body1["cree"] is True, f"expected cree=true on first call, got {body1}"
        message = body1["message"]
    else:
        assert body1 == {"cree": False, "message": None}, f"expected a no-op on an already-written account, got {body1}"
        message = rh0.json()[0]["contenu"]

    assert isinstance(message, str) and len(message) > 40, f"message too short/missing: {message!r}"
    assert "Lucas" in message, f"message should mention the prenom 'Lucas': {message!r}"
    assert re.search(r"site|artisan", message, re.IGNORECASE), f"message should mention the activity/offer: {message!r}"
    for n in ("1.", "2.", "3."):
        assert n in message, f"message should contain numbered step {n!r}: {message!r}"

    # History must contain exactly that one assistant message.
    rh = requests.get(f"{API}/copilote/history", headers=headers, timeout=15)
    assert rh.status_code == 200, f"GET /copilote/history failed: {rh.status_code} {rh.text}"
    hist = rh.json()
    assert len(hist) == 1, f"expected exactly 1 history message, got {len(hist)}: {hist}"
    assert hist[0]["role"] == "assistant"
    assert hist[0]["contenu"] == message, "history message must equal the welcome message returned by the API"

    # Second call must not write a second message.
    r2 = requests.post(f"{API}/copilote/bienvenue", headers=headers, timeout=30)
    assert r2.status_code == 200, f"second POST /copilote/bienvenue failed: {r2.status_code} {r2.text}"
    body2 = r2.json()
    assert body2 == {"cree": False, "message": None}, f"second call should be a no-op, got {body2}"

    rh2 = requests.get(f"{API}/copilote/history", headers=headers, timeout=15)
    assert rh2.status_code == 200
    assert len(rh2.json()) == 1, "history must still have exactly 1 message after the second call"


def test_bienvenue_requires_auth():
    # En mode aperçu développeur (APERCU_CODE posé), une requête sans jeton retombe
    # sur le compte démo : le 401 n'est vérifiable qu'hors aperçu (ex. production).
    sonde = requests.get(f"{API}/ia/statut", timeout=15)
    if sonde.status_code == 200:
        pytest.skip("Mode aperçu développeur actif : les routes sans jeton retombent sur le compte démo.")
    r = requests.post(f"{API}/copilote/bienvenue", timeout=15)
    assert r.status_code == 401, f"expected 401 without a token, got {r.status_code} {r.text}"
