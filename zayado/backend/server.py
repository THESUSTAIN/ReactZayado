"""Zayado — backend SQL (SQLAlchemy async + SQLite, prêt PostgreSQL via DATABASE_URL).

Porté depuis News-main (Copilote IA) : chat en streaming (Claude Sonnet 4.5) avec
contexte injecté + garde-fous + repli local, Point du jour, Décisions (« il prépare,
tu décides »), Actualité (digest RSS piloté par l'énergie). Mode démo sans login :
un utilisateur unique, pré-rempli au démarrage.
"""

import asyncio
import json
import logging
import math
import os
import re
import ipaddress
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from html import escape
from html.parser import HTMLParser
from typing import List, Optional
from urllib.parse import quote, urlparse

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, delete as sa_delete, func, select,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from starlette.middleware.cors import CORSMiddleware

from heygen_routes import heygen_router

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("kairos")

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:////app/backend/kairos.db")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
DEMO_USER_ID = "demo-user"
MODELE = ("anthropic", "claude-sonnet-4-5-20250929")

# ── Connexions externes (WhatsApp Web, Telegram...) — porté depuis app-main ──
from cryptography.fernet import Fernet
FERNET_KEY = os.environ.get("FERNET_KEY", "")
_fernet = Fernet(FERNET_KEY.encode()) if FERNET_KEY else None
WA_SERVICE_URL = os.environ.get("WA_SERVICE_URL", "http://localhost:3001")
WA_SERVICE_SECRET = os.environ.get("WA_SERVICE_SECRET", "")


def _chiffrer(data: str) -> str:
    """Chiffre une chaîne avec Fernet. Repli en clair si FERNET_KEY absente
    (dev local) — à définir en production."""
    return _fernet.encrypt(data.encode()).decode() if _fernet else data


def _dechiffrer(data: str) -> str:
    if not _fernet or not data:
        return data
    try:
        return _fernet.decrypt(data.encode()).decode()
    except Exception:  # noqa: BLE001 — ancienne valeur en clair
        return data


# ── Multi-compte (ajouté) ──────────────────────────────────────────────
# Avant : DEMO_USER_ID en dur partout. Maintenant : un ContextVar par
# requête (coroutine-safe, contrairement à une simple variable globale),
# rempli par le middleware ci-dessous depuis le JWT si présent, sinon
# repli sur DEMO_USER_ID (mode démo/invité conservé — rien ne casse pour
# qui n'envoie pas de token).
import contextvars
import jwt as _pyjwt
import bcrypt as _bcrypt
from starlette.middleware.base import BaseHTTPMiddleware

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET:
    # Corrigé : avant, un avertissement était loggé mais l'app démarrait quand
    # même avec un secret connu et codé en dur ("kairos-dev-secret-a-changer"),
    # visible dans tout zip partagé de ce projet — n'importe qui pouvait
    # forger un token JWT valide, y compris avec role="admin". Refuse
    # maintenant de démarrer sans vraie clé, sauf en dev local explicite.
    # Par défaut, une variable ENV absente est traitée comme production
    # (le cas le plus dangereux si on se trompe) — il faut explicitement
    # dire "dev" pour obtenir le repli local, jamais l'inverse.
    if os.environ.get("ENV", "").lower() in ("dev", "development", "local"):
        import secrets as _secrets
        JWT_SECRET = _secrets.token_hex(32)
        logger.warning("JWT_SECRET absente — clé aléatoire générée pour cette session dev (les sessions ne survivront pas à un redémarrage).")
    else:
        raise RuntimeError("JWT_SECRET doit être définie en production — refus de démarrer avec un secret par défaut connu.")
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 30

# Alerte au démarrage sur la clé IA texte — ajoutée après l'audit
# d'installation. Sans MAMMOTH_API_KEY, l'application ne tombe PAS en
# erreur : le Copilote IA, le Radar et l'Agent Business basculent
# silencieusement sur un repli local. Concrètement, le chatbot répond
# « Merci pour votre message ! Je le transmets à l'équipe » à chaque
# prospect, tarifs compris — et rien dans les logs ne le signalait.
# HEYGEN_API_KEY avertit déjà de la même façon (heygen_routes.py).
if not (os.environ.get("MAMMOTH_API_KEY") or os.environ.get("MAMMOUTH_API_KEY")):
    logger.warning(
        "⚠️ MAMMOTH_API_KEY n'est pas défini — le Copilote IA, le Radar et "
        "l'Agent Business répondront en repli local (texte générique) au "
        "lieu d'utiliser l'IA. Vérifier cette variable d'env avant la mise "
        "en production."
    )

_current_uid: "contextvars.ContextVar[str]" = contextvars.ContextVar("current_uid", default=DEMO_USER_ID)
_current_role: "contextvars.ContextVar[str]" = contextvars.ContextVar("current_role", default="client")


def _hash_mdp(mdp: str) -> str:
    return _bcrypt.hashpw(mdp.encode(), _bcrypt.gensalt()).decode()


def _verifier_mdp(mdp: str, hash_stocke: str) -> bool:
    try:
        return _bcrypt.checkpw(mdp.encode(), hash_stocke.encode())
    except Exception:  # noqa: BLE001 — hash corrompu/format inattendu
        return False


def _uid() -> str:
    """Identifiant de l'utilisateur courant (celui du token JWT de la
    requête en cours, ou DEMO_USER_ID si non connecté)."""
    return _current_uid.get()


def _creer_token(uid: str, role: str = "client") -> str:
    payload = {"sub": uid, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)}
    return _pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def _role_courant() -> str:
    """Rôle du token JWT de la requête en cours — "client" par défaut
    (anciens tokens émis avant l'ajout du rôle, ou mode démo)."""
    return _current_role.get()


# Routes /api accessibles SANS connexion. Tout le reste exige un JWT valide
# (avant : sans jeton, la requête agissait silencieusement comme l'utilisateur
# démo — n'importe qui pouvait lire/modifier ce compte via l'API).
_ROUTES_PUBLIQUES_EXACTES = {
    "/api", "/api/", "/api/health",
    "/api/auth/login", "/api/auth/register",
    "/api/leads",                      # capture email des pages marketing
    "/api/mollie/webhook",             # appelé par Mollie
    "/api/commerce/health",
    "/api/codes-promo/appliquer",      # simple vérification d'un code
    "/api/subscribe",                  # inscription newsletter (e-mail de bienvenue)
    "/api/tarifs/fondateur",           # état de l'offre fondateur (page Tarifs)
}
_ROUTES_PUBLIQUES_PREFIXES = (
    "/api/connexion/",                 # options, lien magique, OAuth (démo bloquée à part)
    "/api/webhooks/",                  # Telegram / WhatsApp (secret propre)
    "/api/public/",                    # Vision Board partagé en lecture seule
    "/api/vision/images/",             # images chargées par <img>, sans en-tête
    "/api/commerce/offers/",           # fiche d'offre publique
)


def _route_publique(path: str) -> bool:
    return path in _ROUTES_PUBLIQUES_EXACTES or path.startswith(_ROUTES_PUBLIQUES_PREFIXES)


def _mode_apercu(request) -> bool:
    """Aperçu développeur : APERCU_CODE défini ET hors domaines de production.
    Seul cas où une requête sans jeton retombe sur le compte démo."""
    return bool(os.environ.get("APERCU_CODE")) and not _en_prod(request)


class _AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        uid = DEMO_USER_ID
        role = "client"
        jeton_valide = False
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = _pyjwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
                if payload.get("sub"):
                    uid = payload["sub"]
                    jeton_valide = payload["sub"] != DEMO_USER_ID
                # "client" de repli pour les anciens tokens émis avant l'ajout
                # du rôle (pas de champ "role" dedans) — jamais élevé par défaut.
                role = payload.get("role") or "client"
            except Exception:  # noqa: BLE001 — token invalide/expiré
                pass
        path = request.url.path
        if (not jeton_valide and request.method != "OPTIONS" and path.startswith("/api")
                and not _route_publique(path) and not _mode_apercu(request)):
            return JSONResponse(status_code=401, content={"detail": "Connexion requise."})
        token_uid = _current_uid.set(uid)
        token_role = _current_role.set(role)
        try:
            return await call_next(request)
        finally:
            _current_uid.reset(token_uid)
            _current_role.reset(token_role)

# ── Email (Resend géré par Emergent) ──
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Zayado")
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "send your password", "cvv", "seed phrase",
             "recovery phrase", "verify your card", "social security number")

def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)

def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)

class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []

_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)

def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Credential ask: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Non-https link/asset: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Unsafe URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor host mismatch (G3)")

async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    _assert_safe_email(subject, html)
    if not EMAIL_KEY:
        # Repli Brevo direct quand le relai Emergent n'est pas configuré
        # (BREVO_API_KEY + BREVO_SENDER_EMAIL déjà validés sur /subscribe).
        brevo_key = os.environ.get("BREVO_API_KEY", "")
        if not brevo_key:
            raise HTTPException(status_code=500, detail="Email non configuré")
        payload = {
            "sender": {"email": os.environ.get("BREVO_SENDER_EMAIL", "noreply@zayado.net"), "name": EMAIL_FROM_NAME},
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": html,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post("https://api.brevo.com/v3/smtp/email", json=payload,
                                  headers={"api-key": brevo_key, "content-type": "application/json"})
        if r.status_code != 201:
            logger.error("Brevo send failed: %s %s", r.status_code, r.text[:200])
            raise HTTPException(status_code=502, detail="Échec de l'envoi de l'email")
        return r.json().get("messageId")
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Échec de l'envoi de l'email")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email")

engine = create_async_engine(DATABASE_URL, echo=False, future=True, **({} if DATABASE_URL.startswith("sqlite") else {"pool_pre_ping": True, "pool_recycle": 280}))  # MySQL distant : ferme les connexions inactives → on vérifie avant usage
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


# ─────────────────────────── Helpers date ───────────────────────────

def new_uuid() -> str:
    return str(uuid.uuid4())

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def today_iso() -> str:
    return date.today().isoformat()

def iso_moins(n: int) -> str:
    return (date.today() - timedelta(days=n)).isoformat()


# ─────────────────────────── Modèles SQL ───────────────────────────

class Base(DeclarativeBase):
    pass


class VisionProfile(Base):
    __tablename__ = "vision_profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    prenom: Mapped[str] = mapped_column(String(100), nullable=True)
    texte_vision: Mapped[str] = mapped_column(Text, nullable=True)
    pourquoi: Mapped[str] = mapped_column(Text, nullable=True)
    valeurs: Mapped[list] = mapped_column(JSON, default=list)
    heure_checkin: Mapped[str] = mapped_column(String(5), default="08:30")
    plan: Mapped[str] = mapped_column(String(20), default="essentielle")
    notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    fuseau: Mapped[str] = mapped_column(String(64), default="Europe/Paris")
    email: Mapped[str] = mapped_column(String(200), nullable=True)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    contexte_metier: Mapped[dict] = mapped_column(JSON, default=dict)
    objectif_3ans: Mapped[str] = mapped_column(String(300), nullable=True)
    echeance_3ans: Mapped[str] = mapped_column(String(10), nullable=True)
    debut_3ans: Mapped[str] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VisionObjectif(Base):
    __tablename__ = "vision_objectifs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    titre: Mapped[str] = mapped_column(String(300))
    echeance: Mapped[str] = mapped_column(String(10), nullable=True)
    progression: Mapped[int] = mapped_column(Integer, default=0)
    statut: Mapped[str] = mapped_column(String(20), default="actif")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VisionTache(Base):
    __tablename__ = "vision_taches"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    titre: Mapped[str] = mapped_column(String(300))
    duree_min: Mapped[int] = mapped_column(Integer, default=25)
    progression: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[str] = mapped_column(String(30), default="FileText")
    micro: Mapped[bool] = mapped_column(Boolean, default=False)
    statut: Mapped[str] = mapped_column(String(20), default="a_faire")
    objectif_id: Mapped[str] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VisionVictoire(Base):
    __tablename__ = "vision_victoires"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    texte: Mapped[str] = mapped_column(String(500))
    detail: Mapped[str] = mapped_column(Text, nullable=True)
    date: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VisionCheckin(Base):
    __tablename__ = "vision_checkins"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    date: Mapped[str] = mapped_column(String(10))
    energie: Mapped[int] = mapped_column(Integer)
    stress: Mapped[int] = mapped_column(Integer, default=3)
    sommeil: Mapped[int] = mapped_column(Integer, default=3)
    charge: Mapped[int] = mapped_column(Integer, default=3)
    mood: Mapped[str] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VisionBalance(Base):
    __tablename__ = "vision_balance"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    pro: Mapped[int] = mapped_column(Integer, default=60)
    perso: Mapped[int] = mapped_column(Integer, default=40)


class CopiloteDecision(Base):
    __tablename__ = "copilote_decisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    titre: Mapped[str] = mapped_column(String(300))
    note: Mapped[str] = mapped_column(Text, nullable=True)
    statut: Mapped[str] = mapped_column(String(20), default="proposee")  # proposee|approuvee|reportee|refusee
    canal: Mapped[str] = mapped_column(String(20), nullable=True)  # in-app|email|telegram
    origine: Mapped[str] = mapped_column(String(40), default="copilote")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)


class VisionChatMessage(Base):
    __tablename__ = "vision_chat_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(12))
    contenu: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SavedArticle(Base):
    __tablename__ = "saved_articles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    titre: Mapped[str] = mapped_column(String(400))
    lien: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VisionBoardData(Base):
    """Board libre (canvas Storyflow) : toutes les cartes stockées en JSON par utilisateur."""
    __tablename__ = "vision_board_data"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    cards: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class BalanceWheelData(Base):
    """Roue de l'équilibre : piliers de vie (nom, score, couleur) en JSON par utilisateur."""
    __tablename__ = "balance_wheel_data"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    pillars: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class RoadmapItem(Base):
    """Feuille de route trimestrielle (Q1..Q4)."""
    __tablename__ = "vision_roadmap_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    quarter: Mapped[str] = mapped_column(String(2))  # q1|q2|q3|q4
    titre: Mapped[str] = mapped_column(String(300))
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    ordre: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Idee(Base):
    """Capture d'idée : statut Idée→Test→Projet→Action, Impact/Effort, objectif lié."""
    __tablename__ = "idees"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    titre: Mapped[str] = mapped_column(String(400))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    statut: Mapped[str] = mapped_column(String(10), default="idee")  # idee|test|projet|action
    impact: Mapped[int] = mapped_column(Integer, default=5)   # 1-10
    effort: Mapped[int] = mapped_column(Integer, default=5)   # 1-10
    objectif_id: Mapped[str] = mapped_column(String(36), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="manuelle")  # manuelle|vocale|sync
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class User(Base):
    """Compte réel (ajouté pour le multi-compte). Coexiste avec le mode
    démo : tant qu'aucun compte n'est créé, _uid() continue de
    fonctionner exactement comme avant."""
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Système de rôle (façon WordPress) : un seul login, redirection selon
    # le rôle stocké ici. "client" par défaut — jamais élevé automatiquement,
    # seul un admin existant peut promouvoir un compte (voir /admin/utilisateurs/{id}/role).
    role: Mapped[str] = mapped_column(String(20), default="client")
    # Crédits bonus — utilisés notamment par le parrainage ci-dessous.
    credits: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Lead(Base):
    """Capture email des tunnels publics (pages Fonctionnalités) — avant
    inscription complète, pour pouvoir relancer même si la personne
    n'a pas terminé l'onboarding."""
    __tablename__ = "leads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), index=True)
    source: Mapped[str] = mapped_column(String(100), default="inconnue")  # ex. "tunnel-vision"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Referral(Base):
    """Parrainage — un utilisateur parraine un email, gagne un bonus une fois
    que le filleul crée un vrai compte. Adapté du système "affiliate" vu dans
    final-main (Dokan-style), simplifié ici : pas de commission en % sur
    transaction (pas de table transactions dans ce projet), juste un crédit
    fixe par filleul actif — plus simple à auditer, suffisant pour démarrer."""
    __tablename__ = "referrals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    referrer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referred_email: Mapped[str] = mapped_column(String(255), nullable=False)
    referred_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    statut: Mapped[str] = mapped_column(String(20), default="en_attente")  # en_attente, actif, expire
    bonus_credits: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PromoCode(Base):
    """Codes promo — porté depuis ReactZayado/admin_routes.py, adapté au
    modèle User simplifié de ce projet (pas de bonus_credits séparé ici,
    "credits" fait office des deux)."""
    __tablename__ = "promo_codes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(20), default="credits")  # credits, plan
    value: Mapped[int] = mapped_column(Integer, default=0)
    max_uses: Mapped[int] = mapped_column(Integer, default=100)
    current_uses: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LoginToken(Base):
    """Jeton de lien magique — stocké pour de vrai (avant : généré puis jamais
    conservé, donc /connexion/lien n'aboutissait jamais). Valable 15 minutes,
    usage unique."""
    __tablename__ = "login_tokens"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UserConnection(Base):
    """Connexion à un service externe (WhatsApp, Telegram...). Porté depuis
    app-main/backend/routes/connections.py, simplifié pour le mono-compte
    Zayado : un seul user_id (_uid()), les identifiants sensibles
    (tokens) sont chiffrés au repos avec Fernet (clé FERNET_KEY)."""
    __tablename__ = "user_connections"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    provider: Mapped[str] = mapped_column(String(30), index=True)  # whatsapp | telegram
    label: Mapped[str] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|qr_pending|ready|error|revoked
    phone_number: Mapped[str] = mapped_column(String(30), nullable=True)
    credentials_enc: Mapped[str] = mapped_column(Text, nullable=True)  # JSON chiffré (tokens, etc.)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)


class VisionBoardSpace(Base):
    """Multi-boards (perso / pro / personnalisés) : un board = un jeu de cartes JSON."""
    __tablename__ = "vision_board_spaces"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    cle: Mapped[str] = mapped_column(String(40), index=True)
    nom: Mapped[str] = mapped_column(String(80))
    emoji: Mapped[str] = mapped_column(String(8), default="🧭")
    cards: Mapped[list] = mapped_column(JSON, default=list)
    ordre: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class RevueHebdo(Base):
    """Revue hebdomadaire guidée par Zayado : 5 questions + synthèse IA."""
    __tablename__ = "revues_hebdo"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    semaine: Mapped[str] = mapped_column(String(10), index=True)  # lundi ISO de la semaine
    reponses: Mapped[dict] = mapped_column(JSON, default=dict)
    synthese: Mapped[str] = mapped_column(Text, nullable=True)
    energie_moyenne: Mapped[int] = mapped_column(Integer, nullable=True)
    langue: Mapped[str] = mapped_column(String(2), default="fr")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ─────────────────────────── DB session ───────────────────────────

async def get_db():
    async with async_session() as session:
        yield session


# ─────────────────────────── Règles métier ───────────────────────────

def mode_energie(e: Optional[int]) -> str:
    if e is None:
        return "equilibre"
    if e >= 4:
        return "elan"
    if e == 3:
        return "equilibre"
    return "soutien"  # <= 2

def est_recup(e: Optional[int]) -> bool:
    return e is not None and e <= 2

MESSAGES = {
    "elan": "Ton énergie est haute aujourd'hui. C'est le moment idéal pour avancer sur ce qui compte vraiment.",
    "equilibre": "Énergie moyenne, et c'est parfaitement normal. Une chose à la fois, à ton rythme.",
    "soutien": "Ton énergie est basse. Aujourd'hui, on allège. Prends soin de toi d'abord, le reste peut attendre.",
}


# ─────────────────────────── Copilote IA ───────────────────────────

SYSTEM_PROMPT = (
    "Tu es le Copilote Zayado, l'application de vision board d'une "
    "entrepreneure francophone. Tu réponds TOUJOURS en français, en tutoyant, de façon concrète "
    "et brève (3 à 6 phrases), sans jargon et sans flatterie.\n\n"
    "Règles absolues :\n"
    "- Tu ne poses aucun diagnostic et tu ne donnes aucun conseil médical.\n"
    "- Tu n'envoies rien et n'exécutes rien à l'extérieur sans validation explicite. Si une "
    "action extérieure est utile, tu proposes de créer une décision à valider.\n"
    "- Tu es directe et honnête, jamais flatteuse.\n"
    "- Tu n'inventes jamais de données financières ni clients. Si l'info n'est pas dans le "
    "contexte, tu dis que tu ne l'as pas.\n"
    "- Si l'utilisatrice exprime une détresse grave, tu affiches les ressources d'aide (en France, "
    "le 3114, gratuit et 24h/24) et tu l'invites à contacter un proche ou un professionnel de santé.\n\n"
    "Tu t'appuies sur le contexte fourni plutôt que de répondre de façon générique. Quand l'énergie "
    "est basse (≤2), tu proposes UNE seule micro-action de 5 minutes et tu rappelles le pourquoi et "
    "les dernières victoires, avec un ton chaleureux et factuel, sans slogan."
)


async def _contexte(db: AsyncSession, uid: str) -> str:
    profil = (await db.execute(select(VisionProfile).where(VisionProfile.user_id == uid))).scalar_one_or_none()
    objectifs = [o for o in (await db.execute(select(VisionObjectif).where(VisionObjectif.user_id == uid))).scalars() if o.statut != "termine"]
    checkins = list((await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid).order_by(VisionCheckin.date.desc()).limit(1))).scalars())
    victoires = list((await db.execute(select(VisionVictoire).where(VisionVictoire.user_id == uid).order_by(VisionVictoire.date.desc()).limit(3))).scalars())
    taches = [t for t in (await db.execute(select(VisionTache).where(VisionTache.user_id == uid))).scalars() if t.statut != "fait"]

    lignes = []
    if profil:
        lignes.append(f"Prénom : {profil.prenom or 'inconnu'}")
        if profil.texte_vision:
            lignes.append(f"Vision à 3 ans : {profil.texte_vision}")
        if profil.pourquoi:
            lignes.append(f"Son pourquoi : {profil.pourquoi}")
        if profil.valeurs:
            lignes.append(f"Valeurs : {', '.join(profil.valeurs)}")
        cm = getattr(profil, "contexte_metier", None) or {}
        if cm.get("activite_type") or cm.get("cible"):
            ligne = f"Activité : {cm.get('activite_type') or '—'} pour {cm.get('cible') or '—'}"
            if cm.get("offre"):
                ligne += f" — offre : {cm['offre']}"
            lignes.append(ligne)
    if objectifs:
        lignes.append("Objectifs actifs : " + " | ".join(f"{o.titre} ({o.progression}%)" for o in objectifs))
    if checkins:
        c = checkins[0]
        lignes.append(f"Dernier check-in ({c.date}) : énergie {c.energie}/5, stress {c.stress}/5, charge {c.charge}/5")
    else:
        lignes.append("Aucun check-in enregistré.")
    if victoires:
        lignes.append("3 dernières victoires : " + " | ".join(v.texte for v in victoires))
    if taches:
        lignes.append("Tâches en cours : " + " | ".join(f"{t.titre} ({t.duree_min} min)" for t in taches[:6]))
    return "\n".join(lignes) or "Profil non renseigné."


def _client_llm(session_id: str, systeme: str):
    """Client IA texte : Mammouth AI (clé MAMMOTH_API_KEY). None si la clé manque."""
    from llm_mammouth import MammouthChat, cle_mammouth
    cle = cle_mammouth()
    if not cle:
        return None
    return MammouthChat(api_key=cle, system_message=systeme)


def _repli(message: str) -> str:
    bas = message.lower()
    if any(m in bas for m in ("à plat", "a plat", "fatigu", "epuis", "épuis")):
        return ("Aujourd'hui, une seule chose : une micro-action de 5 minutes, celle qui te coûte le moins. "
                "Le reste attendra sans conséquence. Relis ton pourquoi et tes dernières victoires — elles sont réelles.\n\n"
                "(Le Copilote IA est momentanément indisponible, réponse locale.)")
    return ("Je n'ai pas pu joindre le modèle à l'instant. En attendant : prends la tâche liée à ton objectif "
            "principal avec le meilleur rapport impact/effort, et donne-lui 25 minutes.\n\n(Réponse locale de repli.)")


# ─────────────────────────── Routes ───────────────────────────

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Zayado API (SQL)"}


# ─────────────── Authentification multi-compte (ajouté) ───────────────
# Reste optionnel : sans compte créé, l'app continue de fonctionner en
# mode démo (DEMO_USER_ID). Un compte réel donne un espace de données
# personnel, vide au départ (pas de fausses données "Camille").

class AuthIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=200)


@api.post("/auth/register")
async def register(body: AuthIn, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    existe = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existe:
        raise HTTPException(409, "Un compte existe déjà avec cet email.")
    # Toujours "client" à l'inscription — jamais admin/vendeur en self-service,
    # même si le champ existait dans le corps de la requête (ignoré volontairement).
    user = User(email=email, password_hash=_hash_mdp(body.password), role="client")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Activation du parrainage : si quelqu'un avait déjà invité cet email,
    # le filleul devient actif et le parrain reçoit son bonus maintenant —
    # pas besoin d'action manuelle admin pour le cas normal.
    invitation = (await db.execute(select(Referral).where(Referral.referred_email == email, Referral.statut == "en_attente"))).scalar_one_or_none()
    if invitation:
        invitation.statut = "actif"
        invitation.referred_id = user.id
        parrain = (await db.execute(select(User).where(User.id == invitation.referrer_id))).scalar_one_or_none()
        if parrain:
            parrain.credits = (parrain.credits or 0) + invitation.bonus_credits
        await db.commit()
    return {"access_token": _creer_token(user.id, user.role), "email": user.email, "role": user.role}


_TENTATIVES_LOGIN: dict = {}  # email -> [timestamps des échecs récents]
_LIMITE_LOGIN_MAX = 5
_LIMITE_LOGIN_FENETRE_S = 15 * 60


def _verifier_limite_login(email: str):
    maintenant = datetime.now(timezone.utc).timestamp()
    echecs = [t for t in _TENTATIVES_LOGIN.get(email, []) if maintenant - t < _LIMITE_LOGIN_FENETRE_S]
    _TENTATIVES_LOGIN[email] = echecs
    if len(echecs) >= _LIMITE_LOGIN_MAX:
        raise HTTPException(429, "Trop de tentatives — réessaie dans quelques minutes.")


def _enregistrer_echec_login(email: str):
    _TENTATIVES_LOGIN.setdefault(email, []).append(datetime.now(timezone.utc).timestamp())


def _reinitialiser_limite_login(email: str):
    _TENTATIVES_LOGIN.pop(email, None)


@api.post("/auth/login")
async def login(body: AuthIn, db: AsyncSession = Depends(get_db)):
    # Corrigé : aucune protection anti-brute-force n'existait — un
    # attaquant pouvait essayer des mots de passe sans limite sur
    # n'importe quel compte. Limiteur simple en mémoire : 5 essais
    # par email sur 15 minutes glissantes.
    email = body.email.strip().lower()
    _verifier_limite_login(email)
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user or not _verifier_mdp(body.password, user.password_hash):
        _enregistrer_echec_login(email)
        raise HTTPException(401, "Email ou mot de passe incorrect.")
    _reinitialiser_limite_login(email)
    return {"access_token": _creer_token(user.id, user.role), "email": user.email, "role": user.role}


@api.get("/auth/me")
async def me(db: AsyncSession = Depends(get_db)):
    uid = _uid()
    if uid == DEMO_USER_ID:
        return {"mode": "demo", "email": None, "role": "client"}
    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not user:
        raise HTTPException(401, "Session invalide.")
    return {"mode": "compte", "email": user.email, "role": user.role}


def exiger_role(*roles_autorises: str):
    """Dépendance FastAPI façon WordPress : protège une route selon le rôle
    du token JWT courant. Usage : Depends(exiger_role("admin")) ou
    Depends(exiger_role("admin", "vendeur")) pour autoriser les deux.
    Le rôle vient du token (déjà vérifié par _AuthMiddleware) — jamais
    d'un paramètre de requête, pour ne pas pouvoir se l'auto-attribuer."""
    def _dependance():
        role = _role_courant()
        if role not in roles_autorises:
            raise HTTPException(403, f"Accès réservé aux rôles : {', '.join(roles_autorises)}.")
        return role
    return _dependance


@api.get("/admin/utilisateurs")
async def lister_utilisateurs(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    rows = list((await db.execute(select(User).order_by(User.created_at.desc()))).scalars())
    plans = {p.user_id: p.plan for p in (await db.execute(select(VisionProfile))).scalars()}
    return {"items": [{"id": u.id, "email": u.email, "role": u.role, "plan": plans.get(u.id, "essentielle"),
                       "inscrit_le": u.created_at.isoformat()} for u in rows]}


class AdminPlanIn(BaseModel):
    plan: str
    jours: int = 31          # durée d'accès accordée
    fondateur: bool = False  # garantit le tarif fondateur aux renouvellements


@api.patch("/admin/utilisateurs/{user_id}/plan")
async def admin_changer_plan(user_id: str, body: AdminPlanIn, db: AsyncSession = Depends(get_db),
                             _role=Depends(exiger_role("admin"))):
    """Change l'offre d'un client à la main (paiement par virement, geste commercial…)."""
    if body.plan not in PRICING:
        raise HTTPException(422, "Offre inconnue.")
    if not await db.get(User, user_id):
        raise HTTPException(404, "Utilisateur introuvable.")
    profil = await _profil(db, user_id)
    profil.plan = body.plan
    Abo = globals()["Abonnement"]
    a = await db.get(Abo, user_id)
    if not a:
        a = Abo(user_id=user_id)
        db.add(a)
    from datetime import timedelta
    a.plan = body.plan
    a.fin = None if body.plan == "essentielle" else datetime.now(timezone.utc) + timedelta(days=max(1, min(body.jours, 3660)))
    a.fondateur = bool(a.fondateur or body.fondateur)
    await db.commit()
    return {"ok": True, "plan": profil.plan, "fin": a.fin.isoformat() if a.fin else None, "fondateur": a.fondateur}


@api.get("/admin/vue-ensemble")
async def admin_vue_ensemble(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    par_role = {}
    for r in ("client", "vendeur", "admin"):
        c = (await db.execute(select(func.count()).select_from(User).where(User.role == r))).scalar_one()
        par_role[r] = c
    return {"utilisateurs_total": total, "par_role": par_role}


# Catalogue des notifications de l'app (inspiré de Zayado v13, restreint aux
# types réellement pertinents pour Zayado). L'admin voit ici qui reçoit quoi.
NOTIF_CATALOGUE = [
    {"cle": "rappel_checkin", "label": "Rappel check-in du matin", "desc": "Point énergie quotidien à l'heure choisie"},
    {"cle": "actualite", "label": "Veille du jour", "desc": "Notification quand la veille RSS est prête"},
    {"cle": "decision_en_attente", "label": "Décision en attente", "desc": "Le Copilote attend un feu vert"},
    {"cle": "swot_mensuel", "label": "Analyse SWOT mensuelle", "desc": "Rapport SWOT régénéré par l'IA chaque mois"},
    {"cle": "revue_hebdo", "label": "Revue hebdo du vendredi", "desc": "Invitation à boucler la semaine"},
    {"cle": "credits_faibles", "label": "Crédits presque épuisés", "desc": "Alerte quand le solde de crédits passe sous le seuil"},
]


@api.get("/admin/notifications")
async def admin_notifications(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    """Vue admin des paramètres de notification de chaque compte."""
    profils = list((await db.execute(select(VisionProfile))).scalars())
    users = {u.id: u for u in (await db.execute(select(User))).scalars()}
    items = []
    for p in profils:
        u = users.get(p.user_id)
        items.append({
            "email": u.email if u else p.user_id,
            "prenom": p.prenom or "",
            "notifications": bool(p.notifications),
            "heure_checkin": p.heure_checkin,
            "fuseau": p.fuseau,
            "marche": (p.contexte_metier or {}).get("marche", "france"),
        })
    return {"catalogue": NOTIF_CATALOGUE, "comptes": items}


@api.patch("/admin/utilisateurs/{user_id}/role")
async def changer_role(user_id: str, nouveau_role: str, db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    """Seul un admin peut promouvoir/rétrograder un compte — jamais l'utilisateur
    lui-même. C'est le seul chemin légitime pour créer un vendeur ou un admin."""
    if nouveau_role not in ("client", "vendeur", "admin"):
        raise HTTPException(422, "Rôle invalide — client, vendeur ou admin.")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable.")
    user.role = nouveau_role
    await db.commit()
    return {"id": user.id, "email": user.email, "role": user.role}


@api.post("/parrainage/inviter")
async def parrainage_inviter(body: dict, db: AsyncSession = Depends(get_db)):
    email = (body.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(422, "Email invalide.")
    uid = _uid()
    if uid == DEMO_USER_ID:
        raise HTTPException(403, "Connecte-toi pour parrainer quelqu'un.")
    existe = (await db.execute(select(Referral).where(Referral.referrer_id == uid, Referral.referred_email == email))).scalar_one_or_none()
    if existe:
        raise HTTPException(409, "Cette personne est déjà dans tes filleuls.")
    r = Referral(referrer_id=uid, referred_email=email, bonus_credits=50)
    db.add(r)
    await db.commit()
    return {"ok": True, "email": email, "statut": "en_attente"}


@api.get("/parrainage/mes-filleuls")
async def parrainage_mes_filleuls(db: AsyncSession = Depends(get_db)):
    uid = _uid()
    rows = list((await db.execute(select(Referral).where(Referral.referrer_id == uid).order_by(Referral.created_at.desc()))).scalars())
    return {"items": [{"email": r.referred_email, "statut": r.statut, "bonus_credits": r.bonus_credits, "depuis": r.created_at.isoformat()} for r in rows]}


@api.get("/admin/parrainage")
async def admin_parrainage(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    rows = list((await db.execute(select(Referral).order_by(Referral.created_at.desc()))).scalars())
    total_actifs = sum(1 for r in rows if r.statut == "actif")
    return {
        "total": len(rows), "actifs": total_actifs,
        "items": [{"id": r.id, "parrain_id": r.referrer_id, "email_filleul": r.referred_email, "statut": r.statut, "bonus_credits": r.bonus_credits, "depuis": r.created_at.isoformat()} for r in rows],
    }


@api.post("/admin/codes-promo")
async def creer_code_promo(body: dict, db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    code = (body.get("code") or "").strip().upper()
    valeur = int(body.get("value") or 0)
    if not code or valeur <= 0:
        raise HTTPException(422, "Code et valeur (> 0) obligatoires.")
    existe = (await db.execute(select(PromoCode).where(PromoCode.code == code))).scalar_one_or_none()
    if existe:
        raise HTTPException(409, "Ce code existe déjà.")
    p = PromoCode(code=code, type=body.get("type") or "credits", value=valeur, max_uses=int(body.get("max_uses") or 100))
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"id": p.id, "code": p.code, "value": p.value, "max_uses": p.max_uses, "current_uses": 0, "active": True}


@api.get("/admin/codes-promo")
async def lister_codes_promo(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    rows = list((await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))).scalars())
    return {"items": [{"id": p.id, "code": p.code, "type": p.type, "value": p.value, "max_uses": p.max_uses, "current_uses": p.current_uses, "active": p.active} for p in rows]}


@api.put("/admin/codes-promo/{promo_id}")
async def basculer_code_promo(promo_id: str, body: dict, db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    p = (await db.execute(select(PromoCode).where(PromoCode.id == promo_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Code introuvable.")
    p.active = bool(body.get("active", False))
    await db.commit()
    return {"id": p.id, "active": p.active}


@api.delete("/admin/codes-promo/{promo_id}")
async def supprimer_code_promo(promo_id: str, db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    await db.execute(sa_delete(PromoCode).where(PromoCode.id == promo_id))
    await db.commit()
    return {"ok": True}


@api.post("/codes-promo/appliquer")
async def appliquer_code_promo(body: dict, db: AsyncSession = Depends(get_db)):
    """Côté utilisateur : saisir un code, recevoir les crédits si valide."""
    uid = _uid()
    if uid == DEMO_USER_ID:
        raise HTTPException(403, "Connecte-toi pour utiliser un code promo.")
    code = (body.get("code") or "").strip().upper()
    p = (await db.execute(select(PromoCode).where(PromoCode.code == code))).scalar_one_or_none()
    if not p or not p.active:
        raise HTTPException(404, "Code invalide ou inactif.")
    if p.current_uses >= p.max_uses:
        raise HTTPException(410, "Ce code a atteint son nombre maximal d'utilisations.")
    if p.expires_at and p.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "Ce code a expiré.")
    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    user.credits = (user.credits or 0) + p.value
    p.current_uses += 1
    await db.commit()
    return {"ok": True, "credits_ajoutes": p.value, "credits_total": user.credits}







async def _profil(db: AsyncSession, uid: Optional[str] = None) -> VisionProfile:
    uid = uid if uid is not None else _uid()
    row = (await db.execute(select(VisionProfile).where(VisionProfile.user_id == uid))).scalar_one_or_none()
    if not row:
        # Nouveau compte : profil vierge (jamais de prénom fictif injecté)
        row = VisionProfile(user_id=uid, prenom="")
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@api.get("/state")
async def get_state(db: AsyncSession = Depends(get_db)):
    uid = _uid()
    profil = await _profil(db, uid)
    objectifs = list((await db.execute(select(VisionObjectif).where(VisionObjectif.user_id == uid).order_by(VisionObjectif.created_at))).scalars())
    taches = list((await db.execute(select(VisionTache).where(VisionTache.user_id == uid).order_by(VisionTache.created_at))).scalars())
    victoires = list((await db.execute(select(VisionVictoire).where(VisionVictoire.user_id == uid).order_by(VisionVictoire.date.desc()))).scalars())
    checkins = list((await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid).order_by(VisionCheckin.date))).scalars())
    balance = (await db.execute(select(VisionBalance).where(VisionBalance.user_id == uid))).scalar_one_or_none()
    dernier = checkins[-1] if checkins else None
    energie = dernier.energie if dernier else 4
    obj_principal = next((o for o in objectifs if o.statut != "termine"), None)
    victoire = victoires[0] if victoires else None

    verif = globals().get("_verifier_expiration")
    if verif:
        await verif(db, uid, profil)
    return {
        "onboarded": bool(profil.onboarded),
        "profile": {"prenom": profil.prenom or "", "heure_checkin": profil.heure_checkin, "plan": profil.plan, "notifications": bool(profil.notifications), "fuseau": profil.fuseau, "email": profil.email or ""},
        "vision": {"texte": profil.texte_vision or "", "pourquoi": profil.pourquoi or "", "valeurs": profil.valeurs or [], "contexte_metier": getattr(profil, "contexte_metier", None) or {}},
        "energy": {"score": energie, "mood": (dernier.mood if dernier else "aligné"), "mode": mode_energie(energie), "recuperation": est_recup(energie), "a_checkin": dernier is not None},
        "balance": {"pro": balance.pro if balance else 60, "perso": balance.perso if balance else 40},
        "priorities": [
            {"id": t.id, "title": t.titre, "duration": t.duree_min, "progress": t.progression, "icon": t.icon, "done": t.statut == "fait"}
            for t in taches
        ],
        "goal": (
            {"title": obj_principal.titre, "percent": obj_principal.progression, "echeance": obj_principal.echeance}
            if obj_principal else None
        ),
        "victory": ({"title": victoire.texte, "detail": victoire.detail or "", "date": victoire.date} if victoire else None),
        "trend": [{"day": c.date[-2:], "value": c.energie} for c in checkins[-14:]],
        "banner": MESSAGES[mode_energie(energie)],
    }


class ProfilIn(BaseModel):
    prenom: Optional[str] = None
    texte_vision: Optional[str] = None
    pourquoi: Optional[str] = None
    valeurs: Optional[List[str]] = None
    heure_checkin: Optional[str] = None
    plan: Optional[str] = None
    notifications: Optional[bool] = None
    fuseau: Optional[str] = None
    email: Optional[str] = None
    objectifs: Optional[List[str]] = None
    onboarded: Optional[bool] = None
    contexte_metier: Optional[dict] = None


@api.put("/profile")
async def maj_profil(body: ProfilIn, db: AsyncSession = Depends(get_db)):
    uid = _uid()
    profil = await _profil(db, uid)
    data = body.model_dump(exclude_unset=True)
    # « plan » n'est plus modifiable ici : seul un paiement validé (webhook Mollie)
    # ou un admin change l'offre. Avant, n'importe qui pouvait se mettre en Pro.
    for champ in ("prenom", "texte_vision", "pourquoi", "valeurs", "heure_checkin", "notifications", "fuseau", "email", "onboarded"):
        if champ in data and data[champ] is not None:
            setattr(profil, champ, data[champ])
    if data.get("contexte_metier"):
        # Corrigé : remplaçait tout contexte_metier au lieu de le compléter —
        # un simple changement de pays depuis Paramètres aurait effacé
        # l'entreprise/rôle/activité saisis à l'onboarding. Fusion à la place.
        nouveau = {k: v for k, v in data["contexte_metier"].items() if isinstance(v, str)}
        profil.contexte_metier = {**(profil.contexte_metier or {}), **nouveau}
    # Objectifs 90 jours saisis à l'onboarding
    if data.get("objectifs"):
        for o in (await db.execute(select(VisionObjectif).where(VisionObjectif.user_id == uid))).scalars():
            await db.delete(o)
        for titre in [t for t in data["objectifs"] if t and t.strip()][:3]:
            db.add(VisionObjectif(user_id=uid, titre=titre.strip(), echeance=iso_moins(-90), progression=0))
    await db.commit()
    await db.refresh(profil)
    return {"ok": True, "onboarded": bool(profil.onboarded), "plan": profil.plan}


class CheckinIn(BaseModel):
    energie: int = Field(ge=1, le=5)
    charge: int = Field(default=3, ge=1, le=5)
    mood: Optional[str] = None


@api.post("/checkins")
async def enregistrer_checkin(body: CheckinIn, db: AsyncSession = Depends(get_db)):
    uid = _uid()
    jour = today_iso()
    existant = (await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid, VisionCheckin.date == jour))).scalar_one_or_none()
    if existant:
        existant.energie, existant.charge, existant.mood = body.energie, body.charge, body.mood
    else:
        db.add(VisionCheckin(user_id=uid, date=jour, energie=body.energie, stress=max(1, 6 - body.energie), sommeil=3, charge=body.charge, mood=body.mood))
    await db.commit()
    return {"ok": True, "mode": mode_energie(body.energie), "recuperation": est_recup(body.energie)}


# ─────────────── Chat streaming (SSE, JSON deltas) ───────────────

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    page: Optional[str] = None


@api.post("/copilote/chat")
async def chat(body: ChatIn, db: AsyncSession = Depends(get_db)):
    uid = _uid()
    contexte = await _contexte(db, uid)
    systeme = f"{SYSTEM_PROMPT}\n\n--- Contexte de l'utilisatrice ---\n{contexte}"
    db.add(VisionChatMessage(user_id=uid, role="user", contenu=body.message))
    await db.commit()

    async def flux():
        morceaux = []
        try:
            client = _client_llm(f"copilote-{uid}", systeme)
            if client is None:
                raise RuntimeError("MAMMOTH_API_KEY absente")
            from llm_mammouth import StreamDone, TextDelta, UserMessage
            async for ev in client.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    morceaux.append(ev.content)
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:  # noqa: BLE001
            logger.warning("Copilote IA indisponible (%s) — repli local", e)
            texte = _repli(body.message)
            morceaux = [texte]
            yield f"data: {json.dumps({'delta': texte})}\n\n"

        complet = "".join(morceaux).strip()
        if complet:
            try:
                async with async_session() as s:
                    s.add(VisionChatMessage(user_id=uid, role="assistant", contenu=complet))
                    await s.commit()
            except Exception as e:  # noqa: BLE001
                logger.warning("Historique chat non enregistré : %s", e)
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(flux(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/copilote/history")
async def chat_history(db: AsyncSession = Depends(get_db)):
    msgs = list((await db.execute(select(VisionChatMessage).where(VisionChatMessage.user_id == _uid()).order_by(VisionChatMessage.created_at).limit(100))).scalars())
    return [{"role": m.role, "contenu": m.contenu} for m in msgs]


# ─────────────── Point du jour ───────────────

@api.get("/copilote/point-du-jour")
async def point_du_jour(db: AsyncSession = Depends(get_db)):
    uid = _uid()
    contexte = await _contexte(db, uid)
    consigne = (
        "Rédige le point du jour en 4 lignes maximum, sans titre ni puce : "
        "1) l'état d'énergie et ce qu'il implique, 2) la priorité la plus utile aujourd'hui et "
        "pourquoi elle sert un objectif, 3) une micro-action de repli si la journée déraille, "
        "4) un rappel d'une victoire récente. Sois factuelle, pas de slogan."
    )
    try:
        client = _client_llm(f"point-{uid}-{datetime.now(timezone.utc):%Y%m%d}", f"{SYSTEM_PROMPT}\n\n--- Contexte ---\n{contexte}")
        if client is None:
            raise RuntimeError("MAMMOTH_API_KEY absente")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=consigne)), timeout=45)
        return {"texte": str(texte).strip(), "source": "ia"}
    except Exception as e:  # noqa: BLE001
        logger.warning("Point du jour : repli local (%s)", e)
        return {"texte": _repli("que faire maintenant"), "source": "repli"}


# ─────────────── Décisions ───────────────

class DecisionIn(BaseModel):
    titre: str = Field(min_length=1, max_length=300)
    note: Optional[str] = None

class StatutIn(BaseModel):
    statut: str
    canal: Optional[str] = None


def _decision_json(d: CopiloteDecision) -> dict:
    return {"id": d.id, "titre": d.titre, "note": d.note, "statut": d.statut, "canal": d.canal,
            "origine": d.origine, "created_at": d.created_at.isoformat() if d.created_at else None,
            "decided_at": d.decided_at.isoformat() if d.decided_at else None}


@api.get("/copilote/decisions")
async def lister_decisions(db: AsyncSession = Depends(get_db)):
    lignes = (await db.execute(select(CopiloteDecision).where(CopiloteDecision.user_id == _uid()).order_by(CopiloteDecision.created_at.desc()))).scalars()
    return {"decisions": [_decision_json(d) for d in lignes]}


@api.patch("/copilote/decisions/{decision_id}")
async def decider(decision_id: str, body: StatutIn, db: AsyncSession = Depends(get_db)):
    if body.statut not in ("proposee", "approuvee", "reportee", "refusee"):
        raise HTTPException(status_code=400, detail="Statut inconnu.")
    d = (await db.execute(select(CopiloteDecision).where(CopiloteDecision.id == decision_id, CopiloteDecision.user_id == _uid()))).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Décision introuvable.")
    d.statut = body.statut
    d.canal = body.canal or "in-app"
    d.decided_at = datetime.now(timezone.utc) if body.statut != "proposee" else None
    await db.commit()
    await db.refresh(d)
    return _decision_json(d)


@api.post("/copilote/decisions/suggerer")
async def suggerer_decisions(db: AsyncSession = Depends(get_db)):
    """Le Copilote propose des décisions à valider (rien n'est exécuté)."""
    uid = _uid()
    taches = [t for t in (await db.execute(select(VisionTache).where(VisionTache.user_id == uid))).scalars() if t.statut != "fait"]
    existantes = {d.titre for d in (await db.execute(select(CopiloteDecision).where(CopiloteDecision.user_id == uid, CopiloteDecision.statut != "refusee"))).scalars()}
    modeles = [
        (f"Bloquer 90 min demain matin pour « {taches[0].titre} »" if taches else "Bloquer 90 min demain matin pour ta priorité",
         "Créneau protégé, notifications coupées. Tu valides ?"),
        ("Envoyer un message de relance à ton prospect clé",
         "L'IA a préparé un brouillon bienveillant. Tu approuves l'envoi ?"),
        ("Prendre une vraie pause déjeuner sans écran",
         "30 minutes pour recharger. Simple à décider, précieux pour l'énergie."),
    ]
    crees = []
    for titre, note in modeles:
        if titre in existantes:
            continue
        d = CopiloteDecision(user_id=uid, titre=titre, note=note, origine="copilote")
        db.add(d)
        crees.append(d)
    await db.commit()
    for d in crees:
        await db.refresh(d)
    return {"crees": [_decision_json(d) for d in crees]}


# ─────────────── Actualité (digest piloté par l'énergie) ───────────────

_ECO_FR = "https://www.lemonde.fr/economie/rss_full.xml"
_ECO_AFRIQUE = "https://www.lemonde.fr/afrique-economie/rss_full.xml"
MARCHES = {
    "france": {"label": "France", "pays": "https://www.lemonde.fr/economie-francaise/rss_full.xml", "eco": _ECO_FR},
    "senegal": {"label": "Sénégal", "pays": "https://www.lemonde.fr/senegal/rss_full.xml", "eco": _ECO_AFRIQUE},
    "cote_ivoire": {"label": "Côte d'Ivoire", "pays": "https://www.lemonde.fr/cote-d-ivoire/rss_full.xml", "eco": _ECO_AFRIQUE},
    "cameroun": {"label": "Cameroun", "pays": "https://www.lemonde.fr/cameroun/rss_full.xml", "eco": _ECO_AFRIQUE},
    "maroc": {"label": "Maroc", "pays": "https://www.lemonde.fr/maroc/rss_full.xml", "eco": _ECO_AFRIQUE},
    "belgique": {"label": "Belgique", "pays": "https://www.lemonde.fr/belgique/rss_full.xml", "eco": _ECO_FR},
}
_cache_actu: dict = {}


def _lire_flux(url: str) -> list:
    import feedparser
    flux = feedparser.parse(url)
    out = []
    for e in getattr(flux, "entries", [])[:12]:
        out.append({
            "titre": getattr(e, "title", "").strip(),
            "lien": getattr(e, "link", ""),
            "resume": (getattr(e, "summary", "") or "")[:220],
            "date": getattr(e, "published", "") or getattr(e, "updated", ""),
        })
    return out


@api.get("/copilote/actualite")
async def actualite(marche: str = "", db: AsyncSession = Depends(get_db)):
    """Veille du jour (RSS Le Monde), PILOTÉE PAR L'ÉNERGIE : 3 à 5 items, masquée en récupération.
    Sans paramètre `marche`, on utilise celui du profil (réglé à l'onboarding / Paramètres)."""
    uid = _uid()
    dernier = list((await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid).order_by(VisionCheckin.date.desc()).limit(1))).scalars())
    energie = dernier[0].energie if dernier else 4
    marches = [{"cle": k, "label": v["label"]} for k, v in MARCHES.items()]

    if est_recup(energie):
        return {"masque": True, "raison": "Mode récupération : l'actualité est en pause pour préserver ton énergie. Elle reviendra quand tu iras mieux.",
                "marche": marche, "marches": marches, "articles": []}

    if not marche:
        profil = await _profil(db, uid)
        marche = (profil.contexte_metier or {}).get("marche", "france")

    limite = 5 if energie >= 4 else 3
    cle = marche if marche in MARCHES else "france"
    entree = _cache_actu.get(cle)
    now = datetime.now(timezone.utc)
    if entree and (now - entree["a"]) < timedelta(minutes=30):
        data = dict(entree["d"])
    else:
        m = MARCHES[cle]
        urls = [m["pays"]] + ([m["eco"]] if m["eco"] != m["pays"] else [])
        try:
            listes = await asyncio.gather(*[asyncio.to_thread(_lire_flux, u) for u in urls])
        except Exception as e:  # noqa: BLE001
            logger.warning("Actualité indisponible : %s", e)
            return {"masque": False, "erreur": True, "marche": cle, "marches": marches, "articles": []}
        vus, articles = set(), []
        for liste in listes:
            for a in liste:
                if a["titre"] and a["lien"] not in vus:
                    vus.add(a["lien"])
                    articles.append(a)
        data = {"marche": cle, "label": MARCHES[cle]["label"], "articles": articles, "genere_a": now.isoformat()}
        _cache_actu[cle] = {"a": now, "d": data}

    return {"masque": False, "marche": data["marche"], "label": data.get("label"),
            "marches": marches, "articles": data["articles"][:limite], "limite": limite,
            "genere_a": data.get("genere_a"),
            "prochaine_maj": (entree["a"] + timedelta(minutes=30)).isoformat() if entree else None}


# ─────────────── Connexion (lien magique + accès aperçu) ───────────────

def _en_prod(request) -> bool:
    hote = (request.headers.get("host", "") if request else "").lower()
    hotes = [h.strip().lower() for h in os.environ.get("PRODUCTION_HOSTS", "").split(",") if h.strip()]
    return any(hote == h or hote.endswith("." + h) for h in hotes)


@api.get("/connexion/options")
async def connexion_options(request: Request = None):
    return {"nom_appli": "Zayado",
            "apercu_actif": bool(os.environ.get("APERCU_CODE")) and not _en_prod(request),
            "google": bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET")),
            "microsoft": bool(os.environ.get("MICROSOFT_CLIENT_ID") and os.environ.get("MICROSOFT_CLIENT_SECRET"))}


class DemoIn(BaseModel):
    email: Optional[str] = None
    prenom: Optional[str] = None


@api.post("/connexion/demo")
async def connexion_demo(request: Request, body: DemoIn = None, db: AsyncSession = Depends(get_db)):
    """Ouvre le compte de démonstration (Thomas) — preview uniquement. Mono-utilisateur SQL."""
    # Refusé en production : ce point d'entrée ne doit jamais ouvrir de session
    # sur app.zayado.net (il servait de fausse connexion Google/Microsoft/SSO).
    if _en_prod(request) or not os.environ.get("APERCU_CODE"):
        raise HTTPException(status_code=403, detail="Compte démo désactivé.")
    profil = await _profil(db, _uid())
    if body and body.email:
        profil.email = body.email.strip()
    if body and body.prenom:
        profil.prenom = body.prenom.strip()
    elif not profil.prenom:
        profil.prenom = "Thomas"
    await db.commit()
    return {"ok": True, "user": {"prenom": profil.prenom, "email": profil.email or "", "onboarded": bool(profil.onboarded)}}


@api.get("/connexion/oauth/{provider}/start")
async def connexion_oauth_start(provider: str, redirect_uri: Optional[str] = None, purpose: Optional[str] = None,
                                request: Request = None):
    """Démarre l'OAuth si les clés sont configurées ; sinon renvoie configured=false (repli démo côté front)."""
    provider = provider.lower()
    if provider not in ("google", "microsoft"):
        raise HTTPException(status_code=404, detail="Fournisseur inconnu.")
    cid = os.environ.get(f"{provider.upper()}_CLIENT_ID")
    csecret = os.environ.get(f"{provider.upper()}_CLIENT_SECRET")
    if not (cid and csecret):
        return {"configured": False}
    # Clés présentes : construction de l'URL d'autorisation (flux code).
    storage = purpose == "storage"
    # Stockage (Drive/OneDrive) : retour sur le backend, qui garde les jetons.
    ru = _oauth_callback_url(provider, request) if (storage or not redirect_uri) else redirect_uri
    if provider == "google":
        params = {"client_id": cid, "redirect_uri": ru, "response_type": "code",
                  "scope": "openid email profile" + (" https://www.googleapis.com/auth/drive.file" if storage else ""),
                  "state": f"storage|google|{uuid.uuid4().hex}" if storage else f"google_{uuid.uuid4().hex}",
                  "access_type": "offline" if storage else "online"}
        if storage:
            params["prompt"] = "consent"
        base = "https://accounts.google.com/o/oauth2/v2/auth"
    else:
        tenant = os.environ.get("MICROSOFT_TENANT", "common")
        params = {"client_id": cid, "redirect_uri": ru, "response_type": "code",
                  "scope": "openid profile email" + (" User.Read Files.ReadWrite offline_access" if storage else ""),
                  "state": f"storage|microsoft|{uuid.uuid4().hex}" if storage else f"microsoft_{uuid.uuid4().hex}"}
        base = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
    from urllib.parse import urlencode
    return {"configured": True, "authorization_url": f"{base}?{urlencode(params)}"}


def _oauth_callback_url(provider: str, request: Request = None) -> str:
    """URL de retour OAuth côté backend. BACKEND_PUBLIC_URL si défini, sinon
    déduite de la requête (Host transmis par nginx) — en https hors localhost,
    car Railway termine le TLS avant nginx (qui verrait sinon « http »)."""
    base = os.environ.get("BACKEND_PUBLIC_URL", "").rstrip("/")
    if not base and request is not None:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
        proto = "http" if host.startswith(("localhost", "127.0.0.1")) else "https"
        base = f"{proto}://{host}" if host else ""
    return f"{base}/api/connexion/oauth/{provider}/callback"


def _frontend_url() -> str:
    return (os.environ.get("FRONTEND_PUBLIC_URL") or os.environ.get("PUBLIC_FRONTEND_URL") or "").rstrip("/")


async def _oauth_echange(provider: str, code: str, redirect_uri: str):
    """Échange le code contre un jeton et récupère l'e-mail. Renvoie (email, token_data, access_token).
    redirect_uri doit être EXACTEMENT celle utilisée pour l'autorisation."""
    cid = os.environ.get(f"{provider.upper()}_CLIENT_ID")
    csecret = os.environ.get(f"{provider.upper()}_CLIENT_SECRET")
    if not (cid and csecret):
        raise HTTPException(503, "OAuth non configuré.")
    async with httpx.AsyncClient(timeout=10) as client:
        if provider == "google":
            tok = await client.post("https://oauth2.googleapis.com/token", data={
                "code": code, "client_id": cid, "client_secret": csecret,
                "redirect_uri": redirect_uri, "grant_type": "authorization_code",
            })
            if tok.status_code >= 400:
                logger.warning("OAuth google token %s : %s", tok.status_code, tok.text[:300])
            tok.raise_for_status()
            token_data = tok.json()
            access_token = token_data["access_token"]
            info = await client.get("https://www.googleapis.com/oauth2/v2/userinfo",
                                     headers={"Authorization": f"Bearer {access_token}"})
            info.raise_for_status()
            email = info.json().get("email")
        else:
            tenant = os.environ.get("MICROSOFT_TENANT", "common")
            tok = await client.post(f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", data={
                "code": code, "client_id": cid, "client_secret": csecret,
                "redirect_uri": redirect_uri, "grant_type": "authorization_code",
            })
            if tok.status_code >= 400:
                logger.warning("OAuth microsoft token %s : %s", tok.status_code, tok.text[:300])
            tok.raise_for_status()
            token_data = tok.json()
            access_token = token_data["access_token"]
            info = await client.get("https://graph.microsoft.com/v1.0/me",
                                     headers={"Authorization": f"Bearer {access_token}"})
            info.raise_for_status()
            data = info.json()
            email = data.get("mail") or data.get("userPrincipalName")
    return email, token_data, access_token


@api.get("/connexion/oauth/{provider}/callback")
async def connexion_oauth_callback(provider: str, code: Optional[str] = None, state: Optional[str] = None,
                                    error: Optional[str] = None, request: Request = None,
                                    db: AsyncSession = Depends(get_db)):
    """Retour OAuth quand redirect_uri pointe sur le backend (connexion stockage
    Drive/OneDrive, ou connexion sans redirect_uri frontend). Termine l'échange puis
    redirige vers le frontend avec le token en fragment d'URL (jamais en query)."""
    provider = provider.lower()
    frontend = _frontend_url()
    if error or not code:
        return RedirectResponse(f"{frontend}/login?erreur=oauth_refuse")
    if not (os.environ.get(f"{provider.upper()}_CLIENT_ID") and os.environ.get(f"{provider.upper()}_CLIENT_SECRET")):
        return RedirectResponse(f"{frontend}/login?erreur=oauth_non_configure")
    storage = bool(state and state.startswith("storage|"))
    try:
        email, token_data, access_token = await _oauth_echange(provider, code, _oauth_callback_url(provider, request))
        if not email:
            return RedirectResponse(f"{frontend}/login?erreur=oauth_sans_email")
        user = await _trouver_ou_creer_compte(db, email)
        jwt_token = _creer_token(user.id, user.role)
        if storage:
            provider_key = f"{provider}_drive"
            conn = await _get_connection(db, provider_key, uid=user.id)
            if not conn:
                conn = UserConnection(user_id=user.id, provider=provider_key, label=("Google Drive" if provider == "google" else "OneDrive / SharePoint"))
                db.add(conn)
            conn.status = "ready"
            conn.credentials_enc = _chiffrer(json.dumps({
                "access_token": access_token,
                "refresh_token": token_data.get("refresh_token"),
                "expires_at": time.time() + int(token_data.get("expires_in", 3600)),
            }))
            await db.commit()
            return RedirectResponse(f"{frontend}/login?cloud_connected={provider}#access_token={jwt_token}")
        return RedirectResponse(f"{frontend}/login#access_token={jwt_token}")
    except Exception as e:  # noqa: BLE001 — jamais de 500 brut sur un retour de consentement utilisateur
        logger.warning("Échec callback OAuth %s : %s", provider, e)
        return RedirectResponse(f"{frontend}/login?erreur=oauth_echec")


class OAuthEchangeIn(BaseModel):
    code: str = Field(min_length=4, max_length=4000)
    redirect_uri: str = Field(min_length=8, max_length=500)
    state: Optional[str] = None


@api.post("/connexion/oauth/{provider}/echange")
async def connexion_oauth_echange(provider: str, body: OAuthEchangeIn, db: AsyncSession = Depends(get_db)):
    """Connexion Google/Microsoft quand le fournisseur renvoie sur la page /login
    du frontend (?code=…) : la page transmet le code ici, on l'échange et on
    renvoie le jeton de session. Avant, ce retour n'était traité nulle part :
    l'utilisateur revenait sur /login sans être connecté."""
    provider = provider.lower()
    if provider not in ("google", "microsoft"):
        raise HTTPException(404, "Fournisseur inconnu.")
    if body.state and body.state.startswith("storage|"):
        raise HTTPException(400, "Flux de stockage : utiliser le retour backend.")
    try:
        email, _, _ = await _oauth_echange(provider, body.code, body.redirect_uri)
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.warning("Échec échange OAuth %s : %s", provider, e)
        raise HTTPException(400, "Connexion refusée par le fournisseur. Réessaie.")
    if not email:
        raise HTTPException(400, "Aucun e-mail renvoyé par le fournisseur.")
    user = await _trouver_ou_creer_compte(db, email)
    return {"access_token": _creer_token(user.id, user.role)}


class LienIn(BaseModel):
    email: str
    origin: Optional[str] = None


@api.post("/connexion/lien")
async def connexion_lien(body: LienIn, request: Request = None, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Adresse email invalide.")
    jeton = uuid.uuid4().hex
    db.add(LoginToken(token=jeton, email=email, expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)))
    await db.commit()
    base = (body.origin or "").rstrip("/")
    lien = f"{base}/login?token={jeton}" if base.startswith("https://") else None
    envoye = False
    if lien and (EMAIL_KEY or os.environ.get("BREVO_API_KEY")):
        html = (
            '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#0B1F3A">'
            '<p>Bonjour,</p><p>Voici ton lien de connexion à Zayado. Il est valable 15 minutes et ne fonctionne qu\'une fois.</p>'
            f'<p style="margin:22px 0"><a href="{escape(lien, quote=True)}" style="background:#DEC2A3;color:#0B1F3A;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Me connecter</a></p>'
            '<p style="font-size:12px;color:#888">Tu n\'as pas demandé ce lien ? Ignore cet email. Zayado ne demande jamais de mot de passe par email.</p></td></tr></table>'
        )
        try:
            await send_email(to=email, subject="Ton lien de connexion Zayado", html=html)
            envoye = True
        except Exception as e:  # noqa: BLE001
            logger.warning("Lien magique non envoyé : %s", e)
    reponse = {"envoye": envoye}
    if not envoye and lien and not _en_prod(request):
        reponse["lien_direct"] = lien  # repli préproduction uniquement
    return reponse


class VerifierIn(BaseModel):
    token: str


async def _trouver_ou_creer_compte(db: AsyncSession, email: str) -> "User":
    """Un vrai compte par email — jamais deux utilisateurs sur le même
    identifiant. Mot de passe aléatoire inutilisable pour les comptes
    créés par lien magique / OAuth (pas de connexion par mot de passe
    possible pour ces comptes, uniquement par ces mêmes canaux)."""
    email = email.strip().lower()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user:
        return user
    user = User(email=email, password_hash=_hash_mdp(uuid.uuid4().hex))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _naive_utc(dt: datetime) -> datetime:
    """Neutralise l'écart SQLite/PostgreSQL sur DateTime(timezone=True) :
    SQLite (config par défaut de ce projet) renvoie ces colonnes SANS
    tzinfo après lecture, alors qu'elles sont écrites avec — comparer
    directement à un datetime aware lève TypeError (vérifié empiriquement).
    Normalise les deux côtés en UTC naïf, ce qui reste correct quel que
    soit le backend."""
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


@api.post("/connexion/verifier")
async def connexion_verifier(body: VerifierIn, db: AsyncSession = Depends(get_db)):
    """Consomme le jeton envoyé par email — usage unique, 15 minutes."""
    row = (await db.execute(select(LoginToken).where(LoginToken.token == body.token))).scalar_one_or_none()
    if not row or row.used or _naive_utc(row.expires_at) < _naive_utc(datetime.now(timezone.utc)):
        raise HTTPException(400, "Lien invalide ou expiré. Demande un nouveau lien.")
    row.used = True
    user = await _trouver_ou_creer_compte(db, row.email)
    await db.commit()
    return {"access_token": _creer_token(user.id, user.role), "email": user.email, "role": user.role}


@api.post("/connexion/apercu")
async def connexion_apercu(request: Request = None):
    if _en_prod(request) or not os.environ.get("APERCU_CODE"):
        raise HTTPException(status_code=403, detail="Aperçu indisponible.")
    return {"ok": True}


# ─────────────── Articles enregistrés + RGPD ───────────────

@api.patch("/taches/{tache_id}")
async def basculer_tache(tache_id: str, db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(VisionTache).where(VisionTache.id == tache_id, VisionTache.user_id == _uid()))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    t.statut = "a_faire" if t.statut == "fait" else "fait"
    t.progression = 100 if t.statut == "fait" else t.progression
    await db.commit()
    return {"id": t.id, "done": t.statut == "fait"}


class TacheIn(BaseModel):
    titre: str = Field(min_length=1, max_length=300)
    duree_min: int = Field(default=15, ge=1, le=480)
    objectif_id: Optional[str] = None  # « + Mission » depuis un objectif du Vision Board


class TacheStatutIn(BaseModel):
    statut: str = Field(pattern="^(a_faire|en_cours|fait)$")


@api.get("/taches")
async def lister_taches(db: AsyncSession = Depends(get_db)):
    """Liste toutes les tâches de l'utilisateur (page Actions / kanban)."""
    uid = _uid()
    rows = (await db.execute(
        select(VisionTache).where(VisionTache.user_id == uid).order_by(VisionTache.created_at.desc())
    )).scalars()
    return {"items": [
        {"id": t.id, "titre": t.titre, "statut": t.statut, "duree_min": t.duree_min,
         "micro": t.micro, "progression": t.progression, "objectif_id": t.objectif_id,
         "created_at": t.created_at.isoformat() if t.created_at else None}
        for t in rows
    ]}


@api.post("/taches")
async def creer_tache(body: TacheIn, db: AsyncSession = Depends(get_db)):
    objectif_id = None
    if body.objectif_id:
        # On ne relie qu'à un objectif de l'utilisateur courant.
        o = (await db.execute(select(VisionObjectif).where(VisionObjectif.id == body.objectif_id, VisionObjectif.user_id == _uid()))).scalar_one_or_none()
        objectif_id = o.id if o else None
    t = VisionTache(user_id=_uid(), titre=body.titre.strip(), duree_min=body.duree_min,
                    micro=body.duree_min <= 5, statut="a_faire", objectif_id=objectif_id)
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return {"id": t.id, "titre": t.titre, "statut": t.statut, "objectif_id": t.objectif_id}


@api.patch("/taches/{tache_id}/statut")
async def statut_tache(tache_id: str, body: TacheStatutIn, db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(VisionTache).where(VisionTache.id == tache_id, VisionTache.user_id == _uid()))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    t.statut = body.statut
    if body.statut == "fait":
        t.progression = 100
    await db.commit()
    return {"id": t.id, "statut": t.statut}


class SaveIn(BaseModel):
    titre: str = Field(min_length=1, max_length=400)
    lien: Optional[str] = None


@api.post("/copilote/decisions/{decision_id}/valider-email")
async def valider_par_email(decision_id: str, db: AsyncSession = Depends(get_db)):
    """Approuve la décision ET envoie un email de confirmation réel (Resend)."""
    uid = _uid()
    profil = await _profil(db, uid)
    if not profil.email:
        raise HTTPException(status_code=400, detail="Ajoute ton email dans les Paramètres pour valider par email.")
    d = (await db.execute(select(CopiloteDecision).where(CopiloteDecision.id == decision_id, CopiloteDecision.user_id == uid))).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Décision introuvable.")
    subject = "Zayado — décision validée"
    html = (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#0B1F3A">'
        f'<p>Bonjour {escape(profil.prenom or "")},</p>'
        f'<p>Tu viens de valider cette décision dans Zayado :</p>'
        f'<p style="padding:12px 16px;background:#F4EEE4;border-radius:10px"><strong>{escape(d.titre)}</strong>'
        + (f'<br><span style="color:#555">{escape(d.note)}</span>' if d.note else "") +
        '</p>'
        '<p>Elle est maintenant marquée comme approuvée. Belle avancée, à ton rythme.</p>'
        f'<p style="font-size:12px;color:#888">Envoyé par {escape(EMAIL_FROM_NAME)}. Nous ne demandons jamais de mot de passe par email.</p>'
        '</td></tr></table>'
    )
    email_id = await send_email(to=profil.email, subject=subject, html=html)
    d.statut = "approuvee"
    d.canal = "email"
    d.decided_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(d)
    return {"ok": True, "email_id": email_id, "decision": _decision_json(d)}


@api.get("/copilote/enregistres")
async def lister_enregistres(db: AsyncSession = Depends(get_db)):
    rows = list((await db.execute(select(SavedArticle).where(SavedArticle.user_id == _uid()).order_by(SavedArticle.created_at.desc()))).scalars())
    return {"articles": [{"id": r.id, "titre": r.titre, "lien": r.lien} for r in rows]}


@api.post("/copilote/enregistres")
async def enregistrer_article(body: SaveIn, db: AsyncSession = Depends(get_db)):
    existe = (await db.execute(select(SavedArticle).where(SavedArticle.user_id == _uid(), SavedArticle.titre == body.titre))).scalar_one_or_none()
    if existe:
        return {"ok": True, "deja": True}
    r = SavedArticle(user_id=_uid(), titre=body.titre, lien=body.lien)
    db.add(r)
    await db.commit()
    return {"ok": True, "id": r.id}


# ─────────────── Vision Board ───────────────

BOARD_CENTER = {"x": 660, "y": 420}
NOTE_COLORS = ["#4a6a9e", "#2FB89A", "#8b6fbf", "#DEC2A3"]

WHEEL_DEFAULT = [
    {"name": "Croissance", "score": 55, "color": "#4a6a9e"},
    {"name": "Bien-être", "score": 60, "color": "#2FB89A"},
    {"name": "Finances", "score": 45, "color": "#DEC2A3"},
    {"name": "Relations", "score": 55, "color": "#E0669A"},
    {"name": "Développement", "score": 50, "color": "#8b6fbf"},
    {"name": "Rayonnement", "score": 45, "color": "#4AC0E0"},
]


async def _energie_moyenne(db: AsyncSession, uid: str) -> Optional[int]:
    rows = list((await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid).order_by(VisionCheckin.date.desc()).limit(7))).scalars())
    if not rows:
        return None
    return round(sum(r.energie for r in rows) / len(rows))


@api.get("/vision/board")
async def get_board(board: str = "perso", db: AsyncSession = Depends(get_db)):
    """Cartes du board demandé (par défaut « perso »)."""
    row = await _board_courant(db, _uid(), board)
    return {"cards": (row.cards if row else []) or [], "board": row.cle if row else "perso"}


class BoardIn(BaseModel):
    cards: List[dict] = Field(default_factory=list)


@api.put("/vision/board")
async def save_board(body: BoardIn, board: str = "perso", db: AsyncSession = Depends(get_db)):
    row = await _board_courant(db, _uid(), board)
    if row is None:
        raise HTTPException(status_code=404, detail="Board introuvable.")
    row.cards = body.cards
    # Miroir de compatibilité : l'ancien board mono reste synchronisé sur « perso ».
    if row.cle == "perso":
        legacy = (await db.execute(select(VisionBoardData).where(VisionBoardData.user_id == _uid()))).scalar_one_or_none()
        if not legacy:
            db.add(VisionBoardData(user_id=_uid(), cards=body.cards))
        else:
            legacy.cards = body.cards
    await db.commit()
    return {"ok": True, "count": len(body.cards), "board": row.cle}


@api.get("/vision/wheel")
async def get_wheel(db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(BalanceWheelData).where(BalanceWheelData.user_id == _uid()))).scalar_one_or_none()
    if not row:
        pillars = [dict(p) for p in WHEEL_DEFAULT]
        e = await _energie_moyenne(db, _uid())
        if e is not None:
            for p in pillars:
                if p["name"] == "Bien-être":
                    p["score"] = int(round(e / 5 * 100))
        row = BalanceWheelData(user_id=_uid(), pillars=pillars)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return {"pillars": row.pillars or [], "energie_moyenne": await _energie_moyenne(db, _uid())}


class WheelIn(BaseModel):
    pillars: List[dict]


@api.put("/vision/wheel")
async def save_wheel(body: WheelIn, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(BalanceWheelData).where(BalanceWheelData.user_id == _uid()))).scalar_one_or_none()
    if not row:
        row = BalanceWheelData(user_id=_uid(), pillars=body.pillars)
        db.add(row)
    else:
        row.pillars = body.pillars
    await db.commit()
    return {"ok": True}


def _roadmap_json(items: List[RoadmapItem]) -> dict:
    out = {"q1": [], "q2": [], "q3": [], "q4": []}
    for it in items:
        q = it.quarter if it.quarter in out else "q1"
        out[q].append({"id": it.id, "titre": it.titre, "done": it.done, "quarter": q})
    return out


@api.get("/vision/roadmap")
async def get_roadmap(db: AsyncSession = Depends(get_db)):
    items = list((await db.execute(select(RoadmapItem).where(RoadmapItem.user_id == _uid()).order_by(RoadmapItem.created_at))).scalars())
    return _roadmap_json(items)


class RoadmapIn(BaseModel):
    quarter: str
    titre: str = Field(min_length=1, max_length=300)


@api.post("/vision/roadmap")
async def add_roadmap(body: RoadmapIn, db: AsyncSession = Depends(get_db)):
    q = body.quarter if body.quarter in ("q1", "q2", "q3", "q4") else "q1"
    it = RoadmapItem(user_id=_uid(), quarter=q, titre=body.titre.strip())
    db.add(it)
    await db.commit()
    await db.refresh(it)
    return {"id": it.id, "titre": it.titre, "done": it.done, "quarter": it.quarter}


class RoadmapPatch(BaseModel):
    titre: Optional[str] = None
    done: Optional[bool] = None


@api.patch("/vision/roadmap/{item_id}")
async def patch_roadmap(item_id: str, body: RoadmapPatch, db: AsyncSession = Depends(get_db)):
    it = (await db.execute(select(RoadmapItem).where(RoadmapItem.id == item_id, RoadmapItem.user_id == _uid()))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Élément introuvable.")
    if body.titre is not None:
        it.titre = body.titre.strip()
    if body.done is not None:
        it.done = body.done
    await db.commit()
    return {"id": it.id, "titre": it.titre, "done": it.done, "quarter": it.quarter}


@api.delete("/vision/roadmap/{item_id}")
async def delete_roadmap(item_id: str, db: AsyncSession = Depends(get_db)):
    it = (await db.execute(select(RoadmapItem).where(RoadmapItem.id == item_id, RoadmapItem.user_id == _uid()))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Élément introuvable.")
    await db.delete(it)
    await db.commit()
    return {"ok": True}


@api.get("/vision/starter-templates")
async def starter_templates():
    """Modèles de départ prêts à charger dans le canvas libre."""
    return {"templates": [
        {"id": "vision-2026", "emoji": "🌅", "label": "Vision Board 2026",
         "description": "Un moodboard élégant pour clarifier tes rêves et ton cap.",
         "cards": [
            {"type": "note", "x": 300, "y": 180, "w": 220, "h": 130, "color": "#DEC2A3", "important": True,
             "title": {"fr": "Ma vision à 3 ans"}, "body": {"fr": "Décris en une phrase la vie que tu construis."}},
            {"type": "note", "x": 980, "y": 200, "w": 220, "h": 130, "color": "#4a6a9e",
             "title": {"fr": "Objectif phare"}, "body": {"fr": "Le résultat qui changerait tout cette année."}},
            {"type": "color", "x": 560, "y": 640, "w": 230, "h": 110,
             "title": {"fr": "Palette de marque"}, "colors": ["#0B1F3A", "#4a6a9e", "#DEC2A3", "#F1E2CC"]},
            {"type": "note", "x": 300, "y": 620, "w": 220, "h": 130, "color": "#2FB89A",
             "title": {"fr": "Mon équilibre"}, "body": {"fr": "Ce que je protège : sommeil, matinées, temps pour moi."}},
            {"type": "note", "x": 980, "y": 620, "w": 220, "h": 130, "color": "#8b6fbf",
             "title": {"fr": "Mon impact"}, "body": {"fr": "Qui j'aide, et le changement que je veux provoquer."}},
         ]},
        {"id": "plan-90j", "emoji": "🎯", "label": "Plan d'action 90 jours",
         "description": "Trois horizons pour transformer la vision en étapes concrètes.",
         "cards": [
            {"type": "note", "x": 300, "y": 200, "w": 230, "h": 140, "color": "#4a6a9e", "important": True,
             "title": {"fr": "30 jours — Fondations"}, "body": {"fr": "• \n• \n• "}},
            {"type": "note", "x": 640, "y": 200, "w": 230, "h": 140, "color": "#2FB89A",
             "title": {"fr": "60 jours — Traction"}, "body": {"fr": "• \n• \n• "}},
            {"type": "note", "x": 980, "y": 200, "w": 230, "h": 140, "color": "#DEC2A3",
             "title": {"fr": "90 jours — Preuve"}, "body": {"fr": "• \n• \n• "}},
         ]},
    ]}


class AiDocIn(BaseModel):
    prompt: str = Field(min_length=2, max_length=2000)
    doc_type: str = "note"


_DOC_CONSIGNES = {
    "note": "Rédige une note actionnable et concise (5-8 lignes) sur le sujet.",
    "brief": "Rédige un brief stratégique : Objectif · Cible · Message clé · 3 étapes.",
    "plan": "Rédige un plan 30 jours en 3 phases, chacune avec 2-3 actions concrètes.",
    "positioning": "Rédige un positionnement : Pour qui · Douleur · Offre · 3 différenciateurs.",
    "swot": "Rédige un SWOT narratif : Forces · Faiblesses · Opportunités · Menaces.",
}


@api.post("/vision/ai-doc")
async def vision_ai_doc(body: AiDocIn, db: AsyncSession = Depends(get_db)):
    contexte = await _contexte(db, _uid())
    consigne = _DOC_CONSIGNES.get(body.doc_type, _DOC_CONSIGNES["note"])
    systeme = (f"{SYSTEM_PROMPT}\n\n--- Contexte ---\n{contexte}\n\n"
               "Tu produis un document court, structuré et directement exploitable pour un vision board. "
               "Pas d'introduction, pas de conclusion, va droit au contenu.")
    prompt = f"{consigne}\n\nSujet : {body.prompt.strip()}"
    try:
        client = _client_llm(f"visiondoc-{_uid()}", systeme)
        if client is None:
            raise RuntimeError("MAMMOTH_API_KEY absente")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=prompt)), timeout=45)
        contenu = str(texte).strip()
        titre = body.prompt.strip()[:60]
        return {"title": titre, "content": contenu, "doc_type": body.doc_type}
    except Exception as e:  # noqa: BLE001
        logger.warning("AI doc indisponible (%s)", e)
        raise HTTPException(status_code=502, detail="Génération indisponible pour l'instant, réessaie dans un instant.")


class GenBoardIn(BaseModel):
    prompt: str = Field(min_length=2, max_length=1000)


@api.post("/vision/generate-board")
async def vision_generate_board(body: GenBoardIn, db: AsyncSession = Depends(get_db)):
    """Génère un ensemble de cartes (vision + piliers + actions) à partir d'un prompt."""
    systeme = (
        "Tu es un stratège qui construit un vision board. À partir de la description, tu renvoies UNIQUEMENT "
        "un objet JSON valide, sans texte autour, de la forme : "
        '{"cards":[{"kind":"vision|pilier|action","title":"...","body":"..."}]}. '
        "Donne 1 carte vision, 3 piliers, 4 actions concrètes. Réponds en français, phrases courtes."
    )
    fallback = {
        "cards": [
            {"kind": "vision", "title": "Ma vision", "body": body.prompt.strip()[:180]},
            {"kind": "pilier", "title": "Croissance", "body": "Développer une offre rentable et durable."},
            {"kind": "pilier", "title": "Bien-être", "body": "Préserver mon énergie et mon équilibre."},
            {"kind": "pilier", "title": "Rayonnement", "body": "Devenir une référence dans mon domaine."},
            {"kind": "action", "title": "Étape 1", "body": "Clarifier l'offre signature."},
            {"kind": "action", "title": "Étape 2", "body": "Contacter 5 prospects clés."},
            {"kind": "action", "title": "Étape 3", "body": "Publier 2 contenus par semaine."},
            {"kind": "action", "title": "Étape 4", "body": "Bloquer un créneau focus quotidien."},
        ]
    }
    parsed = None
    try:
        client = _client_llm(f"visiongen-{_uid()}", systeme)
        if client is not None:
            from llm_mammouth import UserMessage
            texte = await asyncio.wait_for(client.send_message(UserMessage(text=body.prompt.strip())), timeout=45)
            raw = str(texte).strip()
            m = re.search(r"\{.*\}", raw, re.S)
            if m:
                parsed = json.loads(m.group(0))
    except Exception as e:  # noqa: BLE001
        logger.warning("Generate board : repli local (%s)", e)
    data = parsed if (parsed and isinstance(parsed.get("cards"), list) and parsed["cards"]) else fallback

    color_by = {"vision": "#DEC2A3", "pilier": "#4a6a9e", "action": "#2FB89A"}
    cards, angle = [], 0.0
    src = data["cards"][:12]
    for i, c in enumerate(src):
        kind = c.get("kind", "action")
        if kind == "vision":
            x, y = BOARD_CENTER["x"] + 150, BOARD_CENTER["y"] - 40
        else:
            angle = (i / max(1, len(src))) * 6.283
            x = BOARD_CENTER["x"] + int(math.cos(angle) * 360) + 130
            y = BOARD_CENTER["y"] + int(math.sin(angle) * 250) + 60
        cards.append({
            "type": "note", "x": max(40, x), "y": max(40, y), "w": 220, "h": 130,
            "color": color_by.get(kind, "#4a6a9e"), "important": kind == "vision",
            "title": {"fr": (c.get("title") or "Idée")[:60]},
            "body": {"fr": (c.get("body") or "")[:280]},
        })
    return {"cards": cards, "source": "ia" if parsed else "repli"}


@api.post("/vision/inspire")
async def vision_inspire():
    systeme = "Tu renvoies une seule citation inspirante en français, courte, sur la vision, l'action ou la persévérance."
    try:
        client = _client_llm(f"inspire-{_uid()}", systeme)
        if client is None:
            raise RuntimeError("no key")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text="Donne-moi une citation inspirante, format: citation — auteur")), timeout=30)
        raw = str(texte).strip().strip('"')
        if "—" in raw:
            quote, author = raw.rsplit("—", 1)
            return {"quote": quote.strip().strip('"'), "author": author.strip()}
        return {"quote": raw, "author": "Inconnu"}
    except Exception:  # noqa: BLE001
        return {"quote": "La meilleure façon de prédire l'avenir, c'est de le créer.", "author": "Peter Drucker"}


# ─────────────── Multi-boards Vision (perso / pro / personnalisés) ───────────────

BOARDS_DEFAUT = [("perso", "Perso", "🌱"), ("pro", "Pro", "💼")]


def _slugifier(nom: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (nom or "").lower().strip()).strip("-")
    return (base or "board")[:32]


async def _lister_boards(db: AsyncSession, uid: str) -> List["VisionBoardSpace"]:
    """Renvoie les boards de l'utilisateur, en amorçant perso/pro au premier appel.

    Le board historique (table vision_board_data, mono-board) est repris dans « perso »
    pour qu'aucune carte existante ne soit perdue."""
    req = select(VisionBoardSpace).where(VisionBoardSpace.user_id == uid).order_by(VisionBoardSpace.ordre)
    rows = list((await db.execute(req)).scalars())
    if rows:
        return rows
    legacy = (await db.execute(select(VisionBoardData).where(VisionBoardData.user_id == uid))).scalar_one_or_none()
    for i, (cle, nom, emoji) in enumerate(BOARDS_DEFAUT):
        db.add(VisionBoardSpace(
            user_id=uid, cle=cle, nom=nom, emoji=emoji, ordre=i,
            cards=((legacy.cards or []) if (legacy and cle == "perso") else []),
        ))
    await db.commit()
    return list((await db.execute(req)).scalars())


async def _board_courant(db: AsyncSession, uid: str, cle: Optional[str]) -> Optional["VisionBoardSpace"]:
    rows = await _lister_boards(db, uid)
    if not rows:
        return None
    for r in rows:
        if r.cle == (cle or "perso"):
            return r
    return rows[0]


def _board_json(b: "VisionBoardSpace") -> dict:
    return {
        "key": b.cle, "nom": b.nom, "emoji": b.emoji or "🧭",
        "count": len(b.cards or []), "ordre": b.ordre,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


@api.get("/vision/boards")
async def lister_boards(db: AsyncSession = Depends(get_db)):
    rows = await _lister_boards(db, _uid())
    return {"boards": [_board_json(b) for b in rows]}


class BoardCreateIn(BaseModel):
    nom: str = Field(min_length=2, max_length=60)
    emoji: str = Field(default="🧭", max_length=8)


@api.post("/vision/boards")
async def creer_board(body: BoardCreateIn, db: AsyncSession = Depends(get_db)):
    rows = await _lister_boards(db, _uid())
    if len(rows) >= 12:
        raise HTTPException(status_code=400, detail="Nombre maximum de boards atteint (12).")
    existantes = {r.cle for r in rows}
    cle = _slugifier(body.nom)
    suffixe = 2
    while cle in existantes:
        cle = f"{_slugifier(body.nom)}-{suffixe}"
        suffixe += 1
    row = VisionBoardSpace(user_id=_uid(), cle=cle, nom=body.nom.strip(),
                           emoji=body.emoji or "🧭", ordre=len(rows), cards=[])
    db.add(row)
    await db.commit()
    return _board_json(row)


class BoardPatchIn(BaseModel):
    nom: Optional[str] = Field(default=None, max_length=60)
    emoji: Optional[str] = Field(default=None, max_length=8)


@api.patch("/vision/boards/{cle}")
async def maj_board(cle: str, body: BoardPatchIn, db: AsyncSession = Depends(get_db)):
    await _lister_boards(db, _uid())
    row = (await db.execute(select(VisionBoardSpace).where(
        VisionBoardSpace.user_id == _uid(), VisionBoardSpace.cle == cle))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Board introuvable.")
    if body.nom and body.nom.strip():
        row.nom = body.nom.strip()
    if body.emoji:
        row.emoji = body.emoji
    await db.commit()
    return _board_json(row)


@api.delete("/vision/boards/{cle}")
async def supprimer_board(cle: str, db: AsyncSession = Depends(get_db)):
    rows = await _lister_boards(db, _uid())
    if len(rows) <= 1:
        raise HTTPException(status_code=400, detail="Impossible de supprimer le dernier board.")
    cible = next((r for r in rows if r.cle == cle), None)
    if not cible:
        raise HTTPException(status_code=404, detail="Board introuvable.")
    await db.execute(sa_delete(VisionBoardSpace).where(VisionBoardSpace.id == cible.id))
    await db.commit()
    return {"ok": True}


# ─────────────── Compte à rebours « Objectif 3 ans » ───────────────

def _countdown_json(p: "VisionProfile") -> dict:
    titre = getattr(p, "objectif_3ans", None)
    echeance = getattr(p, "echeance_3ans", None)
    debut = getattr(p, "debut_3ans", None)
    data = {"titre": titre or "", "echeance": echeance, "debut": debut,
            "jours": None, "semaines": None, "mois": None, "pourcentage": 0}
    if echeance:
        try:
            fin = date.fromisoformat(echeance)
            aujourdhui = date.today()
            jours = (fin - aujourdhui).days
            data["jours"] = max(0, jours)
            data["semaines"] = max(0, jours // 7)
            data["mois"] = max(0, int(jours // 30.44))
            if debut:
                d0 = date.fromisoformat(debut)
                total = (fin - d0).days
                if total > 0:
                    ecoule = (aujourdhui - d0).days
                    data["pourcentage"] = max(0, min(100, round(ecoule / total * 100)))
        except ValueError:
            pass
    return data


@api.get("/vision/countdown")
async def get_countdown(db: AsyncSession = Depends(get_db)):
    p = await _profil(db, _uid())
    return _countdown_json(p)


class CountdownIn(BaseModel):
    titre: str = Field(min_length=1, max_length=300)
    echeance: str = Field(min_length=10, max_length=10)
    debut: Optional[str] = Field(default=None, max_length=10)


@api.put("/vision/countdown")
async def put_countdown(body: CountdownIn, db: AsyncSession = Depends(get_db)):
    try:
        date.fromisoformat(body.echeance)
        if body.debut:
            date.fromisoformat(body.debut)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date attendu : AAAA-MM-JJ.")
    p = await _profil(db, _uid())
    p.objectif_3ans = body.titre.strip()
    p.echeance_3ans = body.echeance
    p.debut_3ans = body.debut or date.today().isoformat()
    await db.commit()
    await db.refresh(p)
    return _countdown_json(p)


# ─────────────── Revue hebdomadaire guidée par Zayado ───────────────

REVUE_QUESTIONS = ["q1", "q2", "q3", "q4", "q5"]

REVUE_LIBELLES = {
    "q1": "Ce qui a vraiment avancé",
    "q2": "Ce qui a coûté le plus d'énergie",
    "q3": "Ce qui a été appris",
    "q4": "Ce qui est lâché la semaine prochaine",
    "q5": "La seule priorité de la semaine à venir",
}


def _lundi(d: Optional[date] = None) -> str:
    d = d or date.today()
    return (d - timedelta(days=d.weekday())).isoformat()


def _revue_json(r: "RevueHebdo") -> dict:
    return {
        "id": r.id, "semaine": r.semaine, "reponses": r.reponses or {},
        "synthese": r.synthese or "", "energie_moyenne": r.energie_moyenne,
        "langue": r.langue or "fr",
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@api.get("/revue-hebdo")
async def revue_courante(db: AsyncSession = Depends(get_db)):
    semaine = _lundi()
    derniere = (await db.execute(
        select(RevueHebdo).where(RevueHebdo.user_id == _uid())
        .order_by(RevueHebdo.semaine.desc()).limit(1)
    )).scalar_one_or_none()
    return {
        "semaine": semaine,
        "questions": REVUE_QUESTIONS,
        "energie_moyenne": await _energie_moyenne(db, _uid()),
        "derniere": _revue_json(derniere) if derniere else None,
    }


@api.get("/revue-hebdo/historique")
async def revue_historique(db: AsyncSession = Depends(get_db)):
    rows = list((await db.execute(
        select(RevueHebdo).where(RevueHebdo.user_id == _uid())
        .order_by(RevueHebdo.semaine.desc()).limit(12)
    )).scalars())
    return {"revues": [_revue_json(r) for r in rows]}


class RevueIn(BaseModel):
    reponses: dict = Field(default_factory=dict)
    langue: str = Field(default="fr", max_length=2)


def _revue_repli(reponses: dict, langue: str) -> str:
    priorite = (reponses.get("q5") or "").strip()
    lache = (reponses.get("q4") or "").strip()
    if langue == "en":
        lignes = ["Here's what I read from your week, without embellishment:"]
        if reponses.get("q1"):
            lignes.append(f"• You moved forward on: {reponses['q1'][:180]}")
        if reponses.get("q2"):
            lignes.append(f"• What drained you: {reponses['q2'][:180]}")
        if lache:
            lignes.append(f"• You're letting go of: {lache[:160]}")
        lignes.append(f"• Next week, one thing only: {priorite[:160]}" if priorite
                      else "• Next week, pick one single priority and protect it.")
        lignes.append("(Local fallback — the AI copilot is unavailable right now.)")
        return "\n".join(lignes)
    lignes = ["Voilà ce que je lis de ta semaine, sans enjoliver :"]
    if reponses.get("q1"):
        lignes.append(f"• Tu as avancé sur : {reponses['q1'][:180]}")
    if reponses.get("q2"):
        lignes.append(f"• Ce qui t'a coûté : {reponses['q2'][:180]}")
    if lache:
        lignes.append(f"• Tu lâches : {lache[:160]}")
    lignes.append(f"• La semaine prochaine, une seule chose : {priorite[:160]}" if priorite
                  else "• La semaine prochaine, choisis une seule priorité et protège-la.")
    lignes.append("(Réponse locale de repli — le Copilote IA est indisponible.)")
    return "\n".join(lignes)


@api.post("/revue-hebdo/synthese")
async def revue_synthese(body: RevueIn, db: AsyncSession = Depends(get_db)):
    """Zayado relit la semaine et renvoie une synthèse courte + la priorité retenue."""
    reponses = {k: str(v).strip()[:1200] for k, v in (body.reponses or {}).items() if k in REVUE_QUESTIONS and str(v).strip()}
    if not reponses:
        raise HTTPException(status_code=400, detail="Aucune réponse à analyser.")
    langue = "en" if body.langue == "en" else "fr"
    semaine = _lundi()
    energie = await _energie_moyenne(db, _uid())
    contexte = await _contexte(db, _uid())

    bloc = "\n".join(f"- {REVUE_LIBELLES[k]} : {v}" for k, v in reponses.items())
    if langue == "en":
        consigne = (
            "Write the weekly review synthesis IN ENGLISH, 5 to 8 short lines, in a calm and direct tone. "
            "Structure: 1) what really moved, 2) the energy cost, 3) one honest observation, "
            "4) the single priority for next week rephrased sharply, 5) one 15-minute first step. "
            "No flattery, no bullet-point jargon, no introduction."
        )
    else:
        consigne = (
            "Rédige la synthèse de la revue hebdomadaire EN FRANÇAIS, 5 à 8 lignes courtes, ton calme et direct. "
            "Structure : 1) ce qui a vraiment bougé, 2) le coût en énergie, 3) une observation honnête, "
            "4) la seule priorité de la semaine à venir reformulée nettement, 5) un premier pas de 15 minutes. "
            "Pas de flatterie, pas de jargon, pas d'introduction."
        )
    systeme = (f"{SYSTEM_PROMPT}\n\n--- Contexte ---\n{contexte}\n"
               f"Énergie moyenne des 7 derniers jours : {energie if energie is not None else 'inconnue'}/5\n\n{consigne}")

    synthese = None
    try:
        client = _client_llm(f"revue-{_uid()}-{semaine}", systeme)
        if client is not None:
            from llm_mammouth import UserMessage
            texte = await asyncio.wait_for(client.send_message(UserMessage(text=bloc)), timeout=45)
            synthese = str(texte).strip()
    except Exception as e:  # noqa: BLE001
        logger.warning("Revue hebdo : repli local (%s)", e)
    if not synthese:
        synthese = _revue_repli(reponses, langue)

    row = (await db.execute(select(RevueHebdo).where(
        RevueHebdo.user_id == _uid(), RevueHebdo.semaine == semaine))).scalar_one_or_none()
    if not row:
        row = RevueHebdo(user_id=_uid(), semaine=semaine)
        db.add(row)
    row.reponses = reponses
    row.synthese = synthese
    row.energie_moyenne = energie
    row.langue = langue
    await db.commit()
    return {"semaine": semaine, "synthese": synthese, "energie_moyenne": energie}


# ─────────────── Idées (capture, Impact/Effort, statut, objectif lié) ───────────────

STATUTS_IDEE = ("idee", "test", "projet", "action")
STATUTS_ENGAGES = ("projet", "action")  # nécessitent un objectif lié


def _score(impact: int, effort: int) -> float:
    return round((impact or 0) / max(1, (effort or 1)), 2)


async def _idee_json(db: AsyncSession, it: Idee) -> dict:
    titre_obj = None
    if it.objectif_id:
        o = (await db.execute(select(VisionObjectif).where(VisionObjectif.id == it.objectif_id))).scalar_one_or_none()
        titre_obj = o.titre if o else None
    return {
        "id": it.id, "titre": it.titre, "description": it.description or "",
        "statut": it.statut, "impact": it.impact, "effort": it.effort,
        "score": _score(it.impact, it.effort), "objectif_id": it.objectif_id,
        "objectif_titre": titre_obj, "source": it.source,
        "created_at": it.created_at.isoformat() if it.created_at else None,
    }


@api.get("/objectifs")
async def list_objectifs(db: AsyncSession = Depends(get_db)):
    rows = list((await db.execute(select(VisionObjectif).where(VisionObjectif.user_id == _uid()).order_by(VisionObjectif.created_at))).scalars())
    return [{"id": o.id, "titre": o.titre, "echeance": o.echeance, "progression": o.progression, "statut": o.statut} for o in rows]


@api.get("/idees")
async def list_idees(statut: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Idee).where(Idee.user_id == _uid())
    if statut in STATUTS_IDEE:
        q = q.where(Idee.statut == statut)
    rows = list((await db.execute(q.order_by(Idee.created_at.desc()))).scalars())
    return [await _idee_json(db, it) for it in rows]


class IdeeIn(BaseModel):
    titre: str = Field(min_length=1, max_length=400)
    description: Optional[str] = None
    impact: int = 5
    effort: int = 5
    objectif_id: Optional[str] = None
    source: str = "manuelle"


@api.post("/idees")
async def create_idee(body: IdeeIn, db: AsyncSession = Depends(get_db)):
    it = Idee(
        user_id=_uid(), titre=body.titre.strip(), description=(body.description or "").strip() or None,
        impact=max(1, min(10, body.impact)), effort=max(1, min(10, body.effort)),
        objectif_id=body.objectif_id or None, source=body.source or "manuelle", statut="idee",
    )
    db.add(it)
    await db.commit()
    await db.refresh(it)
    return await _idee_json(db, it)


class IdeePatch(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    impact: Optional[int] = None
    effort: Optional[int] = None
    statut: Optional[str] = None
    objectif_id: Optional[str] = None


@api.patch("/idees/{idee_id}")
async def update_idee(idee_id: str, body: IdeePatch, db: AsyncSession = Depends(get_db)):
    it = (await db.execute(select(Idee).where(Idee.id == idee_id, Idee.user_id == _uid()))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Idée introuvable.")
    data = body.model_dump(exclude_unset=True)
    # Objectif lié : appliquer d'abord pour la vérification de règle
    if "objectif_id" in data:
        it.objectif_id = data["objectif_id"] or None
    # Règle métier : passage en Projet/Action uniquement si une objectif est lié
    if data.get("statut") is not None:
        nouveau = data["statut"]
        if nouveau not in STATUTS_IDEE:
            raise HTTPException(status_code=422, detail="Statut invalide.")
        if nouveau in STATUTS_ENGAGES and not it.objectif_id:
            raise HTTPException(
                status_code=400,
                detail="Pour passer cette idée en Projet ou en Action, lie-la d'abord à un objectif. C'est la règle : on n'engage de l'énergie que sur ce qui sert un objectif.",
            )
        it.statut = nouveau
    if data.get("titre") is not None:
        it.titre = data["titre"].strip()
    if "description" in data:
        it.description = (data["description"] or "").strip() or None
    if data.get("impact") is not None:
        it.impact = max(1, min(10, data["impact"]))
    if data.get("effort") is not None:
        it.effort = max(1, min(10, data["effort"]))
    await db.commit()
    await db.refresh(it)
    return await _idee_json(db, it)


@api.delete("/idees/{idee_id}")
async def delete_idee(idee_id: str, db: AsyncSession = Depends(get_db)):
    it = (await db.execute(select(Idee).where(Idee.id == idee_id, Idee.user_id == _uid()))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Idée introuvable.")
    await db.delete(it)
    await db.commit()
    return {"ok": True}


# ─────────── Vision → Idée → Action : "Lancer maintenant" + push CRM ───────────

async def _push_trello(titre: str, description: str) -> dict:
    key = os.environ.get("TRELLO_API_KEY")
    token = os.environ.get("TRELLO_TOKEN")
    list_id = os.environ.get("TRELLO_LIST_ID")
    if not (key and token and list_id):
        return {"ok": False, "reason": "not_configured"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.post(
                "https://api.trello.com/1/cards",
                params={"key": key, "token": token, "idList": list_id,
                        "name": titre, "desc": description or ""},
            )
        return {"ok": r.status_code < 400, "url": (r.json().get("shortUrl") if r.status_code < 400 else None),
                "status": r.status_code}
    except Exception as e:
        return {"ok": False, "reason": str(e)[:120]}


async def _push_jira(titre: str, description: str) -> dict:
    url = os.environ.get("JIRA_URL")
    email = os.environ.get("JIRA_EMAIL")
    token = os.environ.get("JIRA_API_TOKEN")
    project_key = os.environ.get("JIRA_PROJECT_KEY", "KAI")
    if not (url and email and token):
        return {"ok": False, "reason": "not_configured"}
    try:
        auth = (email, token)
        payload = {"fields": {
            "project": {"key": project_key},
            "summary": titre,
            "description": {"type": "doc", "version": 1,
                            "content": [{"type": "paragraph", "content": [{"type": "text", "text": description or ""}]}]},
            "issuetype": {"name": "Task"},
        }}
        async with httpx.AsyncClient(timeout=8.0, auth=auth) as c:
            r = await c.post(f"{url.rstrip('/')}/rest/api/3/issue", json=payload)
        j = r.json() if r.status_code < 400 else {}
        issue_url = f"{url.rstrip('/')}/browse/{j.get('key')}" if j.get("key") else None
        return {"ok": r.status_code < 400, "url": issue_url, "status": r.status_code}
    except Exception as e:
        return {"ok": False, "reason": str(e)[:120]}


async def _push_hubspot(titre: str, description: str) -> dict:
    token = os.environ.get("HUBSPOT_ACCESS_TOKEN")
    if not token:
        return {"ok": False, "reason": "not_configured"}
    try:
        payload = {"properties": {
            "hs_task_subject": titre,
            "hs_task_body": description or "",
            "hs_task_status": "NOT_STARTED",
            "hs_timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        }}
        async with httpx.AsyncClient(timeout=8.0, headers={"Authorization": f"Bearer {token}"}) as c:
            r = await c.post("https://api.hubapi.com/crm/v3/objects/tasks", json=payload)
        j = r.json() if r.status_code < 400 else {}
        return {"ok": r.status_code < 400, "id": j.get("id"), "status": r.status_code}
    except Exception as e:
        return {"ok": False, "reason": str(e)[:120]}


async def _push_teams(titre: str, description: str) -> dict:
    plan_id = os.environ.get("MS_PLANNER_PLAN_ID")
    bucket_id = os.environ.get("MS_PLANNER_BUCKET_ID")
    token = os.environ.get("MS_GRAPH_ACCESS_TOKEN")
    if not (plan_id and bucket_id and token):
        return {"ok": False, "reason": "not_configured"}
    try:
        payload = {"planId": plan_id, "bucketId": bucket_id, "title": titre}
        async with httpx.AsyncClient(timeout=8.0, headers={"Authorization": f"Bearer {token}"}) as c:
            r = await c.post("https://graph.microsoft.com/v1.0/planner/tasks", json=payload)
        return {"ok": r.status_code < 400, "status": r.status_code}
    except Exception as e:
        return {"ok": False, "reason": str(e)[:120]}


@api.post("/idees/{idee_id}/lancer")
async def idee_lancer(idee_id: str, db: AsyncSession = Depends(get_db)):
    """Convertit une idée (statut=action) en VisionTache + push vers Trello / Jira / HubSpot / Teams."""
    it = (await db.execute(select(Idee).where(Idee.id == idee_id, Idee.user_id == _uid()))).scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Idée introuvable.")
    if it.statut != "action":
        raise HTTPException(status_code=400, detail="Passe d'abord l'idée en statut Action.")

    tache = VisionTache(
        user_id=_uid(), titre=it.titre, duree_min=25,
        objectif_id=it.objectif_id, icon="Sparkles", statut="a_faire",
    )
    db.add(tache)
    await db.commit()
    await db.refresh(tache)

    description = it.description or ""
    pushes = {
        "trello":  await _push_trello(it.titre, description),
        "jira":    await _push_jira(it.titre, description),
        "hubspot": await _push_hubspot(it.titre, description),
        "teams":   await _push_teams(it.titre, description),
    }
    return {
        "ok": True,
        "tache_id": tache.id,
        "titre": tache.titre,
        "pushed_to": [k for k, v in pushes.items() if v.get("ok")],
        "skipped": [k for k, v in pushes.items() if not v.get("ok") and v.get("reason") == "not_configured"],
        "errors": {k: v for k, v in pushes.items() if not v.get("ok") and v.get("reason") != "not_configured"},
    }


# ─────────── Cockpit widgets : Pouls Business + Radar + Impact ───────────

class VisionPoulsBusiness(Base):
    __tablename__ = "vision_pouls_business"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    ca_mensuel: Mapped[int] = mapped_column(Integer, default=0)              # cts d'euros
    ca_objectif: Mapped[int] = mapped_column(Integer, default=0)             # cts
    factures_en_attente: Mapped[int] = mapped_column(Integer, default=0)     # nombre
    tresorerie: Mapped[int] = mapped_column(Integer, default=0)              # cts
    source: Mapped[str] = mapped_column(String(20), default="manuel")        # manuel|qonto|drive
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PoulsIn(BaseModel):
    ca_mensuel: Optional[float] = None
    ca_objectif: Optional[float] = None
    factures_en_attente: Optional[int] = None
    tresorerie: Optional[float] = None
    source: Optional[str] = None


def _pouls_json(p: "VisionPoulsBusiness") -> dict:
    def eur(v): return round((v or 0) / 100, 2)
    pct = 0
    if p.ca_objectif and p.ca_objectif > 0:
        pct = min(100, int(100 * p.ca_mensuel / p.ca_objectif))
    ratio_fac = (p.factures_en_attente or 0)
    # signal simple : rouge si trésorerie < 1 mois de CA et > 3 factures en attente
    alerte = "vert"
    if p.ca_mensuel and p.tresorerie and p.tresorerie < p.ca_mensuel:
        alerte = "orange"
    if ratio_fac >= 5 and alerte == "orange":
        alerte = "rouge"
    return {
        "ca_mensuel": eur(p.ca_mensuel), "ca_objectif": eur(p.ca_objectif),
        "factures_en_attente": p.factures_en_attente or 0,
        "tresorerie": eur(p.tresorerie),
        "avancement": pct, "alerte": alerte,
        "source": p.source, "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


async def _pouls_row(db: AsyncSession) -> "VisionPoulsBusiness":
    row = (await db.execute(select(VisionPoulsBusiness).where(VisionPoulsBusiness.user_id == _uid()))).scalar_one_or_none()
    if not row:
        row = VisionPoulsBusiness(user_id=_uid())
        db.add(row); await db.commit(); await db.refresh(row)
    return row


@api.get("/cockpit/pouls")
async def cockpit_pouls_get(db: AsyncSession = Depends(get_db)):
    p = await _pouls_row(db)
    data = _pouls_json(p)
    # phrase IA courte : locale d'abord, LLM ensuite si clé
    if data["ca_objectif"] > 0:
        if data["avancement"] >= 100:
            data["phrase_ia"] = "Objectif atteint. Encaisse les factures et prends une respiration."
        elif data["avancement"] >= 70:
            data["phrase_ia"] = "Tu es bien lancé. Concentre-toi sur la conversion des factures en attente."
        elif data["avancement"] >= 30:
            data["phrase_ia"] = "Rythme correct. Relance une opportunité concrète aujourd'hui."
        else:
            data["phrase_ia"] = "Mois calme. Priorise 1 action commerciale à impact rapide."
    else:
        data["phrase_ia"] = "Fixe ton objectif de CA mensuel pour que Zayado ajuste ta boussole."
    return data


@api.put("/cockpit/pouls")
async def cockpit_pouls_set(body: PoulsIn, db: AsyncSession = Depends(get_db)):
    p = await _pouls_row(db)
    if body.ca_mensuel is not None:          p.ca_mensuel = int(round((body.ca_mensuel or 0) * 100))
    if body.ca_objectif is not None:         p.ca_objectif = int(round((body.ca_objectif or 0) * 100))
    if body.factures_en_attente is not None: p.factures_en_attente = max(0, int(body.factures_en_attente or 0))
    if body.tresorerie is not None:          p.tresorerie = int(round((body.tresorerie or 0) * 100))
    if body.source is not None and body.source in ("manuel", "qonto", "pennylane", "drive", "sharepoint"):
        p.source = body.source
    await db.commit(); await db.refresh(p)
    return _pouls_json(p)


# Radar : résultat IA mémorisé par utilisateur et par jour. Avant, chaque
# ouverture du Cockpit ou du Radar relançait l'IA (jusqu'à 45 s d'attente et un
# coût à chaque visite). « Relancer le scan » force un nouveau calcul, 5 fois/jour max.
_RADAR_CACHE: dict = {}          # uid -> (date, réponse)
_RADAR_RELANCES: dict = {}       # (uid, date) -> nombre de relances
_RADAR_RELANCES_MAX = 5


@api.get("/cockpit/radar")
async def cockpit_radar(refresh: bool = False, db: AsyncSession = Depends(get_db)):
    """Radar du jour : 3 opportunités qualifiées, reliées à la Vision.
    Utilise Emergent LLM si la clé est configurée, sinon repli local basé sur les objectifs."""
    uid = _uid()
    aujourdhui = datetime.now(timezone.utc).date().isoformat()
    en_cache = _RADAR_CACHE.get(uid)
    if refresh:
        cle = (uid, aujourdhui)
        if _RADAR_RELANCES.get(cle, 0) >= _RADAR_RELANCES_MAX and en_cache and en_cache[0] == aujourdhui:
            return {**en_cache[1], "limite_relances": True}
        _RADAR_RELANCES[cle] = _RADAR_RELANCES.get(cle, 0) + 1
    elif en_cache and en_cache[0] == aujourdhui:
        return en_cache[1]
    resultat = await _calculer_radar(db, uid, graine=_RADAR_RELANCES.get((uid, aujourdhui), 0))
    if resultat.get("source") == "ia":
        _RADAR_CACHE[uid] = (aujourdhui, resultat)
    return resultat


async def _calculer_radar(db: AsyncSession, uid: str, graine: int = 0) -> dict:
    objectifs = list((await db.execute(select(VisionObjectif).where(VisionObjectif.user_id == uid))).scalars())
    if not objectifs:
        return {"opportunities": [], "phrase_ia": "Ajoute des objectifs sur ta Vision pour activer le radar."}

    titres = [o.titre for o in objectifs][:3]

    # Repli local (rapide, déterministe) — évite d'attendre le LLM au chargement du Cockpit
    fallback = [
        {"titre": f"Relancer 3 prospects intéressés par « {titres[0]} »", "canal": "email",
         "message": ("Bonjour, je reviens vers vous suite à notre dernier échange. Avez-vous 15 minutes "
                     "cette semaine pour faire le point ensemble sur votre besoin ? Je m'adapte à vos disponibilités."),
         "score": 82, "objectif": titres[0]},
        {"titre": "Partager une réussite client sur LinkedIn", "canal": "linkedin",
         "message": ("Ce mois-ci, j'ai accompagné un client sur un vrai défi. Ce qui a fait la différence : "
                     "écouter avant de proposer, avancer par petites étapes, et mesurer le résultat. "
                     "Et vous, quelle est la question que vous vous posez en ce moment sur votre activité ?"),
         "score": 74, "objectif": titres[0]},
        {"titre": "Proposer un rendez-vous à un contact recommandé", "canal": "email",
         "message": ("Bonjour, on m'a recommandé de prendre contact avec vous. J'aide des professionnels comme vous "
                     "à gagner du temps et de la sérénité dans leur activité. Seriez-vous ouvert à un échange de 20 minutes ?"),
         "score": 68, "objectif": (titres[1] if len(titres) > 1 else titres[0])},
    ]

    # Radar réellement branché sur l'IA (retour Marie Esther : « on dirait que
    # ça ne fonctionne pas ») — les opportunités sont générées depuis le vrai
    # contexte du compte ; le repli local ne sert qu'en cas d'indisponibilité.
    systeme = (
        "Tu es le radar business de Zayado. À partir du contexte, tu proposes exactement 3 opportunités "
        "concrètes et actionnables aujourd'hui, reliées aux objectifs. Tu réponds UNIQUEMENT en JSON valide : "
        '{"opportunities":[{"titre":"...","canal":"email|linkedin|appel|whatsapp","message":"...","score":0-100,"objectif":"..."}],'
        '"phrase_ia":"une phrase courte qui résume pourquoi ces 3-là"}. Le message doit être prêt à envoyer, '
        "en français, ton chaleureux et professionnel, en VOUVOYANT le destinataire (c'est un prospect ou un client). "
        "Le message doit être complet : aucun trou, aucun « … », aucun crochet à remplir."
    )
    try:
        contexte = await _contexte(db, uid)
        client = _client_llm(f"radar-{uid}-{datetime.now(timezone.utc).date()}-{graine}", systeme)
        if client is None:
            raise RuntimeError("MAMMOTH_API_KEY absente")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=contexte)), timeout=45)
        import json as _json, re as _re
        brut = str(texte).strip()
        m = _re.search(r"\{.*\}", brut, _re.DOTALL)
        data = _json.loads(m.group(0) if m else brut)
        opps = [o for o in data.get("opportunities", []) if o.get("titre")][:3]
        if opps:
            return {
                "opportunities": opps,
                "phrase_ia": data.get("phrase_ia") or "3 mouvements alignés à ta Vision, prêts en un tap.",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "objectifs_utilises": titres,
                "source": "ia",
            }
    except Exception as e:  # noqa: BLE001
        logger.warning("Radar IA indisponible, repli local (%s)", e)

    return {
        "opportunities": fallback,
        "phrase_ia": "3 mouvements alignés à ta Vision, prêts en un tap.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "objectifs_utilises": titres,
        "source": "repli",
    }


@api.post("/radar/swot")
async def radar_swot(db: AsyncSession = Depends(get_db)):
    """Analyse SWOT générée par l'IA à partir du vrai contexte du compte
    (retour Marie Esther : « le SWOT utile ? » — oui, sur le Radar)."""
    uid = _uid()
    contexte = await _contexte(db, uid)
    systeme = (
        "Tu es un analyste stratégique. À partir du contexte, tu produis une analyse SWOT honnête et utile. "
        "Réponds UNIQUEMENT en JSON valide : "
        '{"forces":["..."],"faiblesses":["..."],"opportunites":["..."],"menaces":["..."],'
        '"synthese":"2 phrases : le point de vigilance n°1 et le levier n°1"}. '
        "3 éléments maximum par quadrant, phrases courtes et concrètes, en français. "
        "Si le contexte est pauvre, appuie-toi sur ce qui est écrit, n'invente pas de chiffres."
    )
    try:
        client = _client_llm(f"swot-{uid}", systeme)
        if client is None:
            raise RuntimeError("MAMMOTH_API_KEY absente")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=contexte)), timeout=45)
        import json as _json, re as _re
        brut = str(texte).strip()
        m = _re.search(r"\{.*\}", brut, _re.DOTALL)
        data = _json.loads(m.group(0) if m else brut)
        for cle in ("forces", "faiblesses", "opportunites", "menaces"):
            if not isinstance(data.get(cle), list):
                data[cle] = []
        return {**data, "genere_a": datetime.now(timezone.utc).isoformat(), "source": "ia"}
    except Exception as e:  # noqa: BLE001
        logger.warning("SWOT IA indisponible (%s)", e)
        raise HTTPException(status_code=502, detail="Analyse SWOT indisponible pour l'instant, réessaie dans un instant.")


@api.get("/cockpit/impact")
async def cockpit_impact(db: AsyncSession = Depends(get_db)):
    """Bandeau Impact : actions bouclées + check-ins de la semaine."""
    uid = _uid()
    depuis = datetime.now(timezone.utc) - timedelta(days=7)
    taches = list((await db.execute(
        select(VisionTache).where(VisionTache.user_id == uid, VisionTache.statut == "fait", VisionTache.created_at >= depuis)
    )).scalars())
    checkins = list((await db.execute(
        select(VisionCheckin).where(VisionCheckin.user_id == uid, VisionCheckin.created_at >= depuis)
    )).scalars())
    victoires = list((await db.execute(
        select(VisionVictoire).where(VisionVictoire.user_id == uid, VisionVictoire.created_at >= depuis)
    )).scalars())
    return {
        "actions_bouclees": len(taches),
        "checkins": len(checkins),
        "victoires": len(victoires),
        "periode": "7_jours",
    }




# ─────────────── Transcription vocale (OpenAI Whisper) ───────────────

@api.post("/transcrire")
async def transcrire(audio: UploadFile = File(...)):
    """Transcription vocale via Mammouth AI (whisper-1, API compatible OpenAI)."""
    from llm_mammouth import MAMMOTH_BASE_URL, cle_mammouth
    cle = cle_mammouth()
    if not cle:
        raise HTTPException(status_code=502, detail="Transcription indisponible (clé MAMMOTH_API_KEY absente).")
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Audio vide.")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio trop long (max 25 Mo).")
    nom = audio.filename or "audio.webm"
    if "." not in nom:
        nom += ".webm"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=10.0)) as http:
            r = await http.post(f"{MAMMOTH_BASE_URL}/audio/transcriptions",
                                headers={"Authorization": f"Bearer {cle}"},
                                files={"file": (nom, data, audio.content_type or "audio/webm")},
                                data={"model": "whisper-1", "language": "fr", "response_format": "json"})
        if r.status_code != 200:
            raise RuntimeError(f"{r.status_code} {r.text[:200]}")
        return {"texte": (r.json().get("text") or "").strip()}
    except Exception as e:  # noqa: BLE001
        logger.warning("Transcription échouée : %s", e)
        raise HTTPException(status_code=502, detail="Transcription indisponible pour l'instant.")


# ─────────────── Sources & synchronisation (classement IA + validation) ───────────────

def _extraire_texte_html(html: str) -> str:
    txt = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    txt = re.sub(r"(?s)<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt)
    return txt.strip()


class SourceIn(BaseModel):
    contenu: str = Field(min_length=2, max_length=8000)


@api.post("/sources/analyser")
async def sources_analyser(body: SourceIn):
    """Propose un classement (idee|projet|action). NE range rien : validation obligatoire côté utilisateur."""
    contenu = body.contenu.strip()
    note = None
    if re.match(r"^https?://", contenu, re.I):
        hote = urlparse(contenu).hostname or ""
        if any(k in hote for k in ("sharepoint", "onedrive", "-my.sharepoint", "live.com")):
            note = "Cette source privée (SharePoint/OneDrive) nécessitera une connexion Microsoft — bientôt (V1.5). J'analyse pour l'instant ce que je peux lire publiquement."
        try:
            async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
                r = await client.get(contenu, headers={"User-Agent": "Mozilla/5.0 ZayadoBot"})
                contenu = _extraire_texte_html(r.text)[:6000] or contenu
        except Exception as e:  # noqa: BLE001
            logger.info("Fetch source impossible : %s", e)
            note = note or "Je n'ai pas pu ouvrir ce lien directement. Colle plutôt le texte du document pour un classement fiable."
    systeme = (
        "Tu es un assistant qui trie des notes de travail. À partir du contenu fourni, extrais 3 à 8 éléments "
        "et classe chacun. Renvoie UNIQUEMENT un JSON valide : "
        '{"items":[{"titre":"...","type":"idee|projet|action","raison":"courte justification"}]}. '
        "Règles : 'idee' = piste à explorer ; 'projet' = initiative structurée ; 'action' = tâche concrète immédiate. "
        "Titres courts (max 12 mots), en français."
    )
    proposals = []
    try:
        client = _client_llm(f"sources-{_uid()}", systeme)
        if client is not None:
            from llm_mammouth import UserMessage
            texte = await asyncio.wait_for(client.send_message(UserMessage(text=contenu[:6000])), timeout=45)
            m = re.search(r"\{.*\}", str(texte), re.S)
            if m:
                data = json.loads(m.group(0))
                for x in (data.get("items") or [])[:10]:
                    t = (x.get("type") or "idee").lower()
                    if t not in STATUTS_IDEE:
                        t = "idee"
                    proposals.append({"titre": (x.get("titre") or "").strip()[:200], "type": t, "raison": (x.get("raison") or "").strip()[:200]})
    except Exception as e:  # noqa: BLE001
        logger.warning("Analyse source : %s", e)
    proposals = [p for p in proposals if p["titre"]]
    if not proposals:
        note = note or "Je n'ai rien pu extraire d'exploitable. Reformule ou colle un contenu plus détaillé."
    return {"proposals": proposals, "note": note}


class SourceValiderItem(BaseModel):
    titre: str
    type: str = "idee"
    objectif_id: Optional[str] = None


class SourceValiderIn(BaseModel):
    items: List[SourceValiderItem]


@api.post("/sources/valider")
async def sources_valider(body: SourceValiderIn, db: AsyncSession = Depends(get_db)):
    """Range les éléments validés en Idées. Respecte la règle : projet/action sans objectif → rangé en Idée."""
    crees, retrogrades = [], 0
    for x in body.items:
        statut = (x.type or "idee").lower()
        if statut not in STATUTS_IDEE:
            statut = "idee"
        if statut in STATUTS_ENGAGES and not x.objectif_id:
            statut = "idee"
            retrogrades += 1
        it = Idee(user_id=_uid(), titre=x.titre.strip()[:400], statut=statut,
                  objectif_id=x.objectif_id or None, source="sync")
        db.add(it)
        crees.append(it)
    await db.commit()
    for it in crees:
        await db.refresh(it)
    return {
        "crees": len(crees),
        "retrogrades": retrogrades,
        "note": (f"{retrogrades} élément(s) rangé(s) en Idées faute d'objectif lié (règle métier)." if retrogrades else None),
        "idees": [await _idee_json(db, it) for it in crees],
    }


@api.get("/export")
async def exporter(db: AsyncSession = Depends(get_db)):
    return await get_state(db)


@api.delete("/donnees")
async def supprimer_donnees(db: AsyncSession = Depends(get_db)):
    uid = _uid()
    for modele in (VisionChatMessage, VisionCheckin, VisionVictoire, VisionTache, VisionObjectif, VisionBalance, CopiloteDecision, SavedArticle, VisionBoardData, BalanceWheelData, RoadmapItem, Idee, VisionProfile):
        await db.execute(sa_delete(modele).where(modele.user_id == uid))
    await db.commit()
    return {"ok": True}


# ─────────────────────────── Amorçage démo ───────────────────────────

async def _seed():
    async with async_session() as db:
        profil = (await db.execute(select(VisionProfile).where(VisionProfile.user_id == DEMO_USER_ID))).scalar_one_or_none()
        if profil:
            return
        db.add(VisionProfile(
            user_id=DEMO_USER_ID, prenom="Camille", heure_checkin="08:30", plan="immersion", onboarded=True,
            texte_vision="Vivre sereinement de mon studio, avec un impact réel et du temps pour moi.",
            pourquoi="Prouver qu'on peut réussir sans se détruire.",
            valeurs=["Liberté", "Impact", "Sérénité"],
        ))
        db.add(VisionBalance(user_id=DEMO_USER_ID, pro=60, perso=40))
        db.add(VisionObjectif(user_id=DEMO_USER_ID, titre="Lancer l'offre Immersion Q3", echeance=iso_moins(-34), progression=62, statut="actif"))
        db.add_all([
            VisionTache(user_id=DEMO_USER_ID, titre="Finaliser la proposition pour Nova Studio", duree_min=45, progression=75, icon="FileText", statut="a_faire"),
            VisionTache(user_id=DEMO_USER_ID, titre="Appel de cadrage avec l'équipe design", duree_min=30, progression=20, icon="Users", statut="a_faire"),
            VisionTache(user_id=DEMO_USER_ID, titre="Marche + respiration avant le déjeuner", duree_min=15, progression=100, icon="Footprints", statut="fait"),
        ])
        db.add(VisionVictoire(user_id=DEMO_USER_ID, texte="Tu as signé ton 2ᵉ client pilote hier 🎉",
                              detail="Une preuve de plus que ta vision résonne. Savoure ce moment.", date=iso_moins(1)))
        energies = [3, 4, 2, 3, 4, 5, 4, 3, 2, 3, 4, 4, 5, 4]
        for i, e in enumerate(reversed(energies)):
            db.add(VisionCheckin(user_id=DEMO_USER_ID, date=iso_moins(len(energies) - i), energie=e,
                                 stress=max(1, 6 - e), sommeil=min(5, e + 1), charge=max(1, 6 - e), mood="aligné"))
        db.add_all([
            CopiloteDecision(user_id=DEMO_USER_ID, titre="Bloquer 90 min demain matin pour Nova Studio",
                             note="Créneau protégé, notifications coupées. Tu valides ?", origine="copilote"),
            CopiloteDecision(user_id=DEMO_USER_ID, titre="Envoyer la relance au prospect clé",
                             note="L'IA a préparé un brouillon bienveillant. Tu approuves l'envoi ?", origine="copilote"),
        ])
        await db.commit()
        logger.info("Données de démonstration amorcées.")



async def _migrer_colonnes() -> None:
    """Ajoute les colonnes récentes aux bases déjà créées (ALTER TABLE idempotent)."""
    from sqlalchemy import text as _sa_text
    ajouts = [
        ("vision_profiles", "objectif_3ans", "VARCHAR(300)"),
        ("vision_profiles", "echeance_3ans", "VARCHAR(10)"),
        ("vision_profiles", "debut_3ans", "VARCHAR(10)"),
        ("vision_profiles", "contexte_metier", "JSON"),
        ("users", "role", "VARCHAR(20) DEFAULT 'client'"),
        ("users", "credits", "INTEGER DEFAULT 0"),
    ]
    for table, col, typ in ajouts:
        try:
            async with engine.begin() as conn:
                await conn.execute(_sa_text(f"ALTER TABLE {table} ADD COLUMN {col} {typ}"))
            logger.info("Migration : colonne %s.%s ajoutée", table, col)
        except Exception:  # colonne déjà présente
            pass


# ─────────────────────────── App ───────────────────────────

# ─────────────── Connexions externes (WhatsApp Web via microservice QR) ───────────────
# Porté depuis app-main (connections.py + whatsapp_global.py + agent_webhooks.py),
# simplifié pour le mono-compte Zayado : pas de couche multi-agent/token, le
# microservice WhatsApp-service est appelé directement pour l'utilisateur courant, et
# les messages entrants sont traités par le même moteur IA que le Copilote.

async def _get_connection(db: AsyncSession, provider: str, uid: Optional[str] = None) -> Optional[UserConnection]:
    uid = uid if uid is not None else _uid()
    return (await db.execute(
        select(UserConnection).where(UserConnection.user_id == uid, UserConnection.provider == provider,
                                      UserConnection.revoked_at.is_(None))
    )).scalar_one_or_none()


def _connection_json(c: UserConnection) -> dict:
    return {"id": c.id, "provider": c.provider, "label": c.label, "status": c.status,
            "phone_number": c.phone_number, "created_at": c.created_at.isoformat() if c.created_at else None}


@api.get("/connections")
async def list_connections(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(UserConnection).where(UserConnection.user_id == _uid(), UserConnection.revoked_at.is_(None))
    )).scalars().all()
    return [_connection_json(c) for c in rows]


@api.post("/connections/whatsapp/start")
async def whatsapp_start(db: AsyncSession = Depends(get_db)):
    """Démarre (ou récupère) la session WhatsApp Web du microservice et
    renvoie le QR code à scanner, ou le statut si déjà connecté."""
    if not WA_SERVICE_SECRET:
        raise HTTPException(500, "WA_SERVICE_SECRET non configurée côté backend.")
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(
                f"{WA_SERVICE_URL}/session/start",
                headers={"x-service-secret": WA_SERVICE_SECRET},
                json={"agent_id": _uid(), "agent_webhook_token": "kairos-mono"},
            )
            data = r.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("WhatsApp-service injoignable : %s", e)
        raise HTTPException(502, "Le service WhatsApp est injoignable pour le moment.")

    conn = await _get_connection(db, "whatsapp")
    if not conn:
        conn = UserConnection(user_id=_uid(), provider="whatsapp", label="WhatsApp Web")
        db.add(conn)
    conn.status = data.get("status", "error")
    await db.commit()
    return data


@api.get("/connections/whatsapp/status")
async def whatsapp_status(db: AsyncSession = Depends(get_db)):
    conn = await _get_connection(db, "whatsapp")
    if not conn:
        return {"status": "disconnected"}
    return _connection_json(conn)


@api.post("/webhooks/whatsapp-web")
async def whatsapp_web_message(request: Request, db: AsyncSession = Depends(get_db)):
    """Appelé par le microservice WhatsApp-service à chaque message reçu.
    Génère la réponse avec le même moteur IA que le Copilote (contexte
    utilisateur inclus) et la renvoie pour que le microservice la poste
    sur WhatsApp."""
    if WA_SERVICE_SECRET and request.headers.get("x-service-secret", "") != WA_SERVICE_SECRET:
        raise HTTPException(401, "Non autorisé")
    body = await request.json()
    message = (body.get("message") or "").strip()
    if not message:
        return {"ok": True}

    # Pas de JWT sur cet appel (serveur-à-serveur, secret de service
    # uniquement) : l'identité vient de agent_id, transmis par le
    # microservice — c'est l'uid qu'on lui avait donné dans /session/start.
    uid = body.get("agent_id") or DEMO_USER_ID
    contexte = await _contexte(db, uid)
    systeme = (f"{SYSTEM_PROMPT}\n\n--- Contexte de l'utilisatrice ---\n{contexte}"
               "\n\nTu réponds ici sur WhatsApp : reste concise (quelques phrases), pas de markdown.")
    try:
        client = _client_llm(f"whatsapp-{uid}", systeme)
        if client is None:
            raise RuntimeError("MAMMOTH_API_KEY absente")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=message)), timeout=45)
        reply = str(texte).strip()
    except Exception as e:  # noqa: BLE001
        logger.warning("Réponse WhatsApp IA indisponible (%s) — repli local", e)
        reply = _repli(message)

    try:
        db.add(VisionChatMessage(user_id=uid, role="user", contenu=f"[WhatsApp] {message}"))
        db.add(VisionChatMessage(user_id=uid, role="assistant", contenu=reply))
        await db.commit()
    except Exception as e:  # noqa: BLE001
        logger.warning("Historique WhatsApp non enregistré : %s", e)

    return {"reply": reply}


@api.post("/webhooks/whatsapp-web-ready")
async def whatsapp_web_ready(request: Request, db: AsyncSession = Depends(get_db)):
    """Appelé par le microservice quand le QR a été scanné et la session est active."""
    if WA_SERVICE_SECRET and request.headers.get("x-service-secret", "") != WA_SERVICE_SECRET:
        raise HTTPException(401, "Non autorisé")
    body = await request.json()
    wa_uid = body.get("agent_id") or DEMO_USER_ID
    conn = await _get_connection(db, "whatsapp", uid=wa_uid)
    if not conn:
        conn = UserConnection(user_id=wa_uid, provider="whatsapp", label="WhatsApp Web")
        db.add(conn)
    conn.status = "ready"
    conn.phone_number = body.get("phone_number")
    await db.commit()
    logger.info("WhatsApp Web connecté — numéro %s", conn.phone_number)
    return {"ok": True}


# ─────────────── Telegram (ajouté — porté depuis app-main/agent_webhooks.py) ───────────────
# Plus simple que WhatsApp : API officielle Telegram, pas de microservice,
# pas de QR code. Un token de bot par compte, webhook Telegram pointé
# directement sur /api/webhooks/telegram/{uid} (Telegram n'envoie pas de
# JWT — l'identité du compte vient de l'uid dans l'URL du webhook).

BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", "")


class TelegramConnectIn(BaseModel):
    bot_token: str = Field(min_length=10, max_length=200)


@api.post("/connections/telegram/connect")
async def telegram_connect(body: TelegramConnectIn, db: AsyncSession = Depends(get_db)):
    """Vérifie le token du bot (@BotFather) auprès de Telegram, règle le
    webhook, puis enregistre la connexion pour le compte courant."""
    uid = _uid()
    token = body.bot_token.strip()
    if not BACKEND_PUBLIC_URL:
        raise HTTPException(500, "BACKEND_PUBLIC_URL non configurée côté backend (nécessaire pour le webhook Telegram).")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            info = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            if not info.json().get("ok"):
                raise HTTPException(400, "Token de bot Telegram invalide.")
            bot_username = info.json()["result"].get("username")

            hook_url = f"{BACKEND_PUBLIC_URL}/api/webhooks/telegram/{uid}"
            hook = await client.post(f"https://api.telegram.org/bot{token}/setWebhook", json={"url": hook_url})
            if not hook.json().get("ok"):
                raise HTTPException(502, "Impossible de configurer le webhook Telegram.")
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.warning("Connexion Telegram échouée : %s", e)
        raise HTTPException(502, "Telegram est injoignable pour le moment.")

    conn = await _get_connection(db, "telegram", uid=uid)
    if not conn:
        conn = UserConnection(user_id=uid, provider="telegram")
        db.add(conn)
    conn.label = f"@{bot_username}" if bot_username else "Bot Telegram"
    conn.status = "ready"
    conn.credentials_enc = _chiffrer(json.dumps({"bot_token": token}))
    await db.commit()
    return {"status": "ready", "label": conn.label}


@api.get("/connections/telegram/status")
async def telegram_status(db: AsyncSession = Depends(get_db)):
    conn = await _get_connection(db, "telegram")
    if not conn:
        return {"status": "disconnected"}
    return _connection_json(conn)


def _md_vers_html(t: str) -> str:
    """Telegram sans parse_mode affiche les ** en brut — conversion minimale en HTML."""
    t = escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<!\w)\*([^*\n]+)\*(?!\w)", r"<i>\1</i>", t)
    return t


async def _tg_send(token: str, chat_id, texte: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            await c.post(f"https://api.telegram.org/bot{token}/sendMessage",
                         json={"chat_id": chat_id, "text": _md_vers_html(texte),
                               "parse_mode": "HTML", "disable_web_page_preview": True})
    except Exception as e:  # noqa: BLE001
        logger.error("Envoi Telegram échoué : %s", e)


@api.post("/webhooks/telegram/{uid}")
async def telegram_webhook(uid: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Appelé par Telegram à chaque message reçu par le bot du compte `uid`."""
    conn = await _get_connection(db, "telegram", uid=uid)
    if not conn or not conn.credentials_enc:
        return {"ok": True}
    try:
        token = json.loads(_dechiffrer(conn.credentials_enc))["bot_token"]
    except Exception:  # noqa: BLE001
        return {"ok": True}

    update = await request.json()
    msg = update.get("message") or update.get("edited_message") or {}
    chat_id = (msg.get("chat") or {}).get("id")
    text = (msg.get("text") or "").strip()
    if not chat_id or not text:
        return {"ok": True}

    front = os.environ.get("FRONTEND_PUBLIC_URL", "").rstrip("/")

    # /start : accueil propre + porte d'entrée vers l'app
    if text.lower().startswith("/start"):
        await _tg_send(token, chat_id,
                       "Bienvenue — je suis Zayado, ton copilote apaisé.\n\n"
                       "Demande-moi une micro-action douce, un point sur tes objectifs, ou dis-moi simplement "
                       "ce que tu veux avancer. Tout se retrouve dans ton app : " + f"{front}/app")
        return {"ok": True}

    # « dans l'app » : on crée VRAIMENT la micro-action proposée comme tâche du jour
    if re.search(r"(dans|sur) l['’ \-]ap+p", text.lower()):
        derniers = (await db.execute(
            select(VisionChatMessage)
            .where(VisionChatMessage.user_id == uid, VisionChatMessage.role == "assistant")
            .order_by(VisionChatMessage.created_at.desc()).limit(5))).scalars()
        titre = "Micro-action proposée par Zayado"
        for last in derniers:
            if not last or not last.contenu:
                continue
            if re.search(r"je ne (peux|sais|vois)", last.contenu.lower()):
                continue
            brut = re.sub(r"\*+", "", last.contenu)
            premiere = next((l.strip() for l in brut.splitlines() if l.strip() and not l.strip().endswith("?")), "")
            if premiere:
                titre = premiere[:90]
                break
        db.add(VisionTache(user_id=uid, titre=titre, duree_min=5, micro=True, statut="a_faire"))
        db.add(VisionChatMessage(user_id=uid, role="user", contenu=f"[Telegram] {text}"))
        reply = (f"C'est noté — je l'ai ajoutée à tes priorités du jour :\n**{titre}**\n\n"
                 f"Tu la retrouves ici : {front}/app")
        db.add(VisionChatMessage(user_id=uid, role="assistant", contenu=reply))
        await db.commit()
        await _tg_send(token, chat_id, reply)
        return {"ok": True}

    oui = re.fullmatch(r"(oui|oui stp|ouip|ok|okay|vas[- ]y|go|dac|d['’]accord|yes|yep|je valide|c['’]est parti)[ .!]*", text.lower())

    # « c'est fait » (sans « ? ») : la dernière action ouverte passe en accomplie
    if re.fullmatch(r"c['’]est fait[ .!]*", text.lower()):
        tache = (await db.execute(
            select(VisionTache).where(VisionTache.user_id == uid, VisionTache.statut == "a_faire")
            .order_by(VisionTache.created_at.desc()).limit(1))).scalar_one_or_none()
        if tache:
            tache.statut = "fait"
            reply = f"Bien joué — **{tache.titre}** est bouclée. Une action de plus, en douceur."
        else:
            reply = "Bien joué ! Rien d'ouvert à clôturer pour l'instant — profite de ce souffle."
        db.add(VisionChatMessage(user_id=uid, role="user", contenu=f"[Telegram] {text}"))
        db.add(VisionChatMessage(user_id=uid, role="assistant", contenu=reply))
        await db.commit()
        await _tg_send(token, chat_id, reply)
        return {"ok": True}

    # « oui » juste après une proposition : on agit selon la QUESTION posée
    if oui:
        last = (await db.execute(
            select(VisionChatMessage).where(VisionChatMessage.user_id == uid, VisionChatMessage.role == "assistant")
            .order_by(VisionChatMessage.created_at.desc()).limit(1))).scalar_one_or_none()
        if last and last.contenu and "?" in last.contenu:
            questions = " ".join(l.strip() for l in last.contenu.splitlines() if "?" in l).lower()
            brut = re.sub(r"\*+", "", last.contenu)
            gras = re.findall(r"\*\*(.+?)\*\*", last.contenu)
            titre_prop = (gras[0].strip()[:90] if gras else
                          next((l.strip()[2:].strip()[:90] for l in brut.splitlines() if l.strip().startswith("- ") and "?" not in l), None) or
                          next((l.strip()[:90] for l in brut.splitlines() if l.strip() and "?" not in l and not l.strip().endswith(":")), "Proposition de Zayado"))
            if re.search(r"(t[âa]che|micro-action|board|tracker)", questions):
                db.add(VisionTache(user_id=uid, titre=titre_prop, duree_min=5, micro=True, statut="a_faire"))
                reply = f"C'est fait — **{titre_prop}** est dans tes priorités du jour. Tu la retrouves ici : {front}/app"
            elif re.search(r"(valides|valider|j['’]active|on active|je lance)", questions):
                db.add(CopiloteDecision(user_id=uid, titre=titre_prop, note=brut[:500],
                                        statut="approuvee", canal="telegram", origine="telegram",
                                        decided_at=datetime.now(timezone.utc)))
                reply = (f"Validé — j'ai enregistré ta décision :\n**{titre_prop}**\n\n"
                         f"Elle est aussi dans l'app, onglet décisions : {front}/app")
            else:
                last = None
            if last:
                db.add(VisionChatMessage(user_id=uid, role="user", contenu=f"[Telegram] {text}"))
                db.add(VisionChatMessage(user_id=uid, role="assistant", contenu=reply))
                await db.commit()
                await _tg_send(token, chat_id, reply)
                return {"ok": True}

    # Fil de conversation injecté (sinon chaque message repart de zéro)
    histo = list((await db.execute(
        select(VisionChatMessage).where(VisionChatMessage.user_id == uid)
        .order_by(VisionChatMessage.created_at.desc()).limit(8))).scalars())
    histo_txt = "\n".join(
        ("Utilisateur : " if m.role == "user" else "Toi : ") + m.contenu[:400] for m in reversed(histo))

    contexte = await _contexte(db, uid)
    systeme = (f"{SYSTEM_PROMPT}\n\n--- Contexte de l'utilisatrice ---\n{contexte}"
               + (f"\n\n--- Conversation récente (pour suivre le fil, ne pas répéter) ---\n{histo_txt}" if histo_txt else "")
               + "\n\nTu réponds sur Telegram : aère — une courte accroche, des puces (- ...), du **gras** pour l'essentiel, une seule question finale. Jamais de pavé.")
    try:
        client = _client_llm(f"telegram-{uid}", systeme)
        if client is None:
            raise RuntimeError("MAMMOTH_API_KEY absente")
        from llm_mammouth import UserMessage
        texte = await asyncio.wait_for(client.send_message(UserMessage(text=text)), timeout=45)
        reply = str(texte).strip()
    except Exception as e:  # noqa: BLE001
        logger.warning("Réponse Telegram IA indisponible (%s) — repli local", e)
        reply = _repli(text)

    await _tg_send(token, chat_id, reply)

    try:
        db.add(VisionChatMessage(user_id=uid, role="user", contenu=f"[Telegram] {text}"))
        db.add(VisionChatMessage(user_id=uid, role="assistant", contenu=reply))
        await db.commit()
    except Exception as e:  # noqa: BLE001
        logger.warning("Historique Telegram non enregistré : %s", e)

    return {"ok": True}


app = FastAPI(title="Zayado — espace privé")
# ─────────────────────────── Roadmap publique / admin ───────────────────────────

ADMIN_EMAILS = {"thomas@zayado.net", "admin@zayado.net"}
ROADMAP_SEED = [
    {"quarter": "Q3 2025", "title": "Vision Board — drag/rotate/resize", "desc": "Cartes libres, post-its colorés, polaroïds épinglés", "status": "done", "visible": True},
    {"quarter": "Q3 2025", "title": "Copilote IA — ton apaisé", "desc": "Point du jour, décisions à valider, veille éco", "status": "done", "visible": True},
    {"quarter": "Q3 2025", "title": "Mon Refuge — récupération", "desc": "Respirations guidées, journal court, mode Élan/Refuge", "status": "done", "visible": True},
    {"quarter": "Q4 2025", "title": "Roadmap collaborative", "desc": "Roadmap publique + demandes du Collaborateur", "status": "wip", "visible": True},
    {"quarter": "Q4 2025", "title": "Pricing + Mollie Checkout", "desc": "3 plans START/GROW/SERENITY + toggle annuel -20%", "status": "wip", "visible": True},
    {"quarter": "Q4 2025", "title": "Emails Brevo (bienvenue, digest)", "desc": "Onboarding, rappels hebdo, digest apaisé", "status": "wip", "visible": True},
    {"quarter": "Q4 2025", "title": "App mobile — préview responsive", "desc": "Cockpit optimisé mobile, capture voix", "status": "planned", "visible": True},
    {"quarter": "Q1 2026", "title": "WhatsApp bot — validation à distance", "desc": "Approuver une décision par WhatsApp", "status": "planned", "visible": True},
    {"quarter": "Q1 2026", "title": "Capture vocale → Vision Board", "desc": "Note vocale transcrit et posé sur le board", "status": "planned", "visible": True},
    {"quarter": "Q1 2026", "title": "Countdown widget (objectif 3 ans)", "desc": "Un compteur épinglé qui pulse une pression saine", "status": "planned", "visible": True},
    {"quarter": "Q2 2026", "title": "Instance dédiée entreprise", "desc": "Espace privé cabinet / studio", "status": "planned", "visible": False},
    {"quarter": "Q2 2026", "title": "Marketplace collaborateurs Zayado", "desc": "Faire faire par des experts humains sélectionnés", "status": "planned", "visible": False},
]


class RoadmapPublic(Base):
    __tablename__ = "roadmap_public"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quarter: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    desc: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="planned")  # planned / wip / done
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


def _is_admin(request: Request) -> bool:
    """Admin = jeton JWT avec le rôle admin, ou clé ADMIN_KEY (variable
    d'environnement, sans valeur par défaut). Corrigé : l'en-tête
    x-user-email et la clé écrite en dur suffisaient à devenir admin."""
    if _role_courant() == "admin" and _uid() != DEMO_USER_ID:
        return True
    cle_attendue = os.environ.get("ADMIN_KEY", "")
    key = request.headers.get("x-admin-key", "")
    import hmac
    return bool(cle_attendue) and len(key) >= 16 and hmac.compare_digest(key, cle_attendue)


@api.get("/roadmap")
async def get_public_roadmap(request: Request, db: AsyncSession = Depends(get_db)):
    admin = _is_admin(request)
    q = select(RoadmapPublic).order_by(RoadmapPublic.quarter, RoadmapPublic.position, RoadmapPublic.created_at)
    if not admin:
        q = q.where(RoadmapPublic.visible == True)  # noqa: E712
    rows = (await db.execute(q)).scalars().all()
    return {
        "admin": admin,
        "items": [
            {"id": r.id, "quarter": r.quarter, "title": r.title, "desc": r.desc,
             "status": r.status, "visible": r.visible} for r in rows
        ],
    }


class RoadmapItemIn(BaseModel):
    quarter: str
    title: str
    desc: str = ""
    status: str = "planned"
    visible: bool = True


@api.post("/roadmap")
async def create_public_roadmap(payload: RoadmapItemIn, request: Request, db: AsyncSession = Depends(get_db)):
    if not _is_admin(request):
        raise HTTPException(403, "admin only")
    row = RoadmapPublic(**payload.dict())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "quarter": row.quarter, "title": row.title, "desc": row.desc,
            "status": row.status, "visible": row.visible}


@api.patch("/roadmap/{item_id}")
async def update_public_roadmap(item_id: str, payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    if not _is_admin(request):
        raise HTTPException(403, "admin only")
    row = (await db.execute(select(RoadmapPublic).where(RoadmapPublic.id == item_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "not found")
    for k in ("quarter", "title", "desc", "status", "visible", "position"):
        if k in payload:
            setattr(row, k, payload[k])
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


@api.delete("/roadmap/{item_id}")
async def delete_public_roadmap(item_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    if not _is_admin(request):
        raise HTTPException(403, "admin only")
    await db.execute(sa_delete(RoadmapPublic).where(RoadmapPublic.id == item_id))
    await db.commit()
    return {"ok": True}


async def _seed_roadmap():
    async with async_session() as db:
        count = (await db.execute(select(RoadmapPublic))).scalars().first()
        if count:
            return
        for i, item in enumerate(ROADMAP_SEED):
            db.add(RoadmapPublic(position=i, **item))
        await db.commit()
        logger.info("Roadmap publique amorcée (%d items).", len(ROADMAP_SEED))


# ─────────────────────────── Brevo — inscription apaisée ───────────────────────────

class SubscribeIn(BaseModel):
    email: str
    source: str = "landing"


async def _send_welcome_email(to_email: str) -> dict:
    api_key = os.environ.get("BREVO_API_KEY", "")
    sender = os.environ.get("BREVO_SENDER_EMAIL", "noreply@zayado.net")
    if not api_key:
        return {"ok": False, "reason": "missing_key"}
    payload = {
        "sender": {"email": sender, "name": "Zayado"},
        "to": [{"email": to_email}],
        "subject": "Bienvenue dans Zayado — respire, on avance ensemble.",
        "htmlContent": (
            "<div style=\"font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #0B1F3A;\">"
            "<div style=\"font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: #DEC2A3; margin-bottom: 12px;\">Zayado</div>"
            "<h1 style=\"font-family: Georgia, serif; font-size: 28px; line-height: 1.15; margin: 0 0 16px;\">"
            "Bienvenue. <em style=\"color:#DEC2A3;\">On avance doucement.</em></h1>"
            "<p style=\"font-size: 15.5px; line-height: 1.6; color: #4a5568;\">"
            "Merci de rejoindre les 240+ entrepreneurs qui pilotent leur activité sans y laisser leur énergie."
            "</p>"
            "<p style=\"font-size: 15.5px; line-height: 1.6; color: #4a5568;\">"
            "Voici ce qui t'attend : ton cockpit apaisé, ton Vision Board, ton Copilote IA au ton doux, et Mon Refuge quand tu n'en peux plus."
            "</p>"
            "<div style=\"margin: 32px 0;\">"
            "<a href=\"https://app.zayado.net/onboarding\" style=\"display: inline-block; background: #DEC2A3; color: #0B1F3A; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-family: -apple-system, sans-serif;\">Commencer mon onboarding</a>"
            "</div>"
            "<p style=\"font-size: 13px; line-height: 1.6; color: #718096; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;\">"
            "Trois priorités. Un ton doux. Une vraie boussole.<br>— L'équipe Zayado, Paris"
            "</p></div>"
        ),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post("https://api.brevo.com/v3/smtp/email", json=payload,
                              headers={"api-key": api_key, "content-type": "application/json"})
    if r.status_code >= 400:
        logger.warning("Brevo send failed %s: %s", r.status_code, r.text[:200])
        return {"ok": False, "status": r.status_code}
    return {"ok": True, "id": r.json().get("messageId")}


# ─────────────────────────── Roadmap publique / admin ───────────────────────────


@api.post("/subscribe")
async def subscribe(payload: SubscribeIn):
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "invalid_email")
    result = await _send_welcome_email(email)
    return {"ok": True, "email_sent": result.get("ok", False)}


@api.get("/unsplash")
async def unsplash_search(q: str, count: int = 9):
    key = os.environ.get("UNSPLASH_ACCESS_KEY", "")
    if not key or not q.strip():
        # Fallback: static curated Unsplash URLs based on keyword
        seeds = ["nature", "business", "family", "success", "travel", "wellness", "coffee", "office", "team"]
        images = [{
            "id": f"stub_{i}",
            "url": f"https://images.unsplash.com/photo-{seed}?w=800&q=60",
            "thumb": f"https://source.unsplash.com/300x300/?{q or seeds[i % len(seeds)]}",
            "author": "Unsplash",
        } for i, seed in enumerate(seeds[:count])]
        return {"images": images, "fallback": True}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": q, "per_page": min(count, 20)},
                headers={"Authorization": f"Client-ID {key}"},
            )
        if r.status_code >= 400:
            raise HTTPException(502, f"unsplash_error: {r.status_code}")
        data = r.json()
        images = [{
            "id": p.get("id"),
            "url": p.get("urls", {}).get("regular"),
            "thumb": p.get("urls", {}).get("thumb"),
            "author": (p.get("user") or {}).get("name") or "Unsplash",
        } for p in data.get("results", [])]
        return {"images": images}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Unsplash search failed: %s", e)
        return {"images": [], "error": str(e)[:120]}


# ─────────── Intégrations : statut agrégé + tokens custom ───────────
INTEGRATIONS_CATALOG = [
    {"id": "emergent_llm", "name": "Emergent LLM (Claude, GPT, Gemini)", "cat": "IA", "env": ["EMERGENT_LLM_KEY"], "onboardable": True},
    {"id": "mammouth",     "name": "Mammouth AI (IA texte de Zayado)", "cat": "IA", "env": ["MAMMOTH_API_KEY"], "onboardable": True},
    {"id": "unsplash",     "name": "Unsplash (images)",     "cat": "IA",         "env": ["UNSPLASH_ACCESS_KEY"], "onboardable": False},
    {"id": "google",       "name": "Google (Auth + Drive)", "cat": "Stockage",   "env": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "onboardable": True, "oauth": True},
    {"id": "microsoft",    "name": "Microsoft (Auth + SharePoint / OneDrive)", "cat": "Stockage", "env": ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"], "onboardable": True, "oauth": True},
    {"id": "mollie",       "name": "Mollie (paiement)",     "cat": "Paiement",   "env": ["MOLLIE_API_KEY"], "onboardable": False},
    {"id": "brevo",        "name": "Brevo (email)",         "cat": "Comms",      "env": ["BREVO_API_KEY"], "onboardable": False},
    {"id": "whatsapp",     "name": "WhatsApp (Railway)",    "cat": "Comms",      "env": ["WA_SERVICE_URL", "WA_SERVICE_SECRET"], "onboardable": False},
    {"id": "telegram",     "name": "Telegram (BotFather)",  "cat": "Comms",      "env": ["TELEGRAM_BOT_TOKEN"], "onboardable": False},
    {"id": "qonto",        "name": "Qonto (banque pro)",    "cat": "Banque",     "env": ["QONTO_LOGIN", "QONTO_SECRET_KEY"], "onboardable": True},
    {"id": "pennylane",    "name": "Pennylane (compta + banque)", "cat": "Banque", "env": ["PENNYLANE_API_KEY"], "onboardable": True},
    {"id": "hubspot",      "name": "HubSpot (CRM)",         "cat": "CRM",        "env": ["HUBSPOT_ACCESS_TOKEN"], "onboardable": True},
    {"id": "odoo",         "name": "Odoo (ERP + CRM)",      "cat": "CRM",        "env": ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_PASSWORD"], "onboardable": False},
    {"id": "slack",        "name": "Slack (équipe)",        "cat": "CRM",        "env": ["SLACK_BOT_TOKEN"], "onboardable": False},
    {"id": "teams",        "name": "Microsoft Teams",       "cat": "CRM",        "env": ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"], "onboardable": False, "oauth": True, "shares_with": "microsoft"},
    {"id": "trello",       "name": "Trello (kanban)",       "cat": "CRM",        "env": ["TRELLO_API_KEY", "TRELLO_TOKEN"], "onboardable": False},
    {"id": "jira",         "name": "Jira (projets)",        "cat": "CRM",        "env": ["JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"], "onboardable": False},
]


class IntegrationTokenIn(BaseModel):
    provider: str
    values: dict


@api.get("/integrations/status")
async def integrations_status():
    """Retourne la liste des intégrations + un flag `configured` selon les .env."""
    items = []
    for spec in INTEGRATIONS_CATALOG:
        configured = all(os.environ.get(k) for k in spec.get("env", []))
        items.append({
            "id": spec["id"], "name": spec["name"], "category": spec["cat"],
            "configured": configured, "onboardable": spec.get("onboardable", False),
            "oauth": spec.get("oauth", False),
        })
    return {"integrations": items}


@api.post("/integrations/save")
async def integrations_save(body: IntegrationTokenIn):
    """Ecrit/écrase les variables d'env liées à un provider (session en cours, non persistant).
    Pour la persistance, écrivez les valeurs dans backend/.env via le panneau Secrets après deploy.
    """
    spec = next((s for s in INTEGRATIONS_CATALOG if s["id"] == body.provider), None)
    if not spec:
        raise HTTPException(404, "integration_not_found")
    for k, v in body.values.items():
        if k in spec["env"] and isinstance(v, str) and v.strip():
            os.environ[k] = v.strip()
    return {"ok": True, "provider": body.provider, "configured": all(os.environ.get(k) for k in spec["env"])}


class DocumentAutoSaveIn(BaseModel):
    title: str
    content: str
    provider: Optional[str] = None


async def _cloud_token(db: AsyncSession, provider: str) -> tuple[str, UserConnection]:
    key = "google_drive" if provider == "google" else "microsoft_drive"
    conn = await _get_connection(db, key)
    if not conn or conn.status != "ready" or not conn.credentials_enc:
        raise HTTPException(409, "cloud_not_connected")
    credentials = json.loads(_dechiffrer(conn.credentials_enc))
    if credentials.get("expires_at", 0) <= time.time() and credentials.get("refresh_token"):
        cid = os.environ.get(f"{provider.upper()}_CLIENT_ID")
        csecret = os.environ.get(f"{provider.upper()}_CLIENT_SECRET")
        if not cid or not csecret:
            raise HTTPException(503, "cloud_refresh_not_configured")
        async with httpx.AsyncClient(timeout=15) as client:
            if provider == "google":
                refreshed = await client.post("https://oauth2.googleapis.com/token", data={
                    "client_id": cid, "client_secret": csecret, "refresh_token": credentials["refresh_token"],
                    "grant_type": "refresh_token",
                })
            else:
                tenant = os.environ.get("MICROSOFT_TENANT", "common")
                refreshed = await client.post(f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", data={
                    "client_id": cid, "client_secret": csecret, "refresh_token": credentials["refresh_token"],
                    "grant_type": "refresh_token", "scope": "Files.ReadWrite offline_access",
                })
        refreshed.raise_for_status()
        fresh = refreshed.json()
        credentials.update({"access_token": fresh["access_token"], "expires_at": time.time() + int(fresh.get("expires_in", 3600))})
        if fresh.get("refresh_token"):
            credentials["refresh_token"] = fresh["refresh_token"]
        conn.credentials_enc = _chiffrer(json.dumps(credentials))
        await db.commit()
    return credentials["access_token"], conn


@api.post("/documents/auto-save")
async def auto_save_document(body: DocumentAutoSaveIn, db: AsyncSession = Depends(get_db)):
    """Enregistre un document IA dans le cloud choisi par l’utilisateur.

    Cette route ne s’exécute que lorsqu’un réglage d’auto-enregistrement est
    activé côté profil et qu’une connexion OAuth Drive/OneDrive existe.
    """
    profile = await _profil(db, _uid())
    context = profile.contexte_metier or {}
    if context.get("auto_save_documents") is not True:
        return {"ok": True, "skipped": True, "reason": "auto_save_disabled"}
    provider = (body.provider or context.get("document_provider") or "google").lower()
    if provider not in ("google", "microsoft"):
        raise HTTPException(422, "unsupported_cloud_provider")
    token, _ = await _cloud_token(db, provider)
    filename = re.sub(r"[^a-zA-Z0-9._-]+", "-", body.title.strip() or "document")[:120] + ".md"
    async with httpx.AsyncClient(timeout=30) as client:
        if provider == "google":
            metadata = {"name": filename, "mimeType": "text/markdown"}
            response = await client.post(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
                headers={"Authorization": f"Bearer {token}"},
                files={
                    "metadata": ("metadata.json", json.dumps(metadata), "application/json"),
                    "file": (filename, body.content.encode("utf-8"), "text/markdown"),
                },
            )
        else:
            path = quote(f"Zayado/{filename}", safe="/")
            response = await client.put(
                f"https://graph.microsoft.com/v1.0/me/drive/root:/{path}:/content",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "text/markdown"},
                content=body.content.encode("utf-8"),
            )
    if response.status_code >= 400:
        logger.warning("Cloud document upload failed (%s): %s", response.status_code, response.text[:300])
        raise HTTPException(response.status_code, "cloud_upload_failed")
    data = response.json()
    return {"ok": True, "provider": provider, "name": filename, "id": data.get("id"),
            "url": data.get("webViewLink") or data.get("webUrl")}




# ─────────────────────────── Roadmap publique / admin (endpoints) ───────────────────

PRICING = {
    # Grille 2026 (prix HT) — alignée sur frontend/src/lib/plans.js.
    # Les clés restent les mêmes (abonnements existants, Mollie) ; seuls les
    # libellés et montants changent. Annuel ≈ 2 mois offerts.
    # Abonnés existants : ils gardent leur ancien prix tant que leur abonnement court.
    "essentielle": {"label": "Découverte", "mensuel": 0.0, "annuel": 0.0, "desc": "Cockpit du jour, 1 Vision Board, check-in, 20 questions IA / mois"},
    "serenite": {"label": "Solo", "mensuel": 24.0, "annuel": 228.0, "desc": "Cockpit complet : Copilote IA, Radar, Pouls Business, Vision Boards illimités"},
    "pro": {"label": "Pro", "mensuel": 69.0, "annuel": 708.0, "desc": "Solo + chatbot client à ta marque, documents IA, alertes WhatsApp/Telegram"},
    "business": {"label": "Équipe", "mensuel": 149.0, "annuel": 1548.0, "desc": "Pro + 3 comptes, 3 chatbots, chatbot sur tes documents"},
    # Entreprise : devis avec plancher, clé IA personnelle possible.
    "entreprise": {"label": "Entreprise", "mensuel": None, "annuel": None, "plancher": 299.0, "desc": "Équipe + comptes et chatbots illimités, sur devis, clé IA personnelle possible"},
}


class CheckoutIn(BaseModel):
    plan: str
    cycle: str  # 'mensuel' or 'annuel'
    email: Optional[str] = None


class LeadIn(BaseModel):
    email: str
    source: str = "inconnue"


@api.post("/leads")
async def capturer_lead(body: LeadIn, db: AsyncSession = Depends(get_db)):
    """Capture publique — jamais d'authentification requise, c'est pour
    des visiteurs anonymes sur les pages Fonctionnalités."""
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(422, "Email invalide.")
    db.add(Lead(email=email, source=body.source[:100]))
    await db.commit()
    return {"ok": True}


# ── Partie 2 : auth obligatoire en prod, images IA, marketplace, Qonto ──
from part2_ext import install_part2  # noqa: E402
install_part2(globals())

# ── Commerce : commandes produits/services, SaaS et paiements Mollie ──
from commerce_ext import install_commerce  # noqa: E402
install_commerce(globals())

# ── Vision+ : victoires, partage public en lecture seule, e-mail du lundi ──
from vision_plus import install_vision_plus  # noqa: E402
install_vision_plus(globals())

# ─────────────── Demandes Collaborateurs (page /app/collaborateurs) ───────────────
# Corrigé : le formulaire postait vers une route inexistante et affichait
# « Demande envoyée » sans rien enregistrer.

class DemandeCollaborateur(Base):
    __tablename__ = "demandes_collaborateur"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    message: Mapped[str] = mapped_column(Text)
    contact: Mapped[str] = mapped_column(String(255), default="")
    canal: Mapped[str] = mapped_column(String(50), default="collaborateur")
    statut: Mapped[str] = mapped_column(String(20), default="nouvelle")  # nouvelle / traitee
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class DemandeCollaborateurIn(BaseModel):
    message: str
    contact: str = ""
    channel: str = "collaborateur"


@api.post("/growth/work-request")
async def creer_demande_collaborateur(body: DemandeCollaborateurIn, db: AsyncSession = Depends(get_db)):
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(422, "Le message est vide.")
    uid = _uid()
    profil = await _profil(db, uid)
    d = DemandeCollaborateur(user_id=uid, message=message[:5000], contact=(body.contact or "").strip()[:255],
                             canal=(body.channel or "collaborateur")[:50])
    db.add(d)
    await db.commit()
    # Notification e-mail à l'équipe (best effort : la demande est déjà enregistrée).
    dest = os.environ.get("NOTIF_EMAIL", "contact@zayado.net")
    try:
        import html as _html
        await send_email(to=dest, subject="Nouvelle demande Collaborateurs",
                         html=(f"<p><b>De :</b> {_html.escape(profil.prenom or '')} {_html.escape(profil.email or '')}</p>"
                               f"<p><b>Contact indiqué :</b> {_html.escape(d.contact or '—')}</p>"
                               f"<p>{_html.escape(d.message).replace(chr(10), '<br>')}</p>"))
    except Exception:  # noqa: BLE001
        logger.warning("Notification e-mail de la demande collaborateur non envoyée.")
    return {"ok": True, "id": d.id}


@api.get("/admin/demandes-collaborateur")
async def admin_demandes_collaborateur(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    rows = (await db.execute(select(DemandeCollaborateur).order_by(DemandeCollaborateur.created_at.desc()).limit(200))).scalars().all()
    return {"demandes": [{"id": r.id, "user_id": r.user_id, "message": r.message, "contact": r.contact,
                          "statut": r.statut, "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]}


# ─────────────── Récupération des données du compte démo ───────────────
# Avant le verrou d'authentification, les requêtes sans jeton étaient rangées
# dans le compte DEMO_USER_ID. Ces deux routes admin permettent de voir ce
# qu'il contient et de transférer ces lignes vers un vrai compte.

def _tables_avec_user_id():
    return [t for t in Base.metadata.sorted_tables if "user_id" in t.c]


def _user_id_unique(table) -> bool:
    col = table.c.user_id
    if col.unique:
        return True
    return any(getattr(c, "columns", None) is not None and list(c.columns) == [col] for c in table.constraints
               if c.__class__.__name__ == "UniqueConstraint")


@api.get("/admin/compte-demo")
async def admin_compte_demo(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
    """Nombre de lignes rattachées au compte démo, table par table, avec un aperçu."""
    resultat = []
    for t in _tables_avec_user_id():
        n = (await db.execute(select(func.count()).select_from(t).where(t.c.user_id == DEMO_USER_ID))).scalar_one()
        if not n:
            continue
        cols = [c for c in t.c if c.name not in ("user_id",)][:6]
        apercu = (await db.execute(select(*cols).where(t.c.user_id == DEMO_USER_ID).limit(5))).mappings().all()
        resultat.append({"table": t.name, "lignes": n, "unique_par_utilisateur": _user_id_unique(t),
                         "apercu": [{k: (str(v)[:120] if v is not None else None) for k, v in dict(r).items()} for r in apercu]})
    return {"compte_demo": DEMO_USER_ID, "tables": resultat}


class TransfertDemoIn(BaseModel):
    email: str
    tables: Optional[list[str]] = None  # None = toutes les tables transférables


@api.post("/admin/compte-demo/transferer")
async def admin_transferer_compte_demo(body: TransfertDemoIn, db: AsyncSession = Depends(get_db),
                                       _role=Depends(exiger_role("admin"))):
    """Réattribue les lignes du compte démo au compte réel dont l'e-mail est donné.
    Les tables à une seule ligne par utilisateur (profil, réglages…) ne sont
    transférées que si le compte cible n'en a pas encore — sinon on les signale."""
    email = body.email.strip().lower()
    cible = (await db.execute(select(User).where(func.lower(User.email) == email))).scalar_one_or_none()
    if not cible:
        raise HTTPException(404, "Aucun compte avec cet e-mail.")
    choisies = set(body.tables) if body.tables else None
    transferts, ignorees = {}, {}
    for t in _tables_avec_user_id():
        if choisies is not None and t.name not in choisies:
            continue
        n = (await db.execute(select(func.count()).select_from(t).where(t.c.user_id == DEMO_USER_ID))).scalar_one()
        if not n:
            continue
        if _user_id_unique(t):
            deja = (await db.execute(select(func.count()).select_from(t).where(t.c.user_id == cible.id))).scalar_one()
            if deja:
                ignorees[t.name] = "le compte cible a déjà sa propre ligne (table 1 ligne par utilisateur)"
                continue
        await db.execute(t.update().where(t.c.user_id == DEMO_USER_ID).values(user_id=cible.id))
        transferts[t.name] = n
    await db.commit()
    logger.info("Transfert compte démo → %s : %s", cible.id, transferts)
    return {"ok": True, "vers": {"id": cible.id, "email": cible.email}, "transferes": transferts, "ignores": ignorees}


# ─────────────── Agent Business (chatbot client à la marque de l'utilisateur) ───────────────
# Configuration + test réel de conversation par l'IA, dans l'application.
# (Le widget à coller sur un site externe viendra à la mise en ligne publique.)

AGENTS_PAR_PLAN = {"pro": 1, "business": 3, "entreprise": -1}  # -1 = illimité


class AgentBusiness(Base):
    __tablename__ = "agents_business"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    nom_marque: Mapped[str] = mapped_column(String(120), default="")
    couleur: Mapped[str] = mapped_column(String(9), default="#DEC2A3")
    message_accueil: Mapped[str] = mapped_column(String(500), default="Bonjour ! Comment puis-je vous aider ?")
    ton: Mapped[str] = mapped_column(String(30), default="chaleureux")  # chaleureux / professionnel / direct
    connaissances: Mapped[str] = mapped_column(Text, default="")
    contact_humain: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


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


def _agent_dict(a: AgentBusiness) -> dict:
    return {"id": a.id, "nom_marque": a.nom_marque, "couleur": a.couleur, "message_accueil": a.message_accueil,
            "ton": a.ton, "connaissances": a.connaissances, "contact_humain": a.contact_humain,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None}


async def _quota_agents(db: AsyncSession, uid: str) -> int:
    if _role_courant() == "admin":
        return -1
    profil = await _profil(db, uid)
    return AGENTS_PAR_PLAN.get((profil.plan or "essentielle"), 0)


def _nettoyer_agent(body: AgentBusinessIn) -> dict:
    couleur = body.couleur if re.fullmatch(r"#[0-9A-Fa-f]{6}", body.couleur or "") else "#DEC2A3"
    ton = body.ton if body.ton in ("chaleureux", "professionnel", "direct") else "chaleureux"
    return {"nom_marque": (body.nom_marque or "").strip()[:120], "couleur": couleur,
            "message_accueil": (body.message_accueil or "").strip()[:500] or "Bonjour ! Comment puis-je vous aider ?",
            "ton": ton, "connaissances": (body.connaissances or "")[:30000],
            "contact_humain": (body.contact_humain or "").strip()[:255]}


async def _agent_du_proprietaire(db: AsyncSession, agent_id: str) -> AgentBusiness:
    a = await db.get(AgentBusiness, agent_id)
    if not a or a.user_id != _uid():
        raise HTTPException(404, "Agent introuvable.")
    return a


@api.get("/agent-business")
async def lister_agents_business(db: AsyncSession = Depends(get_db)):
    uid = _uid()
    rows = (await db.execute(select(AgentBusiness).where(AgentBusiness.user_id == uid)
                             .order_by(AgentBusiness.created_at))).scalars().all()
    return {"agents": [_agent_dict(a) for a in rows], "quota": await _quota_agents(db, uid)}


@api.post("/agent-business")
async def creer_agent_business(body: AgentBusinessIn, db: AsyncSession = Depends(get_db)):
    uid = _uid()
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


_TONS_AGENT = {
    "chaleureux": "chaleureux et bienveillant, en vouvoyant le client",
    "professionnel": "professionnel et précis, en vouvoyant le client",
    "direct": "direct et concis, en vouvoyant le client",
}


def _consigne_agent(a: AgentBusiness) -> str:
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
    client = _client_llm(f"agent-{a.id}-{uuid.uuid4().hex[:8]}", _consigne_agent(a))
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


@api.get("/ia/statut")
async def ia_statut():
    """L'IA texte est-elle réellement active ? (tout utilisateur connecté)

    Ajouté pour le bandeau de repli du cockpit : sans clé Mammouth, le
    Copilote, le Radar et l'Agent Business répondaient un texte générique
    sans que rien ne le signale à l'écran. Ne renvoie aucun secret —
    seulement un booléen et le nom du modèle.
    """
    from llm_mammouth import MAMMOTH_MODEL, cle_mammouth

    active = bool(cle_mammouth())
    return {
        "ia_active": active,
        "modele": MAMMOTH_MODEL if active else None,
        "message": None
        if active
        else (
            "L'IA est en mode repli : le Copilote, le Radar et l'Agent Business "
            "répondent un texte générique. Configurez MAMMOTH_API_KEY pour "
            "réactiver les réponses personnalisées."
        ),
    }


@api.get("/admin/diagnostics")
async def admin_diagnostics():
    """État de configuration des clés d'intégration — réservé aux admins.

    Ajouté après l'audit d'installation : impossible de vérifier depuis
    l'extérieur si une clé posée dans Railway est bien lue par le backend
    (les routes HeyGen sont admin-only et renvoient 401 à un anonyme, et
    l'absence de clé Mammouth ne se voyait nulle part — l'app répondait
    simplement à côté).

    Ne renvoie QUE des booléens et des valeurs non secrètes : jamais une
    clé, même tronquée.
    """
    if _role_courant() != "admin":
        raise HTTPException(403, "Réservé aux administrateurs")

    from llm_mammouth import MAMMOTH_BASE_URL, MAMMOTH_MODEL, cle_mammouth

    ia_texte_ok = bool(cle_mammouth())
    fernet_ok = bool(os.environ.get("FERNET_KEY"))
    jwt_perso = JWT_SECRET != "kairos-dev-secret-a-changer"

    cles = {
        # Sans elle : le Copilote IA, le Radar et l'Agent Business
        # répondent en repli local (texte générique) sans rien signaler.
        "ia_texte_mammouth": ia_texte_ok,
        # Sans elle : génération de vidéos IA indisponible.
        "video_heygen": bool(os.environ.get("HEYGEN_API_KEY")),
        # Sans elle : les clés d'intégration sont stockées EN CLAIR en base.
        "chiffrement_fernet": fernet_ok,
        # Un JWT_SECRET par défaut ou changeant déconnecte tous les comptes.
        "jwt_secret_personnalise": jwt_perso,
        "whatsapp": bool(os.environ.get("WA_SERVICE_SECRET")),
        "telegram": bool(os.environ.get("TELEGRAM_BOT_TOKEN")),
    }
    manquantes = sorted(k for k, v in cles.items() if not v)
    return {
        "cles": cles,
        "manquantes": manquantes,
        "pret_pour_production": not manquantes,
        "ia_texte": {
            "configuree": ia_texte_ok,
            "modele": MAMMOTH_MODEL,
            "base_url": MAMMOTH_BASE_URL,
            # Ce que verra réellement un prospect si la clé manque :
            "consequence_si_absente": (
                "Agent Business, Radar et Copilote répondent en repli local "
                "(message générique), sans erreur visible."
            ),
        },
        "require_auth": os.environ.get("REQUIRE_AUTH") == "1",
    }


app.include_router(api)
app.include_router(heygen_router, prefix="/api")
# Ordre corrigé : Starlette place le dernier middleware ajouté à
# l'EXTÉRIEUR de la pile. _AuthMiddleware doit donc être enregistré
# AVANT CORSMiddleware, sinon son 401 précoce court-circuite la pile et
# repart sans en-tête Access-Control-Allow-Origin : le navigateur affiche
# alors une erreur CORS opaque au lieu du 401 lisible « Connexion
# requise. ». CORS enregistré en dernier = CORS le plus externe = tous
# les statuts (200, 401, 422, 500) portent les bons en-têtes.
app.add_middleware(_AuthMiddleware)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    # Corrigé : "*" combiné à allow_credentials=True est une faille — un
    # navigateur qui l'autoriserait laisserait n'importe quel site tiers
    # faire des requêtes authentifiées. Repli sur localhost pour le dev
    # local uniquement ; jamais de joker.
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _migrer_colonnes()
    await _seed()


@app.on_event("shutdown")
async def _shutdown():
    await engine.dispose()
