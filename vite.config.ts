import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), react()],
  server: {
    proxy: {
      // 开发环境把 /api/* 转发到 Flask 后端，避免跨域。
      // 不做 rewrite：Flask 路由本身已带 /api 前缀（/api/login, /api/ocr, /api/v1/ocr/...），
      // 直接透传即可——和生产环境 Nginx `proxy_pass ${BACKEND_HOST}`（无 URI）行为一致。
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
