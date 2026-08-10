# Correction — suite QA (Cockpit, Vision, Croissance, Espace de travail, DAF IA, Co-pilote)

## Corrigé cette passe

**Tooltip tronqué dans le menu latéral** ("Croissance" → "roissance")
`Sidebar.jsx` : position calculée en px fixe (`left-[60px]`) relative au
bouton plutôt qu'en pourcentage de sa largeur réelle (`left-full ml-3`,
plus robuste). Ajouté `overflow: visible` explicite sur `.side-nav`
(App.css) en filet de sécurité — le rail est volontairement large de 96px
seulement, l'infobulle doit pouvoir en déborder.

**Titre d'onglet incohérent**
`public/index.html` : le titre restait "MyExtension AI" seul, sans lien
visible avec "Zayado" affiché partout ailleurs dans l'app. Mis à jour en
"MyExtension AI by Zayado — Votre Cockpit Business". Point à trancher côté
produit : `manifest.json` et les meta PWA gardent "MyExtension AI" seul
(nom d'app installée) — je n'y ai pas touché, ça mérite une décision de
branding plutôt qu'un choix unilatéral de ma part.

**Deux cartes "Idée du jour" identiques**
`routes/dashboard.py` : les insights "pas d'objectif CA" et "aucun
prospect" partageaient le même `kind: "idee"`, donc le même libellé
générique côté frontend. Ajouté un champ `label` explicite par insight
("Objectif CA" / "Prospection"), et `CockpitSections.jsx` le préfère
maintenant au libellé générique quand il est fourni.

**Carte "Coach IA du jour" vide**
`Pilotage.jsx` : pas de fallback quand `ov.coach.message` est vide,
contrairement aux autres cartes du même bloc. Ajouté un message d'état
"à venir" cohérent avec le reste de la page.

**Markdown brut dans le chat Co-pilote**
`CockpitChat.jsx` : aucune lib markdown dans le projet. Plutôt que d'en
ajouter une non testée dans cet environnement, écrit un petit
convertisseur ciblé (titres `#`/`##`/`###`, `**gras**`, `*italique*`,
listes à puces) en JSX direct — pas de `dangerouslySetInnerHTML`, donc pas
de risque XSS ajouté. Appliqué uniquement aux messages de l'assistant.

**Badge "NOUVEAU" chevauchant le texte "Boutique"**
`CockpitGreeting.jsx` : ajouté du padding-droite au bouton pour réserver
la place du badge en position absolue.

**"+% vs mois dernier" vide**
`KpiCards.jsx` : la condition d'affichage laissait passer `delta === null`
(retourné par `_pct_delta` quand il n'y a pas de mois précédent) — React
masque le `null` mais le texte statique restait affiché. Corrigé, plus un
signe "+" qui ne s'affiche plus devant un delta négatif.

**Notification "Prospect chaud détecté" trompeuse**
`routes/profile.py` : confirmé — codée en dur et injectée pour TOUS les
utilisateurs sans condition (le commentaire du code le disait lui-même :
"notifications de démonstration"). Gatée derrière le flag
`_demo_investor` : ne s'affiche plus que quand le mode démo investisseur a
réellement été activé sur le compte.

**500 sur `/api/demo/investor-status`, `/api/travail/overview`,
`/api/travail/recommendations`, `/api/prefs`**
Cause exacte non reproductible sans les vrais logs de prod (aucun accès
depuis cet environnement). Les quatre endpoints dégradent maintenant
proprement (état vide bien formé) au lieu de renvoyer un 500 brut, et
loggent l'erreur réelle côté serveur pour une investigation ultérieure —
donc le bouton/la page reste utilisable même si la cause sous-jacente
n'est pas encore identifiée.

**JWT dans l'URL du flux SSE Vision Board (sécurité, mineur)**
`routes/vision_events.py` + `useVisionEvents.js` : EventSource ne permet
toujours pas d'envoyer un header Authorization (contrainte du navigateur,
pas contournable). Mitigation : un nouvel endpoint `POST
/api/vision/events/ticket` (authentifié normalement, header) émet un
ticket JWT à portée réduite et à durée de vie très courte (45s, usage
unique) — c'est ce ticket, et non plus le vrai token de session, qui
transite dans l'URL du flux SSE. Une fuite de log n'expose plus qu'un
jeton inutilisable au-delà de quelques secondes.

## Non traité (nécessite une décision produit, pas un fix de code)

**Données de test dans l'onglet Projets** ("Geremmo - 01-16/04", "11",
"tache Becloudticket fux", "marketplace chretienne") : recherché dans le
code — rien de codé en dur, ce sont de VRAIES données en base (créées par
un compte réel, probablement de test). Je n'ai pas de moyen sûr de savoir
à qui appartient ce compte ni si ces projets doivent être supprimés — à
traiter via un nettoyage de données ciblé, pas un changement de code.

**Overlap bouton Démo Investisseur / bottom nav en mode "barre en bas"** :
déjà partiellement traité au tour précédent (repositionné à bottom:300
pour ne plus chevaucher le DebugMenu). Le rapport QA mentionne aussi un
chevauchement avec "Commencer ma journée" et d'autres contenus en mode
nav du bas — pas re-vérifié spécifiquement dans cette passe, à confirmer
visuellement après déploiement.
