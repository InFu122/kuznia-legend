import { B, LANDS, oreShares } from '../data';
import type { Ctx } from './context';
import { autoHandle, canSmelt, smelt, tickForge } from './forge';
import { curG, goldWave } from './formulas';
import { checkLegend } from './legend';
import { allMods } from './mods';
import { invalidate } from './stats';
import { tickResearch } from './tech';
import { tickHatch } from './companions';
import type { OfflineReport } from './types';

/**
 * Nagrody za czas poza grą: do 8 h (plus Nocna zmiana) walki w obecnej krainie z wydajnością 50%,
 * dokończenie ulepszenia kuźni i badania oraz — przy włączonym auto-wytopie — „Skrzynia nocnej zmiany”.
 */
export function applyOffline(ctx: Ctx, ms: number): OfflineReport | null {
  if (ms < 60000) return null;
  const s = ctx.s;
  const mods = allMods(s);
  const t = Math.min(ms, B.OFFLINE_CAP_MS + mods.offlineMin * 60000);
  const waves = Math.floor((t / B.OFFLINE_WAVE_MS) * B.OFFLINE_EFFICIENCY);
  if (!waves) return null;
  const L = LANDS[s.cur.land];
  const gold = Math.round(waves * goldWave(curG(s)) * (1 + mods.goldPct / 100));
  // Rudy według rozkładu krainy (główna średnio 1,5 sztuki na drop, rzadsze po 1), z tego tylko część za nieobecność
  // — inaczej po nocy zapas rudy rósłby o tysiące sztuk. Ułamki zaokrąglane losowo.
  const ores = s.ores.map(() => 0);
  for (const [o, p] of oreShares(L, mods.rarePct)) {
    const per = (o === L.main ? (1 + B.ORE_MAIN_MAX) / 2 : 1) + mods.extraOre / 100;
    ores[o] = Math.floor(waves * B.ORE_DROP * B.OFFLINE_ORE * (p / 100) * per + ctx.rng.next());
  }
  const el = L.el ? Math.floor(waves * B.ELEM_DROP) : 0;
  const books = Math.floor(waves * B.BOOK_DROP + ctx.rng.next());
  s.gold += gold;
  s.books += books;
  ores.forEach((n, o) => { s.ores[o] += n; });
  if (L.el && el) s.els[L.el] = (s.els[L.el] ?? 0) + el;
  const fame = Math.floor(waves * 4.5);
  s.stats.kills += fame; // średnio 4,5 wroga na falę
  for (const it of Object.values(s.eq)) {
    if (!it) continue;
    it.fame += fame;
    it.kills[L.type] = (it.kills[L.type] ?? 0) + fame;
    checkLegend(ctx, it, true);
  }
  const before = s.forge.lvl;
  tickForge(ctx, t, true);
  const tech = s.tech.cur?.id ?? null;
  const researched = tickResearch(ctx, t, true) ? tech : null;
  const hatched = tickHatch(ctx, ms, true); // jaja wykluwają się przez cały czas nieobecności, bez limitu
  const chest: OfflineReport['chest'] = [];
  let chestCount = 0;
  // Auto-wytop pracuje dalej, aż wykuje przedmiot o wybranej rzadkości (ten czeka na decyzję gracza).
  if (s.auto && !s.pending && s.forge.lvl >= B.AUTO_FORGE_LVL) {
    while (chestCount < B.OFFLINE_CHEST_MAX && canSmelt(ctx, s.oreSel)) {
      const item = smelt(ctx, s.oreSel, null);
      if (!item) break;
      const res = autoHandle(ctx, item, true);
      chest.push({ item, equipped: res === 'equip', stop: res === 'stop' });
      chestCount++;
      if (res === 'stop') break;
    }
    chest.sort((a, b) => Number(!!b.stop) - Number(!!a.stop) || b.item.r - a.item.r);
  }
  invalidate(ctx);
  ctx.dirty = true;
  return {
    ms: t, capped: ms > t, land: s.cur.land, gold, ores, el, books, fame,
    forgeUp: s.forge.lvl > before ? s.forge.lvl : 0, tech: researched, hatched, chest: chest.slice(0, 3), chestCount,
  };
}
