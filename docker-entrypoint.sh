#!/bin/sh
set -e
PORT="${PORT:-8080}"
BH="${BACKEND_HOST:-http://localhost:5000}"
BH=$(echo "$BH" | sed 's:/*$::')
BHN=$(echo "$BH" | sed 's|^https\{0,1\}://||; s|/[].*||')
echo "[ep] backend=$BH host=$BHN port=$PORT"
sed -e "s|\${BACKEND_HOST}|$BH|g" \
    -e "s|\${BACKEND_HOST_NAME}|$BHN|g" \
    -e "s|\${PORT}|$PORT|g" \
    /etc/nginx/nginx.conf.template > /tmp/nginx.conf
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
