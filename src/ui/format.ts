import { RAR } from '../data';

export function fmt(n: number): string {
  const v = Math.round(n);
  if (v >= 1e15) return (v / 1e15).toFixed(2).replace('.', ',') + ' bld';
  if (v >= 1e12) return (v / 1e12).toFixed(2).replace('.', ',') + ' bln';
  if (v >= 1e9) return (v / 1e9).toFixed(2).replace('.', ',') + ' mld';
  if (v >= 1e6) return (v / 1e6).toFixed(2).replace('.', ',') + ' mln';
  if (v >= 1e5) return Math.round(v / 1000) + ' tys.';
  return v.toLocaleString('pl-PL');
}
/** Krótka liczba do ciasnych miejsc (górny pasek): trzy cyfry znaczące, np. „1,54 bln”, „421 mld”, „50,0 mln”. */
export { shortNum as fmtShort } from '../engine/num';
export const f1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
export const pct = (v: number) => f1(v) + '%';
/** Procent z dwoma miejscami po przecinku dla bardzo małych szans (np. 0,03%). */
export const pctS = (v: number) => (v < 0.1 ? v.toFixed(2).replace('.', ',') + '%' : pct(v));

export function tfmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  if (h >= 48) return `${Math.floor(h / 24)} dni${h % 24 ? ` ${h % 24} h` : ''}`;
  if (h) return m ? `${h} h ${m} min` : `${h} h`;
  if (m) return x ? `${m} min ${x} s` : `${m} min`;
  return `${x} s`;
}

export const rarName = (r: number) => RAR[r].n;
