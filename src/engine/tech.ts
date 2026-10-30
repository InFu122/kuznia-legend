// Akademia Kowalska: badania za Księgi Wiedzy i złoto. Jeden slot badań naraz; czas biegnie też offline.
import { TECH, TECH_TIME_MIN, TECH_UNLOCK_FORGE } from '../data';
import { toast, type Ctx } from './context';
import { upCost } from './formulas';

/** Badania liczą koszt i czas jak dawna kuźnia do 30. poziomu. */
const TECH_CAP = 30;
import { techLvl } from './mods';
import { invalidate } from './stats';
import { track } from './missions';
import type { GameState, TechId } from './types';

export { allMods, techLvl, techMods } from './mods';

/** Koszt kolejnego poziomu badania (poziom `l` liczony od 0). */
export function techCost(id: TechId, l: number) {
  const T = TECH[id];
  return {
    books: T.b0 * (l + 1),
    gold: Math.round(upCost(Math.min(TECH_CAP, T.req + Math.floor(l * 1.2)))),
    // Czas jak dawne ulepszenia kuźni (TECH_TIME_MIN, do 30. „poziomu”): 40% czasu na poziom (wymagany + 1,2 × poziom badania), co najmniej 10 min.
    ms: Math.max(10 * 60000, Math.round(0.4 * TECH_TIME_MIN[Math.max(2, Math.min(TECH_CAP, T.req + 1 + Math.floor(l * 1.2)))] * 60000)),
  };
}

export type TechBlock = 'max' | 'forge' | 'busy' | 'books' | 'gold' | null;

export function techBlock(s: GameState, id: TechId): TechBlock {
  const T = TECH[id];
  const l = techLvl(s, id);
  if (l >= T.max) return 'max';
  if (s.forge.lvl < Math.max(T.req, TECH_UNLOCK_FORGE)) return 'forge';
  if (s.tech.cur) return 'busy';
  const c = techCost(id, l);
  if (s.books < c.books) return 'books';
  if (s.gold < c.gold) return 'gold';
  return null;
}

export function startResearch(ctx: Ctx, id: TechId): boolean {
  const s = ctx.s;
  if (techBlock(s, id)) return false;
  const c = techCost(id, techLvl(s, id));
  s.books -= c.books;
  s.gold -= c.gold;
  s.tech.cur = { id, left: c.ms, total: c.ms };
  track(ctx, 'research');
  ctx.dirty = true;
  return true;
}

/** Odlicza badanie o `ms` czasu gry. */
export function tickResearch(ctx: Ctx, ms: number, quiet = false): boolean {
  const cur = ctx.s.tech.cur;
  if (!cur) return false;
  cur.left -= ms;
  if (cur.left > 0) return false;
  const lvl = techLvl(ctx.s, cur.id) + 1;
  ctx.s.tech.lv[cur.id] = lvl;
  ctx.s.tech.cur = null;
  ctx.dirty = true;
  invalidate(ctx);
  if (!quiet) { toast(ctx, `Zbadano: ${TECH[cur.id].n} (poziom ${lvl})`, 'good'); ctx.emit({ t: 'sfx', k: 'levelup' }); }
  return true;
}

/** Łączna wartość efektu na danym poziomie, z przecinkiem dziesiętnym. */
export const techValue = (id: TechId, lvl: number) => String(Math.round(lvl * TECH[id].per * 10) / 10).replace('.', ',');
export function techText(id: TechId, lvl: number): string {
  return TECH[id].d.replace('{v}', techValue(id, lvl));
}
