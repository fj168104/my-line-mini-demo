#!/bin/sh
set -e

PORT="${PORT:-8080}"
BH="${BACKEND_HOST:-http://localhost:5000}"
# 去掉末尾斜杠，避免 proxy_pass 出现双斜杠
BH=$(echo "$BH" | sed 's:/*$::')
# 提取 host:port（去掉 scheme 和 path），修复原先空字符类 [] 的错误
BHN=$(echo "$BH" | sed 's|^https\?://||; s|/.*||')

echo "[ep] backend=$BH host=$BHN port=$PORT"

# 生成 nginx 配置
sed -e "s|\${BACKEND_HOST}|$BH|g" \
    -e "s|\${BACKEND_HOST_NAME}|$BHN|g" \
    -e "s|\${PORT}|$PORT|g" \
    /etc/nginx/nginx.conf.template > /tmp/nginx.conf

# 调试：输出最终配置，便于 Cloud Run 日志排查
echo "[ep] --- generated nginx.conf ---"
cat /tmp/nginx.conf
echo "[ep] --- end nginx.conf ---"

# 启动前测试配置是否合法，失败则打印错误并退出（避免静默秒退）
if ! nginx -t -c /tmp/nginx.conf; then
    echo "[ep] nginx config test FAILED, exiting"
    exit 1
fi

echo "[ep] starting nginx on port $PORT ..."
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
