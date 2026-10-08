# PRD — Zayado, Maison des entrepreneurs apaisés

## Problème original (verbatim)
"Genere mois une page frentend yori : maison des entrepnneurs aipaisé.. une maketpalce standard pour prendre soin de l'entrpznnejr et son entrepnneur liste 3 concurents a ce niveau. Couleur de fond principal blanc un peu de beige clair et couelur bleu navy mi clair"

## Choix utilisateur (ask_human)
- Mini-marketplace complète ; concurrents réels ; CTA « Prendre rendez-vous » ; blanc/beige clair/navy mi-clair.

## Évolution majeure (docx client, 2026-10-07)
Le client a fourni « Zayado — Services et produits de la marketplace.docx » : rebranding Yori → **Zayado** (zayado.net) et restructuration complète en deux familles (Services + Produits) avec 4 mécanismes d'achat (Demander un diagnostic / S'abonner ou Essayer / Ajouter au panier / Demander un devis). Tout le contenu provient de ce document, chiffrés inclus.

## Architecture réalisée
- Backend FastAPI (/api) + MongoDB (motor) :
  - GET /api/services, GET /api/services/{slug} — 3 lignes de service avec contenu structuré (features, plans, rows, steps, notes)
  - GET /api/products — 23 rayons (pour_moi 10, pour_entreprise 9, transverse 4) avec statut prix (« En cours » / « Sur devis ») et flag « proposé »
  - POST/GET /api/appointments — demandes avec request_type (diagnostic / abonnement / devis), sujet, date
  - Seed automatique au démarrage (collections vides uniquement)
- Frontend React (Tailwind, framer-motion, lenis, sonner, shadcn) :
  - / — hero cinétique « Rentabiliser son entreprise, sans s'y perdre. », promesse « Plus de clients, moins de charge mentale », marquee, bento « Pourquoi Zayado » (problème / sélection stricte / socle financier / interlocuteur de confiance), deux familles, spotlight Cockpit IA (5 fonctions + tarifs fondateurs), marché (3 concurrents réels + bandeau « ni Amazon, ni freelances au rabais »), citation
  - /services — index des 3 services + note partenaires réglementés
  - /services/:slug — cockpit-ia (5 fonctions, 5 offres : Essai 15 €, Solo 29 € [fondateur 24 €], Pro 69 € [fondateur 49 €], Équipe 99 €, Entreprise dès 299 € sur devis, essai 1 mois offert, annuel ~2 mois offerts, TheSustain −30 %) ; optimisation-entreprise (5 services, sur devis après diagnostic) ; acquisition-transmission (parcours 4 étapes, forfaits 1 990 / 2 850 / 2 850 € HT + 20 % économie ou 3 300 € HT, notes transmission/honoraires tiers/valorisation sans certification)
  - /produits — rayons groupés (Pour moi / Pour mon entreprise / Transverses & box), « Ajouter au panier » désactivé (prix en cours), « Demander un devis » pour l'aménagement, box saisonnières en précommande
  - /diagnostic — formulaire avec sujet pré-rempli depuis ?service=, request_type dérivé (cockpit→abonnement, aménagement→devis), succès + toast ; /rendez-vous redirige vers /diagnostic
- Identité : logo SVG arche + soleil (navy/beige) en favicon ; Cormorant Garamond + Manrope ; grain éditorial ; lenis ; prefers-reduced-motion respecté.

## Vérifié (2026-10-07)
- [x] curl : /api/services (3), /api/services/cockpit-ia (5 offres), /api/products (23 rayons), POST /api/appointments (request_type abonnement enregistré), 404/422 gérés
- [x] e2e UI : formulaire diagnostic avec pré-remplissage ?service=cockpit-ia → bouton « Commencer mon abonnement » → succès + toast
- [x] Screenshots desktop 1440 (accueil, cockpit, produits) et mobile 390 sans overflow

## Backlog priorisé
- P1 : panneau des demandes reçues (lecture appointments), email de confirmation (Resend), paiement abonnements (Stripe) quand le Cockpit IA sera prêt
- P2 : panier + catalogue produits (débloquer « Ajouter au panier » quand les prix arrivent), comptes partenaires, iframing de la grille tarifaire depuis l'application, compteur de places des box en précommande

## Installation du vrai projet Zayado + corrections notifications/PWA (2026-10-07)
- Projet client (ReactZayado-main-12.zip) installé dans le pod en remplacement du prototype : backend FastAPI/SQLite sur 8001, frontend CRA+craco sur 3000 (tsconfig Vite déplacés dans frontend/_vite_tsconfig_backup pour le conflit CRA), WhatsApp-service copié (non démarré).
- Compte admin local = test.essentielle@zayado.net / Test!2026 (seed + bootstrap, garde anti-rétrogradation ajoutée).
- Diagnostic prod (app.zayado.net) : backend sain (cloche remplie quotidiennement, e-mails Brevo OK, VAPID cohérentes) ; frontend déployé ancien (sans activerPushAuto/abonnementValide) → 0 appareil push abonné → « 3 jours sans notification ». PWA : sw v4 + manifest OK en prod ; shell installé à purger/réinstaller.
- Correctifs (additifs, Railway-safe — voir /app/MODIFS-NOTIFICATIONS-2026-10-07.md) : /api/push/public-key en route publique ; endpoint GET /api/admin/notifications/sante (push, crons, appareils, relances 7 j par canal, règles de calme) ; carte « Santé du système de notification » + « règles de calme » dans Admin → Notifications ; erreurs SW loguées en console.
- Vérifié localement : login admin, cockpit, abonnement push (réel + simulé), envoi de bienvenue réel vers FCM, /api/push/statut, /api/admin/notifications/test (cloche ✓ / push ✓ raison / e-mail ✓ message clair), relances/executer, sante.
- Production vérifiée page par page : login, compte, cockpit, cloche (12 notifs), vision, radar, actions, paramètres, admin (vérificateur multi-canal : cloche ✓, push « aucun appareil abonné », e-mail ✓ envoyé).

## Refonte du chat Copilote (2026-10-07, modèle OkyAi)
- Comparatif demandé avec https://okyai-html.mantrakshdevs.com/chatbot : l'app Zayado avait de meilleures fonctions métier (sources officielles, exports Word/Excel/MD/Drive, création de tâches, réglages conversationnels) mais une présentation de chat plate (bulles sans avatars, input basique, pas d'accueil immersif).
- ChatAssistant.jsx/ChatTab refait au niveau OkyAi, signature Zayado : orbe d'accueil animé (ondes + halo doré) avec raccourcis suggérés, avatars sur chaque message (initiale dorée pour l'utilisateur, pastille navy Sparkles pour l'IA), bulles premium (dégradé or / verre dépoli, coins asymétriques), horodatage systématique, indicateur d'écriture avec avatar, carte d'input premium (rounded-3xl, halo or au focus, astuce Entrée/Maj+Entrée, bouton d'envoi rond en dégradé or).
- IA réellement branchée en preview : repli EmergentChat (clé universelle, claude-sonnet-4-5-20250929) actif quand MAMMOTH_API_KEY absente — le Copilote répond en streaming (en prod : clé Mammouth inchangée, aucun changement).
- Vérifié : envoi d'un message → réponse IA structurée en streaming, avatars/horodatage/actions visibles, mobile 390 px sans overflow.

## Chat plein écran aligné sur OkyAi (dimensions mesurées, 2026-10-07)
- Mesures OkyAi (1440×900) : page pleine, pas de carte flottante ; titre 30 px + sous-titre ; boutons étiquetés Fullscreen/Options en haut à droite ; input 896×98 px, rayon 24, verre 40 %, centré ; pills « Try asking » (h 31) SOUS l'input ; astuce en bas ; orbe lumineuse ~160 px au centre.
- ChatGrand refait pleine page : plus de « carte dans la carte » ; Sidebar native Zayado (96 px) affichée à gauche (import nommé — le default provoquait un crash React) ; en-tête pleine largeur « Copilote IA » + Réglages/Réduire ; input centré 900×98 px (identique OkyAi) ; raccourcis masqués à vide au profit des pills « Essaie de demander : » sous l'input ; astuce bas de page ; orbe animée de fond (halo pulsant + orbe visible en conversation).
- Vérifié : plein écran 1440 sans carte flottante, sidebar native visible, input mesuré 900×98 centré, plus aucun chevauchement de boutons.

## Compte test Thomas réparé (2026-10-07)
- Bug : le bouton « Ouvrir le compte test (Thomas) » renvoyait toujours vers /login. Chaîne : APERCU_CODE absent du .env local (403 sur /api/connexion/demo) → ProtectedRoute exigeait un jeton que le mode démo n'émet pas → un 401 de /api/push/statut expulsait /app vers /login (window.location.assign).
- Correctifs : APERCU_CODE=preview (local uniquement) ; ProtectedRoute laisse passer sans jeton en aperçu uniquement (même règle que le middleware backend) ; _versLogin n'expulse pas en aperçu sans jeton ; /push/statut renvoie {demo:true} au lieu de 401 en démo (/push/test et /push/subscribe restent protégés).
- Vérifié : clic → /app « Bonjour, Thomas. » (cockpit démo + Copilote + point du jour IA réels), plus aucun rebond. Validation indépendante : production préservée (403 garanti sur app.zayado.net, aucun contournement admin, pas d'escalade de rôle) ; penser à PRODUCTION_HOSTS=app.zayado.net sur Railway et à ne jamais copier le .env local sur Railway.

## WhatsApp réparé + polish Okyai (2026-10-07 soir)
- WhatsApp : microservice installé (yarn, Chromium système via PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium) et lancé sur :3001 (WA_DATA_PATH=/app/WhatsApp-service/data persistant) ; backend/.env + WA_SERVICE_URL/WA_SERVICE_SECRET ; /connections/whatsapp/start → 200 avec QR data:image/png généré. Reste : scan du QR par la propriétaire via l'appli (Canaux du Copilote). Railway : WA_SERVICE_SECRET identiques des 2 services, BACKEND_URL public du service, volume /data, WA_START_ON_BOOT=true.
- Chat plein écran : barre d'onglets supprimée ; « Décisions » (étiqueté) + « Actualité » (icône) passés dans l'en-tête (événement kairos:onglet, bascule aller-retour) ; prompt Copilote + CONCISION (2-5 phrases max, une seule question, une seule prochaine action).
- Micro-animations : anneau d'énergie se remplit + compteur 0→valeur (AnneauEnergie), aiguille BalanceDial part du centre, KPI du Pouls Business en compteur animé, GlassCard survol (soulève + halo or), .btn-gold en dégradé or 135°.
- « Il prépare / tu décides » prouvé fonctionnel : « Génère 5 idées » a produit 5 idées IA réelles scorées (podcast, produit numérique, conseil freelance, communauté payante, automatisation IA). Aucun « propose 3 » retrouvé dans le code — l'app propose 5 ; demander l'écran exact si besoin.


## Bulles resserrées + WhatsApp complet (2026-10-07, dernier cycle)
- Bulles du Copilote plein écran — SEULE demande du client pour le chat (« juste la bulle trop large, c'est tout ») : conversation limitée à une colonne centrée max-w-3xl (768 px), bulles utilisateur max-w-[75 %] / 520 px, réponses IA dans la colonne, input aligné sur la même largeur. Rien d'autre modifié sur le chat.
- WhatsApp selon la recommandation acceptée (« je suis ta recommandation ») — rôles confirmés : WhatsApp = numéro de l'entrepreneur (QR), il discute avec le Copilote IA ; Telegram = bot partagé Zayado :
  - Nouveau composant WhatsAppStatut.jsx dans l'en-tête du Copilote plein écran : vert « Connecté à ton numéro · +33… » (ready), ambre « En attente de scan… » (qr), rouge « WhatsApp déconnecté » + bouton « Reconnecter » (déjà relié et déconnecté), muet si jamais relié. Poll 30 s ; alerte in-app signaler() une seule fois, seulement si la déconnexion persiste (2 ticks) après un état ready.
  - POST /api/connections/whatsapp/restart (nouveau) : régénère un QR en un clic via /session/{uid}/restart du microservice.
  - POST /api/webhooks/whatsapp-web-disconnected (nouveau) + notifyBackendDisconnected côté microservice : la perte de session est remontée à l'app.
  - GET /api/connections/whatsapp/status enrichi : réconciliation en direct avec le microservice + champ deja_relie.
  - Relance post-scan : quand le QR est scanné, le backend envoie au numéro connecté (conversation « Moi-même ») la confirmation + les 5 premières actions a_faire du Plan d'action (raise_for_status ajouté).
  - Robustesse : buildSession du microservice nettoie les verrous Chromium — le Reconnecter plantait (« The browser is already running ») après un kill du service.
- Testé (testing agent, /app/test_reports/iteration_1.json, 100 % back + front) : bulles étroites validées, envoi de message + réponse streaming OK, pastille ambre visible pour l'admin et absente pour Thomas, webhooks 200 {ok:true}, mobile 390 OK. Pastille verte, alerte de déconnexion réelle et réception de la relance : À VALIDER PAR LA PROPRIÉTAIRE après scan du QR.


## Chat redessiné : fermé par défaut, en-tête épuré, zéro pavé d'infos (2026-10-08)
- Demande client : « le chat sur PC à droite ne doit pas s'ouvrir par défaut », « trop d'info en haut, peut-être déplacer l'icône dossier », « les infos à chaque fois qu'on contacte le chat, tu trouves cela pro ? », notifications à améliorer, mobile radar/plan d'action/chat.
- ChatPanel (cockpit xl) : JAMAIS ouvert au chargement (suppression de la persistance localStorage zayado_chat_masque) ; bouton flottant or « Copilote » (chat-rouvrir) en bas à droite pour l'ouvrir ; deep-link /app?tab=chat|actu|decisions rouvre le panneau (fix : l'événement partait avant le montage).
- En-tête du chat épuré : Décisions + Actualité (icônes) + menu « + » (chat-menu-plus) qui regroupe Mes documents, Écrire à l'équipe Zayado et le statut « Transmis » (cloud sync) + Réglages/Agrandir/Fermer.
- Zéro pavé d'infos : le message d'accueil et le moteur de questions de mise en route (REGLAGES, ControlesReglage, ChoixDossier, RelierTrello, RYTHMES_ACTU, ~180 lignes) sont SUPPRIMÉS ; état vide sobre « Bonjour {prénom} » + 3 raccourcis ; historique relu côté serveur inchangé ; kairos:chat-nouveau → conversation vide.
- Cloche améliorée : panneau défilable (max-h-75vh), largeur responsive mobile (w-[calc(100vw-16px)] sm:w-80), compteur « Notifications · N » et bouton « Tout lu » visible dès 1 non-lue (reçu) + en bas de liste.
- Mobile radar/actions/chat : aucun débordement horizontal mesuré à 390 px (scrollWidth == innerWidth), grilles déjà empilées ; capture desktop de preuve : cockpit plein écran sans panneau + bouton flottant, et chat ouvert avec en-tête épuré.
- Testé (testing agent, iteration_2.json, 100 %) : les 8 points passent. Note : le bouton « Tout lu » ne concerne que les notifications reçues (inbox) — les indicateurs ambiants (actu/décisions/vision) n'ont rien à marquer.

## Accueil façon OkyAi : capteurs, limite de tâches, beige du login (2026-10-08)
- Demande client : trop de tâches sur l'accueil (19 cartes TEST) ; bouton login « bizarre marron dégradé et non beige » ; générer une image de l'accueil Zayado dans le design du dashboard OkyAi (violet→beige, fond bleu navy).
- Bouton login corrigé : btn-gold passe de `#F1E2CC→#E8C77E→#C9973B` (bronze → effet marron) à `#F8EEDD→#F1E2CC→#DEC2A3` (beige pur, cohérent avec les boutons du hero). Vérifié par style calculé.
- Quatre cartes capteurs (composant CarteCapteur, langage visuel OkyAi : label capitales, chiffre 30px, ligne de contexte, icône en pastille, note colorée verte/or en bas) remplacent la ligne de 3 chiffres : Énergie (score/5 + check-in), Série (jours + tenue), Actions (faites/total), Objectif 90 j (% ou — + cap 3 ans). data-testid cockpit-capteurs / cap-*.
- « Tes autres priorités » limité à 6 cartes + lien or « Voir les N dans le Plan d'action → » (data-testid priorites-voir-tout) vers /app/actions?tab=actions. Vérifié sur le compte Thomas : 6 cartes affichées, lien « Voir les 19… ».
- Images de preuve servies par la preview : capture-1 (chat fermé PC), capture-2 (chat ouvert), capture-3 (chat mobile 390), capture-4 (menu + ouvert), capture-5 (accueil redesign PC, compte Thomas), capture-6 (accueil mobile 390).

