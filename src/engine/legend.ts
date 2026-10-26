import { B, FOE_GENITIVE, LEGEND } from '../data';
import { toast, type Ctx } from './context';
import { baseName, legStage } from './formulas';
import { invalidate } from './stats';
import type { Awakening, FoeType, Item } from './types';

/** Dodaje Sławę Czynów każdemu założonemu przedmiotowi. */
export function addFame(ctx: Ctx, kills: number, type: FoeType, boss: boolean): void {
  for (const it of Object.values(ctx.s.eq)) {
    if (!it) continue;
    if (boss) { it.fame += B.FAME_BOSS; it.bosses = (it.bosses || 0) + 1; }
    else { it.fame += kills; it.kills[type] = (it.kills[type] ?? 0) + kills; }
    checkLegend(ctx, it, false);
  }
}

/** Cecha przebudzenia wynika z tego, skąd przedmiot ma najwięcej Sławy. */
export function awakeningFor(it: Item): Awakening {
  const bossFame = (it.bosses || 0) * B.FAME_BOSS;
  let best: FoeType | null = null;
  let bv = 0;
  for (const [t, v] of Object.entries(it.kills) as [FoeType, number][]) if (v > bv) { bv = v; best = t; }
  if (bossFame > bv || !best) return { kind: 'boss', v: 15, name: 'Pogromca' };
  return { kind: 'type', t: best, v: 25, name: 'Zguba ' + FOE_GENITIVE[best] };
}

export function checkLegend(ctx: Ctx, it: Item, quiet: boolean): void {
  const st = legStage(it.fame);
  if (st <= (it.ls || 0)) return;
  it.ls = st;
  if (st === 3 && !it.aw) {
    it.aw = awakeningFor(it);
    if (!quiet) ctx.emit({ t: 'modal', m: { kind: 'awaken', item: it } });
  } else if (!quiet && st < 3) {
    toast(ctx, `${baseName(it)} jest teraz ${LEGEND[st].n} (+${Math.round(LEGEND[st].b * 100)}% do statystyki)`, 'good');
  }
  invalidate(ctx);
}
