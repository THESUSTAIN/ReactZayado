"""Iteration 4 backend tests: OAuth keys, Brevo, Unsplash + régression."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kairos-vision.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── OAuth options & start ───
class TestOAuth:
    def test_options_google_microsoft_true(self, client):
        r = client.get(f"{API}/connexion/options", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("google") is True, d
        assert d.get("microsoft") is True, d

    def test_oauth_google_start_configured(self, client):
        r = client.get(f"{API}/connexion/oauth/google/start",
                       params={"redirect_uri": "https://app.zayado.net/api/connexion/oauth/google/callback"},
                       timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("configured") is True
        assert "accounts.google.com" in d.get("authorization_url", "")
        assert "client_id=" in d["authorization_url"]

    def test_oauth_microsoft_start_configured(self, client):
        r = client.get(f"{API}/connexion/oauth/microsoft/start",
                       params={"redirect_uri": "https://app.zayado.net/api/connexion/oauth/microsoft/callback"},
                       timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("configured") is True
        assert "login.microsoftonline.com" in d.get("authorization_url", "")

    def test_oauth_unknown_provider_404(self, client):
        r = client.get(f"{API}/connexion/oauth/inconnu/start", timeout=15)
        assert r.status_code == 404


# ─── Brevo email ───
class TestBrevo:
    def test_lien_envoie_true(self, client):
        r = client.post(f"{API}/connexion/lien",
                        json={"email": "noreply@zayado.net", "origin": "https://app.zayado.net"},
                        timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("envoye") is True, d


# ─── Unsplash ───
class TestUnsplash:
    def test_unsplash_mountain(self, client):
        r = client.get(f"{API}/unsplash", params={"q": "mountain", "count": 3}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        imgs = d.get("images", [])
        assert len(imgs) >= 1, d
        first = imgs[0]
        assert "images.unsplash.com" in first["url"]
        assert "thumb" in first and "author" in first


# ─── Régression ───
class TestRegression:
    def test_state(self, client):
        assert client.get(f"{API}/state", timeout=15).status_code == 200

    def test_idees(self, client):
        assert client.get(f"{API}/idees", timeout=15).status_code == 200

    def test_vision_board(self, client):
        assert client.get(f"{API}/vision/board", timeout=15).status_code == 200

    def test_vision_wheel(self, client):
        assert client.get(f"{API}/vision/wheel", timeout=15).status_code == 200

    def test_connexion_demo(self, client):
        r = client.post(f"{API}/connexion/demo", json={}, timeout=15)
        assert r.status_code == 200

    def test_idee_projet_sans_objectif_400(self, client):
        # create idea
        cr = client.post(f"{API}/idees", json={"titre": "TEST_iter4 projet sans obj", "impact": 3}, timeout=15)
        assert cr.status_code in (200, 201), cr.text
        idee_id = cr.json().get("id") or cr.json().get("idee", {}).get("id")
        assert idee_id
        try:
            r = client.patch(f"{API}/idees/{idee_id}", json={"statut": "projet"}, timeout=15)
            assert r.status_code == 400, r.text
            assert "objectif" in r.text.lower()
        finally:
            client.delete(f"{API}/idees/{idee_id}", timeout=15)
