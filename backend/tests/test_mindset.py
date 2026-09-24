"""Bien-être & Mindset : carte du jour, parcours, carnet, déclencheurs, sécurité."""


def test_carte_du_jour_et_carnet(client, compte):
    _, h = compte()
    j = client.get("/api/mindset/aujourdhui", headers=h).json()
    carte = j["carte"]
    assert carte["titre"] and carte["questions"] and j["carte_faite"] is False
    r = client.post("/api/mindset/reponses", headers=h, json={"source": "carte", "ref": carte["id"], "reponses": ["Réponse A"]})
    assert r.status_code == 200
    assert client.get("/api/mindset/aujourdhui", headers=h).json()["carte_faite"] is True
    carnet = client.get("/api/mindset/carnet", headers=h).json()["items"]
    assert carnet[0]["titre"] == carte["titre"] and carnet[0]["reponses"][0]["reponse"] == "Réponse A"
    assert client.delete(f"/api/mindset/carnet/{carnet[0]['id']}", headers=h).status_code == 200


def test_parcours_un_jour_a_la_fois(client, compte):
    _, h = compte()
    items = client.get("/api/mindset/parcours", headers=h).json()["items"]
    assert {p["id"] for p in items} >= {"oser-vendre", "revenus-irreguliers", "dire-non", "rebondir"}
    d = client.post("/api/mindset/parcours/oser-vendre/demarrer", headers=h).json()
    assert d["prochain_jour"] == 1 and len(d["contenu"]) == 7
    assert client.post("/api/mindset/reponses", headers=h, json={"source": "parcours", "ref": "oser-vendre:2", "reponses": ["x"]}).status_code == 409
    assert client.post("/api/mindset/reponses", headers=h, json={"source": "parcours", "ref": "oser-vendre:1", "reponses": ["x"]}).status_code == 200
    # Jour 2 le même jour : refusé (un jour à la fois)
    assert client.post("/api/mindset/reponses", headers=h, json={"source": "parcours", "ref": "oser-vendre:2", "reponses": ["y"]}).status_code == 409
    d = client.get("/api/mindset/parcours/oser-vendre", headers=h).json()
    assert d["jours_faits"] == [1] and d["contenu"][0]["reponses"][0]["reponse"] == "x"
    assert client.get("/api/mindset/aujourdhui", headers=h).json()["parcours_actif"]["id"] == "oser-vendre"


def test_parcours_termine_cree_une_victoire(client, compte):
    import server
    email, h = compte()
    client.post("/api/mindset/parcours/dire-non/demarrer", headers=h)

    async def six_jours_faits():
        from sqlalchemy import select
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
            s = (await db.execute(select(server.MindsetParcours).where(server.MindsetParcours.user_id == u.id))).scalar_one()
            s.jours_faits, s.derniere_date = [1, 2, 3, 4, 5, 6], "2000-01-01"
            await db.commit()
    client.portal.call(six_jours_faits)
    r = client.post("/api/mindset/reponses", headers=h, json={"source": "parcours", "ref": "dire-non:7", "reponses": ["Fait !"]}).json()
    assert r["victoire"] and "Savoir dire non" in r["victoire"]
    assert any("Savoir dire non" in (v.get("title") or "") for v in [client.get("/api/state", headers=h).json()["victory"] or {}])


def test_declencheur_energie_basse(client, compte):
    _, h = compte()
    import server
    from datetime import date, timedelta

    async def trois_checkins_bas():
        from sqlalchemy import select
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).order_by(server.User.created_at.desc()).limit(1))).scalar_one()
            for i in range(3):
                db.add(server.VisionCheckin(user_id=u.id, date=(date.today() - timedelta(days=i)).isoformat(), energie=2))
            await db.commit()
    client.portal.call(trois_checkins_bas)
    s = client.get("/api/mindset/aujourdhui", headers=h).json()["suggestion"]
    assert s and s["carte"]["id"] == "journee-allegee"


def test_recadrage_et_detresse(client, compte):
    _, h = compte()
    r = client.post("/api/mindset/recadrer", headers=h, json={"pensee": "Je ne suis pas légitime pour vendre à ce prix."}).json()
    assert r["detresse"] is False and r["autre_regard"] and r["petit_pas"]
    r = client.post("/api/mindset/recadrer", headers=h, json={"pensee": "J'ai envie d'en finir avec tout ça"}).json()
    assert r["detresse"] is True and "3114" in r["message"]


def test_mini_exercice_public(client):
    r = client.get("/api/public/mindset/oser-vendre")
    assert r.status_code == 200 and r.json()["questions"]
    assert client.get("/api/public/mindset/inconnu").status_code == 404
