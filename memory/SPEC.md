# Living Specs — deux applications distinctes dans ce workspace

> ⚠️ Ne pas confondre les deux : elles ont des stacks, des ports et des dossiers différents.

| | App A — Cockpit IA Zayado (maquette) | App B — Zayado production (projet réel) |
|---|---|---|
| Dossier | `/app/frontend` + `/app/backend` | `/app/zayado` |
| Stack | Vite + React 19 + TS strict / FastAPI + Mongo | CRA 5 + craco + JS / FastAPI + SQLAlchemy + SQLite |
| Ports | 3000 / 8001 | 3001 / 8002 |
| Supervisor | `frontend`, `backend` | `zayado-frontend`, `zayado-backend` |
| Auth | aucune (localStorage) | JWT (comptes réels, OAuth, lien magique) |
| Production | preview Emergent | https://app.zayado.net (Railway) |

---

# App A — Cockpit IA Zayado (maquette frontend)

Frontend-only (français) pour indépendants : 10 modules (Aujourd'hui, Vision, Radar, Agent
Business, Actions, Idées, Copilote IA, Pouls Business, Revue Hebdo, Bien-être). Thème Revo
sombre, accent navy, cartes en verre. **Aucun login, aucune page publique.** Tout l'état est
dans `localStorage` (clé `zayado-cockpit-v1`) et **toute l'IA est SIMULÉE** (données
pré-écrites dans `frontend/src/lib/seed.ts`). Détail des modules et des testids : voir
l'historique de ce fichier et `frontend/src/lib/types.ts`.

---

# App B — Zayado (projet réel, installé depuis le zip)

## Ce que c'est
Le vrai SaaS Zayado (anciennement « Kairos » en interne — ce nom subsiste dans les fichiers,
routes et clés de stockage pour compatibilité). Cockpit IA privé + espace vendeur + espace
acheteur, déployé sur Railway derrière `app.zayado.net`.

## Architecture
- **Frontend** : CRA 5 + craco, Tailwind, Radix, React Router 7, framer-motion, lenis.
  Appelle l'API en **relatif** (`/api`) — en production nginx (`frontend/nginx.conf`) relaie
  vers le backend, en local c'est `frontend/src/setupProxy.js` (ajouté ici).
  Couche API : `src/lib/kairosApi.js` + `src/lib/part2Api.js`. JWT dans `localStorage`
  sous `kairos_access_token`.
- **Backend** : FastAPI + SQLAlchemy async + SQLite (`backend/kairos.db`), toutes les routes
  sous `/api`. Entrée `backend/server.py` (~4000 lignes) + `commerce_ext.py`,
  `part2_ext.py`, `vision_plus.py`, `heygen_routes.py`, `llm_mammouth.py`.
- **Service WhatsApp** : `WhatsApp-service/` (Node), service Railway séparé.
- **IA** : Emergent LLM key (Claude Sonnet 4.5) avec repli local si la clé manque ou échoue.

## Auth & rôles
- Routes : `/api/auth/register`, `/api/auth/login`, `/api/auth/me`,
  `/api/connexion/{options,lien,verifier,demo,apercu}`,
  `/api/connexion/oauth/{provider}/{start,callback,echange}`.
- Rôles : `client`, `vendeur` (+ admin via `ADMIN_EMAILS`).
- `REQUIRE_AUTH=1` coupe le repli « mode démo » — à garder à 1 en production.
- Routes privées côté front : `/app*`, `/onboarding`, `/parametres`, `/espace-vendeur`,
  `/mon-espace`, `/acheter` → redirigées vers `/login` sur 401.

## Corrections appliquées lors de l'installation (2026-09-24)
1. **`backend/server.py` — ordre des middlewares (vrai bug).** `_AuthMiddleware` était
   enregistré APRÈS `CORSMiddleware`, donc le plus à l'extérieur : son `JSONResponse(401)`
   court-circuitait la pile et repartait **sans** `Access-Control-Allow-Origin`. Tout client
   cross-origin voyait une erreur CORS opaque au lieu du 401 lisible. Ordre inversé → CORS
   est désormais le plus externe et tous les statuts portent les bons en-têtes.
2. **`frontend/src/setupProxy.js` (ajouté).** Rétablit la parité avec la production : `/api`
   est servi en même origine en local (gère aussi le streaming SSE du Copilote).
   `REACT_APP_BACKEND_URL` doit rester **vide**.
3. **`backend/.env.example` (ajouté).** Le zip ne contenait aucun `.env` : sans `FERNET_KEY`
   les clés d'intégration sont stockées **en clair**, et `JWT_SECRET` non persistant
   déconnecte tous les comptes à chaque redéploiement.
4. **Secrets retirés du suivi git.** `.token_sara`, `.token_vendeur`, `.token_test` **et
   `backend/kairos.db`** étaient versionnés. La base contenait **26 comptes réels**
   (emails + hash bcrypt, dont `admin@zayado.fr`) et les données personnelles de 8 tables
   `vision_*`. `git rm --cached` + règles `.gitignore`. ⚠️ **Les données restent dans
   l'historique git** (3 commits) : purge de l'historique + rotation du mot de passe admin
   encore nécessaires côté dépôt d'origine.
5. **Alerte au démarrage sur `MAMMOTH_API_KEY` (ajoutée).** Son absence ne produisait
   aucun log : l'app basculait silencieusement en repli local.
6. **`GET /api/admin/diagnostics` (ajouté, admin-only).** Renvoie l'état de configuration
   de chaque clé sous forme de **booléens uniquement** (jamais de valeur, même tronquée) —
   permet de vérifier HeyGen/Mammouth sur la production juste après un déploiement.

## ⚠️ Clé IA : `MAMMOTH_API_KEY`, pas `EMERGENT_LLM_KEY`
L'IA texte passe par **Mammouth AI** (`llm_mammouth.py`, `https://api.mammouth.ai/v1`,
modèle `claude-sonnet-4-5`) et lit **uniquement** `MAMMOTH_API_KEY` (ou `MAMMOUTH_API_KEY`).
Le code n'utilise ni `EMERGENT_LLM_KEY` ni `OPENAI_API_KEY`.

**Clé fournie et active depuis le 2026-09-24** → IA réellement testée :
- `GET /api/cockpit/radar?refresh=true` → `source: "ia"`, 3 opportunités personnalisées
  (95/88/82) rattachées aux objectifs Vision
- Agent Business → `ia: true`, répond avec les vrais tarifs de la base de connaissances
- Copilote IA → streaming SSE fonctionnel

Sans cette clé l'application **ne plante pas**, elle se dégrade en silence — d'où le
bandeau d'alerte (point 7 ci-dessous).

## Corrections & ajouts (suite, 2026-09-24)
7. **Bandeau « IA en mode repli » (ajouté).**
   `backend` : `GET /api/ia/statut` (tout utilisateur connecté) → `{ia_active, modele, message}`,
   aucun secret renvoyé.
   `frontend` : `src/components/kairos/AiFallbackBanner.jsx`, monté sur **Cockpit**,
   **Radar** et **Agent Business**. Ne rend **rien** quand l'IA fonctionne ; affiche un
   bandeau ambre `data-testid="bandeau-ia-repli"` sinon.
8. **Base locale assainie + mot de passe admin rotaté** — voir
   `/app/memory/test_credentials.md`.
9. **`scripts/purge-historique-secrets.sh` (ajouté et testé).** Purge `backend/kairos.db`
   et les `.token_*` de **tous** les commits (git-filter-repo, repli filter-branch),
   crée une sauvegarde `.bundle`, vérifie le résultat. Validé sur un clone jetable :
   26 comptes extractibles de l'historique avant → 0 objet sensible atteignable après.
   ⚠️ L'historique du workspace `/app` **n'a pas** été réécrit (aucun remote → jamais
   publié, et la réécriture casserait les points de restauration de la plateforme) :
   4 objets sensibles y subsistent. Décision laissée à l'utilisateur.

## Points à surveiller (non corrigés, volontairement)
- `HEYGEN_API_KEY` absente en local → vidéos IA indisponibles. Statut en production
  **non vérifiable depuis l'extérieur** (routes HeyGen admin-only → 401 anonyme) :
  utiliser `/api/admin/diagnostics` avec un compte admin.
- 1 warning eslint : `src/components/kairos/BreathingSession.jsx` (`react-hooks/exhaustive-deps`).

## Vérification
- Identifiants de test : `/app/memory/test_credentials.md`.
- Rapports : `/app/test_reports/iteration_1.json` (8/8) et `iteration_2.json` (**17/17,
  0 bug**) — Radar, Agent Business, Vision board, diagnostics et hygiène des secrets inclus.
