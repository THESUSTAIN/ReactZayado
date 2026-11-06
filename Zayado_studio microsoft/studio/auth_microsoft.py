"""
Connexion au Studio par Microsoft Entra ID (compte de l'organisation uniquement).

Verrous, du plus large au plus fin :
1. Application Entra « Zayado Studio » en locataire unique : seuls les comptes du
   locataire peuvent se connecter (réglé dans Entra).
2. « Affectation requise » dans Entra : seuls les utilisateurs / groupes affectés
   à l'application passent (réglé dans Entra).
3. Ici : refus des invités externes (B2B), même s'ils sont membres du groupe.
4. Ici, si MS_GROUPES est renseignée : appartenance obligatoire à l'un de ces groupes.
5. Ici, si MS_DOMAINES est renseignée : adresse e-mail dans l'un de ces domaines.

Variables : MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT (ex. zayado.onmicrosoft.com),
MS_GROUPES (ID d'objet de groupes, séparés par des virgules, optionnel),
MS_DOMAINES (optionnel), STUDIO_URL (https://studio.zayado.net), JWT_SECRET.
"""
import base64
import hashlib
import logging
import os
import secrets
import time
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

logger = logging.getLogger("studio.auth")
auth_router = APIRouter(prefix="/auth")

COOKIE_SESSION = "studio_session"
COOKIE_OIDC = "studio_oidc"
DUREE_SESSION = 12 * 3600  # une journée de travail


def _env(nom: str, defaut: str = "") -> str:
    return (os.environ.get(nom) or defaut).strip()


def _liste(nom: str) -> list[str]:
    return [x.strip().lower() for x in _env(nom).split(",") if x.strip()]


def _secret() -> str:
    s = _env("JWT_SECRET")
    if not s:
        raise HTTPException(503, "Studio non configuré : JWT_SECRET manquant.")
    return s


def _studio_url() -> str:
    return _env("STUDIO_URL", "https://studio.zayado.net").rstrip("/")


def _redirect_uri() -> str:
    return f"{_studio_url()}/auth/microsoft/callback"


def configure() -> bool:
    return bool(_env("MS_CLIENT_ID") and _env("MS_CLIENT_SECRET") and _env("MS_TENANT"))


# ─── Métadonnées OpenID du locataire (mises en cache 1 h) ───────────────
_META = {"ts": 0.0, "data": None, "jwks": None}


async def _metadonnees() -> dict:
    if _META["data"] and time.time() - _META["ts"] < 3600:
        return _META["data"]
    url = f"https://login.microsoftonline.com/{_env('MS_TENANT')}/v2.0/.well-known/openid-configuration"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url)
    if r.status_code != 200:
        raise HTTPException(502, "Microsoft injoignable (métadonnées du locataire).")
    data = r.json()
    _META.update(ts=time.time(), data=data, jwks=jwt.PyJWKClient(data["jwks_uri"], cache_keys=True))
    return data


def _b64(octets: bytes) -> str:
    return base64.urlsafe_b64encode(octets).rstrip(b"=").decode()


def _cookie(reponse, nom: str, valeur: str, duree: int, request: Request):
    reponse.set_cookie(nom, valeur, max_age=duree, httponly=True, samesite="lax", path="/",
                       secure=request.url.scheme == "https" or _studio_url().startswith("https"))


def _refus(request: Request, raison: str):
    logger.warning("Connexion Studio refusée : %s", raison)
    rep = RedirectResponse(f"/?{urlencode({'refus': raison})}", status_code=302)
    rep.delete_cookie(COOKIE_OIDC, path="/")
    return rep


@auth_router.get("/microsoft/login")
async def connexion(request: Request):
    if not configure():
        raise HTTPException(503, "Connexion Microsoft non configurée (MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT).")
    meta = await _metadonnees()
    etat, nonce, verif = secrets.token_urlsafe(24), secrets.token_urlsafe(24), secrets.token_urlsafe(48)
    defi = _b64(hashlib.sha256(verif.encode()).digest())
    params = {
        "client_id": _env("MS_CLIENT_ID"), "response_type": "code", "redirect_uri": _redirect_uri(),
        "response_mode": "query", "scope": "openid profile email", "state": etat, "nonce": nonce,
        "code_challenge": defi, "code_challenge_method": "S256", "prompt": "select_account",
    }
    rep = RedirectResponse(f"{meta['authorization_endpoint']}?{urlencode(params)}", status_code=302)
    temp = jwt.encode({"etat": etat, "nonce": nonce, "verif": verif, "exp": int(time.time()) + 600}, _secret(), algorithm="HS256")
    _cookie(rep, COOKIE_OIDC, temp, 600, request)
    return rep


def verifier_identite(claims: dict, issuer: str) -> str | None:
    """Renvoie la raison du refus, ou None si la personne peut entrer."""
    noms = " ".join(str(claims.get(k, "")) for k in ("upn", "unique_name", "preferred_username", "email"))
    if claims.get("acct") == 1 or "#EXT#" in noms.upper():
        return "invite"
    idp = claims.get("idp")
    if idp and idp.rstrip("/") != issuer.rstrip("/"):
        return "invite"  # compte venu d'un autre annuaire (invité B2B, compte personnel…)
    domaines = _liste("MS_DOMAINES")
    if domaines:
        email = (claims.get("email") or claims.get("preferred_username") or "").lower()
        if not any(email.endswith("@" + d) for d in domaines):
            return "domaine"
    groupes = _liste("MS_GROUPES")
    if groupes:
        if "groups" not in claims and "groups" in (claims.get("_claim_names") or {}):
            return "trop_de_groupes"
        membres = {str(g).lower() for g in claims.get("groups") or []}
        if not membres & set(groupes):
            return "groupe"
    return None


@auth_router.get("/microsoft/callback")
async def retour(request: Request, code: str = "", state: str = "", error: str = "", error_description: str = ""):
    if error:
        logger.warning("Microsoft a refusé : %s %s", error, error_description[:200])
        return _refus(request, "microsoft")
    try:
        temp = jwt.decode(request.cookies.get(COOKIE_OIDC, ""), _secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        return _refus(request, "expire")
    if not code or not secrets.compare_digest(state, temp.get("etat", "")):
        return _refus(request, "etat")

    meta = await _metadonnees()
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(meta["token_endpoint"], data={
            "client_id": _env("MS_CLIENT_ID"), "client_secret": _env("MS_CLIENT_SECRET"),
            "grant_type": "authorization_code", "code": code, "redirect_uri": _redirect_uri(),
            "code_verifier": temp["verif"], "scope": "openid profile email",
        })
    if r.status_code != 200 or "id_token" not in r.json():
        logger.error("Échange du code Microsoft : %s %s", r.status_code, r.text[:300])
        return _refus(request, "microsoft")
    id_token = r.json()["id_token"]
    try:
        cle = _META["jwks"].get_signing_key_from_jwt(id_token).key
        claims = jwt.decode(id_token, cle, algorithms=["RS256"], audience=_env("MS_CLIENT_ID"), issuer=meta["issuer"])
    except jwt.PyJWTError as e:
        logger.error("Jeton Microsoft invalide : %s", e)
        return _refus(request, "jeton")
    if not secrets.compare_digest(claims.get("nonce", ""), temp["nonce"]):
        return _refus(request, "jeton")

    raison = verifier_identite(claims, meta["issuer"])
    if raison:
        return _refus(request, raison)

    email = claims.get("email") or claims.get("preferred_username") or ""
    session = jwt.encode({
        "sub": claims.get("oid") or claims.get("sub"), "nom": claims.get("name") or email, "email": email,
        "aud": "studio", "exp": int(time.time()) + DUREE_SESSION,
    }, _secret(), algorithm="HS256")
    rep = RedirectResponse("/", status_code=302)
    rep.delete_cookie(COOKIE_OIDC, path="/")
    _cookie(rep, COOKIE_SESSION, session, DUREE_SESSION, request)
    logger.info("Connexion Studio : %s", email)
    return rep


def session_courante(request: Request) -> dict | None:
    jeton = request.cookies.get(COOKIE_SESSION)
    if not jeton:
        return None
    try:
        return jwt.decode(jeton, _secret(), algorithms=["HS256"], audience="studio")
    except jwt.PyJWTError:
        return None


def session_requise(request: Request) -> dict:
    s = session_courante(request)
    if not s:
        raise HTTPException(401, "Connectez-vous avec votre compte Microsoft de l'organisation.")
    return s


@auth_router.get("/session")
async def ma_session(request: Request):
    s = session_courante(request)
    if not s:
        return JSONResponse({"connecte": False, "microsoft": configure()}, status_code=401)
    return {"connecte": True, "nom": s.get("nom"), "email": s.get("email")}


@auth_router.get("/logout")
async def deconnexion():
    rep = RedirectResponse("/", status_code=302)
    rep.delete_cookie(COOKIE_SESSION, path="/")
    return rep
