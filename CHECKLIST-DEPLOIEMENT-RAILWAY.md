# Checklist déploiement Railway — Zayado v6

Aucune valeur secrète dans ce fichier : les valeurs restent dans Railway → service → *Variables*.

## 1. Pousser le code
Emergent → « Save to GitHub » → Railway redéploie automatiquement les services liés au dépôt.
`backend/.env` et `*.db` sont exclus par `.gitignore` (vérifié) : rien du pod Emergent ne part en prod.

## 2. Service BACKEND (Root Directory : `backend`, Dockerfile)
À garder :
- `DATABASE_URL` (MySQL Hostinger `mysql+aiomysql://…`, pris en charge via aiomysql)
- `JWT_SECRET`, `FERNET_KEY` (NE PAS changer FERNET_KEY : les jetons chiffrés en base deviendraient illisibles)
- `CORS_ORIGINS`, `PUBLIC_FRONTEND_URL`, `FRONTEND_URL`, `PRODUCTION_HOSTS`
- `ADMIN_EMAILS`, `MAMMOUTH_API_KEY` (le code accepte MAMMOUTH_ ou MAMMOTH_)
- `MOLLIE_API_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`
- Paiement des tunnels (marketplace) : `MOLLIE_CLIENT_ID`, `MOLLIE_CLIENT_SECRET`, `MOLLIE_CONNECT_REDIRECT` (app Mollie Connect, URL de retour `https://app.zayado.net/api/mollie/connect/retour`), facultatif `COMMISSION_TUNNELS` (défaut `{"essentielle":[10,49],"reveur":[10,49],"serenite":[5,29]}`)
- `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `HEYGEN_API_KEY`, `UNSPLASH_ACCESS_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `WA_SERVICE_URL`, `WA_SERVICE_SECRET`
- `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_SHOP_DOMAIN`, `DATAFORSEO_LOGIN/PASSWORD`
- `RUN_CRONS=1`, `AGENT_NAVIGATEUR=1`, `PORT=8001`

À AJOUTER :
- `SEED_COMPTES_DEMO=0` : sinon les 8 comptes de test (mot de passe public Test!2026) sont créés dans la base de prod à chaque démarrage
- Ne JAMAIS définir `ENV=local` ni `SEED_POLE_ADMIN_MDP` en prod

Inutilisées par le code (peuvent être supprimées) :
`ADMIN_SECRET_TOKEN`, `BRAND_AVG_SAVINGS_PCT`, `BRAND_ENTREPRENEURS_COUNT`, `BRAND_GROUPEMENT_COUNT`,
`BRAND_NPS`, `BRAND_PARTNERS_COUNT`, `BREVO_WAITLIST_LIST_ID`, `CONTACT_TO_EMAIL`, `Canva_ID`,
`Canva_Client_secret`, `HEYZINE_API_KEY`, `Heyzine_ID`, `Heyzine_secret`, `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD`, `DB_NAME_CUSTOM` (doublons de DATABASE_URL), `GOOGLE_DRIVE_REDIRECT_URI`,
`MICROSOFT_REDIRECT_URI`, `MICROSOFT_TENANT_ID`, `MOLLIE_TEST_API_KEY`, `OTP_DEV_MODE`,
`NODE_ENV`, `RAILWAY_ENVIRONMENT` (injectée par Railway), `SHOPIFY_ID`,
`Apollo_Api` (le code lit `APOLLO_API_KEY`, à renommer si Apollo est utilisé)
`WA_SERVICE_SECRET` / `WA_SERVICE_URL` sont en double dans la liste : n'en garder qu'une de chaque.

## 3. Service FRONTEND (Root Directory : `frontend`, Dockerfile nginx)
- `BACKEND_URL` = URL **privée** du backend, AVEC schéma et port, ex. `http://backend.railway.internal:8001`
  (ou `http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:${{Backend.PORT}}`).
  ⚠️ `app.zayado.net` (sans http://) casserait nginx ou bouclerait sur lui-même.
- Retirer `BACKEND_URL` du service backend (inutile là-bas).

## 4. URLs de retour OAuth à déclarer
- Google Cloud Console : `https://app.zayado.net/api/connexion/oauth/google/callback`
- Azure (Microsoft) : `https://app.zayado.net/api/connexion/oauth/microsoft/callback`
(optionnel : forcer la base via `BACKEND_PUBLIC_URL=https://app.zayado.net`)

## 5. Test des notifications push (après déploiement)
1. Sur le téléphone : ouvrir https://app.zayado.net avec ton compte, accepter les notifications
   (iPhone : Partager → « Sur l'écran d'accueil », puis ouvrir l'app installée : obligatoire sur iOS).
2. Faire pareil sur l'ordinateur (Chrome/Edge/Firefox).
3. Admin → Notifications → « Santé » doit afficher « Push prêt » ; puis « Tester » avec TON e-mail :
   chaque appareil doit être listé « ok » et la notification doit s'afficher à l'écran.

## 6. Après déploiement
- `https://app.zayado.net/api/` → `{"message":"Zayado API (SQL)"}`
- Connexion avec un vrai compte, Vision globale, paiement Mollie (petit montant), envoi d'un e-mail Brevo
