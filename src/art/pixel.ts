// Pixel art zapisany jako siatki znaków + palety. Jeden szablon (np. miecz) przemalowuje się na każdy metal.
// Ten moduł jest czysty (bez DOM): zamienia sprite na tablicę RGBA, a przeglądarka i narzędzia robią z niej obraz.

/** Paleta: znak → kolor #rrggbb ('.' i ' ' to przezroczystość). */
export type Palette = Record<string, string>;
export interface Sprite { w: number; h: number; rows: string[] }

export const sprite = (rows: string[]): Sprite => ({ w: Math.max(...rows.map(r => r.length)), h: rows.length, rows });

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Piksele RGBA (w × h × 4). Znak bez koloru w palecie zostaje przezroczysty. */
export function rgba(s: Sprite, pal: Palette): Uint8ClampedArray {
  const out = new Uint8ClampedArray(s.w * s.h * 4);
  s.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = pal[row[x]];
      if (!c || row[x] === '.' || row[x] === ' ') continue;
      const [r, g, b] = hex(c);
      const i = (y * s.w + x) * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    }
  });
  return out;
}

/** Rozjaśnia albo przyciemnia kolor (do generowania ramp). */
export function shade(c: string, k: number): string {
  const [r, g, b] = hex(c);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---------- postaci „z brył” (tools/art/vol.py): materiał × 6 tonów ---------- */
/** Znaki tonów: materiał m (kolejny z ACTOR_MATS) i ton t → ACTOR_ALPH[m·6 + t]. */
export const ACTOR_ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuv';
export const ACTOR_MATS = 'pqrstuvx';

function toHsv(c: string): [number, number, number] {
  const [r, g, b] = hex(c).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx === 0 ? 0 : d / mx, mx];
}
function fromHsv(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)];
}
const toward = (h: number, target: number, deg: number) => { const d = ((target - h + 540) % 360) - 180; return (h + Math.max(-deg, Math.min(deg, d)) + 360) % 360; };
const hx = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
/** [mnożnik jasności (ujemny: rozjaśnienie do bieli), mnożnik nasycenia, barwa docelowa, o ile stopni]. */
const RAMP: [number, number, number, number][] = [[0.30, 1.15, 255, 24], [0.50, 1.14, 255, 16], [0.74, 1.08, 255, 8], [1, 1, 0, 0], [-0.32, 0.82, 55, 7], [-0.62, 0.52, 55, 13]];

/**
 * 6 tonów z koloru bazowego: 0 obrys, 1–2 cienie (chłodniejsze, mocniej nasycone), 3 baza, 4–5 światła (cieplejsze).
 * Przesunięcie barwy w cieniach i światłach daje żywszy pixel art niż samo ściemnianie.
 */
export function ramp6(base: string): string[] {
  const [h, s, v] = toHsv(base);
  return RAMP.map(([kv, ks, th, deg], i) => {
    const hh = s > 0.04 ? toward(h, th, deg) : h;
    const vv = kv > 0 ? v * kv : v + (1 - v) * -kv;
    let [r, g, b] = fromHsv(hh, Math.min(1, s * ks), vv);
    if (i === 0) { r = r * 0.7 + 0.078 * 0.3; g = g * 0.7 + 0.059 * 0.3; b = b * 0.7 + 0.102 * 0.3; }
    return hx(r, g, b);
  });
}

/** Paleta postaci z kolorów bazowych materiałów (p, q, r…), `e` — oczy, `g` — poświata. */
export function actorPalette(cols: Record<string, string>): Palette {
  const glow = cols.g ?? cols.e ?? '#ffd23a';
  const pal: Palette = { '+': '#ffffff', '#': '#140f1a', '*': cols.e ?? '#ffd23a', '~': glow, '^': shade(glow, 0.6) };
  for (const m of Object.keys(cols)) {
    const i = ACTOR_MATS.indexOf(m);
    if (i < 0 || m.length !== 1) continue;
    ramp6(cols[m]).forEach((c, t) => { pal[ACTOR_ALPH[i * 6 + t]] = c; });
  }
  return pal;
}

/** Rozpakowuje zapis RLE („12.3AB” → 12 kropek, 3×A, B) do wierszy o szerokości `w`. */
export function unrle(data: string, w: number): string[] {
  let flat = '';
  const re = /(\d*)(\D)/g;
  for (let m = re.exec(data); m; m = re.exec(data)) flat += m[1] ? m[2].repeat(Number(m[1])) : m[2];
  const rows: string[] = [];
  for (let i = 0; i < flat.length; i += w) rows.push(flat.slice(i, i + w));
  return rows;
}
