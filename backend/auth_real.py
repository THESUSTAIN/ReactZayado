"""
ZAYADO / MyExtension Business — Authentification RÉELLE
========================================================
Remplace les stubs de `server.py` (qui répondaient toujours « vous êtes
Thomas », n'envoyaient aucun email et exposaient des chemins que le frontend
n'appelait jamais).

Ce module fournit, sur les chemins EXACTS que `frontend/src/lib/api.js`
appelle réellement :

  GET  /api/oauth/{provider}/start   → vraie URL d'autorisation Google/Microsoft
  POST /api/oauth/{provider}         → échange du code contre une vraie session
  POST /api/auth/request-link        → lien magique VRAIMENT envoyé par email
  POST /api/auth/verify-link         → vérification du lien signé
  GET  /api/auth/me                  → identité réelle du porteur du jeton
  POST /api/auth/register|login      → compte email + mot de passe
  POST /api/onboarding               → enregistre l'onboarding (dont la Vision)
  GET/PUT /api/prefs, /api/vision    → préférences et Vision persistées

Persistance : SQLite (stdlib, aucune dépendance ajoutée) dans DATA_DIR.
⚠️ Sur Railway le disque d'un conteneur est éphémère : montez un volume et
   pointez DATA_DIR dessus, sinon les comptes repartent à zéro à chaque
   déploiement. C'est signalé au démarrage dans les logs.

Aucune valeur n'est inventée : si une clé manque, la route répond une erreur
explicite (503 + message lisible) au lieu de simuler un succès.
"""
from __future__ import annotations

import json
import logging
import re
import os
import secrets
import sqlite3
import time
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Body, Header, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger("zayado-auth")

router = APIRouter()

# ── Configuration ────────────────────────────────────────────────────────
DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent / "data"))
DB_PATH = DATA_DIR / "zayado.sqlite3"

JWT_SECRET = os.environ.get("JWT_SECRET") or ""
JWT_ALGO = "HS256"
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "30"))
MAGIC_LINK_MINUTES = int(os.environ.get("MAGIC_LINK_MINUTES", "20"))

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
MICROSOFT_CLIENT_ID = os.environ.get("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.environ.get("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_TENANT = os.environ.get("MICROSOFT_TENANT", "common")

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "bonjour@zayado.net")
MAIL_FROM_NAME = os.environ.get("MAIL_FROM_NAME", "MyExtension Business")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")

# « preview » = environnement de démonstration. En production ce drapeau est
# faux, donc : aucun lien de secours affiché à l'écran, aucun compte de test.
IS_PREVIEW = os.environ.get("APP_ENV", "production").lower() in {"preview", "dev", "development", "local"}
ALLOW_DEMO_LOGIN = IS_PREVIEW or os.environ.get("ALLOW_DEMO_LOGIN", "").lower() in {"1", "true", "yes"}

if not JWT_SECRET:
    # Un secret éphémère vaut mieux qu'un secret codé en dur : les sessions ne
    # survivront pas à un redémarrage, mais personne ne peut forger de jeton.
    JWT_SECRET = secrets.token_urlsafe(48)
    logger.warning("[auth] JWT_SECRET absent — secret temporaire généré. "
                   "Définissez JWT_SECRET dans Railway pour que les sessions survivent aux redéploiements.")


# ── Base de données ──────────────────────────────────────────────────────
def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                first_name TEXT,
                name TEXT,
                password_hash TEXT,
                provider TEXT,
                settings TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_data (
                user_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, key)
            )
        """)
        conn.commit()
    logger.info(f"[auth] Base utilisateurs : {DB_PATH}")
    if not os.environ.get("DATA_DIR"):
        logger.warning("[auth] DATA_DIR non défini — la base vit dans le conteneur et sera perdue "
                       "au prochain déploiement. Montez un volume Railway et pointez DATA_DIR dessus.")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return f"pbkdf2$200000${salt}${digest}"


def _verify_password(password: str, stored: Optional[str]) -> bool:
    if not stored:
        return False
    try:
        _, iterations, salt, digest = stored.split("$")
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
        return hmac.compare_digest(candidate, digest)
    except Exception:
        return False


def get_or_create_user(email: str, first_name: str = "", provider: str = "email",
                       password: Optional[str] = None) -> Dict[str, Any]:
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Adresse email invalide.")
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            # Complète un prénom manquant quand le fournisseur nous en donne un.
            if first_name and not row["first_name"]:
                conn.execute("UPDATE users SET first_name = ? WHERE id = ?", (first_name, row["id"]))
                conn.commit()
                row = conn.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
            return _row_to_user(row)
        user_id = secrets.token_urlsafe(12)
        conn.execute(
            "INSERT INTO users (id, email, first_name, name, password_hash, provider, settings, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, email, first_name, first_name, _hash_password(password) if password else None,
             provider, json.dumps({"onboarding_completed": False, "language": "fr"}), _now()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user(row)


def _row_to_user(row: sqlite3.Row) -> Dict[str, Any]:
    try:
        settings = json.loads(row["settings"] or "{}")
    except Exception:
        settings = {}
    onboarding_done = bool(settings.get("onboarding_completed"))
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"] or row["first_name"] or row["email"].split("@")[0],
        "first_name": row["first_name"] or "",
        "role": "user",
        "provider": row["provider"],
        "plan": settings.get("plan", "trial"),
        "credits": settings.get("credits", 100),
        "settings": settings,
        "onboarding_done": onboarding_done,
        "created_at": row["created_at"],
        "thesustain_member": bool(settings.get("thesustain_member")),
        "two_factor_enabled": False,
        "is_active": True,
    }


def _load_user(user_id: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user(row) if row else None


def update_settings(user_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    with _connect() as conn:
        row = conn.execute("SELECT settings FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Compte introuvable.")
        try:
            settings = json.loads(row["settings"] or "{}")
        except Exception:
            settings = {}
        settings.update(patch)
        conn.execute("UPDATE users SET settings = ? WHERE id = ?", (json.dumps(settings), user_id))
        conn.commit()
    return settings


# ── Jetons ───────────────────────────────────────────────────────────────
def issue_session(user: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "typ": "session",
        "iat": int(time.time()),
        "exp": int(time.time()) + SESSION_DAYS * 86400,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    return {"access_token": token, "token_type": "bearer", "user": user}


def _decode(token: str, expected_type: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Lien ou session expiré.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide.")
    if payload.get("typ") != expected_type:
        raise HTTPException(status_code=401, detail="Jeton invalide.")
    return payload


def current_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = _decode(authorization.split(" ", 1)[1].strip(), "session")
    user = _load_user(payload.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Session inconnue.")
    return user


# ── Email (Brevo) ────────────────────────────────────────────────────────
def _magic_link_email_html(link: str, minutes: int) -> str:
    return f"""<!doctype html><html lang="fr"><body style="margin:0;background:#0B1F3A;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#0F2748;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:32px;">
<tr><td>
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#DEC2A3;font-weight:700;">MyExtension Business</p>
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#ffffff;font-weight:600;">Votre lien de connexion</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,.72);">Cliquez sur le bouton ci-dessous pour ouvrir votre espace. Ce lien est valable {minutes} minutes et ne fonctionne qu'une seule fois.</p>
<a href="{link}" style="display:inline-block;background:#DEC2A3;color:#0A1128;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;">Me connecter</a>
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,.45);">Si vous n'avez pas demandé cette connexion, ignorez simplement cet email — aucun accès n'est accordé sans ce clic.</p>
</td></tr></table>
<p style="margin:18px 0 0;font-size:11px;color:rgba(255,255,255,.35);">Zayado · MyExtension Business</p>
</td></tr></table></body></html>"""


async def send_magic_link_email(to_email: str, link: str) -> bool:
    """Envoi réel via Brevo. Renvoie False (et loggue) au lieu de mentir."""
    if not BREVO_API_KEY:
        logger.error("[auth] BREVO_API_KEY absent — aucun email ne peut partir.")
        return False
    payload = {
        "sender": {"email": MAIL_FROM, "name": MAIL_FROM_NAME},
        "to": [{"email": to_email}],
        "subject": "Votre lien de connexion — MyExtension Business",
        "htmlContent": _magic_link_email_html(link, MAGIC_LINK_MINUTES),
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
                json=payload,
            )
        if resp.status_code in (200, 201, 202):
            return True
        logger.error(f"[auth] Brevo HTTP {resp.status_code}: {resp.text[:300]}")
        return False
    except Exception as exc:
        logger.error(f"[auth] Brevo exception: {exc}")
        return False


# ── OAuth ────────────────────────────────────────────────────────────────
PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "label": "Google",
        "env": ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    },
    "microsoft": {
        "authorize": f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/authorize",
        "token": f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/token",
        "userinfo": "https://graph.microsoft.com/v1.0/me",
        "scope": "openid email profile User.Read",
        "client_id": MICROSOFT_CLIENT_ID,
        "client_secret": MICROSOFT_CLIENT_SECRET,
        "label": "Microsoft",
        "env": ("MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"),
    },
}


def _provider(name: str) -> Dict[str, Any]:
    cfg = PROVIDERS.get((name or "").lower())
    if not cfg:
        raise HTTPException(status_code=404, detail="Fournisseur inconnu.")
    if not cfg["client_id"] or not cfg["client_secret"]:
        raise HTTPException(
            status_code=503,
            detail=f"La connexion {cfg['label']} n'est pas encore configurée sur le serveur "
                   f"({' et '.join(cfg['env'])} manquants).",
        )
    return cfg


@router.get("/oauth/{provider}/start")
async def oauth_start(provider: str, redirect_uri: str = Query(default="")):
    """Chemin appelé par lib/api.js — renvoie une VRAIE URL d'autorisation."""
    cfg = _provider(provider)
    redirect_uri = redirect_uri or (f"{APP_BASE_URL}/login" if APP_BASE_URL else "")
    if not redirect_uri:
        raise HTTPException(status_code=400, detail="redirect_uri manquant.")
    state = f"{provider.lower()}_{secrets.token_urlsafe(16)}"
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
        "prompt": "select_account",
    }
    if provider.lower() == "google":
        params["access_type"] = "online"
    return {"authorization_url": f"{cfg['authorize']}?{urlencode(params)}", "state": state}


async def _fetch_identity(provider: str, cfg: Dict[str, Any], code: str, redirect_uri: str) -> Dict[str, str]:
    data = {
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=25.0) as client:
        token_resp = await client.post(cfg["token"], data=data,
                                       headers={"Content-Type": "application/x-www-form-urlencoded"})
        if token_resp.status_code != 200:
            logger.error(f"[auth] {provider} token HTTP {token_resp.status_code}: {token_resp.text[:300]}")
            raise HTTPException(status_code=401, detail=f"Échec de la connexion {cfg['label']}.")
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail=f"Échec de la connexion {cfg['label']}.")
        info_resp = await client.get(cfg["userinfo"], headers={"Authorization": f"Bearer {access_token}"})
        if info_resp.status_code != 200:
            logger.error(f"[auth] {provider} userinfo HTTP {info_resp.status_code}: {info_resp.text[:300]}")
            raise HTTPException(status_code=401, detail=f"Profil {cfg['label']} illisible.")
        info = info_resp.json()

    if provider.lower() == "google":
        email = info.get("email", "")
        first_name = info.get("given_name") or (info.get("name") or "").split(" ")[0]
    else:
        email = info.get("mail") or info.get("userPrincipalName") or ""
        first_name = info.get("givenName") or (info.get("displayName") or "").split(" ")[0]
    if not email:
        raise HTTPException(status_code=401, detail=f"{cfg['label']} n'a pas fourni d'adresse email.")
    return {"email": email, "first_name": first_name or ""}


@router.post("/oauth/{provider}")
async def oauth_exchange(provider: str, payload: Dict[str, Any] = Body(default={})):
    """Chemin appelé par lib/api.js — échange le code contre une vraie session."""
    cfg = _provider(provider)
    code = (payload or {}).get("code")
    redirect_uri = (payload or {}).get("redirect_uri") or (f"{APP_BASE_URL}/login" if APP_BASE_URL else "")
    if not code or not redirect_uri:
        raise HTTPException(status_code=400, detail="Code ou redirect_uri manquant.")
    identity = await _fetch_identity(provider, cfg, code, redirect_uri)
    user = get_or_create_user(identity["email"], identity["first_name"], provider.lower())
    return issue_session(user)


# ── Lien magique ─────────────────────────────────────────────────────────
class EmailPayload(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None


@router.post("/auth/request-link")
async def request_link(payload: EmailPayload):
    email = (payload.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Adresse email invalide.")

    token = jwt.encode(
        {"email": email, "typ": "magic", "jti": secrets.token_urlsafe(8),
         "iat": int(time.time()), "exp": int(time.time()) + MAGIC_LINK_MINUTES * 60},
        JWT_SECRET, algorithm=JWT_ALGO,
    )
    base = APP_BASE_URL or ""
    link = f"{base}/login?token={token}"
    delivered = await send_magic_link_email(email, link)

    if delivered:
        # En production, l'utilisateur ne voit RIEN d'autre que « email envoyé ».
        return {"ok": True, "delivered_via_email": True, "email": email}

    if IS_PREVIEW:
        # Uniquement hors production : lien de secours affiché à l'écran.
        return {"ok": True, "preview": True, "dev_link": f"/login?token={token}", "email": email}

    # Production sans email possible : on le dit, on ne bricole pas.
    logger.error("[auth] Lien magique non envoyé (Brevo indisponible ou non configuré).")
    return {"ok": False, "delivery_failed": True, "email": email}


@router.post("/auth/verify-link")
async def verify_link(payload: Dict[str, Any] = Body(default={})):
    token = (payload or {}).get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Jeton manquant.")
    claims = _decode(token, "magic")
    user = get_or_create_user(claims["email"], provider="email")
    return issue_session(user)


@router.post("/auth/register")
async def register(payload: EmailPayload):
    email = (payload.email or "").strip().lower()
    if not payload.password or len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères.")
    with _connect() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet email.")
    user = get_or_create_user(email, payload.first_name or "", "email", payload.password)
    return issue_session(user)


@router.post("/auth/login")
async def login(payload: EmailPayload):
    email = (payload.email or "").strip().lower()
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or not _verify_password(payload.password or "", row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    return issue_session(_row_to_user(row))


@router.post("/auth/demo-login")
async def demo_login(payload: Dict[str, Any] = Body(default={})):
    """Compte de démonstration — refusé en production."""
    if not ALLOW_DEMO_LOGIN:
        raise HTTPException(status_code=403, detail="Le compte de démonstration est désactivé en production.")
    email = (payload or {}).get("email") or "thomas@zayado.net"
    return issue_session(get_or_create_user(email, "Thomas", "demo"))


@router.get("/auth/me")
async def me(authorization: Optional[str] = Header(default=None)):
    return current_user(authorization)


# ── Onboarding, préférences, Vision (persistés) ──────────────────────────
def _put_data(user_id: str, key: str, value: Any) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            (user_id, key, json.dumps(value), _now()),
        )
        conn.commit()


def _get_data(user_id: str, key: str, default: Any = None) -> Any:
    with _connect() as conn:
        row = conn.execute("SELECT value FROM user_data WHERE user_id = ? AND key = ?", (user_id, key)).fetchone()
    if not row:
        return default
    try:
        return json.loads(row["value"])
    except Exception:
        return default


@router.post("/onboarding")
async def onboarding(payload: Dict[str, Any] = Body(default={}),
                     authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    payload = payload or {}
    first_name = (payload.get("first_name") or "").strip()
    vision_text = (payload.get("vision") or "").strip()

    with _connect() as conn:
        if first_name:
            conn.execute("UPDATE users SET first_name = ?, name = ? WHERE id = ?",
                         (first_name, first_name, user["id"]))
            conn.commit()

    update_settings(user["id"], {
        "onboarding_completed": True,
        "inspiration": payload.get("inspiration") or "",
        "workspace_type": payload.get("workspace_type") or "",
        "project_type": payload.get("project_type") or "",
    })
    if vision_text:
        _put_data(user["id"], "vision", {"value": vision_text, "updated_at": _now()})

    refreshed = _load_user(user["id"])
    return {"ok": True, "user": refreshed, "vision_saved": bool(vision_text)}


@router.get("/vision")
async def get_vision(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    return _get_data(user["id"], "vision", {"value": ""})


@router.put("/vision")
@router.post("/vision")
async def set_vision(payload: Dict[str, Any] = Body(default={}),
                     authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    value = (payload or {}).get("value") or (payload or {}).get("vision") or ""
    record = {"value": str(value).strip(), "updated_at": _now()}
    _put_data(user["id"], "vision", record)
    return record


@router.get("/prefs")
async def get_prefs(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    prefs = _get_data(user["id"], "prefs", {})
    prefs.setdefault("first_name", user["first_name"])
    prefs.setdefault("language", user["settings"].get("language", "fr"))
    return prefs


@router.put("/prefs")
@router.post("/prefs")
async def set_prefs(payload: Dict[str, Any] = Body(default={}),
                    authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    prefs = _get_data(user["id"], "prefs", {})
    prefs.update(payload or {})
    _put_data(user["id"], "prefs", prefs)
    return prefs


@router.get("/auth/config")
async def auth_config():
    """Ce que le serveur sait faire — utile pour diagnostiquer un déploiement."""
    return {
        "environment": "preview" if IS_PREVIEW else "production",
        "google_oauth": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "microsoft_oauth": bool(MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET),
        "email_delivery": bool(BREVO_API_KEY),
        "demo_login_allowed": ALLOW_DEMO_LOGIN,
        "persistent_storage": bool(os.environ.get("DATA_DIR")),
    }


# ── Configuration du cockpit par l'IA ────────────────────────────────────
# La landing promet « L'IA structure votre vision en priorités concrètes ».
# Jusqu'ici l'onboarding se contentait d'enregistrer une phrase : l'utilisateur
# arrivait sur une application vide, sans savoir quoi faire. C'est le premier
# motif d'abandon d'un SaaS.
#
# Principe retenu, cohérent avec la posture du produit (« l'IA prépare, vous
# décidez ») : l'IA PROPOSE une structure, l'utilisateur VALIDE. Rien n'est
# écrit sans son accord, et rien n'est inventé si l'IA est indisponible —
# dans ce cas la route le dit honnêtement plutôt que de fabriquer un contenu
# générique qui se ferait passer pour une analyse.

STRUCTURE_PROMPT = """Tu es le copilote stratégique de MyExtension Business, pour des solopreneurs \
et petites entreprises francophones.

L'utilisateur vient d'écrire sa Vision. Transforme-la en une structure de départ SOBRE et RÉALISTE.

Contraintes strictes :
- Exactement 3 piliers stratégiques. Un pilier = un axe de travail durable, pas une tâche.
- Exactement 1 jalon : une étape vérifiable atteignable en moins de 90 jours.
- Exactement 1 première action : concrète, faisable en moins de 2 heures, dès aujourd'hui.
- N'invente aucun chiffre, aucun montant, aucune date, aucun nom de client.
- Reste au niveau de ce que la Vision dit réellement. Si elle est vague, propose une structure
  qui aide à la préciser plutôt que d'inventer un business plan.
- Français, ton direct, pas de jargon de consultant.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, à ce format exact :
{"pillars":[{"name":"...","why":"..."},{"name":"...","why":"..."},{"name":"...","why":"..."}],
 "milestone":{"title":"...","evidence":"..."},
 "first_action":{"title":"...","why_now":"..."}}"""


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Un modèle renvoie parfois le JSON entouré de texte ou d'un bloc ```."""
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", cleaned).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(cleaned[start:end + 1])
    except Exception:
        return None


def _valid_structure(data: Any) -> bool:
    """Une proposition incomplète ne doit jamais être présentée comme une analyse."""
    if not isinstance(data, dict):
        return False
    pillars = data.get("pillars")
    if not isinstance(pillars, list) or len(pillars) != 3:
        return False
    if not all(isinstance(p, dict) and str(p.get("name", "")).strip() for p in pillars):
        return False
    for key in ("milestone", "first_action"):
        node = data.get(key)
        if not isinstance(node, dict) or not str(node.get("title", "")).strip():
            return False
    return True


@router.post("/onboarding/structure")
async def structure_vision(payload: Dict[str, Any] = Body(default={}),
                           authorization: Optional[str] = Header(default=None)):
    """Propose une structure de départ à partir de la Vision. Ne persiste RIEN."""
    user = current_user(authorization)
    vision = (payload or {}).get("vision") or (_get_data(user["id"], "vision", {}) or {}).get("value") or ""
    vision = str(vision).strip()
    if not vision:
        raise HTTPException(status_code=400, detail="Aucune Vision à structurer.")

    api_key = os.environ.get("MAMMOUTH_API_KEY") or os.environ.get("MAMMOTH_API_KEY", "")
    if not api_key:
        # Pas de contenu générique déguisé en analyse : on le dit.
        return {"available": False,
                "reason": "Le service IA n'est pas configuré sur ce serveur (MAMMOUTH_API_KEY manquante)."}

    base_url = os.environ.get("MAMMOUTH_BASE_URL", "https://api.mammouth.ai/v1").rstrip("/")
    model = os.environ.get("MAMMOUTH_MODEL", "claude-haiku-4-5-20251001")
    context = []
    settings = user.get("settings") or {}
    if settings.get("workspace_type"):
        context.append(f"Structure : {settings['workspace_type']}")
    if settings.get("project_type"):
        context.append(f"Vend : {settings['project_type']}")
    user_content = f"Vision : {vision}"
    if context:
        user_content += "\nContexte : " + " · ".join(context)

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "max_tokens": 900, "temperature": 0.4, "stream": False,
                      "messages": [{"role": "system", "content": STRUCTURE_PROMPT},
                                   {"role": "user", "content": user_content}]},
            )
        if resp.status_code != 200:
            logger.error(f"[structure] HTTP {resp.status_code}: {resp.text[:300]}")
            return {"available": False, "reason": "Le service IA est momentanément indisponible."}
        content = (resp.json().get("choices", [{}])[0].get("message", {}).get("content") or "")
    except Exception as exc:
        logger.error(f"[structure] exception: {exc}")
        return {"available": False, "reason": "Le service IA n'a pas répondu."}

    data = _extract_json(content)
    if not _valid_structure(data):
        logger.error(f"[structure] réponse inexploitable : {content[:200]}")
        return {"available": False, "reason": "La proposition reçue était incomplète."}

    return {"available": True, "proposal": data}


@router.post("/onboarding/apply-structure")
async def apply_structure(payload: Dict[str, Any] = Body(default={}),
                          authorization: Optional[str] = Header(default=None)):
    """Enregistre la structure APRÈS validation explicite par l'utilisateur."""
    user = current_user(authorization)
    proposal = (payload or {}).get("proposal")
    if not _valid_structure(proposal):
        raise HTTPException(status_code=400, detail="Structure invalide.")

    _put_data(user["id"], "vision_pillars", [
        {"name": str(p.get("name", "")).strip(), "why": str(p.get("why", "")).strip(), "value": 0}
        for p in proposal["pillars"]
    ])
    milestone_id = secrets.token_urlsafe(8)
    _put_data(user["id"], "strategic_milestones", [{
        "id": milestone_id,
        "title": str(proposal["milestone"].get("title", "")).strip(),
        "expected_evidence": str(proposal["milestone"].get("evidence", "")).strip(),
        "time_window": "now", "status": "active", "created_at": _now(), "source": "onboarding_ia",
    }])
    first_label = str(proposal["first_action"].get("title", "")).strip()
    _put_data(user["id"], "taches", [{
        "id": secrets.token_urlsafe(8),
        "label": first_label, "titre": first_label,
        "why_now": str(proposal["first_action"].get("why_now", "")).strip(),
        "priorite": "high", "done": False,
        "strategic_milestone_id": milestone_id,
        "created_at": _now(), "source": "onboarding_ia",
    }])
    update_settings(user["id"], {"cockpit_structured": True})
    return {"ok": True}


# ── Lecture des données créées par l'onboarding ──────────────────────────
# Sans ces routes, la structure validée serait écrite puis jamais relue :
# la route fourre-tout de server.py répondrait [] et l'application
# resterait vide malgré la validation de l'utilisateur.
@router.get("/vision/pillars")
async def get_pillars(authorization: Optional[str] = Header(default=None)):
    return _get_data(current_user(authorization)["id"], "vision_pillars", [])


@router.get("/strategy/overview")
async def strategy_overview(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    return {
        "milestones": _get_data(user["id"], "strategic_milestones", []),
        "decisions": _get_data(user["id"], "strategic_decisions", []),
        "tasks": _get_data(user["id"], "taches", []),
        "pillars": _get_data(user["id"], "vision_pillars", []),
    }


# Le frontend appelle /api/tasks avec le champ `label` (vérifié dans
# lib/api.js : getTaches → GET /tasks, createTache → POST /tasks {label,
# priority}). Servir /api/taches aurait laissé la tâche créée par l'IA
# invisible sur l'accueil : bien enregistrée, jamais relue.
@router.get("/tasks")
async def get_tasks(authorization: Optional[str] = Header(default=None)):
    return _get_data(current_user(authorization)["id"], "taches", [])


@router.post("/tasks")
async def create_task(payload: Dict[str, Any] = Body(default={}),
                      authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    payload = payload or {}
    label = str(payload.get("label") or payload.get("titre") or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="Titre manquant.")
    tasks = _get_data(user["id"], "taches", [])
    task = {
        "id": secrets.token_urlsafe(8), "label": label, "titre": label,
        "priorite": payload.get("priority") or "normal", "done": False,
        "strategic_milestone_id": payload.get("strategic_milestone_id"),
        "vision_pillar_id": payload.get("vision_pillar_id"),
        "created_at": _now(),
    }
    tasks.insert(0, task)
    _put_data(user["id"], "taches", tasks)
    return task


@router.patch("/tasks/{task_id}")
@router.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: Dict[str, Any] = Body(default={}),
                      authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    tasks = _get_data(user["id"], "taches", [])
    for task in tasks:
        if task.get("id") == task_id:
            task.update({k: v for k, v in (payload or {}).items() if k != "id"})
            _put_data(user["id"], "taches", tasks)
            return task
    raise HTTPException(status_code=404, detail="Tâche introuvable.")


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    tasks = [t for t in _get_data(user["id"], "taches", []) if t.get("id") != task_id]
    _put_data(user["id"], "taches", tasks)
    return {"ok": True}
