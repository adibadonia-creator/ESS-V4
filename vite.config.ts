import { defineConfig } from 'vite';
export default defineConfig({ worker: { format: 'es' }, build: { outDir: 'dist/browser' }, test: { include: ['tests/**/*.test.ts'] } } as Parameters<typeof defineConfig>[0]);
