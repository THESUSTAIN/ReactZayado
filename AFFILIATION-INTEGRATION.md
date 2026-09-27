# Affiliation — Changelog

## Vérifié avant tout portage

Avant de porter quoi que ce soit depuis `app-main/backend/routes/affiliate.py`,
j'ai vérifié ce qui existait déjà dans `server.py`. Trouvaille, même schéma
que pour Connexions : **le système existe déjà côté Zayado, en plus riche**
que celui d'`app-main` sur un point clé — 3 programmes (parrainage,
ambassadeur, affiliation) avec paliers de commission, au lieu d'un seul
programme d'affiliation générique. Déjà en place :

- Modèle `Referral`, colonnes `programme` / `code_parrainage` /
  `solde_commission` / `mois_offerts_dus` sur `User`.
- Routes utilisateur : `/parrainage/inviter`, `/parrainage/mes-filleuls`,
  `/programmes`, `/programmes/mon-programme`, `/programmes/demander`.
- Routes admin : `/admin/parrainage`, `/admin/programmes`,
  `/admin/programmes/{id}/valider`, `/admin/programmes/{id}/payer`.
- Page utilisateur complète `frontend/src/pages/Programmes.jsx` (code de
  parrainage, lien de partage, filleuls, paliers, demande d'accès aux
  programmes avancés).
- Fonctions API déjà présentes dans `kairosApi.js`
  (`fetchAdminProgrammes`, `validerProgramme`, `payerCommission`) —
  **mais inutilisées par aucun composant.**

Porter `affiliate.py` tel quel aurait créé un deuxième système de
commissions concurrent (une deuxième table, un deuxième calcul de palier).
Je ne l'ai pas fait.

## Ce qui manquait réellement, et qui a été ajouté

L'onglet admin « Parrainage » n'affichait que la liste brute des filleuls
(`/admin/parrainage`) — aucune vue sur les demandes d'accès en attente
(ambassadeur/affiliation) ni sur les commissions dues aux partenaires, alors
que le backend et les fonctions API existaient déjà pour ça.

### Ajouté

- **`frontend/src/pages/Admin.jsx`** — nouveau composant `Partenaires()`,
  affiché sous le tableau existant dans l'onglet « Parrainage » :
  - Liste des demandes en attente (`programme_demande`) avec bouton
    **Valider**.
  - Liste des partenaires (ambassadeur/affiliation) avec filleuls actifs,
    commission due, et bouton **Marquer payé** (remet le solde à 0, comme
    le fait déjà `/admin/programmes/{id}/payer`).
  - Import ajouté : `toast` (sonner, absent du fichier jusqu'ici),
    `fetchAdminProgrammes`, `validerProgramme`, `payerCommission` (déjà
    dans `kairosApi.js`), icônes `Crown`, `Euro`, `Loader2`.

Rien d'autre touché. Aucune nouvelle route, aucun nouveau modèle.

### Vérifié
- Équilibre des accolades/parenthèses/crochets sur `Admin.jsx` après
  modification.
- Pas de collision de nom (`Partenaires` n'existait pas ailleurs dans le
  fichier).

### Pas fait — écarts mineurs avec app-main, à trancher si tu les veux
- **Paliers d'affiliation non éditables depuis l'admin** : `app-main` a
  `PUT /affiliate/admin/tiers` ; côté Zayado, `AFFILIATION_PALIERS` est en
  dur dans `server.py`. Petite route à ajouter si tu veux les régler sans
  toucher au code.
- **Pas de demande de retrait initiée par le partenaire** : `app-main`
  permet à l'affilié de choisir une méthode (virement/PayPal/crédits) et de
  déclencher lui-même le retrait (`POST /affiliate/request-payout`, seuil
  10 €). Côté Zayado, c'est l'admin qui décide seul de marquer payé — plus
  simple, mais le partenaire ne peut pas demander activement.
