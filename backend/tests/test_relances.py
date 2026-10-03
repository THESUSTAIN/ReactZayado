"""Moteur de relances + victoires côté serveur."""
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

import server
from relances_ext import choisir_relance, message_relance
from victoires_ext import detecter_victoire

PARIS = ZoneInfo("Europe/Paris")


def loc(y, m, d, h, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=PARIS)


# 2026-10-05 = lundi ; 10-06 mardi ; 10-07 mercredi ; 10-09 vendredi
def test_jamais_la_nuit():
    assert choisir_relance(maintenant=loc(2026, 10, 6, 7, 59)) is None
    assert choisir_relance(maintenant=loc(2026, 10, 6, 21, 0)) is None
    assert choisir_relance(maintenant=loc(2026, 10, 6, 23, 30)) is None


def test_checkin_apres_l_heure_choisie_seulement():
    assert choisir_relance(maintenant=loc(2026, 10, 6, 8, 0), heure_checkin="08:30") is None
    assert choisir_relance(maintenant=loc(2026, 10, 6, 8, 31), heure_checkin="08:30") == "checkin"
    assert choisir_relance(maintenant=loc(2026, 10, 6, 12), checkin_fait=True) is None


def test_un_seul_message_par_jour():
    assert choisir_relance(maintenant=loc(2026, 10, 6, 12), deja_envoye_aujourdhui=True) is None


def test_victoire_du_vendredi():
    assert choisir_relance(maintenant=loc(2026, 10, 9, 17), checkin_fait=True) == "victoire"
    assert choisir_relance(maintenant=loc(2026, 10, 9, 15), checkin_fait=True) is None
    assert choisir_relance(maintenant=loc(2026, 10, 9, 17), checkin_fait=True, victoire_cette_semaine=True) is None


def test_vision_le_lundi_et_rythme():
    assert choisir_relance(maintenant=loc(2026, 10, 5, 10), checkin_fait=True) == "vision"
    # vision remplie : pas deux lundis de suite
    assert choisir_relance(maintenant=loc(2026, 10, 5, 10), checkin_fait=True, derniers={"vision": date(2026, 9, 28)}) is None
    # vision vide : relancée chaque semaine
    assert choisir_relance(maintenant=loc(2026, 10, 5, 10), checkin_fait=True, vision_vide=True,
                           derniers={"vision": date(2026, 9, 28)}) == "vision"


def test_encouragement_seulement_si_ma_foi_activee():
    mercredi = loc(2026, 10, 7, 13)
    assert choisir_relance(maintenant=mercredi, checkin_fait=True, foi=False) is None
    assert choisir_relance(maintenant=mercredi, checkin_fait=True, foi=True) == "foi"
    assert choisir_relance(maintenant=mercredi, checkin_fait=True, foi=True, derniers={"foi": date(2026, 10, 5)}) is None


def test_teams_une_seule_fois():
    mardi = loc(2026, 10, 6, 11)
    assert choisir_relance(maintenant=mardi, checkin_fait=True, age_compte_jours=1) is None
    assert choisir_relance(maintenant=mardi, checkin_fait=True, age_compte_jours=3) == "teams"
    assert choisir_relance(maintenant=mardi, checkin_fait=True, age_compte_jours=3, derniers={"teams": date(2026, 10, 1)}) is None


def test_messages_sans_prenom_et_avec_prenom():
    assert message_relance("checkin")["corps"].startswith("Note ")
    assert message_relance("checkin", "Awa")["corps"].startswith("Awa, ")
    for t in ("checkin", "victoire", "vision", "foi", "teams"):
        assert message_relance(t)["titre"]


def test_detecter_victoire():
    assert detecter_victoire("J'ai signé mon premier client !") == "J'ai signé mon premier client"
    assert detecter_victoire("Ça y est, j'ai décroché le contrat") is not None
    assert detecter_victoire("Est-ce que j'ai signé le bon devis ?") is None
    assert detecter_victoire("Je dois signer demain") is None
    assert detecter_victoire("") is None


# ───────── intégration ─────────

def _uid_de(client, email):
    async def lire():
        from sqlalchemy import select
        async with server.async_session() as db:
            return (await db.execute(select(server.User.id).where(server.User.email == email))).scalar_one()
    return client.portal.call(lire)


def test_passage_complet_push_puis_une_seule_fois(client, compte, monkeypatch):
    email, h = compte()
    uid = _uid_de(client, email)
    envois = []

    async def faux_push(db, user_id, titre, corps, url="/app", tag="zayado"):
        envois.append((user_id, tag))
        return {"envoye": 1}
    monkeypatch.setitem(server.__dict__, "envoyer_push", faux_push)

    mardi_midi = datetime(2026, 10, 6, 12, 0, tzinfo=PARIS).astimezone(timezone.utc)

    async def preparer():
        async with server.async_session() as db:
            p = await server._profil(db, uid)
            p.onboarded, p.notifications, p.heure_checkin, p.fuseau = True, True, "08:00", "Europe/Paris"
            p.created_at = mardi_midi  # compte tout neuf : pas encore de relance Teams
            await db.commit()
    client.portal.call(preparer)

    r = client.portal.call(server.executer_relances, mardi_midi)
    mine = [x for x in r if x["user_id"] == uid]
    assert mine and mine[0]["type"] == "checkin" and mine[0]["canal"] == "push"
    # 2e passage le même jour : rien
    r2 = client.portal.call(server.executer_relances, mardi_midi + timedelta(hours=2))
    assert not [x for x in r2 if x["user_id"] == uid]
    assert envois.count((uid, "checkin")) == 1
    hist = client.get("/api/relances", headers=h).json()
    assert hist and hist[0]["type"] == "checkin"


def test_pas_de_relance_si_notifications_coupees_ou_rien_de_remis(client, compte, monkeypatch):
    email, h = compte()
    uid = _uid_de(client, email)
    mardi_midi = datetime(2026, 10, 6, 12, 0, tzinfo=PARIS).astimezone(timezone.utc)

    async def push_vide(db, user_id, titre, corps, url="/app", tag="zayado"):
        return {"envoye": 0}
    monkeypatch.setitem(server.__dict__, "envoyer_push", push_vide)

    async def preparer(notif):
        async with server.async_session() as db:
            p = await server._profil(db, uid)
            p.onboarded, p.notifications, p.heure_checkin = True, notif, "08:00"
            p.created_at = mardi_midi
            await db.commit()
    client.portal.call(preparer, True)   # rien n'est remis (pas d'appareil, pas de Telegram)
    assert not [x for x in client.portal.call(server.executer_relances, mardi_midi) if x["user_id"] == uid]
    assert client.get("/api/relances", headers=h).json() == []  # et rien n'est compté
    client.portal.call(preparer, False)
    assert not [x for x in client.portal.call(server.executer_relances, mardi_midi) if x["user_id"] == uid]


def test_victoires_ajout_liste_suppression(client, compte):
    _, h = compte()
    v = client.post("/api/victoires", headers=h, json={"texte": "Premier client signé", "detail": "Via LinkedIn"}).json()
    assert v["texte"] == "Premier client signé" and v["id"]
    # pas de doublon le même jour
    assert client.post("/api/victoires", headers=h, json={"texte": "premier client signé"}).json()["id"] == v["id"]
    tout = client.get("/api/victoires/tout", headers=h).json()
    assert tout["total"] == 1 and tout["items"][0]["detail"] == "Via LinkedIn"
    assert client.delete(f"/api/victoires/{v['id']}", headers=h).status_code == 200
    assert client.delete(f"/api/victoires/{v['id']}", headers=h).status_code == 404
    assert client.get("/api/victoires/tout", headers=h).json()["total"] == 0


def test_victoires_isolees_par_compte(client, compte):
    _, h1 = compte()
    _, h2 = compte()
    v = client.post("/api/victoires", headers=h1, json={"texte": "Contrat décroché"}).json()
    assert client.get("/api/victoires/tout", headers=h2).json()["total"] == 0
    assert client.delete(f"/api/victoires/{v['id']}", headers=h2).status_code == 404


def test_ranger_texte_libre_repli_sans_ia(client, compte):
    _, h = compte()
    r = client.post("/api/victoires/ranger", headers=h, json={"texte": "- Signé 2 clients\n- Lancé la newsletter\n- Terminé la compta"}).json()
    assert r["source"] == "simple" and len(r["crees"]) == 3
    assert client.get("/api/victoires/tout", headers=h).json()["total"] == 3


# ───────── WhatsApp : routes réellement appelées par le microservice ─────────

def test_whatsapp_ready_enregistre_la_connexion(client, compte, monkeypatch):
    email, h = compte()
    uid = _uid_de(client, email)
    monkeypatch.setattr(server, "WA_SERVICE_SECRET", "secret-test")
    ok = {"x-service-secret": "secret-test"}
    # sans secret ou sans identifiant : refusé
    assert client.post("/api/webhooks/whatsapp-web-ready", json={"agent_id": uid}).status_code == 401
    assert client.post("/api/webhooks/whatsapp-web-ready", headers=ok, json={}).status_code == 400
    r = client.post("/api/webhooks/whatsapp-web-ready", headers=ok, json={"agent_id": uid, "phone_number": "33612345678"})
    assert r.status_code == 200
    st = client.get("/api/connections/whatsapp/status", headers=h).json()
    assert st["status"] == "ready" and st["phone_number"] == "33612345678"


def test_whatsapp_message_exige_secret_et_identifiant(client, monkeypatch):
    monkeypatch.setattr(server, "WA_SERVICE_SECRET", "secret-test")
    assert client.post("/api/webhooks/whatsapp-web", json={"message": "salut", "agent_id": "x"}).status_code == 401
    r = client.post("/api/webhooks/whatsapp-web", headers={"x-service-secret": "secret-test"}, json={"message": "salut"})
    assert r.status_code == 400


# ── Rétention : jours choisis à l'inscription + mot doux après 3 jours d'absence ──
def test_checkin_respecte_les_jours_choisis():
    # 2026-10-03 est un samedi → code « 6 ». L'utilisateur n'a choisi que lundi-vendredi.
    assert choisir_relance(maintenant=loc(2026, 10, 3, 9, 0), jours_actifs={"1", "2", "3", "4", "5"}) is None
    assert choisir_relance(maintenant=loc(2026, 10, 3, 9, 0), jours_actifs={"6"}) == "checkin"
    # Dimanche = « 0 »
    assert choisir_relance(maintenant=loc(2026, 10, 4, 9, 0), jours_actifs={"0"}) == "checkin"
    # Aucun choix = tous les jours
    assert choisir_relance(maintenant=loc(2026, 10, 3, 9, 0), jours_actifs=set()) == "checkin"


def test_retour_apres_trois_jours_sans_checkin():
    assert choisir_relance(maintenant=loc(2026, 10, 7, 9, 0), inactif_jours=3) == "retour"
    assert choisir_relance(maintenant=loc(2026, 10, 7, 9, 0), inactif_jours=2) == "checkin"
    # Pas de harcèlement : une fois par semaine au plus, puis retour au rythme normal.
    from datetime import date
    assert choisir_relance(maintenant=loc(2026, 10, 7, 9, 0), inactif_jours=5, derniers={"retour": date(2026, 10, 4)}) == "checkin"
    assert choisir_relance(maintenant=loc(2026, 10, 14, 9, 0), inactif_jours=9, derniers={"retour": date(2026, 10, 7)}) == "retour"


def test_message_retour_existe():
    m = message_relance("retour", "Camille")
    assert m["tag"] == "retour" and "Camille" in m["corps"]
