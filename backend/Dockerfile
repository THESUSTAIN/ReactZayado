FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY . .

EXPOSE 8001
# IPv4 + IPv6 quand le conteneur a l'IPv6 (réseau privé Railway, parfois
# IPv6 uniquement : avec 0.0.0.0 seul, le frontend ne joignait pas le backend
# → 502). Repli 0.0.0.0 si l'IPv6 est absente, pour ne jamais bloquer le démarrage.
CMD ["sh", "-c", "if [ -f /proc/net/if_inet6 ]; then H='::'; else H='0.0.0.0'; fi; echo \"Backend sur $H:${PORT:-8001}\"; exec uvicorn server:app --host $H --port ${PORT:-8001} --proxy-headers --forwarded-allow-ips='*'"]
