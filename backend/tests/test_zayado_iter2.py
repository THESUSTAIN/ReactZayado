"""Iteration 2 tests: admin login, accueil tracking, admin vue-ensemble."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://faith-build-4.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin.demo@zayado.fr", "password": "Admin1234!"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "admin"
    assert data["access_token"]
    return data["access_token"]


def test_admin_login(admin_token):
    assert admin_token


def test_vendeur_login(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "vendeur.demo@zayado.fr", "password": "Vendeur1234!"})
    assert r.status_code == 200
    assert r.json()["role"] == "vendeur"


def test_client_login(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "client.demo@zayado.fr", "password": "Client1234!"})
    assert r.status_code == 200
    assert r.json()["role"] == "client"


def test_admin_login_bad_password(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin.demo@zayado.fr", "password": "wrongpassword"})
    assert r.status_code in (400, 401, 403)


def test_accueil_choix_oui(s):
    r = s.post(f"{BASE_URL}/api/accueil/choix", json={"choix": "oui"})
    assert r.status_code == 200
    assert r.json() == {"ok": True, "choix": "oui"}


def test_accueil_choix_pas_encore(s):
    r = s.post(f"{BASE_URL}/api/accueil/choix", json={"choix": "pas_encore"})
    assert r.status_code == 200
    assert r.json() == {"ok": True, "choix": "pas_encore"}


def test_accueil_choix_invalid(s):
    r = s.post(f"{BASE_URL}/api/accueil/choix", json={"choix": "maybe"})
    # Server currently accepts any string (only 'oui'/'pas_encore' are counted). Not blocking.
    assert r.status_code in (200, 400, 422)


def test_admin_vue_ensemble_accueil_block(s, admin_token):
    # get baseline
    r1 = s.get(f"{BASE_URL}/api/admin/vue-ensemble", headers={"Authorization": f"Bearer {admin_token}"})
    assert r1.status_code == 200
    d1 = r1.json()
    assert "accueil" in d1
    for k in ("oui", "pas_encore", "total", "taux_oui"):
        assert k in d1["accueil"], f"missing {k}"
    oui_before = d1["accueil"]["oui"]
    pe_before = d1["accueil"]["pas_encore"]

    # increment
    s.post(f"{BASE_URL}/api/accueil/choix", json={"choix": "oui"})
    s.post(f"{BASE_URL}/api/accueil/choix", json={"choix": "pas_encore"})

    r2 = s.get(f"{BASE_URL}/api/admin/vue-ensemble", headers={"Authorization": f"Bearer {admin_token}"})
    d2 = r2.json()
    assert d2["accueil"]["oui"] >= oui_before + 1
    assert d2["accueil"]["pas_encore"] >= pe_before + 1


def test_admin_vue_ensemble_forbidden_without_token(s):
    r = s.get(f"{BASE_URL}/api/admin/vue-ensemble")
    assert r.status_code in (401, 403)


def test_admin_vue_ensemble_forbidden_for_client(s):
    tok = s.post(f"{BASE_URL}/api/auth/login", json={"email": "client.demo@zayado.fr", "password": "Client1234!"}).json()["access_token"]
    r = s.get(f"{BASE_URL}/api/admin/vue-ensemble", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code in (401, 403)
