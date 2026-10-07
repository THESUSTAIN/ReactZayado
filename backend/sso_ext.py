"""« Se connecter avec Zayado » : Zayado sert de fournisseur d'identité à des
applications SÉPARÉES (ex. l'app RH entreprise sur rh.zayado.net), qui gardent leur
propre base et leur propre déploiement.

Flux (type OAuth 2.0 « authorization code », sans dépendance) :
1. L'app cliente envoie le navigateur sur  {FRONT}/connexion-externe?client_id=…&redirect_uri=…&state=…
2. La personne se connecte à Zayado (si besoin) et autorise → POST /api/sso/code
   → code à usage unique (2 min), renvoyé sur redirect_uri?code=…&state=…
3. Le SERVEUR de l'app cliente échange le code : POST /api/connexion/sso/token
   (client_id + client_secret + code + redirect_uri) → identité : sub, email, prénom,
   offre, accès actif, rôle Zayado.

Configuration (Railway, service backend) — un client par entrée :
  ZAYADO_SSO_CLIENTS = [{"client_id":"zayado-rh","nom":"Zayado RH",
                         "secret":"<long secret>","redirects":["https://rh.zayado.net/api/auth/zayado/callback"]}]
"""
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode, urlparse

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

DUREE_CODE = timedelta(minutes=2)


def _clients() -> dict:
    try:
        brut = json.loads(os.environ.get("ZAYADO_SSO_CLIENTS") or "[]")
    except ValueError:
        return {}
    return {c["client_id"]: c for c in brut if isinstance(c, dict) and c.get("client_id") and c.get("secret")}


def _redirect_autorise(client: dict, redirect_uri: str) -> bool:
    """Correspondance EXACTE (schéma, hôte, chemin) avec une URL déclarée : pas de préfixe, pas de joker."""
    try:
        u = urlparse(redirect_uri)
    except ValueError:
        return False
    if u.scheme != "https" and u.hostname not in ("localhost", "127.0.0.1"):
        return False
    propre = f"{u.scheme}://{u.netloc}{u.path}"
    return propre in (client.get("redirects") or [])


def _h(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def install_sso(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, DEMO_USER_ID = g["_uid"], g["new_uuid"], g["utcnow"], g["DEMO_USER_ID"]
    User, VP = g["User"], g["VisionProfile"]

    class SsoCode(Base):
        __tablename__ = "sso_codes"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        code_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
        user_id: Mapped[str] = mapped_column(String(36))
        client_id: Mapped[str] = mapped_column(String(60))
        redirect_uri: Mapped[str] = mapped_column(String(500))
        expire_le: Mapped[datetime] = mapped_column(DateTime(timezone=True))
        utilise: Mapped[bool] = mapped_column(Boolean, default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    @api.get("/connexion/sso/client")
    async def infos_client(client_id: str, redirect_uri: str):
        """Pour la page de consentement : nom de l'app et validité de l'URL de retour."""
        c = _clients().get(client_id)
        if not c or not _redirect_autorise(c, redirect_uri):
            raise HTTPException(400, "Application inconnue ou adresse de retour non autorisée.")
        return {"client_id": client_id, "nom": c.get("nom") or client_id,
                "domaine": urlparse(redirect_uri).hostname}

    class CodeIn(BaseModel):
        client_id: str = Field(max_length=60)
        redirect_uri: str = Field(max_length=500)
        state: str = Field(default="", max_length=200)

    @api.post("/sso/code")
    async def creer_code(body: CodeIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi à Zayado d'abord.")
        c = _clients().get(body.client_id)
        if not c or not _redirect_autorise(c, body.redirect_uri):
            raise HTTPException(400, "Application inconnue ou adresse de retour non autorisée.")
        code = secrets.token_urlsafe(32)
        db.add(SsoCode(code_hash=_h(code), user_id=uid, client_id=body.client_id, redirect_uri=body.redirect_uri,
                       expire_le=datetime.now(timezone.utc) + DUREE_CODE))
        await db.commit()
        sep = "&" if "?" in body.redirect_uri else "?"
        return {"redirect": f"{body.redirect_uri}{sep}{urlencode({'code': code, 'state': body.state})}"}

    class TokenIn(BaseModel):
        client_id: str = Field(max_length=60)
        client_secret: str = Field(max_length=300)
        code: str = Field(max_length=200)
        redirect_uri: str = Field(max_length=500)

    @api.post("/connexion/sso/token")
    async def echanger(body: TokenIn, db: AsyncSession = Depends(get_db)):
        """Appel SERVEUR À SERVEUR de l'app cliente (jamais depuis un navigateur)."""
        c = _clients().get(body.client_id)
        if not c or not hmac.compare_digest(str(c["secret"]), body.client_secret):
            raise HTTPException(401, "Client non autorisé.")
        row = (await db.execute(select(SsoCode).where(SsoCode.code_hash == _h(body.code)))).scalar_one_or_none()
        exp = row.expire_le if row else None
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if (not row or row.utilise or row.client_id != body.client_id or row.redirect_uri != body.redirect_uri
                or exp < datetime.now(timezone.utc)):
            raise HTTPException(400, "Code invalide ou expiré.")
        row.utilise = True
        await db.commit()
        u = await db.get(User, row.user_id)
        if not u:
            raise HTTPException(400, "Compte introuvable.")
        p = (await db.execute(select(VP).where(VP.user_id == u.id))).scalar_one_or_none()
        acces, plan = False, "essentielle"
        f_acces = g.get("_acces_actif")
        if f_acces:
            acces = bool(await f_acces(db, u.id))
        Abo = g.get("Abonnement")
        if Abo is not None:
            a = await db.get(Abo, u.id)
            plan = (a.plan if a else None) or (p.plan if p else "essentielle")
        cm = (p.contexte_metier or {}) if p else {}
        return {"sub": u.id, "email": u.email, "prenom": (p.prenom if p else None) or "",
                "entreprise": cm.get("entreprise") or "", "plan": plan, "acces_actif": acces,
                "role_zayado": u.role}

    g["_sso_clients"] = _clients
