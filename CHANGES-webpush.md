# Corrections — Web Push VAPID : envoi réel câblé

Le code d'envoi (`routes/push.py::send_push_to_user`) existait déjà, complet
et fonctionnel, mais n'était appelé nulle part sauf par l'endpoint de test
manuel. Deux points d'accroche réels et déjà existants dans le code ont été
câblés — pas de nouvelle fonctionnalité inventée, juste le fil manquant
entre du code déjà là.

## `routes/churn_cron.py`
`_send_inactivity_alert` envoie maintenant un push (en plus de l'email
existant) pour les tiers 14j et 60j — pas le tier 335j (avertissement légal
RGPD de suppression de compte, pas une relance d'engagement). Respecte les
préférences utilisateur (`family="reminders"`), pointe vers `/vision-board`
au tap.

## `routes/hot_opportunities.py`
Le scan cron Reddit (déjà réel, déjà tournant toutes les 6h) détectait et
sauvegardait des opportunités sans jamais notifier personne — l'utilisateur
ne les découvrait qu'en rouvrant l'app. Un push est envoyé quand une nouvelle
opportunité à score ≥70 est détectée (seuil pour éviter le spam ; une seule
notif même si plusieurs bonnes opportunités arrivent dans le même cycle).
`family="business"`, pointe vers `/croissance`.

## Correction honnête sur un autre point de la liste
"Historique/versioning (les snapshots existent côté API → à exposer en UI)"
— **vérifié, c'est faux**. Il n'existe que `live_snapshot` (détection de
péremption du flipbook Vision Board) et `SCORE_SNAPSHOT_KEY` (dernier score,
pour calculer un delta) — ni l'un ni l'autre n'est une liste d'historique
versionné exposable. Un vrai historique demande : table de snapshots
horodatés, cron de sauvegarde périodique, endpoint de liste, UI de
comparaison — un chantier complet, pas une UI à brancher sur une API
existante. Pas fait dans ce lot.

## Pas testé en conditions réelles
Comme pour tout ce qui touche Brevo/push dans cette session : pas d'accès
réseau à Railway/VAPID depuis mon environnement. Vérifié uniquement par
compilation Python (`py_compile`) — à valider par un vrai envoi en dev/prod.

## Reste non traité de la liste complète
OAuth réel, Mollie réel, Agent Prospection RGPD (opt-in/journal/purge),
E4 (réponse IA dans Gmail), coût IA (routing/cache/budget), métriques
activation/rétention, Timeline/KPI Vision, Export PDF/image, Packs IA
phares, Passeport/Gamification UI, E7 (publication stores), sécurité
(audit JWT/rate-limiting/secrets/chiffrement), observabilité prod, tests CI.
