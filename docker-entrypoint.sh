#!/bin/sh
# 容器启动时把后端地址注入 nginx 配置
set -e

# 监听端口：Cloud Run 注入 PORT=8080
PORT="${PORT:-8080}"

# 后端地址（未设置时用占位符，容器仍能启动提供静态页面）
BACKEND_HOST="${BACKEND_HOST:-http://localhost:5000}"
BACKEND_HOST=$(echo "$BACKEND_HOST" | sed 's:/*$::')

# 从 BACKEND_HOST 提取 hostname（用于 Host header）
BACKEND_HOST_NAME=$(echo "$BACKEND_HOST" | sed 's|^https\?://||; s|/[].*||')

echo "[entrypoint] 后端地址: $BACKEND_HOST"
echo "[entrypoint] 后端域名: $BACKEND_HOST_NAME"
echo "[entrypoint] 监听端口: $PORT"

# 写到 /tmp（非 root 用户可写），再用 -c 指定配置启动
sed -e "s|\${BACKEND_HOST}|${BACKEND_HOST}|g" \
    -e "s|\${BACKEND_HOST_NAME}|${BACKEND_HOST_NAME}|g" \
    -e "s|\${PORT}|${PORT}|g" \
    /etc/nginx/nginx.conf.template > /tmp/nginx.conf

exec nginx -c /tmp/nginx.conf -g 'daemon off;'
