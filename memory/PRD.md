# PRD — Zayado / MyExtension AI

## Problème / Objectif
Installer proprement le projet `final-main` (web app existante déjà déployée sur Railway) dans
l'environnement local SANS casser la prod, puis fusionner `corrections.zip`, puis lister les bugs.

## Stack
- Frontend: React 19 + CRACO + Tailwind (CRA), dev server sur :3000
- Backend: FastAPI + SQLAlchemy async (uvicorn :8001), 69 routers sous `/api`
- DB: MySQL en prod (Railway) / SQLite en local (`backend/zayado.db`, fallback auto)
- Déploiement prod: Railway (Dockerfile / nixpacks) → NON modifié
- LLM: Mammoth (proxy) + Emergent LLM key (emergentintegrations) en repli

## Historique
### 2026-06 — Installation (Phase 1 + 2) ✅
- Phase 1: `final-main` copié dans /app (backend + frontend), `.env` locaux créés
  (SQLite fallback, JWT/FERNET générés), deps installées (pip + yarn). App boot + login test OK.
- Phase 2: `corrections.zip` fusionné (overwrite + nouveaux fichiers):
  - `server.py`: CORS durci (ignore `*` avec allow_credentials, whitelist stricte)
  - `agent_webhooks.py`: vérification signature Meta X-Hub-Signature-256 + retry Mammoth
  - `connections.py`, `Dockerfile`, `env.example`, `nixpacks.toml` mis à jour
  - `requirements.txt`: +alembic, -emergentintegrations/-motor/-pymongo
  - Nouveau dossier `alembic/` (migrations, baseline schema)
- Vérifié: `/api/health`, login magic-link (Thomas), `/api/auth/me`, `/api/dashboard`,
  `/api/projects`, `/api/folders`, `/api/features/*`, `/api/prompts` → tous 200. Cockpit UI OK.

## Bugs / Points d'attention (Phase 3)
- P1: Conflit de deps `emergentintegrations==0.2.0` (exige `openai==1.99.9`) vs `openai==2.16.0`.
  Les corrections retirent emergentintegrations de requirements, mais le code l'importe encore
  en lazy import → les appels IA via Emergent key peuvent échouer. Mammoth reste le chemin principal.
- P2: Clés externes non configurées en local (Google/Microsoft OAuth, Brevo email, Mollie paiement,
  MAMMOTH_API_KEY, UNSPLASH_ACCESS_KEY) → fonctionnalités correspondantes inactives/simulées.

## Backlog / Next
- Confirmer les vraies clés/env pour tester OAuth, email, paiement, IA.
- Décider du sort de emergentintegrations (aligner openai, ou supprimer l'import lazy).
- Tester les webhooks WhatsApp (signature) une fois WA_APP_SECRET fourni.
