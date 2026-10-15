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


@heygen_router.get("/avatars")
async def list_avatars(_=Depends(verify_admin)):
    import time

    now = time.time()

    # Cache valide : ne pas rappeler HeyGen
    if (
        _AVATARS_CACHE["data"] is not None
        and now - _AVATARS_CACHE["ts"] < _AVATARS_TTL
    ):
        return {"avatars": _AVATARS_CACHE["data"]}

    url = f"{HEYGEN_BASE_URL}/v2/avatars"

    try:
        headers = _heygen_headers()

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0)
        ) as client:
            r = await client.get(url, headers=headers)

        logger.info(
            "HeyGen avatars: HTTP %s",
            r.status_code
        )

        if r.status_code != 200:
            # Ne pas journaliser les en-têtes : ils contiennent la clé API.
            logger.error(
                "HeyGen avatars API error: status=%s body=%s",
                r.status_code,
                r.text[:1000]
            )

            # Une erreur d'authentification upstream ne doit pas
            # être confondue avec le JWT administrateur de Zayado.
            if r.status_code in (401, 403):
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "HeyGen refuse la requête. "
                        "Vérifie la clé API et les autorisations du compte."
                    )
                )

            raise HTTPException(
                status_code=502,
                detail=f"Erreur de l'API HeyGen (HTTP {r.status_code})."
            )

        try:
            result = r.json()
        except ValueError:
            logger.error(
                "HeyGen avatars: réponse JSON invalide: %s",
                r.text[:500]
            )
            raise HTTPException(
                status_code=502,
                detail="HeyGen a renvoyé une réponse JSON invalide."
            )

        data = result.get("data") or {}
        avatars = data.get("avatars", [])

        if not isinstance(avatars, list):
            logger.error("Format inattendu dans la réponse HeyGen avatars")
            raise HTTPException(
                status_code=502,
                detail="Format de réponse HeyGen inattendu."
            )

        _AVATARS_CACHE.update(ts=time.time(), data=avatars)

        return {"avatars": avatars}

    except HTTPException:
        raise

    except httpx.TimeoutException:
        logger.exception("Timeout sur HeyGen /v2/avatars")

        if _AVATARS_CACHE["data"] is not None:
            logger.warning("Utilisation du cache avatars périmé")
            return {"avatars": _AVATARS_CACHE["data"]}

        raise HTTPException(
            status_code=504,
            detail="HeyGen ne répond pas dans le délai imparti."
        )

    except httpx.HTTPError:
        logger.exception("Erreur réseau sur HeyGen /v2/avatars")

        if _AVATARS_CACHE["data"] is not None:
            return {"avatars": _AVATARS_CACHE["data"]}

        raise HTTPException(
            status_code=502,
            detail="Impossible de contacter l'API HeyGen."
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
