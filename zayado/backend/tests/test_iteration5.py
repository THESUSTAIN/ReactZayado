"""
Iteration 5 backend tests:
- Vision→Idée→Action + push CRM (/api/idees, /api/idees/{id}/lancer)
- Cockpit widgets (/api/cockpit/pouls, /api/cockpit/radar, /api/cockpit/impact)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def objectif_id(api_client):
    """Retrieve an existing Vision objectif (seeded in demo mode)."""
    r = api_client.get(f"{API}/objectifs", timeout=10)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert isinstance(rows, list)
    if not rows:
        pytest.skip("No VisionObjectif seeded — cannot test Vision→Idée→Action flow.")
    return rows[0]["id"]


# ─────────── Vision → Idée → Action + push CRM ───────────
class TestIdeesLancer:

    def test_lancer_flow_success(self, api_client, objectif_id):
        # 1) Create Idée
        r = api_client.post(f"{API}/idees", json={
            "titre": "TEST_lancer_idea",
            "description": "TEST description",
            "impact": 8, "effort": 3,
        }, timeout=10)
        assert r.status_code == 200, r.text
        idea = r.json()
        idea_id = idea["id"]
        assert idea["statut"] == "idee"

        # 2) Try to go to action without objectif → must 400
        r = api_client.patch(f"{API}/idees/{idea_id}", json={"statut": "action"}, timeout=10)
        assert r.status_code == 400, f"Expected 400 without objectif, got {r.status_code}: {r.text}"

        # 3) Try /lancer while not action → must 400
        r = api_client.post(f"{API}/idees/{idea_id}/lancer", timeout=10)
        assert r.status_code == 400, f"Expected 400 lancer on non-action, got {r.status_code}: {r.text}"

        # 4) Link objectif
        r = api_client.patch(f"{API}/idees/{idea_id}", json={"objectif_id": objectif_id}, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["objectif_id"] == objectif_id

        # 5) Statut → action
        r = api_client.patch(f"{API}/idees/{idea_id}", json={"statut": "action"}, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["statut"] == "action"

        # 6) /lancer must return ok=true + skipped includes the 4 CRMs
        r = api_client.post(f"{API}/idees/{idea_id}/lancer", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "tache_id" in data and data["tache_id"]
        assert isinstance(data.get("pushed_to"), list)
        assert data["pushed_to"] == []  # no CRM env keys configured
        assert set(data.get("skipped", [])) == {"trello", "jira", "hubspot", "teams"}
        assert isinstance(data.get("errors"), dict)

        # cleanup
        api_client.delete(f"{API}/idees/{idea_id}", timeout=10)

    def test_lancer_not_action_returns_400(self, api_client, objectif_id):
        r = api_client.post(f"{API}/idees", json={
            "titre": "TEST_not_action",
            "objectif_id": objectif_id,
        }, timeout=10)
        assert r.status_code == 200, r.text
        idea_id = r.json()["id"]
        try:
            r = api_client.post(f"{API}/idees/{idea_id}/lancer", timeout=10)
            assert r.status_code == 400
        finally:
            api_client.delete(f"{API}/idees/{idea_id}", timeout=10)

    def test_lancer_unknown_id_404(self, api_client):
        r = api_client.post(f"{API}/idees/does-not-exist/lancer", timeout=10)
        assert r.status_code == 404


# ─────────── Cockpit widgets ───────────
class TestCockpit:

    def test_pouls_get_shape(self, api_client):
        r = api_client.get(f"{API}/cockpit/pouls", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("ca_mensuel", "ca_objectif", "factures_en_attente",
                  "tresorerie", "avancement", "alerte", "source", "phrase_ia"):
            assert k in data, f"Missing key {k} in /cockpit/pouls response: {data}"

    def test_pouls_put_updates_avancement(self, api_client):
        r = api_client.put(f"{API}/cockpit/pouls", json={
            "ca_objectif": 10000, "ca_mensuel": 3000, "tresorerie": 5000
        }, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ca_objectif"] == 10000
        assert data["ca_mensuel"] == 3000
        assert data["tresorerie"] == 5000
        assert data["avancement"] == 30, f"Expected avancement=30, got {data['avancement']}"

        # Verify persistence via GET
        r2 = api_client.get(f"{API}/cockpit/pouls", timeout=10)
        d2 = r2.json()
        assert d2["ca_objectif"] == 10000 and d2["ca_mensuel"] == 3000 and d2["avancement"] == 30

    def test_radar_returns_3_opportunities(self, api_client, objectif_id):
        r = api_client.get(f"{API}/cockpit/radar", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "opportunities" in data
        assert "phrase_ia" in data
        opps = data["opportunities"]
        assert isinstance(opps, list)
        assert len(opps) == 3, f"Expected 3 opportunities, got {len(opps)}"
        for op in opps:
            for k in ("titre", "canal", "message", "score", "objectif"):
                assert k in op, f"Opportunity missing {k}: {op}"

    def test_impact_shape(self, api_client):
        r = api_client.get(f"{API}/cockpit/impact", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("actions_bouclees", "checkins", "victoires", "periode"):
            assert k in data
        assert data["periode"] == "7_jours"
        assert isinstance(data["actions_bouclees"], int)
        assert isinstance(data["checkins"], int)
        assert isinstance(data["victoires"], int)
