"""Diagnostic d'équilibre (vie pro / vie perso / vie spirituelle).

24 questions (8 domaines × 3), + 3 questions « Vie spirituelle » pour qui le souhaite.
Le calcul est fait côté navigateur (la page publique /diagnostic marche SANS compte) ;
à l'inscription ou dans l'app, le résultat est enregistré ici, historisé (pour voir
l'évolution) et recopié dans la roue de l'équilibre (plus de scores par défaut inventés).

Routes : POST /diagnostic · GET /diagnostic (dernier + historique court).
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, Boolean, DateTime, Integer, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

# Domaines reconnus : clé → (libellé de la roue, couleur, côté)
DOMAINES = {
    "business": ("Activité", "#DEC2A3", "pro"),
    "finances": ("Finances", "#C9A66B", "pro"),
    "temps": ("Temps & focus", "#7C93C3", "pro"),
    "energie": ("Santé & énergie", "#2FB89A", "perso"),
    "serenite": ("Sérénité", "#4AC0E0", "perso"),
    "relations": ("Relations", "#E0669A", "perso"),
    "croissance": ("Croissance", "#8b6fbf", "perso"),
    "sens": ("Sens & impact", "#F1E2CC", "perso"),
    "spirituel": ("Vie spirituelle", "#B8A1E3", "spirituel"),
}


def _iso(dt) -> Optional[str]:
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


def install_diagnostic(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, DEMO_USER_ID = g["_uid"], g["new_uuid"], g["utcnow"], g["DEMO_USER_ID"]

    class Diagnostic(Base):
        __tablename__ = "diagnostics"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        scores: Mapped[dict] = mapped_column(JSON, default=dict)        # domaine -> 0..100
        reponses: Mapped[dict] = mapped_column(JSON, default=dict)      # question -> 1..5
        global_score: Mapped[int] = mapped_column(Integer, default=0)
        spirituel: Mapped[bool] = mapped_column(Boolean, default=False)
        source: Mapped[str] = mapped_column(String(20), default="app")  # public | app | onboarding
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["Diagnostic"] = Diagnostic

    class DiagnosticIn(BaseModel):
        scores: Dict[str, int]
        reponses: Dict[str, int] = Field(default_factory=dict)
        source: Optional[str] = Field(default="app", max_length=20)
        fait_le: Optional[str] = Field(default=None, max_length=40)

    def _resume(d: "Diagnostic") -> dict:
        sc = d.scores or {}
        def moy(cote):
            v = [sc[k] for k, (_, _, c) in DOMAINES.items() if c == cote and k in sc]
            return round(sum(v) / len(v)) if v else None
        return {"id": d.id, "scores": sc, "global": d.global_score, "pro": moy("pro"), "perso": moy("perso"),
                "spirituel": sc.get("spirituel"), "cree_le": _iso(d.created_at), "source": d.source}

    @api.post("/diagnostic")
    async def enregistrer(body: DiagnosticIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour enregistrer ton diagnostic.")
        scores = {k: max(0, min(100, int(v))) for k, v in body.scores.items() if k in DOMAINES}
        if len(scores) < 8:
            raise HTTPException(400, "Diagnostic incomplet.")
        reponses = {k[:40]: max(1, min(5, int(v))) for k, v in list(body.reponses.items())[:40]}
        d = Diagnostic(user_id=uid, scores=scores, reponses=reponses,
                       global_score=round(sum(scores.values()) / len(scores)),
                       spirituel="spirituel" in scores, source=(body.source or "app")[:20])
        db.add(d)
        # La roue de l'équilibre reprend les vrais scores (fini les 55/60/45 par défaut).
        Roue = g["BalanceWheelData"]
        piliers = [{"name": DOMAINES[k][0], "score": scores[k], "color": DOMAINES[k][1]} for k in DOMAINES if k in scores]
        row = (await db.execute(select(Roue).where(Roue.user_id == uid))).scalar_one_or_none()
        if row is None:
            db.add(Roue(user_id=uid, pillars=piliers))
        else:
            row.pillars = piliers
        await db.commit()
        await db.refresh(d)
        return _resume(d)

    @api.get("/diagnostic")
    async def dernier(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        rows: List[Diagnostic] = list((await db.execute(select(Diagnostic).where(Diagnostic.user_id == uid)
                                                        .order_by(Diagnostic.created_at.desc()).limit(6))).scalars())
        return {"dernier": _resume(rows[0]) if rows else None, "historique": [_resume(r) for r in rows]}

    async def resume_ia(db, uid) -> Optional[str]:
        """Une ligne pour le contexte du Copilote."""
        d = (await db.execute(select(Diagnostic).where(Diagnostic.user_id == uid)
                              .order_by(Diagnostic.created_at.desc()).limit(1))).scalar_one_or_none()
        if not d:
            return None
        tri = sorted((d.scores or {}).items(), key=lambda kv: kv[1])
        noms = lambda lst: ", ".join(f"{DOMAINES[k][0]} {v}/100" for k, v in lst if k in DOMAINES)
        return (f"Diagnostic d'équilibre du {d.created_at:%d/%m/%Y} : score global {d.global_score}/100 ; "
                f"à renforcer : {noms(tri[:2])} ; points forts : {noms(tri[-2:])}.")

    g["_diagnostic_resume_ia"] = resume_ia
