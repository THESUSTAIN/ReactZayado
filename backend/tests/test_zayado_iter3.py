"""Iteration 3 tests: bootstrap admin login, sens tab regressions."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://faith-build-4.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def test_bootstrap_admin_login(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@thesustain.net",
        "password": "Zayado-Test-2026!",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "admin"
    assert data["access_token"]


def test_bootstrap_admin_can_hit_admin_endpoint(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@thesustain.net",
        "password": "Zayado-Test-2026!",
    })
    tok = r.json()["access_token"]
    r2 = s.get(f"{BASE_URL}/api/admin/vue-ensemble", headers={"Authorization": f"Bearer {tok}"})
    assert r2.status_code == 200


def test_legacy_admin_still_works(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin.demo@zayado.fr", "password": "Admin1234!"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_client_login(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "client.demo@zayado.fr", "password": "Client1234!"})
    assert r.status_code == 200
    assert r.json()["role"] == "client"
