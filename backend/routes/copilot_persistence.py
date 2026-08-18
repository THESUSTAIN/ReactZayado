"""Persistance sobre du Copilote : décisions et veille, isolées par utilisateur.

Ces routes complètent les vues Cap Vivant sans simuler d’intégration Drive,
SharePoint ou SSO. Elles ne stockent que les éléments que l’utilisateur choisit
de conserver dans son espace MyExtension.
"""
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import get_current_user, User
from routes.missing_apis import _delete_row, _insert_row, _list_rows

router = APIRouter(prefix="/chat", tags=["copilot-persistence"])


class NewsItemIn(BaseModel):
    session_id: str = "default"
    kind: str = "edition"
    title: str
    url: str = ""
    source: str = "Veille Copilote"
    published_at: Optional[str] = None
    sector: str = ""
    region: str = ""
    digest: str = ""


class NewsEditionIn(BaseModel):
    session_id: str = "default"
    digest: str
    sources: list[dict[str, Any]] = []
    generated_at: Optional[str] = None
    sector: str = ""
    region: str = ""


class DecisionIn(BaseModel):
    session_id: str = "default"
    title: str
    detail: str = ""
    source_key: str = "vision"
    priority: str = "normal"
    why_now: str = ""
    pillar: str = ""
    impact: str = ""
    milestone_id: str = ""
    project_id: str = ""
    task_payload: dict[str, Any] = {}


@router.get("/news-history")
async def news_history(session_id: str = "default", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = [row for row in await _list_rows(db, "user_copilot_news_editions", user.id) if row.get("session_id") == session_id]
    return {"items": items}


@router.post("/news-history")
async def archive_news_edition(body: NewsEditionIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    generated_at = body.generated_at or datetime.now(timezone.utc).isoformat()
    existing = [row for row in await _list_rows(db, "user_copilot_news_editions", user.id) if row.get("session_id") == body.session_id]
    # Ne duplique pas une édition inchangée ; une actualisation distincte reste conservée.
    same = next((row for row in existing if row.get("digest") == body.digest), None)
    if same:
        return {"item": same, "duplicate": True}
    item = await _insert_row(db, "user_copilot_news_editions", user.id, {
        "session_id": body.session_id, "kind": "edition",
        "title": f"Veille sectorielle — {generated_at[:10]}", "digest": body.digest,
        "sources": body.sources, "generated_at": generated_at, "published_at": generated_at,
        "sector": body.sector, "region": body.region,
    })
    return {"item": item, "duplicate": False}


@router.get("/news-saved")
async def saved_news(session_id: str = "default", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = [row for row in await _list_rows(db, "user_copilot_saved_news", user.id) if row.get("session_id") == session_id]
    return {"items": items}


@router.post("/news-saved")
async def save_news(body: NewsItemIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = [row for row in await _list_rows(db, "user_copilot_saved_news", user.id) if row.get("session_id") == body.session_id]
    duplicate = next((row for row in existing if row.get("url") and row.get("url") == body.url), None)
    if duplicate:
        return {"item": duplicate, "duplicate": True}
    item = await _insert_row(db, "user_copilot_saved_news", user.id, {
        **body.model_dump(), "saved_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"item": item, "duplicate": False}


@router.delete("/news-saved/{item_id}")
async def delete_saved_news(item_id: str, session_id: str = "default", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = [row for row in await _list_rows(db, "user_copilot_saved_news", user.id) if row.get("session_id") == session_id]
    if not any(row.get("id") == item_id for row in rows):
        return {"items": rows}
    await _delete_row(db, "user_copilot_saved_news", user.id, item_id)
    remaining = [row for row in await _list_rows(db, "user_copilot_saved_news", user.id) if row.get("session_id") == session_id]
    return {"items": remaining}


@router.get("/decision")
async def get_decisions(session_id: str = "default", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = [row for row in await _list_rows(db, "user_copilot_decisions", user.id) if row.get("session_id") == session_id]
    return {"decisions": items}


@router.post("/decision")
async def create_decision(body: DecisionIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await _insert_row(db, "user_copilot_decisions", user.id, {**body.model_dump(), "status": "pending"})
    return {"decision": item}


@router.post("/decision/{decision_id}")
async def apply_decision(decision_id: str, payload: dict[str, Any], user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    decisions = await _list_rows(db, "user_copilot_decisions", user.id)
    item = next((row for row in decisions if row.get("id") == decision_id), None)
    if not item:
        return {"status": "missing", "message": "Cette décision n’est plus disponible."}
    choice = payload.get("decision")
    if choice == "approve":
        task_data = item.get("task_payload") or {"label": item.get("title") or "Mission Copilote", "priority": "normal"}
        task = await _insert_row(db, "user_tasks", user.id, {
            "label": task_data.get("label") or item.get("title") or "Mission Copilote",
            "priority": task_data.get("priority") or "normal", "notes": task_data.get("notes") or item.get("detail") or "",
            "project_id": task_data.get("project_id") or item.get("project_id") or None,
            "decision_id": decision_id, "vision_pillar_id": task_data.get("vision_pillar_id") or item.get("pillar") or None,
            "strategic_milestone_id": task_data.get("strategic_milestone_id") or item.get("milestone_id") or None,
            "done": False, "in_progress": False, "source": "copilot-decision",
        })
        from routes.missing_apis import _update_row
        await _update_row(db, "user_copilot_decisions", user.id, decision_id, {"status": "approved", "task_id": task.get("id")})
        return {"status": "approved", "message": "Mission créée dans Mon Mouvement."}
    from routes.missing_apis import _update_row
    await _update_row(db, "user_copilot_decisions", user.id, decision_id, {"status": "deferred"})
    return {"status": "deferred", "message": "Décision reportée au prochain point du jour."}
