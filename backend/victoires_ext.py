"""Victoires — côté serveur.

- GET    /api/victoires/tout          : toutes les victoires (pagination limit/offset)
- POST   /api/victoires               : ajouter une victoire
- DELETE /api/victoires/{id}          : supprimer une victoire
- POST   /api/victoires/ranger        : l'IA range un texte libre en victoires distinctes

La liste courte (12 dernières) reste servie par vision_plus (GET /api/victoires).
`detecter_victoire(message)` repère une victoire annoncée au Copilote
(« j'ai signé mon premier client ») ; le chat l'enregistre automatiquement.
"""
import asyncio
import json
import logging
import re
from datetime import date
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger("kairos.victoires")

_VERBES = (r"sign[ée]|d[ée]croch[ée]|obtenu|vendu|gagn[ée]|r[ée]ussi|lanc[ée]|livr[ée]|termin[ée]|"
           r"boucl[ée]|publi[ée]|encaiss[ée]|recrut[ée]|fini|franchi|atteint|conclu")
_RE_VICTOIRE = re.compile(rf"^\s*(?:ça y est[,! ]+|enfin[,! ]+|youpi[,! ]+|yes[,! ]+)?(?:j['’]ai|on a|nous avons)\s+(?:enfin\s+)?(?:{_VERBES})\b",
                          re.IGNORECASE)


def detecter_victoire(message: str) -> Optional[str]:
    """Texte de la victoire si le message en annonce une (phrase courte, au passé), sinon None."""
    m = (message or "").strip()
    if not m or len(m) > 220 or "?" in m:
        return None
    return re.sub(r"\s+", " ", m).strip(" !.") if _RE_VICTOIRE.match(m) else None


def _decouper_simple(texte: str) -> list[dict]:
    """Repli sans IA : une victoire par ligne / puce / phrase."""
    morceaux = re.split(r"[\n;•]+|(?<=[.!])\s+", texte)
    out = []
    for p in morceaux:
        p = re.sub(r"^[\s\-–*\d.)]+", "", p).strip(" .!")
        if len(p) >= 4:
            out.append({"texte": p[:500], "detail": ""})
    return out[:15]


def install_victoires(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    _uid, DEMO_USER_ID = g["_uid"], g["DEMO_USER_ID"]
    VisionVictoire = g["VisionVictoire"]

    def _connecte() -> str:
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour enregistrer tes victoires.")
        return uid

    def _json(v) -> dict:
        return {"id": v.id, "texte": v.texte, "detail": v.detail or "", "date": v.date}

    async def ajouter_victoire(db: AsyncSession, uid: str, texte: str, detail: str = "", jour: Optional[str] = None,
                               eviter_doublon: bool = True):
        texte = (texte or "").strip()[:500]
        if not texte:
            return None
        jour = jour or date.today().isoformat()
        if eviter_doublon:
            deja = (await db.execute(select(VisionVictoire).where(
                VisionVictoire.user_id == uid, VisionVictoire.date == jour,
                func.lower(VisionVictoire.texte) == texte.lower()))).scalars().first()
            if deja:
                return deja
        v = VisionVictoire(user_id=uid, texte=texte, detail=(detail or "").strip()[:2000] or None, date=jour)
        db.add(v)
        await db.commit()
        await db.refresh(v)
        return v

    g["ajouter_victoire"] = ajouter_victoire
    g["detecter_victoire"] = detecter_victoire

    class VictoireIn(BaseModel):
        texte: str = Field(min_length=2, max_length=500)
        detail: Optional[str] = Field(default=None, max_length=2000)
        date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")

    @api.get("/victoires/tout")
    async def toutes_les_victoires(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        limit = max(1, min(limit, 200))
        total = (await db.execute(select(func.count()).select_from(VisionVictoire).where(VisionVictoire.user_id == uid))).scalar_one()
        rows = (await db.execute(select(VisionVictoire).where(VisionVictoire.user_id == uid)
                                 .order_by(VisionVictoire.date.desc(), VisionVictoire.created_at.desc())
                                 .limit(limit).offset(max(0, offset)))).scalars()
        return {"total": total, "items": [_json(v) for v in rows]}

    @api.post("/victoires")
    async def creer_victoire(body: VictoireIn, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        v = await ajouter_victoire(db, uid, body.texte, body.detail or "", body.date)
        return _json(v)

    @api.delete("/victoires/{victoire_id}")
    async def supprimer_victoire(victoire_id: str, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        v = await db.get(VisionVictoire, victoire_id)
        if not v or v.user_id != uid:
            raise HTTPException(404, "Victoire introuvable.")
        await db.delete(v)
        await db.commit()
        return {"ok": True}

    class RangerIn(BaseModel):
        texte: str = Field(min_length=3, max_length=4000)

    async def _extraire_ia(texte: str, uid: str) -> Optional[list[dict]]:
        client = g["_client_llm"](f"victoires-{uid}", (
            "Tu ranges des réussites professionnelles ou personnelles. À partir du texte, extrais chaque victoire "
            "distincte. Réponds UNIQUEMENT par un tableau JSON, sans markdown : "
            '[{"texte": "phrase courte au passé (max 120 caractères)", "detail": "contexte utile ou vide"}]. '
            "N'invente rien, ne reformule pas en slogan. Tableau vide s'il n'y a aucune victoire."))
        if client is None:
            return None
        from llm_mammouth import UserMessage
        brut = str(await asyncio.wait_for(client.send_message(UserMessage(text=texte)), timeout=30))
        brut = re.sub(r"```(?:json)?", "", brut).strip()
        debut, fin = brut.find("["), brut.rfind("]")
        if debut < 0 or fin < debut:
            return None
        data = json.loads(brut[debut:fin + 1])
        out = []
        for x in data if isinstance(data, list) else []:
            if isinstance(x, dict) and str(x.get("texte") or "").strip():
                out.append({"texte": str(x["texte"]).strip()[:500], "detail": str(x.get("detail") or "").strip()[:2000]})
        return out[:15]

    @api.post("/victoires/ranger")
    async def ranger_victoires(body: RangerIn, db: AsyncSession = Depends(get_db)):
        uid = _connecte()
        try:
            items = await _extraire_ia(body.texte, uid)
            source = "ia"
        except Exception as e:  # noqa: BLE001
            log.warning("Rangement IA des victoires indisponible (%s) — repli simple", e)
            items = None
        if items is None:
            items, source = _decouper_simple(body.texte), "simple"
        crees = []
        for it in items:
            v = await ajouter_victoire(db, uid, it["texte"], it.get("detail", ""))
            if v:
                crees.append(_json(v))
        return {"source": source, "crees": crees}
