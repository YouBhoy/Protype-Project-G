import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  function normalizeProxyTarget(value) {
    if (!value || value.startsWith('/')) {
      return 'http://localhost:4000';
    }

    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host}`;
    } catch {
      return value.replace(/\/api\/?$/, '') || 'http://localhost:4000';
    }
  }

  const proxyTarget = normalizeProxyTarget(env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});