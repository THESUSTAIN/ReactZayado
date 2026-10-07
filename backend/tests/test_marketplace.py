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
