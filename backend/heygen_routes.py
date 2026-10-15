"""
HeyGen — Génération de vidéos avatar IA, pilotée depuis la console /admin.

Sécurité :
- La clé API HeyGen (HEYGEN_API_KEY) reste UNIQUEMENT côté ce backend.
- Chaque route exige un JWT Zayado avec role == "admin" (header Authorization: Bearer).
- Seuls les avatars "stock" HeyGen ou un avatar vérifié pré-enregistré
  côté HeyGen sont utilisables. Aucun upload libre de visage tiers ici.
"""
import os
import logging
import httpx
import jwt
from fastapi import APIRouter, HTTPException, Header, Depends
import asyncio
import time

_AVATARS_CACHE = {"ts": 0.0, "data": None}
_AVATARS_TTL = 3600
_AVATARS_REFRESH_TASK = None

logger = logging.getLogger(__name__)
heygen_router = APIRouter(prefix="/heygen", tags=["HeyGen"])

HEYGEN_API_KEY = os.environ.get("HEYGEN_API_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET", "kairos-dev-secret-a-changer")
HEYGEN_BASE_URL = "https://api.heygen.com"

if not HEYGEN_API_KEY:
    logger.warning(
        "⚠️ HEYGEN_API_KEY n'est pas défini — la génération de vidéos IA "
        "sera inutilisable tant que cette variable d'env n'est pas configurée."
    )


def verify_admin(authorization: str = Header(default=None)):
    """Accès réservé aux comptes admin (même JWT que le reste de l'app).
    Le secret est lu à la requête : au import du module, le .env n'est pas
    encore chargé par server.py (ordre des imports)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token requis — connecte-toi avec un compte admin.")
    secret = os.environ.get("JWT_SECRET", "kairos-dev-secret-a-changer")
    try:
        payload = jwt.decode(authorization[7:], secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Token invalide ou expiré")
    if payload.get("role") != "admin":
        raise HTTPException(403, "Réservé aux administrateurs")
    return payload


def _heygen_headers():
    api_key = os.environ.get("HEYGEN_API_KEY")
    if not api_key:
        raise HTTPException(503, "Vidéos IA non configurées : ajoute HEYGEN_API_KEY dans les variables du backend.")
    return {"X-Api-Key": api_key, "Content-Type": "application/json"}


# ─── Liste des avatars & voix autorisés (stock uniquement) ────────────
_AVATARS_CACHE = {"ts": 0.0, "data": None}
_AVATARS_TTL = 3600  # 1 h : la liste HeyGen /v2/avatars est lourde et lente (> 30 s)

async def _fetch_avatars():
    headers = _heygen_headers()

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(120.0, connect=10.0)
    ) as client:
        r = await client.get(
            f"{HEYGEN_BASE_URL}/v2/avatars",
            headers=headers,
        )

    if r.status_code != 200:
        logger.error(
            "HeyGen avatars: HTTP %s, body=%s",
            r.status_code,
            r.text[:500],
        )
        raise RuntimeError(
            f"HeyGen API error: HTTP {r.status_code}"
        )

    result = r.json()
    avatars = (result.get("data") or {}).get("avatars", [])

    if not isinstance(avatars, list):
        raise RuntimeError("Format avatars HeyGen invalide")

    _AVATARS_CACHE.update(
        ts=time.time(),
        data=avatars,
    )
    return avatars


async def _refresh_avatars_background():
    try:
        await _fetch_avatars()
        logger.info("Cache HeyGen avatars actualisé")
    except Exception:
        logger.exception(
            "Échec de l'actualisation du cache avatars"
        )

@heygen_router.get("/avatars")
async def list_avatars(_=Depends(verify_admin)):
    global _AVATARS_REFRESH_TASK

    now = time.time()
    cached = _AVATARS_CACHE["data"]

    # Cache encore valide : réponse immédiate
    if cached is not None and now - _AVATARS_CACHE["ts"] < _AVATARS_TTL:
        return {"avatars": cached}

    # Cache expiré : on renvoie les données disponibles
    # et on actualise en arrière-plan.
    if cached is not None:
        if (
            _AVATARS_REFRESH_TASK is None
            or _AVATARS_REFRESH_TASK.done()
        ):
            _AVATARS_REFRESH_TASK = asyncio.create_task(
                _refresh_avatars_background()
            )

        return {"avatars": cached}

    # Premier chargement sans cache : appel nécessaire
    try:
        avatars = await _fetch_avatars()
        return {"avatars": avatars}
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            504,
            "HeyGen met trop de temps à répondre."
        )
    except Exception:
        logger.exception("Impossible de charger les avatars HeyGen")
        raise HTTPException(
            502,
            "Impossible de récupérer les avatars HeyGen."
        )
    

@heygen_router.get("/voices")
async def list_voices(_=Depends(verify_admin)):
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{HEYGEN_BASE_URL}/v2/voices", headers=_heygen_headers())
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Erreur HeyGen: {r.text}")
    return {"voices": r.json().get("data", {}).get("voices", [])}


# ─── Génération vidéo ───────────────────────────────────────────────────
@heygen_router.post("/generate")
async def generate_video(payload: dict, _=Depends(verify_admin)):
    avatar_id = payload.get("avatar_id")
    voice_id = payload.get("voice_id")
    script = (payload.get("script") or "").strip()
    title = payload.get("title") or "Zayado Video"

    if not avatar_id or not voice_id or not script:
        raise HTTPException(400, "avatar_id, voice_id et script sont requis")
    if len(script) > 1500:
        raise HTTPException(400, "Script trop long (max 1500 caractères)")

    body = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": avatar_id,
                    "avatar_style": "normal",
                },
                "voice": {
                    "type": "text",
                    "input_text": script,
                    "voice_id": voice_id,
                },
            }
        ],
        "dimension": {"width": 1280, "height": 720},
        "title": title,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{HEYGEN_BASE_URL}/v2/video/generate",
            headers=_heygen_headers(),
            json=body,
        )
    if r.status_code not in (200, 201):
        logger.error(f"HeyGen generate error: {r.status_code} {r.text}")
        raise HTTPException(r.status_code, f"Erreur HeyGen: {r.text}")

    data = r.json().get("data", {})
    video_id = data.get("video_id")
    if not video_id:
        raise HTTPException(502, "Réponse HeyGen inattendue (pas de video_id)")

    return {"video_id": video_id, "status": "processing"}


# ─── Statut / polling ────────────────────────────────────────────────────
@heygen_router.get("/status/{video_id}")
async def video_status(video_id: str, _=Depends(verify_admin)):
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{HEYGEN_BASE_URL}/v1/video_status.get",
            headers=_heygen_headers(),
            params={"video_id": video_id},
        )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Erreur HeyGen: {r.text}")

    data = r.json().get("data", {})
    status = data.get("status")  # pending | processing | completed | failed
    result = {"video_id": video_id, "status": status}
    if status == "completed":
        result["video_url"] = data.get("video_url")
        result["thumbnail_url"] = data.get("thumbnail_url")
        result["duration"] = data.get("duration")
    elif status == "failed":
        result["error"] = data.get("error")
    return result
