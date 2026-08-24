# Déploiement Zayado / MyExtension AI

## Domaines
- `zayado.net` : site public Zayado.
- `app.zayado.net` : application MyExtension AI. Le même conteneur peut servir l’application quand le hostname est `app.zayado.net`.
- `zayado.net/app/*` : chemin de secours pour ouvrir l’application si le sous-domaine n’est pas encore raccordé.

## Railway
1. Service `Principale` : dépôt `THESUSTAIN/ReactZayado`, branche `main`, Root Directory vide.
2. Ajouter `zayado.net` et `app.zayado.net` comme custom domains du même service si l’architecture reste fusionnée.
3. Ne pas créer de redirection HTTP de `app.zayado.net` vers `zayado.net` : le sous-domaine doit pointer vers Railway.
4. Pour un accès immédiat sans sous-domaine : `https://zayado.net/app/login`.
5. Service `WhatsApp-service` : Root Directory `/WhatsApp-service`, avec volume persistant `/data`.

## Build
Le Dockerfile compile `frontend` avec Vite puis copie `frontend/dist/*` dans `backend/static/`. `server.py` sert directement `backend/static` et ne monte l’ancien répertoire `backend/static/static` que s’il existe.
