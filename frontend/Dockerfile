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
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Les fichiers *.template de ce répertoire sont interpolés par
# 20-envsubst-on-templates.sh avec les variables Railway fournies au runtime.
ENV PORT=80
# Valeur sûre pour éviter un échec nginx local si BACKEND_URL est oublié.
# Sur Railway, remplacer par l'URL privée du service kairos-backend.
ENV BACKEND_URL=http://127.0.0.1:8001
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
