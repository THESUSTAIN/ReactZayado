# Studio Zayado — studio.zayado.net
# Contexte de build = RACINE du dépôt (le Studio réutilise les composants de frontend/src).
# Railway : Root Directory vide, Config File = studio/railway.json.

# 1) Interface : build Vite de frontend/studio/index.html
FROM node:20-bookworm-slim AS build
WORKDIR /app/frontend
ENV DISABLE_VISUAL_EDITS=true DISABLE_EMERGENT_OVERLAY=true DISABLE_HOT_RELOAD=true
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --network-timeout 600000
COPY frontend/ ./
RUN npx vite build --config vite.studio.config.ts

# 2) Service : FastAPI (Vidéos IA + relais vers l'application + interface)
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY studio/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY studio/app.py studio/heygen_routes.py studio/auth_microsoft.py ./
COPY --from=build /app/frontend/dist-studio ./dist
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]
