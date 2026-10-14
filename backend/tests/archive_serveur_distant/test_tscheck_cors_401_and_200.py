"""Test: /api/state responses (401 unauthenticated, 200 authenticated) both
carry CORS headers for a cross-origin Origin, verifying the middleware
registration-order fix (CORSMiddleware must be outermost)."""
import os
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8002").rstrip("/")
API = f"{BASE_URL}/api"
ORIGIN = "http://localhost:3001"

EMAIL = "test.analyse@zayado.local"
PASSWORD = "Analyse2026!"


def test_401_response_has_cors_header():
    r = requests.get(f"{API}/state", headers={"Origin": ORIGIN}, timeout=15)
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"
    assert r.json().get("detail") == "Connexion requise."
    acao = r.headers.get("access-control-allow-origin")
    assert acao == ORIGIN, (
        f"401 response missing/incorrect CORS header, got: {acao!r}; "
        f"headers={dict(r.headers)}"
    )


def test_200_response_still_has_cors_header():
    login = requests.post(
        f"{API}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        headers={"Origin": ORIGIN},
        timeout=15,
    )
    assert login.status_code == 200, f"login failed: {login.status_code} {login.text}"
    token = login.json()["access_token"]
    assert isinstance(token, str) and len(token) > 10

    r = requests.get(
        f"{API}/state",
        headers={"Origin": ORIGIN, "Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    acao = r.headers.get("access-control-allow-origin")
    assert acao == ORIGIN, (
        f"200 response missing/incorrect CORS header, got: {acao!r}; "
        f"headers={dict(r.headers)}"
    )
