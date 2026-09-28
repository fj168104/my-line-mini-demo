# 前端镜像：多阶段构建（Node 构建静态文件 + Nginx 运行）

# ===== 阶段 1：构建 =====
FROM node:20-alpine AS builder
WORKDIR /app

# 先装依赖（利用层缓存）
COPY package*.json ./
RUN npm ci

# 拷贝源码并构建
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# 在 root 环境下处理 entrypoint 的 CRLF（nginx-unprivileged 阶段没权限 sed -i）
COPY docker-entrypoint.sh /tmp/entrypoint.sh
RUN sed -i 's/\r$//' /tmp/entrypoint.sh && chmod +x /tmp/entrypoint.sh

# ===== 阶段 2：Nginx 运行（非 root，适配 Cloud Run） =====
FROM nginxinc/nginx-unprivileged:stable-alpine

# 配置模板和启动脚本（用 --chown 确保 nginx 用户可读）
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/nginx.conf.template
COPY --from=builder --chown=nginx:nginx /tmp/entrypoint.sh /docker-entrypoint.sh

# 拷贝构建产物
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Cloud Run 注入 PORT=8080
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
