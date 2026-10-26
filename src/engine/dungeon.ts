// Głęboka Sztolnia: loch „wyjdź albo ryzykuj”. Co 5 pięter gracz decyduje; porażka zabiera połowę łupu.
import { B, DUNGEON_FOES, LANDS } from '../data';
import type { Ctx } from './context';
import { Dstar, Hstar, early, todayStr } from './formulas';
import { addFame } from './legend';
import { pick } from './rng';

export function dungKeys(ctx: Ctx): number {
  const d = ctx.s.dung;
  const today = todayStr(ctx.now());
  if (d.day !== today) { d.day = today; d.keys = B.DUNGEON_KEYS; }
  return d.keys;
}

/** Sztolnia daje rudę o poziom lepszą niż główna ruda najdalszej krainy. */
export const dungTier = (ctx: Ctx) => Math.min(6, LANDS[ctx.s.maxLand].main + 1);

export function startDung(ctx: Ctx): boolean {
  const b = ctx.b;
  if (b.mode === 'dung' || dungKeys(ctx) < 1) return false;
  ctx.s.dung.keys--;
  b.mode = 'dung';
  b.dung = { floor: 1, loot: 0, tier: dungTier(ctx) };
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 300;
  ctx.dirty = true;
  return true;
}

export function spawnDung(ctx: Ctx): void {
  const b = ctx.b;
  if (!b.dung) return;
  const g = Math.max(0, Math.min(159, ctx.s.bestG - 4 + b.dung.floor * 1.5));
  const e = early(g);
  const max = B.WAVE_HP_MULT * Dstar(g) * 1.3 * e;
  b.enemy = { name: pick(ctx.rng, DUNGEON_FOES), count: 1, type: 'Bestie', max, hp: max, atk: (Hstar(g) / B.WAVE_ATK_DIV) * 1.1 * e, boss: false, int: 1200 };
  b.et = 0;
}

export function dungFloor(ctx: Ctx): void {
  const b = ctx.b;
  const d = b.dung;
  if (!d) return;
  d.loot += 1 + (d.floor % 3 === 0 ? 1 : 0);
  addFame(ctx, 3, 'Bestie', false);
  ctx.s.dung.best = Math.max(ctx.s.dung.best, d.floor);
  b.heroHp = Math.min(b.heroMax, b.heroHp + 0.25 * b.heroMax);
  b.enemy = null;
  ctx.emit({ t: 'float', side: 'foe', text: `Łup: ${d.loot}`, cls: 'loot', force: true });
  if (d.floor % B.DUNGEON_CHECKPOINT === 0) {
    b.pause = Number.POSITIVE_INFINITY;
    ctx.emit({ t: 'modal', m: { kind: 'dungChoice', floor: d.floor, loot: d.loot, tier: d.tier } });
  } else {
    d.floor++;
    b.pause = 300;
  }
  ctx.dirty = true;
}

export function dungContinue(ctx: Ctx): void {
  if (!ctx.b.dung) return;
  ctx.b.dung.floor++;
  ctx.b.pause = 300;
}

export function dungEnd(ctx: Ctx, lost: boolean): void {
  const b = ctx.b;
  const d = b.dung;
  if (!d) return;
  const keep = lost ? Math.floor(d.loot / 2) : d.loot;
  ctx.s.ores[d.tier] += keep;
  if (!lost) addFame(ctx, B.FAME_DUNGEON, 'Bestie', false);
  b.mode = 'camp';
  b.dung = null;
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 400;
  ctx.dirty = true;
  ctx.emit({ t: 'modal', m: { kind: 'dungEnd', lost, keep, tier: d.tier, floor: d.floor } });
}
