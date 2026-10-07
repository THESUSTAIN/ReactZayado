"""Tests: Kairos auth (register/state isolation) and admin endpoint security."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://radar-ui.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SARA = {"email": "sara@zayado.fr", "password": "SaraTest2026!"}
ADMIN = {"email": "admin.test@zayado.fr", "password": "AdminTest2026!"}
VENDEUR = {"email": "test.radar@zayado.fr", "password": "TestRadar2026!"}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def sara_token():
    return _login(**SARA)


@pytest.fixture(scope="module")
def admin_token():
    return _login(**ADMIN)


# ── Bug fix 1 : register + /state isolation ──────────────────────────
class TestRegisterAndState:
    def test_register_new_account_and_state_is_blank(self):
        unique = uuid.uuid4().hex[:8]
        email = f"marie.test.{unique}@zayado.fr"
        password = "MarieTest2026!"

        r = requests.post(f"{API}/auth/register", json={"email": email, "password": password}, timeout=15)
        assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["email"] == email
        assert data["role"] == "client"
        token = data["access_token"]
        assert isinstance(token, str) and len(token) > 10

        # GET /state with token: prenom must be empty (not 'Camille'), onboarded false
        st = requests.get(f"{API}/state", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert st.status_code == 200, st.text
        js = st.json()
        assert js["onboarded"] is False, f"New account must not be onboarded: {js}"
        assert js["profile"]["prenom"] == "", f"prenom must be empty for new account, got: {js['profile']['prenom']!r}"
        # Data isolation: no priorities / no goal
        assert js["priorities"] == [], f"priorities should be empty: {js['priorities']}"
        assert js["goal"] is None, f"goal should be None: {js['goal']}"

    def test_duplicate_register_returns_409(self):
        r = requests.post(f"{API}/auth/register", json={"email": SARA["email"], "password": "whatever2026!"}, timeout=15)
        assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text}"


# ── Sécurité admin ───────────────────────────────────────────────────
class TestAdminSecurity:
    def test_vue_ensemble_without_token_denied(self):
        r = requests.get(f"{API}/admin/vue-ensemble", timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403 without token, got {r.status_code}: {r.text}"

    def test_vue_ensemble_with_client_token_denied(self, sara_token):
        r = requests.get(f"{API}/admin/vue-ensemble", headers={"Authorization": f"Bearer {sara_token}"}, timeout=15)
        assert r.status_code == 403, f"expected 403 for client, got {r.status_code}: {r.text}"

    def test_vue_ensemble_with_admin_token_ok(self, admin_token):
        r = requests.get(f"{API}/admin/vue-ensemble", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200, r.text
        js = r.json()
        assert "utilisateurs_total" in js and isinstance(js["utilisateurs_total"], int)
        assert "par_role" in js and isinstance(js["par_role"], dict)
        for k in ("client", "vendeur", "admin"):
            assert k in js["par_role"]


# ── Login des comptes fournis ────────────────────────────────────────
class TestLoginSeeds:
    def test_login_sara(self):
        assert _login(**SARA)

    def test_login_admin(self):
        assert _login(**ADMIN)

    def test_login_vendeur(self):
        assert _login(**VENDEUR)
