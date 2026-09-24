# Anciens tests (archivés)

Ces tests appelaient un serveur en ligne (ancienne URL de préproduction « kairos »,
comptes de démo sara@zayado.fr, test.analyse@zayado.local…). Ils échouaient hors de
cet environnement (71 faux négatifs). Ils sont gardés pour mémoire mais ne sont plus
lancés par défaut.

Pour les relancer contre un serveur réel :
`ZAYADO_LIVE_TESTS=1 ZAYADO_BACKEND_URL=https://… pytest tests/archive_serveur_distant`

La suite à jour est dans `backend/tests/` (tests autonomes, sans serveur ni réseau).
