/// <reference types="vitest" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` składa całą grę w jeden plik HTML (do szybkiego testowania na telefonie).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [preact(), viteSingleFile()] : [preact()],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
}));
