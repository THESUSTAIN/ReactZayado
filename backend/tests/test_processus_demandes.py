"""Caractérisation : Processus (/api/processus) et Demandes Collaborateurs (avant extraction de server.py)."""


def test_processus_lecture_vide_puis_enregistrement(client, compte):
    _, h = compte()
    assert client.get("/api/processus", headers=h).json() == {"items": []}
    items = [{"id": "p1", "titre": "Facturation"}]
    r = client.put("/api/processus", headers=h, json={"items": items})
    assert r.status_code == 200 and r.json() == {"ok": True, "items": items}
    assert client.get("/api/processus", headers=h).json() == {"items": items}


def test_processus_isole_par_compte(client, compte):
    _, h1 = compte()
    _, h2 = compte()
    client.put("/api/processus", headers=h1, json={"items": [{"id": "a"}]})
    assert client.get("/api/processus", headers=h2).json() == {"items": []}


def test_suppression_donnees_efface_processus(client, compte):
    _, h = compte()
    client.put("/api/processus", headers=h, json={"items": [{"id": "a"}]})
    assert client.delete("/api/donnees", headers=h).status_code == 200
    assert client.get("/api/processus", headers=h).json() == {"items": []}


def test_processus_trop_volumineux(client, compte):
    _, h = compte()
    r = client.put("/api/processus", headers=h, json={"items": [{"t": "x" * 10_000}] * 30})
    assert r.status_code == 413


def test_processus_exige_connexion(client):
    assert client.get("/api/processus").status_code == 401


def test_demande_collaborateur_parcours(client, compte):
    _, h = compte()
    assert client.post("/api/growth/work-request", headers=h, json={"message": "  "}).status_code == 422
    r = client.post("/api/growth/work-request", headers=h,
                    json={"message": "Besoin d'aide", "objet": "Site", "important": True, "contact": "moi@x.fr"})
    assert r.status_code == 200 and r.json()["ok"] is True
    mes = client.get("/api/demandes-collaborateur/mes", headers=h).json()["demandes"]
    assert len(mes) == 1
    assert mes[0]["message"].startswith("[IMPORTANT] Objet : Site")
    assert mes[0]["statut"] == "nouvelle" and mes[0]["reponse"] is None


def test_demandes_admin_reservees(client, compte):
    _, h = compte()
    assert client.get("/api/admin/demandes-collaborateur", headers=h).status_code == 403


def test_demande_traitee_par_admin(client, compte):
    _, h = compte()
    did = client.post("/api/growth/work-request", headers=h, json={"message": "Question"}).json()["id"]
    _, ha = compte(role="admin")
    liste = client.get("/api/admin/demandes-collaborateur", headers=ha).json()["demandes"]
    assert any(d["id"] == did for d in liste)
    assert client.patch(f"/api/admin/demandes-collaborateur/{did}", headers=ha, json={"statut": "bof"}).status_code == 422
    r = client.patch(f"/api/admin/demandes-collaborateur/{did}", headers=ha,
                     json={"statut": "traitee", "reponse": "C'est fait", "prevenir": False})
    assert r.status_code == 200 and r.json() == {"ok": True, "email_envoye": False}
    mes = client.get("/api/demandes-collaborateur/mes", headers=h).json()["demandes"][0]
    assert mes["statut"] == "traitee" and mes["reponse"] == "C'est fait"
    assert client.patch("/api/admin/demandes-collaborateur/inconnu", headers=ha, json={}).status_code == 404
