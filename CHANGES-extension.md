# Corrections — Extension navigateur (E1, E2, E3, E10)

**Correction honnête avant tout** : j'avais dit dans un tour précédent que le
SSE temps réel était "déjà en place" côté Vision Board. C'est faux — vérifié
maintenant : aucun `EventSource` ni flux `ReadableStream` n'existe nulle part
dans le frontend. Le backend expose bien du `text/event-stream` (chat IA
uniquement), mais rien ne le consomme pour du temps réel. **E5 (synchro
OS→extension via SSE) n'a donc pas de fondation à brancher — pas fait, et je
ne vais pas construire dessus.**

## E1 — Miroir dynamique réel
**Fichier : `backend/chrome-extension/content.js`** (entièrement réécrit)

Avant : coquille vide (`window.__zayadoExtension = {version}`), ne lisait
rien. Maintenant : lit le DOM de l'onglet actif (Gmail : objet + expéditeur
du fil ouvert ; Google Calendar : titre + horaire de l'événement ouvert ;
Outlook : objet + expéditeur), avec un `MutationObserver` debouncé pour
suivre les changements en SPA (Gmail ne recharge jamais la page). Aucune
requête réseau, aucun accès à un compte tiers — uniquement ce qui est déjà
affiché à l'écran de l'utilisateur.

**⚠️ Limite honnête, à connaître avant de considérer ça "fini"** : les
sélecteurs CSS utilisés (`h2.hP`, `span.gD`, etc.) ciblent la structure DOM
actuelle de Gmail/Calendar/Outlook — ce ne sont pas des API officielles, et
Google/Microsoft changent leur DOM sans préavis. Chaque extraction est dans
un `try/catch` qui échoue en silence plutôt que de casser la page, mais ça
veut dire qu'un futur changement de mise en page côté Google peut arrêter
la capture Gmail sans qu'aucune erreur ne remonte. À surveiller / tester
manuellement après tout changement d'UI Gmail notable.

## E2 — Auth prod propre
**Fichiers : `background.js`, `sidepanel.js`, `frontend/src/lib/extensionBridge.js` (nouveau), `frontend/src/context/AuthContext.jsx`**

Le vrai bug : côté serveur (`backend/routes/auth.py`), le blocage de
`dev_link` en prod était déjà correct (`ALLOW_GUEST_LOGIN` + liste de
hostnames prod). Le bug était uniquement côté extension : en prod, l'UI
affichait juste "cliquez le lien puis revenez" et ne se remettait **jamais**
à jour automatiquement une fois le lien cliqué dans la boîte mail.

Fix : un vrai pont bidirectionnel.
1. `manifest.json` déclare `externally_connectable` pour `app.zayado.net`/`zayado.net`.
2. `frontend/src/lib/extensionBridge.js` (nouveau) : après toute connexion
   réussie (lien magique OU OAuth, câblé une seule fois dans
   `AuthContext.jsx::applySession`), transmet le token à l'extension via
   `chrome.runtime.sendMessage`. Silencieux si l'extension n'est pas
   installée — jamais bloquant pour la connexion web.
3. `background.js` : `onMessageExternal` reçoit le token, vérifie
   `sender.origin` contre une liste blanche (défense en profondeur même si
   le manifest changeait), le stocke dans `chrome.storage.local`.
4. `sidepanel.js` : écoute `chrome.storage.onChanged` → l'UI se met à jour
   **automatiquement**, sans que l'utilisateur ait à rouvrir le panneau.

**⚠️ Point bloquant qui n'est PAS résolu, à faire toi-même** :
`extensionBridge.js` a besoin de l'ID réel de l'extension Chrome
(`ZAYADO_EXTENSION_ID`), qui n'existe qu'après publication sur le Chrome Web
Store (ou via un `key` fixe en dev). J'ai mis un placeholder explicite —
tant qu'il n'est pas remplacé, le pont ne fait rien (échoue en silence par
design, donc ça ne casse rien, mais ça ne marche pas non plus).

## E3 — Domaines prod dans le manifest
**Fichier : `manifest.json`**
Retiré `https://strategy-brain-2.preview.emergentagent.com/*` de
`host_permissions`. `sidepanel.js::DEFAULT_API` pointait vers cette même URL
de preview (qui aurait cassé tous les appels `fetch()` en prod, host non
autorisé) → changé vers `https://app.zayado.net`.

## E10 — Restreindre les permissions `<all_urls>`
**Fichier : `manifest.json`**
`content_scripts.matches` passe de `<all_urls>` à une liste explicite :
`mail.google.com`, `calendar.google.com`, `outlook.office.com`,
`outlook.live.com`, `outlook.office365.com` — cohérent avec ce que E1 lit
réellement. Bien plus défendable pour la review Chrome Web Store (Google
demande une justification pour `<all_urls>`, ici il n'y en a simplement plus
besoin).

## Ce qui reste à faire (honnête)
- E4 (actions contextuelles créer un lead / répondre via IA) : partiellement
  déjà câblé côté `sidepanel.js` (`renderActions`/`capture` existaient déjà
  et fonctionnent maintenant avec du vrai contexte Gmail grâce à E1) — mais
  pas de vraie action "répondre via IA" directement dans Gmail (ça
  demanderait d'injecter du JS dans la zone de réponse Gmail, pas fait ici).
- E5 : pas de fondation SSE côté frontend, donc pas fait (voir plus haut).
- Remplacer `ZAYADO_EXTENSION_ID` par le vrai ID une fois l'extension
  chargée en dev ou publiée.
- Aucun test réel dans un navigateur Chrome chargé (pas d'environnement
  navigateur disponible ici) — uniquement vérification syntaxique
  (`node -c`) et relecture. À tester manuellement avant prod.
