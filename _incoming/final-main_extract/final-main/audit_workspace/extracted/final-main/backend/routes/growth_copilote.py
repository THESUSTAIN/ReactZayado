"""Co-pilote IA du Cockpit — POST /api/growth/copilote

Chat assistant business (Mon Bureau → onglet Co-pilote). Répond à une question
de l'utilisateur en s'appuyant sur son contexte (vision / objectif, tâches
récentes) quand il est disponible.

LLM : Emergent LLM Key via emergentintegrations (Claude), avec repli sur
Mammouth AI si MAMMOUTH_API_KEY est configuré.
"""
import os
import uuid
import json
import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/growth", tags=["growth-copilote"])

SYSTEM_PROMPT = (
    "Tu es le Co-pilote IA de Zayado, un assistant business francophone pour "
    "entrepreneurs et indépendants. Tu es concret, bienveillant et orienté action. "
    "Tu aides à rédiger, analyser, prioriser et générer du contenu. Réponds en "
    "français, de façon claire et concise (pas de blabla), avec des étapes ou des "
    "listes quand c'est utile."
)


class CopiloteIn(BaseModel):
    message: str


async def _build_context(db: AsyncSession, user_id: str) -> str:
    """Récupère un contexte léger (objectif + tâches récentes) pour ancrer la réponse."""
    parts = []
    try:
        row = (await db.execute(
            text("SELECT settings FROM users WHERE id = :uid LIMIT 1"),
            {"uid": user_id},
        )).fetchone()
        if row and row[0]:
            raw = row[0]
            settings = json.loads(raw) if isinstance(raw, str) else (raw or {})
            why = settings.get("why") or settings.get("objective")
            if why:
                parts.append(f"Objectif / vision de l'utilisateur : « {why} ».")
            sector = settings.get("sector")
            if sector:
                parts.append(f"Secteur : {sector}.")
    except Exception:
        pass
    try:
        rows = (await db.execute(
            text("SELECT data FROM user_tasks WHERE user_id = :uid ORDER BY created_at DESC LIMIT 5"),
            {"uid": user_id},
        )).fetchall()
        labels = []
        for r in rows:
            d = r[0]
            if isinstance(d, str):
                try:
                    d = json.loads(d)
                except Exception:
                    continue
            if isinstance(d, dict) and d.get("label"):
                labels.append(d["label"])
        if labels:
            parts.append("Tâches récentes : " + "; ".join(labels) + ".")
    except Exception:
        pass
    return "\n".join(parts)


async def _llm_reply(system: str, user_prompt: str) -> str:
    """Appelle le LLM. Emergent LLM Key (Claude) en priorité, repli Mammouth."""
    key = os.environ.get("EMERGENT_LLM_KEY")
    if key:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=key,
                session_id=f"copilote-{uuid.uuid4().hex[:8]}",
                system_message=system,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            reply = await chat.send_message(UserMessage(text=user_prompt))
            if isinstance(reply, str) and reply.strip():
                return reply.strip()
        except Exception as e:
            logger.warning("Copilote via Emergent LLM échoué, repli Mammouth: %s", e)

    if os.environ.get("MAMMOUTH_API_KEY"):
        try:
            from mammouth_client import chat as mammouth_chat
            return await mammouth_chat(
                [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1024,
            )
        except Exception as e:
            logger.warning("Copilote via Mammouth échoué: %s", e)

    return ""


@router.post("/copilote")
async def copilote(
    body: CopiloteIn,
    user_id: str = Query("default"),
    db: AsyncSession = Depends(get_db),
):
    message = (body.message or "").strip()
    if not message:
        return {"reply": "Posez-moi une question et je vous aide tout de suite 🙂"}

    context = await _build_context(db, user_id)
    user_prompt = message if not context else f"[Contexte]\n{context}\n\n[Question]\n{message}"

    reply = await _llm_reply(SYSTEM_PROMPT, user_prompt)
    if not reply:
        reply = (
            "Je n'ai pas pu contacter mon moteur d'IA à l'instant. Réessayez dans "
            "quelques secondes — en attendant, précisez votre objectif pour que je "
            "vous propose un plan d'action concret."
        )
    return {"reply": reply}
