"""Caractérisation des connexions WhatsApp (microservice QR) et Telegram (bot par compte).

Filet de sécurité avant d'extraire ces domaines de server.py : chaque route, les appels réseau
sortants (URL, en-têtes, corps) et les effets en base sont vérifiés. Réseau simulé, IA simulée.
"""
import json

import httpx
import pytest
from sqlalchemy import select

import server

SECRET = {"x-service-secret": "secret-test"}


def _rep(data, code=200):
    return httpx.Response(code, content=json.dumps(data).encode(), headers={"content-type": "application/json"},
                          request=httpx.Request("POST", "https://test.local"))


class Reseau:
    """Remplace httpx.AsyncClient.get/post : enregistre les appels, répond selon l'URL."""

    def __init__(self, monkeypatch):
        self.appels, self.reponses = [], {}
        reseau = self

        async def _appel(methode, url, kw):
            reseau.appels.append({"methode": methode, "url": url, **kw})
            for motif, rep in reseau.reponses.items():
                if motif in url:
                    if isinstance(rep, Exception):
                        raise rep
                    return _rep(rep)
            return _rep({"ok": True})

        async def post(self_c, url, **kw):
            return await _appel("POST", url, kw)

        async def get(self_c, url, **kw):
            return await _appel("GET", url, kw)

        monkeypatch.setattr(httpx.AsyncClient, "post", post)
        monkeypatch.setattr(httpx.AsyncClient, "get", get)

    def vers(self, motif):
        return [a for a in self.appels if motif in a["url"]]


class FauxLLM:
    def __init__(self, texte="Réponse IA"):
        self.texte, self.recus = texte, []

    async def send_message(self, m):
        self.recus.append(m.text)
        return self.texte


@pytest.fixture
def wa(monkeypatch):
    monkeypatch.setattr(server, "WA_SERVICE_SECRET", "secret-test")
    monkeypatch.setattr(server, "WA_SERVICE_URL", "http://wa.test")
    return Reseau(monkeypatch)


@pytest.fixture
def tg(monkeypatch):
    monkeypatch.setattr(server, "BACKEND_PUBLIC_URL", "https://api.zayado.test")
    monkeypatch.setenv("FRONTEND_PUBLIC_URL", "https://app.zayado.test")
    return Reseau(monkeypatch)


def _uid(client, email):
    async def lire():
        async with server.async_session() as db:
            return (await db.execute(select(server.User.id).where(server.User.email == email))).scalar_one()
    return client.portal.call(lire)


def _lignes(client, modele, uid):
    async def lire():
        async with server.async_session() as db:
            return list((await db.execute(select(modele).where(modele.user_id == uid))).scalars())
    return client.portal.call(lire)


def _ajouter(client, *objets):
    async def ecrire():
        async with server.async_session() as db:
            db.add_all(objets)
            await db.commit()
    client.portal.call(ecrire)


# ───────────────────────────── WhatsApp ─────────────────────────────

def test_wa_start_sans_secret_500(client, compte, monkeypatch):
    _, h = compte()
    monkeypatch.setattr(server, "WA_SERVICE_SECRET", "")
    assert client.post("/api/connections/whatsapp/start", headers=h).status_code == 500
    assert client.post("/api/connections/whatsapp/restart", headers=h).status_code == 500


def test_wa_start_appelle_le_microservice_et_enregistre(client, compte, wa):
    email, h = compte()
    uid = _uid(client, email)
    wa.reponses["/session/start"] = {"status": "qr", "qr": "data:image/png;base64,xx"}
    r = client.post("/api/connections/whatsapp/start", headers=h)
    assert r.json() == {"status": "qr", "qr": "data:image/png;base64,xx"}
    appel = wa.vers("/session/start")[0]
    assert appel["url"] == "http://wa.test/session/start"
    assert appel["headers"] == SECRET and appel["json"] == {"agent_id": uid, "agent_webhook_token": "kairos-mono"}
    conns = client.get("/api/connections", headers=h).json()
    assert [(c["provider"], c["status"], c["label"]) for c in conns] == [("whatsapp", "qr", "WhatsApp Web")]
    # second démarrage : même connexion mise à jour, pas de doublon
    wa.reponses["/session/start"] = {"status": "ready"}
    client.post("/api/connections/whatsapp/start", headers=h)
    assert [c["status"] for c in client.get("/api/connections", headers=h).json()] == ["ready"]


def test_wa_start_service_injoignable_502(client, compte, wa):
    _, h = compte()
    wa.reponses["/session/start"] = httpx.ConnectError("coupé")
    assert client.post("/api/connections/whatsapp/start", headers=h).status_code == 502
    assert client.get("/api/connections", headers=h).json() == []


def test_wa_restart(client, compte, wa):
    email, h = compte()
    uid = _uid(client, email)
    wa.reponses["/restart"] = {"status": "qr"}
    assert client.post("/api/connections/whatsapp/restart", headers=h).json() == {"status": "qr"}
    appel = wa.vers("/restart")[0]
    assert appel["url"] == f"http://wa.test/session/{uid}/restart" and appel["json"] == {"agent_webhook_token": "kairos-mono"}
    wa.reponses["/restart"] = httpx.ConnectError("coupé")
    assert client.post("/api/connections/whatsapp/restart", headers=h).status_code == 502


def test_wa_status_synchronise_avec_le_direct(client, compte, wa):
    email, h = compte()
    uid = _uid(client, email)
    wa.reponses["/status"] = {"status": "not_started"}
    assert client.get("/api/connections/whatsapp/status", headers=h).json() == {"status": "disconnected", "deja_relie": False}
    wa.reponses["/status"] = {"status": "ready", "phone_number": "33600000001"}
    st = client.get("/api/connections/whatsapp/status", headers=h).json()
    assert st["status"] == "ready" and st["phone_number"] == "33600000001" and st["deja_relie"] is True
    assert wa.vers("/status")[0]["url"] == f"http://wa.test/session/{uid}/status"
    wa.reponses["/status"] = {"status": "disconnected"}
    assert client.get("/api/connections/whatsapp/status", headers=h).json()["status"] == "disconnected"
    # direct injoignable : on garde l'état en base
    wa.reponses["/status"] = httpx.ConnectError("coupé")
    assert client.get("/api/connections/whatsapp/status", headers=h).json()["status"] == "disconnected"


def test_wa_ready_envoie_la_relance_avec_les_actions(client, compte, wa):
    email, h = compte()
    uid = _uid(client, email)
    _ajouter(client, server.VisionTache(user_id=uid, titre="Appeler Paul", statut="a_faire"))
    r = client.post("/api/webhooks/whatsapp-web-ready", headers=SECRET, json={"agent_id": uid, "phone_number": "336111"})
    assert r.json() == {"ok": True}
    envoi = wa.vers("/send")[0]
    assert envoi["url"] == "http://wa.test/send" and envoi["json"]["to"] == "336111"
    assert "1. Appeler Paul" in envoi["json"]["message"]


def test_wa_deconnexion(client, compte, wa):
    email, h = compte()
    uid = _uid(client, email)
    assert client.post("/api/webhooks/whatsapp-web-disconnected", json={"agent_id": uid}).status_code == 401
    assert client.post("/api/webhooks/whatsapp-web-disconnected", headers=SECRET, json={}).status_code == 400
    # sans connexion : rien à faire, mais OK
    assert client.post("/api/webhooks/whatsapp-web-disconnected", headers=SECRET, json={"agent_id": uid}).json() == {"ok": True}
    client.post("/api/webhooks/whatsapp-web-ready", headers=SECRET, json={"agent_id": uid})
    client.post("/api/webhooks/whatsapp-web-disconnected", headers=SECRET, json={"agent_id": uid})
    wa.reponses["/status"] = {"status": "not_started"}
    assert client.get("/api/connections/whatsapp/status", headers=h).json()["status"] == "disconnected"


def test_wa_message_repond_avec_l_ia_et_garde_l_historique(client, compte, wa, monkeypatch):
    email, _ = compte()
    uid = _uid(client, email)
    assert client.post("/api/webhooks/whatsapp-web", headers=SECRET, json={"message": "  ", "agent_id": uid}).json() == {"ok": True}
    llm = FauxLLM("Voici ton plan")
    vus = []
    monkeypatch.setattr(server, "_client_llm", lambda sid, systeme: vus.append((sid, systeme)) or llm)
    r = client.post("/api/webhooks/whatsapp-web", headers=SECRET, json={"message": "Que faire ?", "agent_id": uid})
    assert r.json() == {"reply": "Voici ton plan"}
    assert vus[0][0] == f"whatsapp-{uid}" and "WhatsApp" in vus[0][1] and llm.recus == ["Que faire ?"]
    msgs = sorted((m.role, m.contenu) for m in _lignes(client, server.VisionChatMessage, uid))
    assert msgs == [("assistant", "Voici ton plan"), ("user", "[WhatsApp] Que faire ?")]


def test_wa_message_repli_sans_ia(client, compte, wa, monkeypatch):
    email, _ = compte()
    uid = _uid(client, email)
    monkeypatch.setattr(server, "_client_llm", lambda *a: None)
    r = client.post("/api/webhooks/whatsapp-web", headers=SECRET, json={"message": "je suis à plat", "agent_id": uid}).json()
    assert r["reply"] == server._repli("je suis à plat")


# ───────────────────────────── Telegram ─────────────────────────────

def test_tg_connect_erreurs(client, compte, tg, monkeypatch):
    _, h = compte()
    corps = {"bot_token": "123456:ABCDEFGHIJ"}
    assert client.post("/api/connections/telegram/connect", headers=h, json={"bot_token": "court"}).status_code == 422
    tg.reponses["/getMe"] = {"ok": False}
    assert client.post("/api/connections/telegram/connect", headers=h, json=corps).status_code == 400
    tg.reponses["/getMe"] = {"ok": True, "result": {"username": "monbot"}}
    tg.reponses["/setWebhook"] = {"ok": False}
    assert client.post("/api/connections/telegram/connect", headers=h, json=corps).status_code == 502
    tg.reponses["/getMe"] = httpx.ConnectError("coupé")
    assert client.post("/api/connections/telegram/connect", headers=h, json=corps).status_code == 502
    monkeypatch.setattr(server, "BACKEND_PUBLIC_URL", "")
    assert client.post("/api/connections/telegram/connect", headers=h, json=corps).status_code == 500
    assert client.get("/api/connections/telegram/status", headers=h).json() == {"status": "disconnected"}


def test_tg_connect_enregistre_le_bot_chiffre(client, compte, tg, monkeypatch):
    from cryptography.fernet import Fernet
    monkeypatch.setattr(server, "_fernet", Fernet(Fernet.generate_key()))
    email, h = compte()
    uid = _uid(client, email)
    tg.reponses["/getMe"] = {"ok": True, "result": {"username": "monbot"}}
    r = client.post("/api/connections/telegram/connect", headers=h, json={"bot_token": " 123456:ABCDEFGHIJ "})
    assert r.json() == {"status": "ready", "label": "@monbot"}
    hook = tg.vers("/setWebhook")[0]
    assert hook["url"] == "https://api.telegram.org/bot123456:ABCDEFGHIJ/setWebhook"
    assert hook["json"] == {"url": f"https://api.zayado.test/api/webhooks/telegram/{uid}"}
    st = client.get("/api/connections/telegram/status", headers=h).json()
    assert st["provider"] == "telegram" and st["status"] == "ready" and st["label"] == "@monbot"
    conn = [c for c in _lignes(client, server.UserConnection, uid) if c.provider == "telegram"][0]
    assert "ABCDEFGHIJ" not in conn.credentials_enc
    assert json.loads(server._dechiffrer(conn.credentials_enc)) == {"bot_token": "123456:ABCDEFGHIJ"}


def _relier_tg(client, uid):
    _ajouter(client, server.UserConnection(user_id=uid, provider="telegram", status="ready",
                                           credentials_enc=server._chiffrer(json.dumps({"bot_token": "TOK"}))))


def _msg_tg(client, uid, texte):
    return client.post(f"/api/webhooks/telegram/{uid}", json={"message": {"chat": {"id": 42}, "text": texte}})


def _envois(tg):
    return [a["json"] for a in tg.vers("/sendMessage")]


def test_tg_webhook_sans_connexion_ou_message_vide(client, compte, tg):
    email, _ = compte()
    uid = _uid(client, email)
    assert _msg_tg(client, uid, "salut").json() == {"ok": True} and _envois(tg) == []
    _relier_tg(client, uid)
    assert client.post(f"/api/webhooks/telegram/{uid}", json={"message": {"chat": {"id": 42}}}).json() == {"ok": True}
    assert _envois(tg) == []


def test_tg_start_et_envoi_html(client, compte, tg):
    email, _ = compte()
    uid = _uid(client, email)
    _relier_tg(client, uid)
    assert _msg_tg(client, uid, "/start").json() == {"ok": True}
    envoi = tg.vers("/sendMessage")[0]
    assert envoi["url"] == "https://api.telegram.org/botTOK/sendMessage"
    assert envoi["json"]["chat_id"] == 42 and envoi["json"]["parse_mode"] == "HTML"
    assert "https://app.zayado.test/app" in envoi["json"]["text"]
    assert server._md_vers_html("**gras** et *ital* <b>") == "<b>gras</b> et <i>ital</i> &lt;b&gt;"


def test_tg_c_est_fait_cloture_la_derniere_action(client, compte, tg):
    email, _ = compte()
    uid = _uid(client, email)
    _relier_tg(client, uid)
    _msg_tg(client, uid, "c'est fait")
    assert "Rien d&#x27;ouvert" in _envois(tg)[-1]["text"]  # texte échappé en HTML par _md_vers_html
    _ajouter(client, server.VisionTache(user_id=uid, titre="Facturer Léa", statut="a_faire"))
    _msg_tg(client, uid, "C'est fait !")
    assert "<b>Facturer Léa</b> est bouclée" in _envois(tg)[-1]["text"]
    assert [t.statut for t in _lignes(client, server.VisionTache, uid)] == ["fait"]


def test_tg_dans_l_app_cree_la_micro_action(client, compte, tg):
    email, _ = compte()
    uid = _uid(client, email)
    _relier_tg(client, uid)
    _ajouter(client, server.VisionChatMessage(user_id=uid, role="assistant", contenu="**Relancer 3 clients**\nTu veux ?"))
    _msg_tg(client, uid, "mets-le dans l'app")
    taches = _lignes(client, server.VisionTache, uid)
    assert [(t.titre, t.micro, t.duree_min) for t in taches] == [("Relancer 3 clients", True, 5)]
    assert "priorités du jour" in _envois(tg)[-1]["text"]


def test_tg_oui_apres_question_tache_ou_validation(client, compte, tg):
    email, _ = compte()
    uid = _uid(client, email)
    _relier_tg(client, uid)
    _ajouter(client, server.VisionChatMessage(user_id=uid, role="assistant",
                                              contenu="Idée : **Écrire la newsletter**\nJe l'ajoute comme tâche ?"))
    _msg_tg(client, uid, "oui")
    assert [t.titre for t in _lignes(client, server.VisionTache, uid)] == ["Écrire la newsletter"]
    _ajouter(client, server.VisionChatMessage(user_id=uid, role="assistant",
                                              contenu="Proposition : **Monter les prix de 5 %**\nTu valides ?"))
    _msg_tg(client, uid, "ok")
    dec = _lignes(client, server.CopiloteDecision, uid)
    assert [(d.titre, d.statut, d.canal) for d in dec] == [("Monter les prix de 5 %", "approuvee", "telegram")]


def test_tg_message_libre_ia_puis_repli(client, compte, tg, monkeypatch):
    email, _ = compte()
    uid = _uid(client, email)
    _relier_tg(client, uid)
    llm = FauxLLM("**Bravo** pour ta semaine")
    vus = []
    monkeypatch.setattr(server, "_client_llm", lambda sid, systeme: vus.append((sid, systeme)) or llm)
    _msg_tg(client, uid, "Bilan de ma semaine ?")
    assert vus[0][0] == f"telegram-{uid}" and "Telegram" in vus[0][1]
    assert _envois(tg)[-1]["text"] == "<b>Bravo</b> pour ta semaine"
    monkeypatch.setattr(server, "_client_llm", lambda *a: None)
    _msg_tg(client, uid, "Et maintenant ?")
    assert _envois(tg)[-1]["text"] == server._md_vers_html(server._repli("Et maintenant ?"))
    # le fil de conversation est réinjecté au tour suivant
    monkeypatch.setattr(server, "_client_llm", lambda sid, systeme: vus.append((sid, systeme)) or llm)
    _msg_tg(client, uid, "Merci")
    assert "Bilan de ma semaine ?" in vus[-1][1]
    assert len([m for m in _lignes(client, server.VisionChatMessage, uid) if m.role == "user"]) == 3
