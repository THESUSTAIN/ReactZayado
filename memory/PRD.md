# PRD — Zayado

## Problème initial
Écran d'onboarding statique « Ton bien-être d'abord » (copie pixel-perfect, React + TS + Tailwind, aucun backend).

## Pivot (28/09/2026)
L'utilisateur a fourni le projet complet `ReactZayado-final-lot-mafoi.zip` et demandé son installation **sans rien casser** (version déjà déployée et fonctionnelle ailleurs — Railway). Le périmètre devient : application Zayado complète en preview.

## Architecture
- Frontend : React 19 + CRA/craco (port 3000), Tailwind, proxy /api → backend (setupProxy.js). Entrée `src/index.js` → `src/App.js` (app complète). `App.tsx`/`main.tsx`/`vite.config.ts` = vestiges Vite, hors graphe de build.
- Backend : FastAPI (port 8001), SQLAlchemy async + SQLite (`backend/kairos.db`, prêt MySQL/PostgreSQL via `DATABASE_URL`). JWT auth, streaming SSE pour le Copilote IA.
- Services supervisor : backend (uvicorn /root/.venv), frontend (yarn start), mongodb (non utilisé par cette app).
- Service WhatsApp (`WhatsApp-service/`) copié mais NON démarré (optionnel, port 3001).

## Personas
- Indépendant solo (offres Rêveur/Solo/Pro) : prospects quotidiens, CA suivi, priorités.
- Équipe/entreprise : offres Business/Entreprise.
- Admin : validation ambassadeurs/affiliation, pilotage.
- Visiteur : landing + simulateur + pricing.

## Implémenté (28/09/2026)
- Écran onboarding statique (sauvegardé dans `/app/memory/onboarding-backup/`).
- Installation du projet complet : backend + frontend copiés, dépendances installées (pip + yarn), .env conservés, aucune config plateforme modifiée.
- Clés ajoutées au backend : EMERGENT_LLM_KEY, JWT_SECRET, FERNET_KEY (générées).
- Comptes de démo seedés (voir test_credentials.md).
- Vérifié : landing OK, login mot de passe OK (test.pro@zayado.net), redirection paywall /activer OK, API /api/ OK.

## Correctifs 29/09/2026 (session 2)
- **P0 — Sauvegarde board partagé (403) RÉSOLU** : la cause était le `BoardSwitcher` affiché même en mode « board partagé » — il chargeait les boards PERSO de l'invité, ne trouvait pas la clé du board partagé et forçait le basculement sur « perso » → PUT /api/vision/partages/perso → 403. Fix VisionCanvas.jsx : switchBoard ignoré en mode partage, BoardSwitcher masqué (badge « vision-partage-badge » avec nom/emoji du board à la place), boutons Partager/Commentaires (réservés au propriétaire) masqués pour l'invité. Vérifié E2E : l'invité polezayado modifie, sauvegarde (200), recharge → persisté ; le propriétaire voit la modif.
- **Seed boards** : `_seed_boards_proprietaire` re-remplit désormais un board démo existant mais vide (le board marketing avait été vidé pendant les tests du bug).
- **P1 — Clic carte actu = résumé IA auto** : avant, « En parler à l'IA » pré-remplissait juste le champ. Désormais la question est ENVOYÉE automatiquement (ChatTab : accueillirPrompt + anti-doublon montage/événement 80 ms, repli pré-remplissage si streaming en cours).
- **P1 — Cloche stable** : le correctif cache module (_notifCache + notifChargees) est confirmé par les tests (badge stable à travers les navigations).
- **P1 — Rythme alerte Actualité (1er login)** : le Copilote pose la question « à quel rythme veux-tu l'alerte actualité ? » (Chaque matin / Le lundi / Jamais — data-testid actu-rythme-*) tant que la préférence n'est pas réglée, et l'enregistre lui-même (contexte_metier.actu_rythme). Même réglage dans Paramètres → Notifications (select parametres-actu-rythme). La cloche respecte le rythme (jamais = pas d'alerte, lundi = alerte le lundi seulement). Backend : /api/copilote/actualite renvoie `rythme`.
- **Bug global corrigé** : après un login SPA (sans rechargement), KairosProvider gardait un contexte vide (fetchState 401 avant login, jamais relancé) — prénom absent, préférences non lues. setToken émet désormais `zayado:token` (uniquement à la pose d'un nouveau token) et KairosProvider se re-hydrate dessus.
- Test agent : 7/7 flows frontend PASS (iteration_1.json). Reste cosmétique : warning console React « button dans button » (composant non identifié, sans impact).

## Chat juridique + dédoublonnage présentation (29/09/2026, session 4)
- **Support juridique façon Kandbaz (juridique_ext.py)** : détection des questions de droit (mots-clés forts) dans /copilote/chat → prompt système structuré (1. règles de droit applicables — jamais d'article inventé, 2. application à la situation, 3. limites/incertitudes, 4. en résumé + phrase CGU finale) ; sources officielles par thème (TVA, cotisations, contrat/impayés, création/statut, RGPD, travail, bail, propriété intellectuelle, fiscal) et par pays (France/Belgique → service-public.fr, Légifrance, impots.gouv.fr, CNIL, INPI ; Afrique francophone → OHADA ohada.org/ohada.com) envoyées en événement SSE dédié ; repli local déjà structuré si Mammouth absent.
- **Audace frontend (ChatTab)** : cartes « Sources officielles » cliquables (nouvel onglet), mention CGU (chat-juridique-mention), bouton « Copier la réponse » (texte + URLs), raccourci « Question juridique ».
- **BUG PROD corrigé** : streamChat n'envoyait pas le JWT → le Copilote répondait 401 en production (hors aperçu). Header Authorization ajouté.
- **Onboarding** : écran de présentation (3 slides + vidéo) SUPPRIMÉ — doublon avec le carrousel du login. /onboarding s'ouvre directement sur « Bienvenue ». Conséquence : la stat admin « Accueil — écran de présentation » (taux d'adhésion) n'est plus alimentée.
- Test agent : 6/6 PASS (iteration_4.json).

## Carrousel login administrable (29/09/2026, session 3 suite)
- **Backend (carrousel_ext.py, pattern install_*(globals()))** : table site_contents (clé→JSON) + carrousel_medias ; GET /api/contenu/login-carousel PUBLIC ; PUT /api/admin/contenu/login-carousel (admin, 403 sinon, 1-6 slides validées) ; POST /api/admin/medias (upload image ≤8 Mo / vidéo ≤60 Mo vers le stockage objet Emergent — playbook objstore, préfixe zayado/carrousel/) ; GET /api/medias/{id} PUBLIC (Cache-Control 1 j). Routes publiques ajoutées à _ROUTES_PUBLIQUES_*.
- **Admin** : nouvel onglet « Carrousel login » (CarrouselLoginAdmin.jsx) — par slide : type image/vidéo, source par LIEN ou UPLOAD (avec indicateur ✓), titre, description, style (position bas/centré, voile léger/moyen/fort, taille normal/grand), monter/descendre/supprimer (avec confirmation), ajouter (max 6), enregistrer, lien « Voir la page login ».
- **Login.jsx** : CarouselLogin + BanniereMobile chargent les slides depuis l'API (vidéo lue en boucle muette), styles appliqués, repli sur les 3 slides par défaut si l'API échoue.
- Test agent : 7/7 PASS (iteration_3.json) — édition par lien, styles, ajout/ordre/suppression, upload réel (objstore), vidéo mp4, bandeau mobile, restauration config d'origine.

## Refonte design + SSO TheSustain (29/09/2026, session 3)
- **Admin + Vendeur au design exact du zip « Cours »** : SideMenuPro réécrit — barre latérale FLOTTANTE arrondie (navy #182d5e→#0d1838, détachée du bord), onglet actif doré (#DEC2A3), carte utilisateur en bas (initiales + rôle via /auth/me), tiroir mobile avec burger. Pages en fond crème (#F8F8F6→#ECECEA, classes .pro-cours ajoutées à index.css par-dessus .pro-clair), cartes blanches. Bascule sombre conservée (pro-theme).
- **Login split-screen** : panneau gauche = carrousel auto (5 s) de 3 images de marque (montagne/lac/jardin, design_guidelines.json) avec titres + points cliquables ; formulaire à droite inchangé. Mobile : bandeau image compact au-dessus de la carte.
- **Bouton « Continuer avec TheSustain »** (SSO partenaire) : frontend prêt (badge « bientôt » + note partenaire ouverte aux non-chrétiens) ; backend prêt et générique — provider « thesustain » piloté par env (THESUSTAIN_CLIENT_ID/SECRET + THESUSTAIN_OAUTH_AUTHORIZE_URL/TOKEN_URL/USERINFO_URL/EMAIL_FIELD/SCOPE). Actif dès que l'utilisateur fournit les accès OAuth TheSustain.
- **Onboarding** : image d'en-tête (banc au soleil couchant) + NOUVELLE étape 7 « Sens & Foi » (obligatoire) : 3 choix (membre TheSustain / je découvre → modale TheSustainInfo / non merci) avec phrase partenaire inclusive ; enregistre contexte_metier.parcours_foi (clé déjà lue par MindsetParcours). Répond à « où active-t-on la partie foi ».
- **Bug latent corrigé** : le vrai dropdown de l'app est Base UI (dropdown-menu.tsx éclipse le .jsx Radix à la résolution webpack) — le menu profil du header CRASHAIT la page (MenuGroupLabel hors Menu.Group) et les triggers asChild généraient des warnings. 4 triggers du header réécrits sans asChild + Label enveloppé dans Group. Plus aucun warning, plus de crash.
- Test agent : 7/7 flows PASS (iteration_2.json) + vérif manuelle des 4 menus header.

## Refonte « Bien-être & Mindset » claire (29/09/2026, corrigée)
- La page /app/bien-etre suit désormais le basculeur de thème global (bouton lune/soleil du header) : SOMBRE = design bleu d'origine restauré à l'identique ; CLAIR = nouvelle forme façon maquette (jauge d'énergie, 3 cartes, graphique équilibre Perso/Pro, bandeau agent + « Bloquer un créneau ») mais aux couleurs du thème clair existant (fond clair de l'app, cartes blanches, encre navy #1F2A44) — la maquette ne prête que sa forme.
- Correctifs visibilité en thème clair (globaux) : rail latéral et menu mobile du bas étaient illisibles (icônes navy sur fond navy) → île claire + pilule active navy ; pistes des jauges vitals invisibles sur carte blanche → teinte adaptée ; overlay respiration immersive gardé volontairement sombre (.be-dark-keep).
- Bug corrigé : crash « useCockpit must be used within CockpitProvider » sur /app/radar et /app/actions — causé par des doublons .tsx (ancienne variante Vite) qui éclipsaient les vraies pages .jsx à la résolution webpack (tsx prioritaire sur jsx). Fichiers déplacés dans pages/_legacy/.
- Backend : `/api/bien-etre/energie` renvoie aussi `stress` par jour (rituels_ext.py) pour les barres Perso.
- Compte test.pro@zayado.net : abonnement Pro activé en base preview (fin 2027-09) pour traverser le paywall en test.
- Vérifié : /app/radar + /app/actions sans erreur ; dark = original ; clair = forme maquette (jauge 80 % après vrai check-in, barre du jour dessinée) ; modale check-in lisible en clair ; menu mobile du bas visible en clair (375px).

## Correctifs 29/09/2026 (suite)
- Vision Board : la vue canvas est désormais PLEIN ÉCRAN aussi sur PC (rail de l'app masqué, le board remplit le viewport sous l'en-tête, comme sur mobile). Vérifié 1366px + 375px, retour hub OK.
- Cockpit : « Ton point du jour » n'est plus un pavé — le texte (IA ou repli) est découpé en lignes repérées Énergie / Priorité / Plan B / Victoire avec icônes. Vérifié en cockpit.
- Vision Board — commentaires (NOUVEAU) : table vision_comments + endpoints (public GET/POST par token de partage, owner GET + mark-read). Page publique /v/:token : bouton « Commentaires (n) » + modale (mobile-friendly) avec formulaire prénom+message. Board propriétaire : icône commentaires à côté de Partager avec badge non-lus + modale liste. Notification e-mail au propriétaire si ses réglages l'autorisent (nécessite Brevo ; l'échec d'envoi ne bloque jamais le commentaire). Vérifié par API (post visiteur, lecture owner, non_lus). Vérif UI E2E en cours.
- File de bugs signalés par l'utilisateur, en cours : bouton « Enregistrer » de l'actualité (API OK, retest UI à faire) ; clic carte actu doit ouvrir un résumé IA ; paramétrage du moment de réception de l'actualité + demande au 1er login par le chat ; cloche du header dont le compteur saute.

## Fonctionnel mais en repli (clés manquantes — à fournir par l'utilisateur)
- MAMMOTH_API_KEY : Copilote IA / Radar / Agent Business en repli local générique.
- HEYGEN_API_KEY : vidéos IA désactivées.
- Stripe : paiements/abonnements non actifs (paywall visible mais checkout non testé).
- Brevo (emails), Google/Microsoft OAuth, Apollo (prospection), DataForSEO, HubSpot, Jira : non configurés.

## Backlog priorisé
- P0 : fournir MAMMOTH_API_KEY (ou recâbler sur EMERGENT_LLM_KEY) pour activer l'IA ; clé Stripe pour tester le checkout.
- P1 : Google/Microsoft OAuth, emails Brevo (lien magique).
- P2 : WhatsApp-service, HeyGen, Apollo, déploiement (le site live a sa propre base — le 1er Deploy copie les données preview une fois).

## Prochaines tâches
1. Activer l'IA (clé Mammouth ou repli Emergent LLM).
2. Tester le parcours d'essai 1 € avec Stripe test.
3. Créer un compte admin de démo si besoin.
