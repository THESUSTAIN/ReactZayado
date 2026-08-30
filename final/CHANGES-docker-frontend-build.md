# Analyse du log de build fourni (30/08)

## Ce que dit vraiment le log
L'erreur est :
```
COPY --from=frontend /frontend/build ./frontend_build
failed to calculate checksum of ref ...: "/frontend/build": not found
```
Deux étapes nommées `frontend` (image `node:20-alpine`) et `app`
(image `python:3.11-slim`), avec un `COPY --from=frontend`.

## Pourquoi ce n'est PAS un bug dans le zip livré
Aucun des 3 Dockerfile du projet (`Dockerfile` racine,
`backend/Dockerfile`, `WhatsApp-service/Dockerfile`) ne correspond à ce
qui échoue :
- Aucun n'a d'étapes nommées `frontend` / `app` (pas de build multi-stage
  de ce type).
- Aucun n'utilise `python:3.11-slim` (les deux Dockerfile Python du
  projet utilisent `python:3.11-bullseye`).
- Aucun ne copie vers `./frontend_build`.

**Conclusion : ce build n'utilise pas le `Dockerfile` du repo.** Il
s'agit très probablement du builder automatique de Railway (Railpack),
qui a généré son propre plan de build multi-stage pour un monorepo
Python + Node — et qui suppose par défaut une sortie de build de type
Create React App (`frontend/build`). Ce projet utilise Vite, dont la
sortie par défaut est `frontend/dist` (confirmé par le log lui-même :
`dist/index.html`, `dist/assets/...`) — d'où le "not found".

## Correctif côté Railway (à faire dans le dashboard, pas dans le code)
Le `railway.json` à la racine du repo précise déjà
`"builder": "DOCKERFILE"` / `"dockerfilePath": "Dockerfile"`, donc en
théorie Railway devrait ignorer Railpack. Si ce build automatique se
déclenche quand même, c'est que le réglage du **service** dans le
dashboard Railway ne suit pas ce fichier (ça arrive quand le service a
été créé avant l'ajout du Dockerfile, ou que le "Root Directory" du
service n'est pas `/`). À vérifier :
1. Ouvrir le service concerné → **Settings → Build**
2. **Builder** doit être forcé sur **Dockerfile** (pas "Auto-détecter" /
   Railpack)
3. **Dockerfile Path** = `Dockerfile` (celui de la racine)
4. **Root Directory** du service = `/` (racine du repo)
5. Redéployer

## Correctif appliqué dans ce zip (bug réel trouvé au passage)
`backend/Dockerfile` (le Dockerfile secondaire, non utilisé par
`railway.json` mais présent dans le repo) référençait encore
`frontend/build/*` — un reliquat de l'époque Create React App. Le
frontend est maintenant sur Vite (sortie `dist/`), comme le confirme
déjà le `Dockerfile` racine. Corrigé pour copier `frontend/dist/*` et
retiré les variables d'env CRA (`REACT_APP_BACKEND_URL`,
`GENERATE_SOURCEMAP`) obsolètes, remplacées par les vraies variables
Vite du projet (`VITE_API_URL`, `VITE_SAAS_URL`, `VITE_WP_URL`), comme
dans le Dockerfile racine.

## Fichier modifié
- `backend/Dockerfile`
