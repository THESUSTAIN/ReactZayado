# Vision Board — refonte « façon Storyflow » (23/09/2026)

Base : `ReactZayado-corrige-2026-09-23.zip` (dernière version reçue). Toutes les
corrections de cette version sont conservées ; seuls les fichiers listés ici changent.

## Ce qui change pour l'utilisateur

Le canvas Vision (`/app/vision?view=canvas`) reste le même outil, amélioré :

- **Murs = vrais conteneurs** : on glisse une carte dans un mur (repère d'insertion),
  on l'en sort, on réordonne. Numérotation automatique « 1 · », « 2 · »… selon la position.
  Titre (double-clic), couleur, largeur, corbeille.
- **Cartes Storyflow** : titre, texte avec **gras**, cases à cocher `[ ]` cliquables,
  étiquettes pastel, date, tableau éditable, vidéo YouTube intégrée, image.
- **Cartes LIVE reliées aux données pro** (Outils → Carte live) : vision & pourquoi,
  objectifs (avancement + échéance), actions (cocher = coche la vraie tâche),
  énergie + courbe + équilibre pro/perso, roue de l'équilibre, objectif de revenu,
  suivi financier (tableau), idées. Rafraîchies toutes les 2 min. Sans données :
  état vide honnête + lien vers le module, jamais de chiffres inventés.
- **Modèle « Cockpit Vision A → Z »** : 6 murs pré-remplis de cartes live.
  Un board « perso » vide démarre directement dessus.
- **Rail d'outils gauche** : Note, Mur, Ligne, Outils, Dessin, Images, Corbeille, Vocal.
- **Lignes** entre deux cartes ou murs (flèche), sélection + suppression.
- **Dessin libre**, **corbeille** (restaurer / supprimer / vider),
  **annuler / rétablir** (Ctrl+Z, Ctrl+Maj+Z), touche Suppr.
- **Présenter** : plein écran, mur par mur (← →, Échap).
- **Export PNG / PDF** cadré sur le contenu (avant : seulement la zone visible).
- **Mobile** : barre d'outils au pouce (note, mur, ligne, main, annuler, corbeille).

## Typographie (mesurée sur Storyflow)

Police système (SF Pro / Segoe UI / Roboto), 2 graisses (400 / 600) :
titre de mur 24, titre de carte 16, texte 16 interligne 1,75, étiquettes 14
(texte foncé sur pastel), tableau 17 / 15. Zoom par défaut 60 % comme Storyflow.
Thème plat (sans verre ni halo) dans le marine Zayado ; thèmes clairs gérés.
Hub Vision et en-tête : titres Fraunces ramenés en 600 (le 800 n'était pas chargé
→ faux gras), textes en police système.
Polices inutilisées retirées du chargement : Outfit, Kalam.

## Corrections

- **Barre latérale visible sur mobile sur toutes les pages** (par-dessus le contenu) :
  `.side-nav { display:flex }` écrasait la classe `hidden`. Corrigé dans `index.css`.
- La version précédente du canvas gardait murs et liaisons dans le localStorage
  (perdus sur un autre appareil, jamais synchronisés). Ils sont maintenant dans le board
  serveur ; les murs/liaisons personnalisés existants sont repris automatiquement
  une fois puis sauvegardés.
- Suppression des traits automatiques de chaque carte vers le centre (encombrement).
- Bouton « Partager » retiré : il copiait l'URL de l'app, inutilisable sans compte.

## Fichiers

- `frontend/src/components/vision/VisionCanvas.jsx` (réécrit, rétro-compatible
  post-it / polaroïd / pilier KPI / image / palette / document IA)
- `frontend/src/components/vision/SfCards.jsx` (nouveau)
- `frontend/src/components/vision/cockpitTemplate.js` (nouveau)
- `frontend/src/components/vision/sf.css` (nouveau)
- `frontend/src/components/vision/VisionHub.jsx`, `frontend/src/pages/VisionBoard.jsx` (typo)
- `frontend/src/index.css` (barre latérale mobile, polices)
- `frontend/tailwind.config.js` (famille `font-ui`)
- `frontend/src/i18n/translations.js` (titre « Mon Vision Board »)

Aucun changement backend : les cartes live lisent les endpoints existants
(`/state`, `/objectifs`, `/taches`, `/cockpit/pouls`, `/vision/wheel`, `/idees`).

## Vérifié

Build `craco build` OK. Tests navigateur (données simulées) : ajout de note dans un
mur, gras + cases, étiquettes, déplacement d'une carte d'un mur à l'autre, ligne,
dessin, annuler, présentation, reprise d'un ancien board + ancien localStorage,
affichage mobile 390 px. 0 erreur JS.
Non testé en réel : export PDF avec images externes (dépend du CORS des images).

---

# Passe 2 : analyse UX et idées reprises de final (23/09/2026)

## Lisibilité et design
1. **Zoom de départ lisible** : ajusté automatiquement pour que 3 murs tiennent dans l'écran (min. 55 %, max. 100 %) au lieu de 60 % fixe. Cliquer sur le pourcentage réajuste la vue.
2. **Une seule barre** en haut à droite : statut, board, sélection / main, zoom, annuler / rétablir, mini-carte, exporter, partager, présenter. La mini-carte est masquée par défaut (bouton carte, choix mémorisé). Le filtre Élan / Refuge est passé dans « Outils ». Le compte à rebours a été retiré du canvas (il est déjà sur le Cockpit).
3. **Le titre du board affiche le prénom** (`{prenom}` remplacé à l'affichage) ; « Studio — Tableau libre » devient « Mon Vision Board ».
4. **Nouvel ordre du modèle** : Vision → Objectifs → **Finances** → Actions → Énergie → Idées & Victoires.
5. **Cartes Live distinctes** : bandeau « ● Live · source » et liseré vert discret.
6. **Premier contact** : panneau « Démarre ton cockpit en 3 étapes » quand il n'y a encore ni vision, ni objectif, ni action (masquable).
7. **Mobile** : un mur par écran, on glisse de mur en mur, avec des onglets de murs en haut. Le « + » ajoute dans le mur affiché. Bouton ✏️ « Modifier » sur les cartes (le double-clic est peu pratique au doigt).

## Repris de final (branché sur les vraies données)
8. **« + Mission » sur chaque objectif** : crée une vraie tâche avec `objectif_id` (backend : `TacheIn.objectif_id`, contrôle que l'objectif appartient bien à l'utilisateur). Chaque objectif affiche son nombre d'actions ; « 0 action » s'affiche en orange. La carte Actions indique l'objectif servi.
9. **Score « Vision réalisée »** (moyenne de l'avancement des objectifs) et **message de palier** à 25 / 50 / 75 / 100 %.
10. **Carte Trajectoire** : Aujourd'hui → Q1 → Q2 → Q3 → Q4 → Vision (jalons réels de la feuille de route).
11. **Carte Victoires** : nouvelle route `GET /api/victoires`.
12. **Carte « À surveiller »** : alertes calculées (échéance ≤ 21 j avec peu d'avancement, échéance dépassée, objectifs sans action, CA en retard sur le rythme du mois, énergie en baisse sur 3 check-ins, aucune action ouverte).
13. **Lien public en lecture seule** (`/v/<jeton>`) : on peut masquer finances et énergie, et ce masquage est **filtré côté serveur**. Lien révocable ; jamais d'e-mail ni de plan exposés. Routes `GET/POST/DELETE /api/vision/share`, `GET /api/public/vision/{token}` (ajoutée aux routes publiques de `part2_ext.py`).
14. **Épingler au Cockpit** (📌 sur une carte Live) : section « Épinglé depuis ma Vision » sur la page d'accueil.
15. **E-mail du lundi 7 h (heure de Paris)** : pourquoi, score, CA / objectif, 3 actions, bouton vers le board. Il respecte `notifications`, part une seule fois par semaine grâce à la table `vision_weekly_mails` (contrainte unique), et passe par l'envoi Brevo existant. Désactivable avec `VISION_WEEKLY_EMAIL=0`. Le lien utilise `FRONTEND_PUBLIC_URL` (par défaut https://app.zayado.net).

## Nouveaux fichiers
- `backend/vision_plus.py` (installé comme `part2_ext` : `install_vision_plus(globals())`)
- `frontend/src/pages/PublicVision.jsx`, `frontend/src/components/vision/PinnedVisionCards.jsx`

## Fichiers modifiés
`backend/server.py` (TacheIn, /taches, installation), `backend/part2_ext.py` (route publique), `frontend/src/App.js` (/v/:token), `frontend/src/pages/Cockpit.jsx`, `frontend/src/lib/kairosApi.js`, et les fichiers `vision/` (VisionCanvas, SfCards, cockpitTemplate, sf.css).

Les tables `vision_shares` et `vision_weekly_mails` sont créées automatiquement au démarrage (create_all). Aucune migration manuelle.

## Vérifié
- **Backend** (FastAPI + SQLite, en vrai) : mission reliée à un objectif, refus d'un objectif appartenant à un autre compte, victoires, lien public (masquage des finances et de l'énergie, retrait du mur vidé par le masquage, même jeton après mise à jour, révocation → 404, accès sans compte même avec `REQUIRE_AUTH=1`), e-mail du lundi (1 envoi, pas de doublon au 2e passage, rien le mardi, HTML validé par `_assert_safe_email`).
- **Navigateur** (ordinateur 1440 px et mobile 390 px, données simulées) : + Mission, épinglage → Cockpit, création du lien, page publique, glisser entre murs, ligne, dessin + annuler, présentation, reprise d'un ancien board. 0 erreur JS.
- **Non testé en réel** : l'envoi Brevo effectif (crédits Brevo à recharger), et l'export PDF avec des images externes.
