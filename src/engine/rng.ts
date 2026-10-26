/** Źródło losowości wstrzykiwane do silnika. W testach i na serwerze można podać ziarno. */
export interface Rng { next(): number }

/** Szybki generator z ziarnem (mulberry32). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export const rnd = (r: Rng, a: number, b: number) => a + r.next() * (b - a);
/** Liczba całkowita z przedziału [a, b]. */
export const ri = (r: Rng, a: number, b: number) => Math.floor(rnd(r, a, b + 1));
export const pick = <T>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r.next() * arr.length)];
export function shuffle<T>(r: Rng, arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
