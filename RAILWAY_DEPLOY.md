# 🚂 Déploiement Railway — Checklist

## 0. Avant de déployer
- Le `.env` n'est **pas** dans Git (gitignore) → tes variables Railway ne sont **pas** touchées par un déploiement de code.
- ⚠️ Ne copie **jamais** le `.env` de preview (il est en SQLite/dev). En prod tu dois avoir `NODE_ENV=production` + une vraie base MySQL, sinon fallback SQLite = **perte de données**.

## 1. Pousser le code sur GitHub
Fichiers ajoutés/modifiés cette reprise (à committer) :
- Backend : `routes/auth.py`, `routes/dashboard.py`, `routes/demo.py`, `routes/news_reprise.py`, `routes/inspiration.py`, `routes/heygen_routes.py`, `routes/ai_governance.py`, `routes/observability.py`, `routes/notifications.py`, `routes/push.py`, `notif_gate.py`, `server.py`
- Frontend : `src/pages/Login.jsx`, `src/context/AuthContext.jsx`, `src/lib/api.js`, `src/App.js`, `src/components/InvestorDemoButton.jsx`, `chrome-extension/sidepanel.js`, `chrome-extension/sidepanel.html`
- Racine : `README.md`, `.github/workflows/ci.yml`, `backend/.env.example`
- Plugin (séparé) : `zayado-admin-v2.zip`

## 2. Variables à COLLER dans Railway (Service backend → Variables)
### Déjà présentes normalement — vérifier
```
NODE_ENV=production
JWT_SECRET=...            # NE PAS changer (invaliderait les sessions)
FERNET_KEY=...            # NE PAS changer (invaliderait les données chiffrées)
DATABASE_URL=...          # ou DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
FRONTEND_URL / CORS_ORIGINS
BREVO_API_KEY / BREVO_SENDER_EMAIL
MAMMOTH_API_KEY (+ MAMMOUTH_API_KEY)
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY_PATH / VAPID_SUBJECT
MOLLIE_API_KEY
```
### NOUVELLES variables à AJOUTER
```
WP_CONNECTOR_SECRET=80Reg9AWFTf1evDlQtSZYbpXVb6S2KZy_DLM8IwdWx8   # identique dans le plugin WP
HEYGEN_API_KEY=<ta clé HeyGen>
NEWS_REPRISE_MAILBOX=news-reprise@zayado.net
NEWS_REPRISE_NOTIFY=admin@zayado.net
NEWS_REPRISE_DELAY_HOURS=72
NEWS_REPRISE_BREVO_LIST_ID=            # optionnel (brouillon campagne Brevo)
DEMO_LOGIN_EMAILS=thomas@zayado.fr,membre@thesustain.net
MAMMOUTH_STRONG_MODEL=claude-sonnet-4-6   # optionnel (routing)
AI_CACHE_TTL=1800                          # optionnel (cache IA, secondes)
```

## 3. Après déploiement — vérifier
1. `GET https://app.zayado.net/api/health` → `{"status":"ok","db":true}` (db=true = MySQL OK).
2. Connexion Thomas : bouton « compte test » (utilise `/api/auth/demo-login`).
3. Admin → Observabilité : 0 erreur critique.
4. Plugin WP : Configuration → API OK + coller `WP_CONNECTOR_SECRET`.

## 4. Notes
- Les tables `news_reprise_drafts` / `inspiration_quotes` se créent automatiquement au 1er appel (DDL compatible MySQL — `VARCHAR(36)` PK).
- Facture Railway à jour (sinon le backend est suspendu → tout casse).
