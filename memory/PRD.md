# PRD — Zayado v12 (Cockpit IA)

Langue produit : FRANÇAIS. Toujours répondre à l'utilisateur en français.

## Problème / Produit
SaaS « cockpit IA privé » pour entrepreneurs et porteurs de projet : priorités du jour,
Vision Board, Idées (capture rapide), Plan d'action, Radar IA, Bien-être, Copilote IA
(chat multilingue), Pouls Business. Console admin (rétention, acquisition, utilisateurs).

## Architecture
- Frontend : React + CRACO + TailwindCSS + shadcn/ui. Entrée src/index.js → src/App.js (.js/.jsx).
  NB : des fichiers .tsx/.ts/_legacy (clone initial) coexistent mais l'app vit en .js/.jsx.
- Backend : FastAPI + SQLite (kairos.db) + SQLAlchemy async. Toutes les routes préfixées /api.
- Microservice WhatsApp (Node/Puppeteer) déployé séparément sur Railway (volume /data, root).
- Déploiement cible : Railway (PAS Emergent). Le preview Emergent n'a pas les secrets Railway.

## Intégrations
- LLM : Mammouth (clé user MAMMOTH_API_KEY) OU repli EMERGENT_LLM_KEY (claude-sonnet-4-5). OK.
- OAuth OneDrive/Microsoft : MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT.
- OAuth Google Drive : GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
- Telegram : TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME.
- WhatsApp : WA_SERVICE_URL / WA_SERVICE_SECRET (backend → microservice).
- URLs publiques : BACKEND_PUBLIC_URL, FRONTEND_URL.
- Diagnostic OAuth public : GET /api/connexion/oauth/config.

## Fait (historique)
- Installation v12, correctifs démarrage, repli IA Emergent, console admin Rétention/Acquisition.
- UX chat (vue agrandie, Exporter▾, badge notif), Pouls Business banque « bientôt ».
- Copilote : auto-détection de langue (répond dans la langue du message).

## Fait — 2026-06 (cette session)
- BUG chat : la rangée de raccourcis en bas du Copilote était clippée à droite sur PC
  (overflow-x caché, non scrollable souris). Corrigé → flex-wrap, les 5 raccourcis sont visibles.
  Fichier : components/kairos/ChatAssistant.jsx (~ligne 624).
- BUG formatage chat : les réponses IA affichaient le Markdown brut (#, **, -). Ajout d'un
  rendu léger (TexteRiche) : titres en gras, listes à puces/numérotées, gras inline.
  Fichier : components/kairos/ChatAssistant.jsx (TexteRiche + rendu des bulles assistant).
- PWA P1 : app installable + Partage mobile (Share Target).
  - public/manifest.json : share_target GET (title/text/url → /app/actions?tab=idees), shortcuts, id, scope.
  - public/sw.js : service worker sûr (network-first navigations + coquille hors-ligne ; AUCUN cache JS/CSS).
  - src/index.js : enregistre /sw.js (avant : désinscrivait tout SW).
  - components/kairos/InstallBanner.jsx : bannière « Installer l'app » (beforeinstallprompt + aide iOS), montée dans App.js.
  - pages/Ideas.jsx (IdeesContenu) : reçoit title/text/url partagés → crée une Idée source="partage".
  - Testé e2e : lien partagé → idée créée + toast + URL nettoyée. OK.

## Backlog (ordre demandé par l'utilisateur)
- P1 Notifications de rétention : Web Push (VAPID) — rappels check-in + opportunités radar.
  Nécessite : lib web-push backend + clés VAPID + stockage abonnements + déclencheur (cron).
  ⚠️ Fonctionne seulement en HTTPS + PWA ; à déployer sur Railway pour test réel.
- P2 Gamification : séries (streaks), badges, progression Vision.
- P3 PDF des offres : page /offres + « Télécharger en PDF » (l'utilisateur veut le PDF dans le zip/téléchargé).
- P4 Terminologie : remplacer « dirigeants » par « entrepreneurs et porteurs de projet » (global).
- P4 Traductions pages publiques (FR/EN switcher sur /accueil, /pricing).

## Problèmes PRODUCTION Railway (non reproductibles en preview — config de déploiement)
- WhatsApp 502 : WA_SERVICE_URL/WA_SERVICE_SECRET manquants côté backend Railway, ou microservice down.
- Telegram « bientôt » : TELEGRAM_BOT_TOKEN/TELEGRAM_BOT_USERNAME manquants dans le backend Railway.
- OneDrive 502 : MICROSOFT_CLIENT_ID/SECRET/TENANT + BACKEND_PUBLIC_URL + URI de redirection Azure.
  (Le preview Emergent n'a aucun de ces secrets → tout s'affiche « bientôt ».)

## Fait — 2026-06 (session 2 : Telegram/WhatsApp + 3 features)
- Telegram BRANCHÉ + testé (preview) : env TELEGRAM_BOT_TOKEN/USERNAME (@Zayado_bot) + BACKEND_PUBLIC_URL.
  Vérifié : /canaux disponible=true, /canaux/telegram/lien (t.me + setWebhook), webhook /start linking, message→Copilote.
  ⚠️ Le webhook du bot pointe actuellement vers le PREVIEW. Pour la prod, mettre les env sur Railway backend
  et re-déclencher « Connecter Telegram » (re-pointe le webhook vers Railway).
- WhatsApp BRANCHÉ + testé (preview) : env WA_SERVICE_URL + WA_SERVICE_SECRET. Vérifié : /canaux disponible=true,
  /canaux/whatsapp/qr → statut qr + QR code (data URL). ⚠️ Le microservice WA a backend_configured=false :
  il faut définir BACKEND_URL (=URL publique du backend) sur le service WA Railway pour que les messages
  entrants WhatsApp arrivent au Copilote.
- Notifications Web Push (VAPID) : backend/push_ext.py (modèle PushSubscription + endpoints public-key/subscribe/
  unsubscribe/statut/test/rappel-checkin + helper envoyer_push). Clés VAPID dans .env. Handlers push/notificationclick
  dans public/sw.js. Frontend lib/push.js + carte « Notifications push » dans Paramètres→Notifications.
  ⚠️ Scheduling des rappels : à câbler via cron Railway (ou APScheduler) — l'envoi manuel/test fonctionne.
- Gamification : backend/gamification_ext.py (GET /api/gamification : série actuelle/record depuis VisionCheckin,
  progression Vision, 8 badges). Frontend components/kairos/GamificationWidget.jsx monté dans Cockpit.
- PDF des offres : frontend/src/lib/offresPdf.js (jsPDF, déjà installé) + bouton « Télécharger les offres en PDF »
  sur /pricing. Génère et télécharge Zayado-offres.pdf côté navigateur. Testé (download OK).

## Blocage RÉSOLU — « linter engine error » (2026-06)
Cause racine : la plateforme lint via oxlint + un ImportValidator. Des fichiers .tsx/.ts
morts (clone initial) sous src/ importaient des packages absents de package.json
(lucide-react-upstream, @icons-pack/react-simple-icons, recharts-upstream, motion) →
import validation = FAIL → « linter engine error » bloquant ask_human/finish.
Comme il n'y a PAS de tsconfig.json, CRA ne résout jamais .ts/.tsx : ces 48 fichiers
étaient 100% morts (l'app vit en .js/.jsx, ex. lib/utils.js existe à côté de utils.ts).
Correctif : suppression de tous les .ts/.tsx sous src/. ImportValidator = PASS,
webpack compile OK. Ne JAMAIS recréer de .ts/.tsx sans ajouter un tsconfig.json.

## Comptes de test
Voir /app/memory/test_credentials.md.
