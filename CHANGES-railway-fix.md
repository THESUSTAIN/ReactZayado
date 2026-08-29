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
