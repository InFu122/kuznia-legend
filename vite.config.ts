/// <reference types="vitest" />
import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` składa całą grę w jeden plik HTML (do szybkiego testowania na telefonie).
// `npm run dev` z VITE_SERVER_URL=/ przekierowuje API Nakamy (/v2) na lokalny serwer (NAKAMA_PROXY, domyślnie :7350).
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const built = new Date();
const BUILD_ID = built.getTime().toString(36);
const APP_VERSION = `${pkg.version} · ${built.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

/** version.json obok gry — otwarta gra sprawdza go co jakiś czas i proponuje odświeżenie po aktualizacji serwera. */
const versionFile = (): Plugin => ({
  name: 'kuznia-version',
  apply: 'build',
  writeBundle(opts) { writeFileSync(`${opts.dir}/version.json`, JSON.stringify({ id: BUILD_ID, version: APP_VERSION })); },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: mode === 'single' ? [preact(), viteSingleFile()] : [preact(), versionFile()],
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION), __BUILD_ID__: JSON.stringify(BUILD_ID) },
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
