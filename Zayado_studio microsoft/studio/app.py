"""
Studio Zayado (studio.zayado.net) — les outils internes, séparés de la console admin.

Un seul service :
- /api/heygen/*  → traité ici (la clé HeyGen ne vit que dans ce service) ;
- /api/*         → relayé tel quel vers le backend de l'application (BACKEND_URL),
                   pour les newsletters, articles, témoignages, tunnels, partenaires…
                   Les données restent dans la base de Zayado : rien n'est copié.
- le reste       → l'interface du Studio (build Vite dans STUDIO_DIST).

Accès : compte Microsoft de l'organisation uniquement (auth_microsoft.py). Le Studio
parle ensuite au backend de l'application avec un jeton admin de courte durée qu'il
signe lui-même (même JWT_SECRET) : aucun compte Zayado n'est nécessaire.

Variables : BACKEND_URL, JWT_SECRET (le même que l'application), HEYGEN_API_KEY,
MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT, MS_GROUPES, MS_DOMAINES, STUDIO_URL,
APP_URL (https://app.zayado.net par défaut), ZAYADO_ADMIN_UID (optionnel), PORT.
"""
import logging
import os
from contextlib import asynccontextmanager

import time

import httpx
import jwt
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

from auth_microsoft import auth_router, configure as microsoft_configure, session_courante
from heygen_routes import heygen_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("studio")

ICI = os.path.dirname(os.path.abspath(__file__))
DIST = os.environ.get("STUDIO_DIST", os.path.join(ICI, "dist"))
INDEX = os.path.join(DIST, "studio", "index.html")

_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def cycle_de_vie(_app):
    global _client
    _client = httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=10.0))
    if not (os.environ.get("BACKEND_URL") or "").strip():
        logger.warning("BACKEND_URL absente : seules les Vidéos IA fonctionneront.")
    yield
    await _client.aclose()


app = FastAPI(title="Studio Zayado", docs_url=None, redoc_url=None, openapi_url=None, lifespan=cycle_de_vie)
app.include_router(heygen_router, prefix="/api")
app.include_router(auth_router)


@app.get("/health")
async def health():
    return {"status": "ok", "heygen": bool(os.environ.get("HEYGEN_API_KEY")),
            "backend": bool(os.environ.get("BACKEND_URL")), "jwt": bool(os.environ.get("JWT_SECRET")),
            "microsoft": microsoft_configure()}


@app.get("/studio-config.json")
async def config():
    # Lu par l'interface : adresse de l'application pour la connexion et les liens.
    return {"app_url": os.environ.get("APP_URL", "https://app.zayado.net").rstrip("/")}


# ─── Relais vers le backend de l'application ────────────────────────────
_ENTETES_RETIRES = {"host", "content-length", "connection", "keep-alive", "transfer-encoding",
                    "upgrade", "proxy-connection", "te", "trailer"}
# Jamais transmis au backend : la session Studio et tout jeton venu du navigateur.
_ENTETES_PRIVES = {"cookie", "authorization"}


def _jeton_service() -> str:
    """Jeton admin de 5 minutes pour le backend de l'application. Le rôle admin est
    accordé ici parce que la personne a passé la connexion Microsoft du Studio."""
    uid = (os.environ.get("ZAYADO_ADMIN_UID") or "studio-zayado").strip()
    return jwt.encode({"sub": uid, "role": "admin", "studio": True, "exp": int(time.time()) + 300},
                      os.environ["JWT_SECRET"], algorithm="HS256")


def _backend() -> str:
    return (os.environ.get("BACKEND_URL") or "").strip().rstrip("/")


@app.api_route("/api/{chemin:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def relais(chemin: str, request: Request):
    session = session_courante(request)
    if not session:
        return JSONResponse({"detail": "Connectez-vous avec votre compte Microsoft de l'organisation."}, status_code=401)
    if chemin == "auth/me":
        # Le menu affiche la personne connectée au Studio (compte Microsoft).
        return {"mode": "compte", "email": session.get("email"), "nom": session.get("nom"), "role": "admin"}
    base = _backend()
    if not base:
        return JSONResponse({"detail": "Studio non relié à l'application (BACKEND_URL manquante)."}, status_code=503)
    url = f"{base}/api/{chemin}"
    entetes = {k: v for k, v in request.headers.items() if k.lower() not in _ENTETES_RETIRES | _ENTETES_PRIVES}
    entetes["authorization"] = f"Bearer {_jeton_service()}"
    entetes["x-forwarded-host"] = request.headers.get("host", "")
    entetes["x-forwarded-proto"] = request.url.scheme
    corps = await request.body()
    try:
        req = _client.build_request(request.method, url, params=request.query_params, headers=entetes, content=corps)
        rep = await _client.send(req, stream=True)
    except httpx.HTTPError as e:
        logger.error("Relais %s %s : %s", request.method, url, e)
        return JSONResponse({"detail": "Application Zayado injoignable depuis le Studio."}, status_code=502)
    sortie = {k: v for k, v in rep.headers.items()
              if k.lower() not in _ENTETES_RETIRES | {"content-encoding", "set-cookie"}}
    # aiter_bytes = contenu décompressé : on retire donc content-encoding / content-length.
    return StreamingResponse(rep.aiter_bytes(), status_code=rep.status_code, headers=sortie,
                             background=BackgroundTask(rep.aclose))


# ─── Interface ──────────────────────────────────────────────────────────
if os.path.isdir(os.path.join(DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")


@app.get("/{chemin:path}")
async def interface(chemin: str):
    fichier = os.path.normpath(os.path.join(DIST, chemin))
    if chemin and fichier.startswith(os.path.normpath(DIST) + os.sep) and os.path.isfile(fichier):
        return FileResponse(fichier)
    if os.path.isfile(INDEX):
        return FileResponse(INDEX, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return Response("Interface du Studio non construite.", status_code=503)
