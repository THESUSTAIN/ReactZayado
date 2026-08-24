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
RUN mkdir -p /data/.wwebjs_auth && chown -R node:node /app /data

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
