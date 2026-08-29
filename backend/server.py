"""
ZAYADO — Backend DÉMO léger (étape preview)
=============================================
Ce backend NE REMPLACE PAS le vrai backend ZAYADO (FastAPI + SQLAlchemy,
~80 routes, IA Mammouth, OAuth, paiements...). Il sert uniquement à faire
tourner le FRONTEND ZAYADO en LIVE dans cet environnement de prévisualisation :

  • /api/auth/*, /api/oauth/*  → authentification RÉELLE (auth_real.py) :
                          OAuth Google/Microsoft, lien magique envoyé par
                          email (Brevo), comptes persistés en SQLite.
  • /api/health        → sonde de santé.
  • catch-all /api/*   → réponses vides douces (200 {}) pour éviter les
                          erreurs bruyantes ; les pages affichent alors leurs
                          états « vides » (données réelles = brancher le vrai
                          backend + clé Mammouth plus tard).

⚠️  L'IA du chat est en MODE DÉMO (aucune vraie génération). La clé Mammouth
    sera branchée ultérieurement.
"""
from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import os, uuid, logging
import httpx
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zayado-demo")

app = FastAPI(title="ZAYADO Demo Backend")
api = APIRouter(prefix="/api")

DEMO_TOKEN = "demo-preview-token"

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def demo_user(email: str = "thomas@zayado.net", name: str = "Thomas") -> Dict[str, Any]:
    """Utilisateur de démonstration renvoyé par les routes d'auth."""
    return {
        "id": "demo-user-thomas",
        "email": email,
        "name": name,
        "first_name": name,
        "role": "user",
        "credits": 500,
        "bonus_credits": 0,
        "purchased_credits": 0,
        "plan": "pro",
        "created_at": "2025-01-01T09:00:00+00:00",
        "discount_type": None,
        "discount_percent": 0,
        "discount_verified": False,
        "partner_code": None,
        "partner_url": None,
        "memory": None,
        "referral_code": "ZAYADO-DEMO",
        "settings": {"onboarding_completed": True, "language": "fr"},
        "cancel_at_period_end": False,
        "thesustain_member": False,
        "thesustain_type": None,
        "two_factor_enabled": False,
        "is_active": True,
        "credits_last_reset": None,
        "credits_per_month": 500,
        "onboarding_done": True,
        "trial_ends_at": None,
        "trial_days_left": None,
        "trial_active": False,
    }

def token_response(email: str = "thomas@zayado.net", name: str = "Thomas") -> Dict[str, Any]:
    return {"access_token": DEMO_TOKEN, "token_type": "bearer", "user": demo_user(email, name)}


# ── Santé ───────────────────────────────────────────────────────────────
@api.get("/health")
async def health():
    from auth_real import IS_PREVIEW, GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID, BREVO_API_KEY
    return {
        "status": "ok",
        "mode": "preview" if IS_PREVIEW else "production",
        "auth": "real",
        "google_oauth": bool(GOOGLE_CLIENT_ID),
        "microsoft_oauth": bool(MICROSOFT_CLIENT_ID),
        "email_delivery": bool(BREVO_API_KEY),
        "time": _now_iso(),
    }

@api.get("/")
async def root():
    return {"message": "ZAYADO demo backend", "mode": "demo"}


# ── Auth RÉELLE ──────────────────────────────────────────────────────────
# Les stubs de démonstration (« vous êtes toujours Thomas », aucun email
# envoyé, chemins OAuth que le frontend n'appelait jamais) ont été retirés :
# ils sont remplacés par backend/auth_real.py, monté plus bas sous /api.
class Credentials(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None


# ── Chat / Copilote (démo statique) ─────────────────────────────────────
@api.get("/chat/messages")
async def chat_messages():
    # Doit être un TABLEAU (ChatPanel fait messages.map). Vide en démo.
    return []

@api.post("/chat/messages")
async def chat_messages_send(data: Dict[str, Any] = None):
    return {"reply": "Chat en mode démo — la vraie IA (Mammouth) sera branchée bientôt.", "sources": []}

@api.post("/growth/copilote")
async def growth_copilote(data: Dict[str, Any] = None):
    """Chat Copilote branché sur Mammouth (API compatible OpenAI).
    Repli propre en message démo si la clé manque ou si Mammouth échoue."""
    data = data or {}
    user_message = (data.get("message") or "").strip()
    history = data.get("history") or []
    api_key = os.environ.get("MAMMOUTH_API_KEY") or os.environ.get("MAMMOTH_API_KEY", "")
    base_url = os.environ.get("MAMMOUTH_BASE_URL", "https://api.mammouth.ai/v1").rstrip("/")
    model = os.environ.get("MAMMOUTH_MODEL", "claude-haiku-4-5-20251001")

    if not user_message:
        return {"reply": "Comment puis-je vous aider aujourd'hui ?", "sources": []}
    if not api_key:
        return {"reply": "Chat en mode démo — la clé Mammouth n'est pas configurée.", "sources": []}

    system_prompt = (
        "Tu es MyExtension Business, le copilote IA de l'application ZAYADO pour solopreneurs "
        "et PME. Réponds en français, de façon claire, concise et actionnable. Tu aides sur la "
        "vision stratégique, la croissance, le pilotage (trésorerie, prospection) et le bien-être. "
        "Ne fais pas de promesses d'exécution automatique : propose, l'utilisateur valide."
    )
    messages = [{"role": "system", "content": system_prompt}]
    for m in history[-8:]:
        role = m.get("role")
        content = m.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    payload = {"model": model, "messages": messages, "max_tokens": 700, "temperature": 0.6, "stream": False}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
        if resp.status_code != 200:
            logger.error(f"[Mammouth] HTTP {resp.status_code}: {resp.text[:300]}")
            return {"reply": "Le service IA est momentanément indisponible. Réessayez dans un instant.", "sources": []}
        j = resp.json()
        reply = (j.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
        return {"reply": reply or "Je n'ai pas de réponse pour le moment.", "sources": []}
    except Exception as e:
        logger.error(f"[Mammouth] exception: {e}")
        return {"reply": "Le service IA a rencontré une erreur réseau. Réessayez.", "sources": []}


# ── Décisions / Validations (démo réaliste, style kairos) ────────────────
# Le Chat affiche ces cartes avec des boutons Approuver / Reporter réels.
DEMO_DECISIONS = [
    {
        "id": "dec-prospects",
        "status": "pending",
        "source_key": "pilotage",
        "priority": "urgent",
        "title": "Relancer 3 prospects tièdes aujourd'hui",
        "detail": "Votre dynamique commerciale s'accélère (MRR 12 480 € · +6,2 %, taux de closing 24 %). Trois prospects tièdes n'ont pas eu de nouvelles depuis 8 jours.",
        "why_now": "Le taux de closing est au plus haut du trimestre : relancer maintenant maximise vos chances de signature.",
        "pillar": "Croissance",
        "impact": "+1 à 2 signatures estimées ce mois-ci",
        "cost_of_delay": "Refroidissement des prospects après 10 jours de silence",
    },
    {
        "id": "dec-camille",
        "status": "pending",
        "source_key": "vision",
        "title": "Générer une séquence d'approche pour Camille Rousseau",
        "detail": "Prospect ajouté : Camille Rousseau · CMO @ Lumen, détecté via LinkedIn. Une séquence en 3 messages peut être préparée.",
        "why_now": "Le profil correspond à votre client idéal et vient d'interagir avec votre contenu.",
        "pillar": "Vision",
        "impact": "Ouverture d'un canal avec un décideur clé",
    },
    {
        "id": "dec-focus",
        "status": "pending",
        "source_key": "bienetre",
        "title": "Bloquer une session Focus de 50 min cet après-midi",
        "detail": "Vous avez 2 créneaux libres cet après-midi. Une session Focus permettrait de finaliser votre proposition commerciale.",
        "why_now": "Votre énergie est optimale en début d'après-midi selon vos derniers check-ins.",
        "pillar": "Bien-être",
        "impact": "Proposition commerciale finalisée aujourd'hui",
    },
]

@api.get("/chat/decision")
async def chat_decision(session_id: str = "default"):
    # Ces décisions sont des EXEMPLES codés en dur : jamais servies en
    # production, où elles se lisaient comme de vraies données du compte
    # (« MRR 12 480 € », un prospect nommé) alors que rien ne les produisait.
    from auth_real import IS_PREVIEW
    return {"decisions": DEMO_DECISIONS if IS_PREVIEW else []}

@api.post("/chat/decision/{decision_id}")
async def chat_decision_apply(decision_id: str, data: Dict[str, Any] = None):
    decision = (data or {}).get("decision")
    if decision == "approve":
        return {"status": "approved", "message": "C'est validé. J'ai créé la mission correspondante et je vous tiens informé de l'avancement."}
    return {"status": "deferred", "message": "Entendu, je reporte cette décision. Elle réapparaîtra dans votre prochain point du jour."}


from auth_real import router as auth_router, init_db  # noqa: E402

init_db()
# Monté AVANT le catch-all : sans cet ordre, /api/oauth/... serait avalé par
# la route fourre-tout et renverrait [] (le bug de connexion constaté en prod).
app.include_router(auth_router, prefix="/api")
app.include_router(api)


# ── Catch-all doux ───────────────────────────────────────────────────────
# GET      → []  (évite les crash « .map is not a function » ; les états
#                 « vides » s'affichent proprement)
# mutations → {} (POST/PUT/PATCH/DELETE)
# À remplacer par le vrai backend ZAYADO + clé Mammouth plus tard.
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def catch_all(full_path: str, request: Request):
    logger.info(f"[demo catch-all] {request.method} /api/{full_path}")
    if request.method == "GET":
        return JSONResponse(status_code=200, content=[])
    return JSONResponse(status_code=200, content={})


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Service du frontend (build React) — déploiement MONO-SERVICE ──────────
# En production (Railway), le Dockerfile copie le build React dans
# backend/frontend_build ; le backend sert alors l'app + l'API sur la MÊME
# origine (l'API front pointe sur "/api" relatif). En preview, ce dossier
# n'existe pas → ce bloc est ignoré (aucun impact sur l'environnement preview).
from fastapi.responses import FileResponse  # noqa: E402
FRONTEND_BUILD = Path(os.environ.get("FRONTEND_BUILD_DIR", str(Path(__file__).parent / "frontend_build")))

if FRONTEND_BUILD.exists():
    _BUILD_ROOT = FRONTEND_BUILD.resolve()

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Fichier statique demandé (assets, images, manifest…)
        if full_path:
            candidate = (FRONTEND_BUILD / full_path).resolve()
            if candidate.is_file() and _BUILD_ROOT in candidate.parents:
                return FileResponse(candidate)
        # Sinon → fallback SPA (routing côté client React)
        index = _BUILD_ROOT / "index.html"
        if index.is_file():
            return FileResponse(index)
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    logger.info(f"[static] Frontend servi depuis {_BUILD_ROOT}")
else:
    logger.info("[static] Pas de build frontend détecté — mode API seul (preview).")
