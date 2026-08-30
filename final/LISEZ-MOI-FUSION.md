# Comment ce zip a été construit — à lire avant de déployer

Ce zip n'est PAS une seule source unique : c'est un empilement chronologique
de tous les zips que tu as envoyés aujourd'hui, appliqués dans cet ordre
(le plus récent écrase le plus ancien fichier par fichier) :

1. ReactZayado-lots-10-12-final.zip   (22 août, ~20h57-22h37)
2. ReactZayado-corrige.zip            (base la plus complète, ~22 août soir)
3. zayado-bloc-chat-mobile.zip        (23 août, 07h38-07h40)
4. zayado-bloc-croissance-swot.zip    (23 août, 07h49-07h51)
5. zayado-corrections.zip             (23 août, 08h23)
6. ReactZayado-main.zip               (23 août, 09h33 — le plus récent)

+ la correction Copilote (lecture des décisions) faite dans cette conversation,
appliquée par-dessus.

## Ce que ça veut dire concrètement
- Empilement automatique par nom de fichier et date, PAS un merge Git avec
  résolution de conflits ligne à ligne. Si deux zips modifiaient le MÊME
  fichier sur des lignes différentes pour des raisons différentes, seule la
  version la plus récente survit — l'autre modification est perdue.
- Retiré : frontend/build (artefact compilé, régénérable via `npm run build`,
  inutile à transporter), __pycache__, .pytest_cache, backend/zayado.db
  (base SQLite locale, à ne jamais committer).
- PAS testé en environnement Node/DB réel (pas de serveur de dev complet ici).
  À lancer et tester avant tout déploiement.

## Recommandation
Si ce projet a un dépôt Git quelque part, un vrai `git log` + diff par fichier
donnerait un résultat plus fiable qu'un empilement de zips par date de fichier.
Dis-le-moi si c'est le cas — je peux comparer proprement avec Git plutôt que
deviner à partir des timestamps de zip.
