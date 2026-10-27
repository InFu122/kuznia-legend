// Składa moduł serwera w jeden plik JavaScript dla Nakamy: server/build/index.js.
// Silnik gry (src/engine, src/data) jest wspólny dla klienta i serwera.
import { build } from 'esbuild';

await build({
  entryPoints: ['server/src/main.ts'],
  outfile: 'server/build/index.js',
  bundle: true,
  format: 'esm',          // bez eksportów — funkcje zostają globalne, tak jak wymaga Nakama
  platform: 'neutral',
  target: 'es2017',
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'info',
});
