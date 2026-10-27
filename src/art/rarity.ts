// Barwy rzadkości w pixel arcie: obwódka (1 px) wokół sprite'a przedmiotu — od braku przy Zwykłym
// po tęczową przy Boskim. Te same kolory co w interfejsie (--r0…--r6).

/** Kolor obwódki dla rzadkości 0–6 (0 — bez obwódki, 6 — tęcza). */
export const RARITY_GLOW: (string | null)[] = [null, '#5be37a', '#45a6ff', '#b77bff', '#ffa23a', '#ff4f64', 'rainbow'];

const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Kolor tęczy dla kąta (0–1). */
function rainbow(t: number): number[] {
  const stops = ['#ff4f64', '#ffa23a', '#ffe066', '#5be37a', '#45a6ff', '#b77bff', '#ff4f64'].map(hex);
  const x = (t % 1) * (stops.length - 1);
  const i = Math.floor(x), f = x - i;
  return stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
}

/**
 * Dokłada 1 px marginesu i obwódkę w kolorze rzadkości wokół nieprzezroczystych pikseli.
 * Zwraca nowy obraz (w+2)×(h+2).
 */
export function halo(src: Uint8ClampedArray, w: number, h: number, r: number): { px: Uint8ClampedArray; w: number; h: number } {
  const W = w + 2, H = h + 2;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (y * w + x) * 4, d = ((y + 1) * W + x + 1) * 4;
    px[d] = src[s]; px[d + 1] = src[s + 1]; px[d + 2] = src[s + 2]; px[d + 3] = src[s + 3];
  }
  const glow = RARITY_GLOW[Math.max(0, Math.min(6, r))];
  if (!glow) return { px, w: W, h: H };
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] === 255;
  const ring: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (solid(x, y)) continue;
    if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) ring.push([x, y]);
  }
  for (const [x, y] of ring) {
    const c = glow === 'rainbow' ? rainbow((Math.atan2(y - H / 2, x - W / 2) / (2 * Math.PI) + 1)) : hex(glow);
    const i = (y * W + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { px, w: W, h: H };
}
