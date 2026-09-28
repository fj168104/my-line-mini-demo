#!/bin/sh
# 容器启动时把后端地址注入 nginx 配置
set -e

if [ -z "$BACKEND_HOST" ]; then
  echo "[entrypoint] 错误：未设置 BACKEND_HOST 环境变量"
  echo "[entrypoint] 示例：docker run -e BACKEND_HOST=https://后端域名 ..."
  exit 1
fi

# 去掉末尾斜杠
BACKEND_HOST=$(echo "$BACKEND_HOST" | sed 's:/*$::')

# 从 BACKEND_HOST 提取 hostname（用于 Host header）
# 例：https://abc.run.app -> abc.run.app
BACKEND_HOST_NAME=$(echo "$BACKEND_HOST" | sed 's|^https\?://||; s|/[].*||')

# 监听端口：Cloud Run 注入 PORT=8080；本地 docker 默认 8080
PORT="${PORT:-8080}"

echo "[entrypoint] 后端地址: $BACKEND_HOST"
echo "[entrypoint] 后端域名: $BACKEND_HOST_NAME"
echo "[entrypoint] 监听端口: $PORT"

# 用 sed 替换占位符（比 envsubst 更可靠，不会误伤 nginx 变量）
sed -e "s|\${BACKEND_HOST}|${BACKEND_HOST}|g" \
    -e "s|\${BACKEND_HOST_NAME}|${BACKEND_HOST_NAME}|g" \
    -e "s|\${PORT}|${PORT}|g" \
    /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec "$@"
