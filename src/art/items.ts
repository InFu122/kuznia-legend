// Ekwipunek w pixel arcie (16×16). Każdy rodzaj przedmiotu ma 3 szablony — prosty (Miedź, Żelazo),
// zdobiony (Srebro, Mithril, Adamantyt, Obsydian) i mistrzowski (Smocza Stal, Eteryt, Gwiezdny Kruszec, Boska Ruda) — a metal
// przemalowuje paleta rudy. Szablony: items-data.ts (generuje je tools/art/export.py).
//
// Znaki szablonu:
//   k  obrys            1 2 3 4  metal: cień → blask (kolor rudy)
//   a b c  drewno       l m n  skóra      y Y Z  złote zdobienia
//   g h  klejnot (kolor rudy)   r s  sukno   w  biały błysk   .  przezroczystość
import { ITEM_TEMPLATES } from './items-data';
import { sprite, type Palette, type Sprite } from './pixel';

/** Metal każdej rudy (indeks jak ORES) i kolor klejnotu. */
export const METALS: { n: string; ramp: [string, string, string, string]; gem: [string, string] }[] = [
  { n: 'Miedź', ramp: ['#6b3324', '#a5522c', '#d9824a', '#f6c48e'], gem: ['#1f7f75', '#4fd0bd'] },
  { n: 'Żelazo', ramp: ['#3b3f47', '#666c76', '#9aa1ab', '#d8dde3'], gem: ['#7a2430', '#d0505c'] },
  { n: 'Srebro', ramp: ['#56617a', '#93a1b6', '#cbd6e4', '#ffffff'], gem: ['#2b5fb8', '#6fb0ff'] },
  { n: 'Mithril', ramp: ['#1b5767', '#2f95a9', '#6fd0de', '#d4fbff'], gem: ['#5a2fa0', '#b07cff'] },
  { n: 'Adamantyt', ramp: ['#24502a', '#3f8742', '#79b86c', '#d0f0b4'], gem: ['#a3262e', '#ff6b6b'] },
  { n: 'Smocza Stal', ramp: ['#4e1015', '#8f2125', '#cf4637', '#ff9c78'], gem: ['#c76a00', '#ffc23a'] },
  { n: 'Gwiezdny Kruszec', ramp: ['#7a5a1d', '#c09a3e', '#f1dd96', '#fffbe8'], gem: ['#2a8fd6', '#9fe8ff'] },
  { n: 'Obsydian', ramp: ['#17121f', '#33294a', '#5f5180', '#b9a6e0'], gem: ['#a3122e', '#ff5470'] },
  { n: 'Eteryt', ramp: ['#1d5674', '#3f9cc4', '#8fd8f0', '#effdff'], gem: ['#6a35b8', '#d9a6ff'] },
  { n: 'Boska Ruda', ramp: ['#8a5a12', '#d8a537', '#ffe48f', '#fffdf0'], gem: ['#e0306a', '#ffb3d1'] },
];

const FIXED: Palette = {
  k: '#17121c',
  a: '#3f2618', b: '#6e4528', c: '#a06c42',
  l: '#46291f', m: '#76452f', n: '#a5694a',
  y: '#8a5a12', Y: '#d8a537', Z: '#ffe48f',
  r: '#6a1c24', s: '#b33440',
  w: '#ffffff',
};

/** Paleta przedmiotu z rudy `ore`. */
export function itemPalette(ore: number): Palette {
  const m = METALS[Math.max(0, Math.min(METALS.length - 1, ore))];
  return { ...FIXED, 1: m.ramp[0], 2: m.ramp[1], 3: m.ramp[2], 4: m.ramp[3], g: m.gem[0], h: m.gem[1] };
}

export type ItemKind = 'Miecz' | 'Topór' | 'Młot' | 'Włócznia' | 'Buława' | 'Hełm' | 'Napierśnik' | 'Rękawice' | 'Buty' | 'Pas' | 'Pierścień' | 'Amulet';

/** Poziom zdobień z rudy: 0 — Miedź, Żelazo; 1 — Srebro, Mithril, Adamantyt, Obsydian; 2 — Smocza Stal, Eteryt, Gwiezdny Kruszec, Boska Ruda. */
export const tierOf = (ore: number) => (ore <= 1 ? 0 : ore <= 4 || ore === 7 ? 1 : 2);

export const ITEM_KINDS = Object.keys(ITEM_TEMPLATES) as ItemKind[];

/** Szablon przedmiotu danego rodzaju i poziomu zdobień (nieznany rodzaj — miecz). */
export function itemSprite(kind: string, tier: number): Sprite {
  const t = ITEM_TEMPLATES[kind] ?? ITEM_TEMPLATES['Miecz'];
  return sprite(t[Math.max(0, Math.min(2, tier))]);
}
