# Zayado — lancer l'application en local

Ce guide installe Zayado sur ton ordinateur : le backend (API FastAPI) sur le port **8001** et le frontend (React) sur le port **3000**. En local, la base de données est un simple fichier SQLite : rien à installer.

Temps estimé : 15 minutes la première fois.

---

## 1. Prérequis

| Outil | Version | Vérifier |
|---|---|---|
| Python | **3.11** | `python3 --version` (Windows : `py -3.11 --version`) |
| Node.js | **20** | `node --version` |
| Yarn | **1.22** | `yarn --version` (sinon : `npm install -g yarn`) |
| Git | récent | `git --version` |

> Python 3.12 ou plus récent peut casser certaines dépendances : garde la 3.11.

---

## 2. Récupérer le code

```bash
git clone <url-du-dépôt> ReactZayado
cd ReactZayado
```

Si tu pars du zip `ReactZayado-complet-vX.zip` : décompresse-le et ouvre un terminal dans le dossier.

Si tu pars du patch `zayado-nouveautes-sur-main-vX.patch` :

```bash
git checkout main
git pull
git am zayado-nouveautes-sur-main-vX.patch
```

---

## 3. Backend (API)

### 3.1 Environnement Python

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

L'index supplémentaire sert au paquet `emergentintegrations` (images IA de secours). S'il est injoignable, l'application démarre quand même sans lui.

### 3.2 Fichier `backend/.env`

Crée le fichier `backend/.env` (il est lu automatiquement au démarrage) :

```ini
# --- Indispensable ---
ENV=dev
DATABASE_URL=sqlite+aiosqlite:///./kairos.db
JWT_SECRET=colle-ici-une-longue-cle-aleatoire
FERNET_KEY=colle-ici-la-cle-fernet
CORS_ORIGINS=http://localhost:3000
FRONTEND_PUBLIC_URL=http://localhost:3000
BACKEND_PUBLIC_URL=http://localhost:8001

# --- Pratique en local ---
RUN_CRONS=0                 # pas de tâches de fond (rappels, missions, e-mails)
SEED_COMPTES_DEMO=1         # crée les comptes de test (voir §5)
BOOTSTRAP_ADMIN_EMAIL=admin@local.test
BOOTSTRAP_ADMIN_PASSWORD=Admin!2026local

# --- IA (facultatif, sinon réponses de repli) ---
MAMMOTH_API_KEY=
# MAMMOTH_MODEL=claude-sonnet-4-5
# MAMMOTH_IMAGE_MODEL=google/gemini-2.5-flash-image
```

Générer les deux clés :

```bash
python -c "import secrets; print(secrets.token_hex(32))"                                  # JWT_SECRET
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # FERNET_KEY
```

> Sans `JWT_SECRET`, le serveur refuse de démarrer (sauf avec `ENV=dev`, où une clé temporaire est générée : tu seras alors déconnecté à chaque redémarrage).
> Sans `FERNET_KEY`, les connexions (Drive, Telegram, Qonto…) ne peuvent pas être enregistrées.

### 3.3 Démarrer

```bash
uvicorn server:app --reload --port 8001
```

Vérifier : ouvre <http://localhost:8001/api/> → réponse JSON. Au premier lancement, les tables sont créées toutes seules dans `backend/kairos.db`. Les colonnes manquantes sont ajoutées automatiquement aux lancements suivants.

---

## 4. Frontend (application)

Dans un **deuxième terminal** :

```bash
cd frontend
yarn install
```

Crée le fichier `frontend/.env` :

```ini
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_FLAVOR=saas
DISABLE_EMERGENT_OVERLAY=true
# Facultatif
# REACT_APP_RH_URL=https://rh.zayado.net
# REACT_APP_BOUTIQUE_COMPTE_URL=https://zayado.net/account
```

Démarrer :

```bash
yarn start
```

L'application s'ouvre sur <http://localhost:3000>.

> Après une modification de `frontend/.env`, arrête (`Ctrl+C`) puis relance `yarn start` : les variables `REACT_APP_*` ne sont lues qu'au démarrage.

---

## 5. Se connecter

Avec `SEED_COMPTES_DEMO=1`, ces comptes de test sont créés au démarrage (mot de passe **`Test!2026`**) :

| Compte | Offre |
|---|---|
| `test.reveur@zayado.net` | Rêveur |
| `test.solo@zayado.net` | Solo |
| `test.pro@zayado.net` | Pro |
| `test.equipe@zayado.net` | Équipe |
| `test.entreprise@zayado.net` | Entreprise |
| `test.essentielle@zayado.net` | Sans offre |
| `thesustain@zayado.net` | Ma Foi (TheSustain) |

Compte **admin** : celui de `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`. Console admin : <http://localhost:3000/admin>.

> Ces mots de passe sont publics : ne mets jamais `SEED_COMPTES_DEMO=1` en production.

---

## 6. Brancher les services (facultatif)

Tout fonctionne sans ces clés, avec des réponses de repli ou des boutons désactivés. Ajoute dans `backend/.env` ce dont tu as besoin :

| Fonction | Variables |
|---|---|
| IA texte et images (Copilote, agents, documents, images) | `MAMMOTH_API_KEY`, `MAMMOTH_MODEL`, `MAMMOTH_IMAGE_MODEL` |
| Paiement | `MOLLIE_API_KEY` (clé **test_…** en local) |
| Connexion Google + Google Drive | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Connexion Microsoft + OneDrive | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT` |
| E-mails | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| Notifications push (PWA) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` : à générer avec `python generer_cles_vapid.py` (dans `backend/`) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` |
| Prospects (Radar) | `APOLLO_API_KEY` |
| Boutique | `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_TOKEN` |
| Vidéo | `HEYGEN_API_KEY` |
| Connexion TheSustain / app RH | `THESUSTAIN_CLIENT_ID`, `THESUSTAIN_CLIENT_SECRET`, `ZAYADO_SSO_CLIENTS` |

À savoir en local :

- **OAuth Google / Microsoft** : ajoute `http://localhost:8001/api/connexion/oauth/google/callback` (et `/microsoft/callback`) dans les URI de redirection autorisées de ta console Google Cloud / Azure.
- **Webhooks** (Mollie, Telegram) : ils ont besoin d'une adresse publique. Utilise un tunnel (`ngrok http 8001` ou `cloudflared tunnel --url http://localhost:8001`) et mets l'adresse obtenue dans `BACKEND_PUBLIC_URL`.
- **Tâches de fond** (rappels, missions des agents, e-mail du lundi) : passe `RUN_CRONS=1` pour les tester.

---

## 7. Tester

```bash
cd backend
PYTHONPATH=tests:. python -m pytest -q tests
```

Les tests utilisent leur propre base temporaire : ils ne touchent pas à `kairos.db`.

Build de production du frontend (vérifie qu'il compile) :

```bash
cd frontend
yarn build
```

---

## 8. Lancer avec Docker (optionnel)

Les mêmes images que la production :

```bash
# Backend
docker build -t zayado-backend ./backend
docker run --rm -p 8001:8001 --env-file backend/.env \
  -e DATABASE_URL=sqlite+aiosqlite:////app/kairos.db zayado-backend

# Frontend (nginx relaie /api vers le backend)
docker build -t zayado-frontend ./frontend
docker run --rm -p 3000:80 -e BACKEND_URL=http://host.docker.internal:8001 zayado-frontend
```

Sur Linux, ajoute `--add-host=host.docker.internal:host-gateway` à la seconde commande.

---

## 9. Problèmes fréquents

| Symptôme | Solution |
|---|---|
| `RuntimeError: JWT_SECRET doit être définie` | Ajoute `JWT_SECRET` (ou `ENV=dev`) dans `backend/.env`. |
| L'app affiche « Connexion requise » partout | Le frontend ne parle pas au bon backend : vérifie `REACT_APP_BACKEND_URL` puis relance `yarn start`. |
| Erreur CORS dans la console du navigateur | `CORS_ORIGINS` doit contenir exactement `http://localhost:3000`. |
| « IA en mode repli » | Normal sans `MAMMOTH_API_KEY`. |
| `yarn install` échoue sur `@emergentbase/overlay` ou `@emergentbase/visual-edits` | Ce sont des outils d'édition facultatifs téléchargés depuis assets.emergent.sh. Supprime ces deux lignes des `devDependencies` de `frontend/package.json`, garde `DISABLE_EMERGENT_OVERLAY=true` et relance `yarn install`. |
| `yarn start` parle de TypeScript ou de `tsconfig.json` | Un ancien modèle Vite traîne dans `frontend/` : supprime `tsconfig*.json`, `vite.config.ts` et `index.html` à la racine de `frontend/` (le vrai `index.html` est dans `frontend/public/`). |
| Port déjà utilisé | Backend : `--port 8002` (et adapte `REACT_APP_BACKEND_URL`). Frontend : `PORT=3001 yarn start` (et adapte `CORS_ORIGINS`). |
| Repartir d'une base vide | Arrête le backend, supprime `backend/kairos.db`, relance. |

---

## 10. Différences avec la production

| | Local | Production (Railway) |
|---|---|---|
| Base | SQLite (`kairos.db`) | Base SQL distante via `DATABASE_URL` |
| Frontend → API | `REACT_APP_BACKEND_URL=http://localhost:8001` | Même origine : nginx relaie `/api` vers le backend privé |
| Tâches de fond | coupées (`RUN_CRONS=0`) | actives |
| Comptes de test | oui | non (`SEED_COMPTES_DEMO=0`) |
| Clés | facultatives, mode test | toutes renseignées, clés live |
