// Ikony aplikacji (PWA i Android) z pixel artu gry: kowadło z rozżarzoną sztabą, młot i iskry na tle żaru.
// Uruchom: npx vite-node tools/app-icons.ts  → public/icons/*.png (i android/…/res, gdy jest projekt Androida)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { RES_ICONS } from '../src/art/icons-data';
import { itemPalette, itemSprite } from '../src/art/items';
import { rgba, sprite } from '../src/art/pixel';
import { png } from './png';

const G = 24; // siatka kompozycji w pikselach gry

/** Kompozycja 24×24: kowadło na dole, młot nad nim, kilka iskier. */
function composition(): Uint8ClampedArray {
  const out = new Uint8ClampedArray(G * G * 4);
  const blit = (px: Uint8ClampedArray, w: number, h: number, ox: number, oy: number) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 255) continue;
      const X = ox + x, Y = oy + y;
      if (X < 0 || Y < 0 || X >= G || Y >= G) continue;
      const j = (Y * G + X) * 4;
      out[j] = px[i]; out[j + 1] = px[i + 1]; out[j + 2] = px[i + 2]; out[j + 3] = 255;
    }
  };
  const hammer = itemSprite('Młot', 2);
  blit(rgba(hammer, itemPalette(1)), hammer.w, hammer.h, 9, -1);
  const anvil = RES_ICONS.kowadlo;
  const a = sprite(anvil.rows);
  blit(rgba(a, anvil.pal), a.w, a.h, 4, 8);
  // iskry wokół sztaby
  const spark = (x: number, y: number, c: [number, number, number]) => { const j = (y * G + x) * 4; out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2]; out[j + 3] = 255; };
  for (const [x, y] of [[6, 7], [4, 9], [8, 5], [17, 9], [19, 7], [3, 6]] as const) spark(x, y, [255, 214, 120]);
  for (const [x, y] of [[7, 8], [18, 8], [5, 4]] as const) spark(x, y, [255, 150, 60]);
  return out;
}

/** Ikona `size`×`size`. `bleed` — tło do krawędzi (maskable, Android); inaczej zaokrąglony kwadrat. `fill` — jaką część zajmuje rysunek. */
function icon(size: number, bleed: boolean, fill: number, bg = true): Uint8ClampedArray {
  const px = new Uint8ClampedArray(size * size * 4);
  const r = bleed ? 0 : size * 0.22;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // zaokrąglone rogi
    const dx = Math.max(r - x, 0, x - (size - 1 - r)), dy = Math.max(r - y, 0, y - (size - 1 - r));
    if (r && dx * dx + dy * dy > r * r) continue;
    if (!bg) continue;
    const u = x / size - 0.5, v = y / size - 0.68;
    const glow = Math.max(0, 1 - Math.sqrt(u * u * 1.4 + v * v) / 0.62);
    const i = (y * size + x) * 4;
    px[i] = Math.round(22 + 150 * glow * glow); px[i + 1] = Math.round(18 + 62 * glow * glow); px[i + 2] = Math.round(15 + 18 * glow * glow); px[i + 3] = 255;
  }
  const comp = composition();
  const scale = Math.max(1, Math.floor((size * fill) / G));
  const off = Math.floor((size - G * scale) / 2);
  for (let y = 0; y < G * scale; y++) for (let x = 0; x < G * scale; x++) {
    const s = ((Math.floor(y / scale)) * G + Math.floor(x / scale)) * 4;
    if (comp[s + 3] < 255) continue;
    const i = ((off + y) * size + off + x) * 4;
    px[i] = comp[s]; px[i + 1] = comp[s + 1]; px[i + 2] = comp[s + 2]; px[i + 3] = 255;
  }
  return px;
}

/** Samo tło z żarem (warstwa tła ikony adaptacyjnej). */
function glowOnly(size: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = y / size - 0.62;
    const g = Math.max(0, 1 - Math.sqrt(u * u * 1.4 + v * v) / 0.5);
    const i = (y * size + x) * 4;
    px[i] = Math.round(22 + 150 * g * g); px[i + 1] = Math.round(18 + 62 * g * g); px[i + 2] = Math.round(15 + 18 * g * g); px[i + 3] = 255;
  }
  return px;
}

/** Ekran startowy w×h: ciemne tło, żar i rysunek na środku. */
function splash(w: number, h: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  const m = Math.min(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - w / 2) / m, v = (y - h / 2) / m - 0.08;
    const g = Math.max(0, 1 - Math.sqrt(u * u + v * v) / 0.45);
    const i = (y * w + x) * 4;
    px[i] = Math.round(22 + 120 * g * g); px[i + 1] = Math.round(18 + 50 * g * g); px[i + 2] = Math.round(15 + 14 * g * g); px[i + 3] = 255;
  }
  const comp = composition();
  const scale = Math.max(1, Math.floor((m * 0.36) / G));
  const ox = Math.floor((w - G * scale) / 2), oy = Math.floor((h - G * scale) / 2);
  for (let y = 0; y < G * scale; y++) for (let x = 0; x < G * scale; x++) {
    const s = (Math.floor(y / scale) * G + Math.floor(x / scale)) * 4;
    if (comp[s + 3] < 255) continue;
    const i = ((oy + y) * w + ox + x) * 4;
    px[i] = comp[s]; px[i + 1] = comp[s + 1]; px[i + 2] = comp[s + 2]; px[i + 3] = 255;
  }
  return px;
}

/** Biała sylwetka samego kowadła (Android maluje ikonkę powiadomienia jednym kolorem). */
function silhouette(size: number): Uint8ClampedArray {
  const a = RES_ICONS.kowadlo;
  const s = sprite(a.rows);
  const src = rgba(s, a.pal);
  const px = new Uint8ClampedArray(size * size * 4);
  const scale = Math.max(1, Math.floor(size / s.w));
  const off = Math.floor((size - s.w * scale) / 2);
  for (let y = 0; y < s.h * scale; y++) for (let x = 0; x < s.w * scale; x++) {
    const j = (Math.floor(y / scale) * s.w + Math.floor(x / scale)) * 4;
    if (src[j + 3] < 255 || a.rows[Math.floor(y / scale)][Math.floor(x / scale)] === 'k') continue;
    const i = ((off + y) * size + off + x) * 4;
    if (off + y >= size || off + x >= size) continue;
    px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = 255;
  }
  return px;
}

/** Wymiary z nagłówka PNG. */
const pngSize = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });

const write = (path: string, size: number, bleed: boolean, fill: number, bg = true) => { writeFileSync(path, png(size, size, icon(size, bleed, fill, bg))); };

mkdirSync('public/icons', { recursive: true });
write('public/icons/icon-192.png', 192, false, 0.78);
write('public/icons/icon-512.png', 512, false, 0.78);
write('public/icons/maskable-512.png', 512, true, 0.6);
write('public/icons/apple-touch-icon.png', 180, true, 0.72);
write('public/icons/favicon-32.png', 32, false, 0.95);

// Android (Capacitor): ikona zwykła i okrągła, ikona adaptacyjna (tło z żarem + rysunek), ekrany startowe
// i biała ikonka powiadomień.
const RES = 'android/app/src/main/res';
if (existsSync(RES)) {
  const dens: [string, number][] = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
  for (const [d, k] of dens) {
    const dir = `${RES}/mipmap-${d}`;
    mkdirSync(dir, { recursive: true });
    write(`${dir}/ic_launcher.png`, Math.round(48 * k), false, 0.8);
    write(`${dir}/ic_launcher_round.png`, Math.round(48 * k), true, 0.62);
    // ikona adaptacyjna 108 dp: rysunek w bezpiecznym środku (66 dp ≈ 61%)
    const a = Math.round(108 * k);
    writeFileSync(`${dir}/ic_launcher_foreground.png`, png(a, a, icon(a, true, 0.5, false)));
    writeFileSync(`${dir}/ic_launcher_background.png`, png(a, a, glowOnly(a)));
    // ikonka powiadomień 24 dp: biała sylwetka kowadła
    const nd = `${RES}/drawable-${d}`;
    mkdirSync(nd, { recursive: true });
    writeFileSync(`${nd}/ic_stat_kuznia.png`, png(Math.round(24 * k), Math.round(24 * k), silhouette(Math.round(24 * k))));
  }
  // ekrany startowe: te same wymiary co szablon Capacitora
  for (const dir of readdirSync(RES).filter(d => d.startsWith('drawable'))) {
    const f = `${RES}/${dir}/splash.png`;
    if (!existsSync(f)) continue;
    const { w, h } = pngSize(readFileSync(f));
    writeFileSync(f, png(w, h, splash(w, h)));
  }
  for (const f of ['mipmap-anydpi-v26/ic_launcher.xml', 'mipmap-anydpi-v26/ic_launcher_round.xml']) {
    const p = `${RES}/${f}`;
    if (existsSync(p)) writeFileSync(p, readFileSync(p, 'utf8').replace('@color/ic_launcher_background', '@mipmap/ic_launcher_background').replace('@drawable/ic_launcher_background', '@mipmap/ic_launcher_background'));
  }
  writeFileSync(`${RES}/values/ic_launcher_background.xml`, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#16120F</color>\n</resources>\n');
}
console.log('Ikony gotowe');
