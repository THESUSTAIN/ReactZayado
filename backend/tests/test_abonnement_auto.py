"""Abonnement automatique Mollie : essai → prélèvement, renouvellement, résiliation, Équipe, Rêveur."""
from datetime import datetime, timedelta, timezone


def _payer(client, faux, pid):
    faux.payes.add(pid)
    assert client.post("/api/mollie/webhook", data={"id": pid}).status_code == 200


def test_essai_programme_le_prelevement_au_tarif_fondateur(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle", TVA_TAUX="0.20")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "serenite", "essai": True}).json()
    corps = faux.mollie[r["paymentId"]]
    assert corps["sequenceType"] == "first" and corps["customerId"].startswith("cst_")
    _payer(client, faux, r["paymentId"])
    a = client.get("/api/abonnement", headers=h).json()
    assert a["renouvellement"]["automatique"] is True
    assert a["renouvellement"]["montant_ttc"] == "24.00"          # 24 € TTC fondateur (pas de TVA)
    sub = list(faux.abonnements.values())[-1]
    assert sub["interval"] == "1 month" and sub["amount"]["value"] == "24.00"
    assert sub["startDate"] == a["fin"][:10]                       # premier prélèvement à la fin de l'essai


def test_renouvellement_prolonge_puis_resiliation(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "pro", "cycle": "mensuel"}).json()
    _payer(client, faux, r["paymentId"])
    avant = client.get("/api/abonnement", headers=h).json()
    sid = list(faux.abonnements)[-1]
    faux.recurrents["tr_recurrent1"] = {"status": "paid", "subscriptionId": sid, "amount": {"value": "69.00", "currency": "EUR"}}
    client.post("/api/mollie/webhook", data={"id": "tr_recurrent1"})
    apres = client.get("/api/abonnement", headers=h).json()
    assert (datetime.fromisoformat(apres["fin"]) - datetime.fromisoformat(avant["fin"])).days == 31
    assert client.post("/api/abonnement/resilier", headers=h).status_code == 200
    a = client.get("/api/abonnement", headers=h).json()
    assert sid in faux.supprimes and a["acces"] == "actif" and a["renouvellement"]["resilie"] is True
    assert client.post("/api/abonnement/reprendre", headers=h).status_code == 200
    assert client.get("/api/abonnement", headers=h).json()["renouvellement"]["automatique"] is True


def test_reveur_quinze_euros_sans_sources_payantes(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle", TVA_TAUX="0.20", APOLLO_API_KEY="apollo-test")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "reveur", "cycle": "mensuel"}).json()
    assert faux.mollie[r["paymentId"]]["amount"]["value"] == "15.00"   # Rêveur : 15 € TTC
    _payer(client, faux, r["paymentId"])
    assert client.get("/api/abonnement", headers=h).json()["plan"] == "reveur"
    assert client.get("/api/radar/signaux", headers=h).json().get("verrou") is True
    s = client.get("/api/radar/sources", headers=h).json()
    assert next(x for x in s["sources"] if x["cle"] == "apollo")["etat"] == "hors_offre"


def test_equipe_invite_deux_coequipiers(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "business", "cycle": "mensuel"}).json()
    _payer(client, faux, r["paymentId"])
    e1, h1 = compte()
    assert client.get("/api/abonnement", headers=h1).json()["acces"] == "aucun"
    m = client.post("/api/equipe", headers=h, json={"email": e1}).json()
    client.post("/api/equipe", headers=h, json={"email": "b@zayado.test"})
    assert client.post("/api/equipe", headers=h, json={"email": "c@zayado.test"}).status_code == 409
    a1 = client.get("/api/abonnement", headers=h1).json()
    assert a1["acces"] == "actif" and a1["plan"] == "serenite" and a1["equipe"]["titulaire"]
    client.delete(f"/api/equipe/{m['id']}", headers=h)
    assert client.get("/api/abonnement", headers=h1).json()["acces"] == "aucun"


def test_equipe_reservee_a_l_offre_equipe(client, compte):
    _, h = compte()
    assert client.post("/api/equipe", headers=h, json={"email": "x@zayado.test"}).status_code == 403


def test_rappel_fin_essai_envoye_une_fois(client, compte, env, faux, monkeypatch):
    env(MOLLIE_API_KEY="test_cle")
    email, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "serenite", "essai": True}).json()
    _payer(client, faux, r["paymentId"])
    envois = []

    async def faux_mail(to, subject, html):
        envois.append((to, subject, html))
    import server
    monkeypatch.setitem(server.__dict__, "send_email", faux_mail)
    dans_55j = datetime.now(timezone.utc) + timedelta(days=55)
    client.portal.call(server.tour_rappels, dans_55j)
    client.portal.call(server.tour_rappels, dans_55j)
    miens = [e for e in envois if e[0] == email]
    assert len(miens) == 1 and "prélevés" in miens[0][2] and "Paramètres" in miens[0][2]


def test_passer_a_reveur_au_lieu_de_resilier(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle", TVA_TAUX="0.20", APOLLO_API_KEY="apollo-test")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "serenite", "essai": True}).json()
    _payer(client, faux, r["paymentId"])
    # Pendant l'essai : 10 prospects par mois au lieu de 30
    s = client.get("/api/radar/sources", headers=h).json()
    assert "/ 10 contacts" in next(x for x in s["sources"] if x["cle"] == "apollo")["detail"]
    c = client.post("/api/abonnement/changer", headers=h, json={"plan": "reveur"}).json()
    assert c["montant_ttc"] == "15.00"
    a = client.get("/api/abonnement", headers=h).json()
    assert a["plan"] == "serenite" and a["renouvellement"]["plan_suivant"] == "reveur"
    sid = list(faux.abonnements)[-1]
    assert faux.abonnements[sid]["amount"]["value"] == "15.00"
    faux.recurrents["tr_rev1"] = {"status": "paid", "subscriptionId": sid, "amount": {"value": "15.00", "currency": "EUR"}}
    client.post("/api/mollie/webhook", data={"id": "tr_rev1"})
    assert client.get("/api/abonnement", headers=h).json()["plan"] == "reveur"


def test_images_ia_limitees_en_reveur(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle", MAMMOUTH_API_KEY="m")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "reveur", "cycle": "mensuel"}).json()
    _payer(client, faux, r["paymentId"])
    codes = [client.post("/api/vision/image", headers=h, json={"prompt": "un bureau lumineux"}).status_code for _ in range(4)]
    assert codes[:3] == [200, 200, 200] and codes[3] == 429
