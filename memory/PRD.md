# PRD — Projet vision-act / Zayado (preview Emergent)

## Demande d'origine
- Maquette frontend vision-act (copilote de pilotage indépendants/TPE), boucle Pilotage → Radar → Plan d'action → Bien-être → Aujourd'hui → Tunnels. Puis l'utilisateur a fourni le zip « Zayado-v11 » (projet réel déjà déployé sur Railway) : installation dans le pod + suite de tests complète. Consigne : « déjà déployé, touche rien » (prod Railway + base MySQL prod non modifiées).

## Ce qui est installé (13/10/2026)
- /app/backend : FastAPI + SQLAlchemy async (SQLite locale kairos.db ; prod = MySQL via DATABASE_URL non branchée ici).
- /app/frontend : Vite + React + TypeScript (port 3000, proxy /api → 8001). Supervisor : frontend lancé via `yarn dev` (conf modifiée : `yarn start` n'existait pas).
- backend/.env : clés fournies par l'utilisateur (Mammouth, Brevo, Mollie TEST, Google/Microsoft OAuth, HeyGen, DataForSEO, Unsplash, Telegram, Shopify webhook, VAPID, WhatsApp service, JWT_SECRET, FERNET_KEY, ADMIN_EMAILS) + EMERGENT_LLM_KEY (repli IA) + APERCU_CODE (mode aperçu dev).
- NON branché volontairement : DATABASE_URL MySQL prod, MOLLIE live, RUN_CRONS (évite emails réels programmés depuis la preview).
- Git initialisé dans /app (hygiène : secrets non trackés). conftest.py racine ajouté (alias conftest unique pour la suite).
- Comptes seedés : voir memory/test_credentials.md. Données de test seedées : 3 objectifs + agent « Studio Camille » (test.analyse@zayado.local), abonnements Pro actifs (sara, client.demo, test.analyse).

## Résultat suite de tests (13/10/2026)
- 283 passed / 17 failed / 1 skipped (run xdist tel que configuré dans pytest.ini, test_emails_ia isolé : passe seul avec --noconftest — il mute httpx globalement).
- Échecs restants = tests obsolètes ou liés à l'ancien workspace : « Kairos » (renommé Zayado), /lancer fusionné par design, URLs relances renommées (/app/elan), integrations status réservé admin (correctif sécurité voulu), 401 attendus vs mode aperçu dev actif, DB sanitisée à 2 comptes (incompatible comptes démo), script purge git (layout /app/zayado d'origine), 1-2 flaky en parallèle (passent isolés).

## Backlog / prochaines étapes
- P0 : décider quels tests obsolètes supprimer ou mettre à jour (côté projet, pas ici — « touche rien »).
- P1 : fournir APOLLO_API_KEY réelle pour activer l'option Radar Pro (« Apollo_Api X » = placeholder).
- P1 : brancher Mollie live + DATABASE_URL prod UNIQUEMENT sur Railway, jamais sur la preview.
- P2 : tests e2e navigateur additionnels (tunnels publics /public/tunnel).

## Mises à jour 13/10/2026 (soir)
- Zayado v12 installé (Admin › Prix, Journal, témoignages) en préservant .env/base/comptes seedés.
- Suite de tests nettoyée : **304 passed / 0 failed / 2 skipped** (17 tests obsolètes mis à jour ou supprimés : renommage Kairos→Zayado, fusion « Lancer », nouvelles URLs /app/elan, integrations admin-only, mode aperçu, base sanitisée, purge git, conftest unique, test_emails_ia isolable).
- Nouveau : **Admin › Marque & entreprise** (marque_ext.py + AdminMarque.jsx) — nom de marque, logo appli, logo e-mails, pieds de page (e-mails + site), e-mail de contact, nom d'expéditeur. Appliqué sans redéploiement : _email_wrap, e-mail de bienvenue, Sidebar, Login, MarketingLayout. Aperçu e-mail HTML réel dans l'admin (GET /api/admin/marque/apercu-email). 4 tests backend (tests/test_marque.py).

## Backlog révisé
- P1 : vérifier le parcours tunnel public complet (/public/tunnel) en mode test Mollie
- P1 : tester un checkout Solo en mode test Mollie
- P2 : upload de logo directement depuis l'onglet Marque (réutiliser /admin/medias du carrousel)

## Mises à jour 13/10/2026 (fin)
- Onglet Marque : boutons « Téléverser un fichier » sur les 2 champs logo (stockage carrousel /api/admin/medias, URL absolue auto pour le logo e-mail).
- Tunnel public testé e2e (Mollie TEST) : capture prospect → Kit 27 € payé (carte test) → upsell Fast-Track 97 € en 1 clic (mandat) → page confirmation. BDD : 2 commandes « paid » + 1 prospect.
- Marketplace testée e2e : vendeur (création produit + photo + soumission) → achat client 19 € via Mollie test → commande « paid ». NB : la modération « publier » exige SHOPIFY_ADMIN_TOKEN (absent en preview → produit publié en base pour le test). À surveiller : le stock produit n'est pas décrémenté après paiement (observé).

## Mises à jour 13/10/2026 (v12.1)
- Zip v12(1) installé : shopify_auth.py (jeton Shopify auto via ID+secret client, renouvelé ~24 h, secret = vérification webhooks). server.py = zip + module marque uniquement. Suite : 304 passed / 0 failed.
- Vérifié sur preview : chat Copilote (streaming SSE fluide, réponses pro, récupération si connexion coupée) et onglet Actualité (3 actus datées avec sources officielles, brefs IA, états vide/erreur/préférences déjà gérés dans le code, bouton Actualiser). Aucun bug reproduit — les symptômes signalés viennent vraisemblablement de la prod (version antérieure).
- Cadence actus déjà raisonnable : max 1 notification/jour, 2 e-mails/semaine (lundi+jeudi). Rien à changer pour « pas 3 par semaine ».
- Shopify : sur la preview, ligne rouge attendue (pas de secret ici, par choix). En prod : poser SHOPIFY_CLIENT_ID/SECRET + domaine .myshopify.com sur Railway (SHOPIFY_SHOP_DOMAIN=zayado.net actuel est incorrect : il faut le xxx.myshopify.com).
- Admin › Branchements : bouton « Vider le cache de tous les comptes » (POST /api/admin/actualite/vider-cache) — purge résumés IA (24 h), flux RSS (30 min) et brefs du jour de chaque profil ; le marqueur actu_cache_v invalide le cache navigateur via la signature existante. 2 tests (test_actu_cache_admin.py). Suite : 306 passed.

## Mises à jour 13/10/2026 (v13)
- Zip v13 « fichiers » installé (partiel, basé sur l'état courant) : liaisons CRM des tunnels (Brevo/HubSpot/Sheets/Make, 1 relance/jour), chat accueil 4 cartes + Juridique Auto/Toujours/Non, revue de la semaine auto (vendredi 15 h, rangement IA + Drive/OneDrive), notifications point du jour dédupliquées, toasts style Zayado, Ma Foi ↔ Vision, nouveau logo appli (logo-app.png, personnage doré), renommage « VisionAct » (titre, manifest, OG).
- tests/test_crm_liaisons.py (7 tests) : verts. Suite complète : **313 passed / 0 failed**.
- Vérifié en navigateur : titre « VisionAct par Zayado », nouveau logo dans la barre latérale, bouton « Juridique : Auto » dans le chat.

## Mises à jour 14/10/2026 (v20 + Shopify en ligne)
- v20 « cartes douces » installée (index.css + GlassCard : cartes adoucies, fond d'origine).
- Bug espace Entreprise (thème clair) : la matière de carte sombre (index.css, !important) écrasait le style clair → cartes gris-bleu illisibles. Fix : exclusion .pro-clair dans index.css (cartes blanches). Vérifié navigateur.
- Shopify tm2fg0-nk.myshopify.com installé par API (script shopify/outils/installer_boutique.py, grant client_credentials) : 35 fichiers de thème, templates/index.json (accueil), modèles de pages (maison/besoins/cockpit/contact/liens), collections, définitions métachamps zayado.*, métachamps des 16 produits, modèle journal. Corrections schémas Liquid : defaults sur settings « url » interdits (7), noms > 25 car. (FAQ, tarifs), label > 70 car. (hero).
- Barre d'annonce : « La maison des entrepreneurs apaisés · Diagnostic gratuit en 2 minutes » → tunnel.
- Bug Journal : titre « À la une » illisible (Dawn force la couleur des titres) → couleur ivoire explicite sur fonds nuit.
- Reste MANUEL côté Shopify (API refuse) : nom boutique « My Store » → « Zayado » (Paramètres › Général), logo d'en-tête (Personnaliser › En-tête, ou accorder write_files pour que je le pousse), domaine zayado.net à connecter.

## Mises à jour 14/10/2026 (vitrine Shopify complète)
- Analyse v9 vs actuel : rien perdu dans l'app ; les pages manquantes venaient de l'ancienne vitrine React (v9).
- Thème Shopify : 5 nouvelles pages composées en sections éditables (customizer), textes v9 : /pages/services (Acquérir/Optimiser + 4 étapes), /pages/parcours (3 étapes + 3 niveaux), /pages/vision (3 valeurs), /pages/boutique (rayons Corps/Âme/Rituel/Organisation/Pack), /pages/box (précommande, contenu, box équipe). Script : shopify/outils/pages_vitrine.py.
- Confidentialité (relecture app Shopify) : pages légales créées avec le contenu complet de l'app (confidentialité 15 k car., mentions légales, CGU, CGV) + redirections /legal/* → /pages/* (301 vérifiée). Politiques natives /policies : nécessitent le scope write_legal_policies (non accordé) — à coller manuellement dans Paramètres › Règles ou accorder le scope.
- Scripts Shopify : outils/installer_boutique.py (thème+collections+métachamps) et outils/pages_vitrine.py (pages+légal+redirections), réutilisables après tout changement de texte.

## Mises à jour 14/10/2026 (v29 + thème Shopify v2 EN LIGNE)
- Zip v29 installé : pages légales de l'app en charte claire Zayado (.legal-clair : fond ivoire #FDFCF8, texte nuit #0D1F38, accents or), logo cassé réparé (Login + MarketingLayout : repli /logo-app.png au lieu de /logo-zayado-blanc.png inexistant — vérifié navigateur, 0 image cassée), page confidentialité statique pour Google (public/legal/confidentialite.html + nginx.conf), backend/boutique_installation_ext.py (« Installer la boutique » en 1 clic, branché dans server.py après shopify_auth, 4 tests verts).
- THÈME SHOPIFY v2 PUBLIÉ (id 205699580245, ancien thème conservé en secours) via shopify/outils/pousser_theme_v2.py (nouveau thème → upload ordonné sections avant templates → publication). 381 fichiers + 5 modèles v9. En-tête Zayado (bandeau nuit, logo Z + devise, recherche, Mon espace → app.zayado.net/login, Panier, CTA « Faire mon diagnostic »), pied 3 colonnes dont « Informations légales » (menu « legal » créé via GraphQL menuCreate), Poppins partout.
- Corrections schémas v2 : defaults interdits sur 7 réglages « url » (repli Liquid `| default:` pour garder les liens), libellé > 70 car. (hero). Menu legal créé par resourceId (PAGE).
- Panier + chaînes Dawn en français : locales/en.default.json = fr.json (la langue principale de la boutique reste « anglaise » dans Paramètres › Langues — à changer à la main si souhaité). « Powered by Shopify » retiré du pied.
- /public/tunnel : S'AFFICHE CORRECTEMENT en preview ET en prod (vérifié navigateur les deux). Le symptôme signalé = ancien service worker côté navigateur ; le nginx.conf v29 (no-cache sw.js/index) corrige ça au prochain déploiement Railway.
- Inventaire pages publiques de l'app : AUCUN doublon vitrine (elles ne sont que sur Shopify). Seuls /pricing et /partenaires/thesustain utilisent encore MarketingLayout — décision utilisateur en attente. Zip de sauvegarde : /app/exports/pages-publiques-app.zip (35 fichiers + LISEZ-MOI-liste.md).
- INVENTAIRE VISUEL : /app/frontend/public/apercu/index.html (servi sur /apercu/index.html) — 44 captures réelles de TOUTES les pages publiques (app + boutique), classées « à garder / légal-Google / iframes / doublon ? ». Script : /app/exports/capturer_pages.py (+ generer_index_apercu.py). Astuce anti-Cloudflare : capturer via http://localhost:3000 (pas d'anti-robot).
- Bug trouvé grâce aux captures : /embed/confidentialite s'affichait blanche (thème sombre cassé) → passée en .legal-clair comme les autres pages légales.

## Mises à jour 14/10/2026 (méga-menus façon vitrine)
- Zip « Zayado-Entreprise-main » analysé (= vitrine-entreprise locale, seul le routeur diffère) : c'est la référence design de l'en-tête. Correspondance : 21/25 pages existent déjà (Shopify ou app) ; absentes : /favoris, /coming-soon, /hero-choix, /box-v1.
- MÉGA-MENUS en ligne sur la boutique : rangée « Tout voir · Corps · Âme · Rituel & Confort · Espace & Organisation · Promos · Le journal · Services Pro · Partenaires » (menu main-menu reconstruit via GraphQL menuUpdate — argument title obligatoire). Panneau au survol : titre + description + « Tout … » + 3 premiers produits de la collection (image, prix). Tiroir mobile : produits en sous-liens. Piloté par des blocs « Rayon » de la section zayado-entete (Thèmes › Personnaliser › En-tête), description + handle de collection éditables.
- 5 collections intelligentes créées (corps, ame, rituel-confort, espace-organisation, promos ; règle : étiquette = handle). 7 produits physiques tagués par univers (mega_menu.py).
- Script : shopify/outils/mega_menu.py (collections + tags + menu + upload thème).
- Menu corrigé pour ressembler exactement à la vitrine : groupe gauche (Tout voir + univers + ★ Promos) / groupe droite (Le journal, Services Pro, Partenaires) via réglage section « liens_droite », 13px + tracking + gap 28/24, scrollbar masquée. Vérifié par capture (survol Corps OK).

## Mises à jour 14/10/2026 (hero cinétique + 4 pages + rayon Ocushield)
- HERO CINÉTIQUE en ligne sur l'accueil : section zayado-hero-anime (titre en lignes animées « Entreprendre avec clarté financière, sérénité et équilibre », 4 bienfaits en cascade, image + carte jauge 78/100 animée + carte « Prochaine action ») + zayado-marquee (bandeau défilant 42s). Animations CSS pures (.zy-anim, delays --d).
- 4 PAGES créées : /pages/coming-soon (navy, 4 piliers, 8 rayons, aperçu cockpit, liste d'attente via {% form 'customer' %} tag coming-soon-boutique), /pages/box-v1 (précommande : 49€/59€, équipe 39€ HT, seuil 30, deadline 20/11/2026, 3 garanties, devis via form tag box-equipe-devis), /pages/hero-choix (3 images), /pages/favoris (wishlist localStorage + cœurs injectés sur les cartes produits via assets/zayado-favoris.js chargé dans theme.liquid).
- RAYON « Concentration visuelle » : collection intelligente (tag) + 8 produits Ocushield (vendor=Ocushield, tags ame+concentration-visuelle+produits) : lunettes amber 39,99 €, filtres écran ordinateur 29,99 / MacBook 39,99 / iPhone 34,99 / iPad 29,99, Oculamp 99,99, spray 4,99, masque sommeil bambou 29,99. Prix = montants publics ocushield.com relevés le 14/10/2026 (mêmes chiffres, en € — ajustables). Images générées par IA (Nano Banana gemini-3.1-flash-image-preview, style ivoire/navy/or) et posées sur chaque produit. Le méga-menu « Âme » affiche désormais 3 cartes.
- Pièges Liquid corrigés : « \n » littéral ne marche pas dans les assign (utiliser un séparateur § + split) ; les rem valent 10px sous Dawn (62.5%) → utiliser des px ; range Shopify ≤ 101 pas ; noms de sections ≤ 25 car.
- Script : shopify/outils/pages_hero_ocushield.py (thème + pages + collection + produits + images IA). Lien vendeur : créer le vendeur « Ocushield » dans l'app Admin › Marketplace pour le retrouver dans l'espace vendeur.

## Mises à jour 14/10/2026 (contrôle du déploiement + contrat + cœurs fiches)
- DÉPLOIEMENT CONTRÔLÉ (demande utilisateur : plus rien ne part en ligne automatiquement) : 3 endpoints dans shopify_ext.py — GET /admin/shopify/themes (thèmes + badge en ligne + lien Prévisualiser ?preview_theme_id), GET /admin/shopify/apercu-urls (56 URLs groupées : accueil, 18 pages, 10 collections, 24 produits, divers ; avec theme_id → ouverture en aperçu du thème hors ligne), POST /admin/shopify/deployer (publie le thème choisi, l'ancien reste en secours hors ligne). UI dans Espace vendeur › Commandes › « Branchement Shopify » : bloc « Déploiement du thème » avec bouton or « Déployer la boutique » par thème hors ligne (confirmation). Vérifié en navigateur (2 boutons déployer, 56 liens).
- CONTRAT PARTENARIAT : champ « lien_contrat » ajouté au profil vendeur (CHAMPS_PROFIL_VENDEUR + PROFIL_DEFAUT) — modifiable par le vendeur (Profil vendeur) et par l'admin. Formulaire mis à jour.
- CŒURS FAVORIS sur les fiches produit : zayado-favoris.js pose aussi le cœur à côté du titre produit (Dawn .product__title ou h1) — vérifié (clic → cœur rouge).
- Rappel lien vendeur auto : l'infra existe (webhook /webhooks/shopify HMAC + regrouper_par_vendeur via VendorProduct.shopify_id + Synchroniser 60 j). FAIT 14/10 : compte vendeur ocushield@zayado.net créé + 8 fiches liées (script creer_vendeur_ocushield.py). Prix Ocushield : l'utilisateur les corrigera manuellement (marge ~20 €).
- THÈME « Zayado — Préparation » (id 205715800405) : copie du thème en ligne via creer_theme_preparation.py (reprise + checksums). Depuis, mega_menu.py et pages_hero_ocushield.py poussent sur PRÉPARATION — la mise en ligne passe par le bouton « Déployer la boutique ».
- CONTRAT TYPE vendeur : page /legal/contrat-partenariat (12 sections, charte claire, bouton « Imprimer / enregistrer en PDF »), liée depuis la case à cocher du profil vendeur + nav légale. Champ lien_contrat = contrat SIGNÉ (profil vendeur).
- Suite de tests : 309 passed quand REACT_APP_BACKEND_URL=<preview> ET ZAYADO_BACKEND_URL=http://localhost:8001 sont posés (les test_tscheck_* tapent localhost:8002 par défaut — héritage v11, pas une régression).

## Mises à jour 14/10/2026
- Tâche 1 (Hero aiguillage) : cartes réduites (min-height, paddings, tailles de police) dans shopify/theme-v2/assets/zayado.css, poussé sur le thème « Zayado — Préparation » (205715800405) via pousser_preparation.py --hero-aiguillage. Aperçu : https://tm2fg0-nk.myshopify.com/?preview_theme_id=205715800405. Pas encore en ligne (déploiement = Console Admin › Déploiement boutique).
- Clés Shopify ajoutées dans backend/.env (SHOPIFY_SHOP_DOMAIN/CLIENT_ID/CLIENT_SECRET).
- zayado-hero-anime.liquid : utilisé par aucune page, conservé (rien supprimé).

## Prochaines tâches (ordre validé)
- P0 Tâche 2 : tunnels style Brunson + Radar → sortie systématique vers aimant à prospects / newsletter
- P1 Tâche 3 : page Liens (zayado-liens) → formulaire derrière chaque lien
- P1 Tâche 4 : SEO par catégorie (meta, FAQ, données structurées, pages collection)
- P2 : tâches 5 à 9 (douleur client par page, photos réalistes, doc React↔Shopify, 10 livres SEO US, test complet)

