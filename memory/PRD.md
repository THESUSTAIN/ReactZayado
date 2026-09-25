# PRD — Zayado (ReactZayado-DEPLOIEMENT-v3)

## Problème initial (session courante)
« Installe ce zip pour les corrections, teste app.zayado.net comme un utilisateur entrepreneur (chaque page, chaque fichier) et donne-moi les erreurs trouvées. »

## Architecture
- Projet : Zayado / Kairos — cockpit IA pour entrepreneurs (React CRA + craco, FastAPI + SQLAlchemy, SQLite local / MySQL-Postgres prod Railway).
- Installé dans ce workspace : /app/frontend (CRA, script `dev` ajouté = craco start), /app/backend (server.py:app, SQLite kairos.db, .env dev créé). Template Vite d'origine sauvegardé dans /app/_template_frontend et /app/_template_backend. Copie brute du zip dans /app/audit/ReactZayado-main.
- IA : Mammouth (MAMMOUTH_API_KEY, 2 M) pour Copilote/Radar/SWOT ; EMERGENT_LLM_KEY pour images Vision.

## Implémenté (avec dates)
### 2026-09-24 — Audit complet prod + installation locale
- ✅ Zip installé et fonctionnel en local (backend 8001, frontend CRA 3000, register/login OK, données démo amorcées).
- ✅ Audit prod app.zayado.net en tant qu'entrepreneure « Claire » (coaching reconversion) : 21 pages visitées (captures dans /app/audit/), ~50 endpoints API testés avec token réel.
- ✅ Compte de test prod créé : claire.audit.2026@gmail.com (voir test_credentials.md).

## Erreurs trouvées en production (audit 2026-09-24)
### Critiques
1. POST /api/auth/register → 500 MAIS le compte est créé (crash après commit, requête parrainage/Referral). Retry → 409 « compte existe ». Parcours d'inscription cassé.
2. GET /api/connections → 500 (page Agents/Canaux).
3. GET /api/connections/telegram/status et /whatsapp/status → 500.
4. POST /api/parrainage/inviter → 500 + GET /parrainage/mes-filleuls → 500 (parrainage en panne).
5. Prod PAS à jour avec le zip v3 : GET /api/ia/statut (présent dans le code, ligne 4072) → 404 en prod.
   → Cause racine probable des 1-5 : build prod ancien + tables récentes (referrals, user_connections) absentes de la BDD prod. Action : redéployer v3 + créer les tables (create_all/migration).

### Importantes
6. POST /api/vision/image → 503 « EMERGENT_LLM_KEY absente » en prod (génération d'images IA Vision Board en panne).
7. /api/integrations/status affiche Mammouth + Emergent LLM « non configurés » alors que l'IA répond : le catalogue vérifie MAMMOTH_API_KEY (1 M) au lieu de MAMMOUTH_API_KEY (2 M). Bug de nom de variable (server.py ~ligne 3567).
8. Plan choisi à l'onboarding (« serenite »/Solo) non reflété : /api/profile répond plan « essentielle » (plan activé seulement après paiement — utilisateur non informé).
9. /api/state → profile.email vide alors que le compte a un email (email non recopié dans le profil).

### UX / cosmétique
10. /espace-vendeur et /admin en thème clair beige : rupture avec le thème navy/or.
11. /acheter sans paramètre → cul-de-sac « Cette offre est introuvable ».
12. /connexion/demo et /connexion/apercu → 403 en prod (désactivés — vérifier que c'est voulu ; le bouton Thomas est bien masqué en prod).
13. Comptes de test documentés dans le zip (sara@zayado.fr) absents de la prod (401).

### Sécurité / vigilance
14. Mollie en clé LIVE : chaque /api/checkout crée un vrai lien de paiement (test effectué : session 22,80 € TTC créée, NON payée, expirera seule).
15. ✅ Points positifs vérifiés : anti-brute-force login (5/15 min), 401 propres sans token, 403 admin pour un client, rôle admin non auto-attribuable, lien magique usage unique 15 min.

## Ce qui fonctionne en prod (vérifié)
Login Google/Microsoft configurés, lien magique Brevo (envoye:true avec origin), login mot de passe, onboarding complet (profil+contexte métier+pouls), Radar IA personnalisé, Copilote IA streaming, point du jour, SWOT IA, check-in énergie (échelle 1-5), idées, export RGPD, partage vision public /v/:token, Unsplash, newsletter Brevo, checkout Mollie, 21 pages sans erreur console JS (sauf 500 connexions).

## Backlog priorisé
- P0 : Redéployer zip v3 en prod + migrer tables manquantes (corrige 1-5 d'un coup, à confirmer).
- P0 : Ajouter EMERGENT_LLM_KEY en prod (corrige 6).
- P1 : Renommer MAMMOTH→MAMMOUTH dans INTEGRATIONS_CATALOG (7) ; email profil (9) ; message plan à l'onboarding (8).
- P2 : Thème sombre pour /espace-vendeur + /admin (10) ; page /acheter sans param (11) ; recréer comptes de démo prod (12-13).

### 2026-09-24 (session 2 — audit v9 + test immobilier Geremmo)
- ✅ Zip v9 installé (remplace v3 dans /app) ; corrections vérifiées EN CODE et EN PROD (v9 déployée entre-temps) : register 500 → 200, /connections 500 → 200, telegram/whatsapp status → 200, parrainage inviter + mes-filleuls → 200, /ia/statut 404 → 200 (ia_active:true, claude-sonnet-4-5), email profil désormais rempli, statut Mammouth « configuré » correct, thème sombre appliqué à /espace-vendeur et /admin, /acheter explique et propose des CTA, « Profil complété » passe à 88 % après onboarding.
- ✅ Nouveautés v9 testées : Landing publique (/ et /accueil — héro « Donne un cap clair à ton entreprise », barre « Décris ton activité », offres, footer), BoardsGallery Vision (Perso/Pro + Nouveau board + objectifs 90 jours), bannière « IA en mode repli » transparente, visite guidée 15 étapes (6 sur mobile), 19 pages visitées en session Alexandre : zéro erreur console (sauf 403 volontaire sur /admin).
- ✅ Test persona « Alexandre — Geremmo immobilier » complet en PROD (IA réelle) : inscription → onboarding (location/gestion/vente) → pouls 5200/9000 € → Radar IA : 3 opportunités pertinentes (bailleurs frustrés → gestion, vendeurs hésitants → vente, locataires actifs → location) avec messages personnalisés → Point du jour relié à l'objectif 10 mandats → Copilote : réponse argumentée Geremmo (7 %, réactivité locale, transparence) → SWOT IA pointu (risque 17 mandats/mois, épuisement solo). VERDICT : très pertinent pour l'immobilier.
- ✅ Sessions JWT survivent à un redémarrage backend (vérifié).
- ✅ Proxy dev local corrigé : setupProxy.js ciblait localhost:8002 → 8001.

## Erreurs restantes après v9 (audit 2026-09-24 session 2)
### À corriger
1. 🔴 EMERGENT_LLM_KEY toujours absente en prod → génération d'images IA Vision Board 503 (seul bug critique restant).
2. 🟠 Suite pytest backend obsolète : 71 échecs dus aux tests eux-mêmes (attendent « Kairos » dans /api/, URL kairos-vision.preview codée en dur dans test_iteration3.py, fixtures sara@zayado.fr inexistantes, anciens codes 404 vs 401). À réécrire — ce ne sont PAS des régressions de l'app.
### UX/UI à corriger
3. 🟡 Plan choisi à l'onboarding (Pro) non reflété : le profil reste « Découverte » jusqu'au paiement, sans message qui l'explique.
4. 🟡 Bloc « Objectif 3 ans » du cockpit vide après l'onboarding alors que la vision est saisie — pourrait être pré-rempli depuis texte_vision.
5. 🟡 Cohérence prix : Landing affiche Solo 24 €, page Tarifs affiche 19 € barré 21/24 € (fondateur) — harmoniser ou préciser l'offre fondateur sur la Landing.
6. 🟡 La visite guidée recouvre le centre du cockpit à la première connexion (fermable — envisager une bulle moins intrusive).

### 2026-09-24 (session 3 — v10, test Cindy, correctifs UI)
- ✅ Zip v10 installé (refonte backend lib/models/routers, nouvelles pages Activer, essai 2 mois 1 €, AccesGate).
- ✅ Test persona « Cindy » (marketplace pour entrepreneurs épuisés, MBA finance, évangélisation entreprise+association) : PROD (IA réelle) — Radar 3 opportunités pertinentes (test MVP réseau, post LinkedIn recrutement vendeurs, email abonnement fondateur), point du jour relié aux 20 vendeurs, SWOT mentionnant MBA/foi/risque projet pharaonique ; Actualité du Copilote OK (vrais articles Le Monde, multi-marchés France/Sénégal/Côte d'Ivoire/Cameroun/Maroc/Belgique). LOCAL (offre Équipe injectée en base) — accès complet sans paywall, Vision Board : modèles Cockpit A→Z (pré-rempli de sa vision/valeurs), Vision Board 2026, Plan 90 jours.
- 🐛 BUG TROUVÉ + CORRIGÉ : VisionCanvas ignore le paramètre ?board= de l'URL (entrée directe/rafraîchissement) → les modèles s'appliquaient au board « perso » au lieu du board ouvert. Fix : init boardKey depuis l'URL. Vérifié par API (cartes au bon board) + capture.
- ✅ Header SaaS rendu transparent (demande utilisateur).
- ✅ Confirmé : MAMMOUTH_API_KEY (orthographe Railway) bien lue partout (alias MAMMOTH↔MAMMOUTH dans v10).
- ✅ Objectif 3 ans du cockpit désormais pré-rempli depuis la vision (corrigé dans v10).
- ⚠️ Bug « onboarding disparu » identifié : v10 envoie les nouveaux comptes vers /activer (paywall 1 €) AVANT l'onboarding — le texte « Ta vision et tes objectifs sont enregistrés » s'affiche même pour un compte qui n'a jamais fait l'onboarding. Ordre correct à rétablir : inscription → onboarding → /activer. ✅ CORRIGÉ (session 4) : AccesGate renvoie les non-onboardés vers /onboarding, Onboarding termine sur /activer, /activer propose « Raconter mon projet » si jamais onboardé. Vérifié : nouveau compte → /app mène à /onboarding ; /activer affiche le CTA onboarding.
- ✅ CORRIGÉ (session 4) : Landing — plus de noir en bas de page : dégradé navy visible (#16275a→#0B1F3A) + halos bleus sur toute la hauteur, cadre visuel navy clair (#16275a), cartes effet verre plus blanches (lignes bg-white/12, étapes bg-white/10). Validé par captures haut/milieu/bas.
- ⚠️ Changement d'offre connecté : les CTA tarifs renvoient vers /login?next=/onboarding même déjà connecté — à brancher directement sur le checkout.
- 📌 Avis tarif demandé : oui pour un 3e palier entre Solo (24) et Pro (49 fondateur) — ex. « Croissance » ~34-39 €.
- Vérification par testing_agent : outil indisponible dans cet environnement — vérifications faites par captures + appels API réels (constaté dans le chat).

### 2026-09-24 (session 5 — bug login prod)
- 🐛 BUG PROD corrigé : champs de connexion en fond blanc + texte quasi blanc → saisie invisible. Cause : classes Tailwind `bg-white/8`, `bg-white/12`, `border-white/8`, `border-white/12` absentes du CSS compilé en prod (cache de build stale — le JS est v10, le CSS d'un build plus ancien). Correctif robuste : définitions CSS manuelles dans index.css (toujours livrées) + override autofill Chrome (champs navy, texte clair). Vérifié : computed style rgba(255,255,255,0.08) + capture.
- ✅ Compte Cindy prod : la connexion API fonctionne (200). L'échec utilisateur venait du bug d'affichage (frappes invisibles → mot de passe erroné → possible blocage 15 min anti-brute-force).
- ⚠️ IMPORTANT POUR LA PROD : le cache de build CSS est stale chez eux → au prochain déploiement, supprimer node_modules/.cache avant `yarn build` (sinon les nouvelles classes Tailwind ne seront toujours pas générées).
