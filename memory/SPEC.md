# Zayado — SPEC (base fusionnée, oct. 2026)

## Règles de ton
- Application et tunnels Zayado : **tutoiement**. Restent au vouvoiement : les pages légales (CGU, CGV, mentions), les citations bibliques et les textes que les utilisateurs adressent à LEURS clients (gabarits de tunnels, page publique `/t/…`).
- Couleurs : fond de l'appli = dégradé `--zy-fond` (#294174 → #0a1230), bleu uni = #294174, boutons pleins sur fond bleu = crème du site #F4EFE6 (classes `bg-gold`, `btn-champagne`, `btn-gold` repeintes dans index.css) ; mode clair (`body.theme-clair`) = page d'accueil du site : papier ligné, boutons bleu en dégradé (#0D1F38 → #2E4A6B). Pages publiques : classes `site`, `site-ruled`, `site-stamp`, `site-hand`, `site-btn-primary` (index.css) et `LogoSite` (pages/tunnel/TunnelZayado.tsx). Aucun jaune dans l'appli.
- Style : l'application est en bleu nuit. Les tunnels publics de Zayado gardent le style de la landing : papier `#FDFCF8`, marine `#0D1F38`, or `#D6A64F`, Fraunces + Poppins.

## Origine du code
- **Base = zip « Reactzayado-autre »**, qui contient déjà la fusion VisionAct + version déployée, et ses correctifs du 07/10. On y a ajouté `WhatsApp-service/` et `Zayado-Dossier-SaaS/` (docs), repris de « new-main ».
- Le site **Zayado Entreprise** (zip `Zayado-Entreprise-main`, en CRA) est construit à part (`vitrine-entreprise/`). Il est servi en statique à `/public/entreprise/index.html#/…` (HashRouter, `noindex`).
- La maquette de l'itération 1 est sauvegardée dans `/tmp/maquette` (non utilisée).

## Stack
- Backend : FastAPI + **SQLAlchemy async**. SQLite en local (`/app/backend/zayado_local.db`), PostgreSQL sur Railway via `DATABASE_URL`.
- Auth JWT : `POST /api/auth/login` renvoie `access_token`, puis `Authorization: Bearer`. Un middleware renvoie 401 hors des routes publiques.
- Les modules ajoutés vivent dans `backend/routers/*`, montés sous `/api/copilote/*` : vision, plan, radar, pilotage, tunnels. SheetFlow (`/api/sources`, `/api/pages`) est stocké dans la table SQL `documents` (`lib/db.py`).
- Frontend : Vite + React + TypeScript (`src/pages/copilote/*`, `src/pages/zayado/Tunnels`, SheetFlow). Les pages déployées en JSX sont dans `src/zy/*`.
- IA : `_client_llm`. Mammouth en priorité si `MAMMOTH_API_KEY` est défini, sinon la clé Emergent avec `claude-sonnet-5-5` (streaming SSE `/api/copilote/chat`).
- Paiement : Mollie (`commerce_ext.py`), avec `/api/checkout`, `/api/commerce/checkout` et `/api/mollie/webhook`. **Pas de clé en local : le paiement est inactif ici.**

## Routes principales du frontend
`/login` · `/` (Accueil « Ton cercle ») · `/plan-action` · `/radar` · `/pilotage` · `/tunnels`, `/tunnels/:id` · `/vision-board` · `/t/:slug` (tunnel publié, public) · `/public/tunnel`, `/public/reprise`, `/public/cession` (tunnels Zayado, publics) · `/admin` (avec l'onglet « Site Entreprise & espaces cachés ») · `/entreprise` (menu façon Admin, SheetFlow intégré) · `/entreprise/sheetflow/*` · `/app/*` (pages déployées) · `/pricing`.

## Offres
Codes : `essentielle` (aucune offre), `reveur` (Rêveur, 15 € TTC), `serenite` (Solo, 29 € HT, fondateur 24 €), `pro` (Pro, 69 € HT, fondateur 49 €), `business` (Équipe, 99 €), `entreprise` (sur devis, à partir de 299 €).
Essais : Rêveur gratuit `ESSAI_REVEUR_JOURS` = 30 jours, Solo à `ESSAI_PRIX` = 1 € pendant `ESSAI_JOURS` = 60 jours (« 2 mois pour 1 € »). Détail des droits : `FONCTIONNALITES-PAR-OFFRE.md`.

## Espace vendeur façon Dokan — `backend/vendeur_dokan_ext.py` + `frontend/src/zy/components/vendeur/VendeurDokan.jsx`
- `/espace-vendeur` (menu SideMenuPro) : **Tableau de bord** (CA payé, commission, net, reversé, en cours, solde disponible, ventes par mois, alerte de stock bas avec seuil réglable) · Mes produits (+ **Dupliquer**, **Mettre en pause** / **Remettre en vente**, statut `pause`) · Commandes (+ **suivi** préparée / expédiée avec n° obligatoire / livrée, table `vendeur_suivis`) · **Reversements** (IBAN validé mod 97 et **chiffré** via `_chiffrer`, demande ≤ solde disponible).
- Admin › « Vendeurs : commission & reversements » : taux global (15 % par défaut, `vendeur_parametres.commission_defaut`), taux négocié par vendeur, tableau des soldes, reversements demandé → validé → payé (ou refusé avec motif obligatoire). L'IBAN est en clair pour l'admin uniquement, tant que le reversement est en cours.
- Chiffres : uniquement les `ShopifyOrder` du vendeur avec `financial_status` paid/partially_refunded. Commission FIGÉE par vente (table `vendeur_commissions_ventes`, au passage à « payée » via le hook `on_vente_vendeur` de la synchro Shopify ; les ventes antérieures sont figées au premier calcul). La pause et la reprise basculent le produit Shopify en DRAFT/ACTIVE (`productUpdate`, `g["_shopify_graphql"]`). Notifications cloche + push (`g["notifier"]`, kind `vendeur`) : nouvelle vente, stock bas (dédoublonné par produit et niveau de stock), reversement payé ou refusé. Relevé PDF mensuel : `GET /api/vendeur/releve.pdf?mois=AAAA-MM`.
- API : `/api/vendeur/{tableau-de-bord, seuil-stock, iban, reversements, suivis, commandes/{id}/suivi, produits/{id}/dupliquer|pause|reprendre}`, `/api/admin/vendeurs/{finances, commission, {uid}/commission, reversements, reversements/{id}/{valider|payer|refuser}}`.

## Tunnel Zayado (RÉEL) — `backend/tunnel_zayado_ext.py` + `frontend/src/pages/tunnel/`
- Pages publiques (la page de capture est référencée, les étapes suivantes sont en noindex) : `/public/tunnel` (capture : prénom, e-mail, situation, priorité, consentement) → `/public/tunnel/merci?p=` (premier pas + tripwire **Kit Diagnostic Flash 27 €** + essai Solo en lien secondaire) → Mollie → `/public/tunnel/fast-track?commande=` (upsell **Fast-Track 97 €** en un clic, ou « Non merci ») → `/public/tunnel/confirmation?commande=` → `/public/tunnel/kit?commande=` (dépôt FEC → analyse + PDF).
- API publique `/api/tunnel-zayado/*` : offres, capture, prospect/{id}, kit/commande, commande/{id}, fast-track/{id}/accepter|refuser, kit/{id}/analyse (POST fichier / GET), kit/{id}/rapport.pdf.
- Mollie : Kit = `sequenceType first` + `method creditcard` (crée le mandat, consentement affiché) ; Fast-Track = `recurring` + `mandateId` si le mandat est `valid`, sinon un checkout classique. Le double clic ne débite jamais deux fois. Les statuts passent par le webhook existant `/api/mollie/webhook` (CommerceOrder, kinds `tunnel_kit` / `tunnel_fasttrack`, visibles dans Admin › Commerce).
- **SIMULATION** uniquement si `MOLLIE_API_KEY` est absente ET `ENV=local` (badge rouge « Paiement simulé »). Jamais en production.
- Table `tunnel_prospects`. Prix : `TUNNEL_KIT_PRIX`, `TUNNEL_FAST_TRACK_PRIX`, `TUNNEL_SOLO_PRIX`. Lien de rendez-vous : `TUNNEL_RDV_URL` (sinon le message « on t'écrit »).
- Pas de témoignages, pas de prix barrés, pas de fausse urgence (« réservé aux nouveaux inscrits »).

## Étape précédente (faite)
Le **vrai tunnel Zayado**, sans faux tunnel, en s'inspirant du site Entreprise :
capture (diagnostic) → merci + tripwire → vente (Mollie existant) → upsell Fast-Track, avec les ventes qui remontent au Pilotage.

## Déploiement
Voir `/app/DEPLOIEMENT-RAILWAY.md`. Railway, base de production non touchée.

## Espace Entreprise — /entreprise
- Adresse unique `/entreprise` (+ `/entreprise/rejoindre`, `/entreprise/sheetflow`). Les anciennes adresses `/app/entreprise*` redirigent (query/hash conservés).
- Accès : compte connecté ; activation réservée offres Équipe/Entreprise ou admin (backend 402 sinon) ; les membres invités d'une entreprise active y accèdent. Sinon écran « ent-acces-reserve » + lien /pricing.
- Thème clair : `.pro-clair .text-white*` repassé en navy (hors menu latéral/en-tête mobile) ; contenu aligné à gauche à côté du menu.

## Espace Entreprise × SheetFlow (unifié) — /entreprise
- Bases réelles de l'entreprise : Google Sheets (API Sheets v4), Excel OneDrive (Graph workbook), Microsoft Lists (Graph sites/lists — nécessite l'autorisation « Sites » accordée par l'admin M365). Jeton cloud = celui du dirigeant (Organisation.owner_id). Plus AUCUNE donnée simulée (lib/demo_data.py, routers/sources.py, routers/pages.py supprimés).
- Backend : backend/entreprise_sheet_ext.py + backend/fournisseurs_sheet.py ; modèles backend/models/workspace.py ↔ frontend/src/lib/types.ts. Stockage table documents (collections esp_sources, esp_cache (60 s), esp_pages, esp_params, esp_commentaires, esp_chronos), clé user_id = org_id.
- API : /sources (+connect, sync, rows CRUD, commentaires), /pages, /modeles (+installer), /espace/parametres, /espace/aujourdhui, /espace/chrono (demarrer/arreter/annuler).
- Modèles : Planning (calendrier), Absences (calendrier), Temps (chronomètre), Pièces (kanban), Équipe (cartes), Projets (frise). Installer = crée l'onglet si absent et y envoie une fois les données Zayado existantes (EntPlanning, EntAbsence, EntTemps, EntPiece, EntMembre).
- Vues : table, cards, kanban, calendar, timeline, chrono, form, dashboard. Aperçu de vue à la volée ; « Garder pour l'équipe » (gérants) l'enregistre.
- Commentaires par ligne avec réponses (RowDialog) + notification aux gérants et participants.
- Chronomètre unique ; libellé (Ticket, Mission, Prestation…) réglé dans Bases & pages ; à l'arrêt une ligne est écrite dans l'onglet Temps.
- Droits : tous les membres lisent/commentent/chronomètrent ; écriture lignes : proprietaire/manager/membre/prestataire ; sources/pages/modèles/réglages : proprietaire/manager.
- Menu : Quotidien (Aujourd'hui + pages du classeur ; les sections natives Planning/Absences/Temps/Pièces disparaissent quand leur modèle est installé), Équipe, Outils (Assistant, Bases & pages, Réglages). /entreprise/sheetflow/* → /entreprise?vue=bases.
- TEST UNIQUEMENT : ESPACE_FOURNISSEUR_TEST=1 (backend/.env local) active un fournisseur « test » (classeur rangé en base). Ne jamais le définir en production.

## Correctifs oct. 2026
- Tunnels : à la création, l'IA rédige tout le tunnel (pages + offre + upsell + downsell) automatiquement (/tunnels/:id?ia=1) ; preuves, prix et rareté restent à l'utilisateur ; les champs détaillés sont repliés (« Ajuster… »).
- Vision board : image IA (adresse relative /api/vision/images/…) maintenant acceptée et ajoutée même si le menu se ferme (toast de suivi) ; doublons de boards perso/pro supprimés ; menu « Mes boards » opaque.

## Le cercle automatique — `backend/routers/cercle.py`
- Pilotage → objectif du mois : chaque import recalcule le point mort et écrit « Signer N clients ce mois » (Plan d'action, module Pilotage) et l'objectif du Radar. Un prospect passé à « signé » fait avancer le compteur.
- « Prendre » un signal au Radar crée les actions datées selon le type de signal. Pour une entreprise : contact J0, relance J+5, relance J+12. Les autres types (demande, sujet, bassin, prescripteur) ont leur propre séquence.
- `POST /api/copilote/tunnels/auto` crée un tunnel en un clic :
  - sujet = offre du profil, sinon mots-clés du Radar, sinon cap à 3 ans ;
  - parcours rendez-vous si la clientèle est faite d'entreprises, produit sinon ;
  - prix calés sur le panier moyen.
- `GET /api/copilote/cercle` renvoie les 5 étapes et la prochaine proposition. Elle s'affiche sur l'Accueil et dans l'onglet « À faire » de la cloche.

## Publication des tunnels utilisateurs — `backend/routers/tunnels_publics.py`
- **Mentions de l'éditeur** (`GET/PUT /api/copilote/editeur`) : raison sociale, SIREN, adresse et e-mail sont obligatoires pour publier. La forme juridique, le téléphone, le responsable, la TVA et le médiateur sont facultatifs. Ces informations s'affichent dans les mentions légales et la politique de confidentialité de chaque page publique de l'utilisateur.
- **Référencement** (`PUT /tunnels/{id}/seo`) :
  - titre (70 caractères), description (170 caractères) ;
  - image de partage en JPG, PNG ou WebP, 3 Mo maximum (`POST /tunnels/images`, servie par `/api/public/t-img/{id}`).
- **Publier** (`POST /tunnels/{id}/publier`) :
  - refusé (422) tant que les mentions sont incomplètes ;
  - crée l'adresse `/t/{slug}` (collection `tunnels_publics`) et met le tunnel en ligne ;
  - passer un tunnel « en ligne » sans publication renvoie une erreur 409.
- **Public** :
  - `GET /api/public/t/{slug}` renvoie le tunnel ;
  - `POST /api/public/t/{slug}/contact` enregistre le contact (intention : capture, tripwire, commande, upsell, downsell ou rendez-vous). Le contact devient une demande entrante dans le Radar du propriétaire. Une même personne reste UN contact, et ses demandes s'additionnent ;
  - `GET /api/public/t/{slug}/partage` renvoie une page avec balises Open Graph, pour les aperçus WhatsApp, LinkedIn et Facebook, puis redirige.
- **Page `/t/:slug`** (`TunnelPublic.tsx`) :
  - enchaînement capture → remerciement → vente → option → version allégée → fin ;
  - l'option prévue « pendant l'appel » n'est jamais montrée au prospect ;
  - « Aucun paiement maintenant » : le paiement en ligne des tunnels utilisateurs arrive en phase 2.
- **Mentions légales de Zayado** :
  - modifiables par un admin dans Admin › Pages & Traductions (`PUT /api/copilote/admin/legal-zayado`) ;
  - lues par `/legal/*` via `GET /api/public/legal-zayado` ;
  - un champ vide garde le texte par défaut.

## Tunnels Zayado « Créer ou reprendre » et « Céder » — `frontend/src/pages/tunnel/TunnelReprise.tsx`
- `/public/reprise` : capture avec un test en 4 questions, qui donne le profil reprendre / créer / les deux. Argument central : racheter une entreprise rentable avec peu ou pas d'apport (prêt bancaire adossé aux chiffres de la cible, prêt d'honneur, crédit-vendeur).
- `/public/reprise/rdv` : résultat + guide (`REPRISE_GUIDE_URL`, sinon envoi par e-mail) + **appel stratégique gratuit de 30 minutes**. La réservation passe par `TUNNEL_RDV_URL`, sinon par une demande de rappel (`POST /api/tunnel-zayado/reprise/rdv`, stockée dans `tunnel_prospects.reponses.rdv`).
- `/public/reprise/merci` : upsell post-réservation, le Kit Diagnostic Flash. Après paiement : confirmation directe, sans Fast-Track.
- `/public/cession` : branche cédant, même suite (rdv → merci).
- **Aucun prix d'accompagnement** sur ces pages. L'accompagnement se propose pendant l'appel.
- Aperçus de partage : `/api/public/partage/{reprise|cession|diagnostic}` (images `public/og/*.png`). `robots.txt` et `sitemap.xml` n'ouvrent que les pages d'entrée.

## En-tête, cloche et chat
- `Header variante="actions"` est utilisé dans la barre haute des pages récentes : check-in, chat, cloche.
- La cloche a trois onglets : À faire (cercle, décisions, check-in, revue, série, vision), Nouveau, Actualités (point du matin et actus).
- `GlobalChat` est monté sur toutes les pages connectées.

## Accès par offre
- `AccesGate` est monté dans `App.tsx` (`GardeAcces`) :
  - sans offre active, `/`, `/pilotage`, `/plan-action`, `/radar`, `/tunnels`, `/vision-board`, `/app/*`… renvoient vers l'onboarding ou `/activer` ;
  - une page au-dessus de l'offre renvoie vers `/app/debloquer` ;
  - les paramètres, le compte et les pages publiques restent ouverts.

## Notifications
- Référence complète : `NOTIFICATIONS.md`.
- `main.tsx` enregistre `/sw.js` et ajoute le jeton à tous les `fetch('/api…')`.
- `App.tsx` › `GardeAcces` monte `AccesGate`, `AutoPush` (abonnement push automatique, clic sur une notification → bonne page) et `InstallBanner`, sauf sur les pages publiques.
- Depuis les routeurs du Copilote, une notification s'envoie avec `lib/notifs.notifier(user_id, kind, titre, corps, url, cle)` : cloche + push, sans jamais lever d'erreur.

## Correctifs agent conservés par-dessus la v10 (13/10/2026) — à reporter dans ta copie
- espace.js (jeton /espace/moi) · lib/fec.py + routers/pilotage.py (relevés bancaires, solde → trésorerie) · xlrd==2.0.1
- lib/db.py `_json_sur()` (dates → ISO, plus de 500) · routers/vision.py (check-in énergie en ISO)
- Onboarding → chat : `POST /api/copilote/bienvenue` (server.py) écrit UNE fois le 1er message du Copilote
  (prénom, activité/offre, vision, 3 premiers pas selon l'état réel : chiffres importés ? zone Radar ? tunnel),
  IA (Mammouth/Emergent) avec repli local. Appelé par ChatAssistant.jsx quand l'historique est vide.
- États vides corrigés : Radar « Ton objectif du mois arrive avec tes chiffres » (au lieu de « atteint 0/0 »),
  Plan « Ta première action t'attend… » (au lieu de « Tout est fait »), jauge énergie « après ton 1er check-in » (au lieu de 0/100).

## Paiement en ligne des tunnels + commission Zayado (routers/paiements_tunnels.py)
- Créateur : Tunnels › carte « Paiement en ligne de tes tunnels » (+ onglet Paiements du tunnel) : interrupteur, relier Mollie (Connect), IBAN de reversement, totaux, ventes.
- Public : /t/{slug} → boutons « Oui » = POST /api/public/t/{slug}/payer → Mollie checkout → retour /t/{slug}?paiement={id} (GET …/paiement/{id}, webhook /api/public/t-paiement/webhook).
- Modes : connect (compte Mollie du créateur, applicationFee = commission) > centralise (MOLLIE_API_KEY, net à reverser) > simulation (ENV=local sans clé).
- Commission : Rêveur/sans offre 10 % max 49 €, Solo 5 % max 29 €, Pro+ 0 % (COMMISSION_TUNNELS).
- Admin : onglet « Tunnels : paiements & commission » (GET /api/admin/paiements-tunnels, POST …/{owner}/reverser).
- Docs : collections tunnel_paiements, tunnel_paiement_reglages (IBAN chiffré), mollie_connect (jetons chiffrés).
- Shopify : page Liens sur fond blanc (palette vitrine), lien « Journal » (/blogs/journal).

## Admin › Tunnels : personnaliser (routers/admin_tunnels.py, frontend pages/zayado/AdminTunnels.tsx)
- Liste de tous les tunnels utilisateurs (toutes offres) → éditeur : pages (titre, accroche, contenu, bouton, offre, prix), option/version allégée, SEO, Code (head, css, html_haut, html_bas, js — injectés sur /t/{slug} via pages/tunnel/CodeTunnel.tsx, scripts exécutés).
- Modèles préparamétrés par parcours (produit / rendez_vous) avec {sujet} {metier} : utilisés à la création de tout nouveau tunnel (collection tunnel_modeles). « Modèle d'origine » = suppression de la surcharge.
- Mollie Connect : MOLLIE_CLIENT_ID / MOLLIE_CLIENT_SECRET dans backend/.env ; MOLLIE_CONNECT_REDIRECT doit égaler l'URL de redirection de l'app Mollie (défaut {PUBLIC_FRONTEND_URL}/api/mollie/connect/retour).

## Ajouts (oct. 2026)
- Nom de l'appli : « Vision-Act par Zayado » (menu, titre, PWA). Logo appli = emblème doré transparent (/logo.png + icônes PWA/favicons).
- E-mails de paiement tunnel (paiements_tunnels.envoyer_emails_paiement) : acheteur (aux couleurs du vendeur) + vendeur (montant, commission, net) via server.send_email (Brevo) ; jamais bloquant ; flag emails_envoyes.
- Bibliothèque de blocs de code (frontend pages/zayado/blocsCode.ts) dans Admin › Tunnels › Code : Meta Pixel, GA4, TikTok, compte à rebours, témoignages, garantie, bandeau promo, vidéo, WhatsApp, Calendly.
- Modèles de tunnel par douleur client (routers/tunnels_douleurs.py, GET /api/copilote/tunnels-douleurs ; TunnelIn.douleur) : temps, prix, peur, resultats, debordement, commencer.
- Partenaires « reprise sans apport » (routers/partenaires_financement.py) : 25 préremplis, Admin › « Partenaires reprise sans apport » (CRUD, visible/masqué), liste publique sur /public/reprise/merci.
- Shopify : Zayado ne fait PAS de cession → produit « Céder » et carte « Transmission » retirés ; douleur = « créer de zéro / pas d'apport » → reprise sans apport accompagnée.
- Entreprise : écran « Démarrage » (pages/entreprise/DemarrageEntreprise.tsx) tant qu'aucun classeur n'est relié (patron) : 1) relier base Google Sheets / Excel / Microsoft Lists (guide par fournisseur + ConnectSource), 2) pages prêtes à l'emploi, 3) inviter l'équipe. Menu réduit pendant le démarrage ; option « sans classeur » (localStorage zy-ent-sans-classeur-{orgId}). Avant activation : menu « Créer mon espace » seul + 4 étapes expliquées. Guide : /app/GUIDE-ESPACE-ENTREPRISE.md + étape dans GuidedTour.
- Menu mobile : favoris (3 max, localStorage zy-menu-favoris, mode « Modifier »), glisser vers le bas pour fermer (poignée/en-tête).
- Cession retirée de l'app : /public/cession → /public/reprise, plus de « Mon client cède », section « Reprise d'entreprise ».
- Livraison : /app/Zayado-fichiers-corriges.zip = fichiers modifiés/ajoutés depuis Zayado-v10 + LISTE-DES-FICHIERS.txt.
- Accueil : carte Vision (CarrouselBoard) placée avant le check-in énergie ; plus de hauteur fixe vide sans image.
- Menu avatar : court (Mon compte, Réglages, thème, Visite, admin, déconnexion) — plus de « Autres outils ».
- Menu mobile : groupe « Compte » retiré ; carte « Mon compte » en tête ; thème + déconnexion dans Mon compte.
- Mon compte = hub « Mes univers Zayado » : Cockpit Vision-Act / Boutique / Services, puis « Mes autres espaces » (entreprise, RH, vendeur, admin) si présents.
- Connexion : redirection vers le cockpit « / » (vendeur sans offre active → /espace-vendeur).
- Espace vendeur : carte « Ouvre ta boutique en 4 étapes » (profil, IBAN, 1er produit, publié) + « Comment je suis payé ? » (pas de compte Mollie : reversement sur IBAN).
- Compte démo vendeur : test.vendeur@zayado.net / Test!2026 (rôle vendeur, offre essentielle) → /espace-vendeur après connexion. Étape 4 « publié » nécessite SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_TOKEN (prod).
- E-mail de bienvenue vendeur (server.email_bienvenue_vendeur) envoyé quand l'admin passe un compte en « vendeur » (PATCH /api/admin/utilisateurs/{id}/role) ; réponse contient email_bienvenue (bool).
- Menu mobile « Modifier » : étoile = favori (3 max), œil = masquer (localStorage zy-menu-masquees) ; pages masquées visibles en recherche ; bouton « N pages masquées · Tout afficher ».
