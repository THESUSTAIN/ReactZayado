"""Agent Business : chatbot client à la marque de l'utilisateur (configuration + test réel par l'IA).

Extrait de server.py (audit d'architecture) sans changement de route ni de table.
Publie dans g : AgentBusiness, _agent_du_proprietaire, _consigne_agent (lus par agents_perso_ext
et entreprise_assistant_ext). Les fonctions partagées (_client_llm, _profil…) sont lues dans g
au moment de l'appel pour rester remplaçables (tests, modules installés plus tard).
"""
import asyncio
import re
import uuid
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

AGENTS_PAR_PLAN = {"pro": 1, "business": 3, "entreprise": -1}  # -1 = illimité

_TONS_AGENT = {
    "chaleureux": "chaleureux et bienveillant, en vouvoyant le client",
    "professionnel": "professionnel et précis, en vouvoyant le client",
    "direct": "direct et concis, en vouvoyant le client",
}


class AgentBusinessIn(BaseModel):
    nom_marque: str = ""
    couleur: str = "#DEC2A3"
    message_accueil: str = "Bonjour ! Comment puis-je vous aider ?"
    ton: str = "chaleureux"
    connaissances: str = ""
    contact_humain: str = ""


class AgentTestIn(BaseModel):
    message: str
    historique: list[dict] = Field(default_factory=list)  # [{"role": "client"|"agent", "texte": "..."}]


def _nettoyer_agent(body: AgentBusinessIn) -> dict:
    couleur = body.couleur if re.fullmatch(r"#[0-9A-Fa-f]{6}", body.couleur or "") else "#DEC2A3"
    ton = body.ton if body.ton in ("chaleureux", "professionnel", "direct") else "chaleureux"
    return {"nom_marque": (body.nom_marque or "").strip()[:120], "couleur": couleur,
            "message_accueil": (body.message_accueil or "").strip()[:500] or "Bonjour ! Comment puis-je vous aider ?",
            "ton": ton, "connaissances": (body.connaissances or "")[:30000],
            "contact_humain": (body.contact_humain or "").strip()[:255]}


def _agent_dict(a) -> dict:
    return {"id": a.id, "nom_marque": a.nom_marque, "couleur": a.couleur, "message_accueil": a.message_accueil,
            "ton": a.ton, "connaissances": a.connaissances, "contact_humain": a.contact_humain,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None}


def _consigne_agent(a) -> str:
    marque = a.nom_marque or "l'entreprise"
    contact = a.contact_humain or "l'équipe"
    base = a.connaissances.strip() or "(Aucune information fournie pour l'instant.)"
    return (
        f"Tu es l'assistant virtuel de {marque}. Tu réponds aux clients et prospects sur son site.\n"
        f"Ton : {_TONS_AGENT.get(a.ton, _TONS_AGENT['chaleureux'])}.\n"
        "Règles impératives :\n"
        "1. Réponds UNIQUEMENT à partir des INFORMATIONS DE L'ENTREPRISE ci-dessous.\n"
        "2. Si l'information n'y figure pas, dis-le simplement et propose de transmettre la demande "
        f"à {contact} (demande au client son nom et le meilleur moyen de le recontacter).\n"
        "3. N'invente jamais de prix, de délai, de disponibilité ou de promesse.\n"
        "4. Réponds dans la langue du client, en 2 à 5 phrases, sans jargon.\n"
        "5. Ne dis jamais que tu es Claude ou un autre modèle : tu es l'assistant de "
        f"{marque}.\n\n"
        f"INFORMATIONS DE L'ENTREPRISE :\n{base}"
    )


def install_agent_business(g: dict) -> None:
    api, Base, get_db, logger = g["api"], g["Base"], g["get_db"], g["logger"]

    class AgentBusiness(Base):
        __tablename__ = "agents_business"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=g["new_uuid"])
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        nom_marque: Mapped[str] = mapped_column(String(120), default="")
        couleur: Mapped[str] = mapped_column(String(9), default="#DEC2A3")
        message_accueil: Mapped[str] = mapped_column(String(500), default="Bonjour ! Comment puis-je vous aider ?")
        ton: Mapped[str] = mapped_column(String(30), default="chaleureux")  # chaleureux / professionnel / direct
        connaissances: Mapped[str] = mapped_column(Text, default="")
        contact_humain: Mapped[str] = mapped_column(String(255), default="")
        created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
        updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    async def _quota_agents(db: AsyncSession, uid: str) -> int:
        if g["_role_courant"]() == "admin":
            return -1
        profil = await g["_profil"](db, uid)
        return AGENTS_PAR_PLAN.get((profil.plan or "essentielle"), 0)

    async def _agent_du_proprietaire(db: AsyncSession, agent_id: str):
        a = await db.get(AgentBusiness, agent_id)
        if not a or a.user_id != g["_uid"]():
            raise HTTPException(404, "Agent introuvable.")
        return a

    @api.get("/agent-business")
    async def lister_agents_business(db: AsyncSession = Depends(get_db)):
        uid = g["_uid"]()
        rows = (await db.execute(select(AgentBusiness).where(AgentBusiness.user_id == uid)
                                 .order_by(AgentBusiness.created_at))).scalars().all()
        return {"agents": [_agent_dict(a) for a in rows], "quota": await _quota_agents(db, uid)}

    @api.post("/agent-business")
    async def creer_agent_business(body: AgentBusinessIn, db: AsyncSession = Depends(get_db)):
        uid = g["_uid"]()
        quota = await _quota_agents(db, uid)
        nb = (await db.execute(select(func.count()).select_from(AgentBusiness).where(AgentBusiness.user_id == uid))).scalar_one()
        if quota != -1 and nb >= quota:
            raise HTTPException(403, "Ton offre ne permet pas d'agent supplémentaire. L'Agent Business est inclus dès l'offre Pro.")
        a = AgentBusiness(user_id=uid, **_nettoyer_agent(body))
        db.add(a)
        await db.commit()
        return _agent_dict(a)

    @api.put("/agent-business/{agent_id}")
    async def modifier_agent_business(agent_id: str, body: AgentBusinessIn, db: AsyncSession = Depends(get_db)):
        a = await _agent_du_proprietaire(db, agent_id)
        for k, v in _nettoyer_agent(body).items():
            setattr(a, k, v)
        a.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return _agent_dict(a)

    @api.delete("/agent-business/{agent_id}")
    async def supprimer_agent_business(agent_id: str, db: AsyncSession = Depends(get_db)):
        a = await _agent_du_proprietaire(db, agent_id)
        await db.delete(a)
        await db.commit()
        return {"ok": True}

    @api.post("/agent-business/{agent_id}/tester")
    async def tester_agent_business(agent_id: str, body: AgentTestIn, db: AsyncSession = Depends(get_db)):
        a = await _agent_du_proprietaire(db, agent_id)
        question = (body.message or "").strip()[:2000]
        if not question:
            raise HTTPException(422, "Message vide.")
        historique = []
        for h in (body.historique or [])[-10:]:
            role = "Client" if h.get("role") == "client" else "Assistant"
            historique.append(f"{role} : {str(h.get('texte', ''))[:1500]}")
        consigne = ((("Conversation jusqu'ici :\n" + "\n".join(historique) + "\n\n") if historique else "")
                    + f"Nouveau message du client : {question}")
        systeme = _consigne_agent(a)
        f_renfort = g.get("_renfort_agent_business")  # publié par agents_perso_ext
        if f_renfort:
            try:
                systeme += await f_renfort(db, a)
            except Exception:  # noqa: BLE001
                pass
        client = g["_client_llm"](f"agent-{a.id}-{uuid.uuid4().hex[:8]}", systeme)
        if client is None:
            return {"reponse": "Merci pour votre message ! Je le transmets à l'équipe, qui vous répondra rapidement.",
                    "ia": False}
        try:
            from llm_mammouth import UserMessage
            texte = await asyncio.wait_for(client.send_message(UserMessage(text=consigne)), timeout=45)
            return {"reponse": (texte or "").strip(), "ia": True}
        except Exception:  # noqa: BLE001
            logger.exception("Agent Business : échec de l'appel IA")
            raise HTTPException(502, "L'IA n'a pas répondu, réessaie dans un instant.")

    g["AGENTS_PAR_PLAN"] = AGENTS_PAR_PLAN
    g["AgentBusiness"] = AgentBusiness
    g["_agent_du_proprietaire"] = _agent_du_proprietaire
    g["_consigne_agent"] = _consigne_agent
