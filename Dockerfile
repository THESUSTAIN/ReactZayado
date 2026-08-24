FROM python:3.11-bullseye

# System deps + Node.js 20 + yarn
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libstdc++6 curl build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip install --upgrade pip
RUN pip install --no-binary greenlet "greenlet>=3.1.1,<4.0.0"
RUN pip install -r backend/requirements.txt
# emergentintegrations est un dépôt de paquets privé (plateforme Emergent), utilisé
# uniquement comme repli optionnel si le fournisseur IA principal (Mammouth) échoue —
# jamais chargé au démarrage, seulement importé à l'intérieur d'une fonction et déjà
# protégé par une vérification de clé (EMERGENT_LLM_KEY). Si ce dépôt privé est
# injoignable depuis les serveurs de build Railway, ça ne doit PAS faire échouer
# tout le build de l'image — d'où le "|| echo" : le build continue, seul le repli
# Emergent sera indisponible (Mammouth reste pleinement fonctionnel).
RUN pip install emergentintegrations==0.2.0 --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ \
    || echo "⚠️  emergentintegrations non installé (dépôt privé injoignable) — le repli Emergent sera indisponible, Mammouth reste actif."

# Frontend — Vite/React. Le backend sert le build statique sur la même origine.
# VITE_API_URL vide : les appels relatifs /api fonctionnent directement derrière FastAPI.
RUN cd frontend && yarn install --network-timeout 600000
RUN cd frontend && VITE_API_URL= VITE_SAAS_URL=https://app.zayado.net VITE_WP_URL=https://cms.zayado.net yarn build
RUN mkdir -p backend/static && cp -r frontend/dist/* backend/static/

EXPOSE $PORT

CMD cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
