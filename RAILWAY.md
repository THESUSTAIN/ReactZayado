# Déploiement Railway — 4 services (admin & vendeur SÉPARÉS de la SaaS)

## Architecture

| Service Railway | Dossier (Root Directory) | Variable clé | Domaine visé |
|---|---|---|---|
| `kairos-backend` | `backend/` | — | api.zayado.net |
| `kairos-saas` | `frontend/` | `REACT_APP_FLAVOR=saas` | app.zayado.net |
| `zayado-admin` | `frontend/` | `REACT_APP_FLAVOR=console` | admin.zayado.net |
| `whatsapp-service` | `WhatsApp-service/` | — | (URL Railway) |

Deux apps seulement côté utilisateurs : **app.zayado.net** (la SaaS Kairos, qui INCLUT l'espace
vendeur — un utilisateur peut être vendeur, même compte, même login) et **admin.zayado.net**
(console admin seule, porte d'authentification dédiée, rôle vérifié côté serveur).
La boutique PUBLIQUE = le **Shopify existant** (pas de service à déployer) : l'espace vendeur
publie les fiches en BROUILLON dans Shopify via l'API Admin (clés SHOPIFY_SHOP_DOMAIN +
SHOPIFY_ADMIN_TOKEN à renseigner dans les variables du backend).

## Étapes Railway (par service)
1. New Service → repo GitHub → **Settings → Build → Root Directory** = le dossier du service.
2. Le `railway.json` du dossier force le build via son Dockerfile (aucun réglage Nixpacks).
3. Variables d'environnement (ci-dessous).
4. Volumes : backend → `/data` ; whatsapp → `/data`.

## Variables — kairos-backend
- `DATABASE_URL` = `sqlite+aiosqlite:////data/kairos.db` (nécessite le volume `/data`)
- `JWT_SECRET`, `FERNET_KEY` (générer : `python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"`)
- `EMERGENT_LLM_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `MOLLIE_API_KEY`, `UNSPLASH_ACCESS_KEY`, `MAMMOUTH_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT=common`
- `WA_SERVICE_URL` = URL Railway du service whatsapp, `WA_SERVICE_SECRET` (identique des deux côtés)
- `FRONTEND_PUBLIC_URL` = https://app.zayado.net, `BACKEND_PUBLIC_URL` = https://api.zayado.net
- `CORS_ORIGINS` = `https://app.zayado.net,https://admin.zayado.net`
- `ADMIN_EMAILS` = ton email
- Optionnels : `REQUIRE_AUTH=1` + `PRODUCTION_HOSTS` (coupe le mode démo), `HEYGEN_API_KEY`, `IMAGE_DAILY_LIMIT=10`

## Variables — kairos-saas et zayado-console (frontend, lues AU BUILD)
- `REACT_APP_BACKEND_URL` = https://api.zayado.net
- `REACT_APP_FLAVOR` = `saas` ou `console` selon le service

## Variables — whatsapp-service
- `WA_SERVICE_SECRET` (le même que côté backend), `BACKEND_URL` = https://api.zayado.net, `WA_START_ON_BOOT=true`
- Volume sur `/data` obligatoire (sinon la session WhatsApp s'efface à chaque redémarrage)

## Après déploiement
- Redéclarer les redirect URIs OAuth Google/Microsoft avec l'URL du backend Railway (`/api/connexion/oauth/google/callback` et `.../microsoft/callback`).
- Reconnecter le bot Telegram (Paramètres → Connexions) pour que le webhook pointe sur l'URL Railway.
