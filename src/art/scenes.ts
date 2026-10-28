// Tła krain i lochów w pixel arcie, rysowane w kodzie (bez plików graficznych): niebo z ditheringiem,
// warstwy sylwetek (góry, lasy, ruiny, wydmy, jaskinie…) i efekty (śnieg, żar, deszcz, gwiazdy, mgła).
// Każda scena to opis z kilku warstw; ten sam generator rysuje 16 krain i lochy. Obraz 160×96, skalowany ostro.
import { mulberry32 } from '../engine/rng';

export const SCENE_W = 160;
export const SCENE_H = 96;

type RGB = [number, number, number];
const hex = (c: string): RGB => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lift = (c: RGB, k: number): RGB => (k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));

/** Macierz Bayera 4×4 — dithering przejść kolorów. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const dith = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

class Buf {
  readonly px = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  set(x: number, y: number, c: RGB, a = 1): void {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= SCENE_W || y >= SCENE_H) return;
    const i = (y * SCENE_W + x) * 4;
    if (a >= 1) { this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = 255; return; }
    // półprzezroczystość: mieszanie z tym, co już jest (mgła, poświata) — gładko, bez kropek
    if (a <= 0) return;
    this.px[i] += (c[0] - this.px[i]) * a; this.px[i + 1] += (c[1] - this.px[i + 1]) * a; this.px[i + 2] += (c[2] - this.px[i + 2]) * a; this.px[i + 3] = 255;
  }
  get(x: number, y: number): RGB {
    const i = (Math.max(0, Math.min(SCENE_H - 1, y)) * SCENE_W + Math.max(0, Math.min(SCENE_W - 1, x))) * 4;
    return [this.px[i], this.px[i + 1], this.px[i + 2]];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  /** Słupek od y do ziemi (dołu obrazu albo `to`). */
  col(x: number, y: number, c: RGB, to = SCENE_H): void { for (let j = Math.max(0, Math.round(y)); j < to; j++) this.set(x, j, c); }
  disc(cx: number, cy: number, r: number, c: RGB, a = 1): void {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c, a);
  }
}

/* ---------- warstwy ---------- */

export type Layer =
  | { k: 'mountains'; base: number; amp: number; c: string; snow?: string; jag?: number; freq?: number }
  | { k: 'hills'; base: number; amp: number; c: string; freq?: number }
  | { k: 'dunes'; base: number; amp: number; c: string }
  | { k: 'pines'; base: number; h: number; c: string; gap?: number }
  | { k: 'deadtrees'; base: number; h: number; c: string; n: number }
  | { k: 'houses'; base: number; c: string; n: number; burnt?: boolean; smoke?: string }
  | { k: 'castle'; base: number; c: string; x: number; w: number; ruined?: boolean }
  | { k: 'tower'; base: number; c: string; x: number; h: number; w?: number; spire?: boolean; glow?: string }
  | { k: 'spires'; base: number; c: string; n: number; h: number }
  | { k: 'volcano'; base: number; c: string; x: number; h: number; lava: string }
  | { k: 'cave'; c: string; c2: string; lamps?: string }
  | { k: 'water'; y: number; c: string; c2: string; shine?: string }
  | { k: 'ground'; y: number; c: string; c2?: string; tufts?: string }
  | { k: 'graves'; base: number; c: string; n: number }
  | { k: 'bones'; base: number; c: string; n: number }
  | { k: 'crystals'; base: number; c: string; glow: string; n: number }
  | { k: 'mushrooms'; base: number; c: string; glow: string; n: number }
  | { k: 'islands'; base: number; c: string; n: number }
  | { k: 'arch'; base: number; c: string; x: number; w: number; h: number; glow?: string }
  | { k: 'pillars'; base: number; c: string; n: number; h: number }
  | { k: 'fog'; y: number; h: number; c: string; a: number }
  | { k: 'glow'; x: number; y: number; r: number; c: string; a?: number };

export interface Scene {
  sky: string[];                                       // kolory nieba od góry do horyzontu
  skyH?: number;                                       // wysokość nieba (domyślnie cały obraz)
  sun?: { x: number; y: number; r: number; c: string; glow?: string; moon?: boolean };
  stars?: number;
  aurora?: string;
  layers: Layer[];
  fx?: { k: 'snow' | 'embers' | 'rain' | 'spores' | 'lightning' | 'ash'; c: string; n?: number }[];
  seed: number;
}

function noise1(rng: () => number, freq: number): (x: number) => number {
  const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const k = [1, 2.3, 5.1, 11.7].map(f => f * freq);
  return x => (Math.sin(x * k[0] + ph[0]) * 0.5 + Math.sin(x * k[1] + ph[1]) * 0.28 + Math.sin(x * k[2] + ph[2]) * 0.14 + Math.sin(x * k[3] + ph[3]) * 0.08 + 1) / 2;
}

function drawLayer(b: Buf, L: Layer, rng: () => number): void {
  switch (L.k) {
    case 'mountains': {
      // Szczyty jak w klasycznym pixel arcie: trójkąty z jasnym zboczem z lewej i ciemnym z prawej, czapy śniegu.
      const c = hex(L.c), lit = lift(c, 0.17), dark = lift(c, -0.2), snow = L.snow ? hex(L.snow) : null;
      const n = Math.round(6 * (L.freq ?? 1) + rng() * 3);
      const peaks = Array.from({ length: n }, (_, i) => ({
        x: ((i + 0.2 + rng() * 0.6) / n) * (SCENE_W + 30) - 15,
        h: L.amp * (0.55 + rng() * 0.45),
        w: (SCENE_W / n) * (0.9 + rng() * 0.7),
      })).sort((a, b2) => a.h - b2.h);
      for (const pk of peaks) {
        const py = L.base - pk.h;
        for (let x = Math.floor(pk.x - pk.w); x <= pk.x + pk.w; x++) {
          const d = Math.abs(x - pk.x) / pk.w;
          const top = py + pk.h * d + (L.jag ? Math.sin(x * 1.7 + pk.x) * L.jag * 0.5 * (1 - d) : 0);
          for (let y = Math.max(0, Math.round(top)); y < SCENE_H; y++) {
            const ridge = pk.x + (y - py) * 0.18 + Math.sin(y * 0.8) * 0.8; // linia grani schodzi lekko w prawo
            let col = x < ridge ? lit : dark;
            if (y > L.base - 2) col = c;
            if (snow && y < py + pk.h * 0.28 + Math.sin(x * 1.3) * 1.5 && pk.h > L.amp * 0.62) col = x < ridge ? lift(snow, 0.15) : lift(snow, -0.12);
            b.set(x, y, col);
          }
        }
      }
      break;
    }
    case 'hills': {
      const c = hex(L.c), lit = lift(c, 0.1);
      const n = noise1(rng, (L.freq ?? 1) * 0.025);
      for (let x = 0; x < SCENE_W; x++) { const y = Math.round(L.base - L.amp * n(x)); b.col(x, y, c); b.set(x, y, lit); }
      break;
    }
    case 'dunes': {
      const c = hex(L.c), lit = lift(c, 0.16), dark = lift(c, -0.14);
      const n = noise1(rng, 0.03);
      const hs = Array.from({ length: SCENE_W }, (_, x) => L.base - L.amp * n(x));
      for (let x = 0; x < SCENE_W; x++) {
        const s = hs[Math.min(SCENE_W - 1, x + 2)] - hs[Math.max(0, x - 2)];
        const face = s < -0.25 ? lit : s > 0.25 ? dark : c;
        const y0 = Math.round(hs[x]);
        for (let y = y0; y < SCENE_H; y++) b.set(x, y, y - y0 < 3 + Math.abs(s) * 3 ? face : c);
        b.set(x, y0, lift(c, 0.28));
      }
      break;
    }
    case 'pines': {
      const c = hex(L.c), lit = lift(c, 0.1);
      for (let x = -4; x < SCENE_W + 4; x += (L.gap ?? 5) + Math.floor(rng() * 4)) {
        const h = L.h * (0.7 + rng() * 0.5);
        const top = L.base - h;
        for (let j = 0; j <= h; j++) {
          const w = Math.floor((j / h) * (h / 2.6)) + (j % 3 === 0 ? 0 : 1);
          for (let i = -w; i <= w; i++) b.set(x + i, top + j, i < 0 ? lit : c);
        }
        b.col(x, L.base, lift(c, -0.2), L.base + 3);
      }
      break;
    }
    case 'deadtrees': {
      const c = hex(L.c);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor(rng() * SCENE_W), h = L.h * (0.6 + rng() * 0.5);
        for (let j = 0; j < h; j++) { b.set(x, L.base - j, c); if (j < h * 0.35) b.set(x + 1, L.base - j, c); }
        for (let k = 0; k < 4; k++) {
          const y0 = L.base - h * (0.45 + rng() * 0.5), dir = rng() < 0.5 ? -1 : 1, len = 3 + Math.floor(rng() * 6);
          for (let i = 0; i < len; i++) b.set(x + dir * i, y0 - i * (0.5 + rng() * 0.6), c);
        }
      }
      break;
    }
    case 'houses': {
      const c = hex(L.c), smoke = L.smoke ? hex(L.smoke) : null;
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor((t + 0.2 + rng() * 0.6) * (SCENE_W / L.n)) - 8, w = 12 + Math.floor(rng() * 8), h = 7 + Math.floor(rng() * 5);
        b.rect(x, L.base - h, w, h, c);
        for (let j = 0; j < w / 2 + 1; j++) {
          const broken = L.burnt && rng() < 0.35;
          if (!broken) for (let i = j; i < w - j; i++) b.set(x + i, L.base - h - j, c);
        }
        b.rect(x + Math.floor(w / 2) - 1, L.base - 4, 3, 4, lift(c, -0.35));
        if (L.burnt) b.rect(x + 2, L.base - h + 2, 2, 2, hex('#ff8a3c'));
        if (smoke) for (let j = 0; j < 26; j++) b.set(x + w / 2 + Math.sin(j * 0.4 + t) * 2.5, L.base - h - w / 2 - j, smoke, 0.55 - j * 0.018);
      }
      break;
    }
    case 'castle': {
      const c = hex(L.c), win = lift(c, -0.3);
      const top = L.base - 16;
      for (let i = 0; i < L.w; i++) {
        let h = 16;
        if (L.ruined) { const seg = Math.floor(i / 6); h -= ((seg * 7919) % 5) * 2 + (Math.sin(seg * 1.7) > 0.5 ? 6 : 0); }
        b.col(L.x + i, L.base - h, c, L.base);
        if (i % 4 < 2 && (!L.ruined || rng() < 0.7)) b.set(L.x + i, L.base - h - 1, c);
      }
      for (const tx of [L.x - 3, L.x + L.w - 5]) {
        const th = L.ruined ? 22 + Math.floor(rng() * 6) : 30;
        b.rect(tx, L.base - th, 8, th, c);
        for (let i = 0; i < 8; i += 2) b.set(tx + i, L.base - th - 1, c);
        b.rect(tx + 3, L.base - th + 6, 2, 3, win);
      }
      b.rect(L.x + Math.floor(L.w / 2) - 3, top + 6, 6, 10, win);
      break;
    }
    case 'tower': {
      const c = hex(L.c), w = L.w ?? 9;
      b.rect(L.x, L.base - L.h, w, L.h, c);
      for (let i = 0; i < w + 2; i += 2) b.set(L.x - 1 + i, L.base - L.h - 1, c);
      if (L.spire) for (let j = 0; j < 14; j++) { const hw = Math.max(0, Math.floor((14 - j) / 3)); for (let i = -hw; i <= hw; i++) b.set(L.x + w / 2 + i, L.base - L.h - 1 - j, c); }
      if (L.glow) { const g = hex(L.glow); for (let j = 8; j < L.h - 4; j += 9) b.rect(L.x + Math.floor(w / 2) - 1, L.base - L.h + j, 2, 3, g); }
      break;
    }
    case 'spires': {
      const c = hex(L.c), lit = lift(c, 0.12);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor(rng() * SCENE_W), h = L.h * (0.55 + rng() * 0.6), w = 3 + Math.floor(rng() * 4);
        for (let j = 0; j < h; j++) {
          const hw = Math.max(0, Math.round(w * (j / h)));
          for (let i = -hw; i <= hw; i++) b.set(x + i, L.base - h + j, i < 0 ? lit : c);
        }
      }
      break;
    }
    case 'volcano': {
      const c = hex(L.c), lava = hex(L.lava), lit = lift(c, 0.12);
      for (let i = -60; i <= 60; i++) {
        const top = L.base - L.h + Math.max(0, Math.abs(i) - 7) * (L.h / 52);
        if (top < L.base) b.col(L.x + i, top, i < 0 ? lit : c, L.base + 1);
      }
      for (let i = -6; i <= 6; i++) b.set(L.x + i, L.base - L.h, lava);
      for (let f = 0; f < 3; f++) {
        let x = L.x - 4 + f * 4;
        for (let j = 0; j < L.h - 4; j++) { x += (rng() - 0.5) * 1.6; b.set(x, L.base - L.h + 1 + j, lava, 0.85); }
      }
      for (let j = 1; j < 20; j++) b.disc(L.x + Math.sin(j) * 2, L.base - L.h - j * 1.6, 2 + j * 0.12, hex('#3a2a2a'), 0.5 - j * 0.02);
      break;
    }
    case 'cave': {
      const c = hex(L.c), c2 = hex(L.c2);
      b.rect(0, 0, SCENE_W, SCENE_H, c2);
      const n = noise1(rng, 0.06);
      for (let x = 0; x < SCENE_W; x++) {
        const ceil = 6 + n(x) * 14 + (x % 7 === 0 ? 6 + rng() * 12 : 0);
        for (let y = 0; y < ceil; y++) b.set(x, y, y > ceil - 2 ? lift(c, 0.12) : c);
        const wall = x < 18 ? (18 - x) * 3 : x > SCENE_W - 18 ? (x - SCENE_W + 18) * 3 : 0;
        for (let y = SCENE_H - wall - 20; y < SCENE_H; y++) if (wall) b.set(x, y, c);
      }
      if (L.lamps) {
        const lp = hex(L.lamps);
        for (const lx of [28, 74, 122]) {
          b.col(lx, 30, lift(c, 0.2), 70);
          b.rect(lx - 6, 30, 13, 2, lift(c, 0.2));
          b.disc(lx + 4, 34, 6, lp, 0.18); b.rect(lx + 3, 33, 2, 3, lp);
        }
      }
      break;
    }
    case 'water': {
      const c = hex(L.c), c2 = hex(L.c2), shine = L.shine ? hex(L.shine) : lift(c, 0.35);
      for (let y = L.y; y < SCENE_H; y++) for (let x = 0; x < SCENE_W; x++) b.set(x, y, dith(x, y) < (y - L.y) / (SCENE_H - L.y) ? c2 : c);
      for (let k = 0; k < 40; k++) { const x = rng() * SCENE_W, y = L.y + 1 + rng() * (SCENE_H - L.y - 2), w = 2 + rng() * 6; for (let i = 0; i < w; i++) b.set(x + i, y, shine); }
      break;
    }
    case 'ground': {
      const c = hex(L.c), c2 = L.c2 ? hex(L.c2) : lift(c, -0.2);
      for (let y = L.y; y < SCENE_H; y++) for (let x = 0; x < SCENE_W; x++) b.set(x, y, dith(x, y) < (y - L.y) / (SCENE_H - L.y) * 0.9 ? c2 : c);
      for (let x = 0; x < SCENE_W; x++) b.set(x, L.y, lift(c, 0.15));
      if (L.tufts) { const t = hex(L.tufts); for (let k = 0; k < 30; k++) { const x = rng() * SCENE_W; b.set(x, L.y - 1, t); b.set(x + 1, L.y - 2, t); } }
      break;
    }
    case 'graves': {
      const c = hex(L.c);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor(rng() * SCENE_W), cross = rng() < 0.4, y = L.base + Math.floor(rng() * 6);
        if (cross) { b.rect(x, y - 9, 2, 9, c); b.rect(x - 2, y - 7, 6, 2, c); }
        else { b.rect(x, y - 6, 5, 6, c); b.rect(x + 1, y - 7, 3, 1, c); }
      }
      break;
    }
    case 'bones': {
      const c = hex(L.c);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor(rng() * SCENE_W), y = L.base + Math.floor(rng() * 8), r = 5 + Math.floor(rng() * 7);
        for (let k = 0; k < 5; k++) for (let a = 0; a <= 12; a++) {
          const ang = Math.PI * (a / 12);
          if (rng() < 0.85) b.set(x + k * 3 + Math.cos(ang) * 1.5, y - Math.sin(ang) * r, c);
        }
        b.rect(x - 2, y, 18, 1, c);
      }
      break;
    }
    case 'crystals': {
      const c = hex(L.c), g = hex(L.glow);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor(rng() * SCENE_W), y = L.base + Math.floor(rng() * 10), h = 6 + Math.floor(rng() * 12);
        b.disc(x, y - h / 2, Math.round(h * 0.6), g, 0.16);
        for (let j = 0; j < h; j++) { const hw = Math.max(0, Math.round(2 - Math.abs(j - h * 0.65) / (h * 0.35) * 2)); for (let i = -hw; i <= hw; i++) b.set(x + i, y - j, i < 0 ? lift(c, 0.3) : c); }
      }
      break;
    }
    case 'mushrooms': {
      const c = hex(L.c), g = hex(L.glow);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor(rng() * SCENE_W), y = L.base + Math.floor(rng() * 10), h = 4 + Math.floor(rng() * 10), r = 2 + Math.floor(h / 3);
        b.disc(x, y - h, r + 3, g, 0.15);
        b.col(x, y - h, lift(c, -0.1), y);
        for (let i = -r; i <= r; i++) for (let j = 0; j <= Math.round(Math.sqrt(r * r - i * i) * 0.6); j++) b.set(x + i, y - h - j, j === 0 ? g : c);
      }
      break;
    }
    case 'islands': {
      const c = hex(L.c), lit = lift(c, 0.12);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor((t + 0.5) * (SCENE_W / L.n) + (rng() - 0.5) * 20), w = 14 + Math.floor(rng() * 22), h = 5 + Math.floor(rng() * 12);
        for (let i = 0; i < w; i++) { const top = L.base - Math.sin((i / w) * Math.PI) * h - (rng() < 0.2 ? 1 : 0); b.col(x + i, top, i < w / 2 ? lit : c, L.base + 1); }
      }
      break;
    }
    case 'arch': {
      const c = hex(L.c);
      for (let i = 0; i < L.w; i++) {
        const inner = Math.abs(i - L.w / 2) < L.w / 2 - 4;
        const archTop = L.base - L.h + 4 + (inner ? Math.sqrt(Math.max(0, (L.w / 2 - 4) ** 2 - (i - L.w / 2) ** 2)) * -1 + L.w / 2 : 0);
        b.col(L.x + i, L.base - L.h, c, inner ? Math.round(archTop) : L.base);
      }
      if (L.glow) b.disc(L.x + L.w / 2, L.base - 6, Math.round(L.w / 3), hex(L.glow), 0.3);
      break;
    }
    case 'pillars': {
      const c = hex(L.c), lit = lift(c, 0.14);
      for (let t = 0; t < L.n; t++) {
        const x = Math.floor((t + 0.5) * (SCENE_W / L.n)) - 3, h = L.h * (rng() < 0.3 ? 0.4 + rng() * 0.4 : 1);
        b.rect(x, L.base - h, 6, h, c); b.rect(x, L.base - h, 2, h, lit); b.rect(x - 1, L.base - h, 8, 2, lit);
      }
      break;
    }
    case 'fog': {
      const c = hex(L.c);
      for (let y = L.y; y < L.y + L.h; y++) {
        const a = L.a * Math.sin(((y - L.y) / L.h) * Math.PI);
        for (let x = 0; x < SCENE_W; x++) b.set(x, y, c, a * (0.75 + 0.25 * Math.sin(x * 0.11 + y)));
      }
      break;
    }
    case 'glow':
      b.disc(L.x, L.y, L.r, hex(L.c), L.a ?? 0.3);
      break;
  }
}

/** Rysuje scenę do bufora RGBA (bez DOM — test i narzędzia też z tego korzystają). */
export function renderScene(sc: Scene): Uint8ClampedArray {
  const rng = mulberry32(sc.seed);
  const r = () => rng.next();
  const b = new Buf();
  const sky = sc.sky.map(hex), H = sc.skyH ?? SCENE_H;
  for (let y = 0; y < SCENE_H; y++) {
    const t = Math.min(0.999, y / H) * (sky.length - 1);
    const i = Math.floor(t), f = t - i;
    for (let x = 0; x < SCENE_W; x++) b.set(x, y, f > dith(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i]);
  }
  if (sc.aurora) {
    const a = hex(sc.aurora);
    for (let x = 0; x < SCENE_W; x++) { const y0 = 10 + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19) * 3; for (let j = 0; j < 12; j++) b.set(x, y0 + j, a, 0.35 * (1 - j / 12)); }
  }
  for (let k = 0; k < (sc.stars ?? 0); k++) b.set(r() * SCENE_W, r() * (H * 0.6), r() < 0.2 ? [255, 255, 255] : [190, 200, 230]);
  if (sc.sun) {
    const s = sc.sun, c = hex(s.c);
    if (s.glow) { b.disc(s.x, s.y, s.r * 3, hex(s.glow), 0.18); b.disc(s.x, s.y, s.r * 2, hex(s.glow), 0.3); }
    b.disc(s.x, s.y, s.r, c);
    if (s.moon) b.disc(s.x + Math.ceil(s.r * 0.45), s.y - 1, s.r - 1, b.get(Math.round(s.x + s.r * 2.2), Math.round(s.y)));
  }
  for (const L of sc.layers) drawLayer(b, L, r);
  for (const f of sc.fx ?? []) {
    const c = hex(f.c), n = f.n ?? 60;
    switch (f.k) {
      case 'snow': for (let k = 0; k < n; k++) b.set(r() * SCENE_W, r() * SCENE_H, c, r() < 0.5 ? 1 : 0.6); break;
      case 'ash': for (let k = 0; k < n; k++) b.set(r() * SCENE_W, r() * SCENE_H, c, 0.7); break;
      case 'embers': for (let k = 0; k < n; k++) { const x = r() * SCENE_W, y = SCENE_H * (0.35 + r() * 0.6); b.set(x, y, c); if (r() < 0.3) b.set(x, y - 1, lift(c, 0.4)); } break;
      case 'spores': for (let k = 0; k < n; k++) { const x = r() * SCENE_W, y = r() * SCENE_H; b.set(x, y, c); b.disc(x, y, 2, c, 0.15); } break;
      case 'rain': for (let k = 0; k < n; k++) { const x = r() * SCENE_W, y = r() * SCENE_H; for (let j = 0; j < 4; j++) b.set(x - j * 0.5, y + j, c, 0.6); } break;
      case 'lightning': {
        let x = 30 + r() * 100, y = 0;
        while (y < SCENE_H * 0.55) { const nx = x + (r() - 0.5) * 8, ny = y + 3 + r() * 4; for (let j = 0; j <= 6; j++) b.set(x + (nx - x) * (j / 6), y + (ny - y) * (j / 6), c); x = nx; y = ny; }
        break;
      }
    }
  }
  return b.px;
}

/* ---------- 16 krain ---------- */

export const LAND_SCENES: Scene[] = [
  { // Spalona Wioska — zmierzch, dymiące chaty
    seed: 11, sky: ['#2a1d3a', '#6a2f3f', '#c4553a', '#f0a050'], skyH: 70,
    sun: { x: 120, y: 58, r: 7, c: '#ffd27a', glow: '#ff7a3c' },
    layers: [
      { k: 'hills', base: 70, amp: 14, c: '#4a2a33' },
      { k: 'houses', base: 76, c: '#241820', n: 4, burnt: true, smoke: '#5a4a52' },
      { k: 'deadtrees', base: 78, h: 18, c: '#1d1418', n: 3 },
      { k: 'ground', y: 76, c: '#3a2a26', c2: '#241a18' },
    ],
    fx: [{ k: 'embers', c: '#ff9a4a', n: 40 }],
  },
  { // Mroczny Las — gęsty bór we mgle
    seed: 12, sky: ['#0f1a24', '#1e3436', '#3a5a4c'], skyH: 64,
    sun: { x: 36, y: 16, r: 5, c: '#dfe8d0', glow: '#8fb09a', moon: true }, stars: 25,
    layers: [
      { k: 'pines', base: 62, h: 26, c: '#1c3328', gap: 4 },
      { k: 'fog', y: 46, h: 18, c: '#7a9a88', a: 0.45 },
      { k: 'pines', base: 78, h: 34, c: '#0e1c16', gap: 7 },
      { k: 'ground', y: 78, c: '#1a2a1e', c2: '#0e1810', tufts: '#2e4a32' },
    ],
    fx: [{ k: 'spores', c: '#c8f07a', n: 10 }],
  },
  { // Mokradła Wiedźm — bagno, martwe drzewa
    seed: 13, sky: ['#1a2420', '#3a4a30', '#7a8a4a'], skyH: 66,
    sun: { x: 110, y: 20, r: 5, c: '#e8f0b0', glow: '#9ab060', moon: true },
    layers: [
      { k: 'hills', base: 62, amp: 8, c: '#2a3a24' },
      { k: 'deadtrees', base: 70, h: 26, c: '#141c12', n: 5 },
      { k: 'water', y: 70, c: '#2a3a2a', c2: '#18241a', shine: '#6a8a4a' },
      { k: 'fog', y: 58, h: 16, c: '#8aa070', a: 0.5 },
    ],
    fx: [{ k: 'spores', c: '#b8f060', n: 18 }],
  },
  { // Ruiny Twierdzy — zamek w ruinie, chłodny wieczór
    seed: 14, sky: ['#1e1a2e', '#3c3450', '#7a6a7a', '#b09088'], skyH: 70,
    sun: { x: 130, y: 40, r: 6, c: '#f0d8b0', glow: '#c08870' },
    layers: [
      { k: 'mountains', base: 64, amp: 18, c: '#3a3446' },
      { k: 'castle', base: 74, c: '#221e2a', x: 46, w: 64, ruined: true },
      { k: 'ground', y: 74, c: '#3a3436', c2: '#22201f', tufts: '#4a4a3a' },
    ],
  },
  { // Krasnoludzkie Kopalnie — sztolnia z lampami
    seed: 21, sky: ['#000000'],
    layers: [
      { k: 'cave', c: '#2a2018', c2: '#1a140f', lamps: '#ffb04a' },
      { k: 'crystals', base: 80, c: '#7ab8d8', glow: '#9ae0ff', n: 4 },
      { k: 'ground', y: 80, c: '#3a2c20', c2: '#22190f' },
    ],
    fx: [{ k: 'ash', c: '#6a5a4a', n: 30 }],
  },
  { // Lodowe Szczyty — ośnieżone szczyty, śnieżyca
    seed: 22, sky: ['#6a8ab8', '#a8c8e8', '#e0eef8'], skyH: 66,
    sun: { x: 30, y: 18, r: 6, c: '#ffffff', glow: '#d0e8ff' },
    layers: [
      { k: 'mountains', base: 60, amp: 34, c: '#8aa0c0', snow: '#f4f8ff', jag: 3 },
      { k: 'mountains', base: 76, amp: 20, c: '#5a7090', snow: '#e8f0fa', jag: 2, freq: 1.5 },
      { k: 'ground', y: 80, c: '#e8f0f8', c2: '#b8c8e0' },
    ],
    fx: [{ k: 'snow', c: '#ffffff', n: 90 }],
  },
  { // Grzmiące Przełęcze — burza nad przełęczą
    seed: 23, sky: ['#14161e', '#2a2e40', '#4a4e60'], skyH: 66,
    layers: [
      { k: 'mountains', base: 62, amp: 30, c: '#2e3240', jag: 4 },
      { k: 'mountains', base: 78, amp: 22, c: '#1c1f28', jag: 3, freq: 1.4 },
      { k: 'ground', y: 82, c: '#2a2a2e', c2: '#18181c' },
    ],
    fx: [{ k: 'lightning', c: '#e8f0ff' }, { k: 'rain', c: '#8a9ab8', n: 90 }],
  },
  { // Głębiny Podgórza — jaskinia z grzybami
    seed: 24, sky: ['#000000'],
    layers: [
      { k: 'cave', c: '#1a1626', c2: '#100c1a' },
      { k: 'mushrooms', base: 78, c: '#6a3a8a', glow: '#d08aff', n: 9 },
      { k: 'ground', y: 82, c: '#241c30', c2: '#140f1c' },
    ],
    fx: [{ k: 'spores', c: '#e0b0ff', n: 25 }],
  },
  { // Nawiedzone Krypty — cmentarz w księżycową noc
    seed: 31, sky: ['#0a0c18', '#182038', '#2a3450'], skyH: 70,
    sun: { x: 120, y: 20, r: 8, c: '#e8f0ff', glow: '#7a8ab8', moon: true }, stars: 40,
    layers: [
      { k: 'deadtrees', base: 70, h: 24, c: '#0e1220', n: 3 },
      { k: 'arch', base: 72, c: '#161a28', x: 56, w: 34, h: 30, glow: '#6aff9a' },
      { k: 'graves', base: 74, c: '#1c2232', n: 10 },
      { k: 'fog', y: 62, h: 18, c: '#6ac89a', a: 0.35 },
      { k: 'ground', y: 78, c: '#1a2028', c2: '#0e1218' },
    ],
  },
  { // Pustynia Kości — skwar, wydmy, szkielety
    seed: 32, sky: ['#d07a3a', '#f0b060', '#f8e0a0'], skyH: 60,
    sun: { x: 40, y: 22, r: 9, c: '#fff4c8', glow: '#ffd070' },
    layers: [
      { k: 'dunes', base: 66, amp: 12, c: '#c89050' },
      { k: 'bones', base: 74, c: '#f0e6d0', n: 3 },
      { k: 'dunes', base: 84, amp: 8, c: '#a87038' },
    ],
  },
  { // Cytadela Lisza — mroczna cytadela, zielone światła
    seed: 33, sky: ['#0e0a18', '#241838', '#3a2a50'], skyH: 70, stars: 30,
    layers: [
      { k: 'mountains', base: 66, amp: 22, c: '#1e1830', jag: 3 },
      { k: 'tower', base: 74, c: '#100c1a', x: 72, h: 52, w: 14, spire: true, glow: '#7aff9a' },
      { k: 'tower', base: 74, c: '#140f20', x: 52, h: 34, spire: true, glow: '#7aff9a' },
      { k: 'tower', base: 74, c: '#140f20', x: 98, h: 38, spire: true, glow: '#7aff9a' },
      { k: 'glow', x: 79, y: 20, r: 10, c: '#7aff9a', a: 0.18 },
      { k: 'ground', y: 74, c: '#1a1424', c2: '#0e0a14' },
    ],
    fx: [{ k: 'spores', c: '#9affb0', n: 14 }],
  },
  { // Spaczony Klasztor — krwawe niebo, wieże klasztoru
    seed: 34, sky: ['#2a0a14', '#6a1a24', '#b0343a'], skyH: 66,
    sun: { x: 124, y: 26, r: 7, c: '#ffd0b0', glow: '#ff5a4a' },
    layers: [
      { k: 'hills', base: 66, amp: 10, c: '#3a141c' },
      { k: 'tower', base: 76, c: '#1a0a10', x: 40, h: 40, w: 12, spire: true, glow: '#ff6a4a' },
      { k: 'castle', base: 76, c: '#1a0a10', x: 56, w: 50 },
      { k: 'pillars', base: 82, c: '#2a1218', n: 4, h: 18 },
      { k: 'ground', y: 82, c: '#2a141a', c2: '#160a0e' },
    ],
    fx: [{ k: 'ash', c: '#ff8a6a', n: 30 }],
  },
  { // Wulkaniczne Pustkowia — wulkan i lawa
    seed: 41, sky: ['#120806', '#3a120a', '#8a2a10', '#d0501a'], skyH: 70,
    layers: [
      { k: 'volcano', base: 70, c: '#2a1612', x: 96, h: 44, lava: '#ff7a1a' },
      { k: 'hills', base: 80, amp: 10, c: '#1c0e0a', freq: 2 },
      { k: 'water', y: 84, c: '#ff6a1a', c2: '#c03a0a', shine: '#ffd04a' },
    ],
    fx: [{ k: 'embers', c: '#ffb04a', n: 70 }],
  },
  { // Smocze Turnie — skalne iglice w zachodzie słońca
    seed: 42, sky: ['#3a1a3a', '#a04a4a', '#f09a5a', '#ffd8a0'], skyH: 70,
    sun: { x: 80, y: 62, r: 10, c: '#fff0c0', glow: '#ff9a5a' },
    layers: [
      { k: 'spires', base: 74, c: '#4a2630', n: 9, h: 50 },
      { k: 'spires', base: 82, c: '#2a141c', n: 7, h: 40 },
      { k: 'ground', y: 82, c: '#2e1a1c', c2: '#1a0e10' },
    ],
  },
  { // Burzowe Wyspy — morze w burzy
    seed: 43, sky: ['#0c1420', '#1e2c40', '#3a4a60'], skyH: 64,
    layers: [
      { k: 'islands', base: 66, c: '#1a2430', n: 3 },
      { k: 'water', y: 66, c: '#1e3448', c2: '#0e1a28', shine: '#8ab8d8' },
    ],
    fx: [{ k: 'lightning', c: '#ffffff' }, { k: 'rain', c: '#9ab8d8', n: 110 }],
  },
  { // Gwiezdny Krater — gwiezdne niebo i kryształy
    seed: 44, sky: ['#05040e', '#160e30', '#2e1a50'], skyH: 70, stars: 90, aurora: '#6ae0ff',
    layers: [
      { k: 'hills', base: 70, amp: 10, c: '#1a1230' },
      { k: 'crystals', base: 78, c: '#b08aff', glow: '#d0b0ff', n: 7 },
      { k: 'ground', y: 80, c: '#1e1636', c2: '#0e0a1c' },
      { k: 'glow', x: 80, y: 84, r: 22, c: '#6ae0ff', a: 0.1 },
    ],
    fx: [{ k: 'spores', c: '#c0f0ff', n: 20 }],
  },
];

/* ---------- lochy i arena ---------- */

export const DUNGEON_SCENES: Record<string, Scene> = {
  skarbiec: { seed: 51, sky: ['#000000'], layers: [{ k: 'cave', c: '#3a2a14', c2: '#22180a', lamps: '#ffd04a' }, { k: 'crystals', base: 80, c: '#f0c040', glow: '#ffe080', n: 8 }, { k: 'ground', y: 82, c: '#4a361a', c2: '#2a1e0e' }], fx: [{ k: 'spores', c: '#ffe080', n: 20 }] },
  sztolnia: { seed: 52, sky: ['#000000'], layers: [{ k: 'cave', c: '#2a2420', c2: '#161210', lamps: '#ffa040' }, { k: 'ground', y: 82, c: '#342a22', c2: '#1a1410' }], fx: [{ k: 'ash', c: '#5a4a3a', n: 40 }] },
  wieza: { seed: 53, sky: ['#1a2440', '#3a4a7a', '#8a9ac8'], skyH: 80, stars: 20, layers: [{ k: 'hills', base: 80, amp: 8, c: '#2a3050' }, { k: 'tower', base: 90, c: '#14182a', x: 66, h: 72, w: 28, spire: true, glow: '#ffd070' }, { k: 'ground', y: 88, c: '#1e2234', c2: '#10121c' }] },
  leza: { seed: 54, sky: ['#000000'], layers: [{ k: 'cave', c: '#2a1414', c2: '#180a0a' }, { k: 'bones', base: 80, c: '#d8ccb8', n: 4 }, { k: 'glow', x: 80, y: 70, r: 18, c: '#ff4a3a', a: 0.12 }, { k: 'ground', y: 84, c: '#2a1818', c2: '#160c0c' }] },
  oltarze: { seed: 55, sky: ['#120e24', '#2a2050', '#4a3a80'], skyH: 70, stars: 30, layers: [{ k: 'pillars', base: 80, c: '#2a2440', n: 5, h: 34 }, { k: 'glow', x: 80, y: 70, r: 12, c: '#8ab0ff', a: 0.2 }, { k: 'ground', y: 80, c: '#241e38', c2: '#120e1e' }], fx: [{ k: 'spores', c: '#b0c8ff', n: 25 }] },
  kopalnia: { seed: 56, sky: ['#000000'], layers: [{ k: 'cave', c: '#14202a', c2: '#0a1218' }, { k: 'crystals', base: 82, c: '#5ad0e8', glow: '#9af0ff', n: 10 }, { k: 'ground', y: 84, c: '#1a2830', c2: '#0c141a' }], fx: [{ k: 'spores', c: '#9af0ff', n: 15 }] },
  labirynt: { seed: 57, sky: ['#1a1410', '#3a2e22', '#5a4a36'], skyH: 60, layers: [{ k: 'castle', base: 64, c: '#2a2218', x: 10, w: 60 }, { k: 'castle', base: 64, c: '#2a2218', x: 90, w: 60 }, { k: 'arch', base: 82, c: '#1c160f', x: 62, w: 36, h: 40, glow: '#ff9a4a' }, { k: 'ground', y: 82, c: '#3a2e20', c2: '#1e170f' }] },
  zbrojownia: { seed: 58, sky: ['#000000'], layers: [{ k: 'cave', c: '#1e1e24', c2: '#121216', lamps: '#ffc070' }, { k: 'pillars', base: 84, c: '#2a2a32', n: 4, h: 40 }, { k: 'ground', y: 84, c: '#26262c', c2: '#141418' }], fx: [{ k: 'ash', c: '#8a8a9a', n: 20 }] },
  krypta: { seed: 59, sky: ['#000000'], layers: [{ k: 'cave', c: '#14181e', c2: '#0a0c10' }, { k: 'arch', base: 84, c: '#1c2028', x: 54, w: 52, h: 50, glow: '#e8d080' }, { k: 'graves', base: 84, c: '#22262e', n: 6 }, { k: 'ground', y: 86, c: '#1a1e24', c2: '#0c0e12' }], fx: [{ k: 'spores', c: '#f0e0a0', n: 12 }] },
  arena: { seed: 60, sky: ['#2a3a5a', '#6a7aa0', '#c0b8b0'], skyH: 60, sun: { x: 130, y: 18, r: 6, c: '#fff4d0', glow: '#ffd090' }, layers: [{ k: 'castle', base: 70, c: '#4a4040', x: 4, w: 152 }, { k: 'ground', y: 72, c: '#b09060', c2: '#806040' }] },
};
