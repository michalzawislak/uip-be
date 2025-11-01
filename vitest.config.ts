import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/']
    }
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@tools': path.resolve(__dirname, './src/tools'),
      '@common': path.resolve(__dirname, './src/common'),
      '@config': path.resolve(__dirname, './config')
    }
  }
});