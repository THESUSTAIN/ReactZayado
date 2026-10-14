"""Zayado relie, il ne stocke pas : les inscrits d'un tunnel partent dans le CRM de l'utilisateur,
une seule relance par jour arrive dans le Plan d'action, et une décision discernée revient au bon moment."""
import time

import conftest


def _tunnel_en_ligne(client, h):
    client.put("/api/copilote/editeur", headers=h, json={"raison_sociale": "Atelier Test", "siren": "123456789",
                                                          "adresse": "1 rue de Lyon, 69001 Lyon", "email": "contact@atelier.test"})
    t = client.post("/api/copilote/tunnels", headers=h, json={"nom": "Guide trésorerie", "sujet": "trésorerie"})
    assert t.status_code == 200, t.text
    p = client.post(f"/api/copilote/tunnels/{t.json()['id']}/publier", headers=h)
    assert p.status_code == 200, p.text
    return p.json()["url"].rsplit("/", 1)[1]


def _attendre(cond, delai=3.0):
    fin = time.time() + delai
    while time.time() < fin:
        if cond():
            return True
        time.sleep(0.05)
    return False


def test_inscrit_vers_brevo_et_une_seule_relance_par_jour(client, compte, monkeypatch):
    envoyes = []
    original = conftest.FAUX.post

    def post(url, kw):
        if "api.brevo.com/v3/contacts" in url:
            envoyes.append(kw.get("json"))
            return conftest.FauxHttp.rep(201, {"id": 1})
        return original(url, kw)
    monkeypatch.setattr(conftest.FAUX, "post", post)

    _, h = compte()
    # Sans destination choisie, rien ne sort de Zayado
    assert client.get("/api/crm/reglages", headers=h).json()["cible"] == "aucun"
    assert client.put("/api/crm/reglages", headers=h, json={"cible": "brevo"}).status_code == 409  # clé pas encore reliée
    assert client.post("/api/connections/brevo", headers=h, json={"values": {"api_key": "xkeysib-test", "liste_id": "7"}}).status_code == 200
    r = client.put("/api/crm/reglages", headers=h, json={"cible": "brevo"})
    assert r.status_code == 200 and r.json()["cible"] == "brevo"

    slug = _tunnel_en_ligne(client, h)
    for nom, mail in (("Claire Martin", "claire@test.fr"), ("Karim B", "karim@test.fr")):
        assert client.post(f"/api/public/t/{slug}/contact", json={"nom": nom, "email": mail, "consentement": True}).status_code == 200

    assert _attendre(lambda: len(envoyes) >= 2), envoyes
    assert envoyes[0]["email"] == "claire@test.fr" and envoyes[0]["listIds"] == [7]
    assert envoyes[0]["attributes"] == {"FIRSTNAME": "Claire", "LASTNAME": "Martin"} and envoyes[0]["updateEnabled"] is True

    actions = client.get("/api/copilote/plan-action/vue", headers=h).json()
    relances = [a for a in str(actions).split("'titre': ") if "Relancer les nouveaux inscrits (2)" in a]
    assert relances, actions  # une seule action groupée, pas une par contact
    assert str(actions).count("Relancer ") == 1


def test_echec_crm_ne_bloque_pas_l_inscription(client, compte):
    _, h = compte()
    client.post("/api/connections/hubspot", headers=h, json={"values": {"access_token": "pat-test"}})
    assert client.put("/api/crm/reglages", headers=h, json={"cible": "hubspot"}).status_code == 200
    slug = _tunnel_en_ligne(client, h)
    # HubSpot injoignable pendant les tests : l'inscription réussit quand même, l'erreur est notée
    assert client.post(f"/api/public/t/{slug}/contact", json={"nom": "Sophie L", "email": "sophie@test.fr", "consentement": True}).status_code == 200
    assert _attendre(lambda: client.get("/api/crm/reglages", headers=h).json().get("derniere_erreur"))


def test_decision_discernee_revient_dans_le_plan_et_sur_la_vision(client, compte):
    _, h = compte()
    assert client.get("/api/vision/discernement", headers=h).json() == {"actif": False, "decisions": []}  # Ma Foi reste facultative
    client.put("/api/profile", headers=h, json={"contexte_metier": {"parcours_foi": True}})
    r = client.post("/api/mindset/foi/geste", headers=h, json={"genre": "decision", "reponses": [
        "Embaucher un premier salarié", "Pour ne plus tout porter seul", "Le coût", "Le résultat", "2026-12-01"]})
    assert r.status_code == 200, r.text
    d = client.get("/api/vision/discernement", headers=h).json()
    assert d["actif"] is True and d["decisions"][0]["decision"] == "Embaucher un premier salarié"
    assert d["decisions"][0]["reevaluer_le"] == "2026-12-01"
    plan = str(client.get("/api/copilote/plan-action/vue", headers=h).json())
    assert "Faire le point sur « Embaucher un premier salarié »" in plan and "1 déc." in plan


def test_point_du_jour_ne_s_empile_pas_dans_la_cloche(client, compte):
    import server
    email, h = compte()

    async def envoyer():
        from sqlalchemy import select
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
            for jour in ("2026-10-10", "2026-10-11", "2026-10-12"):
                await server.notifier(db, u.id, "relance", "Ton point du jour est prêt ☀️", "", "/", cle=f"relance:checkin:{jour}", push=False)
    client.portal.call(envoyer)
    items = client.get("/api/notifications", headers=h).json()["items"]
    assert sum(1 for i in items if i["titre"].startswith("Ton point du jour")) == 1


def test_mode_juridique_suit_la_conversation_sans_faux_declenchement():
    from juridique_ext import est_question_juridique, suit_un_sujet_juridique
    assert not est_question_juridique("Je revois mon emploi du temps, à quel endroit je mets la réunion ?")
    assert est_question_juridique("Que dit la loi sur le bail commercial ?")
    assert suit_un_sujet_juridique("Et dans mon cas, j'ai signé le 3 mars ?", ["Mon bailleur veut résilier mon bail"])
    assert not suit_un_sujet_juridique("Autre sujet : mon site web", ["Mon bailleur veut résilier mon bail"])


def test_bouton_juridique_toujours_et_non(client, compte):
    _, h = compte()
    assert client.post("/api/essai-reveur", headers=h).status_code == 200  # accès à l'IA (Rêveur offert)
    r = client.post("/api/copilote/chat", headers=h, json={"message": "Comment organiser ma semaine ?", "juridique": "toujours"})
    assert '"juridique": true' in r.text
    r = client.post("/api/copilote/chat", headers=h, json={"message": "Que dit la loi sur le bail ?", "juridique": "jamais"})
    assert '"juridique": true' not in r.text


def test_revue_de_la_semaine_proposee_puis_rangee(client, compte):
    import server
    from datetime import datetime
    from relances_ext import choisir_relance
    vendredi = datetime(2026, 10, 16, 16, 0)
    assert choisir_relance(maintenant=vendredi, revue_due=True, checkin_fait=True) == "revue"
    assert choisir_relance(maintenant=datetime(2026, 10, 15, 16, 0), revue_due=True, checkin_fait=True) != "revue"  # jeudi : pas encore
    assert choisir_relance(maintenant=datetime(2026, 10, 15, 16, 0), revue_due=True, checkin_fait=True,
                           jours_actifs={"1", "2", "3", "4"}) == "revue"  # semaine qui finit le jeudi

    email, h = compte()
    assert client.post("/api/essai-reveur", headers=h).status_code == 200

    async def proposer():
        from sqlalchemy import select
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
            assert await server.proposer_revue(db, u.id, "Claire")
            assert not await server.proposer_revue(db, u.id, "Claire")  # une seule fois par semaine
    client.portal.call(proposer)
    r = client.post("/api/copilote/chat", headers=h, json={"message": "1. J'ai signé deux clients\n2. Les relances\n3. Déléguer\n4. Les réseaux\n5. Mon site"})
    assert "Revue de la semaine" in r.text
    revue = client.get("/api/revue-hebdo", headers=h).json()["derniere"]
    assert revue["reponses"]["q1"] == "J'ai signé deux clients" and revue["reponses"]["q5"] == "Mon site"
