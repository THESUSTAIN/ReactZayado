# MyExtension Business — PRD

## Problem statement (original)
Web app + PWA pour solopreneurs. Concept: "de la vision à l'action". Beaucoup d'entrepreneurs ont une vision mais abandonnent par manque de mindset. Design: navy dégradé + accents or, cartes blanches transparentes (glass) avec contour blanc, menu latéral minimal. Pages: Pilotage, Bien-être, Vision.

## User choices
- Vraie IA (copilote Kairos) via Emergent LLM key, modèle OpenAI gpt-5.4.
- Pas d'authentification pour le MVP.
- Données créées/modifiées par l'utilisateur (CRUD).
- 3 onglets: Pilotage + Vision + Bien-être.
- Module mindset intégré au Bien-être (rituels, affirmations, anti-abandon), pas trop de modules.

## Architecture
- Backend: FastAPI + MongoDB (motor). All routes /api prefixed. Collections: factures, depenses, objectifs, rituels, humeur, settings, chat_messages.
- Frontend: React (CRA/craco) + Tailwind + shadcn/ui + recharts + framer + lucide. Three-pane layout (left sidebar / center / right Kairos panel). Mobile bottom nav + drawers.
- AI: emergentintegrations LlmChat (gpt-5.4), streaming SSE-like text/plain, history persisted in Mongo.
- PWA: manifest.json, sw.js (network-first navigation, cache assets), icons, registered in index.js.

## User personas
- Solopreneur / entrepreneur solo pilotant finances, vision et énergie.

## Core requirements (static)
- Pilotage: KPI (trésorerie, CA, marge, résultat net), évolution trésorerie, factures & dépenses CRUD, analyse DAF IA.
- Vision: vision éditable, piliers/objectifs CRUD avec progression, score d'alignement, SWOT, mindset fondateur.
- Bien-être: check-in énergie/humeur, jauges, courbe d'énergie, rituels (toggle/streak), affirmations, anti-abandon.
- Kairos: copilote IA contextuel (chat streaming, suggestions).

## Implemented (2026-06)
- Full 3-page app with navy+gold glass design, minimal sidebar, Kairos panel. [done]
- Backend CRUD for factures/depenses/objectifs/rituels/humeur + vision setting + KPIs. [done]
- Kairos real AI streaming chat + history. [done]
- PWA installable (manifest, SW, icons). [done]
- Auto-seed demo data on first load. [done]
- Tested: backend 100% (10/10), frontend 100%. [done]

## Backlog (prioritized)
- P1: Prévisions de trésorerie (projection page/section).
- P1: Rapports / export PDF réel.
- P2: Suivi historique réel de l'énergie (courbe basée sur les check-ins).
- P2: Authentification (JWT ou Google) + multi-utilisateurs.
- P2: Décisions du jour interactives (topbar).

## Next tasks
- Await user feedback; likely add Prévisions and real energy history.

## Update (2026-06) — Intégration modèle « Zayado / MyExtension AI »
Contexte: l'utilisateur a fourni un zip du vrai projet déployé (FastAPI+SQLAlchemy, ~250 deps, Railway/Docker, admin sur WordPress). Consigne: NE PAS tout migrer — comparer les deux frontends et convertir/porter le nécessaire.
Fait:
- Porté le MODÈLE EXACT de la sidebar (rail 96px repliable, menu-island + scoop SVG, tooltips, gem Paramètres, poignée ‹, edge-strip) et du header (transparent, recherche Cmd+K, toggle thème, notifications, écosystème, profil dropdown) depuis le zip → /app/frontend/src/components/Layout.jsx + index.css.
- Fond navy immersif (.sky-bg), palette navy #0B1F3A / or #C9A449.
- PWA: service-worker.js du zip + manifest + prompt d'installation (beforeinstallprompt → toast "Installer").
- Logos du zip copiés dans public/. Graphe trésorerie corrigé (ligne or visible).
Reste à faire (backlog immédiat, à faire ENSEMBLE):
- Erreur déploiement `public-site` (Metal builder) — config déploiement, pas le code. À diagnostiquer via l'outil de déploiement.
- Porter/convertir la page Paramètres (Settings.jsx du zip) dans l'app. (Admin = WordPress, pas de panneau React.)
- Revue des 3 pages (Pilotage / Vision / Bien-être) : comparer current vs zip, corriger/supprimer/améliorer.
