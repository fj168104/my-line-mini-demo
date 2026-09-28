# 前端镜像：多阶段构建（Node 构建静态文件 + Nginx 运行）

# ===== 阶段 1：构建 =====
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY dist ./dist
# RUN npm run build

# ===== 阶段 2：Nginx 运行（非 root，适配 Cloud Run） =====
FROM nginxinc/nginx-unprivileged:stable-alpine

# 拷贝构建产物
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# 拷贝 nginx 配置模板
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/nginx.conf.template

# 拷贝 entrypoint 脚本到 /tmp（非 root 容器的可写目录），兼容 Windows CRLF 并赋可执行权限
COPY --chown=nginx:nginx docker-entrypoint.sh /tmp/docker-entrypoint.sh
RUN sed -i 's/\r$//' /tmp/docker-entrypoint.sh && chmod +x /tmp/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/tmp/docker-entrypoint.sh"]
