# Architecture Zayado — carte vérifiée (audit 2026-06)

Établie à partir du code et des configurations du dépôt (pas de l'arborescence seule).

## 1. Applications et services actifs

| Application | Rôle | Point d'entrée | Build / démarrage | Déploiement |
|---|---|---|---|---|
| `backend/` | API FastAPI (SaaS app.zayado.net) | `server.py` → `server:app` | `Dockerfile` (python 3.11, uvicorn sur `$PORT`, IPv4+IPv6) | Railway (`backend/railway.json`, santé `/api/`) |
| `frontend/` | App React 19 + Vite + TS (espace connecté, paiement, admin) | `index.html` → `src/main.tsx` → `src/App.tsx` | `yarn build` (`tsc -b && vite build`), servi par nginx | Railway (`frontend/railway.json`, `nginx.conf` proxy `/api` → `BACKEND_URL`) |
| `WhatsApp-service/` | Microservice Node (sessions whatsapp-web.js) | `server.js` | `node server.js` | Railway, service séparé (`x-service-secret`) |
| `shopify/` | Boutique publique zayado.net (thème Liquid + scripts Python) | `theme-v2/` (thème actif), `outils/*.py` | Scripts `outils/pousser_*.py` via API Admin Shopify | Shopify (thème « Préparation » puis publication) |

Non déployés (sources / outils) :
- `vitrine-entreprise/` : sources CRA de l'ancienne vitrine ; le build était copié dans `frontend/public/public/entreprise/` (voir `DEPLOIEMENT-RAILWAY.md`). Toujours lu par `shopify/outils/generer_produits.py` (`src/data/images.js`) → **à conserver**.
- `exports/` : inventaires et sauvegardes (pages publiques, copie « Zayado-Entreprise-main » = référence design). Aucun import par le code de production.
- `tests/` (racine) : Playwright e2e (`tests/e2e`, `playwright.config.ts`).

Pas de CI GitHub (`.github/` absent) : Railway construit chaque service depuis son Dockerfile.

## 2. Flux entre composants

```
Navigateur ──► frontend (nginx) ──/api──► backend FastAPI ──► MySQL (prod, DATABASE_URL) / SQLite kairos.db (local)
     │                                        ├──► Mollie (paiements, abonnements, webhooks /api/mollie/webhook)
     │                                        ├──► Shopify Admin API (shopify_auth.py, jeton renouvelé ; webhooks signés)
     │                                        ├──► Brevo (e-mails), Mammouth / clé Emergent (IA), Apollo, DataForSEO…
     │                                        └──► WhatsApp-service (HTTP + secret partagé) / Telegram
zayado.net (Shopify) ──liens / iframes /embed/*──► frontend ; ◄── redirections VITE_SHOP_URL (pages publiques)
```

## 3. Backend : organisation réelle

- `server.py` (~7 300 lignes) : configuration, modèles cœur (User, VisionProfile…), auth JWT + `_AuthMiddleware`
  (liste blanche `_ROUTES_PUBLIQUES_*`), e-mails, IA, ~140 routes historiques.
- **Modules `*_ext.py`** : chacun expose `install_xxx(g)` et reçoit `globals()` de `server.py`
  (accès à `api`, `Base`, `get_db`, `_uid`, `exiger_role`, `send_email`…). Ils déclarent leurs modèles sur le
  même `Base` et peuvent publier des symboles dans `g` (ex. `g["DemandeCollaborateur"]` lu par `admin_plus_ext`).
  **L'ordre d'installation compte** (commentaires dans `server.py`).
- `routers/` : `APIRouter` classiques montés sous `/api/copilote` (+ routeurs publics) ; stockage table `documents` via `lib/db.py`.
- `models/`, `lib/` : modèles Pydantic et utilitaires des routeurs Copilote.
- Tests : `backend/tests/` — **autonomes** (TestClient en mémoire, SQLite temporaire, réseau simulé par `conftest.py`).
  `tests/archive_serveur_distant/` : anciens tests contre un serveur réel, lancés seulement avec `ZAYADO_LIVE_TESTS=1`.

Convention pour extraire un domaine de `server.py` (appliquée à Processus et Demandes Collaborateurs) :
1. test de caractérisation sur l'ancien code ; 2. module `xxx_ext.py` avec `install_xxx(g)` au même endroit
de la séquence ; 3. mêmes routes, tables, colonnes ; republier dans `g` les symboles lus ailleurs ;
4. comparer la liste des routes avant/après et relancer la suite.

## 4. Frontend : responsabilités des dossiers

| Dossier | Contenu réel |
|---|---|
| `src/zy/` | Cœur de l'app reprise du projet CRA (pages `.jsx`, composants, `lib/` d'accès API `kairosApi.js`, droits `droits.js`, Ma Foi `features/thesustain`). |
| `src/pages/` | Pages TS récentes : `copilote/` (Vision, Plan, Radar, Pilotage), `zayado/` (Tunnels, admin tunnels/partenaires), `entreprise/`, `tunnel/`. |
| `src/components/` | UI partagée (shadcn `ui/`, chrome `vision/` : menus et verrous d'offre). |
| `src/zayado/` | Coque TS des pages Tunnels (`Shell.tsx`), `droits.ts` (quotas par offre : tunnels, radar), types. |
| `src/lib/` | Client API TS, React Query, adaptateurs `lucide-react` / `recharts` (alias Vite). |

## 5. Sources de vérité par domaine

| Domaine | Source officielle | Remarque |
|---|---|---|
| Accès aux modules par offre | `frontend/src/zy/lib/droits.js` (`MODULES_MIN`, `planEffectif`) | Côté serveur : vérifications dans les routes concernées. |
| Quotas tunnels / radar par offre | `frontend/src/zayado/droits.ts` | Responsabilité différente de `droits.js` (quotas, pas verrous) → pas de fusion. |
| Prix | Admin › Prix (`prix_ext.py`, `/api/tarifs/grille`) | Lu par l'app et les fiches Shopify. |
| Marque (nom, logos, pieds) | `marque_ext.py` (`/api/marque`, public) | |
| Ma Foi (front) | `frontend/src/zy/features/thesustain/` | Copie `src/features/thesustain` archivée. |
| Pages publiques / légales | Shopify `theme-v2/` | L'app redirige via `VITE_SHOP_URL`. |
| Jeton Shopify | `shopify_auth.py` (ID + secret client) | |

## 6. Données locales et fichiers sensibles

| Fichier | Rôle | État |
|---|---|---|
| `backend/kairos.db` | Base SQLite locale (repli de `DATABASE_URL`) | Gardé sur disque, **retiré du suivi Git** et ignoré. |
| `memory/.tok_local` | Jeton JWT de session locale (aucune référence dans le code) | Gardé sur disque, **retiré du suivi Git** et ignoré. |
| `backend/assets/rh/prive.xlsx`, `reference.xlsx` | Modèles vides (en-têtes seulement) copiés dans le Drive du client par `entreprise_installation_ext.py` | Nécessaires : conservés et suivis. |
| `backend/.env`, `frontend/.env` | Secrets | Ignorés (`*.env`). |
