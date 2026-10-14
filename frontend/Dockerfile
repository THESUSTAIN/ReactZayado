# Frontend Zayado — build Vite + TypeScript, servi par nginx (Railway).
# Remplace l'ancien Dockerfile CRA qui SUPPRIMAIT tous les .ts/.tsx avant le build
# (raison pour laquelle les nouvelles pages n'arrivaient jamais en production).
FROM node:20-bookworm-slim AS build
WORKDIR /app
# Plugins de prévisualisation Emergent : jamais dans le build de production.
ENV DISABLE_VISUAL_EDITS=true DISABLE_EMERGENT_OVERLAY=true DISABLE_HOT_RELOAD=true
COPY package.json yarn.lock* ./
RUN yarn install --network-timeout 600000
COPY . .
RUN yarn build

FROM nginx:1.27-alpine
# nginx.conf utilise ${PORT}, ${BACKEND_URL}, ${NGINX_RESOLVER} (envsubst de l'image officielle).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/05-backend-default.envsh /docker-entrypoint.d/05-backend-default.envsh
RUN chmod +x /docker-entrypoint.d/05-backend-default.envsh
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=80 NGINX_ENVSUBST_FILTER="PORT|BACKEND_URL|NGINX_RESOLVER"
EXPOSE 80
