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

# ===== 阶段 2：Nginx 运行（非 root，适配 Cloud Run） =====
FROM nginxinc/nginx-unprivileged:stable-alpine

# 拷贝构建产物
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# 拷贝 nginx 配置模板
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/nginx.conf.template

EXPOSE 8080

# 启动时用 sed 替换占位符，写到 /tmp（非 root 可写），再用 nginx -c 指定配置
# BACKEND_HOST / PORT 由 Cloud Run 注入；本地 docker 可用 -e 传入
CMD ["sh", "-c", "\
  PORT=${PORT:-8080}; \
  BH=${BACKEND_HOST:-http://localhost:5000}; \
  BH=$(echo $BH | sed 's:/*$::'); \
  BHN=$(echo $BH | sed 's|^https\\?://||; s|/[].*||'); \
  echo \"[entrypoint] backend=$BH host=$BHN port=$PORT\"; \
  sed -e \"s|\\${BACKEND_HOST}|$BH|g\" \
      -e \"s|\\${BACKEND_HOST_NAME}|$BHN|g\" \
      -e \"s|\\${PORT}|$PORT|g\" \
      /etc/nginx/nginx.conf.template > /tmp/nginx.conf; \
  exec nginx -c /tmp/nginx.conf -g 'daemon off;' \
"]
