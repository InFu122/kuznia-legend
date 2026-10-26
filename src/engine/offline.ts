import { B, LANDS } from '../data';
import type { Ctx } from './context';
import { canSmelt, decideAuto, smelt, tickForge } from './forge';
import { curG, goldWave } from './formulas';
import { checkLegend } from './legend';
import { invalidate } from './stats';
import type { OfflineReport } from './types';

/**
 * Nagrody za czas poza grą: do 8 h walki w obecnej krainie z wydajnością 50%,
 * dokończenie ulepszenia kuźni i — przy włączonym auto-wytopie — „Skrzynia nocnej zmiany”.
 */
export function applyOffline(ctx: Ctx, ms: number): OfflineReport | null {
  if (ms < 60000) return null;
  const s = ctx.s;
  const t = Math.min(ms, B.OFFLINE_CAP_MS);
  const waves = Math.floor((t / B.OFFLINE_WAVE_MS) * B.OFFLINE_EFFICIENCY);
  if (!waves) return null;
  const L = LANDS[s.cur.land];
  const gold = waves * goldWave(curG(s));
  const main = waves * 2;
  const rare = Math.floor(waves * L.rc + ctx.rng.next());
  const el = L.el ? Math.floor(waves * B.ELEM_DROP) : 0;
  s.gold += gold;
  s.ores[L.main] += main;
  s.ores[L.rare] += rare;
  if (L.el && el) s.els[L.el] = (s.els[L.el] ?? 0) + el;
  const fame = Math.floor(waves * 4.5);
  for (const it of Object.values(s.eq)) {
    if (!it) continue;
    it.fame += fame;
    it.kills[L.type] = (it.kills[L.type] ?? 0) + fame;
    checkLegend(ctx, it, true);
  }
  const before = s.forge.lvl;
  tickForge(ctx, t, true);
  const chest: OfflineReport['chest'] = [];
  let chestCount = 0;
  if (s.auto && s.forge.lvl >= B.AUTO_FORGE_LVL) {
    while (chestCount < B.OFFLINE_CHEST_MAX && canSmelt(ctx, s.oreSel)) {
      const item = smelt(ctx, s.oreSel, null);
      if (!item) break;
      const equipped = decideAuto(ctx, item, true);
      chest.push({ item, equipped });
      chestCount++;
    }
    chest.sort((a, b) => b.item.r - a.item.r);
  }
  invalidate(ctx);
  ctx.dirty = true;
  return {
    ms: t, capped: ms > t, land: s.cur.land, gold, main, rare, el, fame,
    forgeUp: s.forge.lvl > before ? s.forge.lvl : 0, chest: chest.slice(0, 3), chestCount,
  };
}
