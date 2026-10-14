"""Espace vendeur : photos, modération, publication Shopify (simulée)."""
import base64

JPG = b"\xff\xd8\xff\xe0" + b"0" * 3000


def _photo(client, h):
    return client.post("/api/vendeur/images", headers=h, json={"data": "data:image/jpeg;base64," + base64.b64encode(JPG).decode()})


def test_photo_reservee_aux_vendeurs(client, compte):
    _, h = compte()
    assert _photo(client, h).status_code == 403


def test_photo_format_controle(client, compte):
    _, h = compte(role="vendeur")
    gif = base64.b64encode(b"GIF89a" + b"0" * 50).decode()
    assert client.post("/api/vendeur/images", headers=h, json={"data": gif, "mime": "image/gif"}).status_code == 415


def test_parcours_vendeur_jusqu_a_shopify(client, compte, env, faux):
    env(SHOPIFY_SHOP_DOMAIN="test.myshopify.com", SHOPIFY_ADMIN_TOKEN="shpat_test")
    _, hv = compte(role="vendeur")
    _, ha = compte(role="admin")
    r = _photo(client, hv)
    assert r.status_code == 200
    url = r.json()["url"]
    assert client.get(f"/api/vendeur/images/{r.json()['id']}").status_code == 200  # lisible sans jeton (Shopify)
    client.put("/api/vendeur/profil", headers=hv, json={"nom_boutique": "Atelier Lumière", "email_contact": "v@t.fr", "conditions_acceptees": True})
    p = client.post("/api/vendeur/produits", headers=hv, json={
        "titre": "Bougie Rituel du soir", "prix": "24.90", "categorie": "Rituel", "images": [url],
        "description": "Bougie artisanale à la cire de soja, parfum lavande, 40 heures de combustion."}).json()
    assert client.post(f"/api/vendeur/produits/{p['id']}/soumettre", headers=hv).status_code == 200
    assert client.post(f"/api/vendeur/moderation/{p['id']}/publier", headers=hv).status_code == 403  # pas admin
    pub = client.post(f"/api/vendeur/moderation/{p['id']}/publier", headers=ha)
    assert pub.status_code == 200 and pub.json()["statut"] == "publie"
    envoi = next(a[2] for a in faux.appels if "myshopify" in a[1] and "product" in (a[2].get("variables") or {}))
    produit = envoi["variables"]["product"]
    assert produit["status"] == "ACTIVE" and "rituel" in produit["tags"] and "vendeur-atelier-lumiere" in produit["tags"]
    assert produit["files"][0]["originalSource"] == url and produit["seo"]["title"]
    assert any("publishablePublish" in a[2]["query"] for a in faux.appels if "myshopify" in a[1])


def test_vendeur_met_en_ligne_sans_moderation(client, compte, env, faux):
    """Bouton vendeur « Mettre en ligne » : publication directe sur Shopify, pas de file d'attente."""
    env(SHOPIFY_SHOP_DOMAIN="test.myshopify.com", SHOPIFY_ADMIN_TOKEN="shpat_test")
    _, hv = compte(role="vendeur")
    url = _photo(client, hv).json()["url"]
    # Profil incomplet → refus clair
    p = client.post("/api/vendeur/produits", headers=hv, json={
        "titre": "Carnet Clarté", "prix": "19.00", "categorie": "Organisation", "images": [url],
        "description": "Carnet de pilotage hebdomadaire : trois priorités, une page par semaine."})
    assert p.status_code == 400  # nom de boutique obligatoire avant toute fiche
    client.put("/api/vendeur/profil", headers=hv, json={"nom_boutique": "Papeterie Nord", "email_contact": "p@n.fr"})
    p = client.post("/api/vendeur/produits", headers=hv, json={
        "titre": "Carnet Clarté", "prix": "19.00", "categorie": "Organisation", "images": [url],
        "description": "Carnet de pilotage hebdomadaire : trois priorités, une page par semaine."}).json()
    assert client.post(f"/api/vendeur/produits/{p['id']}/mettre-en-ligne", headers=hv).status_code == 400  # conditions non acceptées
    client.put("/api/vendeur/profil", headers=hv, json={"conditions_acceptees": True})
    r = client.post(f"/api/vendeur/produits/{p['id']}/mettre-en-ligne", headers=hv)
    assert r.status_code == 200 and r.json()["statut"] == "publie" and r.json()["shopify_id"]
    assert client.post(f"/api/vendeur/produits/{p['id']}/mettre-en-ligne", headers=hv).status_code == 409  # déjà en ligne
    # Un autre vendeur ne peut pas toucher cette fiche
    _, hv2 = compte(role="vendeur")
    assert client.post(f"/api/vendeur/produits/{p['id']}/mettre-en-ligne", headers=hv2).status_code == 404


def test_admin_met_en_ligne_les_fiches_d_un_vendeur(client, compte, env, faux):
    """Bouton admin « Mettre en ligne les fiches de ce vendeur » : lot par vendeur, fiche incomplète ignorée mais listée."""
    env(SHOPIFY_SHOP_DOMAIN="test.myshopify.com", SHOPIFY_ADMIN_TOKEN="shpat_test")
    email, hv = compte(role="vendeur")
    _, ha = compte(role="admin")
    url = _photo(client, hv).json()["url"]
    client.put("/api/vendeur/profil", headers=hv, json={"nom_boutique": "Maison Sève", "email_contact": "m@s.fr", "conditions_acceptees": True})
    uid = next(v["id"] for v in client.get("/api/admin/commerce/vendors", headers=ha).json()["items"] if v["email"] == email)
    ok = client.post("/api/vendeur/produits", headers=hv, json={
        "titre": "Tisane du soir", "prix": "12.50", "categorie": "Corps", "images": [url],
        "description": "Mélange verveine, tilleul et camomille pour une soirée vraiment calme."}).json()
    incomplet = client.post("/api/vendeur/produits", headers=hv, json={"titre": "Sans photo", "prix": "5", "description": "trop court"}).json()
    assert client.post(f"/api/admin/commerce/vendors/{uid}/mettre-en-ligne", headers=hv).status_code == 403
    r = client.post(f"/api/admin/commerce/vendors/{uid}/mettre-en-ligne", headers=ha)
    assert r.status_code == 200
    corps = r.json()
    assert corps["mis_en_ligne"] == 1 and corps["echecs"] == 1
    par_id = {i["id"]: i for i in corps["items"]}
    assert par_id[ok["id"]]["ok"] and not par_id[incomplet["id"]]["ok"] and par_id[incomplet["id"]]["erreur"]
    statuts = {p["id"]: p["statut"] for p in client.get("/api/vendeur/produits", headers=hv).json()["items"]}
    assert statuts[ok["id"]] == "publie" and statuts[incomplet["id"]] == "brouillon"
    assert client.post("/api/admin/commerce/vendors/inconnu/mettre-en-ligne", headers=ha).status_code == 404
