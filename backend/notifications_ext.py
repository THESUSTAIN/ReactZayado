"""Boîte de notifications intégrée à l'app (la cloche) + helper `notifier`.

Avant : la cloche ne comptait que des indicateurs calculés dans le navigateur (actu non lue, check-in…).
Quelqu'un qui revenait après plusieurs jours voyait « 0 notification », et rien de ce que le serveur
avait envoyé (push, relance, réponse de l'IA) n'y apparaissait.

Maintenant, chaque notification envoyée par le serveur est AUSSI rangée ici, même si le push n'a pas pu
partir (aucun appareil abonné, clés VAPID absentes…). La cloche n'est donc jamais vide à tort.

GET  /api/notifications            : les 30 dernières + nombre de non lues
POST /api/notifications/{id}/lu    : marque une notification comme lue
POST /api/notifications/tout-lu    : marque tout comme lu
POST /api/admin/notifications/test : (admin) vérification de bout en bout pour un compte (e-mail saisi) :
                                     cloche + push sur chaque appareil abonné (mobile / PWA) + e-mail de test,
                                     avec le résultat canal par canal

Helper partagé : g["notifier"](db, uid, kind, titre, corps, url, tag, cle, push)
  - `cle` : clé d'unicité (ex. « actu:2026-10-04 ») pour ne pas créer deux fois la même notification ;
  - `push` : envoie aussi un Web Push (mettre False si le push part déjà par ailleurs).
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
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

    # ── Vérification admin : « est-ce que l'utilisateur reçoit bien ses notifications ? » ──
    class TestIn(BaseModel):
        email: str = Field(min_length=3, max_length=200)
        canaux: list = Field(default_factory=lambda: ["cloche", "push", "email"])

    @api.post("/admin/notifications/test")
    async def tester_notifications(body: TestIn, db=Depends(get_db), _r=Depends(g["exiger_role"]("admin"))):
        email = body.email.strip().lower()
        User = g["User"]
        u = (await db.execute(select(User).where(User.email == email))).scalars().first()
        if not u:
            raise HTTPException(404, f"Aucun compte avec l'adresse {email}.")
        canaux = [c for c in body.canaux if c in ("cloche", "push", "email")] or ["cloche", "push", "email"]
        titre, corps = "Test Zayado ✅", "Si tu lis ceci sur ton téléphone ou ta PWA, les notifications fonctionnent."
        res: dict = {"compte": email, "canaux": {}}
        if "cloche" in canaux:
            r = await notifier(db, u.id, "systeme", titre, corps, "/app", tag="test", push=False)
            res["canaux"]["cloche"] = {"ok": bool(r.get("inbox")), "detail": "rangée dans la cloche de l'appli" if r.get("inbox") else "non rangée (compte démo ou erreur)"}
        if "push" in canaux:
            diag = g["push_diagnostic"]() if g.get("push_diagnostic") else {"probleme": None}
            if diag.get("probleme"):
                res["canaux"]["push"] = {"ok": False, "detail": diag.get("detail") or diag["probleme"], "appareils": []}
            else:
                appareils = await g["envoyer_push_detail"](db, u.id, titre, corps, "/app", "test")
                ok = [a for a in appareils if a["etat"] == "ok"]
                if not appareils:
                    detail = "aucun appareil abonné : l'utilisateur doit ouvrir l'appli sur son téléphone (ou la PWA) et accepter les notifications"
                elif ok:
                    detail = f"acceptée par {len(ok)} appareil(s) sur {len(appareils)} — à confirmer en regardant l'écran du téléphone"
                else:
                    detail = "refusée par le service de notification (abonnement expiré ou clés VAPID différentes)"
                res["canaux"]["push"] = {"ok": bool(ok), "detail": detail, "appareils": appareils}
        if "email" in canaux:
            try:
                await g["send_email"](to=email, subject="Test de notification Zayado",
                                      html=g["_email_wrap"]("<p>Si tu lis ceci, les e-mails de Zayado arrivent bien dans ta boîte.</p>"))
                res["canaux"]["email"] = {"ok": True, "detail": f"envoyé à {email}"}
            except HTTPException as e:
                res["canaux"]["email"] = {"ok": False, "detail": str(e.detail)}
            except Exception as e:  # noqa: BLE001
                res["canaux"]["email"] = {"ok": False, "detail": f"erreur d'envoi : {e}"}
        res["ok"] = all(c["ok"] for c in res["canaux"].values()) if res["canaux"] else False
        return res

    # ── Santé du système de notification (admin) : « pourquoi rien ne part ? » d'un coup d'œil ──
    @api.get("/admin/notifications/sante")
    async def sante_notifications(db=Depends(get_db), _r=Depends(g["exiger_role"]("admin"))):
        d = g["push_diagnostic"]() if g.get("push_diagnostic") else {"probleme": None, "detail": ""}
        crons_actifs = os.environ.get("RUN_CRONS", "1").strip().lower() not in ("0", "false", "non", "off")
        users = {u.id: u.email for u in (await db.execute(select(g["User"]))).scalars()}
        PS, R, VP = g.get("PushSubscription"), g.get("Relance"), g.get("VisionProfile")
        appareils, par_compte = 0, []
        if PS is not None:
            subs = list((await db.execute(select(PS))).scalars())
            appareils = len(subs)
            cnt: dict = {}
            for s_ in subs:
                cnt[s_.user_id] = cnt.get(s_.user_id, 0) + 1
            par_compte = [{"email": users.get(uid, uid), "appareils": n} for uid, n in cnt.items()]
            par_compte.sort(key=lambda x: -x["appareils"])
        eligibles = 0
        if VP is not None:
            try:
                eligibles = len(list((await db.execute(select(VP.id).where(
                    VP.notifications.is_(True), VP.onboarded.is_(True)))).scalars()))
            except Exception:  # noqa: BLE001
                await db.rollback()
        rel = {"push": 0, "telegram": 0, "cloche": 0}
        dernieres = []
        if R is not None:
            depuis = datetime.now(timezone.utc) - timedelta(days=7)
            rows = list((await db.execute(select(R).where(R.created_at >= depuis)
                                          .order_by(R.created_at.desc()).limit(200))).scalars())
            for r in rows:
                rel[r.canal] = rel.get(r.canal, 0) + 1
            dernieres = [{"type": r.type, "canal": r.canal, "jour": r.jour, "email": users.get(r.user_id, r.user_id)}
                         for r in rows[:10]]
        return {
            "push": {"ok": d.get("probleme") is None, "probleme": d.get("probleme"), "detail": d.get("detail")},
            "crons_actifs": crons_actifs,
            "comptes": {"eligibles": eligibles, "appareils": appareils, "par_compte": par_compte[:8]},
            "relances_7j": rel,
            "dernieres": dernieres,
            "regles": [
                "Au plus UNE relance par compte et par jour, jamais la nuit (8 h – 21 h, heure du compte).",
                "Au plus 3 relances qui font vibrer le téléphone par semaine (4 pour la foi et les souvenirs) : le reste arrive uniquement dans la cloche de l'appli.",
                "Si l'actualité du jour a déjà sonné, la relance du jour reste dans la cloche.",
                "Un compte sans appareil abonné (et sans Telegram) ne reçoit rien qui vibre : le message l'attend dans la cloche.",
            ],
        }
