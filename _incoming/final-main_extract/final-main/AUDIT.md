# 🔍 Audit technique — « MyExtension AI » (nom de code repo : **Zayado**)

> Double casquette : **investisseur (fonds 2 Md €)** + **dev senior**.
> Périmètre : technique, architecture, UX produit, sécurité, scalabilité, dette.
> Mode : installation locale isolée (SQLite, `.env` factice), **aucune connexion à la prod Railway**.
> Date : 2026-08-04.

---

## 0. Ce qu'est réellement le projet (résultat de l'installation)

**Ce n'est PAS une extension de navigateur.** Le nom « MyExtension » est purement **marketing**. Le repo ne contient **aucun `manifest.json` d'extension Chrome/Firefox (MV3)**, aucun `background`/`content script`. Le seul `manifest.json` présent est le manifeste **PWA standard de Create React App**.

Le produit réel est une **plateforme SaaS B2B (« cockpit IA » pour indépendants/TPE)**, composée de 3 sous-projets + 1 intégration :

| Module | Stack | Rôle |
|---|---|---|
| `backend/` | **FastAPI + SQLAlchemy async** (MySQL en prod via `asyncmy`, **SQLite** en local) | API (~67 routers, ~36 000 LOC), auth, crédits, agent IA, paiement Mollie, cron |
| `frontend/` | **React 19 + CRA/CRACO + Tailwind + Radix/shadcn** | Le « cockpit » applicatif (dashboard, chat IA, pilotage, vision board, bien-être…) |
| `public-site/` | **React 18 + Vite 5** | Site vitrine + boutique e-commerce + blog (contenu tiré de WordPress) |
| `docs/` | PHP (mu-plugin) | Intégration **WordPress headless** (REST API, Application Password) |

- **LLM** : le backend n'appelle pas directement OpenAI/Anthropic — il passe par un **proxy « Mammouth » (`api.mammouth.ai`)** avec `MAMMOTH_API_KEY`. Modèles : `claude-haiku-4-5`, `claude-sonnet-4-5`.
- **Base de données** : **PAS MongoDB** (confirmé). C'est **MySQL en prod / SQLite en dev**. ⚠️ `motor`/`pymongo` traînent encore dans `requirements.txt` (héritage d'une ancienne version Mongo — dette).
- **Déploiement** : Railway via `Dockerfile` racine (prioritaire) + `nixpacks.toml` de secours. Le frontend est **buildé et servi statiquement par le backend** (`backend/static/`), tout sous un seul service.

### État après installation locale
✅ Backend démarre (`/api/health` → `{"status":"healthy"}`) sur SQLite.
✅ Frontend compile et sert la page de login (« Welcome to MyExtension AI by Zayado »).
✅ 64 tables créées automatiquement, 2 utilisateurs + 30 conversations présents (voir alerte PII plus bas).

---

## 🟢🟡🔴 Verdict global express

| Axe | Note | Commentaire |
|---|---|---|
| Fonctionnel / richesse | 🟢 Fort | Produit très complet, mature, beaucoup de features réelles |
| Sécurité | 🔴 **Bloquant** | **Secrets réels commités**, base de données client commitée, PII en clair |
| Architecture backend | 🟡 Moyen | Bonne modularisation en routers, mais migrations « maison » = dette lourde |
| Scalabilité | 🟡 Moyen | Rate-limiter/quota in-memory, mono-service, crons in-process |
| Qualité / tests | 🟡 Moyen | 106 fichiers de tests (bon signe) mais **aucun CI/CD** |
| Clarté produit (repo) | 🔴 Faible | README racine vide, 3 noms de marque différents, « extension » trompeur |

**Investment-ready côté technique ? → NON en l'état.** Le socle fonctionnel est impressionnant et « rachetable », mais **3 fuites de secrets/données bloquantes** + l'absence de CI/CD et de migrations propres empêchent une due-diligence favorable **avant remédiation**. Ce sont majoritairement des **quick wins** (jours, pas mois).

---

# 📦 Audit module par module

## 1. 🧩 « Extension navigateur »
**Verdict : 🔴 Le module annoncé n'existe pas dans le repo.**
Aucun code d'extension MV3. Le backend autorise pourtant les origines `chrome-extension://.*` (CORS) et référence un « chrome_link » côté équipe → une extension existe peut-être **hors de ce dépôt** ou est **au stade d'intention**. Pour un investisseur, **le principal argument du nom produit n'est pas livré ici** : risque de sur-promesse.

**Dette/risque : élevé (écart promesse ↔ réalité).**

**5 suggestions priorisées :**
1. **[P0]** Clarifier officiellement : soit livrer l'extension MV3 dans un dossier `extension/` (manifest, background service worker, content scripts), soit **renommer/repositionner** le produit pour ne pas induire en erreur.
2. **[P1]** Si extension prévue : définir un **scope de permissions minimal** (pas de `<all_urls>`, pas de `tabs` global) et documenter la justification de chaque permission.
3. **[P1]** Isoler la communication extension↔backend derrière un **token dédié révocable** (pas le JWT de session complet stocké dans le storage de l'extension).
4. **[P2]** Restreindre le CORS `chrome-extension://.*` à l'**ID d'extension publié** une fois connu (regex trop permissive aujourd'hui).
5. **[P2]** Ajouter un test e2e « extension → API » et une CSP stricte dans le manifest.

---

## 2. 🔦 Backend / API (FastAPI)
**Verdict : 🟡 Solide sur la forme, inquiétant sur les fondations de données.**
Points forts : `server.py` refactoré (~200 lignes, ~67 routers montés proprement), `lifespan` moderne, validation Pydantic (`schemas.py`), séparation `deps.py`/`utils.py`/`database.py` nette. Gestion d'erreurs défensive et retry DB (adapté au `NullPool`).
Points faibles majeurs :
- **Migrations « maison »** : `database.py` + `_auto_migrate_on_startup()` exécutent des dizaines d'`ALTER TABLE ADD COLUMN` en `try/except` à **chaque démarrage**. C'est le symptôme n°1 de dette : pas de source de vérité du schéma, migrations non versionnées, non réversibles, risque de divergence prod/dev.
- **`requirements.txt` obèse** (~230 dépendances : `browser-use`, `playwright`, `langchain/langgraph`, `weasyprint`, `pandas`, `boto3`, `motor`+`pymongo` inutilisés…). Surface d'attaque, temps de build, taille d'image ↑↑. Conflit détecté : `emergentintegrations` veut `openai==1.99.9`, présent `openai 2.16.0`.
- **`admin_config.json` écrit en runtime** (log d'emails) → pattern « base de données dans un fichier JSON » non concurrent-safe, non scalable.

**Dette/risque : élevé (schéma & dépendances).**

**5 suggestions priorisées :**
1. **[P0]** Introduire **Alembic** : geler le schéma actuel en migration initiale, supprimer TOUS les `ALTER TABLE` de démarrage. Gain immédiat de fiabilité + auditabilité.
2. **[P0]** **Purger `requirements.txt`** : retirer `motor`/`pymongo` (Mongo mort), et déplacer les libs lourdes optionnelles (`playwright`, `browser-use`, `langchain`) derrière un extra `pip install .[agents]` seulement si réellement utilisées.
3. **[P1]** Remplacer `admin_config.json` runtime par des **tables dédiées** (`email_logs` existe déjà !) — supprimer l'écriture fichier.
4. **[P1]** Ajouter une **validation d'entrée systématique** (schemas Pydantic) sur les routes qui prennent `Dict[str, Any]`/`request.body()` brut (ex. `update_profile`, `apply_promo`) → typer et borner.
5. **[P2]** Générer et publier l'**OpenAPI** (déjà exposé sur `/api/docs`) comme contrat versionné, + tags cohérents (plusieurs routers montés en double, ex. `queue_router` monté 2×, `missing_router` 2×).

---

## 3. 🗄️ Base de données
**Verdict : 🟡 Modèle riche et cohérent, mais gouvernance du schéma fragile + fuite de données.**
64 tables, `models.py` de 909 lignes, domaine métier réel (users, crédits, conversations, transactions, teams, affiliation, wellness, CRM…). Le double dialecte MySQL/SQLite est bien géré (`NullPool` en prod pour éviter les connexions TCP mortes sur Railway).
Inquiétudes :
- 🔴 **`backend/zayado.db` (SQLite, 856 Ko) est commité dans le zip avec des données réelles** : 2 comptes clients (`thomas@zayado.fr`, `membre@thesustain.net`) et **30 conversations**. `.gitignore` ignore `.env`/`*.key`/`*.pem` mais **pas `*.db`** → fuite de données personnelles.
- Migrations runtime = pas d'index gérés déclarativement (quelques `INDEX` seulement dans le `CREATE TABLE app_logs` inline).
- Pas de stratégie de **backup/restore** ni de rétention visible côté schéma (un cron supprime les conversations > 90 j, mais rien de formalisé).

**Dette/risque : élevé (fuite PII + gouvernance).**

**5 suggestions priorisées :**
1. **[P0]** **Supprimer `zayado.db` du dépôt**, ajouter `*.db` au `.gitignore`, et **purger l'historique git** (BFG/`git filter-repo`) car des données clients y sont présentes.
2. **[P0]** Notifier/appliquer la procédure RGPD : ces 2 personnes sont des données réelles exposées → rotation + information si le repo a circulé.
3. **[P1]** Déclarer les **index** dans les modèles SQLAlchemy (FK `user_id`, `team_id`, `created_at`, `email` unique) plutôt qu'en ALTER runtime.
4. **[P1]** Mettre en place **backups automatiques MySQL** (Railway) + test de restauration documenté.
5. **[P2]** Ajouter des **contraintes** (FK réelles, `NOT NULL`, `CHECK` sur les enums de statut/plan) — aujourd'hui beaucoup de colonnes VARCHAR libres.

---

## 4. 🔐 Authentification & Sécurité
**Verdict : 🟡 Étonnamment mûr côté logique, MAIS secrets exposés + 2FA factice.**
Bonnes pratiques présentes : `bcrypt`, JWT avec `jti`, blocage `is_active`, rate-limiting par endpoint, réponses génériques anti-énumération sur « forgot-password », anti-rejeu du token de reset (`last_reset_jti`), suppression RGPD avec confirmation serveur, allowlist de clés dans `update_settings`, masquage email, `dev_link` jamais exposé sur hostnames de prod.
🔴 Failles critiques :
- **`backend/env.example` contient les VRAIES clés `JWT_SECRET` et `FERNET_KEY`** (commitées). Avec `JWT_SECRET`, un attaquant **forge n'importe quel JWT** (impersonation totale, y compris admin) ; avec `FERNET_KEY` il **déchiffre** toute donnée chiffrée (tokens OAuth, clés API stockées).
- **2FA non appliquée** : `/2fa/toggle` et `/2fa/verify` positionnent `two_factor_enabled`, mais l'endpoint `/login` **renvoie le token sans jamais vérifier la 2FA**. Sécurité décorative.
- **Magic-link rejouable** : `/verify-link` ne consomme pas le token (pas de `jti` marqué utilisé comme pour le reset) → réutilisable pendant 15 min.
- **Rate-limiter en mémoire** (`utils.RateLimiter`) : inefficace derrière plusieurs replicas Railway, et clé = IP `request.client.host` (souvent l'IP du proxy) → soit tout le monde partage le quota, soit contournable.
- CORS : quand `CORS_ORIGINS="*"`, la config passe `allow_origins=["*"]` **avec** `allow_credentials=True` → combinaison invalide/risquée (rejetée par les navigateurs, et dangereuse si contournée).

**Dette/risque : 🔴 BLOQUANT.**

**5 suggestions priorisées :**
1. **[P0]** **Rotation immédiate** de `JWT_SECRET` et `FERNET_KEY` (invalide tous les tokens/chiffrés existants), les retirer de `env.example` (mettre des placeholders), purger l'historique git.
2. **[P0]** **Appliquer réellement la 2FA** dans `/login` : si `two_factor_enabled`, renvoyer un état « 2FA requise » et n'émettre le JWT qu'après `/2fa/verify`.
3. **[P1]** **Consommer les magic-links** (stocker `jti` utilisé, refuser la réutilisation) comme pour le reset password.
4. **[P1]** Passer le **rate-limiting + quotas crédits sur un store partagé** (Redis) — indispensable dès 2 replicas ; utiliser `X-Forwarded-For` de confiance.
5. **[P2]** Durcir le CORS (jamais `*` + credentials ; liste blanche stricte), ajouter en-têtes de sécurité (HSTS, X-Content-Type-Options, CSP) via middleware.

---

## 5. 🧑‍💻 Expérience développeur / UX produit
**Verdict : 🔴 Onboarding technique confus ; 🟢 UX applicative soignée.**
- **README racine = `# Here are your Instructions`** (placeholder vide). `frontend/README.md` = boilerplate CRA. **On ne comprend PAS ce qu'est le produit en ouvrant le repo.** Seuls `public-site/README.md` et `docs/wordpress-admin-setup.md` sont utiles.
- **Trois identités concurrentes** dans le code : « Zayado », « MyExtension AI », « Extension IA by Zayado » (+ `zayado-root-dev` dans `package.json`, brand `myextension`/`zayado`/`thesustain`). Confusion de marque forte.
- Côté **UX produit livrée**, c'est du bon niveau : login passwordless (magic-link) + OAuth Google/Microsoft + SSO, design dark soigné, i18n FR/EN, cockpit riche (Radix/shadcn), page login fonctionnelle testée.
- **Dette de code mort** : `public-site/` contient **21 pages `legacy/`** + `*.jsx.bak` + `_stubs.jsx` → duplication et confusion.

**Dette/risque : moyen-élevé (lisibilité projet).**

**5 suggestions priorisées :**
1. **[P0]** Écrire un **vrai `README.md` racine** : pitch produit en 3 lignes, schéma d'architecture (3 apps), prérequis, `.env`, commandes de run, lien vers `docs/`.
2. **[P0]** **Choisir UN nom** produit et le propager (code, emails, UI, package names) — supprimer les 2 autres.
3. **[P1]** **Supprimer le code legacy/.bak/_stubs** de `public-site` (ou l'isoler dans une branche d'archive).
4. **[P1]** Ajouter un **`Makefile`/`docker-compose.dev`** (backend + frontend + MySQL) pour un `make dev` en une commande.
5. **[P2]** Documenter le **contrat d'API** et un guide « premier lancement » (seed de démo reproductible via `demo_seed.py`).

---

## 6. 🚀 Déploiement / DevOps
**Verdict : 🟡 Déploiement Railway pragmatique mais fragile côté ops.**
Points forts : `Dockerfile` propre (recompile `greenlet` pour libstdc++, build frontend en `yarn`), `railway.json` avec healthcheck `/api/health` + restart policy, `nixpacks.toml` de secours cohérent. Le build unifié (frontend servi par FastAPI) simplifie l'hébergement.
Inquiétudes :
- ❌ **Aucun CI/CD** (`.github/` absent) : pas de lint/test/scan automatiques avant déploiement. `pytest` + 106 tests existent mais ne tournent nulle part automatiquement.
- **Crons in-process** : ~12 `asyncio.create_task(...loop)` au démarrage (reset crédits, SWOT, GDPR purge, hot opps, sync WP…). En multi-replica, **chaque instance rejoue les crons** → doublons (emails, débits crédits). Pas de leader election / scheduler externe.
- `REACT_APP_BACKEND_URL` est **hardcodé dans le `Dockerfile`** (`https://app.zayado.net`) au build → non portable multi-environnement.
- **Observabilité** limitée : logs applicatifs maison (`app_logs`), pas de tracing/metrics (Sentry/OTel) visibles.
- Sync WordPress automatique au démarrage (`_sync_react_to_wp_on_startup`) qui écrit dans WP → effet de bord au boot potentiellement dangereux.

**Dette/risque : moyen-élevé (fiabilité prod à l'échelle).**

**5 suggestions priorisées :**
1. **[P0]** Mettre en place **GitHub Actions** : lint (`ruff`/`flake8`), `pytest`, `yarn build`, + **scan de secrets** (`gitleaks`) et `pip-audit`/`npm audit` bloquants.
2. **[P0]** **Sortir les crons du process web** : job Railway dédié ou verrou (advisory lock MySQL / Redis) pour garantir « un seul exécuteur », sinon débits/emails en double dès 2 replicas.
3. **[P1]** Rendre `REACT_APP_BACKEND_URL` **paramétrable au build** (ARG Docker / variable Railway), ne pas hardcoder un domaine.
4. **[P1]** Ajouter **Sentry + health/readiness** distincts et alerting ; passer la sync WP en tâche déclenchée manuellement, pas au boot.
5. **[P2]** Réduire l'**image Docker** (multi-stage, retirer libs lourdes) pour accélérer cold starts et réduire coûts.

---

# 🎯 Verdict final (investisseur + dev senior)

### « Comprend-on immédiatement ce qu'est MyExtension en ouvrant le repo ? »
**Non.** Le README racine est vide, le nom « extension » ne correspond à aucun code d'extension, et 3 marques cohabitent. Il faut fouiller le code (`server.py`, emails, `public-site/README`) pour comprendre qu'il s'agit d'un **cockpit SaaS IA pour indépendants/TPE**. C'est le **premier red flag d'une due-diligence**.

### Top risques bloquants (à corriger AVANT toute levée / audit externe)
1. 🔴 **Secrets réels commités** (`JWT_SECRET`, `FERNET_KEY` dans `env.example`) → compromission totale possible.
2. 🔴 **Base de données client commitée** (`zayado.db` + PII de vrais utilisateurs).
3. 🔴 **2FA non appliquée** (fausse assurance sécurité).
4. 🟠 **Migrations « maison » à chaque boot** (pas d'Alembic) → fragilité schéma prod.
5. 🟠 **Crons + rate-limiter in-process** → doublons & contournement dès la mise à l'échelle.

### Quick wins (fort impact, faible effort — jours)
- Rotation des secrets + `env.example` assaini + `*.db` ignoré + purge historique git.
- Vrai README + nom unique.
- CI GitHub Actions avec `gitleaks` + `pytest`.
- Suppression `motor`/`pymongo` et du code `legacy/.bak`.
- Application effective de la 2FA au login.

### Ce qui rassure (points forts réels)
- Produit **fonctionnellement très riche et abouti**, qui **tourne** (installé en local sans prod).
- Backend **bien modularisé**, logique d'auth **globalement mûre**, **106 tests** présents.
- Déploiement Railway **documenté et pragmatique**, i18n, UX cockpit soignée.

**Conclusion :** socle prometteur et « rachetable », mais **pas investment-ready en l'état**. Les blocages sont surtout des **problèmes d'hygiène (secrets, données, CI, migrations)** — corrigeables rapidement. Une fois les P0 traités, le projet passe de 🔴 à 🟢 crédibilité technique.
