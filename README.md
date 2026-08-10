# Zayado — MyExtension AI

Copilote business pour entrepreneurs et TPE/PME : un **cockpit** (vision, objectifs, finances, bien-être, tâches), des **agents IA**, une **extension navigateur** (miroir Gmail/Agenda), un **back-office WordPress** (plugin admin) et un site public.

> Écosystème Zayado — marketplace de mutualisation & entraide entre pros.

---

## Architecture

```
┌──────────────┐   HTTPS /api   ┌───────────────────┐        ┌─────────────┐
│  Frontend    │ ─────────────► │  Backend FastAPI  │ ─────► │  DB (MySQL/ │
│  React (CRA) │ ◄───── SSE ───┤  (SQLAlchemy async)│        │  Postgres/  │
└──────────────┘                └───────────────────┘        │  SQLite)    │
       ▲                              ▲     ▲                 └─────────────┘
       │ extension (side-panel SSE)   │     │ X-Zayado-Secret
┌──────┴───────┐              ┌────────┴──┐  └────────────┐
│ Extension MV3│              │ WordPress │   Intégrations: Brevo (email),
│ (Chrome/Edge)│              │  Plugin   │   Mammouth (IA), Google/MS OAuth,
└──────────────┘              │  Admin    │   HeyGen (vidéo), Mollie (paiement)
                              └───────────┘
```

- **Backend** : `backend/` — FastAPI, ~75 routers sous `routes/`, entrée `server.py` (`main.py = from server import app`).
- **Frontend** : `frontend/` — React + craco, entrée `src/App.js`.
- **Extension** : `backend/chrome-extension/` — MV3 (background, content, side-panel).
- **Plugin admin** : livré à part (`zayado-admin-v2.zip`) — WordPress, rend en server-side vers `/api/admin/*`.

---

## Base de données
Sélection automatique (`database.py`) :
1. `DATABASE_URL` si fournie (Railway : `mysql://…` → `mysql+asyncmy://`, `postgres://…` → `postgresql+asyncpg://`).
2. Sinon `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` + `NODE_ENV=production` → MySQL.
3. Sinon **SQLite** local (`backend/zayado.db`) pour le dev.

⚠️ **En prod, garder `NODE_ENV=production` + credentials DB**, sinon fallback SQLite (perte de données).

---

## Variables d'environnement (backend/.env)
| Clé | Rôle |
|---|---|
| `JWT_SECRET`, `FERNET_KEY` | Auth & chiffrement |
| `DATABASE_URL` **ou** `DB_*` + `NODE_ENV=production` | Base prod |
| `FRONTEND_URL`, `CORS_ORIGINS` | CORS (liste blanche, jamais `*`) |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Emails transactionnels |
| `MAMMOTH_API_KEY` (= `MAMMOUTH_API_KEY`) | IA (Claude/GPT via Mammouth) |
| `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET` | OAuth |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_PATH`, `VAPID_SUBJECT` | Web Push |
| `HEYGEN_API_KEY` | Génération vidéo avatar |
| `WP_CONNECTOR_SECRET` | Secret partagé plugin↔backend (HeyGen + inbound News-Reprise) |
| `NEWS_REPRISE_MAILBOX/NOTIFY/DELAY_HOURS/BREVO_LIST_ID` | Boîte de reprise IA |
| `MOLLIE_API_KEY` | Paiements |

Frontend (`frontend/.env`) : `REACT_APP_BACKEND_URL`.

---

## Lancer en local
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
# Frontend
cd frontend && yarn install && yarn start
```
Health : `GET /api/health` → `{"status":"ok","db":true}`.

---

## Fonctionnalités notables
- **Cockpit** : clock, vision board, priorités du jour, CA, bien-être, score business.
- **Vision Board** : SWOT/scores, partage public, flipbook.
- **Extension** : miroir Gmail/Agenda → side-panel, actions contextuelles, **cockpit en direct (SSE)**.
- **Plugin admin (10 onglets)** : Vue d'ensemble, Utilisateurs, Revenus, Génération IA, **Vidéo HeyGen**, Emails Brevo, **News-Reprise**, **Citations**, **Gel notifications**, CRM, Affiliation, Config.
  - **Rôles** : capacité `zayado_content` + rôle `zayado_commercial` (contenu/communication) vs `manage_options` (admin).
- **News-Reprise** : email concurrent → IA le réécrit au nom de Zayado → brouillon planifié +72h → notif équipe.
- **Gel notifications** : blocage global pendant une correction ; seule la dernière repart à la réactivation.
- **Citations** : jeux chrétien / laïque, citation du jour (0h) + planifiées à 30 j.
- **Démo Investisseur** (compte Thomas/admin) : bouton bas-gauche qui peuple le cockpit en <1s.

---

## Déploiement
- **Backend** : Railway (Docker `backend/Dockerfile` / `Procfile`). Définir toutes les variables ci-dessus dans Railway (le `.env` n'est **pas** commité).
- **Frontend** : build statique `yarn build` (Railway/Vercel/Netlify).
- **Plugin admin** : uploader `zayado-admin-v2.zip` dans WordPress (Hostinger), puis Configuration → renseigner API URL, token admin et `WP_CONNECTOR_SECRET`.

---

## Comptes de démo (dev)
Voir `memory/test_credentials.md`.
