FROM node:20-bookworm-slim AS build

WORKDIR /app

# L'application appelle toujours /api sur son origine. Le proxy nginx du
# conteneur frontal relaie ensuite ces requêtes vers le backend Railway privé.
# Cette valeur écrase volontairement toute ancienne variable Railway
# REACT_APP_BACKEND_URL qui pointerait vers api.zayado.net.
ENV REACT_APP_BACKEND_URL=""

COPY package.json ./
# Corrigé : aucun yarn.lock n'a jamais été généré pour ce projet, et il
# contient une dépendance privée (assets.emergent.sh) injoignable depuis
# mon environnement pour en générer un complet. --frozen-lockfile exigeait
# un fichier qui n'existe pas — install classique à la place, qui
# fonctionne sans lockfile préexistant.
RUN yarn install

COPY . .
# Filet de sécurité : un modèle TypeScript/Vite (« farm-ts ») a été copié par
# erreur dans le dépôt. Ses fichiers font échouer react-scripts (tsconfig.json +
# jsconfig.json). On les retire avant le build : l'application est en JavaScript.
RUN rm -f tsconfig.json tsconfig.*.json vite.config.ts vite.config.js index.html .oxlintrc.json \
      src/App.tsx src/main.tsx src/vite-env.d.ts \
 && find src -name "*.tsx" -delete \
 && find src -name "*.ts" ! -name "*.d.ts" -delete
# Cache de compilation vidé à chaque build : sinon d'anciennes classes CSS
# peuvent revenir (ex. champs blancs sur la page de connexion).
RUN rm -rf node_modules/.cache && yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Les fichiers *.template de ce répertoire sont interpolés par
# 20-envsubst-on-templates.sh avec les variables Railway fournies au runtime.
ENV PORT=80
# Valeur sûre pour éviter un échec nginx local si BACKEND_URL est oublié.
# Sur Railway, remplacer par l'URL privée du service kairos-backend.
ENV BACKEND_URL=http://127.0.0.1:8001
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/05-backend-default.envsh /docker-entrypoint.d/05-backend-default.envsh
# L'entrypoint nginx IGNORE les scripts non exécutables (y compris .envsh).
RUN chmod +x /docker-entrypoint.d/05-backend-default.envsh
# Filet de sécurité : si le script ne tournait pas, nginx démarre quand même
# (resolver Docker par défaut) au lieu de planter en boucle.
ENV NGINX_RESOLVER=127.0.0.11
# Seules ces trois variables sont substituées : les $uri, $host… de nginx restent intacts.
ENV NGINX_ENVSUBST_FILTER="^(PORT|BACKEND_URL|NGINX_RESOLVER)$"
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
