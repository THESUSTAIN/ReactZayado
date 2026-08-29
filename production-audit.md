# Audit production — app.zayado.net

Date : 29 août 2026.

## Parcours Google

Depuis `https://app.zayado.net/login` dans le navigateur personnel connecté, le bouton Google redirige immédiatement vers `https://app.zayado.net/undefined`, avec une page vide. Le bug est reproductible en production.

## Parcours alternatif

Depuis la même page, le bouton « Continuer avec thesustain.net » ouvre correctement `https://app.zayado.net/` et affiche le cockpit « Aujourd’hui aligné ».

## Navigation après connexion

Le module `/vision` s’ouvre et affiche son état vide initial sans écran blanc. Le module `/croissance` s’ouvre également et affiche le pipeline commercial vide, les onglets et le formulaire d’ajout de prospect.

## Cause identifiée dans le code fourni

Le frontend appelle `POST/GET /api/oauth/{provider}` et `GET /api/oauth/{provider}/start`, alors que le backend fourni expose les routes `/api/auth/oauth/{provider}/start` et `/api/auth/oauth/{provider}/exchange`. La réponse ne contient donc pas `authorization_url`, puis `window.location.href = res.authorization_url` produit la navigation vers `/undefined`.

## Correction appliquée dans la copie de travail

Dans `frontend/src/lib/api.js`, `oauthStart` appelle désormais `POST /auth/oauth/{provider}/start` avec `{ redirect_uri }`, et `oauthExchange` appelle `POST /auth/oauth/{provider}/exchange` avec `{ code, redirect_uri }`.

## Durcissement ajouté

Dans `frontend/src/pages/Login.jsx`, la réponse de `oauthStart` est maintenant validée avant navigation. Si `authorization_url` est absente ou invalide, l’utilisateur reste sur l’écran de connexion avec le message d’échec Google/Microsoft au lieu d’obtenir une page vide.

## Vérifications locales

La compilation frontend (`yarn build`) passe avec succès après les corrections. Les tests backend n’ont pas pu être lancés, car le module `pytest` n’est pas installé dans l’environnement de travail.
