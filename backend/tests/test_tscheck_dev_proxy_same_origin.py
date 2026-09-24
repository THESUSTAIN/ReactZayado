"""Test: the frontend dev proxy serves /api same-origin on port 3001
(setupProxy.js fix), and the backend endpoint itself returns the expected
branding payload."""
import os
import requests

FRONTEND_URL = os.environ.get("ZAYADO_FRONTEND_URL", "http://localhost:3001").rstrip("/")


def test_dev_proxy_serves_connexion_options_same_origin():
    r = requests.get(f"{FRONTEND_URL}/api/connexion/options", timeout=15)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("nom_appli") == "Zayado", f"unexpected payload: {data}"
