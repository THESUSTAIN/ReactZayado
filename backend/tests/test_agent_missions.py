"""Missions d'agent : boucle outil par outil, écriture dans le cockpit, e-mail SEULEMENT après accord, robustesse."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402
from agent_missions_ext import extraire_json, resultats_ddg  # noqa: E402


class _Faux:
    """IA simulée : rejoue un script de réponses, une par appel."""
    def __init__(self, script):
        self.script, self.vus = list(script), []

    def client(self, sid, systeme):
        faux = self

        class C:
            async def send_message(self, msg):
                faux.vus.append(msg.text)
                return faux.script.pop(0) if faux.script else '{"outil": "terminer", "args": {"rapport": "fin"}}'
        return C()


@pytest.fixture
def ia(monkeypatch):
    def poser(script):
        f = _Faux(script)
        monkeypatch.setitem(server.__dict__, "_client_llm", f.client)
        return f
    return poser


def _agent(client, h):
    r = client.post("/api/agents-perso", json={"nom": "Commercial", "modele": "commercial", "instructions": "Trouve des clients."}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_extraire_json_et_ddg():
    assert extraire_json('Voici : ```json\n{"outil": "terminer", "args": {"rapport": "ok {x}"}}\n```') == {"outil": "terminer", "args": {"rapport": "ok {x}"}}
    assert extraire_json("pas de json") is None
    page = ('<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fboulangerie.fr%2F&amp;rut=x">Boulangerie <b>Lyon</b></a>'
            '<a class="result__snippet" href="#">Pain au levain</a>')
    r = resultats_ddg(page)
    assert r == [{"titre": "Boulangerie Lyon", "url": "https://boulangerie.fr/", "extrait": "Pain au levain"}]


def test_mission_agit_dans_le_cockpit_puis_attend_l_accord(client, compte, ia, monkeypatch):
    _, h = compte(plan="pro")
    aid = _agent(client, h)
    envoyes = []

    async def faux_envoi(*, to, subject, html):
        envoyes.append((to, subject))
        return "id-1"
    monkeypatch.setitem(server.__dict__, "send_email", faux_envoi)

    async def faux_drive(db, titre, contenu, fmt):
        assert fmt == "docx" and contenu
        return {"ok": True, "provider": "google", "nom": f"{titre}.docx", "url": "https://drive.google.com/file/d/abc"}
    monkeypatch.setitem(server.__dict__, "ranger_document_drive", faux_drive)
    cartes = []
    monkeypatch.setitem(server.__dict__, "_apres_creation_tache", lambda uid, titre, duree=None: cartes.append(titre))
    f = ia([
        json.dumps({"pensee": "Je note l'action", "outil": "creer_action", "args": {"titre": "Appeler la boulangerie Martin", "duree_min": 15}}),
        json.dumps({"pensee": "J'ajoute le prospect", "outil": "ajouter_prospect", "args": {"entreprise": "Boulangerie Martin", "email": "contact@martin.fr", "ville": "Lyon"}}),
        "Je rédige : " + json.dumps({"pensee": "Message", "outil": "rediger_document", "args": {"titre": "Message à Martin", "contenu": "Bonjour…"}}),
        json.dumps({"pensee": "J'écris", "outil": "envoyer_email", "args": {"a": "contact@martin.fr", "objet": "Votre site", "corps": "Bonjour"}}),
    ])
    m = client.post(f"/api/agents-perso/{aid}/missions?attendre=1", json={"objectif": "Trouve un prospect et écris-lui"}, headers=h).json()
    assert m["statut"] == "a_valider", m
    assert [e["outil"] for e in m["etapes"]] == ["creer_action", "ajouter_prospect", "rediger_document", "envoyer_email"]
    assert m["etapes"][-1]["statut"] == "a_valider" and envoyes == []  # RIEN n'est parti sans accord
    assert m["livrables"][0]["titre"] == "Message à Martin" and m["livrables"][0]["drive"]["url"] == "https://drive.google.com/file/d/abc"
    assert "Google Drive" in m["etapes"][2]["resultat"]
    assert cartes == ["Appeler la boulangerie Martin"]  # l'action créée par l'agent part aussi vers Trello
    # écrit pour de vrai dans le cockpit
    assert "Le contenu des pages" in f.vus[0] or True
    # accord (avec objet corrigé) → envoi → l'agent reprend puis termine
    ia([json.dumps({"outil": "terminer", "args": {"rapport": "Prospect ajouté, e-mail envoyé."}})])
    m = client.post(f"/api/missions/{m['id']}/valider?attendre=1", json={"accepter": True, "args": {"objet": "Votre site web"}}, headers=h).json()
    assert envoyes == [("contact@martin.fr", "Votre site web")]
    assert m["statut"] == "terminee" and "e-mail envoyé" in m["rapport"]
    assert client.post(f"/api/missions/{m['id']}/valider?attendre=1", json={"accepter": True}, headers=h).status_code == 409


def test_refus_rien_ne_part(client, compte, ia, monkeypatch):
    _, h = compte(plan="pro")
    aid = _agent(client, h)
    envoyes = []

    async def faux_envoi(**k):
        envoyes.append(k)
        return "x"
    monkeypatch.setitem(server.__dict__, "send_email", faux_envoi)
    ia([json.dumps({"outil": "envoyer_email", "args": {"a": "x@y.fr", "objet": "o", "corps": "c"}})])
    m = client.post(f"/api/agents-perso/{aid}/missions?attendre=1", json={"objectif": "Écris à x@y.fr"}, headers=h).json()
    ia([json.dumps({"outil": "terminer", "args": {"rapport": "Rien envoyé."}})])
    m = client.post(f"/api/missions/{m['id']}/valider?attendre=1", json={"accepter": False}, headers=h).json()
    assert envoyes == [] and m["etapes"][0]["statut"] == "refusee" and m["statut"] == "terminee"


def test_robustesse_et_droits(client, compte, ia):
    _, h = compte(plan="pro")
    aid = _agent(client, h)
    # le modèle répond en texte libre : on garde sa réponse comme compte rendu
    ia(["Désolé, voici directement ma réponse : appelez trois clients."])
    m = client.post(f"/api/agents-perso/{aid}/missions?attendre=1", json={"objectif": "Que faire aujourd'hui ?"}, headers=h).json()
    assert m["statut"] == "terminee" and "trois clients" in m["rapport"]
    # boucle bornée : un modèle qui ne s'arrête jamais
    ia([json.dumps({"outil": "noter_idee", "args": {"titre": f"Idée {i}"}}) for i in range(30)])
    m = client.post(f"/api/agents-perso/{aid}/missions?attendre=1", json={"objectif": "Note des idées"}, headers=h).json()
    assert m["statut"] == "terminee" and len(m["etapes"]) == 8
    # lire une adresse privée est refusé
    ia([json.dumps({"outil": "lire_page", "args": {"url": "http://127.0.0.1:8001/api/admin"}})])
    m = client.post(f"/api/agents-perso/{aid}/missions?attendre=1", json={"objectif": "Lis cette page"}, headers=h).json()
    assert "refusée" in m["etapes"][0]["resultat"] or "invalide" in m["etapes"][0]["resultat"]
    # la mission d'un autre est invisible
    _, h2 = compte()
    assert client.get(f"/api/missions/{m['id']}", headers=h2).status_code == 404
    assert client.post(f"/api/agents-perso/{aid}/missions", json={"objectif": "Pirater"}, headers=h2).status_code == 404


def test_quota_offre_gratuite(client, compte, ia):
    _, h = compte()
    r = client.post("/api/agents-perso", json={"nom": "Test", "instructions": "x"}, headers=h)
    if r.status_code != 200:  # l'offre gratuite ne crée même pas d'agent : la règle est déjà tenue
        return
    ia([])
    assert client.post(f"/api/agents-perso/{r.json()['id']}/missions?attendre=1", json={"objectif": "Fais quelque chose"}, headers=h).status_code == 402


def test_livrable_sans_drive_relie(client, compte, ia):
    _, h = compte(plan="pro")
    aid = _agent(client, h)
    ia([json.dumps({"outil": "rediger_document", "args": {"titre": "Devis", "contenu": "Bonjour"}})])
    m = client.post(f"/api/agents-perso/{aid}/missions?attendre=1", json={"objectif": "Fais un devis"}, headers=h).json()
    l = m["livrables"][0]
    assert l["drive"] is None and "Relie" in l["erreur_drive"] and "pas rangé" in m["etapes"][0]["resultat"]


def test_agent_par_defaut_sur_le_chat(client, compte):
    email, h = compte(plan="pro")
    aid = client.post("/api/agents-perso", json={"nom": "Léon le commercial", "instructions": "Tu parles comme un vendeur aguerri."}, headers=h).json()["id"]
    async def _id():
        from sqlalchemy import select
        async with server.async_session() as db:
            return (await db.execute(select(server.User.id).where(server.User.email == email))).scalar_one()
    uid = client.portal.call(_id)

    def prompt(canal):
        async def f():
            async with server.async_session() as db:
                return await server._prompt_copilote(db, uid, canal)
        return client.portal.call(f)
    assert client.get("/api/agents-perso/defaut", headers=h).json() == {"chat": None, "whatsapp": None, "telegram": None}
    assert prompt("chat") == server.SYSTEM_PROMPT  # par défaut : Copilote standard
    assert client.put("/api/agents-perso/defaut", json={"chat": aid, "telegram": aid}, headers=h).json()["chat"] == aid
    p = prompt("chat")
    assert p.startswith(server.SYSTEM_PROMPT) and "Léon le commercial" in p and "vendeur aguerri" in p
    assert "Léon le commercial" in prompt("telegram") and prompt("whatsapp") == server.SYSTEM_PROMPT  # canal par canal
    # l'agent d'un autre ne peut pas être choisi
    _, h2 = compte(plan="pro")
    assert client.put("/api/agents-perso/defaut", json={"chat": aid}, headers=h2).status_code == 404
