# Corrections + audit — 29 août 2026 (2ᵉ passe)

---

## 0. Un bug que j'ai introduit hier, et que je corrige

Mon nettoyage CSS a inséré des espaces dans l'URL Google Fonts :
`Cormorant+Garamond:ital, wght@0, 400` au lieu de `ital,wght@0,400`.
Repéré avant votre déploiement. Corrigé.

---

## 1. Vos questions, mes réponses

### « L'accueil mobile, ce choix est-il meilleur ? » — casquette investisseur

**Oui, mais votre intuition de départ était bonne et je l'ai reprise autrement.**

Vous vouliez que l'app se comporte comme une application mobile, avec l'IA au
centre. C'est juste. Mais mettre le **chat en page d'accueil** ne produit pas
cet effet — il le sabote :

- Un nouvel inscrit ouvre un chat **vide**, sans savoir quoi taper. Zéro signal,
  zéro preuve de valeur. C'est le premier motif d'abandon d'un SaaS.
- Notion, Linear, Superhuman, Slack : aucun ne met son IA en page d'accueil.
  L'accueil montre **l'état**, l'IA est un **bouton toujours accessible**.
  L'IA omniprésente vaut mieux que l'IA en page d'accueil.
- Un investisseur qui ouvre votre app et voit un chat vide voit un chatbot de
  plus. S'il voit « Ce qui compte maintenant : *lister les 10 clients qui
  pourraient repasser en mensuel* », il voit un produit qui a un point de vue.

**Ce que j'ai fait** : l'accueil montre l'état, et le Copilote devient le
**bouton central surélevé** de la navigation basse — le geste réflexe des
applications mobiles. Votre intuition mobile-first est respectée, sans cacher
l'application.

### « Le rouge : pourquoi dans la landing et pas dans l'app ? »

Il y en avait dans les deux — mais **deux rouges différents** : `#E23524` sur la
landing, `#DD2A33` dans l'app. Un utilisateur qui passe de la page de vente à son
espace change de marque sans le savoir.

Corrigé : un seul `--brand-red`, partagé. Et un rouge d'**alerte** volontairement
distinct : confondre « nouveau » et « en retard » dans la même couleur est une
faute d'interface, pas une économie.

### « La landing s'ouvre alors que l'utilisateur est déjà inscrit — c'est normal ? »

Non. Il n'y avait **aucune garde** sur `/bienvenue` ni sur `/login`. Un client
inscrit qui tapait votre domaine retombait sur la page de vente. Corrigé — avec
une exception nécessaire : un retour de lien magique ou de Google atterrit sur
`/login`, il ne faut pas le rediriger à cet instant, sinon un ancien jeton
périmé empêcherait définitivement de se reconnecter.

### « Les étapes de la landing sont-elles correctes ? »

Non, et c'était le problème le plus coûteux. L'étape 02 promettait :

> « L'IA structure votre vision en priorités concrètes et rentables. »

L'application ne le faisait pas. Elle enregistrait une phrase, puis déposait
l'utilisateur sur une app vide. **Une promesse non tenue à la première minute
d'usage.** C'est maintenant vrai (voir §2), et les trois étapes décrivent le
parcours réel, vérifié écran par écran.

### « La barre de chat dans Actualité, tu trouves ça nécessaire ? »

**Non.** J'avais mal lu votre note précédente, vous aviez raison de me
reprendre. Deux barres de chat dans le même panneau — une par onglet — et
l'utilisateur ne sait plus dans quelle conversation il écrit. Un seul champ de
saisie par panneau : c'est la règle. Les quatre actions du Signal du jour
basculent maintenant vers l'onglet Discussion avec leur contexte.

### « La couleur du chat est-elle bien celle de l'app ? On dirait plus sombre. »

Vous voyiez juste. Le Copilote utilisait `linear-gradient(180deg, #172C5C,
#0B1F3A)` — deux arrêts, sans les halos radiaux du fond de l'app, et sans le
`#081734` final. **Plus sombre et plus plat**, mesurable. Même remarque pour la
fenêtre « Ma trajectoire ». Les deux utilisent désormais `--app-deep`, la
formule exacte de l'application.

### « La couleur de l'onboarding est mauvaise, l'app n'a pas cette couleur »

Exact : `#0A1128`, un navy quasi noir **qui n'existe nulle part ailleurs** dans
le produit. Le premier écran après l'inscription ne ressemblait pas à
l'application dans laquelle il fait entrer. Corrigé.

### « Trop de typographies, c'est bizarre »

**7 familles** se disputaient les pages : Outfit, Manrope, Plus Jakarta Sans,
Cormorant Garamond, Geist, Sora, Inter. Et **Sora et Inter n'étaient même pas
chargées** — le navigateur les remplaçait en silence. Votre impression venait
donc en partie de polices que personne n'avait choisies.

Système désormais, documenté dans le CSS :

| Rôle | Famille |
|---|---|
| Titres | **Outfit** |
| Texte, interface, boutons | **Plus Jakarta Sans** |
| Citation de Vision, uniquement | **Cormorant Garamond** |

Vérifié page par page après build : 2 familles partout, 3 sur Mindset (la
citation).

### « L'icône Espace, le nom est-il correct ? Et Mouvement ? »

Vous aviez raison sur les deux :

- « **Espace** » portait une icône de grille et ouvrait en réalité la page
  **Collaborateur**. Ni le nom ni l'icône ne disaient où l'on allait.
- « **Mon Mouvement** » — l'exécution, le cœur quotidien du produit — n'était
  accessible par **aucune entrée de menu**.
- Le **Copilote**, argument central du produit, n'avait pas d'entrée non plus.

Nouvelle navigation : **Aujourd'hui · Vision · [Copilote] · Mouvement ·
Croissance**. DAF IA, Mindset et Collaborateur rejoignent le menu Modules —
où DAF IA et Mindset **manquaient également**.

Sur PC, l'entrée Copilote de la barre latérale avait une bordure en pointillés :
elle ressemblait à un emplacement vide ou à une fonction désactivée. Traitée
comme le bouton central du mobile.

### « Le bouton Collaborer s'ouvre mal, design sombre »

Ses **44 règles de style n'existaient que dans les blocs mobiles supprimés**.
Autrement dit : cette fenêtre était **déjà cassée sur PC avant mon
intervention** — vous ne l'aviez simplement jamais ouverte sur grand écran.
Même cause exacte que la page Actualité.

Reconstruite une seule fois, pour PC et mobile, avec le fond de l'app et — comme
vous le suggériez — **un lien vers la page `/collaborateur`** : la fenêtre
recueille un besoin, la page montre le suivi. Les deux devaient être reliées.

---

## 2. L'IA configure maintenant le cockpit

C'est le changement le plus important de cette passe.

**Le parcours, vérifié de bout en bout :**

1. L'utilisateur écrit sa Vision en une phrase.
2. L'IA la lit et propose **3 axes stratégiques + 1 premier jalon + 1 première
   action**.
3. L'écran affiche : *« L'IA propose · vous décidez — voici un point de départ,
   pas une vérité »*. Trois choix : installer, redemander, refuser.
4. À la validation seulement, tout est écrit.
5. L'accueil affiche alors la vraie priorité, la page Vision les vrais axes.

**Ce que le prompt interdit explicitement** : inventer un chiffre, un montant,
une date ou un nom de client. Si la Vision est vague, l'IA propose une structure
qui aide à la préciser — elle ne fabrique pas un business plan.

**Si l'IA est indisponible**, l'écran le dit et rappelle que la Vision est
enregistrée. Aucune structure générique ne se fait passer pour une analyse.

Vérifié avec un faux service IA local, chaîne complète :

```
Vision → proposition affichée → validation → GET /api/vision/pillars ✓ 3 axes
                                          → GET /api/strategy/overview ✓ jalon + tâche
                                          → accueil ✓ « Faire avancer "Lister les 10 clients…" »
```

**Bug trouvé en chemin** : le frontend appelle `/api/tasks` (champ `label`), pas
`/api/taches`. La tâche créée par l'IA était bien enregistrée mais l'accueil ne
la voyait **jamais**. Routes alignées sur le contrat réel du frontend.

**Une variable de plus dans Railway** : `MAMMOUTH_API_KEY`. Sans elle, tout
fonctionne — l'écran dit simplement que l'IA n'est pas configurée.

---

## 3. Audit — deux profils, comme demandé

Parcours automatisé sur 8 pages, deux profils, mesures réelles.

### Profil 1 — se lance tout juste (mobile 390 px, compte vide)

| Page | Erreurs JS | Erreurs API | Débordement | Contraste | Polices |
|---|---|---|---|---|---|
| 8 pages | **0** | **0** | **aucun** | **0 faute** | 2 |

**Bug réel trouvé et corrigé** : sur `/contexte`, quatre onglets en flex sans
retour à la ligne. Sur mobile, « Croissance » et « Agents IA » sortaient de
l'écran et étaient **tout simplement inatteignables**.

**Ce qu'il voit** : 8 états vides sur l'accueil, 8 sur Vision — normal, son
compte est vide, et l'onboarding IA les remplit dès qu'il écrit sa Vision.

### Profil 2 — activité en cours (PC 1440 px, vision + axes + jalon + 4 tâches)

| Page | Erreurs JS | Erreurs API | Débordement | Contraste | Polices |
|---|---|---|---|---|---|
| 8 pages | **0** | **0** | **aucun** | **0 faute** | 2 |

Toutes les pages se remplissent correctement avec de vraies données.

### Fautes de contraste : 30 corrigées

L'audit a mesuré du texte blanc à **30–45 % d'opacité** sur navy, en 10 et 11 px.
Soit un rapport de contraste d'environ **2,3:1** — le minimum WCAG AA est de
**4,5:1**. Concrètement : « 4 tâches ouvertes », les libellés de colonnes de
Pilotage, « Vision → Décision → Mission » étaient à la limite de l'invisible.

**132 classes relevées** dans tout le code. Nouvelle mesure après correction :
**0 faute sur les 8 pages, pour les deux profils**. Les champs de saisie
gardent volontairement un placeholder plus discret.

### Reste, assumé

Les rangées d'onglets de Mon Mouvement et Croissance défilent horizontalement
sur mobile : c'est voulu, mais rien n'indiquait que des onglets existaient hors
écran. Un dégradé de fondu a été ajouté comme indice visuel.

---

## 4. Verdict : est-ce prêt pour la production ?

**Sur la forme : oui.** Zéro erreur JavaScript, zéro erreur API, zéro
débordement, zéro faute de contraste, deux typographies, une seule identité
colorée, sur 8 pages et deux profils.

**Sur le fond : il manque une chose, et elle ne dépend plus de moi.**

L'application repose toujours sur un backend dont **seules** l'authentification,
l'onboarding, la Vision, les axes, les jalons, les tâches et les préférences
sont réels. Croissance, Pilotage, Bien-être et Collaborateur tombent encore dans
la route fourre-tout qui répond `[]` — leurs pages affichent des états vides
honnêtes, mais vides.

Pour votre **profil 1** (qui se lance), c'est acceptable : il n'a de toute façon
ni chiffre d'affaires ni prospects. **Il peut utiliser le produit dès demain.**

Pour votre **profil 2** (compétences et clients), c'est bloquant. Il arrive avec
des factures, des prospects, une trésorerie — et trouve quatre pages vides.
Il ne restera pas.

**La décision qui reste** : vous avez, dans `finalmain 13.zip`, un backend
complet — 60+ fichiers de routes (finance, growth, CRM, notifications, agents).
La suite logique n'est pas d'écrire du code, c'est de **choisir la cible** :
brancher ce backend-là, ou continuer à faire grossir celui-ci route par route.

Je peux faire l'un ou l'autre. Mais tant que ce choix n'est pas fait, tout code
écrit d'un côté risque d'être jeté de l'autre.

---

## 5. À faire de votre côté avant déploiement

Aux 7 variables Railway de la passe précédente, ajoutez :

| Variable | Effet si absente |
|---|---|
| `MAMMOUTH_API_KEY` | L'IA ne configure pas le cockpit — l'écran le dit honnêtement, rien ne casse |

Rappel des précédentes : `JWT_SECRET`, `APP_BASE_URL`, `GOOGLE_CLIENT_ID/SECRET`,
`MICROSOFT_CLIENT_ID/SECRET`, `BREVO_API_KEY`, `MAIL_FROM`, **`DATA_DIR`**
(un volume — sinon les comptes disparaissent à chaque déploiement).

Diagnostic après déploiement : `app.zayado.net/api/auth/config`.

---

## 6. Points non traités, volontairement

1. **`@emergentbase/visual-edits`** — dépendance de l'outil de prévisualisation,
   servie depuis `assets.emergent.sh`. Elle n'a rien à faire dans un build de
   production et peut bloquer un déploiement le jour où cet hébergeur tombe.
   Je ne l'ai pas retirée sans votre accord : vous en avez peut-être encore
   besoin en preview.

2. **Le mot « JSON »** dans Paramètres → « Télécharger toutes vos données JSON ».
   Jargon de développeur. « Télécharger une copie de mes données » suffirait —
   mais c'est votre vocabulaire, pas le mien.

3. **Le bouton rouge vif « Recevoir mon lien »** sur la page de connexion, seul
   élément de cette couleur dans une identité navy et beige.
