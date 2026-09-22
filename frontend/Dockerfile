FROM node:20-bookworm-slim AS build

WORKDIR /app
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

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
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
