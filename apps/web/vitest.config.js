import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    server: {
      deps: {
        inline: ['@linkwarden/lib', '@linkwarden/prisma'],
      },
    },
    alias: {
      '@': path.resolve(__dirname, './'),
      '@linkwarden/prisma': path.resolve(__dirname, '../../packages/prisma'),
      '@linkwarden/lib': path.resolve(__dirname, '../../packages/lib'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});