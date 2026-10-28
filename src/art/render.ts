// Rysowanie pixel artu w przeglądarce: sprite + paleta → obrazek (data URL), z pamięcią podręczną.
import { BOSS_ICONS, ELEM_ICONS, ORE_ICONS, RES_ICONS, SET_ORE_ICONS, SKILL_ICONS, TECH_ICONS, type IconData } from './icons-data';
import { FOE_H, FOE_W, HERO_H, HERO_W, foeKey, foePixels, heroKey, heroPixels, type HeroGear } from './actors';
import { itemPalette, itemSprite, tierOf } from './items';
import { rgba, sprite, type Palette, type Sprite } from './pixel';
import { halo } from './rarity';
import { DUNGEON_SCENES, LAND_SCENES, SCENE_H, SCENE_W, renderScene } from './scenes';

const cache = new Map<string, string>();

function pxUrl(px: Uint8ClampedArray, w: number, h: number): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0);
  return c.toDataURL('image/png');
}
const toUrl = (s: Sprite, pal: Palette) => pxUrl(rgba(s, pal), s.w, s.h);

function cached(key: string, make: () => string): string {
  let u = cache.get(key);
  if (u === undefined) { u = make(); cache.set(key, u); }
  return u;
}
const once = (key: string, make: () => [Sprite, Palette]) => cached(key, () => { const [s, p] = make(); return toUrl(s, p); });

const icon = (d: IconData | undefined): [Sprite, Palette] => (d ? [sprite(d.rows), d.pal] : [sprite(['']), {}]);

/**
 * Przedmiot: rodzaj (np. „Miecz”) z rudy `ore`. Z rzadkością `r` dostaje margines 1 px i obwódkę w kolorze
 * rzadkości (18×18); bez — goły sprite 16×16.
 */
export function itemUrl(kind: string, ore: number, r = -1): string {
  return cached(`i:${kind}:${ore}:${r}`, () => {
    const s = itemSprite(kind, tierOf(ore));
    const base = rgba(s, itemPalette(ore));
    if (r < 0) return pxUrl(base, s.w, s.h);
    const h = halo(base, s.w, s.h, r);
    return pxUrl(h.px, h.w, h.h);
  });
}
export const oreUrl = (ore: number) => once(`o:${ore}`, () => icon(ORE_ICONS[String(ore)]));
export const elemUrl = (k: string) => once(`e:${k}`, () => icon(ELEM_ICONS[k]));
export const setOreUrl = (k: string) => once(`s:${k}`, () => icon(SET_ORE_ICONS[k]));
export const resUrl = (k: string) => once(`r:${k}`, () => icon(RES_ICONS[k]));
export const skillUrl = (k: string) => once(`k:${k}`, () => icon(SKILL_ICONS[k]));
export const techUrl = (k: string) => once(`t:${k}`, () => icon(TECH_ICONS[k]));
/** Boss klanowy 32×32 (paleta: golem, kamien, ogien, lod, upior). */
export const bossUrl = (k: string) => once(`b:${k}`, () => icon(BOSS_ICONS[k] ?? BOSS_ICONS.golem));
/** Tło krainy (160×96, pixel art) jako obrazek. */
export const landBgUrl = (land: number) => cached(`bg:l${land}`, () => pxUrl(renderScene(LAND_SCENES[Math.max(0, Math.min(LAND_SCENES.length - 1, land))]), SCENE_W, SCENE_H));
/** Tło lochu albo areny (klucz jak w DUNGEON_SCENES). */
export const dungeonBgUrl = (id: string) => cached(`bg:d${id}`, () => pxUrl(renderScene(DUNGEON_SCENES[id] ?? DUNGEON_SCENES.arena), SCENE_W, SCENE_H));
/** Bohater w założonym ekwipunku (36×36, patrzy w prawo). */
export const heroUrl = (g: HeroGear) => cached(`h:${heroKey(g)}`, () => pxUrl(heroPixels(g), HERO_W, HERO_H));
/** Wróg z pola walki (32×32, patrzy w lewo). */
export const foeUrl = (name: string, type?: string) => cached(`f:${foeKey(name, type)}`, () => pxUrl(foePixels(name, type), FOE_W, FOE_H));
