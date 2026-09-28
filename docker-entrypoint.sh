#!/bin/sh
# 容器启动时把后端地址注入 nginx 配置
# BACKEND_HOST 由 docker run -e 传入，例如 http://10.0.0.5:5000
set -e

if [ -z "$BACKEND_HOST" ]; then
  echo "[entrypoint] 错误：未设置 BACKEND_HOST 环境变量"
  echo "[entrypoint] 示例：docker run -e BACKEND_HOST=http://后端IP:5000 ..."
  exit 1
fi

# 去掉末尾斜杠，避免 proxy_pass 出现双斜杠
BACKEND_HOST=$(echo "$BACKEND_HOST" | sed 's:/*$::')
export BACKEND_HOST

echo "[entrypoint] 后端地址: $BACKEND_HOST"

# 只替换 BACKEND_HOST，保留 nginx 自带的 $host/$uri 等变量不被 envsubst 改写
envsubst '${BACKEND_HOST}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

exec "$@"
