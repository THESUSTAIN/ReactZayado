# Zayado WhatsApp-service

Microservice Railway séparé qui gère les sessions WhatsApp Web via `whatsapp-web.js` et communique avec le backend Zayado.

## Endpoints

- `GET /health` — healthcheck public
- `POST /session/start` — démarre une session agent et retourne le QR si disponible
- `GET /session/:agentId/status` — état + QR
- `POST /session/:agentId/restart` — redémarre une session
- `DELETE /session/:agentId` — déconnecte une session
- `POST /send` — envoi d'un message via une session prête

Toutes les routes de contrôle demandent `x-service-secret` ou `X-Secret`.

## Variables Railway

- `BACKEND_URL=https://myextension-ai.com`
- `WA_SERVICE_SECRET=<même secret que le backend>`
- `WA_DATA_PATH=/data/.wwebjs_auth`
- `PORT` — Railway le fournit automatiquement

## Railway

Créer un service séparé depuis le même dépôt et définir :

**Root Directory:** `/WhatsApp-service`

Le service doit avoir un **Volume** monté sur `/data`, sinon `LocalAuth` perdra la session lors d'un redéploiement/restart. `whatsapp-web.js` recommande `LocalAuth` pour conserver l'authentification, mais précise que cela nécessite un filesystem persistant. Le mode Puppeteer sans sandbox est aussi requis dans les environnements root/headless ; ce Dockerfile exécute Chromium avec `--no-sandbox` et le conteneur **en root** (Railway monte le volume `/data` en root ; tourner en non-root provoquait une erreur de permission `EACCES` et une boucle de crash).

### Ressources Railway recommandées
- **Mémoire : 1 Go minimum** (Chromium + whatsapp-web.js ; en dessous, risque d'OOM → crash).
- **Volume** monté sur `/data` (obligatoire pour garder la session).

## Connexion avec le backend

Le backend utilise `WA_SERVICE_URL` et `WA_SERVICE_SECRET` pour appeler ce service. Il lui fournit `agent_id` (l'identifiant de l'utilisateur) + `agent_webhook_token`. Le service renvoie le QR, puis appelle le backend (en-tête `x-service-secret`) :

- `POST {BACKEND_URL}/api/webhooks/whatsapp-web` — message reçu, avec `agent_id`, `from`, `message` ; le backend répond `{"reply":"..."}`.
- `POST {BACKEND_URL}/api/webhooks/whatsapp-web-ready` — QR scanné : le backend enregistre la connexion « connectée ».

### Qui peut parler au bot
Le bot répond **uniquement** dans ta conversation « Moi-même », et aux numéros listés dans `WA_ALLOWED_NUMBERS` (chiffres seuls, séparés par des virgules, ex. `33612345678,33698765432`). Tes autres contacts sont ignorés. Les réponses commencent par 🤖 pour que le bot ne se réponde pas à lui-même.

### Réglages Railway
- `WA_SERVICE_URL` (backend) = adresse **privée** du service WhatsApp.
- `WA_SERVICE_SECRET` identique des deux côtés.
- `BACKEND_URL` (service WhatsApp) = adresse du backend.
- Volume sur `/data`.
