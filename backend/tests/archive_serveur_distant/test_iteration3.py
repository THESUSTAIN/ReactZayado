"""Tests iteration 3: Login/connexion, Idées + règle métier, Sources, Transcrire."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kairos-vision.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ── Connexion / Auth ──

def test_connexion_options(s):
    r = s.get(f"{API}/connexion/options")
    assert r.status_code == 200
    d = r.json()
    assert "apercu_actif" in d
    assert d["google"] is True
    assert d["microsoft"] is True


def test_connexion_demo(s):
    r = s.post(f"{API}/connexion/demo", json={"email": "TEST_thomas@zayado.net"})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert "user" in d
    assert d["user"]["email"] == "TEST_thomas@zayado.net"


def test_oauth_google_configure(s):
    r = s.get(f"{API}/connexion/oauth/google/start")
    assert r.status_code == 200
    d = r.json()
    assert d["configured"] is True
    assert d.get("authorization_url", "").startswith("https://")


def test_oauth_microsoft_configure(s):
    r = s.get(f"{API}/connexion/oauth/microsoft/start")
    assert r.status_code == 200
    d = r.json()
    assert d["configured"] is True
    assert d.get("authorization_url", "").startswith("https://")


def test_oauth_unknown_provider(s):
    r = s.get(f"{API}/connexion/oauth/inconnu/start")
    assert r.status_code == 404


# ── Idées ──

def test_objectifs_list(s):
    r = s.get(f"{API}/objectifs")
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    # Seed d'onboarding attendu — au moins 1 objectif
    assert len(lst) >= 1


@pytest.fixture(scope="module")
def objectif_id(s):
    lst = s.get(f"{API}/objectifs").json()
    if lst:
        return lst[0]["id"]
    # Créer un objectif via PUT /profile fallback
    s.put(f"{API}/profile", json={"objectifs": ["TEST_obj_iter3"]})
    return s.get(f"{API}/objectifs").json()[0]["id"]


def test_create_idee(s):
    r = s.post(f"{API}/idees", json={"titre": "TEST_idee_capture", "impact": 8, "effort": 2})
    assert r.status_code == 200
    d = r.json()
    assert d["titre"] == "TEST_idee_capture"
    assert d["statut"] == "idee"
    assert d["score"] == 4.0  # 8/2
    # persist for later
    pytest.idee_id = d["id"]


def test_list_idees_and_filter(s):
    r = s.get(f"{API}/idees")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    r2 = s.get(f"{API}/idees", params={"statut": "idee"})
    assert r2.status_code == 200
    for it in r2.json():
        assert it["statut"] == "idee"


def test_patch_idee_fields(s):
    iid = pytest.idee_id
    r = s.patch(f"{API}/idees/{iid}", json={"titre": "TEST_idee_capture_v2", "impact": 6, "effort": 3})
    assert r.status_code == 200
    d = r.json()
    assert d["titre"] == "TEST_idee_capture_v2"
    assert d["score"] == 2.0


def test_rule_projet_without_objectif_rejected(s):
    iid = pytest.idee_id
    r = s.patch(f"{API}/idees/{iid}", json={"statut": "projet"})
    assert r.status_code == 400
    assert "objectif" in r.json().get("detail", "").lower()


def test_rule_action_without_objectif_rejected(s):
    iid = pytest.idee_id
    r = s.patch(f"{API}/idees/{iid}", json={"statut": "action"})
    assert r.status_code == 400
    assert "objectif" in r.json().get("detail", "").lower()


def test_rule_test_without_objectif_allowed(s):
    iid = pytest.idee_id
    r = s.patch(f"{API}/idees/{iid}", json={"statut": "test"})
    assert r.status_code == 200
    assert r.json()["statut"] == "test"


def test_rule_projet_with_objectif_allowed(s, objectif_id):
    iid = pytest.idee_id
    r1 = s.patch(f"{API}/idees/{iid}", json={"objectif_id": objectif_id})
    assert r1.status_code == 200
    r2 = s.patch(f"{API}/idees/{iid}", json={"statut": "projet"})
    assert r2.status_code == 200
    assert r2.json()["statut"] == "projet"


def test_delete_idee(s):
    iid = pytest.idee_id
    r = s.delete(f"{API}/idees/{iid}")
    assert r.status_code == 200
    r2 = s.delete(f"{API}/idees/{iid}")
    assert r2.status_code == 404


# ── Sources ──

def test_sources_analyser(s):
    payload = {"contenu": "Refaire le site, appeler 3 prospects, idée de podcast, automatiser la facturation"}
    r = s.post(f"{API}/sources/analyser", json=payload, timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert "proposals" in d
    assert isinstance(d["proposals"], list)


def test_sources_valider_retrogrades(s):
    # projet sans objectif → doit être rétrogradé en idée
    items = [
        {"titre": "TEST_sync_projet_noobj", "type": "projet", "objectif_id": None},
        {"titre": "TEST_sync_action_noobj", "type": "action", "objectif_id": None},
        {"titre": "TEST_sync_idee", "type": "idee", "objectif_id": None},
    ]
    r = s.post(f"{API}/sources/valider", json={"items": items})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("retrogrades", 0) >= 2
    # Vérifier que les idées créées apparaissent
    lst = s.get(f"{API}/idees").json()
    titres = {it["titre"]: it for it in lst}
    for t in ("TEST_sync_projet_noobj", "TEST_sync_action_noobj", "TEST_sync_idee"):
        assert t in titres, f"{t} manquant"
        assert titres[t]["source"] == "sync"
        # projet/action rétrogradés → statut = idee
        assert titres[t]["statut"] == "idee"
    # cleanup
    for t in titres.values():
        if t["titre"].startswith("TEST_sync"):
            s.delete(f"{API}/idees/{t['id']}")


# ── Transcrire ──

def test_transcrire_sans_fichier(s):
    r = s.post(f"{API}/transcrire")
    # FastAPI missing File(...) → 422
    assert r.status_code in (400, 422)


# ── Regression ──

@pytest.mark.parametrize("path", ["/state", "/vision/board", "/vision/wheel", "/idees"])
def test_regression(s, path):
    r = s.get(f"{API}{path}")
    assert r.status_code == 200
