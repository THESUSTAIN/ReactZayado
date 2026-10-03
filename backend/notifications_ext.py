"""Boîte de notifications intégrée à l'app (la cloche) + helper `notifier`.

Avant : la cloche ne comptait que des indicateurs calculés dans le navigateur (actu non lue, check-in…).
Quelqu'un qui revenait après plusieurs jours voyait « 0 notification », et rien de ce que le serveur
avait envoyé (push, relance, réponse de l'IA) n'y apparaissait.

Maintenant, chaque notification envoyée par le serveur est AUSSI rangée ici, même si le push n'a pas pu
partir (aucun appareil abonné, clés VAPID absentes…). La cloche n'est donc jamais vide à tort.

GET  /api/notifications            : les 30 dernières + nombre de non lues
POST /api/notifications/{id}/lu    : marque une notification comme lue
POST /api/notifications/tout-lu    : marque tout comme lu

Helper partagé : g["notifier"](db, uid, kind, titre, corps, url, tag, cle, push)
  - `cle` : clé d'unicité (ex. « actu:2026-10-04 ») pour ne pas créer deux fois la même notification ;
  - `push` : envoie aussi un Web Push (mettre False si le push part déjà par ailleurs).
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends
from sqlalchemy import Boolean, DateTime, String, Text, delete, select, update
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.notifications")

GARDER_JOURS = 30
MAX_PAR_UTILISATEUR = 60


def install_notifications(g: dict) -> None:
    api, get_db, Base = g["api"], g["get_db"], g["Base"]
    _uid, DEMO_USER_ID = g["_uid"], g["DEMO_USER_ID"]
    new_uuid, utcnow = g["new_uuid"], g["utcnow"]

    class NotifInbox(Base):
        __tablename__ = "notifications_inbox"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        kind: Mapped[str] = mapped_column(String(20))          # actu | chat | relance | systeme
        titre: Mapped[str] = mapped_column(String(160))
        corps: Mapped[str] = mapped_column(Text, default="")
        url: Mapped[str] = mapped_column(String(300), default="/app")
        cle: Mapped[Optional[str]] = mapped_column(String(80), index=True, nullable=True)
        lu: Mapped[bool] = mapped_column(Boolean, default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    g["NotifInbox"] = NotifInbox

    async def notifier(db, uid: str, kind: str, titre: str, corps: str = "", url: str = "/app",
                       tag: Optional[str] = None, cle: Optional[str] = None, push: bool = True) -> dict:
        """Range la notification dans la cloche, puis (option) l'envoie en push. Ne lève jamais d'erreur."""
        if not uid or uid == DEMO_USER_ID:
            return {"inbox": False, "push": 0}
        try:
            if cle:
                deja = (await db.execute(select(NotifInbox.id).where(
                    NotifInbox.user_id == uid, NotifInbox.cle == cle).limit(1))).first()
                if deja:
                    return {"inbox": False, "push": 0, "deja": True}
            db.add(NotifInbox(user_id=uid, kind=kind[:20], titre=titre[:160], corps=(corps or "")[:600],
                              url=(url or "/app")[:300], cle=(cle or None)))
            await db.commit()
        except Exception as e:  # noqa: BLE001
            await db.rollback()
            log.warning("Notification non rangée (%s) : %s", kind, e)
            return {"inbox": False, "push": 0}
        envoye = 0
        if push and g.get("envoyer_push"):
            try:
                r = await g["envoyer_push"](db, uid, titre, (corps or "")[:180], url or "/app", tag or kind)
                envoye = int(r.get("envoye") or 0)
            except Exception as e:  # noqa: BLE001
                log.warning("Push de la notification %s échoué : %s", kind, e)
        return {"inbox": True, "push": envoye}

    g["notifier"] = notifier

    def _iso(d: Optional[datetime]) -> Optional[str]:
        if d is None:
            return None
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.isoformat()

    @api.get("/notifications")
    async def lister(db=Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            return {"items": [], "non_lues": 0}
        limite = utcnow() - timedelta(days=GARDER_JOURS)
        try:  # ménage léger : rien de plus vieux que 30 jours
            await db.execute(delete(NotifInbox).where(NotifInbox.user_id == uid, NotifInbox.created_at < limite))
            await db.commit()
        except Exception:  # noqa: BLE001
            await db.rollback()
        rows = list((await db.execute(select(NotifInbox).where(NotifInbox.user_id == uid)
                                      .order_by(NotifInbox.created_at.desc()).limit(30))).scalars())
        return {
            "items": [{"id": r.id, "kind": r.kind, "titre": r.titre, "corps": r.corps, "url": r.url,
                       "lu": bool(r.lu), "le": _iso(r.created_at)} for r in rows],
            "non_lues": sum(1 for r in rows if not r.lu),
        }

    @api.post("/notifications/tout-lu")
    async def tout_lu(db=Depends(get_db)):
        uid = _uid()
        if uid != DEMO_USER_ID:
            await db.execute(update(NotifInbox).where(NotifInbox.user_id == uid, NotifInbox.lu.is_(False)).values(lu=True))
            await db.commit()
        return {"ok": True}

    @api.post("/notifications/{notif_id}/lu")
    async def marquer_lu(notif_id: str, db=Depends(get_db)):
        uid = _uid()
        if uid != DEMO_USER_ID:
            await db.execute(update(NotifInbox).where(NotifInbox.user_id == uid, NotifInbox.id == notif_id).values(lu=True))
            await db.commit()
        return {"ok": True}
