# ──────────────────────────────────────────────────────────────────
# ZAYADO / MyExtension Business — Déploiement MONO-SERVICE (Railway)
# 1) build du frontend React (CRA)  2) backend FastAPI qui sert l'API
#    /api ET le build statique du frontend sur la même origine.
# NB: on copie les dossiers ENTIERS (frontend/ et backend/) pour éviter
#     les erreurs "file not found" de COPY granulaire. node_modules et
#     build sont exclus via .dockerignore.
# ──────────────────────────────────────────────────────────────────

# ---- Stage 1 : build du frontend ----
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend ./
# API sur la même origine : URL relative "/api" (backend URL vide)
ENV REACT_APP_BACKEND_URL="" \
    DISABLE_ESLINT_PLUGIN=true \
    CI=false
RUN yarn install --network-timeout 600000 && yarn build

# ---- Stage 2 : backend + service du build ----
FROM python:3.11-slim AS app
WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
COPY backend ./
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
# Le build React est copié où le backend le sert (backend/frontend_build)
COPY --from=frontend /frontend/build ./frontend_build
ENV FRONTEND_BUILD_DIR=/app/backend/frontend_build \
    PORT=8000
EXPOSE 8000
# Railway fournit $PORT ; on s'y lie en 0.0.0.0
CMD ["sh","-c","uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
