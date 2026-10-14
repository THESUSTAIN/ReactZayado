"""Admin › Prix (un seul endroit pour les prix) et Journal (témoignages avec accord explicite)."""


def test_prix_admin_modifie_le_paiement_puis_revient_a_l_origine(client, compte, env, faux):
    _, h_admin = compte(role="admin")
    try:
        r = client.put("/api/admin/prix", headers=h_admin, json={
            "plans": {"pro": {"mensuel": 75, "annuel": 750}},
            "tunnel": {"kit": 29},
            "services": {"seance-clarte": {"title": "Séance clarté", "amount": 120}},
        })
        assert r.status_code == 200, r.text
        g = client.get("/api/tarifs/grille").json()  # public, sans connexion
        assert g["plans"]["pro"]["mensuel"] == 75 and g["plans"]["pro"]["annuel"] == 750
        # Le paiement Mollie encaisse le nouveau prix
        env(MOLLIE_API_KEY="test_cle")
        _, h = compte()
        p = client.post("/api/checkout", headers=h, json={"plan": "pro", "cycle": "annuel"})
        assert p.status_code == 200, p.text
        assert faux.mollie[p.json()["paymentId"]]["amount"]["value"] in ("750.00", "468.00")  # 468 = tarif fondateur s'il est ouvert
        # Service à l'unité et tunnel
        assert client.get("/api/commerce/offers/service/seance-clarte").json()["amount"] == 120
        assert client.get("/api/tunnel-zayado/offres", headers=h).json()["kit"]["prix"] == "29.00"
        # Garde-fous
        assert client.put("/api/admin/prix", headers=h_admin, json={"plans": {"pro": {"mensuel": 10, "annuel": 500}}}).status_code == 422
        assert client.put("/api/admin/prix", headers=h, json={}).status_code in (401, 403)
    finally:
        assert client.post("/api/admin/prix/origine", headers=h_admin).status_code == 200
    g = client.get("/api/tarifs/grille").json()
    assert g["plans"]["pro"]["mensuel"] == 69


def test_temoignage_jamais_publie_sans_accord(client, compte):
    _, h_admin = compte(role="admin")
    t = client.post("/api/admin/temoignages", headers=h_admin, json={"prenom": "Claire", "canal": "lien"}).json()
    jeton = t["lien"].rsplit("/", 1)[1]
    assert client.get(f"/api/public/temoignage/{jeton}").json()["prenom"] == "Claire"
    r = client.post(f"/api/public/temoignage/{jeton}", json={
        "texte": "Avant je repoussais mes chiffres, maintenant je les regarde chaque lundi.",
        "nom_affiche": "Claire M.", "accord_publication": False})
    assert r.status_code == 200, r.text
    assert client.put(f"/api/admin/temoignages/{t['id']}", headers=h_admin, json={"statut": "valide"}).status_code == 409
    assert client.get("/api/public/temoignage/inconnu").status_code == 404


def test_demande_whatsapp_prepare_un_lien(client, compte):
    _, h_admin = compte(role="admin")
    r = client.post("/api/admin/temoignages", headers=h_admin, json={"prenom": "Karim", "telephone": "06 12 34 56 78", "canal": "whatsapp"})
    assert r.status_code == 200, r.text
    assert r.json()["whatsapp"].startswith("https://wa.me/33612345678?text=")
