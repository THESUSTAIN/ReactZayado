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

## 2026-06 — Sprint 1 : Réorganisation navigation (validé par testing_agent, 100%)
Structure validée par l'utilisateur : 5 piliers + "Moi" sous l'avatar.
- Nav (Sidebar + BottomNav) = **Cockpit · Vision · Croissance · Espace de travail · DAF IA** (+ Co-pilote). "Bien-être" retiré du menu.
- **Croissance** réintégrée au menu (était orpheline).
- **DAF IA** : /pilotage relabellisé "DAF IA — Pilotage financier" + CTA "Faire superviser par Zayado" (l'app = visualisation, pas compta ; supervision humaine Zayado).
- **Moi** (bien-être) accessible via menu profil/avatar (profile-moi -> /bien-etre). Check-in énergie reste surfacé dans le Cockpit.
- **Espace de travail** : onglet CRM retiré (CRM reste dans Croissance) ; onglet Documents = bannière "connexion à votre Drive (Google/OneDrive), on ne remplace pas votre outil" + bouton Connecter.
- Backend : provider LLM par défaut = **mammouth** (Emergent jamais crédité sauf bascule admin) + **alerte email Brevo** si crédit Mammouth épuisé / clé invalide (throttlé).

## Backlog priorisé (reste à faire, global)
- P1 Onboarding : modale "mode d'emploi" se ré-affiche -> rendre "ne plus afficher" persistant + un seul tour au 1er login + pré-remplir le Cockpit à l'inscription (fin du "0%").
- P1 Extension navigateur MV3 : ABSENTE (dossier backend/chrome-extension manquant, endpoint 404) alors que le produit s'appelle "MyExtension".
- P1 CRM : brancher la synchro réelle des leads vers HubSpot/Brevo/Pipedrive (aujourd'hui: connexion + test token seulement, pas de sync).
- P2 PWA : service worker manquant (offline + push VAPID KO) — manifest OK.
- P2 DAF IA : fusion complète Pilotage->DAF IA + sync bancaire/Stripe + prévisionnel trésorerie.
- P2 Cockpit immersif : 3e barre de nav (Vision Board/CRM/DAF IA/Growth Agent/Boutique) à aligner sur les 5 piliers.
- P3 Landings LP1-4 + suppression ~21 pages legacy ; pricing unifié ; Campus (ex-Simulation) ; Indice d'Alignement.

## 2026-06 — Sprint 2 : 5 tâches (validé testing_agent, 6/6 testables)
- PWA complète : service worker (frontend/public/service-worker.js) + registerServiceWorker (lib/pwa.js) dans index.js + helper subscribeToPush (backend push VAPID déjà présent). SW enregistré confirmé.
- Extension navigateur MV3 : dossier backend/chrome-extension (manifest v3, popup, background contextmenu, content, icônes) -> endpoint /api/extension/download renvoie un vrai zip (200). Capture prospect -> /croissance?capture_*.
- Onboarding persistant : App.js onClose écrit localStorage zayado_onboarding_seen_<path> -> ne réapparaît plus (bug testeur corrigé).
- Sync CRM externe : POST /api/growth/leads/{id}/push-crm (Brevo/HubSpot, creds Fernet) + growthExtApi.pushLeadToCrm + bouton "CRM" (data-testid lead-crm-<id>) sur chaque carte lead. On POUSSE dans le CRM de l'user (pas de concurrence).
- Barre Cockpit immersif (InspirationScreen DOCK) alignée sur les 5 piliers : Cockpit/Vision/Croissance/Espace de travail/DAF IA/Boutique (fin de la 3e nav divergente ; /bureau -> /travail).
- Config : AI_PROVIDER=mammouth ajouté au .env.

### Reste (prochain sprint) : WhatsApp/IA multi-canal (déjà déployé Railway via micro-service + WA_SERVICE_SECRET) — construire l'ÉCRAN de gestion Agent IA + conversations ; réseaux sociaux (Instagram/Messenger) "à venir" ; seed d'un lead démo pour tester le push CRM en UI.
