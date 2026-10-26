// Zamienia zbudowany plik (dist-single/index.html) na fragment strony do publikacji jako artefakt claude.ai,
// który sam dokłada <!doctype>, <head> i <body>. Uruchom: npm run build:artifact
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-single/index.html', 'utf8');
const pick = (re: RegExp) => [...src.matchAll(re)].map(m => m[0]);

const title = pick(/<title>[\s\S]*?<\/title>/g)[0] ?? '<title>Kuźnia Legend</title>';
const metas = pick(/<meta name="claude:[^>]*>/g);
const links = pick(/<link [^>]*>/g);
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g);

const open = '<script type="module" crossorigin>';
const start = src.indexOf(open);
const end = src.lastIndexOf('</script>');
if (start < 0 || end < start) throw new Error('Nie znaleziono skryptu gry w dist-single/index.html');
const script = src.slice(start + open.length, end);

const out = [title, ...metas, ...links, ...styles, '<div id="root"></div>', `<script type="module">${script}</script>`].join('\n');
writeFileSync('dist-single/artifact.html', out);
console.log(`dist-single/artifact.html · ${(out.length / 1024).toFixed(1)} KB`);
