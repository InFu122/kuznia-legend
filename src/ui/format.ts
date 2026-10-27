import { RAR } from '../data';

export function fmt(n: number): string {
  const v = Math.round(n);
  if (v >= 1e9) return (v / 1e9).toFixed(2).replace('.', ',') + ' mld';
  if (v >= 1e6) return (v / 1e6).toFixed(2).replace('.', ',') + ' mln';
  if (v >= 1e5) return Math.round(v / 1000) + ' tys.';
  return v.toLocaleString('pl-PL');
}
export const f1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
export const pct = (v: number) => f1(v) + '%';
/** Procent z dwoma miejscami po przecinku dla bardzo małych szans (np. 0,03%). */
export const pctS = (v: number) => (v < 0.1 ? v.toFixed(2).replace('.', ',') + '%' : pct(v));

export function tfmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return x ? `${m} min ${x} s` : `${m} min`;
  return `${x} s`;
}

export const rarName = (r: number) => RAR[r].n;
