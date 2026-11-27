// Krótkie liczby (wspólne dla gry i interfejsu): do 99 999 w całości, wyżej trzy cyfry znaczące z jednostką.
// 123 tys. · 1,23 mln · 12,3 mln · 123 mln · 1,23 mld · 1,54 bln · 2,10 bld

/** Jednostki od największej: biliard, bilion, miliard, milion. */
export const UNITS: [number, string][] = [[1e15, 'bld'], [1e12, 'bln'], [1e9, 'mld'], [1e6, 'mln']];

/** Trzy cyfry znaczące: „1,23”, „12,3”, „123”. */
const sig3 = (x: number) => (x >= 100 ? String(Math.round(x)) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace('.', ',');

export function shortNum(n: number): string {
  const v = Math.round(n);
  const a = Math.abs(v);
  if (a < 1e5) return v.toLocaleString('pl-PL');
  for (const [u, nm] of UNITS) {
    // 999,6 mln zaokrągla się do „1000 mln” — wtedy już następna jednostka.
    if (a >= u * 0.9995) return (v < 0 ? '−' : '') + sig3(a / u) + ' ' + nm;
  }
  return (v < 0 ? '−' : '') + Math.round(a / 1000) + ' tys.';
}
