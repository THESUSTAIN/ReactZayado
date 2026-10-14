"""Marque administrable : nom, logos, pieds de page, contact (Admin › Marque & entreprise)."""
import server
from conftest import MDP


def _admin_h(client, compte):
    email, _ = compte(role="admin")
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()
    return {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}


def test_marque_publique_valeurs_d_origine(client):
    d = client.get("/api/marque").json()
    assert d["nom_marque"] == "Zayado"
    assert "logo_email_url" in d and "contact_email" in d and "site_pied" in d


def test_marque_modifiee_par_admin_appliquee_partout(client, compte):
    h = _admin_h(client, compte)
    try:
        r = client.put("/api/admin/marque", headers=h, json={
            "nom_marque": "Ma Nouvelle Boite",
            "logo_email_url": "https://exemple.com/logo.png",
            "email_pied": "Envoyé par Ma Nouvelle Boite — 12 rue du Test, 69001 Lyon",
            "site_pied": "Une toute nouvelle baseline.",
            "contact_email": "bonjour@nouvelleboite.fr",
        })
        assert r.status_code == 200, r.text
        # Le GET public reflète les valeurs
        d = client.get("/api/marque").json()
        assert d["nom_marque"] == "Ma Nouvelle Boite"
        assert d["logo_email_url"] == "https://exemple.com/logo.png"
        assert d["site_pied"] == "Une toute nouvelle baseline."
        assert d["contact_email"] == "bonjour@nouvelleboite.fr"
        # L'aperçu e-mail (design HTML) porte le nouveau logo et le nouveau pied
        html = client.get("/api/admin/marque/apercu-email", headers=h).json()["html"]
        assert "https://exemple.com/logo.png" in html
        assert "Envoyé par Ma Nouvelle Boite" in html
        # Le gabarit réel des e-mails automatiques suit aussi
        assert "https://exemple.com/logo.png" in server._email_wrap("<p>test</p>")
    finally:
        assert client.post("/api/admin/marque/origine", headers=h).status_code == 200
    d = client.get("/api/marque").json()
    assert d["nom_marque"] == "Zayado" and d["logo_email_url"] != "https://exemple.com/logo.png"


def test_marque_garde_fous(client, compte):
    h = _admin_h(client, compte)
    # logo en http simple : refusé (contenu mixte dans les e-mails)
    assert client.put("/api/admin/marque", headers=h, json={"logo_email_url": "http://x.fr/l.png"}).status_code == 422
    # e-mail de contact invalide : refusé
    assert client.put("/api/admin/marque", headers=h, json={"contact_email": "pas-un-email"}).status_code == 422


def test_marque_reservee_aux_admins(client, compte):
    _, h = compte()
    assert client.put("/api/admin/marque", headers=h, json={"nom_marque": "X"}).status_code in (401, 403)
    assert client.post("/api/admin/marque/origine", headers=h).status_code in (401, 403)
    # Sans jeton : en aperçu développeur, le compte démo (rôle client) reçoit aussi 403
    assert client.get("/api/admin/marque/apercu-email").status_code in (401, 403)
