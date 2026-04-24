import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3031,
    host: true,
    proxy: {
      '/api': 'http://localhost:3030',
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
