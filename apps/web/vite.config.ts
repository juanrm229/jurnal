import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    proxy: { '/v1': 'http://localhost:8787', '/w': 'http://localhost:8787', '/dev': 'http://localhost:8787' },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
});
