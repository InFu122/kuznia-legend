// Rysowanie pixel artu w przeglądarce: sprite + paleta → obrazek (data URL), z pamięcią podręczną.
import { ELEM_ICONS, ORE_ICONS, RES_ICONS, SET_ORE_ICONS, SKILL_ICONS, TECH_ICONS, type IconData } from './icons-data';
import { itemPalette, itemSprite, tierOf } from './items';
import { rgba, sprite, type Palette, type Sprite } from './pixel';

const cache = new Map<string, string>();

function toUrl(s: Sprite, pal: Palette): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = s.w; c.height = s.h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(rgba(s, pal), s.w, s.h), 0, 0);
  return c.toDataURL('image/png');
}

function cached(key: string, make: () => [Sprite, Palette]): string {
  let u = cache.get(key);
  if (u === undefined) {
    const [s, p] = make();
    u = toUrl(s, p);
    cache.set(key, u);
  }
  return u;
}

const icon = (d: IconData | undefined): [Sprite, Palette] => (d ? [sprite(d.rows), d.pal] : [sprite(['']), {}]);

/** Przedmiot: rodzaj (np. „Miecz”) z rudy `ore`. */
export const itemUrl = (kind: string, ore: number) => cached(`i:${kind}:${ore}`, () => [itemSprite(kind, tierOf(ore)), itemPalette(ore)]);
export const oreUrl = (ore: number) => cached(`o:${ore}`, () => icon(ORE_ICONS[String(ore)]));
export const elemUrl = (k: string) => cached(`e:${k}`, () => icon(ELEM_ICONS[k]));
export const setOreUrl = (k: string) => cached(`s:${k}`, () => icon(SET_ORE_ICONS[k]));
export const resUrl = (k: string) => cached(`r:${k}`, () => icon(RES_ICONS[k]));
export const skillUrl = (k: string) => cached(`k:${k}`, () => icon(SKILL_ICONS[k]));
export const techUrl = (k: string) => cached(`t:${k}`, () => icon(TECH_ICONS[k]));
