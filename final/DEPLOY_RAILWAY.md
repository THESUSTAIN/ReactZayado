# Déploiement Railway — MONO-SERVICE

Ce dépôt se déploie en **un seul service** : le backend FastAPI sert l'API
(`/api/*`) **et** le build du frontend React, sur la **même origine**.

## 1. Builder = Dockerfile
Le build Nixpacks échouait car le dépôt contient frontend **et** backend.
On force donc le **Dockerfile** :
- `railway.json` contient déjà `"builder": "DOCKERFILE"`.
- Sinon : Railway → **Settings → Build → Builder = Dockerfile**.

Le Dockerfile :
1. construit le frontend (`yarn build`, avec `REACT_APP_BACKEND_URL=""` → API relative `/api`),
2. installe le backend Python (dont `emergentintegrations`),
3. copie le build dans `backend/frontend_build`,
4. lance `uvicorn server:app --host 0.0.0.0 --port $PORT`.

## 2. Variables d'environnement à définir sur Railway
Dans **Variables** du service :

| Variable | Valeur |
|---|---|
| `MAMMOUTH_API_KEY` | votre clé Mammouth (chat IA réel) |
| `MAMMOUTH_BASE_URL` | `https://api.mammouth.ai/v1` |
| `MAMMOUTH_MODEL` | `claude-haiku-4-5-20251001` (ou votre modèle) |

> Le backend de PREVIEW est **stateless** (pas de MongoDB requis).
> `PORT` est fourni automatiquement par Railway — ne pas le fixer.
> Ne PAS définir `REACT_APP_BACKEND_URL` (l'app utilise `/api` en relatif).

## 3. Domaine
Relier `app.zayado.net` à CE service (Railway → **Settings → Networking →
Custom Domain**). Le bouton "compte test (Thomas)" est masqué hors preview.

## 4. Vérification post-déploiement
- `https://<domaine>/api/health` → `{ "status": "ok" }`
- `https://<domaine>/` → page d'accueil (tunnel de vente) puis `/login`.
- `https://<domaine>/tarifs` → page tarifs.
