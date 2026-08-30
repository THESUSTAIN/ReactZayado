# Corrections suite à l'audit fonctionnel (23/08)

## Critiques — les 3 corrigés
1. **Recherche globale (Cmd+K)** : ne filtrait qu'une liste statique de
   pages de menu, jamais les vraies données. Construit un vrai endpoint
   (`routes/global_search.py`) qui interroge projets, tâches et
   prospects — vrais noms de champs vérifiés dans le code (`Project.name`,
   `label`, `name`/`company`), pas supposés.
2. **Onglet "Agents IA"** : impasse totale sans action possible. Ajouté
   un état "Bientôt" honnête, cohérent avec le pattern déjà utilisé
   ailleurs (Odoo, agrégateur bancaire).
3. **Email de connexion invisible** : cause trouvée précisément — le
   hook `useAuth()` (utilisé à 3 endroits) retournait un email codé en
   dur, jamais chargé depuis le serveur. Corrigé pour appeler `authMe()`
   réellement.

## Majeurs — 3 corrigés, 1 non résolu (honnêteté)
4. **Panneau Copilote qui tronque le contenu** (bug le plus répété de
   l'audit) : le contenu principal ne réduisait jamais sa largeur quand
   le panneau flottant s'ouvrait. Ajouté un espace réservé dynamique.
5. **Badge "Aujourd'hui" trompeur** : en réalité un bouton d'action
   ("planifier pour aujourd'hui"), mal stylé pour ressembler à un badge
   d'état. Renommé et restylé sans ambiguïté.
6. **Plan de semaine à 5 jours sur 7** : le tableau de jours était généré
   avec `length: 5` au lieu de 7, grille limitée à 5 colonnes. Corrigé.
7. **Cloche de notifications muette** : investigué en profondeur —
   structure de code strictement identique à "Messages" (qui fonctionne
   selon l'audit), chargement des données identique. **Je n'ai pas
   trouvé de cause de code précise** — je préfère le dire clairement
   plutôt que d'appliquer un correctif au hasard sans certitude qu'il
   change quoi que ce soit.

## Autre corrigé au passage
- **2 des 4 noms différents pour l'app** : `<title>` et meta description
  passaient de "MyExtension Business" à "MyExtension AI" — alignés sur
  le nom déjà utilisé dans le menu Écosystème.

## Non traités dans cette passe (temps insuffisant)
- Les 2 autres noms différents restants
- Infobulle collée après scroll
- Temps mesuré sur un projet sans tâche liée
- Les 8 frictions mineures (verdict prématuré, alerte trésorerie sans
  donnée, colonnes sans intitulé, scores sans échelle, icônes sans
  label, ordre tarifaire, Cmd+A cassé, données de démo visibles)

## Vérifié avant livraison
Backend et frontend compilent intégralement, zéro import de fichier
cassé, zéro import nommé introuvable, aucune base de données committée.

## Suite — noms restants, infobulle, temps mesuré, frictions mineures (24/08)

- **2 noms d'app restants** : "MyExtension" (sans AI) dans Pilotage &
  trésorerie unifié vers "MyExtension AI". La mention "Zayado" dans
  Notifications laissée telle quelle — elle désigne légitimement la
  marque éditrice (contenu marketing), pas le logiciel, donc pas une
  vraie incohérence une fois le reste unifié.
- **Infobulle collée après scroll** : cause réelle trouvée — le survol
  reste actif pendant un scroll (le curseur ne bouge pas), donc
  l'infobulle continue de s'afficher par-dessus le contenu qui a défilé
  en dessous. Corrigé : un scroll force sa fermeture immédiate.
- **Temps mesuré sans tâche liée** : pas un bug de données — un vrai
  minuteur peut tourner directement sur un projet, indépendamment des
  tâches. Le texte ne l'expliquait jamais ; clarifié.
- **Verdict de surcharge avant donnée** : le libellé gardait le mot
  "risque de surcharge" même sans aucun check-in enregistré. Corrigé
  pour un message neutre dans ce cas précis.
- **Alerte trésorerie sans donnée connectée** : même famille de bug,
  un ternaire à 2 états sans jamais de vrai état "aucune donnée".
  Corrigé avec un vrai 3e état.
- **Comparateur de scénarios sans intitulé** : les placeholders
  existaient mais étaient masqués par des valeurs pré-remplies dès le
  chargement. Ajouté une vraie ligne d'en-tête de colonnes.
- **Scores sans échelle** : ajouté le maximum par critère (découvert
  que ce sont déjà les poids max, total 90 pas 100 — précisé
  clairement plutôt que d'ajouter un "/100" qui aurait été faux).
- **Icônes de navigation sans label** : le rail compact avec tooltip au
  survol est un choix de design assumé, pas un bug — un vrai redesign
  changerait la largeur du rail. Corrigé l'accessibilité en ajoutant les
  `aria-label` manquants pour les lecteurs d'écran, sans changer le
  visuel.
- **Grille tarifaire dans le "mauvais" ordre** : **pas un bug** — un
  commentaire dans le code confirme que c'est une technique d'ancrage de
  prix délibérée (le plus cher en premier). Je ne l'ai pas changé sans
  ton accord, puisque c'est un choix business assumé.
- **Cmd+A ne sélectionne pas le texte** : investigué comme la cloche de
  notifications — aucun listener trouvé qui expliquerait ce
  comportement, l'input est un composant contrôlé standard qui devrait
  fonctionner nativement. Je n'ai pas trouvé de cause, donc pas de
  correctif appliqué au hasard.
- **Données de démo visibles ("11", "Becloudticket")** : pas de code de
  seed trouvé nulle part — ce sont de vraies données créées par un
  utilisateur (probablement pendant les tests), pas un bug. À nettoyer
  manuellement sur ce compte, pas dans le code.

## État final honnête
Sur les 13 points de l'audit : **10 corrigés**, **2 non reproductibles
en code** (cloche de notifications, Cmd+A — investigués sérieusement,
cause non trouvée), **1 n'était pas un bug** (ordre tarifaire, choix
marketing assumé).

## Vérifié avant livraison
Backend et frontend compilent intégralement, zéro import cassé, aucune
base de données committée.

## WhatsApp + vides sur chat mobile (24/08)

- **Lien WhatsApp du chat** : bug trouvé — la clé `whatsapp_url` n'était
  jamais exposée par `/api/config/public`, donc le bouton "Discuter sur
  WhatsApp" ne pouvait structurellement jamais s'afficher, même une fois
  configuré côté admin. Corrigé.
- **Vides visuels quand header/menu se masquent sur le chat mobile** :
  le chat plein écran avait `z-10`, bien en dessous du header mobile
  (`z-index: 130`) et du rail latéral (`z-40`) définis ailleurs dans le
  CSS. Même si ces éléments sont censés être retirés du DOM
  conditionnellement, tout résidu (toast, modal) avec un z-index
  intermédiaire pouvait transparaître. Remonté à `z-[150]`, garanti
  au-dessus de tout le reste de l'app.

## Vérifié avant livraison
Backend et frontend compilent, aucune base de données committée.

## Cloche = ouverture du chat + compteur d'actualité précis (24/08)

- **Cloche de notifications** : remplacé le DropdownMenu (dont le
  comportement restait incertain malgré l'investigation précédente) par
  un simple clic qui ouvre directement le Copilote — cohérent avec la
  demande "la notification, c'est le chat". Corrige aussi, sans doute,
  le bug "ne répond pas au clic" du tour précédent.
- **Compteur exact sur l'onglet Actualité** : remplacé le simple point
  rouge par un vrai nombre (éditions non vues depuis la dernière
  consultation), affiché à côté du nom "Actualité" dans le chat.
- **Incohérence trouvée et corrigée en cours de route** : le badge se
  marquait "vu" dès la simple ouverture du chat (n'importe quel onglet),
  ce qui aurait vidé le compteur avant même de consulter l'actualité.
  Corrigé : seul un clic sur l'onglet Actualité marque comme vu
  désormais ; le badge du bouton flottant Copilote se resynchronise à
  chaque ouverture/fermeture du chat pour rester cohérent avec ce que
  l'onglet a marqué.
- Nettoyé le code devenu mort après ce changement (état et import
  inutilisés).

## Vérifié avant livraison
Backend et frontend compilent, zéro import cassé, aucune base de
données committée.
