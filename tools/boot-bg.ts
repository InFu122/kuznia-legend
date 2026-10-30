// Tło ekranu ładowania: scena kuźni z pixel artu gry, wpisana do index.html jako obraz w treści strony
// (ekran ładowania musi działać, zanim wczyta się skrypt gry). Uruchom po zmianie sceny: npx vite-node tools/boot-bg.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { DUNGEON_SCENES, SCENE_H, SCENE_W, renderScene } from '../src/art/scenes';
import { png } from './png';

const px = renderScene(DUNGEON_SCENES.kuznia);
const url = 'data:image/png;base64,' + png(SCENE_W, SCENE_H, px).toString('base64');
const file = new URL('../index.html', import.meta.url);
const html = readFileSync(file, 'utf8');
const out = html.replace(/(\/\* boot:bg \*\/)[^]*?(\/\* \/boot:bg \*\/)/, `$1#boot .b-scene{background-image:url(${url})}$2`);
if (out === html && !html.includes(url)) throw new Error('Brak znacznika /* boot:bg */ w index.html');
writeFileSync(file, out);
console.log(`index.html: tło ekranu ładowania ${SCENE_W}×${SCENE_H}, ${Math.round(url.length / 1024)} KB`);
