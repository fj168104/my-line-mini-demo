import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 开发环境把 /api/* 转发到 Flask 后端，避免跨域。
      // 不做 rewrite：Flask 路由本身已带 /api 前缀，直接透传即可。
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
