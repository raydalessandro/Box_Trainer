import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@audio': path.resolve(__dirname, './src/audio'),
      '@storage': path.resolve(__dirname, './src/storage'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  server: {
    port: 3006,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
