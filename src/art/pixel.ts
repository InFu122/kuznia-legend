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
