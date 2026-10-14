"""Reprise & cession : calculs (valorisation, financement, négociation, suivi), droits, étapes, documents, suivi mensuel."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402,F401
from cession_ext import calculer, mensualite  # noqa: E402


def test_calculs():
    assert mensualite(100000, 0, 100) == 1000
    assert mensualite(200000, 4.5, 84) == 2780.03
    d = {"sens": "achat", "secteur": "commerce", "prix_affiche": 300000, "prix_final": 260000, "ebe": 70000,
         "apport": 60000, "emprunt": 200000, "taux": 4.5, "duree_mois": 84}
    r = calculer(d, [])
    assert r["valorisation"] == {"basse": 210000, "haute": 350000, "multiples": [3.0, 5.0], "multiple_prix": 3.71, "avis": "dans la fourchette"}
    f = r["financement"]
    assert f["annuite"] == 33360.36 and f["couverture"] == 2.1 and f["niveau"] == "confortable" and f["apport_pct"] == 23.1
    # économie négociée 40 000 € → forfait 3 = 2 850 + 20 % × 40 000 = 10 850 € HT
    assert r["negociation"] == {"economie": 40000, "honoraires_forfait3_ht": 10850, "gain_net": 29150}
    assert calculer({**d, "prix_final": 300000}, [])["negociation"]["honoraires_forfait3_ht"] == 3300
    s = calculer({**d, "ebe_previsionnel": 72000}, [{"mois": "2026-11", "ca": 30000, "charges": 25000}, {"mois": "2026-12", "ca": 34000, "charges": 26000}])["suivi"]
    assert [m["ebe"] for m in s["mois"]] == [5000, 8000] and s["objectif_mensuel"] == 6000
    assert s["mois"][0]["ecart_previsionnel"] == -1000 and s["mois"][1]["couvre_mensualite"] is True and s["tendance"] == "hausse"
    assert s["marge_apres_credit"] == round(13000 - 2 * 2780.03, 2)


def test_parcours_api(client, compte):
    _, client_lambda = compte()
    assert client.get("/api/cession/dossiers", headers=client_lambda).status_code == 403  # pas dans l'appli des clients
    _, h = compte(role="vendeur")
    r = client.post("/api/cession/dossiers", json={"sens": "achat", "nom": "Boulangerie Martin", "secteur": "commerce",
                                                   "prix_affiche": 300000, "prix_final": 260000, "ebe": 70000,
                                                   "apport": 60000, "emprunt": 200000, "taux": 4.5, "duree_mois": 84}, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["indicateurs"]["negociation"]["economie"] == 40000 and len(d["etapes"]) == 14
    did = d["id"]
    d = client.put(f"/api/cession/dossiers/{did}/etapes", json={"faites": [0, 1, 2, 99, -1]}, headers=h).json()
    assert d["etapes_faites"] == [0, 1, 2] and d["avancement"] == 21
    assert client.post(f"/api/cession/dossiers/{did}/documents", json={"titre": "Bilan 2025", "url": "javascript:alert(1)"}, headers=h).status_code == 422
    d = client.post(f"/api/cession/dossiers/{did}/documents", json={"titre": "Bilan 2025", "url": "https://drive.google.com/x"}, headers=h).json()
    assert d["documents"][0]["titre"] == "Bilan 2025"
    client.put(f"/api/cession/dossiers/{did}/suivi", json={"mois": "2026-11", "ca": 30000, "charges": 25000}, headers=h)
    d = client.put(f"/api/cession/dossiers/{did}/suivi", json={"mois": "2026-11", "ca": 31000, "charges": 25000}, headers=h).json()
    assert len(d["indicateurs"]["suivi"]["mois"]) == 1 and d["indicateurs"]["suivi"]["mois"][0]["ebe"] == 6000  # remplacé, pas doublé
    # le dossier d'un autre est invisible
    _, h2 = compte(role="vendeur")
    assert client.get(f"/api/cession/dossiers/{did}", headers=h2).status_code == 404
    assert client.get("/api/cession/dossiers", headers=h2).json()["dossiers"] == []
    # côté cédant : autres étapes, pas d'honoraires repreneur
    c = client.post("/api/cession/dossiers", json={"sens": "cession", "nom": "Mon entreprise", "prix_affiche": 150000, "prix_final": 140000, "ebe": 40000}, headers=h).json()
    assert len(c["etapes"]) == 13 and "negociation" not in c["indicateurs"]
    assert client.delete(f"/api/cession/dossiers/{did}", headers=h).status_code == 200
