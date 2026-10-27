"""Caractérisation : Agent Business (/api/agent-business) — quotas, propriété, test sans IA."""


def _agent(**kw):
    return {"nom_marque": "Maison", "couleur": "rouge", "ton": "inconnu", "connaissances": "Ouvert le lundi", **kw}


def test_quota_par_offre(client, compte):
    _, h = compte(plan="essentielle")
    assert client.get("/api/agent-business", headers=h).json() == {"agents": [], "quota": 0}
    assert client.post("/api/agent-business", headers=h, json=_agent()).status_code == 403
    _, hp = compte(plan="pro")
    a = client.post("/api/agent-business", headers=hp, json=_agent()).json()
    assert a["couleur"] == "#DEC2A3" and a["ton"] == "chaleureux" and a["nom_marque"] == "Maison"
    assert client.post("/api/agent-business", headers=hp, json=_agent()).status_code == 403
    assert client.get("/api/agent-business", headers=hp).json()["quota"] == 1


def test_modifier_tester_supprimer(client, compte):
    _, h = compte(plan="business")
    aid = client.post("/api/agent-business", headers=h, json=_agent()).json()["id"]
    r = client.put(f"/api/agent-business/{aid}", headers=h, json=_agent(couleur="#112233", ton="direct"))
    assert r.json()["couleur"] == "#112233" and r.json()["ton"] == "direct"
    # Sans crédits IA, la porte de crédits répond 402 avant la route (comportement actuel)
    assert client.post(f"/api/agent-business/{aid}/tester", headers=h, json={"message": "Horaires ?"}).status_code == 402
    _, autre = compte(plan="business")
    assert client.put(f"/api/agent-business/{aid}", headers=autre, json=_agent()).status_code == 404
    assert client.delete(f"/api/agent-business/{aid}", headers=autre).status_code == 404
    assert client.delete(f"/api/agent-business/{aid}", headers=h).json() == {"ok": True}
    assert client.get("/api/agent-business", headers=h).json()["agents"] == []


def test_consigne_agent_publiee_pour_les_modules():
    import server
    for nom in ("AgentBusiness", "_consigne_agent", "_agent_du_proprietaire"):
        assert nom in vars(server)


def test_tester_sans_ia_repond_en_repli(client, compte, monkeypatch):
    import server
    from conftest import MDP
    email, _ = compte(role="admin")  # admin : ni quota ni crédits IA ; le rôle est lu dans le jeton
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()
    h = {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}
    aid = client.post("/api/agent-business", headers=h, json=_agent()).json()["id"]
    assert client.post(f"/api/agent-business/{aid}/tester", headers=h, json={"message": " "}).status_code == 422
    monkeypatch.setattr(server, "_client_llm", lambda *a, **k: None)
    r = client.post(f"/api/agent-business/{aid}/tester", headers=h, json={"message": "Horaires ?"}).json()
    assert r["ia"] is False and r["reponse"].startswith("Merci pour votre message")
