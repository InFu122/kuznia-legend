// Postaci na polu walki: bohater złożony z założonego ekwipunku i wrogowie z szablonów (pixel art „z brył”).
// Moduł czysty (bez DOM): zwraca piksele RGBA, a render.ts robi z nich obrazki.
import { CLAN_BOSS_LOOK, COMPANION_LOOK, FOE_BY_TYPE, FOE_LOOK, FOE_TEMPLATES, HERO_BODY, HERO_H, HERO_LAYERS, HERO_W } from './actors-data';
import { METALS, tierOf } from './items';
import { SKINS, type SkinId } from '../data/cosmetics';
import { ACTOR_ALPH, actorPalette, ramp6, rgba, shade, sprite, unrle, type Palette } from './pixel';

export { HERO_H, HERO_W };

/** Tyle ekwipunku, ile widać na postaci (rodzaj i ruda). */
export interface Look { kind: string; ore: number }
export type HeroGear = Partial<Record<'bron' | 'helm' | 'zbroja' | 'rekawice' | 'buty' | 'pas' | 'amulet', Look | null | undefined>>;

const OUTLINE: [number, number, number] = [0x1a, 0x13, 0x20];
const DEFAULT_KIND: Record<string, string> = { helm: 'Hełm', zbroja: 'Napierśnik', rekawice: 'Rękawice', buty: 'Buty', pas: 'Pas', bron: 'Miecz' };
/** Linia bioder: w drugiej klatce wszystko nad nią opada o piksel (oddech). */
const HIP = 35;

const hexRgb = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, k: number) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v * (1 - k) + y[i] * k).toString(16).padStart(2, '0')).join(''); };

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
export function heroKey(g: HeroGear, skin: SkinId = 'zwykly'): string {
  return skin + '#' + (['bron', 'helm', 'zbroja', 'rekawice', 'buty', 'pas', 'amulet'] as const).map(k => { const it = g[k]; return it ? `${it.kind}:${it.ore}` : '-'; }).join('|');
}

const gearCache = new Map<number, Palette>();
/** Paleta ekwipunku na postaci: p metal rudy (6 tonów z 4 kolorów rudy), q złoto, r skóra, s drewno, t sukno, u klejnot rudy. */
export function gearPalette(ore: number): Palette {
  const o = Math.max(0, Math.min(METALS.length - 1, ore));
  let pal = gearCache.get(o);
  if (!pal) {
    const m = METALS[o];
    pal = actorPalette({ q: '#d8a537', r: '#76452f', s: '#6e4528', t: '#b33440', u: m.gem[1], g: shade(m.gem[1], 0.3) });
    const r = m.ramp;
    [mix(r[0], '#140f1a', 0.5), r[0], r[1], r[2], mix(r[2], r[3], 0.5), r[3]].forEach((c, t) => { pal![ACTOR_ALPH[t]] = c; });
    gearCache.set(o, pal);
  }
  return pal;
}

/** Ciało w kolorach stroju (z płaszczem, jeśli strój go ma). Zwraca paletę ciała. */
function body(px: Uint8ClampedArray, skin: SkinId): Palette {
  const S = SKINS[skin] ?? SKINS.zwykly;
  const p = S.pal;
  const pal = actorPalette({ ...HERO_BODY, ...(p.E ? { q: p.E } : {}), ...(p.I ? { r: p.I } : {}), ...(p.Q ? { s: p.Q } : {}), ...(p.U ? { t: p.U } : {}) });
  if (S.cape) { const c = ramp6(S.cape[1]); layer(px, 'cape', Object.fromEntries(c.map((v, t) => [ACTOR_ALPH[t], v]))); }
  layer(px, 'base', pal);
  return pal;
}

/** Oddech: wszystko nad biodrami o piksel niżej. */
function breathe(px: Uint8ClampedArray, W: number) {
  for (let y = HIP; y >= 1; y--) px.copyWithin(y * W * 4, (y - 1) * W * 4, y * W * 4);
  px.fill(0, 0, W * 4);
}

/** Bohater 48×48: ciało, zbroja, pas, buty, rękawice, amulet, hełm, broń w dłoni. Patrzy w prawo. `frame` 0/1 — oddech. */
export function heroPixels(g: HeroGear, skin: SkinId = 'zwykly', frame = 0): Uint8ClampedArray {
  const px = new Uint8ClampedArray(HERO_W * HERO_H * 4);
  const pal = body(px, skin);
  const gear = (slot: 'helm' | 'zbroja' | 'buty' | 'pas' | 'bron', prefix: string = slot) => {
    const it = g[slot];
    if (!it) return;
    const t = tierOf(it.ore);
    if (!layer(px, `${prefix}:${it.kind}:${t}`, gearPalette(it.ore))) layer(px, `${prefix}:${DEFAULT_KIND[slot]}:${t}`, gearPalette(it.ore));
  };
  gear('zbroja'); gear('pas'); gear('buty');
  const gl = g.rekawice;
  const glKind = gl && HERO_LAYERS[`rekawice:${gl.kind}:0`] ? gl.kind : 'Rękawice';
  if (gl) layer(px, `rekawice:${glKind}:${tierOf(gl.ore)}`, gearPalette(gl.ore));
  if (g.amulet) layer(px, `amulet:${tierOf(g.amulet.ore)}`, gearPalette(g.amulet.ore));
  gear('helm');
  gear('bron');
  if (gl) layer(px, `rekawiceF:${glKind}:${tierOf(gl.ore)}`, gearPalette(gl.ore));
  else layer(px, 'hand', pal);
  if (frame % 2) breathe(px, HERO_W);
  outline(px, HERO_W, HERO_H);
  return px;
}

export const AVATAR = 22;
/** Awatar 22×22: głowa i ramiona bohatera w stroju (bez ekwipunku). */
export function avatarPixels(skin: SkinId = 'zwykly'): Uint8ClampedArray {
  const px = new Uint8ClampedArray(HERO_W * HERO_H * 4);
  body(px, skin);
  outline(px, HERO_W, HERO_H);
  const out = new Uint8ClampedArray(AVATAR * AVATAR * 4);
  const x0 = 11, y0 = 2;
  for (let y = 0; y < AVATAR; y++) for (let x = 0; x < AVATAR; x++) {
    const i = ((y0 + y) * HERO_W + x0 + x) * 4, o = (y * AVATAR + x) * 4;
    out[o] = px[i]; out[o + 1] = px[i + 1]; out[o + 2] = px[i + 2]; out[o + 3] = px[i + 3];
  }
  return out;
}

/** Który wygląd ma wróg o tej nazwie (część nazw jest zmienna, np. „Strażnik 12. piętra”, „… z Otchłani”). */
export function foeKey(name: string, type = 'Bestie'): string {
  if (FOE_LOOK[name]) return name;
  const base = name.replace(/ z Otchłani$/, '');
  if (FOE_LOOK[base]) return base;
  if (name.startsWith('Strażnik Krypty')) return 'Strażnik Krypty';
  if (name.startsWith('Strażnik:')) return 'Strażnik ołtarza';
  if (name.startsWith('Strażnik ') && name.endsWith('piętra')) return 'Strażnik piętra';
  if (name.startsWith('Duch')) return 'Duch';
  return FOE_BY_TYPE[type] ?? FOE_BY_TYPE.Bestie;
}

/** Szablon wroga (np. „wilk”, „smok”) — do animacji zależnych od sylwetki. */
export const foeTemplate = (name: string, type?: string) => FOE_LOOK[foeKey(name, type)]?.[0] ?? 'wilk';

const rowsCache = new Map<string, string[]>();
function frameRows(tpl: string, frame: number): [string[], number] {
  const T = FOE_TEMPLATES[tpl] ?? FOE_TEMPLATES.wilk;
  const f = frame % 2;
  const key = tpl + ':' + f;
  let rows = rowsCache.get(key);
  if (!rows) { rows = unrle(f ? T[2] : T[1], T[0]); rowsCache.set(key, rows); }
  return [rows, T[0]];
}
function lookPixels([tpl, cols]: [string, Record<string, string>], frame: number): Uint8ClampedArray {
  return rgba(sprite(frameRows(tpl, frame)[0]), actorPalette(cols));
}

/** Bok płótna wroga w pikselach: 48 — zwykły wróg, 64 — boss krainy. */
export const foeSize = (name: string, type?: string) => (FOE_TEMPLATES[foeTemplate(name, type)] ?? FOE_TEMPLATES.wilk)[0];
/** Wróg (48×48 albo boss 64×64), patrzy w lewo. `frame` 0/1 — klatka ruchu. */
export const foePixels = (name: string, type?: string, frame = 0) => lookPixels(FOE_LOOK[foeKey(name, type)], frame);

export const companionSize = (id: string) => (FOE_TEMPLATES[(COMPANION_LOOK[id] ?? COMPANION_LOOK.wilczek)[0]])[0];
/** Chowaniec albo wierzchowiec 48×48 (patrzy w lewo; interfejs odwraca go w stronę bohatera). */
export const companionPixels = (id: string, frame = 0) => lookPixels(COMPANION_LOOK[id] ?? COMPANION_LOOK.wilczek, frame);

export const CLAN_BOSS_SIZE = 64;
/** Boss klanowy 64×64 (klucz: pal z CLAN_BOSSES). */
export const clanBossPixels = (k: string, frame = 0) => lookPixels(CLAN_BOSS_LOOK[k] ?? CLAN_BOSS_LOOK.golem, frame);
