"""Logs applicatifs — porté depuis app-main/backend/routes/app_logs.py.

Contrairement à Connexions et Affiliation, il n'existait ici RIEN d'équivalent
à vérifier avant de porter : ce repo n'a que le logging Python standard
(`logger.info(...)`, non persistant, jamais consultable depuis l'admin). Le
vrai trou : aucune table, aucune vue admin pour repérer une erreur en
production sans avoir accès aux logs serveur bruts.

Ajouté, sur le même patron que les autres modules `_ext.py` (nouvelle table
déclarée dans `install_app_logs`, comme `RituelFait` dans rituels_ext.py) :

  - Table `app_logs` (niveau, fonctionnalité, message, utilisateur, détails,
    durée).
  - `log_event(...)` — helper asynchrone, fire-and-forget, exporté dans les
    globals du serveur (clé `log_event`) pour que d'autres modules puissent
    s'en servir plus tard (auth, paiements, chat…) sans dépendance circulaire.
  - Un middleware additif (n'importe où dans la chaîne — ne remplace ni ne
    modifie `_AuthMiddleware`) qui journalise automatiquement toute exception
    non interceptée (niveau CRITICAL) et les réponses 5xx (niveau ERROR) —
    seule instrumentation automatique ajoutée, pour ne toucher aucune route
    existante. Pour un suivi plus fin (échecs de connexion, paiements,
    affiliation…), il suffit d'appeler `log_event(...)` aux points voulus —
    volontairement laissé pour un prochain lot ciblé plutôt que deviné ici.
  - Routes admin : GET /app-logs (filtres niveau/fonctionnalité/recherche/
    période, pagination), GET /app-logs/summary (résumé 24h), DELETE
    /app-logs/purge (purge des logs de plus de N jours).
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Request
from sqlalchemy import DateTime, Integer, String, Text, and_, delete, func, select
from sqlalchemy.orm import Mapped, mapped_column
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

log = logging.getLogger("kairos.app_logs")

FEATURES_CONNUES = ["chat", "auth", "payment", "extension", "affiliate", "admin", "agent", "oauth"]


def install_app_logs(g: dict) -> None:
    Base, api, get_db, app = g["Base"], g["api"], g["get_db"], g["app"]
    utcnow, new_uuid = g["utcnow"], g["new_uuid"]
    exiger_role = g["exiger_role"]
    async_session = g["async_session"]

    class AppLog(Base):
        __tablename__ = "app_logs"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        level: Mapped[str] = mapped_column(String(10), index=True)          # INFO | WARNING | ERROR | CRITICAL
        feature: Mapped[str] = mapped_column(String(30), index=True)        # chat | auth | payment | extension | affiliate | admin | agent | oauth
        action: Mapped[str] = mapped_column(String(100), nullable=True)
        user_id: Mapped[str] = mapped_column(String(36), nullable=True, index=True)
        user_email: Mapped[str] = mapped_column(String(255), nullable=True)
        message: Mapped[str] = mapped_column(Text)
        details: Mapped[str] = mapped_column(Text, nullable=True)
        ip_address: Mapped[str] = mapped_column(String(64), nullable=True)
        duration_ms: Mapped[int] = mapped_column(Integer, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    async def log_event(level: str, feature: str, message: str, *, action: str = None,
                         user_id: str = None, user_email: str = None, details: dict = None,
                         ip_address: str = None, duration_ms: int = None) -> None:
        """Enregistre un événement applicatif. Non-bloquant : une erreur ici
        ne doit jamais faire échouer l'appelant."""
        try:
            async with async_session() as db:
                if user_id and not user_email and g.get("User") is not None:
                    try:
                        u = await db.get(g["User"], user_id)
                        user_email = u.email if u else None
                    except Exception:  # noqa: BLE001
                        pass
                db.add(AppLog(
                    level=level.upper(), feature=feature, action=action,
                    user_id=user_id, user_email=user_email, message=message,
                    details=json.dumps(details, ensure_ascii=False, default=str) if details else None,
                    ip_address=ip_address, duration_ms=duration_ms,
                ))
                await db.commit()
        except Exception as e:  # noqa: BLE001 — ne jamais bloquer l'appli pour un log
            log.warning(f"[AppLog] Échec d'enregistrement : {e}")

    # Exporté pour un usage ultérieur par d'autres modules (auth, paiements…)
    g["log_event"] = log_event

    # ── Instrumentation automatique, additive : erreurs non interceptées et
    # réponses 5xx. Ne touche aucune route existante. ──
    # Événements métier journalisés automatiquement (avant : seules les erreurs 5xx l'étaient,
    # d'où un journal vide pendant des jours alors que l'appli tournait normalement).
    # (méthode, chemin ou préfixe) → (fonctionnalité, libellé)
    EVENEMENTS = [
        ("POST", "/api/auth/login", "auth", "Connexion par mot de passe"),
        ("POST", "/api/auth/register", "auth", "Inscription"),
        ("POST", "/api/connexion/verifier", "auth", "Connexion par lien magique"),
        ("POST", "/api/connexion/lien", "auth", "Demande de lien magique"),
        ("POST", "/api/connexion/oauth/", "oauth", "Connexion Google / Microsoft"),
        ("POST", "/api/connexion/sso/token", "oauth", "Connexion TheSustain (SSO)"),
        ("POST", "/api/checkout", "payment", "Paiement lancé"),
        ("POST", "/api/mollie/webhook", "payment", "Notification Mollie"),
        ("POST", "/api/agent-business/", "agent", "Test de l'Agent Business"),
        ("POST", "/api/agents-perso/", "agent", "Agent IA"),
        ("POST", "/api/public/chatbot/", "agent", "Message sur un chatbot publié"),
    ]

    def _evenement(methode: str, chemin: str):
        for m, p, f, libelle in EVENEMENTS:
            if methode == m and (chemin == p or (p.endswith("/") and chemin.startswith(p))):
                return f, libelle
        return None

    async def _email_requete(request: Request) -> Optional[str]:
        if not request.url.path.startswith(("/api/auth/", "/api/connexion/lien")):
            return None
        try:
            corps = json.loads((await request.body()) or b"{}")
            e = corps.get("email") if isinstance(corps, dict) else None
            return str(e).strip().lower()[:255] if e else None
        except Exception:  # noqa: BLE001
            return None

    class _AppLogsMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            ev = _evenement(request.method, request.url.path)
            email = await _email_requete(request) if ev else None
            debut = datetime.now(timezone.utc)
            try:
                reponse = await call_next(request)
            except Exception as e:  # noqa: BLE001
                await log_event("CRITICAL", "admin", f"Exception non interceptée : {e}",
                                 action=request.url.path, ip_address=request.client.host if request.client else None)
                raise
            ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else None))
            uid = None
            try:
                uid = g["_uid"]()
                uid = None if uid == g.get("DEMO_USER_ID") else uid
            except Exception:  # noqa: BLE001
                pass
            if reponse.status_code >= 500 and request.url.path.startswith("/api"):
                await log_event("ERROR", ev[0] if ev else "admin", f"Erreur serveur {reponse.status_code}" + (f" · {ev[1]}" if ev else ""),
                                 action=request.url.path, ip_address=ip, user_id=uid, user_email=email)
            elif ev:
                code = reponse.status_code
                niveau = "INFO" if code < 400 else "WARNING"
                suite = {401: " — refusée (identifiants)", 402: " — offre inactive", 403: " — refusée (accès / compte suspendu)",
                         409: " — conflit", 422: " — données invalides", 429: " — trop d'essais"}.get(code, "" if code < 400 else f" — {code}")
                await log_event(niveau, ev[0], ev[1] + suite, action=request.url.path, user_id=uid, user_email=email, ip_address=ip,
                                 duration_ms=int((datetime.now(timezone.utc) - debut).total_seconds() * 1000))
            elif reponse.status_code == 429:
                await log_event("WARNING", "admin", "Trop de requêtes (limite atteinte)", action=request.url.path, ip_address=ip)
            return reponse

    app.add_middleware(_AppLogsMiddleware)

    @api.get("/app-logs")
    async def lister_logs(
        db=Depends(get_db), _admin=Depends(exiger_role("admin")),
        skip: int = 0, limit: int = 100,
        level: Optional[str] = None, feature: Optional[str] = None,
        search: Optional[str] = None, hours: Optional[int] = None,
    ):
        filtres = []
        if level:
            filtres.append(AppLog.level == level.upper())
        if feature:
            filtres.append(AppLog.feature == feature)
        if search:
            filtres.append(AppLog.message.contains(search))
        if hours:
            filtres.append(AppLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=hours))

        requete = select(AppLog)
        total_q = select(func.count()).select_from(AppLog)
        if filtres:
            requete = requete.where(and_(*filtres))
            total_q = total_q.where(and_(*filtres))
        requete = requete.order_by(AppLog.created_at.desc())

        total = (await db.execute(total_q)).scalar() or 0
        rows = (await db.execute(requete.offset(skip).limit(min(limit, 300)))).scalars().all()

        return {
            "logs": [{
                "id": r.id, "level": r.level, "feature": r.feature, "action": r.action,
                "user_id": r.user_id, "user_email": r.user_email, "message": r.message,
                "details": r.details, "ip_address": r.ip_address, "duration_ms": r.duration_ms,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            } for r in rows],
            "total": total, "page": (skip // limit) + 1 if limit else 1, "per_page": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 and limit else 1,
        }

    @api.get("/app-logs/summary")
    async def resume_logs(db=Depends(get_db), _admin=Depends(exiger_role("admin"))):
        depuis = datetime.now(timezone.utc) - timedelta(hours=24)
        par_feature = {}
        for f in FEATURES_CONNUES:
            total = (await db.execute(select(func.count()).select_from(AppLog).where(
                and_(AppLog.feature == f, AppLog.created_at >= depuis)))).scalar() or 0
            erreurs = (await db.execute(select(func.count()).select_from(AppLog).where(
                and_(AppLog.feature == f, AppLog.level.in_(["ERROR", "CRITICAL"]), AppLog.created_at >= depuis)))).scalar() or 0
            par_feature[f] = {"total": total, "errors": erreurs}

        par_niveau = {}
        for n in ["INFO", "WARNING", "ERROR", "CRITICAL"]:
            par_niveau[n] = (await db.execute(select(func.count()).select_from(AppLog).where(
                and_(AppLog.level == n, AppLog.created_at >= depuis)))).scalar() or 0

        dernieres_erreurs = (await db.execute(select(AppLog).where(
            and_(AppLog.level.in_(["ERROR", "CRITICAL"]), AppLog.created_at >= depuis)
        ).order_by(AppLog.created_at.desc()).limit(5))).scalars().all()

        return {
            "period_hours": 24, "by_feature": par_feature, "by_level": par_niveau,
            "last_errors": [{
                "id": r.id, "level": r.level, "feature": r.feature, "message": r.message,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            } for r in dernieres_erreurs],
        }

    @api.delete("/app-logs/purge")
    async def purger_logs(db=Depends(get_db), _admin=Depends(exiger_role("admin")), days: int = 30):
        seuil = datetime.now(timezone.utc) - timedelta(days=days)
        resultat = await db.execute(delete(AppLog).where(AppLog.created_at < seuil))
        await db.commit()
        return {"deleted": resultat.rowcount, "cutoff": seuil.isoformat()}
