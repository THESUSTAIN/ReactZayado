"""Backend API tests for MyExtension Business."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mindset-mastery-32.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def seed_data(client):
    r = client.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---- Seed & KPIs ----
class TestKPIs:
    def test_kpis_after_seed(self, client):
        r = client.get(f"{API}/kpis")
        assert r.status_code == 200
        data = r.json()
        for k in ["tresorerie", "chiffre_affaires", "marge_nette", "resultat_net", "en_retard"]:
            assert k in data
        # 6 factures seeded, sum montants = 18300
        assert data["chiffre_affaires"] == 18300
        assert data["en_retard"] == 1850 + 1350

    def test_kpis_update_on_facture_add_delete(self, client):
        before = client.get(f"{API}/kpis").json()
        payload = {"client": "TEST_KPI", "reference": "TEST-KPI-1", "montant": 500, "statut": "Payée"}
        cr = client.post(f"{API}/factures", json=payload)
        assert cr.status_code == 200
        fid = cr.json()["id"]
        after = client.get(f"{API}/kpis").json()
        assert after["chiffre_affaires"] == before["chiffre_affaires"] + 500
        assert after["tresorerie"] == before["tresorerie"] + 500  # Payée + no depense
        # cleanup
        client.delete(f"{API}/factures/{fid}")
        final = client.get(f"{API}/kpis").json()
        assert final["chiffre_affaires"] == before["chiffre_affaires"]


# ---- Factures CRUD ----
class TestFactures:
    def test_crud_flow(self, client):
        # list
        r = client.get(f"{API}/factures")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # create
        cr = client.post(f"{API}/factures", json={"client": "TEST_Acme", "reference": "T-1", "montant": 999, "statut": "À envoyer"})
        assert cr.status_code == 200
        fid = cr.json()["id"]
        assert cr.json()["client"] == "TEST_Acme"
        # update
        ur = client.put(f"{API}/factures/{fid}", json={"client": "TEST_Acme2", "reference": "T-1", "montant": 1000, "statut": "Payée"})
        assert ur.status_code == 200
        assert ur.json()["client"] == "TEST_Acme2"
        assert ur.json()["statut"] == "Payée"
        # verify persisted via GET list
        lst = client.get(f"{API}/factures").json()
        assert any(f["id"] == fid and f["montant"] == 1000 for f in lst)
        # delete
        dr = client.delete(f"{API}/factures/{fid}")
        assert dr.status_code == 200
        lst2 = client.get(f"{API}/factures").json()
        assert not any(f["id"] == fid for f in lst2)

    def test_update_404(self, client):
        r = client.put(f"{API}/factures/nonexistent-id", json={"client": "x", "montant": 1})
        assert r.status_code == 404


# ---- Depenses CRUD ----
class TestDepenses:
    def test_crud(self, client):
        cr = client.post(f"{API}/depenses", json={"libelle": "TEST_dep", "categorie": "Autre", "montant": 42})
        assert cr.status_code == 200
        did = cr.json()["id"]
        lst = client.get(f"{API}/depenses").json()
        assert any(d["id"] == did for d in lst)
        dr = client.delete(f"{API}/depenses/{did}")
        assert dr.status_code == 200


# ---- Objectifs CRUD ----
class TestObjectifs:
    def test_crud(self, client):
        cr = client.post(f"{API}/objectifs", json={"titre": "TEST_obj", "categorie": "Impact", "valeur_actuelle": 1, "valeur_cible": 10, "unite": "u"})
        assert cr.status_code == 200
        oid = cr.json()["id"]
        ur = client.put(f"{API}/objectifs/{oid}", json={"titre": "TEST_obj2", "categorie": "Impact", "valeur_actuelle": 5, "valeur_cible": 10, "unite": "u"})
        assert ur.status_code == 200
        assert ur.json()["titre"] == "TEST_obj2"
        assert ur.json()["valeur_actuelle"] == 5
        dr = client.delete(f"{API}/objectifs/{oid}")
        assert dr.status_code == 200


# ---- Vision ----
class TestVision:
    def test_get_and_set(self, client):
        r = client.get(f"{API}/vision")
        assert r.status_code == 200
        assert "value" in r.json()
        new_val = "TEST_vision_" + str(int(time.time()))
        pr = client.put(f"{API}/vision", json={"key": "vision", "value": new_val})
        assert pr.status_code == 200
        assert pr.json()["value"] == new_val
        # verify persisted
        assert client.get(f"{API}/vision").json()["value"] == new_val


# ---- Rituels ----
class TestRituels:
    def test_crud_and_toggle(self, client):
        cr = client.post(f"{API}/rituels", json={"nom": "TEST_rituel", "detail": "test"})
        assert cr.status_code == 200
        rid = cr.json()["id"]
        assert cr.json()["done"] is False
        assert cr.json()["streak"] == 0
        # toggle on
        t1 = client.put(f"{API}/rituels/{rid}/toggle")
        assert t1.status_code == 200
        assert t1.json()["done"] is True
        assert t1.json()["streak"] == 1
        # toggle off - streak stays >=0
        t2 = client.put(f"{API}/rituels/{rid}/toggle")
        assert t2.status_code == 200
        assert t2.json()["done"] is False
        # delete
        assert client.delete(f"{API}/rituels/{rid}").status_code == 200


# ---- Humeur ----
class TestHumeur:
    def test_create_and_list(self, client):
        cr = client.post(f"{API}/humeur", json={"energie": 65, "humeur": "Bien", "note": "TEST"})
        assert cr.status_code == 200
        assert cr.json()["energie"] == 65
        lst = client.get(f"{API}/humeur").json()
        assert isinstance(lst, list) and len(lst) >= 1


# ---- Kairos AI ----
class TestKairos:
    def test_chat_streams_and_history(self, client):
        # Use plain requests with stream=True
        session_id = f"test_sess_{int(time.time())}"
        with requests.post(
            f"{API}/kairos/chat",
            json={"session_id": session_id, "message": "Bonjour, donne-moi une action concrète en une phrase.", "context": "Test"},
            stream=True,
            timeout=60,
        ) as r:
            assert r.status_code == 200
            body = b""
            for chunk in r.iter_content(chunk_size=None):
                body += chunk
                if len(body) > 3000:
                    break
        text = body.decode("utf-8", errors="ignore")
        assert len(text) > 0, "Empty Kairos response"
        # allow some delay for persistence
        time.sleep(1.5)
        h = client.get(f"{API}/kairos/history?session_id={session_id}")
        assert h.status_code == 200
        msgs = h.json()
        roles = [m["role"] for m in msgs]
        assert "user" in roles
        # assistant may be present if streaming completed
