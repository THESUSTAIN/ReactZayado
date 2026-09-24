"""Test: GET /api/admin/diagnostics is admin-only (401 no token, 403 client
token, 200 admin token) and never leaks secret values (FERNET_KEY / JWT
secret from backend/.env), with 'cles' entries strictly boolean."""
import os
import json
import pathlib
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8002").rstrip("/")
API = f"{BASE_URL}/api"

CLIENT_EMAIL = "test.analyse@zayado.local"
CLIENT_PASSWORD = "Analyse2026!"
ADMIN_EMAIL = "admin.analyse@zayado.local"
ADMIN_PASSWORD = "jDkeqsrdA72XYHUGcdBQnbC-"
OLD_ADMIN_PASSWORD = "AdminAnalyse2026!"

ENV_PATH = pathlib.Path(__file__).resolve().parents[1] / ".env"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _read_env_secrets():
    secrets = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            if line.startswith("FERNET_KEY=") or line.startswith("JWT_SECRET="):
                key, _, value = line.partition("=")
                secrets[key] = value.strip()
    return secrets


def test_diagnostics_requires_admin_role():
    r = requests.get(f"{API}/admin/diagnostics", timeout=15)
    assert r.status_code == 401, f"expected 401 with no token, got {r.status_code}: {r.text}"

    client_token = _login(CLIENT_EMAIL, CLIENT_PASSWORD)
    r = requests.get(
        f"{API}/admin/diagnostics",
        headers={"Authorization": f"Bearer {client_token}"},
        timeout=15,
    )
    assert r.status_code == 403, f"expected 403 with client token, got {r.status_code}: {r.text}"


def test_diagnostics_admin_shape_and_no_secret_leak():
    admin_token = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    r = requests.get(
        f"{API}/admin/diagnostics",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15,
    )
    assert r.status_code == 200, f"expected 200 with admin token, got {r.status_code}: {r.text}"
    raw_text = r.text
    data = r.json()

    assert isinstance(data.get("cles"), dict) and data["cles"], f"missing 'cles' object: {data}"
    for key, value in data["cles"].items():
        assert isinstance(value, bool), f"cles['{key}'] is not boolean: {value!r}"

    assert data["cles"].get("ia_texte_mammouth") is True, (
        f"expected ia_texte_mammouth=True now that MAMMOTH_API_KEY is configured, got: {data['cles']}"
    )

    assert isinstance(data.get("manquantes"), list), f"missing 'manquantes' array: {data}"
    assert "ia_texte_mammouth" not in data["manquantes"], f"ia_texte_mammouth should not be in manquantes: {data['manquantes']}"
    assert "pret_pour_production" in data, f"missing 'pret_pour_production': {data}"

    secrets = _read_env_secrets()
    for name, value in secrets.items():
        if value:
            assert value not in raw_text, f"secret {name} value leaked in diagnostics response"
