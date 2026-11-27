import { B, GOLD_SKIN_FORGE, ELEM, FORGE_UNLOCKS, ORES, QUAL, QUAL_UNIQ_IV, R, RANK_MAX, RAR, REFINE, SET_FORGE_LVL, SLOTS, SLOT_ORDER, SUBS, SUB_IDS, landDef, qMult, rAt, rGe, rRank, subMult } from '../data';
import { discover } from './achievements';
import { toast, type Ctx } from './context';
import { JUMP_V, dropChance, itemLevelFor, itemName, jumpChances, maxJump, oreNominal, pityAllowed, sellPrice, smeltRarity, upCost, upTime } from './formulas';
import { checkLegend } from './legend';
import { allMods } from './mods';
import { track } from './missions';
import { mulberry32, ri, rnd, shuffle, type Rng } from './rng';
import { invalidate, powerDelta } from './stats';
import type { ElemKey, GameState, Item, SetId, SlotId, SubId } from './types';

export const canSmelt = (ctx: Ctx, ore: number) => ctx.s.ores[ore] > 0 && ctx.s.forge.lvl >= ORES[ore].lvl;
/** Czy przy następnym wytopie zostanie użyta ruda unikalna (pewna jakość IV–V). */
export const uniqActive = (s: GameState): SetId | null =>
  s.uniqSel && s.forge.lvl >= SET_FORGE_LVL && (s.uniq[s.uniqSel] ?? 0) > 0 ? s.uniqSel : null;

/** Cena sprzedaży z premią Kupca. */
export const sellFor = (s: GameState, it: Item) => Math.round(sellPrice(it) * (1 + allMods(s).goldPct / 100));
/** Koszt i czas ulepszenia kuźni do poziomu n (z technologiami). */
export const upgradeCost = (s: GameState, n: number) => Math.round(upCost(n) * (1 - allMods(s).forgeCost / 100));
export const upgradeTime = (s: GameState, n: number) => upTime(n) * (1 - allMods(s).forgeTime / 100);

/**
 * Przedmiot z rudy unikalnej trafia w miejsce, w którym nie nosisz jeszcze przedmiotu z tej samej rudy
 * (zasada z czasów zestawów — zostaje, bo serwer odtwarza nią dawne wytopy).
 */
function setSlot(s: GameState, set: SetId, u: number): SlotId {
  const free = SLOT_ORDER.filter(sl => s.eq[sl]?.set !== set);
  const list = free.length ? free : SLOT_ORDER;
  return list[Math.floor(u * list.length)];
}

export function rollSubs(rng: Rng, r: number) {
  return shuffle(rng, SUB_IDS).slice(0, RAR[r].s).map(id => ({
    id, v: Math.round(rnd(rng, SUBS[id].lo, SUBS[id].hi) * subMult(r) * 10) / 10,
  }));
}

/** Jakość z losowania `u` (0–1): według szans z QUAL, a z rudą unikalną — IV albo V. */
export function qualityOf(u: number, uniq: boolean): number {
  if (uniq) return u * 100 < QUAL_UNIQ_IV ? 4 : 5;
  let acc = 0;
  for (let i = 0; i < QUAL.length; i++) {
    acc += QUAL[i].p;
    if (u * 100 < acc) return i + 1;
  }
  return QUAL.length;
}
/** Statystyki dodatkowe z premią za jakość (zaokrąglone jak przy losowaniu — do 0,1). */
export const qualSubs = (subs: { id: SubId; v: number }[], q: number) =>
  q <= 1 ? subs : subs.map(x => ({ id: x.id, v: Math.round(x.v * qMult(q) * 10) / 10 }));

/**
 * Losowania jednego wytopu — zawsze w tej samej kolejności, żeby serwer mógł odtworzyć wytop z ziarna:
 * oszczędność rudy, przeskok, miejsce, rodzaj, poziom, potem statystyki dodatkowe, a na końcu (od wersji 7) jakość.
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
  const flvl = s.forge.lvl;
  const [p1, p2] = jumpChances(flvl, mods.jumpRel, ore);
  const mj = maxJump(ore);
  const pd = dropChance(ore, flvl);
  let jump = 0;
  if (mj >= 2 && d.roll < p2) jump = 2;
  else if (mj >= 1 && d.roll < p1 + p2) jump = 1;
  else if (d.roll >= 100 - pd) jump = -1; // ruda jeszcze nie opanowana — o rzadkość niżej
  let forced: Item['forced'] = '';
  if (s.stats.smelted === 2 && mj >= 1 && jump <= 0) { jump = 1; forced = 'tut'; } // samouczek
  if (jump <= 0 && pityAllowed(ore, JUMP_V, flvl) && s.pity >= B.PITY_MAX) { jump = 1; forced = 'pity'; }
  if (mj >= 1) s.pity = jump > 0 ? 0 : s.pity + 1;
  const r = smeltRarity(ore, flvl, jump);

  const first = s.stats.smelted === 0;
  const slot: SlotId = first ? 'bron' : set ? setSlot(s, set, d.slot) : SLOT_ORDER[Math.floor(d.slot * SLOT_ORDER.length)];
  const kinds = SLOTS[slot].kinds;
  const kind = first ? kinds[0] : kinds[Math.floor(d.kind * kinds.length)];
  let elKey: ElemKey | null = null;
  if (el && s.forge.lvl >= B.ELEM_FORGE_LVL && (s.els[el] ?? 0) > 0) { s.els[el] = (s.els[el] ?? 0) - 1; elKey = el; }
  const subs0 = rollSubs(rng, r);
  const q = qualityOf(rng.next(), !!set); // ruda unikalna: pewna jakość IV albo V
  s.stats.smelted++;
  if (jump > 0) s.stats.jumps++;
  track(ctx, 'smelt');
  if (jump > 0) track(ctx, 'jump');
  ctx.dirty = true;
  const it: Item = {
    id: s.nid++, slot, kind: kind[0], g: kind[1], ore, r, lvl: itemLevelFor(s.forge.lvl, d.lvl),
    subs: qualSubs(subs0, q), el: elKey, jump, flvl: s.forge.lvl, forced, jv: JUMP_V, q,
    smith: s.name, land: landDef(s.cur.land).n, fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: [s.name], obieg: false, set,
  };
  if (sx !== undefined) it.sx = sx;
  if (rRank(it.r) > rRank(s.stats.bestR ?? -1)) { s.stats.bestR = it.r; ctx.emit({ t: 'first', id: it.id, r: it.r }); }
  if (rRank(it.r) >= rRank(R.LEGENDARNY)) s.stats.leg = (s.stats.leg || 0) + 1;
  discover(ctx, it);
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
      // Komunikat tylko dla przedmiotu, który już przekroczył próg legendy — na początku gry to szum.
      if (!quiet && t > 0 && (old.ls || 0) > 0) toast(ctx, `Przetopienie legendy: nowy przedmiot przejmuje ${t} Sławy Czynów`);
    }
    s.gold += sellFor(s, old);
  }
  if (!it.owners.includes(s.name)) it.owners.push(s.name);
  s.eq[it.slot] = it;
  track(ctx, 'equip');
  checkLegend(ctx, it, quiet);
  invalidate(ctx);
  ctx.dirty = true;
}

export function sell(ctx: Ctx, it: Item, _quiet: boolean): void {
  ctx.s.gold += sellFor(ctx.s, it);
  track(ctx, 'sell');
  ctx.dirty = true;
}

/**
 * Rzadkości (indeksy, od najsłabszej), na których może zatrzymać się auto-wytop z rudy `ore` na kuźni `flvl`:
 * wyższe niż wynik bez przeskoku (gdy ruda bywa o rangę niżej — także sam wynik bez przeskoku).
 * Ruda bez przeskoku — tylko jej rzadkość.
 */
export function autoTargets(ore: number, flvl: number): number[] {
  const n = oreNominal(ore, flvl), top = Math.min(RANK_MAX, n + maxJump(ore));
  const from = dropChance(ore, flvl) > 0 ? n : n + 1;
  if (top < from) return [rAt(n)];
  return Array.from({ length: top - from + 1 }, (_, i) => rAt(from + i));
}
/** Rzadkość, na której auto-wytop się zatrzyma (wybór gracza dopasowany do wybranej rudy; domyślnie pierwsza z przeskoku). */
export function autoTarget(s: GameState): number {
  const t = autoTargets(s.oreSel, s.forge.lvl);
  if (t.includes(s.autoStop)) return s.autoStop;
  const n = oreNominal(s.oreSel, s.forge.lvl);
  return t.find(r => rRank(r) > n) ?? t[0];
}

/**
 * Auto-wytop: przedmiot o rzadkości docelowej (albo wyższej) i przedmiot z rudy unikalnej wstrzymują auto i czekają na decyzję gracza
 * (po decyzji auto-wytop jedzie dalej). Słabsze przedmioty są sprzedawane — chyba że miejsce jest puste (wtedy zakłada).
 */
export function autoHandle(ctx: Ctx, it: Item, quiet: boolean): 'stop' | 'equip' | 'sell' {
  const s = ctx.s;
  if (rGe(it.r, autoTarget(s)) || it.set) { s.pending = it; ctx.dirty = true; return 'stop'; }
  if (!s.eq[it.slot]) { equip(ctx, it, quiet); return 'equip'; }
  sell(ctx, it, quiet);
  return 'sell';
}

/** Rafinacja: ile sztuk rudy `from` trzeba na 1 sztukę następnej w kolejności rud (0 — nie da się). */
export const refineRatio = (s: GameState, from: number) => {
  const r = REFINE[from];
  return r && s.forge.lvl >= B.REFINE_FORGE_LVL && s.forge.lvl >= ORES[r.to].lvl ? r.k : 0;
};
/** Na którą rudę rafinuje się ruda `from` (−1 — na żadną). */
export const refineTo = (from: number) => REFINE[from]?.to ?? -1;

/** Zamienia rudę `from` na `times` sztuk następnej rudy (albo tyle, ile się da). Zwraca liczbę nowych sztuk. */
export function refine(ctx: Ctx, from: number, times: number): number {
  const s = ctx.s;
  const k = refineRatio(s, from);
  if (!k) return 0;
  const n = Math.max(0, Math.min(Math.floor(times), Math.floor(s.ores[from] / k)));
  if (!n) return 0;
  s.ores[from] -= n * k;
  s.ores[refineTo(from)] += n;
  ctx.dirty = true;
  return n;
}

/** Zakłada przedmiot, jeśli podnosi Moc; w przeciwnym razie sprzedaje. */
export function decideAuto(ctx: Ctx, it: Item, quiet: boolean): boolean {
  const better = powerDelta(ctx, it) > 0;
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
  // Strój „Złoty Kowal” za 100. poziom kuźni.
  const look = ctx.s.look;
  if (f.lvl >= GOLD_SKIN_FORGE && look && !look.skins.includes('zloty')) {
    ctx.s.look = { ...look, skins: [...look.skins, 'zloty'] };
    if (!quiet) toast(ctx, 'Nowy strój: Złoty Kowal za 100. poziom kuźni!', 'good');
  }
  if (!quiet) ctx.emit({ t: 'sfx', k: 'levelup' });
  if (!quiet) toast(ctx, `Kuźnia osiągnęła poziom ${f.lvl}` + (FORGE_UNLOCKS[f.lvl] ? ': ' + FORGE_UNLOCKS[f.lvl] : ''), 'good');
  return true;
}

export const elemName = (k: ElemKey) => ELEM[k].n;
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
