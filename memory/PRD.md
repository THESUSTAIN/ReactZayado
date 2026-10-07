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
