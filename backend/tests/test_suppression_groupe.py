"""Suppression multiple d'utilisateurs + chiffres de la console qui se mettent à jour."""
from conftest import MDP


def _admin(client, compte):
    email, _ = compte(role="admin")
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()
    return email, {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}


def _id(client, h, email):
    r = client.get("/api/admin/utilisateurs", headers=h, params={"q": email}).json()
    return next(u["id"] for u in r["items"] if u["email"] == email)


def test_suppression_groupee_met_a_jour_liste_et_compteurs(client, compte):
    _, ha = _admin(client, compte)
    cibles = [compte()[0] for _ in range(3)]
    avant = client.get("/api/admin/utilisateurs", headers=ha).json()["stats"]["total"]
    ret_avant = client.get("/api/admin/retention", headers=ha).json()["actifs"]["total"]
    ids = [_id(client, ha, e) for e in cibles]

    # Sans la confirmation « SUPPRIMER » : rien n'est supprimé.
    r = client.post("/api/admin/utilisateurs/supprimer-groupe", headers=ha, json={"ids": ids, "confirmation": "oui"})
    assert r.status_code == 422
    assert client.get("/api/admin/utilisateurs", headers=ha).json()["stats"]["total"] == avant

    r = client.post("/api/admin/utilisateurs/supprimer-groupe", headers=ha, json={"ids": ids, "confirmation": "supprimer"})
    assert r.status_code == 200 and r.json()["supprimes"] == 3 and r.json()["ignores"] == []

    liste = client.get("/api/admin/utilisateurs", headers=ha).json()
    assert liste["stats"]["total"] == avant - 3
    assert not any(u["email"] in cibles for u in liste["items"])
    assert client.get("/api/admin/retention", headers=ha).json()["actifs"]["total"] == ret_avant - 3
    assert client.get("/api/admin/vue-ensemble", headers=ha).json()["utilisateurs_total"] == avant - 3


def test_suppression_groupee_ignore_admin_et_soi_meme_sans_bloquer_les_autres(client, compte):
    moi, ha = _admin(client, compte)
    autre_admin, _ = compte(role="admin")
    simple, _ = compte()
    ids = [_id(client, ha, e) for e in (moi, autre_admin, simple)]
    r = client.post("/api/admin/utilisateurs/supprimer-groupe", headers=ha, json={"ids": ids, "confirmation": "SUPPRIMER"}).json()
    assert r["supprimes"] == 1 and len(r["ignores"]) == 2
    emails = {u["email"] for u in client.get("/api/admin/utilisateurs", headers=ha).json()["items"]}
    assert moi in emails and autre_admin in emails and simple not in emails


def test_suppression_simple_decremente_aussi_les_compteurs(client, compte):
    _, ha = _admin(client, compte)
    e, _ = compte()
    avant = client.get("/api/admin/retention", headers=ha).json()["actifs"]["total"]
    r = client.post(f"/api/admin/utilisateurs/{_id(client, ha, e)}/supprimer", headers=ha, json={"confirmation": e})
    assert r.status_code == 200
    assert client.get("/api/admin/retention", headers=ha).json()["actifs"]["total"] == avant - 1
