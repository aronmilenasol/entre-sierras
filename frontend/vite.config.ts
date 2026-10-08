import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const frontendRoot = new URL('.', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(frontendRoot, 'index.html'),
        about: resolve(frontendRoot, 'acerca.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/data': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
});
