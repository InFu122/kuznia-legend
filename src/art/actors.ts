// Postaci na polu walki: bohater złożony z założonego ekwipunku i wrogowie z szablonów (pixel art).
// Moduł czysty (bez DOM): zwraca piksele RGBA, a render.ts robi z nich obrazki.
import { FOE_BY_TYPE, FOE_LOOK, FOE_TEMPLATES, HERO_BASE_PAL, HERO_H, HERO_LAYERS, HERO_W } from './actors-data';
import { itemPalette, itemSprite, tierOf } from './items';
import { rgba, sprite, type Palette } from './pixel';

export { HERO_H, HERO_W };
export const FOE_W = 32;
export const FOE_H = 32;

/** Tyle ekwipunku, ile widać na postaci (rodzaj i ruda). */
export interface Look { kind: string; ore: number }
export type HeroGear = Partial<Record<'bron' | 'helm' | 'zbroja' | 'rekawice' | 'buty' | 'pas' | 'amulet', Look | null | undefined>>;

const OUTLINE: [number, number, number] = [0x17, 0x12, 0x1c];
const DEFAULT_KIND: Record<string, string> = { helm: 'Hełm', zbroja: 'Napierśnik', rekawice: 'Rękawice', buty: 'Buty', pas: 'Pas' };
/** Dłoń z bronią — tam trafia uchwyt ikony broni. */
const HAND: [number, number] = [22, 21];
/** Gdzie w ikonie 16×16 jest uchwyt (większość broni trzyma się tak samo; łuk — za majdan). */
const GRIP: Record<string, [number, number]> = { 'Łuk': [10, 6] };

const hexRgb = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

function paint(px: Uint8ClampedArray, W: number, H: number, x0: number, y0: number, rows: string[], pal: Palette) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const c = pal[ch];
      if (ch === '.' || !c) continue;
      const X = x0 + x, Y = y0 + y;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const [r, g, b] = hexRgb(c);
      const i = (Y * W + X) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  });
}

/** Ciemny obrys wokół całej sylwetki. */
function outline(px: Uint8ClampedArray, W: number, H: number) {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] === 255;
  const ring: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!solid(x, y) && (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1))) ring.push(y * W + x);
  }
  for (const p of ring) { const i = p * 4; px[i] = OUTLINE[0]; px[i + 1] = OUTLINE[1]; px[i + 2] = OUTLINE[2]; px[i + 3] = 255; }
}

function layer(px: Uint8ClampedArray, key: string, pal: Palette): boolean {
  const L = HERO_LAYERS[key];
  if (!L) return false;
  paint(px, HERO_W, HERO_H, L[0], L[1], L[2], pal);
  return true;
}

/** Klucz pamięci podręcznej dla wyglądu bohatera. */
export function heroKey(g: HeroGear): string {
  return (['bron', 'helm', 'zbroja', 'rekawice', 'buty', 'pas', 'amulet'] as const).map(k => { const it = g[k]; return it ? `${it.kind}:${it.ore}` : '-'; }).join('|');
}

/** Bohater 36×36: ciało, zbroja, pas, buty, rękawice, amulet, hełm, broń w dłoni. Patrzy w prawo. */
export function heroPixels(g: HeroGear): Uint8ClampedArray {
  const px = new Uint8ClampedArray(HERO_W * HERO_H * 4);
  layer(px, 'base', HERO_BASE_PAL);
  const gear = (slot: 'helm' | 'zbroja' | 'buty' | 'pas', prefix: string = slot) => {
    const it = g[slot];
    if (!it) return;
    const t = tierOf(it.ore);
    if (!layer(px, `${prefix}:${it.kind}:${t}`, itemPalette(it.ore))) layer(px, `${prefix}:${DEFAULT_KIND[slot]}:${t}`, itemPalette(it.ore));
  };
  gear('zbroja'); gear('pas'); gear('buty');
  const gl = g.rekawice;
  const glKind = gl && HERO_LAYERS[`rekawice:${gl.kind}:0`] ? gl.kind : 'Rękawice';
  if (gl) layer(px, `rekawice:${glKind}:${tierOf(gl.ore)}`, itemPalette(gl.ore));
  if (g.amulet) layer(px, `amulet:${tierOf(g.amulet.ore)}`, itemPalette(g.amulet.ore));
  gear('helm');
  const w = g.bron;
  if (w) {
    const s = itemSprite(w.kind, tierOf(w.ore));
    const [gx, gy] = GRIP[w.kind] ?? [4, 11];
    paint(px, HERO_W, HERO_H, HAND[0] - gx, HAND[1] - gy, s.rows, itemPalette(w.ore));
  }
  if (gl) layer(px, `rekawiceF:${glKind}:${tierOf(gl.ore)}`, itemPalette(gl.ore));
  else layer(px, 'hand', HERO_BASE_PAL);
  outline(px, HERO_W, HERO_H);
  return px;
}

/** Który wygląd ma wróg o tej nazwie (część nazw jest zmienna, np. „Strażnik 12. piętra”). */
export function foeKey(name: string, type = 'Bestie'): string {
  if (FOE_LOOK[name]) return name;
  if (name.startsWith('Strażnik Krypty')) return 'Strażnik Krypty';
  if (name.startsWith('Strażnik:')) return 'Strażnik ołtarza';
  if (name.startsWith('Strażnik ') && name.endsWith('piętra')) return 'Strażnik piętra';
  if (name.startsWith('Duch')) return 'Duch';
  return FOE_BY_TYPE[type] ?? FOE_BY_TYPE.Bestie;
}

/** Szablon wroga (np. „wilk”, „smok”) — do animacji zależnych od sylwetki. */
export const foeTemplate = (name: string, type?: string) => FOE_LOOK[foeKey(name, type)]?.[0] ?? 'wilk';

/** Wróg 32×32, patrzy w lewo. */
export function foePixels(name: string, type?: string): Uint8ClampedArray {
  const [t, pal] = FOE_LOOK[foeKey(name, type)];
  return rgba(sprite(FOE_TEMPLATES[t]), pal);
}
