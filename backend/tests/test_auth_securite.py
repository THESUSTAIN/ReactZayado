"""Inscription, connexion, verrous d'accès."""
from conftest import MDP, nouvel_email


def test_inscription_puis_connexion(client):
    email = nouvel_email()
    r = client.post("/api/auth/register", json={"email": email, "password": MDP, "firstName": "Alex"})
    assert r.status_code == 200, r.text
    r = client.post("/api/auth/login", json={"email": email, "password": MDP})
    assert r.status_code == 200
    jeton = r.json().get("access_token") or r.json().get("token")
    moi = client.get("/api/auth/me", headers={"Authorization": f"Bearer {jeton}"})
    assert moi.status_code == 200 and moi.json()["email"] == email


def test_double_inscription_refusee_sans_500(client):
    email = nouvel_email()
    assert client.post("/api/auth/register", json={"email": email, "password": MDP}).status_code == 200
    r = client.post("/api/auth/register", json={"email": email, "password": MDP})
    assert 400 <= r.status_code < 500


def test_mauvais_mot_de_passe(client):
    email = nouvel_email()
    client.post("/api/auth/register", json={"email": email, "password": MDP})
    assert client.post("/api/auth/login", json={"email": email, "password": "faux-mot-de-passe"}).status_code in (400, 401)


def test_routes_privees_sans_jeton(client):
    for chemin in ("/api/state", "/api/connections", "/api/parrainage/mes-filleuls", "/api/abonnement", "/api/radar/signaux"):
        assert client.get(chemin).status_code == 401, chemin


def test_admin_refuse_aux_clients(client, compte):
    _, h = compte()
    assert client.get("/api/admin/utilisateurs", headers=h).status_code == 403


def test_role_admin_non_auto_attribuable(client):
    email = nouvel_email()
    client.post("/api/auth/register", json={"email": email, "password": MDP, "role": "admin"})
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()
    h = {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}
    assert client.get("/api/admin/utilisateurs", headers=h).status_code == 403
