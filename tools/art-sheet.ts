// Podgląd wszystkich postaci w jednym PNG: npx vite-node tools/art-sheet.ts plik.png [skala]
import { writeFileSync } from 'node:fs';
import { CLAN_BOSS_SIZE, HERO_H, HERO_W, clanBossPixels, companionPixels, foePixels, foeSize, heroPixels } from '../src/art/actors';
import { CLAN_BOSS_LOOK, COMPANION_LOOK, FOE_LOOK } from '../src/art/actors-data';
import { png } from './png';
const S = Number(process.argv[3] ?? 2), COLS = 13, CELL = 64 * S + 6;
const tiles: [number, Uint8ClampedArray][] = [];
tiles.push([HERO_W, heroPixels({})], [HERO_W, heroPixels({}, 'zwykly', 1)], [HERO_W, heroPixels({ bron: { kind: 'Miecz', ore: 1 }, helm: { kind: 'Hełm', ore: 1 }, zbroja: { kind: 'Napierśnik', ore: 0 }, buty: { kind: 'Buty', ore: 0 }, pas: { kind: 'Pas', ore: 0 } })]);
for (const sk of ['nocny', 'szkarlat', 'ognisty', 'lowca', 'upiorny', 'mistrz', 'zloty'] as const) tiles.push([HERO_W, heroPixels({ bron: { kind: 'Szabla', ore: 7 }, zbroja: { kind: 'Kolczuga', ore: 8 } }, sk)]);
tiles.push([HERO_W, heroPixels({ bron: { kind: 'Kostur', ore: 9 }, helm: { kind: 'Diadem', ore: 9 }, zbroja: { kind: 'Szata', ore: 9 }, rekawice: { kind: 'Karwasze', ore: 9 }, buty: { kind: 'Trzewiki', ore: 9 }, pas: { kind: 'Rzemień', ore: 9 }, amulet: { kind: 'Amulet', ore: 9 } })]);
for (const n of Object.keys(FOE_LOOK)) tiles.push([foeSize(n), foePixels(n)]);
for (const k of Object.keys(CLAN_BOSS_LOOK)) tiles.push([CLAN_BOSS_SIZE, clanBossPixels(k)]);
for (const k of Object.keys(COMPANION_LOOK)) tiles.push([48, companionPixels(k)]);
void HERO_H;
const rows = Math.ceil(tiles.length / COLS), W = COLS * CELL, H = rows * CELL, out = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) { const dark = (Math.floor((i % W) / CELL) + Math.floor(i / W / CELL)) % 2; out[i * 4] = dark ? 72 : 86; out[i * 4 + 1] = dark ? 90 : 104; out[i * 4 + 2] = dark ? 70 : 84; out[i * 4 + 3] = 255; }
tiles.forEach(([n, px], i) => {
  const ox = (i % COLS) * CELL + 3 + Math.floor((64 - n) * S / 2), oy = Math.floor(i / COLS) * CELL + 3 + (64 - n) * S;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const a = px[(y * n + x) * 4 + 3]; if (!a) continue;
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const o = ((oy + y * S + dy) * W + ox + x * S + dx) * 4; out[o] = px[(y * n + x) * 4]; out[o + 1] = px[(y * n + x) * 4 + 1]; out[o + 2] = px[(y * n + x) * 4 + 2]; } }
});
writeFileSync(process.argv[2], png(W, H, out));
console.log(tiles.length, 'postaci');
