# Corrections — page blanche, compteurs figés, compréhension utilisateur

Date : 30 août 2026
Périmètre : 8 fichiers frontend + 1 fichier backend. Aucune dépendance ajoutée.
Vérification : `vite build` OK, audit ESLint `no-undef` / `react/jsx-no-undef` propre,
chargement réel du build dans Chromium en simulant le domaine `app.zayado.net`.

---

## 1. La page blanche — cause exacte

**`frontend/src/App.jsx`**

La route `/login-boutique` référençait `<LoginBoutique />`, mais le composant
n'était **jamais importé**. L'identifiant était évalué pendant le rendu de
`App()` — c'est-à-dire **au-dessus** de `AppErrorBoundary`, qui est un enfant de
`App`. Aucune limite d'erreur ne pouvait donc l'attraper.

Comportement de React 18 face à une exception non rattrapée : il **démonte tout
l'arbre**. Le conteneur `#root` se vidait, et le navigateur affichait un fond
beige entièrement vide — sans message, sans erreur visible pour l'utilisateur.

Erreur reproduite sur le build de production :

```
ReferenceError: LoginBoutique is not defined
```

**Correctif** : ajout de l'import manquant.

Cette panne concernait **100 % des visiteurs de `app.zayado.net`**, quelle que
soit la page demandée. Toutes les autres corrections ci-dessous étaient
invisibles tant que celle-ci n'était pas faite.

---

## 2. Filet de sécurité — une panne ne doit plus jamais produire une page blanche

**`frontend/src/main.jsx`** — ajout d'un `RootErrorBoundary` au-dessus de la
racine. Toute exception de rendu affiche désormais un écran lisible :
ce qui se passe, que les données ne sont pas perdues, un bouton *Recharger*,
un retour à l'accueil, l'adresse du support, et le détail technique replié.

**`frontend/src/App.jsx`** — la limite d'erreur du cockpit affichait
« Erreur de chargement V1 » suivi d'une pile d'appels brute en plein écran.
Remplacée par le même écran lisible, aux couleurs du cockpit.

**`frontend/index.html`** — l'ancien script attendait `root.children.length > 1`,
condition qui n'est jamais vraie une fois React monté : le loader n'était donc
jamais retiré proprement. Remplacé par un chien de garde : si le bundle JS ne se
charge pas du tout en 12 s (réseau coupé, fichier absent après déploiement,
extension navigateur qui bloque), un message actionnable s'affiche au lieu du
vide.

*Vérifié :* en réintroduisant volontairement le bug du §1, l'écran d'erreur
s'affiche correctement au lieu de la page blanche.

---

## 3. « Le cockpit affiche 0 et rien ne fonctionne » — cause racine

**`frontend/src/lib/api.js` + `frontend/src/App.jsx`**

L'intercepteur qui gère les réponses `401` traitait `/` comme une **page
publique**. C'est vrai sur `zayado.net`, mais sur `app.zayado.net`, `/` est
l'accueil **protégé** du cockpit.

Conséquence : un utilisateur dont la session avait expiré restait sur le
cockpit. Chaque appel repartait en `401`, **tous les compteurs retombaient à
zéro**, aucun bouton ne répondait — et rien n'indiquait qu'il fallait
simplement se reconnecter. C'est très probablement ce que vos utilisateurs
décrivent comme « ça affiche 0 et ça ne marche pas ».

La liste des routes protégées était par ailleurs incomplète : `/pilotage`,
`/croissance`, `/taches`, `/travail`, `/bien-etre`, `/thesustain`, `/campus`
n'y figuraient pas.

**Correctifs :**

- L'intercepteur distingue maintenant le domaine applicatif du site public.
  Sur `app.zayado.net`, **tout est protégé sauf** `/login`, `/login-boutique`,
  `/legal`, `/wp/`, `/page/`, `/preview`.
- Nouveau garde `RequireAuth` dans `App.jsx` : la session est vérifiée **avant**
  d'afficher quoi que ce soit. L'utilisateur voit « Vérification de votre
  session… », puis le cockpit ou la page de connexion — jamais un cockpit
  rempli de zéros.
- La destination voulue est mémorisée et rouverte après connexion
  (`frontend/src/pages/Login.jsx`), au lieu de renvoyer systématiquement à
  l'accueil.
- Ajout d'un `<Route path="*">` : une URL inconnue ramène à l'accueil au lieu
  d'une page vide.

---

## 4. Le compteur de rituels (« 0/8 ») et sa case à cocher

**`backend/routes/missing_apis.py`**

`done_today` et `streak` sont des champs **calculés**, et ils n'étaient calculés
que dans la route de liste. La création (`POST /wellness/habits`), le
basculement (`POST /wellness/habits/{id}/toggle`) et le seed renvoyaient la
ligne brute, **sans ces champs**. Toute interface qui faisait confiance à la
réponse voyait une habitude « non faite », streak à 0 — y compris juste après
l'avoir cochée.

**Correctif** : fonction `_decorate_habit()` factorisée, appliquée aux quatre
routes. Une réponse d'habitude porte désormais toujours son état réel.

**`frontend/src/pages/BienEtre.jsx`**

- **Bascule optimiste** : la case se coche immédiatement, puis on confirme
  auprès du serveur. Avant, l'interface attendait un aller-retour complet sans
  aucun retour visuel — le clic semblait ne rien faire.
- **Échec visible** : un `toggle`, une suppression ou une création qui échoue
  affiche maintenant un message et restaure l'état précédent. Avant, l'erreur
  était avalée en silence et l'utilisateur cliquait plusieurs fois.
- **État de chargement distinct de l'état vide** : la page affichait « 0 »
  pendant la requête, ce qui se lit comme une panne.
- **Bandeau d'échec de chargement** avec bouton *Réessayer*, au lieu d'afficher
  des chiffres qui ne reflètent rien.

---

## 5. Écrans sans données — ils expliquent, ils n'affichent plus « 0 »

Le principe appliqué : **un chiffre vide se lit comme un bug.** Une phrase +
un bouton se lisent comme une invitation.

**`frontend/src/pages/BienEtre.jsx`** — les trois jauges du haut :

| Avant | Après |
|---|---|
| `Rituels du jour — 0/8` | `Aucun rituel créé pour l'instant.` + *Créer mon premier rituel →* |
| `Énergie actuelle — 0 / —` | `Aucun check-in enregistré.` + *Faire mon premier check-in →* |
| `Meilleure série — 0 jours` | `La série démarre au premier rituel coché.` |

La liste de rituels vide explique en une phrase **ce qu'est un rituel**, avec
deux exemples concrets, et où l'écrire.

**`frontend/src/pages/Aujourdhui.jsx`** — nouveau bloc **« Premiers pas »**,
affiché uniquement sur un compte encore incomplet, refermable définitivement :

1. **Définir votre Cap** — pourquoi : c'est ce qui permet de trier les priorités.
2. **Noter une première action** — elle apparaîtra dans « Priorité du jour ».
3. **Faire un check-in d'énergie** — c'est ce qui alimente l'anneau de capacité.

Chaque étape se coche **automatiquement** dès que la donnée réelle existe, et
le bloc disparaît quand les trois sont faites. Une phrase dit explicitement
que les zéros affichés **ne sont pas une panne**.

Les trois métriques du jour ont été reformulées dans le même esprit
(`À définir` → `Pas encore définie` + ce qui la remplira).

---

## 6. Le bouton « Payer » du checkout ne partait jamais

**`frontend/src/pages/Checkout.jsx`**

`setBusy(true)` était appelé alors que `setBusy` n'était **déclaré nulle part**
→ `ReferenceError` au clic, commande jamais envoyée.

Correctifs : ajout de l'état `busy` manquant, `finally` qui débloque le bouton
en cas d'échec réseau (il restait sinon coincé sans possibilité de réessayer),
libellé dynamique (`Traitement en cours…`), et bouton désactivé si le panier
est vide.

---

## Points relevés, volontairement non modifiés

- `backend/routes/missing_apis.py` → `_update_row()` filtre `if v is not None`,
  ce qui rend **impossible d'effacer un champ** (le remettre à `null`). C'est
  volontaire pour les corps `PATCH` Pydantic, où `None` signifie « inchangé ».
  Le corriger sans revoir chaque appelant risquerait des régressions — à traiter
  séparément.
- `dist/assets/index.js` fait 1,9 Mo (527 ko gzip). Un découpage par route
  (`React.lazy`) réduirait nettement le temps de premier affichage. Hors
  périmètre de ces corrections.
- `src/lib/api.test.js` et `src/setupProxy.js` remontent des `no-undef` à
  l'audit : ce sont des globales de test et de Node, pas des bugs applicatifs.

---

## Fichiers modifiés

```
backend/routes/missing_apis.py
frontend/index.html
frontend/src/App.jsx
frontend/src/lib/api.js
frontend/src/main.jsx
frontend/src/pages/Aujourdhui.jsx
frontend/src/pages/BienEtre.jsx
frontend/src/pages/Checkout.jsx
frontend/src/pages/Login.jsx
```

## Après déploiement — à vérifier en 2 minutes

1. Ouvrir `app.zayado.net` en navigation privée → la page de connexion doit
   s'afficher (plus de page blanche).
2. Se connecter → le cockpit s'affiche, avec le bloc « Premiers pas ».
3. Aller dans **Mindset & capacité**, créer un rituel, le cocher → la jauge
   « Rituels du jour » passe de `0/1` à `1/1` **immédiatement**.
4. Se déconnecter, ouvrir directement `app.zayado.net/mindset` → renvoi vers la
   connexion, puis retour automatique sur `/mindset` une fois connecté.
