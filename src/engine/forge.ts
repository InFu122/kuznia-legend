import { B, ELEM, FORGE_UNLOCKS, LANDS, ORES, RAR, SETS, SET_FORGE_LVL, SLOTS, SLOT_ORDER, SUBS, SUB_IDS } from '../data';
import { toast, type Ctx } from './context';
import { itemLevelFor, itemName, jumpChances, maxJump, sellPrice, upCost, upTime } from './formulas';
import { checkLegend } from './legend';
import { allMods } from './mods';
import { maybeObieg } from './obieg';
import { track } from './missions';
import { mulberry32, ri, rnd, shuffle, type Rng } from './rng';
import { invalidate, powerDelta, stats } from './stats';
import type { ElemKey, GameState, Item, SetId, SlotId } from './types';

export const canSmelt = (ctx: Ctx, ore: number) => ctx.s.ores[ore] > 0 && ctx.s.forge.lvl >= ORES[ore].lvl;
/** Czy przy następnym wytopie zostanie użyta ruda unikalna (część zestawu). */
export const uniqActive = (s: GameState): SetId | null =>
  s.uniqSel && s.forge.lvl >= SET_FORGE_LVL && (s.uniq[s.uniqSel] ?? 0) > 0 ? s.uniqSel : null;

/** Cena sprzedaży z premią Kupca. */
export const sellFor = (s: GameState, it: Item) => Math.round(sellPrice(it) * (1 + allMods(s).goldPct / 100));
/** Koszt i czas ulepszenia kuźni do poziomu n (z technologiami). */
export const upgradeCost = (s: GameState, n: number) => Math.round(upCost(n) * (1 - allMods(s).forgeCost / 100));
export const upgradeTime = (s: GameState, n: number) => upTime(n) * (1 - allMods(s).forgeTime / 100);

/** Część zestawu trafia w miejsce, w którym nie masz jeszcze tego zestawu. */
function setSlot(s: GameState, set: SetId, u: number): SlotId {
  const free = SLOT_ORDER.filter(sl => s.eq[sl]?.set !== set);
  const list = free.length ? free : SLOT_ORDER;
  return list[Math.floor(u * list.length)];
}

export function rollSubs(rng: Rng, r: number) {
  return shuffle(rng, SUB_IDS).slice(0, RAR[r].s).map(id => ({
    id, v: Math.round(rnd(rng, SUBS[id].lo, SUBS[id].hi) * (1 + 0.15 * r) * 10) / 10,
  }));
}

/**
 * Losowania jednego wytopu — zawsze w tej samej kolejności, żeby serwer mógł odtworzyć wytop z ziarna:
 * oszczędność rudy, przeskok, miejsce, rodzaj, poziom, a potem statystyki dodatkowe.
 */
export function smeltDraws(rng: Rng) {
  return { save: rng.next() * 100, roll: rng.next() * 100, slot: rng.next(), kind: rng.next(), lvl: ri(rng, 0, 2) };
}

/**
 * Wytop: zużywa 1 rudę (i opcjonalnie 1 domieszkę) i zwraca nowy przedmiot.
 * Ruda wyznacza minimalną rzadkość; poziom kuźni daje szansę na przeskok o 1 lub 2.
 * Z serwerem każdy wytop ma własne ziarno (numer `sx`) — tego samego wytopu nie da się powtórzyć z innym wynikiem.
 */
export function smelt(ctx: Ctx, ore: number, el: ElemKey | null): Item | null {
  const s = ctx.s;
  if (!canSmelt(ctx, ore)) return null;
  const seeded = s.seeds.length > 0;
  const rng = seeded ? mulberry32(s.seeds.shift() as number) : ctx.rng;
  const sx = seeded ? s.sx++ : undefined;
  const d = smeltDraws(rng);
  const mods = allMods(s);
  if (d.save >= mods.saveOre) s.ores[ore]--;
  const set = uniqActive(s);
  if (set) s.uniq[set] = (s.uniq[set] ?? 0) - 1;
  const [p1, p2] = jumpChances(s.forge.lvl, mods.jumpRel);
  const mj = maxJump(ore);
  let jump = 0;
  if (mj >= 2 && d.roll < p2) jump = 2;
  else if (mj >= 1 && d.roll < p1 + p2) jump = 1;
  let forced: Item['forced'] = '';
  if (s.stats.smelted === 2 && mj >= 1 && jump === 0) { jump = 1; forced = 'tut'; } // samouczek
  if (jump === 0 && mj >= 1 && s.pity >= B.PITY_MAX) { jump = 1; forced = 'pity'; }
  if (set && jump === 0 && mj >= 1) { jump = 1; forced = 'set'; } // ruda unikalna gwarantuje przeskok
  if (mj >= 1) s.pity = jump > 0 ? 0 : s.pity + 1;
  const r = Math.min(6, ORES[ore].floor + jump);

  const first = s.stats.smelted === 0;
  const slot: SlotId = first ? 'bron' : set ? setSlot(s, set, d.slot) : SLOT_ORDER[Math.floor(d.slot * SLOT_ORDER.length)];
  const kinds = SLOTS[slot].kinds;
  const kind = first ? kinds[0] : kinds[Math.floor(d.kind * kinds.length)];
  let elKey: ElemKey | null = null;
  if (el && s.forge.lvl >= B.ELEM_FORGE_LVL && (s.els[el] ?? 0) > 0) { s.els[el] = (s.els[el] ?? 0) - 1; elKey = el; }
  s.stats.smelted++;
  if (jump) s.stats.jumps++;
  track(ctx, 'smelt');
  if (jump) track(ctx, 'jump');
  ctx.dirty = true;
  const it: Item = {
    id: s.nid++, slot, kind: kind[0], g: kind[1], ore, r, lvl: itemLevelFor(s.forge.lvl, d.lvl),
    subs: rollSubs(rng, r), el: elKey, jump, flvl: s.forge.lvl, forced,
    smith: s.name, land: LANDS[s.cur.land].n, fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: [s.name], obieg: false, set,
  };
  if (sx !== undefined) it.sx = sx;
  return it;
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
    s.gold += sellFor(s, old);
  }
  if (!it.owners.includes(s.name)) it.owners.push(s.name);
  s.eq[it.slot] = it;
  track(ctx, 'equip');
  checkLegend(ctx, it, quiet);
  invalidate(ctx);
  ctx.dirty = true;
}

export function sell(ctx: Ctx, it: Item, quiet: boolean): void {
  ctx.s.gold += sellFor(ctx.s, it);
  track(ctx, 'sell');
  maybeObieg(ctx, it, quiet);
  ctx.dirty = true;
}

/** Czy założenie przedmiotu zwiększy liczbę noszonych części jego zestawu (do 4). */
export function advancesSet(s: GameState, it: Item): boolean {
  if (!it.set) return false;
  const count = Object.values(s.eq).filter(x => x?.set === it.set).length;
  return s.eq[it.slot]?.set !== it.set && count < 4;
}

/**
 * Auto-wytop: zakłada przedmiot, jeśli podnosi Moc; w przeciwnym razie sprzedaje.
 * Część zestawu, która przybliża premię za 2 lub 4 części, zostaje założona, jeśli traci najwyżej 5% Mocy.
 */
/**
 * Rzadkości, na których może zatrzymać się auto-wytop z rudy `ore`: wyższe niż minimalna rzadkość rudy
 * (ruda bez przeskoku — tylko jej rzadkość).
 */
export function autoTargets(ore: number): number[] {
  const f = ORES[ore].floor, top = Math.min(6, f + maxJump(ore));
  return top === f ? [f] : Array.from({ length: top - f }, (_, i) => f + 1 + i);
}
/** Rzadkość, na której auto-wytop się zatrzyma (wybór gracza dopasowany do wybranej rudy). */
export function autoTarget(s: GameState): number {
  const t = autoTargets(s.oreSel);
  return t.includes(s.autoStop) ? s.autoStop : t[0];
}

/**
 * Auto-wytop: przedmiot o rzadkości docelowej (albo wyższej) i część zestawu wstrzymują auto i czekają na decyzję gracza
 * (po decyzji auto-wytop jedzie dalej). Słabsze przedmioty są sprzedawane — chyba że miejsce jest puste (wtedy zakłada).
 */
export function autoHandle(ctx: Ctx, it: Item, quiet: boolean): 'stop' | 'equip' | 'sell' {
  const s = ctx.s;
  if (it.r >= autoTarget(s) || it.set) { s.pending = it; ctx.dirty = true; return 'stop'; }
  if (!s.eq[it.slot]) { equip(ctx, it, quiet); return 'equip'; }
  sell(ctx, it, quiet);
  return 'sell';
}

export function decideAuto(ctx: Ctx, it: Item, quiet: boolean): boolean {
  const d = powerDelta(ctx, it);
  const better = d > 0 || (advancesSet(ctx.s, it) && d > -0.05 * stats(ctx).power);
  if (better) equip(ctx, it, quiet); else sell(ctx, it, quiet);
  return better;
}

export function startUpgrade(ctx: Ctx): boolean {
  const f = ctx.s.forge;
  const n = f.lvl + 1;
  const cost = upgradeCost(ctx.s, n);
  if (f.up || n > B.FORGE_MAX || ctx.s.gold < cost) return false;
  ctx.s.gold -= cost;
  f.up = n;
  f.left = upgradeTime(ctx.s, n);
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
  if (!quiet) ctx.emit({ t: 'sfx', k: 'levelup' });
  if (!quiet) toast(ctx, `Kuźnia osiągnęła poziom ${f.lvl}` + (FORGE_UNLOCKS[f.lvl] ? ': ' + FORGE_UNLOCKS[f.lvl] : ''), 'good');
  return true;
}

export const elemName = (k: ElemKey) => ELEM[k].n;
export const setName = (id: SetId) => SETS[id].n;
export { itemName };

/** Najwięcej znalezisk czekających na decyzję; nadmiar (najstarsze) idzie na sprzedaż. */
const FOUND_MAX = 20;
/** Znaleziska (skrzynia bossa, Zbrojownia) do decyzji gracza. */
export function addFound(ctx: Ctx, items: Item[]): void {
  const s = ctx.s;
  s.found.push(...items);
  while (s.found.length > FOUND_MAX) sell(ctx, s.found.shift()!, true);
  ctx.dirty = true;
}
