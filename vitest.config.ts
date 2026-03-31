/**
 * BOX TRAINER — Vitest Configuration
 * Test setup with React support, path aliases, and coverage reporting
 */

import { defineConfig } from 'vitest/config';
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

  test: {
    // Test environment
    environment: 'jsdom',

    // Global setup
    setupFiles: ['./src/__tests__/setup.ts'],

    // Coverage reporting
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },

    // Test globals (optional, enables describe/it/expect without imports)
    globals: true,

    // Parallel execution
    pool: 'threads',
  },
});
