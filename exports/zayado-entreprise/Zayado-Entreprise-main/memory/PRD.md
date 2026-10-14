# PRD — Zayado V1 (tunnel de conversion)

## Problème original
Site public de Zayado centré sur une offre d'entrée claire (le diagnostic) qui alimente la vente de ses services, avec une marketplace et des box saisonnières comme univers séparé. Repositionné ensuite (message utilisateur) : différencier Zayado d'un cabinet M&A — « Acquérir, transformer et équilibrer » — avec le bien-être comme pilier réel et le Cockpit comme système de pilotage.

## Modèle Zayado (2 socles + 4 moyens — corrigé utilisateur : « 5 c'est beaucoup »)
**La base** : équilibrer vie personnelle et vie professionnelle.
- Socle 1 — L'ENTREPRENEUR (bien-être) : Physique, Mental (mindset), Performance. Progression : Énergie → Focus → Récupération → Équilibre.
- Socle 2 — L'ENTREPRISE (la partie financière) : Clarté financière, Rentabilité, Trésorerie. Progression : Clarté → Organisation → Rentabilité → Environnement.

**Les 4 moyens** (comment on agit sur les deux socles) :
1. ACQUÉRIR — recherche d'opportunités, sourcing Apollo/réseau, qualification, analyse financière, valorisation, financement, négociation, accompagnement à l'acquisition.
2. OPTIMISER — rentabilité, coûts, organisation, processus, marketing, outils + environnement de travail (aménagement/décoration, ergonomie, équipements, partenaires dont Trouveton).
3. PILOTER — Cockpit Zayado : Entreprise (CA, marge, trésorerie, rentabilité, projets, performance) × Entrepreneur (énergie, charge, récupération, concentration, rythme, équilibre) + IA qui fait le lien.
4. LA BOUTIQUE — marketplace en interne, « Boutique » en externe : pour l'entreprise (mobilier, ergonomie, éclairage, décoration, végétalisation, équipements, outils), pour l'entrepreneur (bien-être, concentration, récupération, confort, mobilité), services partenaires (aménagement, travaux, dont Trouveton).

Le bien-être est la base transversale (pas un pilier numéro X) : présent dans les socles, le Cockpit et la boutique.
Parcours : Entrepreneur → Diagnostic → (Acquérir | Optimiser) → Cockpit → (Entreprise | Entrepreneur) → Boutique → Performance durable.
Positionnement : l'acquisition = moyen de développement ; l'optimisation = moteur de création de valeur ; le cockpit = système de pilotage ; la marketplace = moyen d'équiper ; le bien-être = partie intégrante de la performance.

## Utilisateurs
- Entrepreneurs / dirigeants cherchant performance ET équilibre.
- Visiteurs attirés par la marketplace curée et les box saisonnières.
- Prospects voulant « se situer » via le diagnostic avant un accompagnement.

## Design
- Palette (choix utilisateur) : fond principal BLANC, beige clair en sections d'accent, navy foncé + DÉGRADÉ navy visible partout (sections, boutons — foncé → bleu clair), or. Poppins + Caveat. Awwwards-level : hero cinétique masqué, parallaxe, marquee éditorial lent, lenis, framer-motion, grain, logo SVG (favicon).
- CTA dominant unique : « Faire mon diagnostic gratuit ». Preuve sociale près des CTA. Double voie sur les services (réponse rapide / réserver un appel, confirmation écran).
- Marque : slogan officiel « Entreprendre avec clarté financière, sérénité et équilibre. » (logo, hero, footer, méta SEO) ; signature « La maison des entrepreneurs apaisés » (hero, vision, footer). Boutique nommée « Boutique » en externe (marketplace en interne, esprit type Kiabi — large choix accessible, sans citer la marque).
- Tunnel de vente explicite : section accueil étiquetée « Le tunnel de vente Zayado » (diagramme du parcours complet).

## Pages
- / : **landing simple à 2 sections** (maquette utilisateur), **pied de page minimal** (logo, slogan, liens — c'est un tunnel) : hero (slogan Poppins+Caveat « clarté financière, » en or, image bureau/dashboard 78/100, cartes flottantes « Mon équilibre » (5 barres) + « Prochaine action », bénéfices Plus de focus/clarté/efficacité/équilibre, CTA « Faire mon diagnostic ») + section « Quel est votre besoin aujourd'hui ? » (3 cartes : Pour moi / Faire mon diagnostic navy / Pour mon entreprise avec tags). 3 images hero générées : heroDesk (défaut), heroDeskMountain, heroDeskHands — au choix de l'utilisateur.
- /maison : **« La Maison »** — l'ancienne page d'accueil riche restaurée à la demande de l'utilisateur (hero fondateur + slogan, positionnement « ni cabinet M&A », 2 socles + mission + 4 moyens, tunnel de vente diagramme, marquee, trust stack navy, teaser marketplace + box, CTA final). Lien « La Maison » dans le header.
- Header type boutique : barre de recherche (→ /marketplace?q=) + liens **Accompagnement · Marketplace · Cockpit · Journal** (plus de bouton diagnostic dans le header — le diagnostic fait partie de l'accompagnement).
- /diagnostic : quiz 7 questions à branchement → capture email → résultat (profil « Le Développeur » → Acquérir ou « L'Optimiseur » → Optimiser, 3 leviers, reco + lien Cockpit) + formulaire contact alternatif.
- /services (Accompagnement) : Acquérir & Optimiser détaillés (items exacts, déroulé 4 étapes, preuve sociale, double voie de conversion, lien vers tunnel dédié).
- **Tunnels** (pour Google Ads) : /tunnel/optimisation et /tunnel/acquisition — hook, DOULEURS (5 cartes), AVANTAGES Zayado (5 cartes), angles (0 € d'apport ; acheter > créer), déroulé 4 étapes, témoignage, CTA diagnostic + formulaire. 
- /marketplace (+ /marketplace/entreprise, /marketplace/entrepreneur — une page par catégorie) : nom « Marketplace » partout (apparence boutique), recherche filtrante, SEO par catégorie (titre/meta dynamiques, textes « En savoir plus », tags mots-clés, FAQ), Services & partenaires (dont Trouveton), éditions saisonnières. Checkout simulé → /paiement/succes, /paiement/annulation.
- /journal (+ /journal/:slug) : journal éditorial (pas un blog classique) — Articles (0 € d'apport ; acheter ou créer ; lancer/vendre à 0 euro), Témoignages, Notes ; méta SEO dynamiques par entrée ; CTA diagnostic en fin d'article.
- /cockpit : métriques Entreprise/Entrepreneur, citation IA, statut « en construction, d'abord clients accompagnés ».
- /vision : manifeste (2 socles / 4 moyens), valeurs, bien-être, TheSustain, Cockpit.

## Implémenté
- 2026-10-06 : V1 complète (accueil, diagnostic, services, marketplace, box, checkout simulé, succès/annulation, vision).
- 2026-10-06 : repositionnement 5 piliers, page Cockpit, marketplace réorganisée, parcours visuel, fond blanc/beige inversé, tagline « performance & équilibre ».

## Ajouts 2026-10-07 (v4)
- Beige du fond éclairci : #F6F5F2 (choix utilisateur) ; espaces de « Quel est votre besoin ? » resserrés.
- /maison : section **Vision humaine** (inspirée du site clarity-entreprise : « Une maison construite sur des valeurs, pas sur du volume. » — Ouverture / Intégrité / Sens).
- Marketplace : **barre de filtres sticky au scroll** (Pour l'entreprise / Pour l'entrepreneur / Services / Box saisonnières) + pagination par catégorie conservée.
- Journal refondu : filtres avec compteurs (TOUT · 5…), carte vedette « À découvrir » (temps de lecture), **timeline numérotée 01→05** avec accroches, bloc newsletter « Débloquer la suite — La note d'équilibre » (1re brique tunnel).
- /coming-soon : page **Coming Soon standalone** (sans header/footer du site) prête pour Shopify : Coming Soon, 4 piliers courts, 8 futurs rayons (dont **Ancrage & recentrage** ajouté au catalogue), **section Cockpit** (jauge 78/100 + barres), liste d'attente email simulée, domaines zayado.net / app.zayado.net.
- /hero-choix : page interne montrant les 3 propositions d'image hero (heroDesk actuelle, heroDeskMountain, heroDeskHands).
- Catalogue : « Ancrage & recentrage » ajouté (tags landing « Pour moi » + SEO entrepreneur). Manques proposés : sommeil & récupération, alimentation & hydratation, micro-pauses & sport bureau, outils finance & tableaux, automatisation/outils numériques (SaaS), packs par profil (Repreneur, Rentrée), cartes cadeaux, box équipe, capsules/formation, programme 90 jours.
- **Tunnel d'acquisition PRO (proposé, en attente de validation)** : funnel 5 étapes (page d'angle 0 € d'apport → lead magnet « Les 4 repères » contre email → séquence 7 emails type Soap Opera → diagnostic qualifiant → appel de découverte), newsletter en fil de réengagement. À construire après validation utilisateur.

## Ajouts 2026-10-07 (v5)
- Or éclairci (#D6A64F / soft #F0DCAC) — « trop marron » corrigé, en ligne avec app.zayado.net (doré ambré clair, navy, beige).
- **Tunnels restructurés en vrai parcours** (le « chemin à suivre » du modèle utilisateur déplacé du journal vers les tunnels) : hero hook → lead magnet « À découvrir » avec capture email (Les 4 repères / Les 5 fuites de marge) → douleurs → avantages + angles (0 € d'apport, acheter > créer) → **timeline 01→05** (plan → séquence 7 emails → diagnostic → appel → accompagnement) → bloc « Débloquer la suite / Accès réservé » (newsletter) → preuve → CTA final.
- **Journal simplifié** (plus de timeline) : recherche interne, filtres avec compteurs, carte vedette, liste d'entrées (date, type, temps de lecture, auteur, extrait), newsletter.
- Page article : méta (date/type/min/auteur), partage « Copier le lien » (toast), articles liés, CTA diagnostic.
- Footer : liens **Coming soon** et **Choix du hero** ajoutés (visibles).

## Ajouts 2026-10-07 (v6) — Menu façon Kiabi + boutons
- **Header refait façon Kiabi.com** : rangée 1 en grille 3 colonnes (bouton « Menu » à gauche · logo centré · barre de recherche à droite), rangée 2 avec grandes entrées : **Marketplace (méga-menu au survol) · Box · Services · Journal · La Maison**.
- **Méga-menu Marketplace** : intro + lien « Toute la marketplace », colonnes « Pour l'entreprise » / « Pour l'entrepreneur » avec rayons et compteurs d'articles, carte navy « Box saisonnières ». Clic sur « Marketplace » = navigation vers /marketplace (le survol ouvre le menu).
- **Rayons 100 % data-driven** : `MARKETPLACE_RAYS` dérivé de PRODUCTS — **un rayon ou univers vide ne s'affiche jamais** (même logique que la règle Shopify de l'utilisateur pour la future migration Liquid).
- **Tiroir « Menu »** (desktop + mobile) : recherche, marketplace + rayons en chips, Box, Accompagnement + sous-liens tunnels (Acquérir / Optimiser), Journal, La Maison, section « En coulisses » avec le **Cockpit (secondaire uniquement, comme voulu)**. Fermeture : croix, overlay, changement de page. Rendu HORS du header (le backdrop-blur créait un containing block qui brisait le fixed — bug corrigé).
- **Boutons beige clair** : `.btn-gold` passe de l'ambre/marron (#D6A64F) à **beige clair var(--paper-2) #F6F5F2** avec texte navy, hover gold-soft — plus aucun marron sur les CTA. État :disabled uniforme.
- **Pilule complète partout** : `.field` en border-radius 999px (recherche, emails, formulaires) ; `textarea.field` garde 18px ; tous les `.btn` en 999px.
- **Page de résultats unique** : un rayon ou la recherche mène à /marketplace?q=… qui affiche « Résultats pour « … » » avec compteur, au lieu des univers aux cadres vides.
- Testé par testing agent : 100 % des comportements requis OK (desktop 1440 + mobile 390, zéro overflow, zéro erreur console, boutons beige rgb(246,245,242) confirmés sur tunnels/maison/journal/coming-soon).

## Ajouts 2026-10-09 (v7) — Header boutique, zone appli, diagnostic porté, panier, page Besoins
- **Header refait sur le modèle du site de référence** (une seule barre claire) : wordmark serif Fraunces « Zayado », liens Marketplace (méga-menu rayons) · **Le Cockpit (méga-menu : colonne Fonctionnalités + colonne Tarifs)** · Services · Journal · La Maison ; à droite **icône panier avec badge** + bouton navy **« Mon compte » → https://app.zayado.net/compte** (externe). Mobile : wordmark + panier + hamburger → tiroir complet (recherche, rayons, Cockpit, tunnels).
- **Zone appli avec header différent** : /cockpit et /diagnostic utilisent AppHeader (barre navy de l'appli, juste « Faire le diagnostic » → /marketplace ; « Explorer la marketplace » sur /diagnostic).
- **Page /cockpit refaite** dans le ciel navy de l'appli (#294174→#0a1230, Fraunces, or #DEC2A3) : hero essai 2 mois pour 1 €, 6 modules repris des pages publiques du ZIP, grille tarifs réelle (Rêveur 15 € · Solo 29 € « Le plus choisi » · Pro 69 € fondateur 49 € · Équipe 99 € · Entreprise 299 €+ sur devis), note TheSustain −20 %, paiement Mollie.
- **Diagnostic porté de l'appli et allégé** (16 questions, 2/domaine + option vie spirituelle +2) : jauge /100 animée, barres vie pro/perso, radar 8 domaines, 2 priorités avec conseils + livres, capture email/prénom → backend, CTA compte app.zayado.net + marketplace + refaire.
- **Boutique complète** : CartContext (localStorage), page /panier (quantités, suppression, total), badge compteur header, « Acheter »/« Acheter la box » → panier puis /checkout?items=a,b multi-articles, Checkout multi-lignes, PaymentResult vérifie le statut serveur (order_id).
- **Backend** : POST /api/leads (Mongo + Brevo si BREVO_API_KEY, sinon mode demo), POST /api/checkout (prix recalculés côté serveur, commande Mongo, **Mollie** si MOLLIE_API_KEY sinon simule), webhook /api/mollie/webhook, GET /api/orders/{id}/payment-status. Tous les formulaires (Journal, Coming Soon, tunnels ×2, services, diagnostic) envoient leurs leads au backend — plus aucune mention « rien n'est envoyé ».
- **Clés Brevo & Mollie** : l'utilisateur les fournira plus tard (« après ») — il suffit de les ajouter à backend/.env (BREVO_API_KEY, BREVO_LIST_ID optionnel, MOLLIE_API_KEY, FRONTEND_URL déjà présent) puis restart backend ; tout est déjà branché.
- **Page /besoins « De quoi avez-vous besoin maintenant ? »** (À VALIDER par l'utilisateur avant tout branchement navigation) : entrée par le besoin, 4 piliers (Accompagner · Piloter · Connecter · Équiper — Connecter limité aux services B2B sélectionnés et à la reprise/transmission, pas de marketplace ouverte ni de particuliers), la voie Zayado en 4 étapes avec diagnostic au centre, packs 3 niveaux (Essentiel · Pack · Parcours), Cockpit en fil continu. Non ajoutée au header/footer tant qu'elle n'est pas validée.
- **Couleurs vérifiées** (réponse à l'utilisateur) : navy vitrine #0D1F38 ≈ navy appli #0B1F3A (match) ; light vitrine (#F6F5F2/#FDFCF8) vs crème appli (#F6F1E9) — proches mais pas identiques, l'appli est plus sable ; la vitrine correspond au thème sombre de l'appli.
- Tests : agent de test itération 2 — backend 11/11 pytest, flux critiques 100 % (panier, checkout multi, diagnostic complet, méga-menus, tiroir mobile, zone appli), 1 bug critique corrigé (imports lucide Checkout), « Mon compte » masqué sur mobile (fix .btn vs .hidden → !hidden/lg:!inline-flex).

## Ajouts 2026-10-09 (v8) — Restructuration marketplace + tunnel Dotcom + box précommande
- **Le site EST la marketplace** : plus aucun bouton « Marketplace ». Header boutique à 3 barres (modèle de la capture utilisateur) : barre navy (France · EUR · livraison express offerte dès 120 € · réseaux), barre principale (logo + tagline, grande recherche « produit, catégorie, besoin » → /marketplace?q=, icônes Cockpit / Compte→app.zayado.net/compte / Favoris / Panier avec badges, pilule « Quel est mon besoin ? » → /besoins), barre catalogues : **Tout voir · Corps ⌄ · Âme ⌄ · Rituel ⌄ · ★ Promos** + Le journal · Services Pro · Partenaires — méga-menus par collection (besoins + mini-fiches). Mobile : hamburger + tiroir complet.
- **Tunnel /tunnel-home** (mode test — l'ancien accueil reste sur /, choix utilisateur) : FunnelHeader zéro distraction (logo + « Faire le diagnostic »), structure Dotcom Secrets/Launch : capture (headline douleur + 3 bénéfices + formulaire prénom/email → lead backend source tunnel-capture → /merci), méthode 3 étapes + 3 niveaux, preuve sociale (témoignages d'illustration), teaser box, CTA diagnostic.
- **Page /merci** (zone tunnel) : remerciement + double tripwire à durée limitée : **Cockpit 2 mois pour 1 € (29 €)** (lien externe app.zayado.net) + **Box entrepreneur apaisé en précommande à 49 €** (→ /box?preco=1 qui barre 59 €).
- **Marketplace refaite** « La maison de l'entrepreneur » (data/catalogue.js : 14 offres avec type produit/digital/box/service, besoin, note /10, avis vérifiés marqués « exemples », bénéfice majeur, prix + mode) : cartes modèle (badges, note, cœur favoris, BÉNÉFICE MAJEUR, Voir la fiche + CTA contextuel **Ajouter/Acheter** produits, **Activer** outils digitaux → app, **Commander** box, **Se lancer** services), filtres collections + chips besoins + recherche q (nom/desc/besoin/bénéfice), état vide avec reset. Outils Zayado ajoutés : ZAYADO Cashflow Manager 49 €/mois, Système Opérationnel Notion 4 Piliers 79 € à vie, MyExtension AI Starter 29 €/mois (exclusivité).
- **Fiches /fiche/:slug** (modèle vidéo : page produit complète) : hero SEO (titre + eyebrow), bloc douleur « Ça vous parle ? », promesse, note/avis, bénéfice majeur, CTA contextuel, bandeau garanties (livraison offerte dès 120 € / 30 jours satisfait ou remboursé / paiement sécurisé Mollie), avis d'illustration « acheteur vérifié », FAQ, newsletter, « Pour le même besoin ». **6 fiches des branches du Cockpit** (vision, radar, plan-daction, aujourd'hui, bien-être, ma-foi discret) avec douleur + titre SEO (« Retrouver le cap quand tout court après vous », « Une seule liste de choses à faire, enfin tenue »…).
- **Page /box = précommande** (contenu exact du PDF) : deadline 20 novembre 2026, seuil 30 box, remboursement intégral sans démarche, expédition ~7 décembre ; Box entrepreneur apaisé 49 € TTC (7 éléments détaillés : carnet Mon cap 2027, infusion bio conforme, bougie, micro-pause, carte rituel, carte Cockpit QR 2 mois pour 1 €, mot signé + papier de soie) ; Box équipe 39 € HT/u dès 10 box (mot du dirigeant, logo carte, carnet co-brandé dès 25, envoi direct) + formulaire devis (lead, devis 48 h) ; garanties (rétractation 14 j sauf box personnalisées) ; #EntrepreneurApaisé. Ancienne box → /box-v1.
- **Favoris** : FavProvider (localStorage), cœur sur les cartes, badge header, page /favoris.
- **Prix box-hiver unifié à 49 €** partout (content.js BOXES + backend CATALOGUE_PRIX + catalogue.js) — bug critique du test agent corrigé ; autres fixes : /box?preco=1 depuis Merci, clés React, useState manquant BoxPreco, FavProvider import, images prod-*.
- **Pages non listées mises en sous-pages « à revoir »** (rien supprimé) : /maison, /services, /besoins, /cockpit, /vision, /coming-soon, /hero-choix accessibles via footer/tiroir uniquement.
- Tests : agent itération 3 — backend 11/11 pytest, flux critiques vérifiés (tunnel→merci→tripwire, box→checkout 49 €, favoris, filtres, fiches, mobile 390 sans overflow), corrections re-vérifiées (checkout box 49 €, mobile tunnel OK).

## Vérifié (screenshots + flux cliqués)
- Desktop 1440 + mobile 390 sans overflow ; hero complet.
- Diagnostic complet (voie acquisition → reco « Acquérir » + lien Cockpit).
- Marketplace, Cockpit, checkout → paiement confirmé (récap ZYD-XXXX).

## Backlog
- P1 : routage email des leads (Resend), back-office leads, nurturing par profil.
- P1 : vrai paiement Stripe (playbook disponible) + historique de commandes.
- P2 : enrichissement catalogue, stock, codes promo, espace client.
- P3 : développement réel du Cockpit (avec IA), reconnexion diagnostic → cockpit.

## Hypothèses à challenger
- CTA dominant unique (diagnostic) sur l'accueil.
- Formulaires non stockés / non routés en V1 (notes « démo » affichées).
- Paiement simulé (choix utilisateur) ; bascule Stripe prévue.
- Contenus, prix, visuels, témoignages : placeholders réalistes.
