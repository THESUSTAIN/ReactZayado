"""Plan d'action : objectifs ↔ actions (avancement automatique)."""


def test_objectif_actions_et_avancement(client, compte):
    _, h = compte()
    o = client.post("/api/objectifs", headers=h, json={"titre": "Signer 3 nouveaux clients"}).json()
    a1 = client.post("/api/taches", headers=h, json={"titre": "Relancer Nova", "objectif_id": o["id"]}).json()
    a2 = client.post("/api/taches", headers=h, json={"titre": "Envoyer la proposition"}).json()
    assert client.patch(f"/api/taches/{a2['id']}/objectif", headers=h, json={"objectif_id": o["id"]}).status_code == 200
    client.patch(f"/api/taches/{a1['id']}/statut", headers=h, json={"statut": "fait"})
    obj = next(x for x in client.get("/api/objectifs", headers=h).json() if x["id"] == o["id"])
    assert obj["nb_actions"] == 2 and obj["nb_faites"] == 1 and obj["progression"] == 50
    client.patch(f"/api/taches/{a2['id']}/statut", headers=h, json={"statut": "fait"})
    obj = next(x for x in client.get("/api/objectifs", headers=h).json() if x["id"] == o["id"])
    assert obj["progression"] == 100 and obj["statut"] == "termine"
    # Supprimer l'objectif garde les actions, détachées
    assert client.delete(f"/api/objectifs/{o['id']}", headers=h).status_code == 200
    assert all(t["objectif_id"] is None for t in client.get("/api/taches", headers=h).json()["items"])


def test_limite_5_objectifs_actifs(client, compte):
    _, h = compte()
    for i in range(5):
        assert client.post("/api/objectifs", headers=h, json={"titre": f"Objectif {i}"}).status_code == 200
    assert client.post("/api/objectifs", headers=h, json={"titre": "Un de trop"}).status_code == 409


def test_objectif_d_un_autre_compte_refuse(client, compte):
    _, h1 = compte()
    _, h2 = compte()
    o = client.post("/api/objectifs", headers=h1, json={"titre": "Privé"}).json()
    t = client.post("/api/taches", headers=h2, json={"titre": "X"}).json()
    assert client.patch(f"/api/taches/{t['id']}/objectif", headers=h2, json={"objectif_id": o["id"]}).status_code == 404
    assert client.patch(f"/api/objectifs/{o['id']}", headers=h2, json={"titre": "Piraté"}).status_code == 404
