// Runy slotów i przekuwanie statystyk dodatkowych — ujścia rudy i złota.
// Runa: każdy z 8 slotów ma poziom 0–30; +1% głównej statystyki przedmiotu w tym slocie za poziom (działa na każdy założony przedmiot).
// Koszt rośnie po pięć poziomów na każdą rudę: 1–5 Miedź, 6–10 Żelazo, 11–15 Srebro, 16–20 Mithril, 21–25 Adamantyt, 26–30 Smocza Stal.
// Przekuwanie: jedna statystyka dodatkowa przedmiotu losowana od nowa za rudę przedmiotu i złoto; gracz wybiera, którą wersję zatrzymać.
// Z serwerem przekuwa serwer (server/src/runes.ts) i podpisuje przedmiot, żeby dalej liczył się do rankingów.
import { B, ORES, RAR, SLOTS, SUBS, SUB_IDS } from '../data';
import { toast, type Ctx } from './context';
import { goldWave } from './formulas';
import { rnd, type Rng } from './rng';
import { invalidate } from './stats';
import type { GameState, Item, SlotId } from './types';

export interface Cost { ore: number; n: number; gold: number }

/* ---------- runy ---------- */

export const runeLvl = (s: GameState, slot: SlotId) => Math.max(0, Math.min(B.RUNE_MAX, Math.floor(s.runes?.[slot] ?? 0)));

/** Koszt wzmocnienia runy na poziom `lvl` (1–30). */
export function runeCost(s: GameState, lvl: number): Cost {
  const tier = Math.min(ORES.length - 2, Math.floor((lvl - 1) / 5));
  return { ore: tier, n: 20 + 10 * ((lvl - 1) % 5), gold: goldWave(s.bestG) * 5 * lvl };
}

export function runeBlock(s: GameState, slot: SlotId): string | null {
  if (s.forge.lvl < B.RUNE_FORGE_LVL) return `od ${B.RUNE_FORGE_LVL}. poziomu kuźni`;
  const L = runeLvl(s, slot);
  if (L >= B.RUNE_MAX) return 'maksymalny poziom';
  const c = runeCost(s, L + 1);
  if (s.ores[c.ore] < c.n) return `za mało: ${ORES[c.ore].n}`;
  if (s.gold < c.gold) return 'za mało złota';
  return null;
}

export function upgradeRune(ctx: Ctx, slot: SlotId): boolean {
  const s = ctx.s;
  if (!SLOTS[slot] || runeBlock(s, slot)) return false;
  const L = runeLvl(s, slot) + 1;
  const c = runeCost(s, L);
  s.ores[c.ore] -= c.n;
  s.gold -= c.gold;
  s.runes = { ...s.runes, [slot]: L };
  invalidate(ctx);
  ctx.dirty = true;
  toast(ctx, `Runa: ${SLOTS[slot].n} — poziom ${L} (+${L * B.RUNE_PCT}%).`, 'good');
  return true;
}

/* ---------- przekuwanie ---------- */

/** Koszt przekucia jednej statystyki: ruda przedmiotu i złoto, więcej dla wyższej rzadkości. */
export function reforgeCost(s: GameState, it: Item): Cost {
  return { ore: it.ore, n: 15 * (it.r + 1), gold: goldWave(s.bestG) * 10 * (it.r + 1) };
}

export function reforgeBlock(s: GameState, it: Item): string | null {
  if (s.forge.lvl < B.REFORGE_FORGE_LVL) return `od ${B.REFORGE_FORGE_LVL}. poziomu kuźni`;
  if (!it.subs.length) return 'przedmiot bez statystyk dodatkowych';
  const c = reforgeCost(s, it);
  if (s.ores[c.ore] < c.n) return `za mało: ${ORES[c.ore].n}`;
  if (s.gold < c.gold) return 'za mało złota';
  return null;
}

/** Nowa wersja przedmiotu: statystyka numer `i` wylosowana od nowa (inna niż pozostałe; ta sama może wrócić). */
export function rerollSub(rng: Rng, it: Item, i: number): Item | null {
  if (!(i >= 0 && i < it.subs.length)) return null;
  const others = new Set(it.subs.filter((_, j) => j !== i).map(x => x.id));
  const pool = SUB_IDS.filter(id => !others.has(id));
  const id = pool[Math.floor(rng.next() * pool.length)];
  const v = Math.round(rnd(rng, SUBS[id].lo, SUBS[id].hi) * (1 + 0.15 * it.r) * 10) / 10;
  const out: Item = JSON.parse(JSON.stringify(it));
  out.subs[i] = { id, v };
  return out;
}

export function payReforge(ctx: Ctx, it: Item): boolean {
  const s = ctx.s;
  if (reforgeBlock(s, it)) return false;
  const c = reforgeCost(s, it);
  s.ores[c.ore] -= c.n;
  s.gold -= c.gold;
  ctx.dirty = true;
  return true;
}
export function refundReforge(ctx: Ctx, it: Item): void {
  const c = reforgeCost(ctx.s, it);
  ctx.s.ores[c.ore] += c.n;
  ctx.s.gold += c.gold;
  ctx.dirty = true;
}

/** Przekuty przedmiot zamiast założonego (gracz wybrał nową wersję). Sława, legenda i historia zostają. */
export function acceptReforge(ctx: Ctx, cand: Item): boolean {
  const s = ctx.s;
  const cur = s.eq[cand.slot];
  if (!cur) return false;
  s.eq[cand.slot] = { ...cand, fame: cur.fame, kills: cur.kills, bosses: cur.bosses, ls: cur.ls, aw: cur.aw, owners: cur.owners };
  invalidate(ctx);
  ctx.dirty = true;
  return true;
}

/** Nazwa statystyki z wartością, np. „Szansa na krytyk +2,4%”. */
export const subText = (x: Item['subs'][number]) => `${SUBS[x.id].n} +${String(x.v).replace('.', ',')}${SUBS[x.id].u}`;
export const rarOf = (it: Item) => RAR[it.r].n;
