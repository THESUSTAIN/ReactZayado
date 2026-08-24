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

Le service doit avoir un **Volume** monté sur `/data`, sinon `LocalAuth` perdra la session lors d'un redéploiement/restart. `whatsapp-web.js` recommande `LocalAuth` pour conserver l'authentification, mais précise que cela nécessite un filesystem persistant. Le mode Puppeteer sans sandbox est aussi requis dans les environnements root/headless ; ce Dockerfile exécute Chromium avec `--no-sandbox` et le conteneur en utilisateur non-root.  

## Connexion avec le backend

Le backend utilise `WA_SERVICE_URL` et `WA_SERVICE_SECRET` pour appeler ce service. Il lui fournit `agent_id` + `agent_webhook_token`. Le service renvoie le QR, puis transmet les messages entrants au webhook :

`POST https://myextension-ai.com/api/agent-webhook/{token}/whatsapp-web`

Le backend renvoie `{"reply":"..."}` et le microservice l'envoie au contact WhatsApp.
