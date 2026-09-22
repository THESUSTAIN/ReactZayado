# Kairos by Zayado — PRD

## Problème initial (demande utilisateur)
1. « Génère le frontend de la page radar, lis ce zip » (News-main-5).
2. Puis : « Mets ce projet News-main et fais tous les branchements qui manquent » :
   - 🔴 Séparation multi-comptes (isolation données par user)
   - 🟡 WhatsApp Railway (WA_SERVICE_URL), Telegram bot (TELEGRAM_BOT_TOKEN), OAuth Google/Microsoft (callback échange token)
   - 🟢 SharePoint/OneDrive sync (V1.5), génération image IA dans Vision (Atelier Visuel), Marketplace vendeur + modération
   - Pouls Business : laisser l'utilisateur choisir la source (saisie manuelle / envoi mail vers SharePoint ou Google Drive avec fréquence 1x-sem, 2x-mois, 1x-mois / connexion Qonto). Objectif CA mensuel à l'onboarding, 3-5 factures en attente, trésorerie.
   - Connexion Vision Board ↔ Radar (Apollo mentionné — absent des 3 zips fournis).

## Personas
- Entrepreneur sensible (solo / petite structure) qui veut piloter sans burnout : CA, trésorerie, 3 priorités, énergie.
- Vendeur marketplace (à venir).

## Exigences cœur (statique)
- Cockpit apaisé : énergie d'abord, 3 priorités, point du jour IA.
- Vision Board central relié au Radar (3 opportunités/jour max reliées aux objectifs).
- Ton doux, thème navy/or (#0B1F3A / #DEC2A3), Fraunces + Plus Jakarta Sans, glassmorphism.

## Architecture
- Frontend : CRA 5 + craco + Tailwind + Radix + React Router 7 + framer-motion + lenis (port 3000, `yarn start`).
- Backend : FastAPI + SQLAlchemy async + SQLite (`/app/backend/kairos.db`), routes préfixées `/api` (port 8001).
- IA : Emergent LLM key (Claude via emergentintegrations), repli local si absente.
- Projets de référence fournis : News-main-5 (base déployée), ZAYADO-v13 (ancien SaaS complet : WhatsApp-service, marketplace, 50+ pages), reprise-main (refonte Aujourd'hui/Ma Vision/Mon Refuge — source du concept Radar/Croissance).

## Implémenté (avec dates)
### 2026-09-21
- ✅ Projet News-main-5 (Kairos) déployé dans /app (frontend + backend SQLite), dépendances installées, .env plateforme préservés.
- ✅ **Page Radar complète** `/app/radar` : héros cinétique (titre masqué ligne par ligne), radar SVG animé (balayage + blips cliquables positionnés par score), parallaxe, marquee éditorial, chapitres numérotés 01/02/03, phrase IA du jour, filtres par canal (Tous/Email/LinkedIn/WhatsApp), bouton copier le message, CTA Relancer/Affiner Vision/Cockpit, défilement fluide lenis + framer-motion.
- ✅ Entrée « Radar » dans la Sidebar + widget Cockpit cliquable vers la page, i18n fr/en.
- ✅ Bug eslint pré-existant corrigé (IdeaDrawer.jsx : hook conditionnel).
- ✅ `EMERGENT_LLM_KEY` + `JWT_SECRET` renseignés dans backend/.env → Copilote IA / point du jour / Radar LLM activés.
- Vérifié : curl /api/, /api/cockpit/radar, /api/state (200) ; captures page Radar (héros, filtres 3→1, boutons).

### 2026-09-21 (session 2 — zips partie1-auth-corrigé + partie2 + app-main)
- ✅ **Multi-comptes (P0 critique)** : Partie 1 auth corrigée appliquée — vrais comptes JWT, lien magique stocké (LoginToken 15 min usage unique), callbacks OAuth Google/Microsoft (échange code→token, state anti-CSRF, base lien depuis FRONTEND_PUBLIC_URL), front envoie Authorization: Bearer + renvoie vers /login sur 401. Vérifié : register/login/me OK, nouveau compte = données isolées (radar vide), sans token → fallback démo (REQUIRE_AUTH=1 dispo pour couper en prod).
- ✅ **Partie 2 appliquée** via apply_part2.py (6 fichiers patchés, 5 ajoutés) : **Marketplace vendeur + modération** (`/app/marketplace`, cycle brouillon→vérification→publié/refusé, Shopify en brouillon d'abord, réservé comptes connectés, onglet modération via ADMIN_EMAILS) ; **Images IA dans Vision Board** (ligne ✨ dans l'éditeur de carte, plafond 10/j, EMERGENT_LLM_KEY) ; **Pouls Business source Qonto** (bloc connexion + sync trésorerie/CA, clés chiffrées via FERNET_KEY).
- ✅ Variables ajoutées : FERNET_KEY, FRONTEND_PUBLIC_URL, BACKEND_PUBLIC_URL, ADMIN_EMAILS=thomas@zayado.fr, IMAGE_DAILY_LIMIT=10.
- ✅ Vérifié : page /login (Google/Microsoft/lien magique/compte test), /app/marketplace (gate connexion), cycle vendeur API (profil→produit→soumission refusée avec raisons métier), page Radar intacte.
- 📦 **app-main exploré** : contient `backend/routes/gdrive.py` + `onedrive.py` (OAuth Drive/OneDrive) — à porter, mais bloqué par l'absence des clés Google/Microsoft.

### 2026-09-21 (session 3 — clés API fournies)
- ✅ **Brevo branché et testé** : email de bienvenue réellement accepté par l'API (`email_sent:true` sur /api/subscribe).
- ✅ **Google + Microsoft OAuth configurés** (`google:true, microsoft:true`, URL d'autorisation générée). ⚠️ L'utilisateur doit déclarer les URI de redirection de la preview dans Google Cloud Console / Azure : `https://radar-ui.preview.emergentagent.com/api/connexion/oauth/google/callback` (idem /microsoft/callback) — celles fournies pointent vers app.zayado.net (prod).
- ✅ **Unsplash branché et testé** (recherche d'images réelle OK).
- ✅ **Clés stockées** : MOLLIE_API_KEY (⚠️ clé LIVE — paiements réels), MAMMOUTH_API_KEY, WA_SERVICE_SECRET (reste WA_SERVICE_URL après déploiement Railway), GOOGLE_DRIVE_REDIRECT_URI / MICROSOFT_REDIRECT_URI (pour le futur port Drive/OneDrive).
- ✅ **Page HTML Shopify** créée : `/shopify-espace-vendeur.html` (page « Espace Vendeur » à coller dans Shopify > Pages > HTML, ou à iframer).
- 📄 **zayado-admin-autonome.html analysé** : console admin faite pour l'ANCIEN backend Zayado (18 endpoints /admin/* : users, stats, transactions, CRM Brevo/HubSpot, articles, WordPress) — aucun n'existe dans Kairos. À porter partiellement (dashboard, users, revenus Mollie, CRM Brevo) si validé.

### 2026-09-21 (session 4 — onboarding réparé)
- ✅ **Onboarding → Vision → Radar bouclé** : les champs Identité (entreprise, rôle) et Activité (type, cible, offre) étaient collectés mais jamais envoyés — ajout de `contexte_metier` (colonne JSON + migration idempotente) côté backend, injecté dans le contexte du Copilote IA. Vérifié : profil enregistré via API → le Radar propose aussitôt des opportunités reliées aux objectifs saisis.
- ✅ Confirmé : l'agent par défaut existe déjà pour chaque utilisateur (« L'Organisateur » — trie, range et organise le cockpit, actif par défaut dans /app/agents).
- ✅ Onboarding testé en navigation (étapes 0→2 OK, zéro erreur console).
- 📌 Clarifications : Qonto = clé PAR UTILISATEUR (saisie dans le widget Pouls, rien à fournir) ; Telegram = UN bot plateforme via @BotFather (compte Telegram du propriétaire requis, ensuite chaque utilisateur relie son Telegram) ; page admin de app-main conçue pour l'ancien backend (18 endpoints /admin/* absents de Kairos) → portage partiel recommandé.
- 🎨 **Bleu Zayado appliqué** (login + onboarding, en attente de validation utilisateur avant généralisation) : classe `.zayado-blue` = dégradé exact reprise-main/v13 `linear-gradient(180deg, #172C5C 0%, #101F47 42%, #0B1F3A 76%, #081734 100%)` + 2 halos bleus, accents or conservés.
- ✅ **Telegram branché et vérifié** : bot @Zayado_bot (token fourni), webhook enregistré côté Telegram, connexion "ready" sur le compte démo. Design = token de bot PAR UTILISATEUR (Paramètres → Connexions), pas de clé plateforme requise.
- 📌 **Apollo proposé** : intégration au Radar (pas de page séparée) — clé API PAR UTILISATEUR dans Paramètres → Intégrations (comme Qonto, car abonnement Apollo propre à chacun) ; le scan quotidien interroge Apollo People Search filtré par la « cible » de l'onboarding → 3 vrais prospects (nom, rôle, entreprise, LinkedIn) avec message pré-rédigé. Création de la clé : apollo.io → plan gratuit possible → Settings → Integrations → API.

- 📌 **Analyse « clés par utilisateur » (validée comme direction pro)** : ZÉRO clé demandée à l'utilisateur final. Qonto = bouton « Connecter » (son compte bancaire, jamais de clé à copier — en attendant : saisie manuelle/import fichier) ; Apollo = compte PLATEFORME mutualisé avec quota par abonnement (l'utilisateur ne voit jamais de clé) ; Telegram = UN bot plateforme @Zayado_bot + lien t.me/Zayado_bot?start=CODE (fini BotFather pour les utilisateurs — à coder : gérer /start dans le webhook) ; WhatsApp = service Railway mutualisé + QR ; Google/Microsoft/Drive/OneDrive = OAuth 1-clic plateforme (déjà le cas) ; Unsplash/Brevo/Mollie = plateforme, invisible. Make.com jugé INUTILE ici (intégrations déjà natives, latence+coût+RGPD en plus).
- 💰 **Grille tarifaire : 3 versions incohérentes constatées** — Pricing.jsx (START 29€ / GROW 79€ / SERENITY 149€), Onboarding (Essentielle 0€ / Immersion 14€ / Vision 29€), Header (« Agent Business 49€ »), et reprise-main/v13 = grille de SERVICES (mutuelle, RC pro, domiciliation 29€, DAF 190€, compta 120€) hors sujet pour un SaaS. PROPOSITION à valider : **Essentielle 0€** (cockpit, vision, refuge, radar 1/jour, 50 msg IA/mois) · **Sérénité 19€** (copilote illimité, radar 3/jour, pouls manuel, revue hebdo) · **Agent Business 49€** (radar Apollo vrais prospects avec quota, validation WhatsApp/Telegram, pouls auto Qonto/Drive, agents prospection+rédacteur, marketplace vendeur) · Instance dédiée sur devis. À appliquer partout après validation.

- ✅ **Webhook Telegram amélioré** (retours captures utilisateur) : 1) gras/italique rendus proprement (conversion markdown → HTML + parse_mode, fini les `**` en brut) ; 2) `/start` → message d'accueil + lien vers l'app ; 3) « Dans l'app stp » → la micro-action proposée est VRAIMENT créée comme tâche du jour (micro=1) + réponse de confirmation avec lien. Regex tolère apostrophe typographique ('). Testé de bout en bout sur le webhook (tâche créée avec le bon libellé, historique propre).
- 📌 **Verdict architecture bots** : Telegram = UN bot plateforme (@Zayado_bot) logique et standard (lien t.me/Zayado_bot?start=code pour lier chaque utilisateur — à coder) ; WhatsApp = nuance → numéro PLATEFORME (Business API) pour notifications/validation, mais session perso (QR Railway) pour la prospection envoyée au nom de l'utilisateur.
- ✅ **Chat Telegram : mémoire + actions réelles** : fil de conversation (8 derniers messages) injecté dans le contexte IA (fini les réponses « comme si ça repartait de zéro ») ; « Oui stp » après proposition de tâche → tâche créée (titre = segment en gras) ; « oui » après « Tu valides ? » → décision enregistrée comme approuvée (canal telegram, visible dans l'app) ; « c'est fait » → dernière action marquée accomplie ; prompt aéré (accroche + puces + gras + 1 question finale). Testé sur les 3 scénarios.
- 💰 **Concurrence analysée** : Sintra X (12 agents IA) ≈ 48$/mois · Lindy 50-200$/mois · Apollo seul 49-119$/mois/user · Motion/Reclaim 8-34$ (productivité calme). → Agent Business à 49€/mois maintenance incluse est DANS le marché. Quota proposé : 30 prospects qualifiés/mois inclus (coût Apollo réel ~2€), pack +9€/50. Commission : SEULEMENT sur la marketplace (paiement via Mollie → attribution exacte, ex. 10%) — jamais sur la prospection (non traçable). Achat à vie déconseillé (dette de support) ; si vraiment : 890€ + maintenance 120€/an après la 1re année. Instance dédiée = déploiement isolé (base + domaine perso) pour cabinets, sur devis (~290€/mois + setup). Marketplace = boutique publique Zayado SÉPARÉE du SaaS, design e-commerce fond blanc (l'espace vendeur reste dans l'app pour la gestion).
- 🧠 **Mémoire** : base système = source de vérité (indispensable à l'app) + export mensuel .md daté vers le Drive de l'utilisateur (quand Drive connecté) ; Supprimer/Restaurer agit sur notre système, jamais sur le Drive sans double confirmation. Message produit honnête : « copie mensuelle chez vous, suppression totale sur demande ».

### 2026-09-22 — Installation News-main-7-corrige
- ✅ Zip News-main-7 installé PAR-DESSUS notre travail sans rien perdre (vérifié fichier par fichier avant copie) : nos ajouts (Radar, auth, Telegram, bleu) étaient déjà inclus dedans.
- Nouveautés : **console /admin** (rôles façon WordPress : client/vendeur/admin, vue d'ensemble, utilisateurs, modération vendeurs, parrainage, codes promo, emails IA, articles SEO — sécurité vérifiée côté serveur, le compte démo est refusé), **parrainage** (inviter → filleuls → crédits bonus), **codes promo**, **heygen_routes.py** (vidéos avatar IA pilotées depuis WordPress via WP_CONNECTOR_SECRET — clé HEYGEN_API_KEY à fournir), bleu Zayado généralisé au body (toute l'app), point rouge actualité câblé dans la sidebar, entrée Collaborateur.
- ⚠️ Erreur attrapée à l'install (l'utilisateur avait prévenu) : la base existante n'avait pas les colonnes `users.role` et `users.credits` → login cassé (500). Migrations idempotentes ajoutées dans `_migrer_colonnes()` — réparé et vérifié (login/register OK, rôles fonctionnels).
- Compte admin de test : admin.test@zayado.fr (rôle admin, promu en base).
- Préservés : .env (toutes les clés), kairos.db (données réelles), node_modules.

### 2026-09-22 (session 6 — correctifs + pages SEO)
- ✅ **HeyGen déplacé dans /admin** (onglet « Vidéos IA » : avatars, voix, script, génération, suivi de statut) — auth passée du secret WordPress au JWT admin (rôle vérifié : 401 anonyme / 403 client / OK admin). WordPress abandonné.
- ✅ **Menu « Scoops »** dans le rail gauche (point rouge tant que le digest du jour n'est pas vu) — un clic ouvre le Copilote sur l'onglet Actualité.
- ✅ **Page Actions** `/app/actions` : kanban semaine 3 colonnes (À faire / En cours / Terminé), ajout rapide, déplacement par flèches — endpoints GET/POST /taches + PATCH /taches/{id}/statut ajoutés. Testée (ajout réel OK).
- ✅ **Tunnel SEO 5 pages** (zéro cannibalisation) : Accueil `/` réécrite (mot-clé « cockpit IA pour entrepreneurs indépendants », hero + capture réelle du cockpit, 3 étapes, 3 piliers maillés, offres 0/19/49, FAQ), `/fonctionnalites/vision-objectifs`, `/fonctionnalites/prospection-croissance`, `/fonctionnalites/bien-etre-dirigeant` — chacune avec titre/meta SEO (hook useSeo), vraie capture de l'app, maillage interne circulaire, CTA vers /onboarding et /pricing. Layout marketing dédié (nav + footer). Captures réelles de l'app dans /public/screenshots/ (chromium headless).
- ⚠️ GIF animés non produits (pas d'outil de génération GIF ici) — remplacés par des captures réelles + animations CSS ; à faire plus tard si voulu via un outil externe.

### 2026-09-22 (session 7 — charte exacte + tunnel conversion)
- ✅ **Bleu EXACT ReactZayado/v13 partout** : `linear-gradient(135deg, #1a3a6e 0%, #102945 60%, #0c1d33 100%)` (charte --zayado-navy-gradient) au niveau body + .zayado-blue, halos réduits à un voile (l'ancien rendu était trop ombré).
- ✅ **Rouge de marque #a01722** réintroduit en accents discrets : classe `.tiret-rouge` (#C1272D éclairci pour lisibilité) sur les H1 marketing + croix de la section Avant/Après.
- ✅ **Grille tarifaire UNIFIÉE partout** : page /pricing réécrite en 2 familles (Cockpit : Essentielle 0€ / Sérénité 19€ · Agent Business : Starter 49€ / Pro 99€ / Complet 149€ / Entreprise sur devis avec maintenance incluse), onboarding aligné (0/19/49), landing cohérente. CTA → /onboarding?plan=… (paiement Mollie à rebrancher sur les nouveaux ids).
- ✅ **Landing enrichie conversion** : bandeau réassurance (sans engagement, données UE, export 1 clic, support humain), section mobile avec mockup téléphone CSS (vraie capture dedans), section « Pour qui » (3 personas), comparatif Avant/Avec Kairos, tirets rouges.
- ✅ **GIF animé réel de l'app** : `radar-demo.gif` (6 frames du balayage capturées en headless + PIL) intégré à la page Prospection et à la carte pilier de la landing.
- 📌 Analyse matchstone.fr : accordéons de fonctionnalités avec démo animée par étape, sous-pages par persona (longue traîne SEO), preuve d'équipe, capture email popup — à reprendre (sous-pages personas = prochain chantier).

### 2026-09-22 (session 8 — Railway)
- ✅ **WhatsApp-service ajouté au repo** (`/app/WhatsApp-service` : Dockerfile + railway.json builder DOCKERFILE + server.js whatsapp-web.js). L'erreur Railway de l'utilisateur venait du déploiement de la RACINE du monorepo — Nixpacks ne sait pas builder frontend+backend mélangés. Correction : Railway → Settings → Root Directory = `WhatsApp-service` (le railway.json force le builder Dockerfile avec chromium). Variables à poser côté Railway : WA_SERVICE_SECRET, BACKEND_URL, WA_START_ON_BOOT=true + volume persistant sur /data (session WhatsApp). Après déploiement : renseigner WA_SERVICE_URL dans backend/.env.
- ⚠️ testing_agent indisponible dans l'environnement — vérification faite par inspection des fichiers du service (Dockerfile, railway.json, endpoints /health) ; le build réel reste à confirmer côté Railway.

### 2026-09-22 (session 8 — Railway + séparation des apps)
- ✅ **Architecture FINALE validée par l'utilisateur : 2 apps** — `app.zayado.net` (SaaS Kairos INCLUANT l'espace vendeur : un utilisateur peut être vendeur, même compte) + `admin.zayado.net` (console admin seule, porte dédiée). Saveurs : `saas` (défaut) / `console`. La saveur console compile (yarn build OK).
- ✅ **Thème crème « modèle Victoires »** sur l'espace vendeur + console admin (classe `.theme-creme` : fond #F6F1E9, cartes blanches, texte navy #1F2A44, or foncé) + **SideMenuPro** : vrai menu latéral navy #14243F avec libellés, badges, retour cockpit, déconnexion — différent du rail d'icônes SaaS. Rail SaaS passé en navy solide (évite le grisâtre sur fond clair).
- ✅ Bug débusqué : `/vendeur/produits` exige le rôle vendeur (news7) → compte test.radar promu vendeur ; espace vendeur vérifié connecté (produits réels listés, profil boutique éditable, badge modération).
- ✅ **Railway-ready** : Dockerfile + railway.json pour `backend/` (uvicorn $PORT, healthcheck /api/), `frontend/` (build CRA → nginx SPA fallback, ARG REACT_APP_BACKEND_URL + REACT_APP_FLAVOR), `WhatsApp-service/` (déjà prêt). Guide complet dans `/app/RAILWAY.md` (4 services, volumes /data, toutes les variables, redirect URIs OAuth à redéclarer).
- ⚠️ Erreur Railway utilisateur résolue : il déployait la RACINE du monorepo (Nixpacks perdu) → chaque service doit pointer son Root Directory.

### 2026-09-22 (session 9 — corrections déploiement)
- ✅ Zip ReactZayado-main-fixed comparé puis appliqué : **correction du Dockerfile backend** (miroir PyPI Emergent `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` — sans lui, `emergentintegrations` est introuvable au build Railway). Miroir testé : 200 OK. Le reste du zip était identique à notre projet ; notre yarn.lock et nos docs (RAILWAY.md, PRD) conservés car plus à jour.

### 2026-09-22 (session 10 — validation compte frais « Sara » page par page)
- ✅ **Compte Sara réinitialisé et validé de bout en bout** : sara@zayado.fr / SaraTest2026! (rôle client). Profil remis à zéro (prenom vide, plus de « Camille »), onboarding complet parcouru en Playwright (9 étapes : identité → activité → cap financier → vision → objectifs → valeurs → offre → final), redirection /app OK, « Hello, Sara » correct.
- ✅ **Bug corrigé — plan par défaut onboarding** : `useState("immersion")` alors que les clés PLANS sont essentielle/serenite/agent-business → écran final affichait « Offre choisie : undefined ». Défaut passé à `essentielle`.
- ✅ **Bug corrigé — accueil Copilote** : « Bonjour . Je suis Kairos » (prénom vide au montage) → message d'accueil recalculé quand le profil arrive, repli « Bonjour. » propre.
- ✅ **Bug corrigé — gate Marketplace** : un client CONNECTÉ voyait « Connecte-toi… » (le 403 de /vendeur/produits faisait retomber l'UI sur l'état anonyme). `/vendeur/etat` renvoie désormais `vendeur: bool` ; le front affiche un message dédié « espace réservé aux comptes vendeur + Retour au cockpit ».
- ✅ **Portails validés visuellement** : Espace Vendeur (test.radar, thème crème + SideMenuPro, produit brouillon listé) et Console Admin (saveur `console` servie sur port dédié pour le test : porte login crème, vue d'ensemble 3 utilisateurs, onglet Utilisateurs avec Sara listée).
- ✅ **testing_agent** : 8/8 tests pytest backend (register sans « Camille », isolation Bearer, 409 doublon, sécurité admin 401/403/200) + parcours UI 100% — rapport `/app/test_reports/iteration_1.json`, tests dans `/app/backend/tests/test_kairos_auth_admin.py`.

### 2026-09-22 (session 10b — lien magique réparé + suite de tests au vert)
- ✅ **Bug PRODUCTION corrigé — emails de connexion (lien magique) jamais envoyés** : `send_email()` exigeait `EMERGENT_EMAIL_KEY` (absente du .env) et l'appelant bloquait sur `if lien and EMAIL_KEY` → tous les liens magiques tombaient en silencieux sur le repli `lien_direct`. Repli Brevo direct ajouté dans `send_email` (BREVO_API_KEY + BREVO_SENDER_EMAIL, déjà validés sur /subscribe) + condition d'appel élargie. Vérifié : `{"envoye":true}` + Brevo 201 réel.
- ✅ **Suite de tests nettoyée : 62/62 verts** (était 9 rouges) — 8 tests obsolètes d'avant le multi-comptes mis à jour : chat migré de /api/chat/* (Mongo) vers /api/copilote/* (SSE + historique par compte), OAuth Google/Microsoft désormais « configurés » (clés présentes), Unsplash déplacé /api/vision/unsplash → /api/unsplash, Vision Board renvoie une clé `board` en plus.

### 2026-09-22 (session 11 — ReactZayado-main-5-corrigé installé)
- ✅ Zip installé SANS écraser notre travail (comparaison fichier par fichier avant copie, .env et kairos.db jamais touchés) : 13 fichiers copiés (server.py, requirements.txt, Sidebar, SideMenuPro, index.css, kairosApi, ChatbotB2B, Landing, Marketplace, Onboarding, Parametres, Pricing, 3 pages marketing).
- Nouveautés backend : **JWT_SECRET refuse le démarrage en prod sans vraie clé** (fini le secret par défaut connu), **anti-brute-force login** (5 essais / 15 min → 429, vérifié), **table Lead + POST /api/leads** (capture email des tunnels marketing, vérifié en base), **échelle tarifaire unique** (Essentielle 0€ / Sérénité 19€ / Pro 49€ / Business 99€ / Entreprise sur devis dès 249€) avec garde-fous Mollie (gratuit et devis ne déclenchent jamais de paiement), **CORS sans joker** avec credentials.
- Nouveautés frontend : **menu latéral « île » avec encoches** (scoops SVG, charte #1a3a6e/#102945), entrées Scoops/Marketplace retirées du rail (alerte actu déplacée sur Aujourd'hui), **pages marketing reconstruites en vrais tunnels de vente** (accroche → capture email → bénéfices → FAQ), **Pricing réécrit** (3 cartes + « Besoin de plus », toggle annuel -20%, code promo), **Parametres** : code promo + lien changement de forfait, **Onboarding lit ?plan= de l'URL**.
- Correctifs appliqués par-dessus le zip (bugs internes au zip) : repli Brevo du lien magique ré-appliqué (absent du zip), **ChatbotB2B aligné sur la nouvelle échelle** (le zip envoyait agent-starter/agent-pro/agent-complet — inexistants ; désormais starter→pro 49€, pro→business 99€, complet→devis sans Mollie), **« Espace Vendeur » ajouté au menu Écosystème du Header** (sinon page orpheline après retrait du rail), **contraste header Marketplace** (titre navy illisible sur fond navy → .entete-navy), Onboarding Entreprise « 149€ » → « Sur devis » (cohérence avec Pricing/backend).
- ✅ Vérifié : 62/62 tests verts, backend 200, frontend compilé, captures (cockpit menu île, pricing, tunnel lead « C'est noté ! » + lead en base, espace vendeur, landing nouveau titre SEO).

### 2026-09-22 (session 12 — ReactZayado-main-6-corrigé installé + retours Marie Esther)
- ✅ Zip v6 installé par-dessus (14 fichiers, .env/kairos.db/tests préservés) : **VisionHub affiche les objectifs 90j réellement saisis à l'onboarding** (section « Tes objectifs 90 jours » avec progression), **Login redirige les nouveaux comptes vers /onboarding** (plus /app direct), **Header Écosystème épuré** (Collaborateurs retiré — déjà dans le rail), **CTA marketing → /login** (capture email retirée, jugée redondante avec le magic link), fetchMoi ajouté à kairosApi, requirements.txt sans le wheel litellm épinglé.
- Ré-appliqué par-dessus v6 (absents du zip) : repli Brevo du lien magique, contraste header Marketplace (.entete-navy), mapping ChatbotB2B starter→pro / pro→business / complet→devis (les ids agent-* n'existent pas dans l'échelle actuelle).
- ✅ **Espace Vendeur conditionnel** : visible dans le menu Écosystème UNIQUEMENT si rôle vendeur/admin (fetchMoi) — vérifié : Sara (cliente) ne le voit pas, Test (vendeur) le voit.
- ✅ Vérifié : 62/62 tests verts, backend 200, lien magique envoye:true, captures (Vision objectifs Sara, menus cliente/vendeur).
- ⚠️ Tarif Entreprise laissé à « 149€/mois » dans Onboarding — demande explicite utilisateur de ne pas toucher les tarifs (incohérence avec Pricing « Sur devis » assumée).
- 📋 **Grand retour Marie Esther (22/09 14:47-15:19) — checklist en cours de traitement**, voir backlog P0/P1 ci-dessous.

### 2026-09-22 (session 13 — P0 fausses données + Paramètres modale, retours Marie Esther)
Référence : zip ZAYADO-v13 (components/SettingsModal.jsx 1347 lignes, ChatPanel.jsx) téléversé comme référence design.
- ✅ **Cockpit honnête** : backend /state renvoie `energy.a_checkin` ; cartes Énergie/Équilibre = états vides + CTA « Faire mon premier check-in » (fini les faux 4/5 et 60/40) ; Objectif 90j / Victoire / Priorités / Tendance avec états vides réels ; moyenne de tendance CALCULÉE (fini « 3,6/5 » codé en dur) ; priorités en grille 3 colonnes desktop ; typographie du point du jour améliorée (15.5px, leading-8).
- ✅ **Header branché** : thème clair/sombre FONCTIONNEL (body.theme-clair, fond crème + cartes blanches, aurora navy masquée, persisté localStorage kairos_theme) ; Messages = dropdown « Messages clients » (état vide honnête, prêt pour les réponses du chatbot) ; Notifications = vraies données (actualité non lue + décisions en attente, badge = vrai compteur, fini le « 2 » codé en dur) ; Espace Vendeur visible uniquement si rôle vendeur/admin.
- ✅ **Bien-être** : vitals null par défaut (« — À mesurer »), historique 7j = vrais check-ins (fini [3,4,2,3,5,4,4] et faux « +0.4 »), palette apaisée (sauge #7A9E7E, terracotta #B9524E, bleu ardoise #7C93C3, beige #C9A66B), check-in vitals avec MOTS sous les chiffres (À plat → Au top etc.).
- ✅ **EnergyCheckin** : sliders énergie/charge avec mots (plus de « 3/5 » abstrait), défaut charge mentale corrigé (était undefined).
- ✅ **Paramètres = grande fenêtre modale** (façon SettingsModal v13) : recherche qui filtre + bascule la section, croix de fermeture, section Général (thème clair/sombre + langue), Profil (email prérempli via /auth/me), Notifications, Intégrations, Parrainage, Sécurité, Forfait & promo.
- ✅ **Langue par défaut = FR** (fini l'anglais surprise au premier chargement).
- ✅ Tests : 62/62 backend verts + testing_agent frontend 100% (8 flux, rapport /app/test_reports/iteration_2.json).

### 2026-09-22 (session 14 — connexion email + mot de passe)
- ✅ **Formulaire email + mot de passe sur /login** (demande utilisateur explicite) : bascule « Lien magique / Mot de passe », modes Connexion et Créer un compte, œil afficher/masquer, messages d'erreur réels (401 « Email ou mot de passe incorrect », 409 « compte existe déjà », 429 anti-force brute, 422 formaté). Routes existantes /api/auth/register + /api/auth/login (bcrypt + JWT + rate limiting), helpers connexionMdp/inscriptionMdp dans kairosApi (_postAuth dédié qui remonte le vrai `detail` FastAPI).
- ✅ Testé via l'interface : création compte lucas.test@zayado.fr → onboarding ; mauvais mot de passe → message clair ; bon mot de passe → connexion ; lien magique intact. 62/62 tests verts.
- Backend préparé (non encore câblé côté UI) : POST /api/radar/swot (SWOT IA structuré JSON), GET /api/admin/notifications (catalogue + prefs par compte), actualité renvoie genere_a + prochaine_maj + marché par défaut depuis le profil (contexte_metier.marche), radar du jour branché sur l'IA (source:"ia", repli local si indispo).

## Backlog priorisé (reste à faire)
### P0 — Critique
- ~~Séparation multi-comptes~~ ✅ FAIT (21/09). Reste : activer `REQUIRE_AUTH=1` + `PRODUCTION_HOSTS` à la mise en prod pour couper le fallback démo.
### P1 — Branchements (clés utilisateur requises)
- **OAuth Google/Microsoft** : code prêt (callbacks faits) — il manque GOOGLE_CLIENT_ID/SECRET (Google Cloud Console) et MICROSOFT_CLIENT_ID/SECRET/TENANT (Azure). URI de redirection à déclarer : {BACKEND_PUBLIC_URL}/api/connexion/oauth/google/callback (idem microsoft).
- **Telegram bot** : TELEGRAM_BOT_TOKEN via @BotFather (route POST /api/connections/telegram/connect prête).
- **WhatsApp Railway** : déployer WhatsApp-service (zip ZAYADO-v13, doc WHATSAPP-RAILWAY.md) → WA_SERVICE_URL + WA_SERVICE_SECRET.
- **Qonto** : bloc de connexion prêt dans Pouls Business — login d'organisation + clé secrète API à saisir par l'utilisateur dans le widget.
- **Shopify** (publication Marketplace) : SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_TOKEN — la boutique publique EST le Shopify existant du client ; le code de publication (création de produit en brouillon via GraphQL Admin API) est prêt, il ne manque que les clés.
### P2 — Features
- **Google Drive / SharePoint-OneDrive sync** (Pouls Business + Vision) : porter `gdrive.py`/`onedrive.py` de app-main — bloqué par les clés OAuth Google/Microsoft.
- **Apollo** : mentionné « déjà paramétré » mais ABSENT des 4 zips — à confirmer/implémenter (prospection Radar).
- Onboarding wizard 3 étapes (identité / activité / cap financier).
- Mollie (MOLLIE_API_KEY), Brevo (BREVO_API_KEY + BREVO_SENDER_EMAIL), Unsplash (UNSPLASH_ACCESS_KEY) : backend prêt, clés à fournir.
