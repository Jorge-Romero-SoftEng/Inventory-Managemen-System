import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    silent: 'passed-only', 
    env: {
      TEST_BASE_URL: process.env.TEST_BASE_URL || 'http://localhost',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
