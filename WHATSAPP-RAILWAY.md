# Architecture Railway — WhatsApp

Le projet complet doit comporter 3 services Railway :

1. **Principale** → le site/app Zayado
2. **Backend** → l'API MyExtension AI
3. **WhatsApp-service** → `WhatsApp-service/`

Pour `WhatsApp-service` :

- Root Directory: `/WhatsApp-service`
- Builder: Dockerfile
- Volume: `/data`
- Variables:
  - `BACKEND_URL=https://myextension-ai.com`
  - `WA_SERVICE_SECRET=<secret partagé avec Backend>`
  - `WA_DATA_PATH=/data/.wwebjs_auth`

Pour le **Backend** :

- `WA_SERVICE_URL=https://<domain-public-ou-private-du-service-whatsapp>`
- `WA_SERVICE_SECRET=<même secret>`
- `WHATSAPP_SERVICE_URL=https://<même-url>`
- `WHATSAPP_SERVICE_SECRET=<même secret>`

Le microservice ne démarre pas une session WhatsApp arbitraire au boot : une session est créée après `POST /session/start` avec un `agent_id` et le token webhook de l'agent.
