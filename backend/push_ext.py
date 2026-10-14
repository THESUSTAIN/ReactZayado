"""Notifications Web Push (VAPID) — abonnements par utilisateur + envoi.

- GET  /api/push/public-key        : clé publique VAPID (pour le navigateur)
- POST /api/push/subscribe         : enregistre un PushSubscription
- DELETE /api/push/subscribe       : supprime l'abonnement
- POST /api/push/test              : envoie une notif de test à soi-même
- POST /api/push/rappel-checkin    : envoie le rappel de check-in à soi-même

Fonction partagée `envoyer_push(...)` réutilisée pour les rappels de check-in
et les opportunités du Radar. Les clés VAPID viennent de l'environnement.
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import String, Text, DateTime, select
from sqlalchemy.orm import Mapped, mapped_column
try:
    from pywebpush import webpush, WebPushException
except ImportError:  # dépendance absente : le serveur démarre quand même, seules les notifs push sont coupées
    webpush = None

    class WebPushException(Exception):  # type: ignore[no-redef]
        pass

log = logging.getLogger("kairos.push")


def _uuid() -> str:
    import uuid
    return str(uuid.uuid4())


def install_push(g: dict) -> None:
    api, get_db, Base = g["api"], g["get_db"], g["Base"]
    _uid, DEMO_USER_ID = g["_uid"], g["DEMO_USER_ID"]

    class PushSubscription(Base):
        __tablename__ = "push_subscriptions"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        endpoint: Mapped[str] = mapped_column(Text, unique=True)
        p256dh: Mapped[str] = mapped_column(Text)
        auth: Mapped[str] = mapped_column(Text)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    g["PushSubscription"] = PushSubscription

    def _vapid() -> dict:
        return {
            "public": (os.environ.get("VAPID_PUBLIC_KEY") or "").strip(),
            "private": (os.environ.get("VAPID_PRIVATE_KEY") or "").strip(),
            "subject": (os.environ.get("VAPID_SUBJECT") or "mailto:contact@zayado.net").strip(),
        }

    def _diagnostic() -> dict:
        """Pourquoi les notifications ne partiraient pas, en un mot : None (tout est prêt), « lib » (pywebpush absent),
        « cles_absentes » ou « cles_incoherentes » (la clé privée ne correspond pas à la clé publique : tous les envois
        sont refusés par Chrome/Firefox/Apple sans que rien ne s'affiche)."""
        v = _vapid()
        if webpush is None:
            return {"probleme": "lib", "detail": "pywebpush n'est pas installé (pip install -r requirements.txt)."}
        if not (v["public"] and v["private"]):
            return {"probleme": "cles_absentes", "detail": "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absentes (python generer_cles_vapid.py)."}
        try:
            import base64
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.asymmetric import ec
            if "BEGIN" in v["private"]:
                cle = serialization.load_pem_private_key(v["private"].encode(), password=None)
            else:
                brut = base64.urlsafe_b64decode(v["private"] + "=" * (-len(v["private"]) % 4))
                cle = ec.derive_private_key(int.from_bytes(brut, "big"), ec.SECP256R1())
            pub = cle.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
            attendue = base64.urlsafe_b64encode(pub).rstrip(b"=").decode()
            if attendue != v["public"].rstrip("="):
                return {"probleme": "cles_incoherentes",
                        "detail": "VAPID_PRIVATE_KEY ne correspond pas à VAPID_PUBLIC_KEY : régénère UNE paire et copie les deux."}
        except Exception as exc:  # noqa: BLE001
            return {"probleme": "cles_incoherentes", "detail": f"Clé VAPID privée illisible ({type(exc).__name__})."}
        if not v["subject"].startswith(("mailto:", "https://")):
            return {"probleme": "sujet_invalide", "detail": "VAPID_SUBJECT doit commencer par mailto: ou https:// (Apple refuse sinon)."}
        return {"probleme": None, "detail": ""}

    _d0 = _diagnostic()
    if _d0["probleme"]:
        log.error("NOTIFICATIONS PUSH INACTIVES — %s", _d0["detail"])
    g["push_diagnostic"] = _diagnostic

    def _connecte() -> str:
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour activer les notifications.")
        return uid

    def _envoyer_un(sub: "PushSubscription", payload: str) -> str:
        """Envoi bloquant d'une notif. Retourne "ok" (acceptée par le service push), "mort" (abonnement
        expiré, 404/410 : à supprimer) ou "echec" (autre erreur : abonnement gardé, mais PAS compté comme envoyé).
        Avant, un échec était compté comme un envoi réussi : le bouton « test » annonçait « envoyée » sans rien
        recevoir, et les relances ne basculaient jamais sur Telegram."""
        v = _vapid()
        if webpush is None:
            log.warning("pywebpush non installé : notification ignorée.")
            return "echec"
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload,
                vapid_private_key=v["private"],
                vapid_claims={"sub": v["subject"]},
                ttl=3600,
                timeout=10,
            )
            return "ok"
        except WebPushException as exc:
            resp = getattr(exc, "response", None)
            if resp is not None and resp.status_code in (404, 410):
                return "mort"
            if resp is not None and resp.status_code in (401, 403):
                # Abonnement créé avec une AUTRE clé VAPID (clés régénérées) : il ne marchera plus jamais. On le retire,
                # l'appareil se réabonnera tout seul à sa prochaine ouverture de l'app.
                log.warning("Abonnement push refusé (%s) : retiré, il sera recréé à la prochaine ouverture.", resp.status_code)
                return "mort"
            log.warning("Echec push (abonnement conservé) : %s", exc)
            return "echec"
        except Exception as exc:  # noqa: BLE001  (clé privée invalide, réseau coupé…)
            log.warning("Echec push (%s) : %s", type(exc).__name__, exc)
            return "echec"

    async def envoyer_push(db, user_id: str, titre: str, corps: str, url: str = "/app", tag: str = "zayado") -> dict:
        """Envoie une notif à tous les appareils d'un utilisateur. Nettoie les morts."""
        if _diagnostic()["probleme"] is not None:
            return {"envoye": 0, "raison": "vapid_absent"}
        subs = list((await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))).scalars())
        payload = json.dumps({"title": titre, "body": corps, "url": url, "tag": tag})
        envoye = supprime = echec = 0
        for s in subs:
            etat = await asyncio.to_thread(_envoyer_un, s, payload)
            if etat == "ok":
                envoye += 1
            elif etat == "mort":
                await db.delete(s)
                supprime += 1
            else:
                echec += 1
        if supprime:
            await db.commit()
        return {"envoye": envoye, "supprime": supprime, "echec": echec}

    g["envoyer_push"] = envoyer_push

    def _libelle_appareil(endpoint: str) -> str:
        """Le service push dit sur quel écosystème est l'appareil (il ne distingue pas PWA installée / navigateur)."""
        h = (endpoint or "").lower()
        if "web.push.apple.com" in h:
            return "iPhone / iPad / Mac (Apple)"
        if "fcm.googleapis.com" in h or "android.googleapis.com" in h:
            return "Android ou Chrome (Google)"
        if "mozilla" in h:
            return "Firefox"
        if "notify.windows.com" in h:
            return "Windows / Edge"
        return "Autre navigateur"

    async def envoyer_push_detail(db, user_id: str, titre: str, corps: str, url: str = "/app", tag: str = "test") -> list:
        """Comme envoyer_push, mais renvoie le résultat de CHAQUE appareil (pour le bouton de vérification admin)."""
        subs = list((await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))).scalars())
        payload = json.dumps({"title": titre, "body": corps, "url": url, "tag": tag})
        out, supprime = [], False
        for s_ in subs:
            etat = await asyncio.to_thread(_envoyer_un, s_, payload)
            out.append({"appareil": _libelle_appareil(s_.endpoint), "etat": etat,
                        "depuis": s_.created_at.isoformat() if s_.created_at else None})
            if etat == "mort":
                await db.delete(s_)
                supprime = True
        if supprime:
            await db.commit()
        return out

    g["envoyer_push_detail"] = envoyer_push_detail

    @api.get("/push/public-key")
    async def push_public_key():
        return {"publicKey": _vapid()["public"]}

    class SubKeys(BaseModel):
        p256dh: str
        auth: str

    class SubIn(BaseModel):
        endpoint: str
        keys: SubKeys

    @api.post("/push/subscribe")
    async def subscribe(body: SubIn, db=Depends(get_db)):
        uid = _connecte()
        existing = (await db.execute(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))).scalars().first()
        nouveau = existing is None or existing.user_id != uid
        if existing:
            existing.user_id = uid
            existing.p256dh = body.keys.p256dh
            existing.auth = body.keys.auth
        else:
            db.add(PushSubscription(user_id=uid, endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth))
        await db.commit()
        if nouveau and _diagnostic()["probleme"] is None:
            # Message de bienvenue : l'utilisateur voit tout de suite que ça marche (plus besoin de bouton « test »),
            # et c'est un vrai essai d'envoi de bout en bout.
            async def _bienvenue():
                try:
                    sub = PushSubscription(user_id=uid, endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth)
                    payload = json.dumps({"title": "Notifications activées ✅",
                                          "body": "Tu seras prévenu ici dès que ton Copilote répond ou qu'une actu t'attend.",
                                          "url": "/app", "tag": "bienvenue"})
                    etat = await asyncio.to_thread(_envoyer_un, sub, payload)
                    if etat == "mort":
                        async with g["async_session"]() as s2:
                            ligne = (await s2.execute(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))).scalars().first()
                            if ligne:
                                await s2.delete(ligne)
                                await s2.commit()
                except Exception as exc:  # noqa: BLE001
                    log.warning("Message de bienvenue push non envoyé : %s", exc)
            asyncio.ensure_future(_bienvenue())
        return {"ok": True, "nouveau": nouveau}

    @api.delete("/push/subscribe")
    async def unsubscribe(body: SubIn, db=Depends(get_db)):
        uid = _connecte()
        sub = (await db.execute(select(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint, PushSubscription.user_id == uid))).scalars().first()
        if sub:
            await db.delete(sub)
            await db.commit()
        return {"ok": True}

    @api.get("/push/statut")
    async def push_statut(db=Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            # Mode démo (aperçu) : réponse sereine au lieu d'un 401 qui expulsait
            # le compte test Thomas vers /login à chaque ouverture de l'app.
            return {"actif": False, "appareils": 0, "disponible": False, "demo": True}
        n = len(list((await db.execute(select(PushSubscription).where(PushSubscription.user_id == uid))).scalars()))
        d = _diagnostic()
        return {"actif": n > 0, "appareils": n, "disponible": d["probleme"] is None, "probleme": d["probleme"]}

    @api.post("/push/test")
    async def push_test(db=Depends(get_db)):
        uid = _connecte()
        r = await envoyer_push(db, uid, "Zayado", "🔔 Tes notifications sont bien activées.", "/app", "test")
        if not r.get("envoye"):
            if r.get("raison") == "vapid_absent":
                raise HTTPException(503, "Notifications non configurées côté serveur (clés VAPID absentes).")
            if r.get("echec"):
                raise HTTPException(502, "Le service de notification a refusé l'envoi : vérifie les clés VAPID dans les journaux du serveur.")
            raise HTTPException(400, "Aucun appareil abonné (active d'abord les notifications).")
        return r

    @api.post("/push/rappel-checkin")
    async def push_rappel_checkin(db=Depends(get_db)):
        uid = _connecte()
        return await envoyer_push(db, uid, "C'est l'heure de ton check-in ✨",
                                  "Note ton énergie du jour en 30 secondes pour un point du jour adapté.",
                                  "/app", "checkin")
