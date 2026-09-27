# Intégration Newsletters (Lot 4) dans la base « Ma Foi » — Changelog

## ⚠️ Le zip `Zayado-Lot4-Newsletters.zip` ne pouvait PAS être appliqué tel quel

Son propre `LOT4-CHANGELOG.md` dit de remplacer directement `server.py`,
`commerce_ext.py`, `emails_ia_ext.py`, `Admin.jsx` et `kairosApi.js` par les
fichiers du zip. **Je ne l'ai pas fait** : en diffant ces fichiers contre ta
base actuelle (`ReactZayado-final-lot-mafoi.zip`), j'ai trouvé que le Lot 4
a été construit à partir d'un état du repo **plus ancien** que ta base —
exactement le même type de bug que celui que le Lot 4 décrit s'être produit
entre ses propres Lots 2 et 3. Si j'avais écrasé les fichiers comme demandé,
tu aurais perdu, silencieusement :

- Le programme partenaires à 3 niveaux (parrainage / ambassadeur /
  affiliation) et ses paliers de commission (`PROGRAMMES`,
  `AFFILIATION_PALIERS`, table `Referral` enrichie) — remplacé dans le zip
  Lot 4 par un système de « crédits » plus simple et antérieur.
- La table `AccueilChoix` et sa carte KPI dans l'admin (« Oui, je veux ça »
  / « Pas encore »).
- La tarification TTC (`fondateur`/`ttc`) dans `commerce_ext.py`.
- L'en-tête email commun (`_email_wrap`, logo Zayado) utilisé par plusieurs
  autres modules.
- Tout ce qu'a ajouté la fusion « Ma Foi » (voir
  `MAFOI_FUSION_CHANGELOG.md`) et son alias de variables d'admin bootstrap
  (`ADMIN_EMAIL`/`admin_email`/`BOOTSTRAP_ADMIN_EMAIL`).

`emails_ia_ext.py` était en revanche strictement identique entre les deux —
aucune perte de ce côté.

## Ce qui a réellement été fait

Plutôt qu'un remplacement, j'ai extrait uniquement l'ajout newsletters et
l'ai greffé sur ta base actuelle :

- **`backend/newsletters_ext.py`** — copié tel quel depuis le Lot 4 (fichier
  neuf, aucun conflit). Vérifié que toutes ses dépendances
  (`_client_llm`, `_assert_safe_email`, `exiger_role`, `async_session`,
  `_uid`, `Base`, `api`, `get_db`, `utcnow`, `new_uuid`) existent bien dans
  ton `server.py` actuel — c'est le cas, elles sont inchangées depuis la
  version dont le Lot 4 est parti.
- **`backend/server.py`** — ajout des 3 lignes de branchement uniquement
  (import + `install_newsletters(globals())`), juste après le branchement
  d'Emails IA. Rien d'autre touché.
- **`frontend/src/components/admin/AdminNewsletters.jsx`** — copié tel quel
  (fichier neuf).
- **`frontend/src/lib/kairosApi.js`** — ajout des 6 fonctions d'API
  newsletters (`fetchNewsletters`, `fetchNewsletter`, `majNewsletter`,
  `relancerNewsletter`, `rejeterNewsletter`, `pousserNewsletterBrevo`) à la
  fin du fichier ; elles réutilisent le helper `jsendMsg` déjà présent.
- **`frontend/src/pages/Admin.jsx`** — 5 ajouts ciblés : import de l'icône
  `Sparkles`, import du composant `AdminNewsletters`, entrée `newsletters`
  dans `ONGLETS`, icône associée, ligne de rendu conditionnel. Le reste du
  fichier (parrainage à paliers, carte KPI Accueil, etc.) n'a pas été
  touché.
- **`commerce_ext.py`** — non modifié : la version de ta base (avec la
  tarification TTC) est plus récente que celle du Lot 4, gardée telle quelle.

## Vérifications faites

- `server.py` et `newsletters_ext.py` compilent (`py_compile`, aucune erreur
  de syntaxe Python).
- Parenthèses/accolades de `newsletters_ext.py` équilibrées.
- Toutes les fonctions/objets globaux requis par `newsletters_ext.py`
  existent dans `server.py` avec les mêmes noms.
- `httpx` déjà présent dans `requirements.txt` (0.28.1).
- `sonner` (utilisé par `AdminNewsletters.jsx`) déjà dans `package.json`.
- Le préfixe `/api/webhooks/` est bien exempté d'authentification dans ce
  repo (comme le suppose `newsletters_ext.py` pour son webhook Brevo
  entrant) — vérifié à la ligne où `PUBLIC_PATHS`/équivalent liste les
  préfixes exemptés.

Pas d'environnement Node/JSX pour compiler le frontend ici (pas d'accès
réseau pour installer un parseur) : les 5 édits d'`Admin.jsx` ont été relus
à la main, ils sont minimes et suivent exactement le patron déjà utilisé
pour l'onglet « Emails IA » juste au-dessus.

## Pour activer Newsletters (rappel du Lot 4)

1. Configure Brevo Inbound Parse pour poster vers
   `https://<ton-domaine>/api/webhooks/newsletters/inbound-brevo`
   (+ `BREVO_INBOUND_SECRET` optionnel en variable d'env).
2. Chaque email reçu est réécrit par l'IA et apparaît dans l'onglet
   **Newsletters** de l'admin, statut « Brouillon ».
3. Relecture/édition puis « Pousser dans Brevo » → brouillon de campagne
   Brevo (`BREVO_API_KEY`) → envoi final fait dans Brevo.

## Toujours en attente (annoncé dans le texte reçu)

Connexions (OAuth Google/Microsoft), Affiliation, Feedback/Support, Logs
applicatifs — à porter depuis `app-main` (`routes/integrations.py`,
`routes/affiliate.py`, `routes/support.py`, `AppLogsTab.js`), lot par lot,
comme convenu. `app-main` a été reçu et inspecté (structure du repo
confirmée : `routes/newsletters.py`, `routes/integrations.py`,
`routes/affiliate.py`, `routes/support.py` bien présents), mais aucun
portage supplémentaire n'a été fait dans ce lot — dis-moi lequel enchaîner.
