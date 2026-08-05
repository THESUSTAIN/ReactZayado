# MyExtension IA — *by Zayado*

> **En une phrase :** MyExtension IA est le **cockpit IA des indépendants et TPE** — un assistant qui prépare (analyses, contenus, pilotage), pendant que vous décidez.
>
> **Zayado** est la société éditrice (maison mère). **MyExtension IA** est le produit/l'application.

---

## 🧭 Ce que fait l'application
Un tableau de bord unique (« cockpit ») qui réunit :
- **Cockpit / Dashboard** — priorités du jour, KPI, vision, insights IA.
- **Vision Board** — canvas stratégique, piliers, SWOT, Studio (image/vidéo), Vision Book PDF.
- **Pilotage** — finances (CA/charges), alertes, export comptable (Pennylane/Indy).
- **Travail** — CRM (pipeline), projets (TJM/temps), documents, DAF IA.
- **Croissance** — prospects chauds, campagnes, insights growth.
- **Bien-être** — check-in énergie, indicateurs (burnout), habitudes (données sensibles).
- **Simulation** — clients virtuels IA pour s'entraîner.
- **Mon Bureau** — tâches, process, co-pilote à mémoire longue, cloud (Drive/OneDrive).

## 🏗️ Architecture
| Composant | Stack | Rôle |
|---|---|---|
| `backend/` | **FastAPI + SQLAlchemy (async)** — **MySQL** en prod / **SQLite** en dev | API `/api/*`, auth, crédits, agent IA, paiement Mollie, crons |
| `frontend/` | **React 19 (CRA/CRACO) + Tailwind + Radix/shadcn** | Le cockpit applicatif (`app.myextension-ai.com`) |
| `public-site/` | **React 18 + Vite** | Site vitrine / boutique / blog (contenu WordPress headless) |
| `docs/` | PHP mu-plugin | Intégration WordPress (REST API) |

- **IA** via proxy **Mammouth** (`api.mammouth.ai`) — modèles Claude Haiku/Sonnet.
- **Auth** passwordless : magic-link email + OAuth Google/Microsoft + SSO.
- **Base de données** : **PAS MongoDB**. MySQL (prod) / SQLite (dev), via `DATABASE_URL`.

## 🚀 Démarrage local
```bash
# 1) Backend
cd backend
cp env.example .env            # puis générez JWT_SECRET / FERNET_KEY (voir env.example)
pip install -r requirements.txt
uvicorn server:app --reload --port 8001   # SQLite auto si DATABASE_URL vide

# 2) Frontend
cd ../frontend
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn install
yarn start                     # http://localhost:3000
```
Santé backend : `GET /api/health` → `{"status":"healthy"}` · Docs API : `/api/docs`.

## 🔐 Sécurité — à respecter
- **Aucun secret dans le repo.** `JWT_SECRET`, `FERNET_KEY`, clés API : uniquement en `.env` local / Variables Railway.
- Ne jamais committer `backend/zayado.db`, `backend/admin_config.json`, ni un `.env` (voir `.gitignore`).

## ☁️ Déploiement
Railway (voir `Dockerfile`, `railway.json`, `nixpacks.toml`). Le frontend est buildé puis servi statiquement par le backend (`backend/static/`).

## 📄 Audit technique
Voir **`AUDIT.md`** à la racine (audit investisseur + dev senior, module par module).
