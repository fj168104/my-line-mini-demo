# 前端镜像：多阶段构建（Node 构建静态文件 + Nginx 运行）

# ===== 阶段 1：构建 =====
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# 在 root 环境下用 heredoc 创建 entrypoint 脚本（无 CRLF，无转义问题）
RUN cat > /tmp/ep.sh <<'SCRIPT'
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
SCRIPT
RUN chmod +x /tmp/ep.sh

# ===== 阶段 2：Nginx 运行（非 root，适配 Cloud Run） =====
FROM nginxinc/nginx-unprivileged:stable-alpine

# 拷贝构建产物
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# 拷贝 nginx 配置模板
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/nginx.conf.template

# 拷贝 entrypoint 脚本（在 builder 阶段创建，无 CRLF，已 chmod）
COPY --from=builder --chown=nginx:nginx /tmp/ep.sh /docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
