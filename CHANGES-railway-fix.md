# Correction Railway — 29 août 2026

## Le bug corrigé
`railway.json` contenait une `startCommand` séparée du Dockerfile :
`"uvicorn server:app --host 0.0.0.0 --port $PORT"` — passée telle quelle
par Railway, sans interprétation shell, donc `$PORT` restait littéral
au lieu d'être remplacé par le vrai numéro de port. D'où l'erreur
`'$PORT' is not a valid integer`.

Le Dockerfile avait déjà la bonne commande (`sh -c "... --port
${PORT:-8000}"`), mais `startCommand` dans railway.json l'écrasait
avec la version cassée.

**Corrigé** : `startCommand` retiré de railway.json — le CMD du
Dockerfile (déjà correct) reprend le contrôle.

## Sur Mollie — pas fait, et voici pourquoi
Ce zip contient un backend de DÉMO volontairement minimal (298 lignes,
un seul fichier `server.py`), documenté comme tel dans son propre
commentaire d'en-tête : il ne remplace pas le vrai backend ZAYADO
(~80 routes, IA, OAuth, paiements). Aucune trace de Stripe, Mollie, ou
tout autre système de paiement n'existe dans ce zip — pas un oubli à
corriger, une absence structurelle assumée pour cet environnement de
preview.

Construire Mollie ici créerait du code jetable sur un backend qui
n'est pas fait pour durer. À faire sur le vrai backend de production
une fois précisé lequel des deux repos est la bonne cible.

## Vérifié
Frontend et backend compilent tous les deux sans erreur — aucun autre
bug trouvé dans ce zip.
