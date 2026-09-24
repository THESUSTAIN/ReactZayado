FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY . .

EXPOSE 8001
# Un seul socket IPv6 avec IPV6_V6ONLY=0 = écoute IPv4 ET IPv6 sur le même port.
# Avant : uvicorn --host :: n'écoutait qu'en IPv6 -> healthcheck Railway (IPv4) en échec.
CMD ["python", "-c", "import os, socket, uvicorn; p = int(os.environ.get('PORT', '8001')); v6 = socket.has_ipv6 and os.path.exists('/proc/net/if_inet6'); s = socket.socket(socket.AF_INET6 if v6 else socket.AF_INET); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); v6 and s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0); s.bind(('::' if v6 else '0.0.0.0', p)); print('Backend sur', '[::] IPv4+IPv6' if v6 else '0.0.0.0', p, flush=True); uvicorn.Server(uvicorn.Config('server:app', proxy_headers=True, forwarded_allow_ips='*')).run(sockets=[s])"]
