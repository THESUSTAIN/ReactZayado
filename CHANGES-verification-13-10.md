# Corrections du 13 octobre 2026 (suite à la vérification page par page)

## Bloquants corrigés
- **Menu complet** : le menu de l'avatar (ordinateur) et le bouton « Plus » (mobile) donnent accès à toutes les pages, et la déconnexion est disponible. La barre de recherche trouve une page (⌘K / Ctrl+K). Le bouton Paramètres de la barre latérale ouvre /parametres. « Console admin » n'apparaît plus que pour les admins.
- **Offre sécurisée** : l'offre du Copilote (limites des tunnels, séquences de lancement) vient désormais de l'abonnement payé. `PATCH /api/copilote/profil/offre` est réservé aux admins (aperçu, stocké à part dans `offre_test`), et le sélecteur d'offre n'apparaît que pour eux.
- **/embed/tarifs** est rétabli (ainsi que /embed/exercice/:slug et /embed/confidentialite). nginx autorisait déjà Shopify et Instant.

## Pages
- Les pages du nouveau zip sont conservées telles quelles : le Vision Board (avec les Idées dans le tiroir Élan), le Radar et le Plan d'action (processus compris). Aucune ancienne version n'est remise.
- Seules les adresses mortes sont rétablies : **/embed/tarifs** (iframe), **/partenaires/thesustain** (lien de la grille tarifaire) et les pages légales.

## Corrections par page
- **Accueil** : « Rapport financier » ouvre Pilotage, « Reporter » reporte la priorité à demain (nouvelle route `PATCH /api/copilote/plan-action/{id}/reporter`) et « Copilote » ouvre les Agents. L'accueil affiche un état de chargement et des messages d'erreur, et l'offre vient de l'abonnement réel.
- **Plan d'action** : formulaires pour créer un objectif et un processus (les processus restent dans le Plan d'action), confirmation avant de retirer une action, messages d'erreur.
- **Radar** (celui du nouveau zip) : bouton « changer » de clientèle, « Saisir un prospect » (nouvelle route `POST /api/copilote/radar/prospects`) et confirmations avant « Écarter » et « Opposition ». Le changement de mode ne se fait plus pendant l'affichage.
- **Pilotage** : 10 Mo maximum par fichier (vérifié aussi côté serveur, erreur 413), confirmation avant de retirer un import, état de chargement.
- **Tunnels** : le bandeau « limite atteinte » propose « Passer à l'offre supérieure ».
- **Essai** : partout « 2 mois pour 1 € » (FAQ corrigée, défaut du tunnel public aligné sur 60 jours).
- **Connexion** : plus de mention emergentagent, ajout d'un lien « Mot de passe oublié ? », qui envoie un lien de connexion par e-mail, et du lien vers les CGU.
- **Mon compte** : le design Zayado (sombre) est utilisé par défaut ; la référence à une enseigne est retirée.
- **Paiement réussi** : la page vérifie l'abonnement auprès du serveur avant d'afficher « actif ». Elle affiche le nom de l'offre et la date du prochain prélèvement, et propose de réessayer en cas d'échec.
- **Achat** : l'e-mail du compte est pré-rempli et « Prix en cours » s'affiche quand le montant est à 0.
- **Ton entreprise** : `Kit-installation-ZayadoRH.zip` et `microsoft/Listes-import.zip` sont créés dans `public/kits/`.
- **Admin** : les liens vers les pages supprimées sont retirés de « Pages & Traductions », qui liste désormais les pages légales, le tunnel et le partenariat. L'onglet « Compte démo » n'apparaît plus qu'en local.
- **Vision partagée /v/:token** : la page n'est plus indexée par les moteurs de recherche et affiche un bouton « Créer mon Vision Board avec Zayado ». Rejoindre, Liaison et Connexion externe ne sont plus indexées non plus.
- **Tunnel public** : le lien vers la politique de confidentialité figure à côté de la case de consentement.
- **Barre latérale des anciennes pages** : Pilotage et Tunnels y sont ajoutés, Élan ouvre le tiroir Idées du Vision Board, et les liens pointent vers les nouvelles adresses.

## Légal
- Nouvelles pages **/legal/mentions-legales**, **/legal/cgu** et **/legal/cgv**, liées dans le pied de page des pages publiques.
  ⚠ À compléter avant le lancement : siège, RCS/SIREN, capital, directeur de la publication, médiateur de la consommation, adresses des hébergeurs. Faire relire par un juriste.
- La politique de confidentialité liste désormais tous les sous-traitants : Railway, Shopify, Qonto, WhatsApp/Telegram, HeyGen et Unsplash.

## Technique
- `package.json` : les deux paquets Emergent (téléchargés depuis assets.emergent.sh) sont retirés. `vite.config.ts` les charge s'ils sont installés à la main, sinon il s'en passe.
- `index.html` : description réécrite, ajout du manifeste et de theme-color (nécessaires pour « Partager vers Zayado » depuis un téléphone).
- `requirements.txt` : **non modifié** (règle du projet). `emergentintegrations` y figure toujours ; à retirer seulement après accord.

## Non fait (décision ou gros chantier)
- Harmonisation tutoiement / vouvoiement sur toute l'appli (plus de 1 000 occurrences) : choisir une règle d'abord.
- Découpage des très grosses pages (Entreprise, Bien-être, Ma foi, Onboarding) et écran d'accueil « sans entreprise ».
- Fonctions nouvelles proposées dans le document (export PDF, modèles de tunnels, statistiques, double authentification admin, etc.).

---

# Le cercle automatique (13 octobre, suite)

Repris des notes `memory/SPEC.md`, `plan/plan.md` et `plan/radar.md` (zip app-main) :
« Pilotage dit combien → Radar dit qui ou quoi → Plan d'action engage → Bien-être plafonne → Aujourd'hui exécute → Tunnel convertit → Pilotage recalcule ».

- **Pilotage → objectif du mois (nouveau, automatique).** À chaque import ou retrait de fichier, le point mort réel donne « N clients ce mois ». Ce chiffre est écrit pour le Radar, qui l'affichait jusque-là toujours vide faute d'écriture. Il devient aussi l'objectif « Signer N clients ce mois » du Plan d'action, marqué Pilotage. Le compteur « signés » avance tout seul quand un prospect passe à « signé » au Radar.
- **« Prendre » au Radar selon le type de signal** (`plan/radar.md`) :
  - entreprise : prospect + 3 actions datées (contact J0, relance J+5, relance J+12) ;
  - demande entrante : prospect + réponse le jour même ;
  - sujet qui monte : « Créer le tunnel sur ce sujet » en un clic, ou « publier un contenu » ;
  - bassin : reprise de contact, puis demande d'avis (J+3), puis demande de recommandation (J+7) ;
  - prescripteur : proposition de partenariat avec réciprocité, puis relance à J+10.
- **Tunnel en un clic** (`POST /api/copilote/tunnels/auto`). Il reprend les gabarits existants (4 pages, 3 modèles d'upsell, séquence de lancement) :
  - sujet tiré de l'offre du profil, sinon des mots-clés du Radar, sinon du cap à 3 ans ;
  - parcours « rendez-vous » si la clientèle est faite d'entreprises, « produit » sinon ;
  - pages rédigées par l'IA (gabarit si l'IA est indisponible) ;
  - prix calés sur le panier moyen réel : offre = panier, tripwire environ 10 %, option environ 30 %. Sans panier connu, les champs restent vides ;
  - ajoute une seule action au Plan d'action : « Relire et publier le tunnel ».
  Le bouton est sur l'Accueil, dans Tunnels et au Radar (signaux « sujet »).
- **Carte « Votre cercle » sur l'Accueil** (`GET /api/copilote/cercle`). Elle montre les 5 étapes (Pilotage, Radar, Plan d'action, Tunnel, Clients signés) avec leur état réel, et la prochaine étape utile en un clic : importer ses chiffres, créer le tunnel, relire et publier, trier les signaux, programmer le lancement quand le pipeline est trop court pour l'objectif.
- **Retiré** : les formulaires manuels « nouvel objectif » et « nouveau processus » du Plan d'action, que j'avais ajoutés et qui contournaient le cercle. La saisie manuelle d'un prospect reste au Radar comme porte de secours, prévue par la spécification.
- **Onboarding** : nouvelle question « Ce que tu vends, en quelques mots » (étape Activité), enregistrée dans le profil (modifiable dans Paramètres › Mon Copilote). Le premier tunnel se crée donc en un clic, sans question supplémentaire. La clientèle choisie à l'onboarding (particuliers / pros / les deux) règle le parcours du tunnel tant que le Radar n'a pas son propre réglage.

---

# v6 — En-tête, tunnels publiés, Reprise / Cession, tutoiement, nettoyage (13 octobre, fin de journée)

## En-tête, notifications et chat
- Le même en-tête est affiché partout : check-in, messages (chat) et cloche, sur les pages récentes comme sur les anciennes.
- La cloche a trois onglets :
  - **À faire** : propositions du cercle, décisions, check-in, revue ;
  - **Nouveau** ;
  - **Actualités** : le point du matin et les actualités sont revenus.
- Le chat n'était monté sur aucune page (bug). Il l'est maintenant sur toutes les pages connectées.
- « Tunnels » sort du rail latéral. On y accède par le menu de l'avatar et par l'Accueil.

## Tunnels des utilisateurs : publication propre
- **Mentions de l'entreprise de l'utilisateur** : raison sociale, SIREN, adresse et e-mail sont obligatoires pour publier. TVA, médiateur et responsable sont facultatifs. Elles s'affichent sur ses pages publiques (mentions légales et confidentialité). Zayado n'y apparaît que comme prestataire technique.
- **Référencement** : titre, description et image de partage (1200×630 conseillé). Un lien « avec aperçu » s'affiche joliment sur WhatsApp, LinkedIn et Facebook.
- **Publication** :
  - adresse publique `/t/nom-du-tunnel` ;
  - refusée tant que les mentions manquent ;
  - le bouton « Valider et déployer » publie vraiment.
- **Page publique** : capture → remerciement → vente → option → version allégée → fin.
  - Chaque « oui » devient une demande dans le Radar.
  - Une même personne reste un seul contact, et ses demandes s'additionnent (commande · option).
  - « Aucun paiement maintenant » : le paiement en ligne est prévu en phase 2.
- **Textes de départ plus propres** quand l'IA est indisponible : plus de consignes du type « Promesse, argumentaire… » visibles par les clients.
- Le texte de refus de l'option est corrigé (« je m'en tiens à mon rendez-vous de base »).
- L'option « pendant l'appel » n'est plus affichée au prospect.
- Tout reste modifiable dans le détail du tunnel : chaque page, l'offre (résultat, preuve, délai, effort, bonus, garantie, rareté), l'option et la version allégée.

## Tunnels de Zayado
- **Diagnostic** (`/public/tunnel`) : style de la landing conservé, tutoiement, prix Solo corrigé (1 € pendant 2 mois, puis tarif fondateur). `/diagnostic` redirige ici (il n'y a plus de doublon).
- **Nouveau : « Créer ou reprendre ? »** (`/public/reprise`), sur les mots-clés et les douleurs de ceux qui veulent créer, alors que racheter est souvent plus sûr :
  - test en 4 questions ;
  - guide ;
  - appel stratégique gratuit ;
  - upsell post-réservation « Kit Diagnostic Flash ».
  Aucun prix d'accompagnement n'est affiché. L'argument « peu ou pas d'apport » s'appuie sur le prêt bancaire adossé aux chiffres de la cible, le prêt d'honneur et le crédit-vendeur.
- **Nouveau : branche cédant** (`/public/cession`) : vendre son entreprise au bon prix.
- Les images de partage, `robots.txt` (pages d'entrée seulement) et `sitemap.xml` sont ajoutés.
- Les liens de partage avec aperçu sont dans Admin › Pages & Traductions.

## Admin
- **Inscrits des tunnels Zayado** (Admin › Pages & Traductions) : diagnostic, reprise et cession, avec un filtre « Appels à rappeler » (téléphone, créneau, projet). Avant, ces demandes étaient enregistrées mais visibles nulle part.

## Pages légales de Zayado
- Siège, RCS/SIREN, capital, directeur de la publication, médiateur et hébergeurs se remplissent dans **Admin › Pages & Traductions › Mentions légales de Zayado**, sans toucher au code.

## Accès par offre (corrigé)
- La garde d'accès n'était plus montée dans la nouvelle application : un compte sans offre voyait tout. Elle est rétablie, et couvre aussi les nouvelles pages (Accueil, Pilotage, Plan d'action, Radar, Tunnels, Vision Board).
- Sans offre : renvoi vers l'onboarding ou `/activer`.
- Module au-dessus de l'offre : renvoi vers « Débloquer ».
- Le rappel des prix dans le Copilote est aligné sur la grille (Rêveur 15 €, Solo 29 €/24 €, Pro 69 €/49 €). La grille Tarifs mentionne désormais les tunnels publiés et la séquence de lancement.

## Ton
- **Tutoiement** dans toute l'application et dans les tunnels de Zayado.
- Le vouvoiement reste dans les pages légales, les citations bibliques et les textes que les utilisateurs adressent à leurs propres clients.

## Nettoyage
- **Pages et composants jamais affichés retirés** :
  - anciennes pages Cockpit, Landing, Mockup, Roadmap, Hub, MonEspace, Reprise, Radar et Actions ;
  - pages marketing ;
  - environ 30 composants orphelins.
- **Maquettes et captures retirées de `public/`** (environ 14 Mo).
- `public/index.html` (reste de CRA), `TEMPLATE.md`, `.emergent/` et les `__pycache__` sont supprimés.
- Le fichier `Kit-installation-ZayadoRH-Google.zip`, référencé mais absent, est créé.
- Le README, qui était celui du modèle de départ, est réécrit.
- Nouveau document : `FONCTIONNALITES-PAR-OFFRE.md`.

---

# v7 — Notifications réparées, couleurs de la marque, page Tunnel, offres alignées (13 octobre, soir)

## Notifications (détail complet : `NOTIFICATIONS.md`)
- **Bloquant réparé : le push ne pouvait plus fonctionner.** Depuis le passage à Vite, trois éléments manquaient :
  - le service worker n'était plus enregistré ;
  - l'abonnement partait sans jeton de connexion ;
  - l'abonnement automatique et le clic sur une notification n'étaient montés nulle part.

  Les trois sont rétablis. L'application est de nouveau installable.
- **Invitation à installer l'app :**
  - affichée sur toutes les pages connectées, mobile et ordinateur ;
  - sur iPhone, elle explique que les notifications exigent l'app installée ;
  - elle revient après 7 jours et s'arrête après 3 refus ;
  - elle n'apparaît jamais sur les pages publiques.
- **Nouvelles notifications :**
  - nouveau contact et demande sur un tunnel publié (au propriétaire, tout de suite) ;
  - objectif du mois atteint ;
  - relances prospects du jour, dans le « point du jour » ;
  - réponse reçue et soutien reçu dans Ma foi › Cercle ;
  - demande d'appel Reprise / Cession, envoyée aux administrateurs.
- **Liens corrigés :** foi → Ma foi, victoire → Revue, vision et souvenir → Vision Board, point du jour → Accueil.
- **E-mail du lundi**, renommé « Ton lundi Zayado ». Il contient désormais :
  - le cercle (clients signés / visés, demandes reçues sur les tunnels, relances à faire) ;
  - le nombre de notifications non lues ;
  - l'invitation à installer l'app pour ceux qui n'ont aucun appareil abonné.

  C'est l'e-mail hebdomadaire : l'actualité par e-mail reste un choix de l'utilisateur.

## Couleurs
- **Plus de jaune.** Les boutons principaux sur fond bleu sont en dégradé champagne (#F1E2CC → #DEC2A3), comme le reste de l'appli.
- **Fond de l'appli :** le dégradé des pages publiques (#294174 → #0a1230) partout. Les pages récentes (Accueil, Pilotage, Radar, Plan d'action, Tunnels) avaient un autre bleu ; le Vision Board était en bleu uni.
- **Bleu uni** (menus, barres, fenêtres, listes déroulantes) : #294174, le bleu le plus clair du dégradé.
- **Pages publiques sur fond papier :** les boutons noirs passent au dégradé bleu du site zayado.net (#0D1F38 → #1E3D63 → #2E4A6B). Les accents dorés passent en champagne foncé. Les images de partage sont refaites.

## Page Tunnel
- **En haut, sans défiler :** la page publique, les contacts captés (avec le dernier) et la prochaine étape.
- **Onglets :**
  - Les pages ;
  - Contacts, du plus récent au plus ancien, e-mail cliquable, lien vers le Radar ;
  - Publication & partage ;
  - Faire venir du monde (campagne et séquence de lancement).
- **Dans la liste des tunnels**, chaque carte montre le nombre de contacts et l'adresse publique. La création manuelle est repliée derrière « Ou régler tout toi-même ».

## Offres
- Documents IA dès Pro, dans l'interface et sur le serveur (402 en dessous).
- Rêveur affiché comme « un avant-goût du cercle » : Pilotage, Radar découverte, 1 tunnel, Bien-être, Ma foi.
- La grille Tarifs ajoute les lignes Pilotage et Radar découverte. Solo met en avant ses 3 tunnels, Pro la séquence de lancement.

---

# v8 — Mobile, boutons et pages publiques au style du site (13 octobre, fin de matinée)

## Pages publiques = la page d'accueil du site zayado.net
- Pages concernées : diagnostic, Reprise, Cession et tunnels publiés par les utilisateurs (`/t/…`).
- Elles reprennent le style de l'accueil (« La maison des entrepreneurs apaisés ») :
  - papier ligné façon cahier ;
  - en-tête avec la pastille Z et la devise manuscrite « clarté · sérénité · équilibre » ;
  - étiquette tampon ;
  - titres en Poppins avec un mot manuscrit doré (Caveat) ;
  - boutons bleu nuit en dégradé, et bouton secondaire papier.
- Les polices Poppins et Caveat sont maintenant chargées par l'application. Avant, elles ne l'étaient pas : les pages publiques s'affichaient avec la police par défaut du téléphone.
- Corrigé : les champs du formulaire débordaient sur mobile (tunnel client).

## Boutons de l'appli
- **Thème sombre :** les boutons pleins passent en crème (#F4EFE6), avec le texte bleu nuit. C'est le bouton du site sur fond bleu. Plus aucun bouton beige ou jaune.
- **Thème clair :** c'est maintenant la page d'accueil du site :
  - papier ligné ;
  - texte bleu nuit ;
  - boutons bleu nuit en dégradé ;
  - cartes blanches.

  Avant, les pages Pilotage, Radar, Tunnels, Plan d'action et l'Accueil restaient bleu nuit en mode clair, avec un texte parfois illisible.

## Mobile
- **En-tête allégé :** une loupe (la recherche s'ouvre au toucher), les messages, la cloche et l'avatar. Le bouton « Check-in du jour » est masqué sur mobile (il reste sur la carte énergie), tout comme le badge d'offre.
- **Bulle « Copilote » retirée sur mobile :** elle recouvrait le contenu. Le chat est dans l'en-tête.
- **Bandeau d'installation :**
  - il ne recouvre plus la barre du bas ;
  - il est opaque ;
  - il n'apparaît qu'après 20 secondes.
- **Accueil :** les 5 étapes du cercle tiennent sur une ligne qu'on fait défiler, au lieu de 3 rangées.
- **Page Tunnel :** moins de boutons en haut (icônes seules) et la frise « Rédiger / Relire / Valider » est masquée sur mobile. Le résumé (page publique, contacts, prochaine étape) reste visible tout de suite.

# v9 — Refonte UX/UI : une seule appli, une question par écran (13 octobre, après-midi)

## Une seule navigation, partout
- **Toutes les pages** (nouvelles et historiques : Bien-être, Ma foi, Revue, Agents, Réglages…) ont le même rail, la même barre du haut et la même barre du bas. Avant, il y en avait deux, avec des mots différents (« Accueil » / « Aujourd'hui »).
- **Rail (ordinateur) :** chaque entrée a une icône ET un mot. Les entrées sont Aujourd'hui · Plan · Chiffres · Clients · Vision · Bien-être, puis Ma foi (si activée), Équipe (si concerné) et Admin.
- **Barre du bas (téléphone) :** 5 cases, Aujourd'hui · Plan · Clients · Vision · Plus. « Plus » ouvre tout le reste, rangé par familles, avec la bascule clair/sombre.
- **Clients** regroupe Prospects (ex-Radar) et Tunnels de vente, avec un sélecteur en haut des deux pages.
- **Menu du compte (avatar) :** Mon compte, Réglages, thème, visite guidée, autres outils, déconnexion. Pour les admins, il contient aussi la console et « Voir l'app comme ». Le bouton thème et le bouton admin ont quitté la barre du haut.
- **Une seule police : Poppins**, comme le site. Avant, IBM Plex, Manrope, Inter et Fraunces étaient mélangées, et les chiffres étaient en police « machine à écrire ».

## Une question par écran
- **Même en-tête sur chaque page :** un titre, une phrase, puis « Comment ça marche ? » (les explications longues sont repliées).
- **Aujourd'hui :** « Bonjour Prénom ». En premier, ta prochaine étape (une phrase, un bouton), puis ta journée, ton énergie, tes chiffres du mois, ta vision, ta roue et tes victoires.
  - Le bouton « Rapport financier » a été retiré : il faisait doublon avec « Chiffres ».
  - La bulle flottante « Copilote » a été retirée : le chat est dans l'en-tête.
- **Prospects :**
  - Les réglages (département, mots du métier, clientèle, sources, registre d'opposition) sont rangés derrière un bouton « Réglages ».
  - Les filtres deviennent des puces au-dessus de la liste et ne s'affichent que s'il y a des résultats.
  - À droite, tes prospects et leur étape.
- **Plan :** les actions passent en premier sur téléphone.
- **Chiffres :** un seul bouton « Importer mes chiffres ».
- **Bien-être :**
  - Le bouton « Faire mon check-in » n'apparaît plus qu'une fois (il était affiché 3 fois).
  - La carte « bilan du vendredi » est retirée : elle est dans le Plan.
  - La boutique « bientôt » est masquée tant qu'elle n'est pas ouverte.
- **États vides qui guident :** chaque zone vide dit ce qui va apparaître et propose le geste pour commencer. Exemples : « Choisir mon département », « Chercher maintenant », « Importer mes chiffres », « Créer ma vision », « Faire mon diagnostic d'équilibre ».
- **Cloche :** la pastille rouge ne compte plus que le NOUVEAU (non lu). Les « à faire » restent dans leur onglet, sans pastille qui stresse. Le point clignotant du chat et celui du check-in sont retirés.

## Des mots simples
- **Tunnels :**
  - Inscription · Merci + petite offre · Offre principale · Option en plus · Version allégée. Les mots tripwire, upsell et downsell ont disparu de l'écran.
  - « Mettre en ligne » remplace « Valider et déployer », et « prix à choisir » remplace « prix à fixer ».
- **Prospects :**
  - « Ajouter à mes prospects » remplace « Prendre ».
  - Le menu de chaque carte propose « Ne plus me le montrer » et « Cette personne ne veut pas être contactée ».
- **Chiffres :** « Ton seuil de rentabilité », « Ce qu'il te reste sur 100 € vendus ».
- **Le cercle d'Accueil :** les étapes s'appellent Chiffres → Prospects → Plan → Tunnels → Clients signés. La proposition d'import n'apparaît plus quand l'objectif du mois est déjà connu (correction côté serveur, `routers/cercle.py`).

## Téléphone
- **Vision Board :** il s'ouvre en **liste** (un mur par écran, on fait défiler et on lit). La vue carte reste à un geste, et le choix est mémorisé.
- **Boutons :** 48 px de haut minimum.
- **Débordements corrigés :** les cartes ne dépassent plus de l'écran (Accueil, Plan, Prospects).
- **Barre du bas :** elle est opaque.

## Vérifié
- `tsc` sans erreur et build OK. Les 42 routes ont été parcourues sans aucune erreur JavaScript.
- Captures prises sur ordinateur et sur téléphone, en thème sombre et clair.
- `backend/requirements.txt` est inchangé.

# v10 — Une seule matière de carte, espaces visibles, icône sans or (13 octobre)

## Une seule carte, celle de « Séance du moment »
- **Une seule matière pour toutes les cartes**, quelle que soit la page : Accueil, Plan, Prospects, Chiffres, Tunnels, Bien-être, Ma foi, Revue.
  - C'est la matière de « Séance du moment » : léger dégradé bleu sur fond nuit posé, bord fin, halo champagne en coin.
  - Fini le verre gris transparent : avant, quatre matières différentes cohabitaient.
- **Même en-tête de carte partout :** une petite étiquette en capitales champagne, avec son icône, puis un titre avec **un mot manuscrit (Caveat)**.
  - Pages : « Bonjour *Pro* », « Ton *plan* », « Tes futurs *clients* », « Prendre soin *de toi* ».
  - Cartes : « Ce qui compte *aujourd'hui* », « Comment tu *te sens ?* ».
- **Ma foi et Bien-être sont alignés sur le reste :**
  - même largeur et même départ à gauche que les autres pages ;
  - mêmes boutons (crème plein et contour) ;
  - même grammaire de titres.
- **Le fond bleu nuit couvre toute la page**, y compris quand on défile au-delà de l'écran. Avant, du blanc pouvait apparaître sur iPhone.
- **Corrigé :** le bouton « 7 j » de la courbe Bien-être était illisible.

## Espaces visibles
- **Sélecteur toujours en haut** (ordinateur et tablette) : **Mon espace · Entreprise · Admin**. Admin n'apparaît que pour les admins.
  - Entreprise reste visible avec un cadenas si l'offre ne l'inclut pas.
- **Sur téléphone :** le même sélecteur est en tête de la feuille « Plus ».
- **Le rail de gauche ne garde que les modules de ton espace.** Équipe et Admin n'y sont plus en double.
- **La recherche est compacte** (elle s'élargit quand on tape) : elle ne mange plus la barre.

## Icône de l'appli
- Inchangée : le logo or-beige d'origine est conservé (recoloration annulée).

## Vérifié
- Build OK. Les 42 routes ont été parcourues sans aucune erreur JavaScript.
- Captures prises sur ordinateur et sur téléphone, en clair et en sombre, avec un compte client et un compte admin.
- `requirements.txt` est inchangé.

## Bien-être et Ma foi repris en profondeur (v10, suite)
- **Bien-être · Aujourd'hui** suit maintenant le déroulé d'une journée, dans cet ordre (c'est aussi l'ordre sur téléphone) :
  1. **Comment tu vas** (check-in), avec la **Séance du moment** juste à côté.
     - La séance est redessinée dans le style que tu as choisi : étiquette champagne, « Une pause guidée, *avec le son* », trois choix lisibles (Calme · Anti-stress · Focus) et un bouton « Lancer · 3 min ».
     - Avant, il y avait un rond « Commencer » dont le texte débordait sur mobile.
     - Le lien « Sons et durées » ouvre l'onglet Outils.
  2. **Ce que ça change aujourd'hui** (verdict, suggestion) : seulement après le check-in.
  3. **Ta carte du jour**, en pleine largeur.
  4. **Tes rituels doux**, avec les raccourcis Respiration, Journal et Intention.
  5. **Ton suivi** (courbe et roue), en bas : on le consulte, on n'y agit pas.
- **Ma foi :**
  - mêmes titres, mêmes boutons et même largeur que le reste de l'appli ;
  - le verset ne laisse plus de « » » seul en fin de ligne ;
  - sur téléphone, les deux actions du verset prennent toute la largeur (grandes cibles pour le pouce).
- **Les cartes ne s'étirent plus jusqu'à laisser des zones vides.**

# v11 — Page « Mon compte » refaite (13 octobre, fin d'après-midi)
- **La page a sa raison d'être : « où en est mon compte ? »** Elle tient en 4 cartes :
  - **Mon offre** : nom de l'offre ; état (essai, renouvellement automatique avec date et montant, résiliation, tarif fondateur) ; un bouton « Gérer mon offre et mes factures » ; « Passer à … » si une offre supérieure existe.
  - **Parrainage** : nombre de filleuls, palier, progression, « Inviter quelqu'un ».
  - **Mes achats** : commandes de la boutique (suivi des colis) et services ou accompagnements achetés, avec le compteur de chacun.
  - **Mon compte** : « Mes informations et réglages », « Télécharger mes données », « Écrire à l'équipe », « Se déconnecter ».
- **17 boutons → 9.** Ce qui existait déjà ailleurs a été retiré :
  - ouvrir le cockpit (rail) ;
  - Espace entreprise, Admin, vendeur, RH (sélecteur d'espace et menu du compte) ;
  - thème clair/sombre (menu de l'avatar) ;
  - informations, entreprise, préférences (regroupés sous une seule entrée « Réglages ») ;
  - Mes documents (chat).
- **La grande photo de gauche est retirée.** La page a la même navigation, les mêmes titres (« Mon *compte* ») et les mêmes cartes que le reste de l'appli : on n'en « sort » plus.
- **Les vues « Mes commandes » et « Mes services » gardent la même coque.**
- **Vérifié :** build OK, aucune erreur JavaScript, sur ordinateur et téléphone, en sombre et en clair.
- **Newsletters (Admin › Newsletters), corrigé :** sans variable `EMAILS_IA_MARQUE` / `EMAILS_IA_CONTEXTE` sur Railway, le module réécrivait les newsletters reçues « au ton DeepShield » (marque et public d'un autre projet). Les valeurs par défaut sont maintenant celles de Zayado. Deux variables facultatives, propres à la newsletter, ont été ajoutées : `NEWSLETTER_MARQUE` et `NEWSLETTER_CONTEXTE`.

# v12 — Pages publiques sur Shopify, prix en un seul endroit, Journal (13 octobre, soir)

## Shopify (dossier `shopify/`)
- Nouvelles pages : La Maison, « De quoi avez-vous besoin ? », Le Cockpit, Contact (formulaire Shopify, sujet prérempli).
  Reprises du contenu Emergent, au vouvoiement, sans les chiffres et témoignages inventés (« 4,9/5 », « +300 dirigeants », logos fictifs retirés).
- Deux sections réutilisables : « Cartes » (piliers, étapes, niveaux, valeurs, modules) et « Bandeau ». Le hero fonctionne aussi sans image.
- Journal : liste (filtres Articles / Témoignages / Notes, article à la une, inscription à la note d'équilibre) et page d'article
  (mise en page propre à chaque type). Grille 3 colonnes sans trous, aucun débordement sur mobile.
- Produits partenaires en « Bientôt » (pas de prix, « Me prévenir »). Accompagnements « Sur devis » → page Contact.
- Cession retirée partout (produit, textes, liens) : Zayado ne fait pas de cession, comme le dit déjà l'app.
- Polices Poppins + Caveat servies par la boutique (plus d'appel Google). README réécrit (installation en 10 étapes).

## App
- **Admin › Prix** : abonnements, tarif fondateur, plancher Entreprise, Kit et Fast-Track du tunnel, services à l'unité.
  Enregistrer = appliqué tout de suite au paiement Mollie, à la grille de l'app et à l'iframe Shopify ; option « Recopier sur les fiches Shopify ».
  Table `prix_reglages` (créée au démarrage) ; les prix du code restent les valeurs d'origine. `plans.js` lit `GET /api/tarifs/grille` (public).
- **Admin › Articles du Journal** : sujets proposés depuis les newsletters reçues, brouillon complet (SEO, liens internes, aucun chiffre inventé),
  notes de la maison mises en forme sans rien ajouter, envoi en brouillon dans le blog Shopify « journal ».
- **Admin › Témoignages** : demande par e-mail (Brevo), message WhatsApp prêt (wa.me) ou lien ; formulaire public `/temoignage/<jeton>`
  avec accord de publication explicite ; validation refusée sans accord ; demandes automatiques optionnelles (abonné 45 j + 3 victoires,
  ou accompagnement payé il y a 14 j ; 20 par jour, une seule fois par personne).
- L'ancienne vitrine `/public/entreprise/` redirige vers `zayado.net` (page équivalente). Lien « Espaces cachés » mis à jour.

## Vérifié
- `tsc` sans erreur, build OK, balayage de 42 écrans : aucune erreur JS.
- Nouveaux tests `tests/test_prix_journal.py` (3) + abonnements, essai, marketplace : 20 passés.
- `backend/requirements.txt` non modifié.
- Shopify (applications du Dev Dashboard, sans jeton `shpat_`) : `shopify_auth.py` demande le jeton avec l'ID et le secret client
  (`SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` sur Railway) et le renouvelle avant expiration (~24 h). Le secret client sert aussi
  à vérifier les webhooks. Un `SHOPIFY_ADMIN_TOKEN` posé à la main reste prioritaire.
