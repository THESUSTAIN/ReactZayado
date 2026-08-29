# Corrections — 29 août 2026

Réponse point par point à vos notes. Ce qui a été trouvé, ce qui a été corrigé,
ce qui reste à faire de votre côté.

---

## 1. Connexion impossible (Google, Microsoft, email)

### Ce que j'ai trouvé — vérifié en direct sur app.zayado.net, pas déduit du code

Votre production tourne sur le **backend de démonstration**. Preuve :

```
GET https://app.zayado.net/api/health
→ {"status":"ok","mode":"demo", ...}
```

Ce backend fait 298 lignes. Il n'a aucune base d'utilisateurs, aucun envoi
d'email, et ses routes ne correspondent pas à celles que le frontend appelle.
Vérifié en direct également :

```
GET https://app.zayado.net/api/oauth/google/start
→ 200 []          ← attendu : une URL d'autorisation Google
```

Le frontend appelle `/api/oauth/google/start`. Le backend ne connaissait que
`/api/auth/oauth/google/start`. L'appel tombait donc dans la route fourre-tout,
qui répond `[]` à tout. Le frontend ne trouvait pas d'`authorization_url`,
et affichait « La connexion avec Google a échoué ». Idem Microsoft.

Le message « Mode preview — l'email n'est pas envoyé » venait de la même
source : le backend de démo répondait « je ne sais pas envoyer d'email, voici
un lien de secours ». Ce lien de secours n'aurait jamais dû être visible en
production, et le renvoi de code ne pouvait pas fonctionner puisqu'aucun email
n'était jamais envoyé.

### Ce qui a été fait

Nouveau module `backend/auth_real.py` — une authentification réelle, montée
**avant** la route fourre-tout (l'ordre était précisément le bug) :

| Route | Avant | Maintenant |
|---|---|---|
| `GET /api/oauth/{google\|microsoft}/start` | n'existait pas → `[]` | vraie URL d'autorisation Google / Microsoft |
| `POST /api/oauth/{provider}` | n'existait pas → `{}` | échange réel du code contre une session |
| `POST /api/auth/request-link` | lien de secours affiché à l'écran | email réellement envoyé via Brevo |
| `POST /api/auth/verify-link` | renvoyait toujours « Thomas » | vérifie un jeton signé, valable 20 min, et ouvre la vraie session |
| `GET /api/auth/me` | renvoyait toujours « Thomas » | identité réelle du porteur du jeton |
| `POST /api/auth/demo-login` | ouvert à tous | **refusé en production** |

Comptes persistés en SQLite, mots de passe en PBKDF2 (200 000 itérations),
sessions en JWT signé.

Côté page de connexion :

- le message « Mode preview » ne peut plus apparaître en production ;
- un échec d'envoi est annoncé **avant** tout message de succès (l'ordre des
  conditions faisait qu'un échec pouvait s'afficher comme « email envoyé ») ;
- la vraie raison du serveur est affichée (« GOOGLE_CLIENT_ID non configuré »)
  au lieu d'un « échec » générique impossible à diagnostiquer ;
- **bug corrigé au passage** : sans jeton exploitable, le code écrivait
  littéralement la chaîne `"undefined"` dans le stockage puis naviguait vers
  une application qui se croyait connectée — écran vide, aucune explication ;
- le jeton de connexion ne reste plus visible dans la barre d'adresse ni dans
  l'historique du navigateur.

### ⚠️ Ce qu'il vous reste à faire — sinon rien ne changera

À ajouter dans les variables Railway :

| Variable | À quoi ça sert | Où l'obtenir |
|---|---|---|
| `JWT_SECRET` | signer les sessions (sinon elles sautent à chaque déploiement) | une longue chaîne aléatoire de votre choix |
| `APP_BASE_URL` | `https://app.zayado.net` | — |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | connexion Google | Google Cloud Console → Identifiants OAuth |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | connexion Microsoft | Portail Azure → Inscriptions d'applications |
| `BREVO_API_KEY` | envoi du lien par email | Brevo → Paramètres → Clés API |
| `MAIL_FROM` | expéditeur (ex. `bonjour@zayado.net`) | doit être un expéditeur validé dans Brevo |
| `DATA_DIR` | **important** : chemin d'un volume Railway | sinon les comptes disparaissent à chaque déploiement |

Chez Google et Microsoft, l'URI de redirection autorisée doit être exactement
`https://app.zayado.net/login`.

Pour vérifier après déploiement : `https://app.zayado.net/api/auth/config`
liste ce que le serveur sait faire (OAuth actif ou non, email actif ou non,
stockage persistant ou non). Aucune supposition à faire.

> Note honnête : Brevo. Vous m'aviez indiqué que les crédits email du compte
> étaient épuisés. Tant qu'ils le sont, l'envoi échouera — l'application le
> dira clairement à l'utilisateur au lieu de faire semblant.

---

## 2. Chat mobile : menu et header disparus

**Trouvé** : ce n'était pas un bug d'affichage. Sur mobile, la route `/`
n'affichait pas la page d'accueil : elle affichait le **chat en plein écran**,
et masquait volontairement le header et la navigation basse. C'était un choix
d'une session précédente.

**Corrigé** : sur mobile, `/` affiche « Ce qui compte maintenant », exactement
comme sur PC. Header et navigation basse visibles partout. Le Copilote s'ouvre
par-dessus, en plein écran, et se referme.

**Bug corrigé au passage** : deux Copilotes étaient montés simultanément sur
mobile (le tiroir PC restait dans la page, masqué en CSS) — deux séries
d'appels réseau et deux conversations parallèles. Un seul désormais.

---

## 3. Design mobile différent du PC

**Trouvé — c'est la cause de tout le reste** : `index.css` contenait
**694 règles** dédiées au mobile, réparties dans une vingtaine de blocs
`@media` empilés qui se contredisaient à coups de `!important`. Le mobile
n'héritait pas du design PC : il en avait un deuxième, écrit séparément,
et jamais fini.

**Corrigé** : les 359 règles concernées ont été supprimées, ainsi que les
19 blocs `@media` devenus vides. Le fichier passe de **2 041 à 1 353 lignes**.
Le mobile hérite maintenant du même style que le PC — couleurs, typographie,
cartes, boutons.

**Ajouté au passage** : les libellés de la navigation basse étaient effacés
par un `font-size: 0` — cinq icônes à deviner. Ils sont de retour.

---

## 4. « Ce que l'IA a fait pour vous »

Déplacé du Copilote vers la page d'accueil, comme demandé. C'est un bilan de
journée, pas un tour de conversation : il n'avait pas à s'insérer dans le fil
du chat à chaque ouverture.

---

## 5. Page Actualité toujours cassée

**Trouvé** : les 156 règles de style de cet onglet existaient **uniquement**
dans les blocs mobiles ci-dessus. Autrement dit, l'onglet Actualité n'avait
**aucun style sur PC non plus** — vous l'aviez repéré sur mobile, mais le
problème était général. Les correctifs des sessions précédentes ajoutaient des
règles par-dessus une pile déjà contradictoire, sans jamais poser de base.

**Corrigé** : un jeu de règles unique, accroché au panneau Copilote lui-même,
donc strictement identique dans le tiroir PC et le plein écran mobile. Les
quatre actions du Signal du jour sont de vrais boutons (bordure, fond, une
seule taille de texte, action principale en beige). Mode clair inclus.

---

## 6. La barre de chat dans Actualité

Vous avez raison, et elle existe déjà : c'est le champ « Demandez l'impact
pour votre activité… » en bas de l'onglet. Elle était simplement invisible,
faute de style — elle passait pour un artefact en bas de page. Elle est
maintenant lisible et fonctionnelle. Rien retiré.

---

## 7. Page d'accueil

- **« + N autres tâches ouvertes »** : était en `text-white/40`, donc
  illisible. C'est maintenant une pastille beige, avec le chiffre en gras et
  un point animé.
- **Anneau de capacité mal placé** : la carte utilisait une grille dont la
  colonne de gauche s'étirait sur toute la largeur, ce qui projetait l'anneau
  contre le bord droit. Il est maintenant dans un module bordé, à côté du
  texte.

---

## 8. Page Vision

### Votre question : « l'expérience utilisateur sera bonne à ton avis ? »

Non, elle ne l'était pas, et votre intuition était la bonne. À l'ouverture, la
page empilait **onze blocs** : synthèse stratégique, séparateur, bloc
d'actions, trajectoire, climat du jour, quatre cartes de focus, cartes
reliées, miroir des connexions, insights, célébration, ressources.

Le code lui-même le reconnaissait — un commentaire laissé par une session
précédente admettait que deux de ces blocs couvraient le même terrain sous des
noms différents et qu'« une vraie fusion resterait à faire ».

Pour une page dont on attend une réponse simple — *ma Vision, et la prochaine
étape* — c'est trop.

### Ce qui a été fait

- Les actions **Créer dans le Studio · Ma trajectoire · Décisions · Piliers ·
  Mode Focus** remontent dans la barre d'outils, à côté du menu ⋮, comme vous
  l'avez demandé. Elles étaient noyées au milieu du contenu alors que ce sont
  des commandes de page.
- **« Votre trajectoire stratégique »** devient une fenêtre, ouverte par le
  bouton « Ma trajectoire » — exactement l'approche que vous suggériez.
  Affichée en permanence, elle repoussait plus bas la seule chose attendue.
- **Bouton transparent / chevauchement** (votre 3ᵉ capture) : le bouton beige
  « Voir mes axes » se plaçait juste sous le menu ⋮ et passait par-dessus son
  menu déroulant. Il est supprimé — son rôle est repris par « Piliers » dans
  la barre d'outils.
- Miroir, cartes reliées, insights et ressources passent sous un repli
  « Aller plus loin ». Rien n'est perdu, rien n'écrase l'entrée de page.

---

## 9. Couleur des cartes — « bleu transparent au lieu de blanc transparent »

Vous aviez raison. Le jeton de couleur était :

```css
--glass-bg: linear-gradient(135deg, rgba(69,103,164,0.20), rgba(255,255,255,0.10));
                                    ↑ un BLEU opaque à 20 %, en premier
```

Sur un fond déjà navy, la carte lisait « bleu transparent ». Corrigé : le
blanc passe en premier, le bleu ne sert plus que de profondeur en fin de
dégradé. Trois autres endroits partaient du même bleu (cartes de la page
Vision, cartes du Copilote) et sont réalignés sur le même jeton.

---

## 10. « C'est quoi JSON ? » / après inscription, rien n'est rempli

Le mot apparaissait dans Paramètres → « Télécharger toutes vos données JSON
(RGPD) ». C'est du jargon de développeur, à reformuler.

**Le vrai problème était plus grave** : l'onboarding ne demandait **jamais**
votre Vision. Il collectait quatre préférences, puis déposait l'utilisateur
sur une application entièrement vide — page Vision comprise, alors que c'est
elle que l'onboarding est censé amorcer. Aucun message de confirmation, aucune
indication de quoi faire ensuite. Votre « c'est bancal, je ne sais pas quoi
faire après inscription » décrivait exactement le code.

**Corrigé** : l'onboarding passe à deux étapes courtes. La seconde demande la
Vision, avec trois exemples cliquables. Elle est **enregistrée côté serveur**,
**confirmée à l'écran**, puis suivie d'une première action explicite.

Vérifié de bout en bout, pas supposé :

```
Onboarding → POST /api/onboarding
           → GET /api/vision  ✓ "Accompagner 1000 solopreneurs..."
           → page Vision      ✓ affiche la même phrase
```

---

## Vérifications faites avant livraison

- Frontend compilé sans erreur ni avertissement bloquant.
- Backend démarré, chaîne d'authentification complète testée : URL Google
  générée, lien magique émis et vérifié, session ouverte, onboarding
  enregistré, Vision relue, reconnexion conservant l'identité, jeton invalide
  refusé (401).
- Pages rendues et **inspectées visuellement** en 1440 px et 390 px : accueil,
  Vision, onboarding, onglet Actualité. Aucune erreur JavaScript.
- CSS syntaxiquement équilibré après suppression de 830 lignes.

---

## Points restants, en toute transparence

1. **Le backend reste un backend de démonstration** pour tout le reste.
   L'authentification, l'onboarding, la Vision et les préférences sont
   désormais réels et persistés. Le reste (tâches, pilotage, croissance,
   humeur) tombe encore dans la route fourre-tout qui répond `[]` : les pages
   affichent donc des états vides honnêtes. Les brancher demande de décider
   quel backend est la cible — c'est la prochaine décision à prendre.

2. **`@emergentbase/visual-edits`** est une dépendance de l'outil de
   prévisualisation, servie depuis `assets.emergent.sh`. Elle n'a rien à faire
   dans un build de production et constitue un risque de blocage du
   déploiement le jour où cet hébergeur devient indisponible. À retirer.

3. **Le mot « JSON »** dans Paramètres reste à reformuler (« Télécharger une
   copie de mes données »). Non fait : c'est votre décision de vocabulaire.

4. **Le bouton « Recevoir mon lien »** de la page de connexion est rouge/orange
   vif, seul élément de cette couleur dans une identité navy et beige. Signalé,
   pas modifié sans votre accord.
