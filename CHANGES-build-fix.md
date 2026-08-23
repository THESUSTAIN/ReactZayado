# Correction du build cassé en production (23/08)

## Le vrai bug (confirmé par le log de build fourni)
`Attempted import error: 'getDriveStatus' is not exported from '../lib/api'`
— le build échouait entièrement, empêchant tout déploiement.

**Cause** : `ChatPanel.jsx` importe 4 fonctions Drive
(`getDriveStatus`, `connectDrive`, `listDriveFiles`,
`importDriveFileToChat`) qui n'existaient nulle part dans `api.js`. Les
vraies routes serveur existent bien (`routes/gdrive.py`, montées sur
`/api/drive`) — seules les fonctions frontend manquaient.

**Corrigé** : les 4 fonctions reconstruites, branchées sur les vraies
routes serveur. `importDriveFileToChat` télécharge le fichier depuis
Drive (réponse binaire) puis le renvoie comme pièce jointe via le vrai
endpoint `/chat/upload` existant — pas de nouvelle route serveur
nécessaire.

## Méthode de vérification renforcée
Le bug ci-dessus est passé inaperçu dans mes vérifications précédentes
car elles ne testaient que "le fichier importé existe-t-il ?", jamais
"le nom importé existe-t-il vraiment dans ce fichier ?" — exactement le
type d'erreur que seul `yarn build` (résolution réelle par Webpack)
détecte.

**Nouveau script ajouté** : vérifie pour chaque `import { a, b } from
"./xxx"` que `xxx` exporte bien `a` et `b`, pas seulement que `xxx`
existe. Appliqué à tout le projet, il a immédiatement trouvé un
**deuxième bug du même type**, pas encore remonté par un build réel :
`getLastSeenNewsId`/`setLastSeenNewsId` (badge de notification
"nouvelle actualité") importées par `Layout.jsx` mais absentes de cette
version d'`api.js` — reconstruites également, vérifié que `/api/prefs`
fusionne bien plutôt que d'écraser dans cette base précise.

## Vérifié avant livraison
Backend et frontend compilent intégralement, zéro import de fichier
cassé, **zéro import nommé introuvable** (nouvelle vérification), aucune
base de données committée.

## Renommage "Mon Cap" → "Vision" réappliqué (23/08, suite)

Vérifié plutôt que supposé : ce renommage, fait plusieurs tours plus tôt
sur une autre branche, n'avait jamais été fusionné dans cette version
précise du zip. 5 fichiers avaient encore "Mon Cap" (BienEtre.jsx x2,
titre de la page Vision Board elle-même, StrategicHub.jsx, une note
générée automatiquement) — même 6 occurrences que la dernière fois,
corrigées à l'identique. Vérifié après coup : zéro import cassé, zéro
DB committée.
