# Correction Railway — 29 août 2026

## Le bug corrigé
`railway.json` contenait une `startCommand` séparée du Dockerfile :
`"uvicorn server:app --host 0.0.0.0 --port $PORT"` — passée telle quelle
par Railway, sans interprétation shell, donc `$PORT` restait littéral
au lieu d'être remplacé par le vrai numéro de port. D'où l'erreur
`'$PORT' is not a valid integer`.

Le Dockerfile avait déjà la bonne commande (`sh -c "... --port
${PORT:-8000}"`), mais `startCommand` dans railway.json l'écrasait
avec la version cassée.

**Corrigé** : `startCommand` retiré de railway.json — le CMD du
Dockerfile (déjà correct) reprend le contrôle.

## Sur Mollie — pas fait, et voici pourquoi
Ce zip contient un backend de DÉMO volontairement minimal (298 lignes,
un seul fichier `server.py`), documenté comme tel dans son propre
commentaire d'en-tête : il ne remplace pas le vrai backend ZAYADO
(~80 routes, IA, OAuth, paiements). Aucune trace de Stripe, Mollie, ou
tout autre système de paiement n'existe dans ce zip — pas un oubli à
corriger, une absence structurelle assumée pour cet environnement de
preview.

Construire Mollie ici créerait du code jetable sur un backend qui
n'est pas fait pour durer. À faire sur le vrai backend de production
une fois précisé lequel des deux repos est la bonne cible.

## Vérifié
Frontend et backend compilent tous les deux sans erreur — aucun autre
bug trouvé dans ce zip.

## Typo cassée sur l'onglet Actualité mobile (29/08, suite)

**Le vrai bug, trouvé précisément** : une règle CSS tardive (`@media
max-width: 768px`, ligne ~1404) forçait `font-size: 14px !important`
sur les boutons de "Signal du jour" (Quel impact pour moi ?, 3 actions
concrètes, Préparer une publication, Enregistrer) — alors que leur
gabarit (padding compact, min-height 36px) avait été conçu pour un
texte à 12px. Le texte débordait visuellement de boutons trop petits
pour lui, donnant l'effet "typo grosse et bizarre" signalé.

**Corrigé** : ces boutons retirés de la règle à 14px, remis à 12px —
cohérent avec les autres règles du même composant qui, elles, fixaient
déjà explicitement 12px pour ces mêmes boutons (aucun conflit créé).

**Vérifié visuellement**, pas juste supposé : le HTML réel du
composant `NewsConversation` rendu avec le CSS corrigé, capture
d'écran avant/après — les boutons ont maintenant une vraie bordure,
un vrai fond, un texte qui ne déborde plus.

## Vérifié avant livraison
Frontend et backend compilent sans erreur, CSS syntaxiquement
équilibré, aucune autre règle conflictuelle trouvée sur ces mêmes
sélecteurs.

## Fond du chat incohérent — corrigé (29/08, suite)

**5 versions différentes** de la même règle de fond (`.news-conversation`
+ conteneur mobile), empilées à travers le fichier, chacune avec
`!important` — la dernière (une couleur plate `#0B1F3A`, sans le
dégradé de marque) gagnait sur toutes les autres. Nettoyé : une seule
règle fait foi désormais, la vraie formule `.sky-bg` (radial-gradients
+ dégradé à 4 tons), identique à celle du reste de l'app.

## Cartes dark/light — un vrai point trouvé, pas totalement résolu
Testé visuellement (Playwright, HTML réel du composant, pas supposé) :
- "Point du jour" — correct dans les deux modes
- Cartes de décision (Approuver/Reporter) — le bouton secondaire
  "Reporter" a un contraste faible en mode clair (bordure à peine
  visible). Pas cassé, mais peu lisible.

Je n'ai pas pu auditer les 63 occurrences de règles liées aux cartes
dans le fichier sans un vrai environnement de build Tailwind complet
— honnêteté plutôt que fausse certitude.

## Non traité, avec la raison précise
- **Menu mobile "Kairos"** : l'URL donnée est une app React qui
  nécessite JavaScript exécuté — mon outil ne peut lire que du contenu
  statique, impossible de voir à quoi elle ressemble sans capture
  d'écran.
- **Couleur de fond des pages publiques Shopify** : hors de ce dépôt
  (le thème Shopify est un artefact séparé), je ne peux pas le vérifier
  depuis ce zip.
- **Images réelles manquantes** : pas assez d'info pour savoir
  lesquelles ni où.

## Chevauchement menu Vision + icône Hub IA (29/08, suite 2)

- **"Voir mes axes" superposé sur "Changer la photo de fond"** : le menu
  déroulant Vision avait un z-index (50) trop bas par rapport à d'autres
  éléments de la page. Remonté à 200 pour qu'il passe toujours par-dessus.
- **Icône du menu desktop** : "Hub IA" utilisait une bulle de chat
  (MessageCircle) partout, y compris sur le rail latéral desktop. Ajouté
  une icône dédiée (LayoutDashboard) pour desktop uniquement — le bottom
  nav et la feuille de menu mobile gardent bien l'icône chat, comme
  demandé.
- **Fond noir du bottom-nav (capture fournie)** : vérifié — la dernière
  règle CSS du fichier (celle qui gagne la cascade) définit déjà un
  dégradé bleu marine cohérent, pas de noir. Je n'ai pas trouvé de règle
  active qui produirait du noir dans ce zip précis. Possible décalage
  entre ce zip et ce qui tourne réellement en ligne.

## Améliorations UX Aujourd'hui + Vision (29/08, suite 3)

**Fait, vérifié (syntaxe + rendu visuel testé) :**
1. "Décision à clarifier" (fausse promesse "bientôt") remplacée par une
   vraie décision en attente si elle existe (source : le vrai système
   `getStrategicDecisions` de Vision), sinon un lien clair vers Vision
   plutôt qu'une promesse vide.
2. Triple répétition de la priorité principale supprimée : le bloc
   "Priorité du jour" séparé (dupliquait le hero) a été fusionné dedans
   — plus doublon entre hero, métriques et bloc dédié.
3. Le fil Vision → Décision → Action est maintenant cliquable, chaque
   étape mène vers sa vraie destination (Vision, Vision, Mon Mouvement).
6. Vraie action rapide ajoutée : formulaire "Ajouter une tâche" dans le
   hero, branché sur `createTache` (vraie route), avec retour visuel
   (toast succès/erreur).

**Nettoyage fait au passage** : import et variable `useIsMobile`
devenus morts après la fusion, retirés. Import `Zap` déjà mort avant
mes changements, retiré aussi.

**Non fait dans cette passe, honnêtement** :
4. Unifier la source de "priorité du jour" entre Aujourd'hui (tâches)
   et Vision (jalons stratégiques) — vrai chantier de fond, pas une
   correction ponctuelle
5. Séparer visuellement StrategicCapHome et CoursAccueilVision sur
   l'accueil Vision
7. Formulaire "Horizon 90 jours" en étapes plutôt qu'en un bloc
8. Indicateur de connexion entre jalons/décisions et la Vision affichée
9. Accusé visuel après décision approuvée (au-delà du toast actuel)
10. Lien explicite entre "axes" et "jalons"

## Vérifié avant livraison
Tous les fichiers du projet compilent, rendu visuel du nouveau hero
testé (pas juste supposé).

## Points 4 et 5 — unification priorité + séparation Vision (29/08, suite 4)

**Point 4 — Unifié, vérifié** : Aujourd'hui appelle maintenant aussi
`getStrategyOverview()`. Une tâche déjà reliée à un jalon marqué
"maintenant" dans Vision (via `strategic_milestone_id`, champ confirmé
préservé par `normalizeTask`) passe désormais automatiquement en
priorité principale, avec un badge visible "Priorité de Vision" pour
que l'utilisateur comprenne d'où vient ce choix. Fini les deux
priorités différentes possibles le même jour selon la page consultée.

**Point 5 — Vraie ampleur découverte, corrigé partiellement, honnêtement** :
en lisant `AccueilVision.jsx` en entier, j'ai trouvé que la duplication
est plus profonde qu'un simple manque d'espacement — ce composant
contient lui-même un second fil "Vision → Décision → Action" complet
(section `vision-trajectory`) et une seconde carte de décision
prioritaire ("PROCHAINE DÉCISION" dans `vision-focus-grid`), sous des
noms différents de ce que fait déjà `StrategicCapHome` juste au-dessus.

Une vraie fusion demanderait de choisir laquelle des deux
implémentations garder, avec une vraie analyse de laquelle des sources
de données est la bonne — pas fait ici pour ne rien casser sans
validation. Corrigé plus modestement : un vrai séparateur visuel avec
titre ("Vue détaillée") entre les deux blocs, pour qu'ils ne se lisent
plus comme un seul bloc confus.

## Vérifié avant livraison
Tous les fichiers compilent, aucune régression introduite.

## Point 10 — lien réel entre axes et jalons (29/08, suite 5)

**Vraie cause trouvée** : deux systèmes de "pilier" différents
coexistaient sans lien. `TabPillars` (les vrais axes, avec scores et
objectifs) utilise `visionExtApi.getPillars()`. Le formulaire de jalon
dans `StrategicHorizon`, lui, n'avait qu'un simple **champ texte
libre** pour "l'axe" — jamais connecté aux vrais piliers.

**Corrigé** : `StrategicHorizon` charge maintenant les vrais piliers
(même source que `TabPillars`), le champ texte est devenu un vrai menu
déroulant listant les axes réels. Chaque carte de jalon affiche
désormais aussi le nom de son pilier lié, quand il y en a un — le lien
est visible dans les deux sens.

Gestion des titres multilingues (`{fr, en}` ou simple texte) reprise
sur le même principe que `useApp().tv()`, en local pour ne pas
importer tout le hook de langue dans ce composant.

## Vérifié avant livraison
Tous les fichiers compilent, aucune régression.

## Bugs d'authentification (audit externe) + points 8/9 (29/08, suite 6)

**AUTH-01 (Bloquant, corrigé)** : le bouton Google pouvait naviguer vers
`/undefined` quand le serveur répond sans erreur HTTP mais sans
`authorization_url` exploitable (clés OAuth manquantes côté serveur).
Ajouté une vraie garde : si le champ est absent ou invalide, une erreur
claire s'affiche au lieu d'un écran vide.

**AUTH-03 + DATA-01 (Élevé, corrigés)** : le nom affiché ne venait que
de `/prefs` (souvent vide juste après connexion), jamais de l'identité
réelle renvoyée par `/auth/me`. Corrigé avec un vrai repli, robuste peu
importe l'ordre de résolution des deux appels. Ajouté aussi l'affichage
du fournisseur de connexion (Google/Microsoft/thesustain/démo) dans le
menu profil, absent jusqu'ici.

**Bug trouvé au passage** : le bouton "compte test" mémorisait la
méthode de connexion comme `"email"` au lieu de `"demo"` (copier-coller
resté par erreur) — corrigé, pour que le nouveau badge de fournisseur
soit exact.

**AUTH-02 / AUTH-04 — non corrigés, honnêtement** : ces deux bugs
(session thesustain non persistante, `thesustain_member: False` renvoyé
malgré l'accès) sont structurellement liés au comportement du VRAI
backend de production — pas corrigeables depuis ce frontend seul avec
le backend démo de ce zip. Nécessite une vérification côté serveur réel.

**Point 8** : la carte "Impact sur la Vision" affiche désormais un vrai
indicateur si un jalon actif ou une décision en attente y est déjà
rattaché — plus seulement le texte brut de la Vision.

**Point 9** : approuver une décision dans Vision affiche maintenant un
accusé visuel persistant dans la carte elle-même ("Mission créée dans
Mon Mouvement"), pas seulement un toast furtif.

## Vérifié avant livraison
Tous les fichiers compilent, aucune régression.

## Fond des pages publiques + vraies captures (29/08, suite 7)

**Fond des pages publiques corrigé** : Landing, Pricing et
Fonctionnalites partagent toutes le même conteneur `.lp-root`, qui
utilisait un simple `radial-gradient` à une ellipse — différent de la
vraie formule de fond de l'app (`.sky-bg`, avec ses halos et son
dégradé à 4 tons). Une seule correction règle les 3 pages. Bonne
nouvelle au passage : les variables de couleur (`--lp-gold`,
`--lp-navy`) étaient déjà identiques à la vraie marque — seul le fond
lui-même divergeait.

**Vraie découverte en générant les captures** : en rendant le vrai
composant "Point du jour" avec le vrai CSS du projet pour créer une
capture honnête, j'ai trouvé un bug non repéré avant — une règle
générale (`.copilot-daily-summary strong`, pensée pour un gros chiffre
de métrique) capturait aussi par erreur le petit "Prochain pas :" du
même bloc, le faisant apparaître démesurément gros. Corrigé avec une
règle plus spécifique, vérifié par une nouvelle capture avant/après.

**Sur les "vraies captures"** : je n'ai pas de serveur de l'app qui
tourne pour prendre de vraies captures d'écran de production. Ce que
j'ai fait à la place : rendre les VRAIS composants avec le VRAI CSS du
projet et des données réalistes, capturés avec Playwright — ce sont
donc des rendus fidèles du vrai code, pas des maquettes inventées,
même si ce n'est pas littéralement une capture de l'app en ligne.

## Vérifié avant livraison
Tous les fichiers compilent, CSS équilibré, corrections vérifiées
visuellement par rendu réel avant/après.

## Fond incohérent + titre géant sur la carte de priorité (29/08, suite 8)

**Cause racine majeure trouvée** : un bloc CSS entier de 116 lignes
(pensé "correctif final du Hub IA") forçait un fond CLAIR (blanc/beige)
sur tout le chat mobile, SANS AUCUNE condition de thème — donc actif
même en mode sombre. Un commentaire du fichier lui-même confirmait
qu'un bloc plus récent, correctement scopé à `html.ambiance-clarte`,
était "la source de vérité" — ce vieux bloc n'avait simplement jamais
été nettoyé. Corrigé : chaque sélecteur du bloc (114 au total) préfixé
individuellement par `html.ambiance-clarte`, pour qu'il ne s'applique
qu'au thème auquel ses couleurs sont réellement destinées. Vérifié
visuellement en mode sombre avant/après.

**Titre "PILOTAGE · AUJOURD'HUI" démesurément gros** : une règle à 16px
était groupée par erreur avec un sélecteur visant un tout autre titre
(`.copilot-decision-empty-title`), capturant au passage ce petit label
de catégorie (10px dans le composant source). Séparé, remis à sa vraie
taille.

**Fausse alerte de ma part, corrigée honnêtement** : j'ai d'abord cru
que le menu du bas montré dans une capture (icônes bulle/œil/tendance/
mallette/grille) était un second système de navigation incohérent.
Vérification faite : ce sont exactement les mêmes 5 destinations que
partout ailleurs (Hub IA/Vision/Croissance/DAF IA/Espace), avec les
bonnes icônes du vrai tableau ITEMS — pas un bug, juste une capture
recadrée sans les labels texte visibles.

## Vérifié avant livraison
Tous les fichiers compilent, CSS équilibré (1055 accolades ouvertes et
fermées), corrections vérifiées par rendu visuel réel avant/après.
