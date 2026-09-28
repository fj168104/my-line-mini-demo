# 前端镜像：多阶段构建（Node 构建静态文件 + Nginx 运行）

# ===== 阶段 1：构建 =====
FROM node:20-alpine AS builder
WORKDIR /app

# 先装依赖（利用层缓存）
COPY package*.json ./
RUN npm ci

# 拷贝源码并构建（显式列出，缺文件时会立即报 not found，便于定位上下文问题）
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ===== 阶段 2：Nginx 运行 =====
FROM nginx:stable-alpine

# Nginx 配置模板（启动时用环境变量替换后端地址）
COPY nginx.conf.template /etc/nginx/nginx.conf.template
# 容器启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
# 兼容 Windows 下的 CRLF 换行，并赋可执行权限
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# 拷贝构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run 注入 PORT=8080；本地 docker 默认 80（entrypoint 内兜底）
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
