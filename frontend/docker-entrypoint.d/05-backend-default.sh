#!/bin/sh
set -eu

# Railway peut injecter une variable vide si la référence privée est invalide.
# On évite alors que nginx refuse de démarrer avec « upstream : ». Le service
# démarre et l'API renverra 502 tant que BACKEND_URL n'est pas configurée.
if [ -z "${BACKEND_URL:-}" ]; then
  echo "WARN: BACKEND_URL est absente — repli sur http://127.0.0.1:8001" >&2
  export BACKEND_URL="http://127.0.0.1:8001"
fi
