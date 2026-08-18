# Cap Vivant — corrections sur la base "corrigé4-audité" (18/08)

Cette base est nettement plus avancée que ce que j'avais vu jusqu'ici
(vraie auth MySQL, onboarding réel, traçabilité Cap→Décision→Mission,
appartenance TheSustain, Campus isolé par compte). L'audit fourni
(`AUDIT-FONCTIONNEL.md`) est du bon travail — la plupart des points
signalés "à corriger" y sont déjà résolus (libellés de trajectoire Mon
Cap, placement du repère de sens/citation). Je n'ai pas eu besoin de
refaire ce travail-là.

## Ce que j'ai vérifié et corrigé (pattern récurrent sur toutes les
branches de ce projet)

- **Déploiement Railway** : aucun fichier à la racine (seulement dans
  `backend/`). Ajouté `Dockerfile` (racine), `railway.json`, `.dockerignore`.
- **`.gitignore`** : absent à la racine. Créé, avec le pattern `*.db`
  (aucune DB n'était committée cette fois — bon signe, contrairement aux
  branches précédentes).
- **Fond de Campus** : toujours son propre dégradé (`#071330`/`#05081a`)
  au lieu du `.sky-bg` partagé — cette correction, faite sur une autre
  branche il y a peu, n'était pas encore fusionnée ici. Réappliquée.

## Déjà bon sur cette branche (vérifié, pas retouché)
- Logos dupliqués dans le Header : déjà corrigé
- Teinte des cartes de Mon Cap : déjà corrigée (verre neutre, pas de bleu tiers)
- Build frontend propre, 5 tests de contrat passent

## Les deux points vraiment bloquants (signalés par l'audit, confirmés,
## je ne peux pas les corriger depuis un zip)

1. **Base MySQL distante refusée** (`1045 Access denied`) — c'est un
   problème d'identifiants dans l'environnement Railway, pas de code.
   Les tests authentifiés dans l'audit ont tourné sur SQLite local à la
   place. À vérifier avec les vrais identifiants de production.
2. **Aucune clé IA configurée pour Campus** (`EMERGENT_LLM_KEY` /
   `MAMMOUTH_API_KEY` absentes) — la simulation Campus retourne un 502
   honnête plutôt que d'inventer une réponse. Il faut ajouter l'une de
   ces clés dans les variables d'environnement Railway pour que Campus
   fonctionne de bout en bout.

Aucun des deux ne se corrige en modifiant du code dans ce zip — ce sont
des secrets/accès à configurer côté hébergement.

## Chat — pièces jointes, capture d'écran, génération d'image (suite)

Demandé de porter les fonctionnalités "créer des images / insérer des
pièces jointes / capturer" depuis `app-main` (autre projet de la même
famille, beaucoup plus avancé sur le chat). Fait, avec deux vrais bugs
trouvés au passage :

1. **Upload de fichiers cassé** : le frontend appelait `/chat/uploads`
   (pluriel, avec `session_id` en query param) — route qui n'existe pas
   côté serveur. Le vrai endpoint est `/chat/upload` (singulier,
   authentifié par JWT, déjà présent et fonctionnel dans ce backend).
   Corrigé.
2. **Plus grave — le contenu des pièces jointes n'atteignait jamais
   l'IA** : même une fois "uploadé" avec succès, seul le NOM du fichier
   était envoyé dans le message — jamais le texte extrait (PDF, DOCX...).
   L'IA ne "voyait" donc jamais le contenu réel d'un document joint.
   Corrigé : le texte extrait est maintenant injecté dans le message
   envoyé à l'IA (invisible dans la conversation affichée, pour ne pas la
   polluer).

**Ajouté** :
- **Génération d'image** (bouton "Image" dans la barre du chat) —
  branchée sur `/chat/image` (Mammouth AI/Gemini), qui existait déjà
  côté serveur mais n'était utilisé par aucune page. Coûte 8 crédits
  (les nouveaux comptes démarrent avec 180 — fonctionnel dès l'inscription).
- **Capture d'écran** (bouton caméra) — même mécanisme que `app-main`
  (`getDisplayMedia` du navigateur), rebranché sur l'upload réel de ce
  projet plutôt que copié tel quel.

Les deux respectent le consentement explicite du navigateur (rien n'est
capturé/généré sans un geste de l'utilisateur), et dégradent proprement
en cas d'échec (message d'erreur clair, jamais une fausse image/réponse).
