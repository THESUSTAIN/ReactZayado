"""Iteration 3 — Tunnel Zayado capture + offres + kit (simulation locale).
Utilise le TestClient de conftest.py (base in-memory, Mollie simulé)."""
import os


def test_offres(client):
    r = client.get("/api/tunnel-zayado/offres")
    assert r.status_code == 200
    d = r.json()
    assert "kit" in d and "fast_track" in d
    assert d["kit"]["titre"]
    assert d["kit"]["prix"]
    assert d["fast_track"]["prix"]


def test_capture_shopify_diagnostic_full_flow(client):
    body = {
        "email": f"TEST_shopdiag_{os.urandom(4).hex()}@example.com",
        "prenom": "Testeur",
        "situation": "tpe",
        "priorite": "tresorerie",
        "consentement": True,
        "source": "shopify-diagnostic",
    }
    r = client.post("/api/tunnel-zayado/capture", json=body)
    assert r.status_code == 200, r.text
    pid = r.json().get("prospect_id")
    assert pid

    g = client.get(f"/api/tunnel-zayado/prospect/{pid}")
    assert g.status_code == 200
    data = g.json()
    assert data["situation"] == "tpe"
    assert data["priorite"] == "tresorerie"
    assert data["prenom"] == "Testeur"

    # Mollie simulé (voir conftest FauxHttp) : commande kit créée, checkout_url renvoyée.
    os.environ["ENV"] = "local"  # pour éventuel chemin simulation côté backend
    r2 = client.post("/api/tunnel-zayado/kit/commande", json={"prospect_id": pid})
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2.get("commande_id")
    # Avec MOLLIE_API_KEY absente + ENV=local → simulation=true (statut paid immédiat)
    # Sinon le FauxHttp intercepte et renvoie pending. On tolère les deux.
    assert d2.get("statut") in ("paid", "pending")


def test_capture_consentement_requis(client):
    body = {"email": "TEST_noconsent@example.com", "prenom": "x", "consentement": False}
    r = client.post("/api/tunnel-zayado/capture", json=body)
    assert r.status_code == 422


def test_capture_email_invalide(client):
    body = {"email": "TEST_bademail", "prenom": "x", "consentement": True}
    r = client.post("/api/tunnel-zayado/capture", json=body)
    assert r.status_code == 422
