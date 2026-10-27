"""Caractérisation : récupération des données du compte démo (/api/admin/compte-demo)."""

from conftest import MDP


def _admin(client, compte):
    email, _ = compte(role="admin")
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()  # le rôle est dans le jeton
    return {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}


def test_compte_demo_transfert(client, compte):
    import server
    email, h = compte()
    ha = _admin(client, compte)

    async def poser():
        async with server.async_session() as db:
            db.add(server.Idee(user_id=server.DEMO_USER_ID, titre="Idée orpheline"))
            await db.commit()
    client.portal.call(poser)
    d = client.get("/api/admin/compte-demo", headers=ha).json()
    assert d["compte_demo"] == server.DEMO_USER_ID
    idees = next(t for t in d["tables"] if t["table"] == server.Idee.__tablename__)
    assert idees["lignes"] >= 1 and idees["unique_par_utilisateur"] is False
    assert client.post("/api/admin/compte-demo/transferer", headers=ha, json={"email": "inconnu@x.fr"}).status_code == 404
    r = client.post("/api/admin/compte-demo/transferer", headers=ha,
                    json={"email": email.upper(), "tables": [server.Idee.__tablename__]}).json()
    assert r["ok"] is True and r["transferes"][server.Idee.__tablename__] >= 1
    assert client.get("/api/admin/compte-demo", headers=h).status_code == 403


