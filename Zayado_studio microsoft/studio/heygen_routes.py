"""
HeyGen — Génération de vidéos IA, pilotée depuis le Studio Zayado (studio.zayado.net).

Déplacé depuis backend/heygen_routes.py : la clé HeyGen ne vit plus que dans le
service Studio, plus du tout dans le backend de l'application.

Sécurité :
- La clé API HeyGen (HEYGEN_API_KEY) reste UNIQUEMENT côté ce service.
- Chaque route exige une session Studio (compte Microsoft de l'organisation).
- Seuls les avatars "stock" HeyGen ou un avatar vérifié pré-enregistré
  côté HeyGen sont utilisables. Aucun upload libre de visage tiers ici.

Ajouts du Studio :
- format (vertical 9:16, horizontal 16:9, carré 1:1) et qualité (720p / 1080p) ;
- couleur de fond (ex. vert d'incrustation pour CapCut) ;
- historique des vidéos (liste HeyGen, plus de perte au rechargement) ;
- téléchargement de la vidéo et de la voix seule (MP3).
"""
import asyncio
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from auth_microsoft import session_requise

logger = logging.getLogger(__name__)
heygen_router = APIRouter(prefix="/heygen", tags=["HeyGen"])

HEYGEN_BASE_URL = "https://api.heygen.com"

if not os.environ.get("HEYGEN_API_KEY"):
    logger.warning(
        "⚠️ HEYGEN_API_KEY n'est pas défini — la génération de vidéos IA "
        "sera inutilisable tant que cette variable d'env n'est pas configurée."
    )

# Formats proposés dans le Studio : (largeur, hauteur) selon la qualité.
FORMATS = {
    "vertical": {"720p": (720, 1280), "1080p": (1080, 1920)},
    "horizontal": {"720p": (1280, 720), "1080p": (1920, 1080)},
    "carre": {"720p": (720, 720), "1080p": (1080, 1080)},
}
_COULEUR = re.compile(r"^#[0-9A-Fa-f]{6}$")


def verify_admin(request: Request):
    """Accès réservé aux personnes connectées au Studio avec leur compte Microsoft
    de l'organisation (voir auth_microsoft.py)."""
    return session_requise(request)


def _heygen_headers():
    api_key = os.environ.get("HEYGEN_API_KEY")
    if not api_key:
        raise HTTPException(503, "Vidéos IA non configurées : ajoute HEYGEN_API_KEY dans les variables du Studio.")
    return {"X-Api-Key": api_key, "Content-Type": "application/json"}


# ─── Avatars & voix (stock uniquement) ──────────────────────────────────
_AVATARS_CACHE = {"ts": 0.0, "data": None}
_AVATARS_TTL = 3600  # 1 h : la liste HeyGen /v2/avatars est lourde et lente (> 30 s)
_AVATARS_REFRESH_TASK = None


async def _fetch_avatars():
    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        r = await client.get(f"{HEYGEN_BASE_URL}/v2/avatars", headers=_heygen_headers())
    if r.status_code != 200:
        logger.error("HeyGen avatars: HTTP %s, body=%s", r.status_code, r.text[:500])
        raise RuntimeError(f"HeyGen API error: HTTP {r.status_code}")
    avatars = (r.json().get("data") or {}).get("avatars", [])
    if not isinstance(avatars, list):
        raise RuntimeError("Format avatars HeyGen invalide")
    _AVATARS_CACHE.update(ts=time.time(), data=avatars)
    return avatars


async def _refresh_avatars_background():
    try:
        await _fetch_avatars()
    except Exception:
        logger.exception("Échec de l'actualisation du cache avatars")


@heygen_router.get("/avatars")
async def list_avatars(_=Depends(verify_admin)):
    global _AVATARS_REFRESH_TASK
    cached = _AVATARS_CACHE["data"]
    if cached is not None:
        if time.time() - _AVATARS_CACHE["ts"] >= _AVATARS_TTL and (
            _AVATARS_REFRESH_TASK is None or _AVATARS_REFRESH_TASK.done()
        ):
            _AVATARS_REFRESH_TASK = asyncio.create_task(_refresh_avatars_background())
        return {"avatars": cached}
    try:
        return {"avatars": await _fetch_avatars()}
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(504, "HeyGen met trop de temps à répondre.")
    except Exception:
        logger.exception("Impossible de charger les avatars HeyGen")
        raise HTTPException(502, "Impossible de récupérer les avatars HeyGen.")


@heygen_router.get("/voices")
async def list_voices(_=Depends(verify_admin)):
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{HEYGEN_BASE_URL}/v2/voices", headers=_heygen_headers())
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Erreur HeyGen: {r.text}")
    return {"voices": r.json().get("data", {}).get("voices", [])}


# ─── Génération vidéo ───────────────────────────────────────────────────
def construire_corps(payload: dict) -> dict:
    """Corps de la requête HeyGen /v2/video/generate à partir du formulaire du Studio."""
    avatar_id = payload.get("avatar_id")
    voice_id = payload.get("voice_id")
    script = (payload.get("script") or "").strip()
    title = (payload.get("title") or "Zayado Video").strip()[:120]
    if not avatar_id or not voice_id or not script:
        raise HTTPException(400, "avatar_id, voice_id et script sont requis")
    if len(script) > 1500:
        raise HTTPException(400, "Script trop long (max 1500 caractères)")

    format_ = payload.get("format") or "vertical"
    qualite = payload.get("qualite") or "1080p"
    if format_ not in FORMATS or qualite not in FORMATS[format_]:
        raise HTTPException(400, "Format ou qualité inconnus")
    largeur, hauteur = FORMATS[format_][qualite]

    entree = {
        "character": {"type": "avatar", "avatar_id": avatar_id, "avatar_style": "normal"},
        "voice": {"type": "text", "input_text": script, "voice_id": voice_id},
    }
    vitesse = payload.get("vitesse")
    if vitesse not in (None, ""):
        try:
            v = float(vitesse)
        except (TypeError, ValueError):
            raise HTTPException(400, "Vitesse de voix invalide")
        if not 0.5 <= v <= 1.5:
            raise HTTPException(400, "Vitesse de voix entre 0,5 et 1,5")
        entree["voice"]["speed"] = v
    fond = payload.get("fond")
    if fond:
        if not _COULEUR.match(fond):
            raise HTTPException(400, "Couleur de fond invalide (format #RRGGBB)")
        entree["background"] = {"type": "color", "value": fond}

    return {"video_inputs": [entree], "dimension": {"width": largeur, "height": hauteur}, "title": title}


@heygen_router.post("/generate")
async def generate_video(payload: dict, _=Depends(verify_admin)):
    body = construire_corps(payload)
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{HEYGEN_BASE_URL}/v2/video/generate", headers=_heygen_headers(), json=body)
    if r.status_code not in (200, 201):
        logger.error("HeyGen generate error: %s %s", r.status_code, r.text)
        message = r.text
        if "resolution" in message.lower() or "dimension" in message.lower():
            message = "Votre offre HeyGen n'autorise peut-être pas cette qualité : essayez en 720p. " + message
        raise HTTPException(r.status_code, f"Erreur HeyGen: {message}")
    video_id = (r.json().get("data") or {}).get("video_id")
    if not video_id:
        raise HTTPException(502, "Réponse HeyGen inattendue (pas de video_id)")
    return {"video_id": video_id, "status": "processing", "title": body["title"]}


# ─── Statut / historique ────────────────────────────────────────────────
async def _statut(video_id: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{HEYGEN_BASE_URL}/v1/video_status.get", headers=_heygen_headers(), params={"video_id": video_id}
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


@heygen_router.get("/status/{video_id}")
async def video_status(video_id: str, _=Depends(verify_admin)):
    return await _statut(video_id)


@heygen_router.get("/videos")
async def historique(_=Depends(verify_admin)):
    """Les dernières vidéos du compte HeyGen : l'historique ne se perd plus au rechargement."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{HEYGEN_BASE_URL}/v1/video.list", headers=_heygen_headers(), params={"limit": 30})
    if r.status_code != 200:
        logger.error("HeyGen video.list: %s %s", r.status_code, r.text[:300])
        raise HTTPException(502, "Historique HeyGen indisponible pour le moment.")
    videos = (r.json().get("data") or {}).get("videos") or []
    return {
        "videos": [
            {
                "video_id": v.get("video_id"),
                "title": v.get("video_title") or v.get("title") or "",
                "status": v.get("status"),
                "created_at": v.get("created_at"),
            }
            for v in videos
            if v.get("video_id")
        ]
    }


# ─── Téléchargements (vidéo / voix seule) ───────────────────────────────
def _nom_fichier(titre: str, ext: str) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", titre or "zayado").strip("_") or "zayado"
    return f"{base[:80]}.{ext}"


async def _telecharger(video_id: str, dossier: str) -> str:
    info = await _statut(video_id)
    if info.get("status") != "completed" or not info.get("video_url"):
        raise HTTPException(409, "La vidéo n'est pas encore prête.")
    chemin = os.path.join(dossier, "video.mp4")
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=15.0), follow_redirects=True) as client:
        async with client.stream("GET", info["video_url"]) as r:
            if r.status_code != 200:
                raise HTTPException(502, "Téléchargement HeyGen impossible.")
            with open(chemin, "wb") as f:
                async for bloc in r.aiter_bytes():
                    f.write(bloc)
    return chemin


@heygen_router.get("/fichier/{video_id}")
async def fichier_video(video_id: str, titre: str = "", _=Depends(verify_admin)):
    dossier = tempfile.mkdtemp(prefix="heygen_")
    try:
        chemin = await _telecharger(video_id, dossier)
    except Exception:
        shutil.rmtree(dossier, ignore_errors=True)
        raise
    return FileResponse(chemin, media_type="video/mp4", filename=_nom_fichier(titre or video_id, "mp4"),
                        background=BackgroundTask(shutil.rmtree, dossier, True))


@heygen_router.get("/audio/{video_id}")
async def voix_seule(video_id: str, titre: str = "", _=Depends(verify_admin)):
    """Extrait la voix seule (MP3) : pratique pour monter dans CapCut sans l'avatar."""
    if not shutil.which("ffmpeg"):
        raise HTTPException(503, "ffmpeg absent du service Studio.")
    dossier = tempfile.mkdtemp(prefix="heygen_")
    try:
        video = await _telecharger(video_id, dossier)
        mp3 = os.path.join(dossier, "voix.mp3")
        proc = await asyncio.to_thread(
            subprocess.run,
            ["ffmpeg", "-y", "-v", "error", "-i", video, "-vn", "-acodec", "libmp3lame", "-q:a", "2", mp3],
            capture_output=True, timeout=180,
        )
        if proc.returncode != 0 or not os.path.exists(mp3):
            logger.error("ffmpeg: %s", proc.stderr[-500:])
            raise HTTPException(500, "Extraction de la voix impossible.")
    except Exception:
        shutil.rmtree(dossier, ignore_errors=True)
        raise
    return FileResponse(mp3, media_type="audio/mpeg", filename=_nom_fichier(titre or video_id, "mp3"),
                        background=BackgroundTask(shutil.rmtree, dossier, True))
