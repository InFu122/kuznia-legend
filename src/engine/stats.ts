import { ELEM, SETS, SLOTS, STAT_CAPS } from '../data';
import type { Ctx } from './context';
import { mainVal } from './formulas';
import { techMods } from './mods';
import type { FoeType, GameState, Item, Mods, SetId, Stats } from './types';

/** Ile części każdego zestawu jest założonych. */
export function setCounts(eq: GameState['eq']): { id: SetId; count: number }[] {
  const c: Partial<Record<SetId, number>> = {};
  for (const it of Object.values(eq)) if (it?.set) c[it.set] = (c[it.set] ?? 0) + 1;
  return (Object.entries(c) as [SetId, number][]).map(([id, count]) => ({ id, count }));
}

export function computeStats(eq: GameState['eq'], mods: Mods): Stats {
  let dmg = 10, hp = 100, crit = 5, critd = 50, spd = 0, ls = 0, dodge = 0, regen = 0.5, boss = 0, eldmg = 0, slow = 0, holy = 0, pog = 0;
  const vs: Partial<Record<FoeType, number>> = {};
  for (const it of Object.values(eq)) {
    if (!it) continue;
    const m = mainVal(it);
    if (SLOTS[it.slot].stat === 'dmg') dmg += m; else hp += m;
    for (const s of it.subs) {
      switch (s.id) {
        case 'crit': crit += s.v; break;
        case 'critd': critd += s.v; break;
        case 'spd': spd += s.v; break;
        case 'ls': ls += s.v; break;
        case 'dodge': dodge += s.v; break;
        case 'regen': regen += s.v; break;
        case 'boss': boss += s.v; break;
      }
    }
    if (it.el) {
      const E = ELEM[it.el];
      if (E.eff === 'dmg') eldmg += E.v; else if (E.eff === 'slow') slow += E.v; else if (E.eff === 'ls') ls += E.v; else holy += E.v;
    }
    if (it.aw) {
      if (it.aw.kind === 'boss') pog += it.aw.v;
      else if (it.aw.t) vs[it.aw.t] = (vs[it.aw.t] ?? 0) + it.aw.v;
    }
  }
  // zestawy: bonus za 2 i za 4 części
  let dmgPct = mods.dmgPct, hpPct = mods.hpPct;
  crit += mods.crit;
  boss += mods.bossPct;
  const sets = setCounts(eq);
  for (const { id, count } of sets) {
    for (const b of [count >= 2 ? SETS[id].b2 : null, count >= 4 ? SETS[id].b4 : null]) {
      if (!b) continue;
      dmgPct += b.dmgPct ?? 0; hpPct += b.hpPct ?? 0; crit += b.crit ?? 0; spd += b.spd ?? 0;
      ls += b.ls ?? 0; dodge += b.dodge ?? 0; boss += b.bossPct ?? 0;
      for (const [t, v] of Object.entries(b.vs ?? {}) as [FoeType, number][]) vs[t] = (vs[t] ?? 0) + v;
    }
  }
  dmg *= 1 + dmgPct / 100;
  hp *= 1 + hpPct / 100;
  crit = Math.min(crit, STAT_CAPS.crit); critd = Math.min(critd, STAT_CAPS.critd); spd = Math.min(spd, STAT_CAPS.spd);
  ls = Math.min(ls, STAT_CAPS.ls); dodge = Math.min(dodge, STAT_CAPS.dodge); regen = Math.min(regen, STAT_CAPS.regen);
  // Moc = średnie obrażenia na sekundę × 4 + zdrowie efektywne × 0,4 (te same wzory co w walce)
  const power = Math.round(dmg * 4 * (1 + (crit / 100) * (critd / 100)) * (1 + spd / 100) * (1 + eldmg / 100) + hp * 0.4 / (1 - dodge / 100));
  return { dmg, hp, crit, critd, spd, ls, dodge, regen, boss, eldmg, slow, holy, pog, vs, sets, power };
}

export function stats(ctx: Ctx): Stats {
  if (!ctx.cache) ctx.cache = computeStats(ctx.s.eq, techMods(ctx.s));
  return ctx.cache;
}

/** Przelicza statystyki po zmianie ekwipunku lub technologii i zachowuje procent zdrowia bohatera. */
export function invalidate(ctx: Ctx): void {
  ctx.cache = null;
  const c = stats(ctx);
  const ratio = ctx.b.heroMax ? ctx.b.heroHp / ctx.b.heroMax : 1;
  ctx.b.heroMax = c.hp;
  ctx.b.heroHp = Math.max(1, Math.min(c.hp, ratio * c.hp));
}

/** Ile Mocy zyska (lub straci) bohater po założeniu przedmiotu. */
export function powerDelta(ctx: Ctx, it: Item): number {
  return computeStats({ ...ctx.s.eq, [it.slot]: it }, techMods(ctx.s)).power - stats(ctx).power;
}
