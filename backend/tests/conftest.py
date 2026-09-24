"""
Suite de tests Zayado — autonome.

• L'API FastAPI tourne dans le processus de test (TestClient), sur une base
  SQLite temporaire : pas de serveur à lancer, pas de compte de démo requis.
• Tous les services externes (Mammouth, Apollo, DataForSEO, geo.api.gouv.fr,
  DVF, Shopify, Mollie) sont simulés : aucun appel réseau, aucun paiement.
• Chaque test crée ses propres comptes avec des e-mails uniques.
"""
import base64
import json
import os
import sys
import tempfile
import uuid

import pytest

_DB = os.path.join(tempfile.mkdtemp(prefix="zayado-tests-"), "test.db")
os.environ.update({
    "DATABASE_URL": f"sqlite+aiosqlite:///{_DB}",
    "JWT_SECRET": "tests-secret-" + "x" * 40,
    "REQUIRE_AUTH": "1",
    "VISION_WEEKLY_EMAIL": "0",
    "ADMIN_EMAILS": "admin.tests@zayado.test",
    "PUBLIC_FRONTEND_URL": "https://app.zayado.net",
})
# Aucune vraie clé pendant les tests (les tests qui en ont besoin les posent).
for _k in ("MAMMOTH_API_KEY", "MAMMOUTH_API_KEY", "EMERGENT_LLM_KEY", "OPENAI_API_KEY", "IMAGE_API_KEY", "APOLLO_API_KEY",
           "DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD", "SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_TOKEN", "MOLLIE_API_KEY"):
    os.environ.pop(_k, None)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

collect_ignore_glob = [] if os.environ.get("ZAYADO_LIVE_TESTS") == "1" else ["archive_serveur_distant/*"]

import httpx  # noqa: E402

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 200


class FauxHttp:
    """Réponses simulées des services externes. `appels` garde la trace des requêtes."""

    def __init__(self):
        self.appels = []
        self.mollie = {}      # paiements simulés : id → corps envoyé
        self.payes = set()    # ids que Mollie déclare « paid »

    @staticmethod
    def rep(code, data):
        r = httpx.Response(code, content=json.dumps(data).encode(), headers={"content-type": "application/json"},
                           request=httpx.Request("GET", "https://test.local"))
        return r

    def post(self, url, kw):
        corps = kw.get("json")
        self.appels.append(("POST", url, corps))
        if "mammouth" in url:
            if "image" in str((corps or {}).get("model")):
                data = "data:image/png;base64," + base64.b64encode(PNG).decode()
                return self.rep(200, {"choices": [{"message": {"content": "", "images": [{"image_url": {"url": data}}]}}]})
            return self.rep(503, {"error": "IA texte désactivée pendant les tests"})
        if "dataforseo" in url:
            mots = corps[0]["keywords"]
            return self.rep(200, {"tasks": [{"result": [
                {"keyword": k, "search_volume": 500 - i * 40, "cpc": 1.1, "competition": "MEDIUM",
                 "monthly_searches": [{"year": 2026, "month": m, "search_volume": 100 + 10 * m} for m in range(1, 13)]}
                for i, k in enumerate(mots)]}]})
        if "apollo.io" in url:
            if "api_search" in url:
                titre = ((corps or {}).get("person_titles") or ["CEO"])[0]
                return self.rep(200, {"people": [{"id": f"ap-{uuid.uuid4().hex[:8]}", "first_name": f"P{i}", "title": titre,
                                                  "organization": {"name": f"Société {i}"}} for i in range(8)]})
            if "bulk_match" in url:
                return self.rep(200, {"matches": [{"id": d["id"], "first_name": "Claire", "last_name": "Martin", "title": "Notaire",
                                                   "linkedin_url": "https://linkedin.com/in/test", "email": "claire@office.fr",
                                                   "organization": {"name": "Office", "primary_domain": "office.fr"}}
                                                  for d in corps["details"]]})
        if "api.mollie.com" in url:
            pid = f"tr_{uuid.uuid4().hex[:10]}"
            self.mollie[pid] = corps
            return self.rep(201, {"id": pid, "_links": {"checkout": {"href": f"https://www.mollie.com/checkout/{pid}"}}})
        if "myshopify.com" in url:
            q = corps["query"]
            if "productSet" in q:
                return self.rep(200, {"data": {"productSet": {"product": {"id": "gid://shopify/Product/1", "handle": "produit"}, "userErrors": []}}})
            if "publishablePublish" in q:
                return self.rep(200, {"data": {"publishablePublish": {"userErrors": []}}})
            return self.rep(200, {"data": {"publications": {"nodes": [{"id": "gid://shopify/Publication/1", "name": "Online Store"}]}}})
        return None

    def get(self, url, kw):
        self.appels.append(("GET", url, kw.get("params")))
        if "geo.api" in url:
            return self.rep(200, [{"code": "69266", "nom": "Villeurbanne", "codesPostaux": ["69100"],
                                   "centre": {"coordinates": [4.88, 45.77]}, "departement": {"nom": "Rhône"}}])
        if "api.mollie.com" in url:
            pid = url.rsplit("/", 1)[-1]
            return self.rep(200, {"id": pid, "status": "paid" if pid in self.payes else "open"})
        if "cerema" in url:
            return self.rep(200, {"count": 3, "next": None, "results": [
                {"valeurfonc": 250000, "sbati": 60, "libtypbien": "UN APPARTEMENT"},
                {"valeurfonc": 420000, "sbati": 110, "libtypbien": "UNE MAISON"},
                {"valeurfonc": 180000, "sbati": 45, "libtypbien": "UN APPARTEMENT"}]})
        return None


FAUX = FauxHttp()
_post, _get = httpx.AsyncClient.post, httpx.AsyncClient.get


async def _faux_post(self, url, *a, **kw):
    r = FAUX.post(str(url), kw)
    if r is not None:
        return r
    if str(url).startswith("http://testserver"):
        return await _post(self, url, *a, **kw)
    raise httpx.ConnectError(f"Réseau coupé pendant les tests : {url}")


async def _faux_get(self, url, *a, **kw):
    r = FAUX.get(str(url), kw)
    if r is not None:
        return r
    if str(url).startswith("http://testserver"):
        return await _get(self, url, *a, **kw)
    raise httpx.ConnectError(f"Réseau coupé pendant les tests : {url}")


httpx.AsyncClient.post, httpx.AsyncClient.get = _faux_post, _faux_get

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(server.app) as c:
        yield c


@pytest.fixture
def faux():
    FAUX.appels.clear()
    return FAUX


MDP = "Motdepasse-Test-2026!"


def nouvel_email(prefixe="user"):
    return f"{prefixe}.{uuid.uuid4().hex[:10]}@zayado.test"


@pytest.fixture
def compte(client):
    """Crée un compte et renvoie (email, en-têtes d'authentification)."""
    def _creer(email=None, prenom="Test", role=None, plan=None):
        email = email or nouvel_email()
        r = client.post("/api/auth/register", json={"email": email, "password": MDP, "firstName": prenom})
        assert r.status_code == 200, r.text
        t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()
        h = {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}
        if role or plan:
            async def maj():
                from sqlalchemy import select
                async with server.async_session() as db:
                    u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
                    if role:
                        u.role = role
                    if plan:
                        p = await server._profil(db, u.id)
                        p.plan = plan
                    await db.commit()
            client.portal.call(maj)
        return email, h
    return _creer


@pytest.fixture
def env(monkeypatch):
    """Pose des variables d'environnement pour un test (retirées ensuite)."""
    def _poser(**kv):
        for k, v in kv.items():
            monkeypatch.setenv(k, v)
    return _poser
