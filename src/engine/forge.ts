import { B, ELEM, FORGE_UNLOCKS, LANDS, ORES, RAR, SLOTS, SLOT_ORDER, SUBS, SUB_IDS } from '../data';
import { toast, type Ctx } from './context';
import { itemLevelFor, itemName, jumpChances, maxJump, sellPrice, upCost, upTime } from './formulas';
import { checkLegend } from './legend';
import { maybeObieg } from './obieg';
import { pick, ri, rnd, shuffle } from './rng';
import { invalidate, powerDelta } from './stats';
import type { ElemKey, Item } from './types';

export const canSmelt = (ctx: Ctx, ore: number) => ctx.s.ores[ore] > 0 && ctx.s.forge.lvl >= ORES[ore].lvl;

export function rollSubs(ctx: Ctx, r: number) {
  return shuffle(ctx.rng, SUB_IDS).slice(0, RAR[r].s).map(id => ({
    id, v: Math.round(rnd(ctx.rng, SUBS[id].lo, SUBS[id].hi) * (1 + 0.15 * r) * 10) / 10,
  }));
}

/**
 * Wytop: zużywa 1 rudę (i opcjonalnie 1 domieszkę) i zwraca nowy przedmiot.
 * Ruda wyznacza minimalną rzadkość; poziom kuźni daje szansę na przeskok o 1 lub 2.
 */
export function smelt(ctx: Ctx, ore: number, el: ElemKey | null): Item | null {
  const s = ctx.s;
  if (!canSmelt(ctx, ore)) return null;
  s.ores[ore]--;
  const [p1, p2] = jumpChances(s.forge.lvl);
  const mj = maxJump(ore);
  const roll = ctx.rng.next() * 100;
  let jump = 0;
  if (mj >= 2 && roll < p2) jump = 2;
  else if (mj >= 1 && roll < p1 + p2) jump = 1;
  let forced: Item['forced'] = '';
  if (s.stats.smelted === 2 && mj >= 1 && jump === 0) { jump = 1; forced = 'tut'; } // samouczek
  if (jump === 0 && mj >= 1 && s.pity >= B.PITY_MAX) { jump = 1; forced = 'pity'; }
  if (mj >= 1) s.pity = jump > 0 ? 0 : s.pity + 1;
  const r = Math.min(6, ORES[ore].floor + jump);

  const first = s.stats.smelted === 0;
  const slot = first ? 'bron' : pick(ctx.rng, SLOT_ORDER);
  const kind = first ? SLOTS[slot].kinds[0] : pick(ctx.rng, SLOTS[slot].kinds);
  let elKey: ElemKey | null = null;
  if (el && s.forge.lvl >= B.ELEM_FORGE_LVL && (s.els[el] ?? 0) > 0) { s.els[el] = (s.els[el] ?? 0) - 1; elKey = el; }
  s.stats.smelted++;
  if (jump) s.stats.jumps++;
  ctx.dirty = true;
  return {
    id: s.nid++, slot, kind: kind[0], g: kind[1], ore, r, lvl: itemLevelFor(s.forge.lvl, ri(ctx.rng, 0, 2)),
    subs: rollSubs(ctx, r), el: elKey, jump, flvl: s.forge.lvl, forced,
    smith: s.name, land: LANDS[s.cur.land].n, fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: [s.name], obieg: false,
  };
}

/** Zakłada przedmiot. Stary przedmiot z legendą zostaje przetopiony i oddaje połowę Sławy. */
export function equip(ctx: Ctx, it: Item, quiet: boolean): void {
  const s = ctx.s;
  const old = s.eq[it.slot];
  if (old) {
    if (old.fame > 0) {
      const t = Math.floor(old.fame * B.LEGEND_TRANSFER);
      it.fame += t;
      it.bosses = (it.bosses || 0) + Math.floor((old.bosses || 0) * B.LEGEND_TRANSFER);
      for (const [k, v] of Object.entries(old.kills)) {
        const key = k as keyof Item['kills'];
        it.kills[key] = (it.kills[key] ?? 0) + Math.floor((v ?? 0) * B.LEGEND_TRANSFER);
      }
      if (!quiet && t > 0) toast(ctx, `Przetopienie legendy: nowy przedmiot przejmuje ${t} Sławy Czynów`);
    } else maybeObieg(ctx, old, quiet);
    s.gold += sellPrice(old);
  }
  if (!it.owners.includes(s.name)) it.owners.push(s.name);
  s.eq[it.slot] = it;
  checkLegend(ctx, it, quiet);
  invalidate(ctx);
  ctx.dirty = true;
}

export function sell(ctx: Ctx, it: Item, quiet: boolean): void {
  ctx.s.gold += sellPrice(it);
  maybeObieg(ctx, it, quiet);
  ctx.dirty = true;
}

/** Auto-wytop: zakłada przedmiot, jeśli podnosi Moc; w przeciwnym razie sprzedaje. */
export function decideAuto(ctx: Ctx, it: Item, quiet: boolean): boolean {
  const better = powerDelta(ctx, it) > 0;
  if (better) equip(ctx, it, quiet); else sell(ctx, it, quiet);
  return better;
}

export function startUpgrade(ctx: Ctx): boolean {
  const f = ctx.s.forge;
  const n = f.lvl + 1;
  if (f.up || n > B.FORGE_MAX || ctx.s.gold < upCost(n)) return false;
  ctx.s.gold -= upCost(n);
  f.up = n;
  f.left = upTime(n);
  ctx.dirty = true;
  return true;
}

/** Odlicza ulepszenie kuźni o `ms` czasu gry. Zwraca true, gdy poziom wzrósł. */
export function tickForge(ctx: Ctx, ms: number, quiet = false): boolean {
  const f = ctx.s.forge;
  if (!f.up) return false;
  f.left -= ms;
  if (f.left > 0) return false;
  f.lvl = f.up; f.up = 0; f.left = 0;
  ctx.dirty = true;
  if (!quiet) toast(ctx, `Kuźnia osiągnęła poziom ${f.lvl}` + (FORGE_UNLOCKS[f.lvl] ? ': ' + FORGE_UNLOCKS[f.lvl] : ''), 'good');
  return true;
}

export const elemName = (k: ElemKey) => ELEM[k].n;
export { itemName };
