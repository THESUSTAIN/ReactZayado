# Correction — échec de build Railway (nixpacks / railpack)

## Diagnostic
Le zip fourni contenait un dossier `_incoming/final-main/final-main/` — une
copie complète et dupliquée de l'ancien état du projet, imbriquée par erreur
lors d'un export précédent. Cette copie interne contenait justement les
fichiers de config de déploiement qui **manquaient à la racine réelle** :
`railway.json`, `nixpacks.toml`, le `Dockerfile` racine, et le dossier
`public-site/` entier (le site vitrine, service Railway séparé).

Conséquence directe des deux erreurs des logs :
- **nixpacks** : sans `railway.json` à la racine pour indiquer le builder,
  Railway est retombé sur l'auto-détection nixpacks, qui a vu un dossier
  racine ambigu (`frontend/`, `backend/`, `tests/`, `_incoming/`, aucun
  point d'entrée clair) et a abandonné : *"Nixpacks was unable to generate
  a build plan"*.
- **railpack** : un autre service Railway du même projet a sa "root
  directory" pointée sur `public-site` — qui n'existait tout simplement pas
  à la racine du zip, d'où *"directory .../public-site does not exist"*.

## Correctif
- `railway.json`, `nixpacks.toml`, `public-site/` remontés à la racine
  (copiés depuis `_incoming/.../`, qui les avait — inchangés).
- `Dockerfile` racine : **pas** repris tel quel depuis `_incoming` (il était
  périmé — `REACT_APP_BACKEND_URL` y était codé en dur sur
  `https://app.zayado.net`). Le `Dockerfile` déjà présent dans `backend/`
  est plus récent et corrige déjà ça (URL vide → appels `/api` relatifs,
  donc valides quel que soit le domaine). C'est celui-ci qui a été promu à
  la racine.
- `_incoming/` supprimé entièrement — dupliquait ~11 Mo et confondait la
  détection automatique de build.
- `.dockerignore` ajouté (n'existait pas) : exclut `.git`, `node_modules`,
  `_incoming`, `test_reports/`, `memory/`, la DB SQLite locale, et
  `public-site/` (service Railway séparé, avec son propre build — inutile
  dans l'image du backend). Sans ça, chaque build Docker copiait des
  fichiers inutiles dans le contexte, plus lent et plus fragile.

## Non vérifié (pas d'accès Railway depuis cet environnement)
Le build n'a pas été relancé réellement sur Railway — seule la structure de
fichiers et la validité syntaxique/JSON ont été vérifiées ici. À confirmer
par un vrai déploiement.

## Ce qui n'a PAS changé
Aucun fichier de code applicatif (`backend/*.py`, `frontend/src/*`) n'a été
touché dans cette passe — uniquement la structure de fichiers/config de
déploiement à la racine.
