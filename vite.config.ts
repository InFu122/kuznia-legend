/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` składa całą grę w jeden plik HTML (do szybkiego testowania na telefonie).
// `npm run dev` z VITE_SERVER_URL=/ przekierowuje API Nakamy (/v2) na lokalny serwer (NAKAMA_PROXY, domyślnie :7350).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: mode === 'single' ? [preact(), viteSingleFile()] : [preact()],
    build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
    server: {
      proxy: {
        '/v2': env.NAKAMA_PROXY || 'http://127.0.0.1:7350',
        '/ws': { target: env.NAKAMA_PROXY || 'http://127.0.0.1:7350', ws: true },
      },
    },
    test: { environment: 'node', include: ['tests/**/*.test.ts', 'server/tests/**/*.test.ts'] },
  };
});
