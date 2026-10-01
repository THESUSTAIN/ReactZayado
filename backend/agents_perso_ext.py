"""« Mes agents » : des agents IA personnalisés, créés par l'utilisateur (inspiré de l'app-main).

- Créer un agent à partir d'un modèle (Commercial, Contenu, Finances, Juridique, Service client,
  Relances) ou de zéro : nom, rôle, instructions, compétences, connaissances, ton.
- Discuter avec lui dans Zayado : il connaît ton contexte (vision, objectifs, actions, entreprise)
  si tu l'autorises, et garde l'historique.
- Lui confier une MISSION récurrente (chaque jour / chaque lundi à l'heure choisie) : le résultat
  arrive dans son historique et, si le Copilote Telegram est relié, sur ton téléphone.
- Le BRANCHER sur ton Agent Business : le chatbot de ton site adopte ses instructions et ses
  compétences, en plus des informations de ton entreprise.
- Publier l'Agent Business sur un lien public (page de chat à partager / intégrer à ton site),
  avec limites anti-abus.
"""
import asyncio
import html
import json
import logging
import os
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import JSON, Boolean, DateTime, String, Text, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.agents_perso")

COMPETENCES = {
    "prospection": ("Prospection", "Tu rédiges des messages de prospection courts, personnalisés et sans pression, avec un objet d'e-mail et une relance J+3."),
    "emails": ("E-mails pros", "Tu rédiges des e-mails professionnels prêts à envoyer : objet, corps, formule de politesse. Tu ne prétends jamais les avoir envoyés."),
    "reseaux": ("Réseaux sociaux", "Tu crées des posts adaptés à chaque réseau (LinkedIn, Instagram, Facebook, TikTok) avec accroche, corps et appel à l'action."),
    "finances": ("Analyse financière", "Tu calcules marges, point mort, trésorerie et rentabilité, en montrant le calcul étape par étape, et tu proposes des actions concrètes."),
    "juridique": ("Juridique de base", "Tu expliques simplement les règles courantes (statuts, contrats, CGV, RGPD) et tu rappelles de faire valider par un professionnel pour les cas engageants."),
    "relances": ("Relances clients", "Tu prépares des relances polies et efficaces (devis, factures impayées, clients inactifs) en 3 niveaux de fermeté."),
    "planification": ("Organisation", "Tu découpes les projets en étapes datées, avec priorités et durée estimée, réalistes pour un indépendant."),
    "traduction": ("Traduction", "Tu traduis fidèlement en gardant le ton et le contexte culturel."),
    "service_client": ("Service client", "Tu réponds aux clients avec empathie, tu reformules leur demande et tu proposes une solution ou un relais humain."),
}

MODELES = [
    {"id": "commercial", "nom": "Assistant commercial", "description": "Prospection, devis, suivi des prospects.", "icone": "Briefcase",
     "instructions": "Tu es l'assistant commercial de l'entreprise. Tu aides à trouver des clients, à écrire aux prospects, à préparer des devis et à suivre les opportunités jusqu'à la signature.",
     "competences": ["prospection", "emails", "relances", "planification"],
     "mission": "Propose-moi 3 actions commerciales concrètes pour aujourd'hui, avec le message prêt à envoyer pour la première."},
    {"id": "contenu", "nom": "Rédacteur de contenu", "description": "Posts, newsletters, articles à ta voix.", "icone": "PenTool",
     "instructions": "Tu es le rédacteur de contenu de l'entreprise. Tu écris à la voix de la marque, simplement, sans jargon, pour attirer des clients.",
     "competences": ["reseaux", "emails", "traduction"],
     "mission": "Écris-moi le post LinkedIn de la semaine à partir de mes objectifs et de mes dernières victoires."},
    {"id": "finances", "nom": "Analyste financier", "description": "Marges, trésorerie, rentabilité.", "icone": "TrendingUp",
     "instructions": "Tu es l'analyste financier d'une petite entreprise. Tu rends les chiffres compréhensibles et tu proposes des décisions simples.",
     "competences": ["finances", "planification"],
     "mission": "Fais-moi le point rentabilité de la semaine : ce qui va, ce qui coince, et une action pour améliorer la marge."},
    {"id": "juridique", "nom": "Assistant juridique", "description": "Statuts, contrats, CGV, RGPD.", "icone": "Scale",
     "instructions": "Tu es un assistant juridique pour indépendants et TPE. Tu expliques clairement, avec des exemples, sans remplacer un avocat.",
     "competences": ["juridique", "emails"], "mission": ""},
    {"id": "service_client", "nom": "Service client", "description": "Réponses aux clients, SAV, FAQ.", "icone": "MessageCircle",
     "instructions": "Tu es le service client de l'entreprise. Tu réponds avec chaleur et précision, et tu passes la main à un humain quand c'est nécessaire.",
     "competences": ["service_client", "emails", "traduction"], "mission": ""},
    {"id": "relances", "nom": "Agent relances", "description": "Devis sans réponse, impayés, clients à réveiller.", "icone": "BellRing",
     "instructions": "Tu t'occupes des relances : devis sans réponse, factures en retard, clients à réactiver. Toujours poli, jamais insistant.",
     "competences": ["relances", "emails"],
     "mission": "Chaque lundi, liste-moi les relances à faire cette semaine et prépare les 3 messages les plus importants."},
]

QUOTA = {"serenite": 1, "pro": 3, "business": 10, "entreprise": -1}
ICONES = {"Bot", "Briefcase", "PenTool", "TrendingUp", "Scale", "MessageCircle", "BellRing", "Sparkles", "Search", "Users"}

# Anti-abus du chat public : par IP et par chatbot.
_PUB_IP: dict = defaultdict(deque)
_PUB_BOT: dict = defaultdict(deque)


def _limite(file: deque, n: int, fenetre: float) -> bool:
    maintenant = time.time()
    while file and file[0] < maintenant - fenetre:
        file.popleft()
    if len(file) >= n:
        return False
    file.append(maintenant)
    return True


def install_agents_perso(g: dict) -> None:
    api, Base, get_db, app = g["api"], g["Base"], g["get_db"], g.get("app")
    _uid, new_uuid, utcnow, async_session = g["_uid"], g["new_uuid"], g["utcnow"], g["async_session"]
    DEMO_USER_ID, _role_courant = g["DEMO_USER_ID"], g["_role_courant"]

    class AgentPerso(Base):
        __tablename__ = "agents_perso"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        nom: Mapped[str] = mapped_column(String(80))
        description: Mapped[str] = mapped_column(String(200), default="")
        icone: Mapped[str] = mapped_column(String(30), default="Bot")
        modele: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
        instructions: Mapped[str] = mapped_column(Text, default="")
        competences: Mapped[list] = mapped_column(JSON, default=list)
        connaissances: Mapped[str] = mapped_column(Text, default="")
        ton: Mapped[str] = mapped_column(String(20), default="chaleureux")
        contexte: Mapped[bool] = mapped_column(Boolean, default=True)
        mission: Mapped[str] = mapped_column(Text, default="")
        frequence: Mapped[str] = mapped_column(String(12), default="aucune")  # aucune / quotidien / hebdo
        heure: Mapped[str] = mapped_column(String(5), default="08:00")
        derniere_mission: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
        chatbot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class AgentPersoMessage(Base):
        __tablename__ = "agents_perso_messages"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        agent_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        role: Mapped[str] = mapped_column(String(10))  # moi / agent / mission
        texte: Mapped[str] = mapped_column(Text)
        cree_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    class ChatbotPublication(Base):
        __tablename__ = "chatbot_publications"
        agent_business_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        jeton: Mapped[str] = mapped_column(String(48), unique=True, index=True)
        actif: Mapped[bool] = mapped_column(Boolean, default=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["AgentPerso"], g["AgentPersoMessage"], g["ChatbotPublication"] = AgentPerso, AgentPersoMessage, ChatbotPublication

    # ───────────── utilitaires ─────────────
    def _json(a: AgentPerso) -> dict:
        return {"id": a.id, "nom": a.nom, "description": a.description, "icone": a.icone, "modele": a.modele,
                "instructions": a.instructions, "competences": a.competences or [], "connaissances": a.connaissances,
                "ton": a.ton, "contexte": bool(a.contexte), "mission": a.mission, "frequence": a.frequence, "heure": a.heure,
                "derniere_mission": a.derniere_mission.isoformat() if a.derniere_mission else None,
                "chatbot_id": a.chatbot_id, "updated_at": a.updated_at.isoformat() if a.updated_at else None}

    async def _quota(db, uid) -> int:
        if _role_courant() == "admin":
            return -1
        p = await g["_profil"](db, uid)
        return QUOTA.get(p.plan or "essentielle", 0)

    async def _mien(db, agent_id) -> AgentPerso:
        a = await db.get(AgentPerso, agent_id)
        if not a or a.user_id != _uid():
            raise HTTPException(404, "Agent introuvable.")
        return a

    _TONS = {"chaleureux": "chaleureux et bienveillant", "professionnel": "professionnel et précis", "direct": "direct et concis"}

    def _systeme(a: AgentPerso, contexte: str = "") -> str:
        lignes = [f"Tu es « {a.nom} », un agent IA personnalisé dans Zayado, le cockpit de l'entrepreneur.",
                  f"Ton rôle : {a.instructions.strip() or a.description or 'aider ton utilisateur dans son activité.'}",
                  f"Ton : {_TONS.get(a.ton, _TONS['chaleureux'])}. Réponds en français (ou dans la langue de l'utilisateur), de façon concrète et actionnable.",
                  "Règles : n'invente jamais de chiffres, de faits ou d'actions que tu n'as pas réalisées ; tu n'envoies rien toi-même, tu prépares.",
                  "Ne dis jamais quel modèle d'IA tu es."]
        comp = [COMPETENCES[c][1] for c in (a.competences or []) if c in COMPETENCES]
        if comp:
            lignes.append("Tes compétences :\n- " + "\n- ".join(comp))
        if a.connaissances.strip():
            lignes.append("Informations fournies par l'utilisateur (à utiliser en priorité) :\n" + a.connaissances.strip()[:20000])
        if contexte:
            lignes.append("Contexte de l'utilisateur dans Zayado :\n" + contexte)
        return "\n\n".join(lignes)

    async def _appel_ia(session: str, systeme: str, message: str) -> Optional[str]:
        client = g["_client_llm"](session, systeme)
        if client is None:
            return None
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=message)), timeout=60)
        return (texte or "").strip()

    async def _contexte_complet(db, uid) -> str:
        parts = []
        try:
            parts.append(await g["_contexte"](db, uid))
        except Exception:  # noqa: BLE001
            pass
        f_org = g.get("organisation_de")
        if f_org:
            try:
                o, _ = await f_org(db, uid)
                if o:
                    d = o.details or {}
                    parts.append(f"Entreprise : {o.nom}" + (f" — activité {d.get('naf_libelle')}" if d.get("naf_libelle") else "")
                                 + (f", {d.get('ville')}" if d.get("ville") else ""))
            except Exception:  # noqa: BLE001
                pass
        return "\n".join(p for p in parts if p)

    # ───────────── routes « Mes agents » ─────────────
    @api.get("/agents-perso/modeles")
    async def modeles(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        nb = (await db.execute(select(func.count()).select_from(AgentPerso).where(AgentPerso.user_id == uid))).scalar_one()
        return {"modeles": MODELES, "competences": [{"id": k, "nom": v[0]} for k, v in COMPETENCES.items()],
                "quota": await _quota(db, uid), "nb": nb}

    @api.get("/agents-perso")
    async def lister(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        rows = (await db.execute(select(AgentPerso).where(AgentPerso.user_id == uid).order_by(AgentPerso.created_at))).scalars().all()
        return {"agents": [_json(a) for a in rows], "quota": await _quota(db, uid)}

    class AgentIn(BaseModel):
        nom: Optional[str] = Field(default=None, max_length=80)
        description: Optional[str] = Field(default=None, max_length=200)
        icone: Optional[str] = None
        modele: Optional[str] = None
        instructions: Optional[str] = Field(default=None, max_length=8000)
        competences: Optional[list[str]] = None
        connaissances: Optional[str] = Field(default=None, max_length=30000)
        ton: Optional[str] = None
        contexte: Optional[bool] = None
        mission: Optional[str] = Field(default=None, max_length=2000)
        frequence: Optional[str] = None
        heure: Optional[str] = None

    def _appliquer(a: AgentPerso, b: AgentIn):
        if b.nom is not None and b.nom.strip():
            a.nom = b.nom.strip()[:80]
        if b.description is not None:
            a.description = b.description.strip()[:200]
        if b.icone in ICONES:
            a.icone = b.icone
        if b.instructions is not None:
            a.instructions = b.instructions.strip()
        if b.competences is not None:
            a.competences = [c for c in b.competences if c in COMPETENCES][:9]
        if b.connaissances is not None:
            a.connaissances = b.connaissances
        if b.ton in _TONS:
            a.ton = b.ton
        if b.contexte is not None:
            a.contexte = b.contexte
        if b.mission is not None:
            a.mission = b.mission.strip()
        if b.frequence in ("aucune", "quotidien", "hebdo"):
            a.frequence = b.frequence
        if b.heure and re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", b.heure):
            a.heure = b.heure
        a.updated_at = datetime.now(timezone.utc)

    @api.post("/agents-perso")
    async def creer(body: AgentIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi d'abord.")
        quota = await _quota(db, uid)
        nb = (await db.execute(select(func.count()).select_from(AgentPerso).where(AgentPerso.user_id == uid))).scalar_one()
        if quota == 0:
            raise HTTPException(403, "Les agents personnalisés sont inclus dès l'offre Solo.")
        if quota != -1 and nb >= quota:
            raise HTTPException(403, f"Ton offre permet {quota} agent{'s' if quota > 1 else ''}. Passe à l'offre supérieure pour en créer d'autres.")
        m = next((x for x in MODELES if x["id"] == body.modele), None)
        a = AgentPerso(user_id=uid, nom=(m or {}).get("nom", "Mon agent"), description=(m or {}).get("description", ""),
                       icone=(m or {}).get("icone", "Bot"), modele=m["id"] if m else None,
                       instructions=(m or {}).get("instructions", ""), competences=list((m or {}).get("competences", [])),
                       mission=(m or {}).get("mission", ""), connaissances="", ton="chaleureux", contexte=True)
        _appliquer(a, body)
        db.add(a)
        await db.commit()
        await db.refresh(a)
        return _json(a)

    @api.put("/agents-perso/{agent_id}")
    async def modifier(agent_id: str, body: AgentIn, db: AsyncSession = Depends(get_db)):
        a = await _mien(db, agent_id)
        _appliquer(a, body)
        await db.commit()
        return _json(a)

    @api.delete("/agents-perso/{agent_id}")
    async def supprimer(agent_id: str, db: AsyncSession = Depends(get_db)):
        a = await _mien(db, agent_id)
        await db.execute(delete(AgentPersoMessage).where(AgentPersoMessage.agent_id == a.id))
        await db.delete(a)
        await db.commit()
        return {"ok": True}

    @api.get("/agents-perso/{agent_id}/historique")
    async def historique(agent_id: str, db: AsyncSession = Depends(get_db)):
        a = await _mien(db, agent_id)
        rows = list((await db.execute(select(AgentPersoMessage).where(AgentPersoMessage.agent_id == a.id)
                                      .order_by(AgentPersoMessage.cree_le.desc()).limit(60))).scalars())
        return {"messages": [{"id": m.id, "role": m.role, "texte": m.texte, "le": m.cree_le.isoformat() if m.cree_le else None}
                             for m in reversed(rows)]}

    @api.delete("/agents-perso/{agent_id}/historique")
    async def effacer_historique(agent_id: str, db: AsyncSession = Depends(get_db)):
        a = await _mien(db, agent_id)
        await db.execute(delete(AgentPersoMessage).where(AgentPersoMessage.agent_id == a.id))
        await db.commit()
        return {"ok": True}

    class ChatIn(BaseModel):
        message: str = Field(min_length=1, max_length=4000)

    @api.post("/agents-perso/{agent_id}/chat")
    async def discuter(agent_id: str, body: ChatIn, db: AsyncSession = Depends(get_db)):
        a = await _mien(db, agent_id)
        uid = _uid()
        precedents = list((await db.execute(select(AgentPersoMessage).where(AgentPersoMessage.agent_id == a.id)
                                            .order_by(AgentPersoMessage.cree_le.desc()).limit(12))).scalars())
        fil = "\n".join(f"{'Moi' if m.role == 'moi' else 'Toi'} : {m.texte[:1500]}" for m in reversed(precedents))
        contexte = await _contexte_complet(db, uid) if a.contexte else ""
        demande = (f"Conversation jusqu'ici :\n{fil}\n\n" if fil else "") + f"Nouveau message : {body.message.strip()}"
        try:
            reponse = await _appel_ia(f"perso-{a.id}", _systeme(a, contexte), demande)
        except Exception:  # noqa: BLE001
            log.exception("Agent perso : échec IA")
            raise HTTPException(502, "L'IA n'a pas répondu, réessaie dans un instant.")
        ia = reponse is not None
        if not ia:
            reponse = "Je suis momentanément en mode limité : je ne peux pas te répondre en détail pour l'instant. Réessaie dans quelques minutes."
        db.add(AgentPersoMessage(agent_id=a.id, user_id=uid, role="moi", texte=body.message.strip()))
        db.add(AgentPersoMessage(agent_id=a.id, user_id=uid, role="agent", texte=reponse))
        await db.commit()
        return {"reponse": reponse, "ia": ia}

    # ───────────── branchement sur l'Agent Business ─────────────
    class BrancherIn(BaseModel):
        chatbot_id: Optional[str] = None

    @api.post("/agents-perso/{agent_id}/brancher")
    async def brancher(agent_id: str, body: BrancherIn, db: AsyncSession = Depends(get_db)):
        a = await _mien(db, agent_id)
        if body.chatbot_id:
            AB = g["AgentBusiness"]
            ab = await db.get(AB, body.chatbot_id)
            if not ab or ab.user_id != _uid():
                raise HTTPException(404, "Agent Business introuvable.")
            # Un seul agent « cerveau » par chatbot.
            for autre in (await db.execute(select(AgentPerso).where(AgentPerso.chatbot_id == ab.id, AgentPerso.id != a.id))).scalars():
                autre.chatbot_id = None
        a.chatbot_id = body.chatbot_id or None
        await db.commit()
        return _json(a)

    async def renfort_agent_business(db, ab) -> str:
        """Texte ajouté à la consigne du chatbot quand un agent perso y est branché."""
        a = (await db.execute(select(AgentPerso).where(AgentPerso.chatbot_id == ab.id))).scalars().first()
        if not a:
            return ""
        comp = [COMPETENCES[c][1] for c in (a.competences or []) if c in COMPETENCES and c not in ("finances", "planification")]
        bloc = [f"\n\nCOMPORTEMENT DEMANDÉ PAR L'ENTREPRISE (agent « {a.nom} ») :", a.instructions.strip()[:4000]]
        if comp:
            bloc.append("Savoir-faire : " + " ".join(comp))
        if a.connaissances.strip():
            bloc.append("Informations complémentaires :\n" + a.connaissances.strip()[:15000])
        bloc.append("Les règles impératives ci-dessus (ne rien inventer, relais humain) restent prioritaires.")
        return "\n".join(x for x in bloc if x)

    g["_renfort_agent_business"] = renfort_agent_business

    # ───────────── publication publique de l'Agent Business ─────────────
    def _url_backend(request: Request) -> str:
        return (os.environ.get("BACKEND_PUBLIC_URL") or str(request.base_url)).rstrip("/")

    @api.get("/agent-business/{agent_id}/publication")
    async def etat_publication(agent_id: str, request: Request, db: AsyncSession = Depends(get_db)):
        ab = await g["_agent_du_proprietaire"](db, agent_id)
        p = await db.get(ChatbotPublication, ab.id)
        if not p or not p.actif:
            return {"publie": False}
        url = f"{_url_backend(request)}/api/public/chatbot/{p.jeton}"
        return {"publie": True, "url": url,
                "iframe": f'<iframe src="{url}" title="{html.escape(ab.nom_marque or "Assistant")}" style="width:100%;max-width:420px;height:620px;border:0;border-radius:16px"></iframe>'}

    class PublierIn(BaseModel):
        publier: bool = True

    @api.post("/agent-business/{agent_id}/publication")
    async def publier(agent_id: str, body: PublierIn, request: Request, db: AsyncSession = Depends(get_db)):
        ab = await g["_agent_du_proprietaire"](db, agent_id)
        p = await db.get(ChatbotPublication, ab.id)
        if body.publier:
            if not p:
                p = ChatbotPublication(agent_business_id=ab.id, user_id=ab.user_id, jeton=secrets.token_urlsafe(24))
                db.add(p)
            p.actif = True
        elif p:
            p.actif = False
        await db.commit()
        return await etat_publication(agent_id, request, db)

    async def _chatbot_public(db, jeton: str):
        p = (await db.execute(select(ChatbotPublication).where(ChatbotPublication.jeton == jeton))).scalar_one_or_none()
        if not p or not p.actif:
            raise HTTPException(404, "Ce chatbot n'est pas disponible.")
        ab = await db.get(g["AgentBusiness"], p.agent_business_id)
        if not ab:
            raise HTTPException(404, "Ce chatbot n'est pas disponible.")
        f_acces = g.get("_acces_actif")
        if f_acces and not await f_acces(db, ab.user_id):
            raise HTTPException(404, "Ce chatbot n'est pas disponible.")
        return ab

    @api.get("/public/chatbot/{jeton}", response_class=HTMLResponse)
    async def page_chatbot(jeton: str, db: AsyncSession = Depends(get_db)):
        ab = await _chatbot_public(db, jeton)
        nom = html.escape(ab.nom_marque or "Assistant")
        couleur = ab.couleur if re.fullmatch(r"#[0-9A-Fa-f]{6}", ab.couleur or "") else "#1D3A70"
        accueil = json.dumps(ab.message_accueil or "Bonjour ! Comment puis-je vous aider ?")
        url_msg = json.dumps(f"/api/public/chatbot/{jeton}/message")
        return HTMLResponse(f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{nom}</title><meta name="robots" content="noindex">
<style>*{{box-sizing:border-box;margin:0}}body{{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#F6F1E9;height:100dvh;display:flex;flex-direction:column;color:#1F2A44}}
header{{background:{couleur};color:#fff;padding:14px 18px;font-weight:700}}#m{{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}}
.b{{max-width:82%;padding:10px 14px;border-radius:16px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}}
.a{{background:#fff;border:1px solid #E5DACA;align-self:flex-start;border-bottom-left-radius:4px}}.u{{background:{couleur};color:#fff;align-self:flex-end;border-bottom-right-radius:4px}}
form{{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #E5DACA}}input{{flex:1;border:1.5px solid #E5DACA;border-radius:999px;padding:11px 16px;font-size:15px;outline:none}}
button{{border:0;border-radius:999px;background:{couleur};color:#fff;padding:0 18px;font-weight:600}}button:disabled{{opacity:.5}}small{{text-align:center;font-size:11px;color:#8a8070;padding:6px}}</style></head>
<body><header>{nom}</header><div id="m"></div><form id="f"><input id="i" maxlength="1500" placeholder="Votre message…" autocomplete="off"><button id="s">Envoyer</button></form>
<small>Assistant propulsé par Zayado · ne partagez pas de données sensibles</small>
<script>
const m=document.getElementById('m'),f=document.getElementById('f'),i=document.getElementById('i'),s=document.getElementById('s');const h=[];
function add(t,c){{const d=document.createElement('div');d.className='b '+c;d.textContent=t;m.appendChild(d);m.scrollTop=m.scrollHeight;return d;}}
add({accueil},'a');
f.onsubmit=async e=>{{e.preventDefault();const t=i.value.trim();if(!t)return;i.value='';add(t,'u');s.disabled=true;const w=add('…','a');
try{{const r=await fetch({url_msg},{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{message:t,historique:h.slice(-10)}})}});
const j=await r.json();w.textContent=r.ok?j.reponse:(j.detail||'Service momentanément indisponible.');if(r.ok){{h.push({{role:'client',texte:t}});h.push({{role:'agent',texte:j.reponse}});}}}}
catch(_){{w.textContent='Connexion impossible, réessayez.';}}s.disabled=false;i.focus();}};
</script></body></html>""", headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors *"})

    class MessagePublicIn(BaseModel):
        message: str = Field(min_length=1, max_length=1500)
        historique: list[dict] = Field(default_factory=list)

    @api.post("/public/chatbot/{jeton}/message")
    async def message_public(jeton: str, body: MessagePublicIn, request: Request, db: AsyncSession = Depends(get_db)):
        ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?"))
        if not _limite(_PUB_IP[(jeton, ip)], 15, 600) or not _limite(_PUB_BOT[jeton], 400, 86400):
            raise HTTPException(429, "Trop de messages pour le moment, réessayez un peu plus tard.")
        ab = await _chatbot_public(db, jeton)
        historique = []
        for h in (body.historique or [])[-10:]:
            if isinstance(h, dict):
                historique.append(f"{'Client' if h.get('role') == 'client' else 'Assistant'} : {str(h.get('texte', ''))[:1000]}")
        systeme = g["_consigne_agent"](ab) + await renfort_agent_business(db, ab)
        demande = (("Conversation jusqu'ici :\n" + "\n".join(historique) + "\n\n") if historique else "") + f"Nouveau message du client : {body.message.strip()}"
        try:
            rep = await _appel_ia(f"pub-{ab.id}", systeme, demande)
        except Exception:  # noqa: BLE001
            log.exception("Chatbot public : échec IA")
            rep = None
        return {"reponse": rep or "Merci pour votre message ! Je le transmets à l'équipe, qui vous répondra rapidement."}

    # ───────────── missions récurrentes ─────────────
    async def executer_missions_dues() -> int:
        n = 0
        maintenant = datetime.now(timezone.utc)
        async with async_session() as db:
            agents = list((await db.execute(select(AgentPerso).where(AgentPerso.frequence != "aucune", AgentPerso.mission != ""))).scalars())
            for a in agents:
                try:
                    p = await g["_profil"](db, a.user_id)
                    tz = ZoneInfo(p.fuseau or "Europe/Paris")
                except Exception:  # noqa: BLE001
                    tz, p = ZoneInfo("Europe/Paris"), None
                local = maintenant.astimezone(tz)
                h, mn = (int(x) for x in (a.heure or "08:00").split(":"))
                prevu = local.replace(hour=h, minute=mn, second=0, microsecond=0)
                if local < prevu or (a.frequence == "hebdo" and local.weekday() != 0):
                    continue
                der = a.derniere_mission.astimezone(tz) if a.derniere_mission and a.derniere_mission.tzinfo else (
                    a.derniere_mission.replace(tzinfo=timezone.utc).astimezone(tz) if a.derniere_mission else None)
                if der and der.date() == local.date():
                    continue
                f_acces = g.get("_acces_actif")
                if f_acces and not await f_acces(db, a.user_id):
                    continue
                a.derniere_mission = maintenant
                await db.commit()
                try:
                    contexte = await _contexte_complet(db, a.user_id) if a.contexte else ""
                    rep = await _appel_ia(f"mission-{a.id}", _systeme(a, contexte), f"Mission récurrente : {a.mission}")
                except Exception as e:  # noqa: BLE001
                    log.warning("Mission %s : %s", a.id, e)
                    rep = None
                if not rep:
                    continue
                db.add(AgentPersoMessage(agent_id=a.id, user_id=a.user_id, role="mission", texte=rep))
                await db.commit()
                n += 1
                try:
                    UC = g["UserConnection"]
                    c = (await db.execute(select(UC).where(UC.user_id == a.user_id, UC.provider == "telegram_zayado", UC.status == "ready"))).scalars().first()
                    if c and c.phone_number:
                        from canaux_ext import _tg_conf
                        token = _tg_conf()["token"]
                        if token:
                            await g["_tg_send"](token, c.phone_number, f"🤖 {a.nom}\n\n{rep[:3500]}")
                except Exception as e:  # noqa: BLE001
                    log.warning("Mission %s Telegram : %s", a.id, e)
        return n

    g["executer_missions_dues"] = executer_missions_dues

    async def _boucle():
        await asyncio.sleep(60)
        while True:
            try:
                await executer_missions_dues()
            except Exception as e:  # noqa: BLE001
                log.warning("Missions agents : %s", e)
            await asyncio.sleep(300)

    if app is not None:
        @app.on_event("startup")
        async def _demarrer():
            if os.environ.get("RUN_CRONS", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            asyncio.create_task(_boucle())
