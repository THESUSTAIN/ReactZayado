FROM node:20-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./server.js

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV WA_DATA_PATH=/data/.wwebjs_auth

# IMPORTANT (correctif Railway) : Railway monte le Volume sur /data en
# appartenant a root. En tournant en USER node, whatsapp-web.js (LocalAuth) ne
# peut pas ecrire dans /data -> EACCES -> crash en boucle ("error mode").
# On reste donc root (Chromium tourne deja avec --no-sandbox, cf. server.js) et
# on garantit l'existence du dossier de session AU DEMARRAGE (apres le montage
# du volume), pas seulement au build.
RUN mkdir -p /data/.wwebjs_auth

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "mkdir -p \"$WA_DATA_PATH\" && exec node server.js"]
