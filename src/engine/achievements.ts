// Osiągnięcia i Kolekcja Kowala. Postęp liczy się z liczników gry; nagrody to zasoby (bez Klejnotów).
import { ABYSS_FROM, ACHIEVEMENTS, ACH_IDS, ORES, RAR, SLOTS, SLOT_ORDER, type AchId } from '../data';
import { toast, type Ctx } from './context';
import { goldWave } from './formulas';
import { grant } from './reward';
import type { GameState, Item, Reward } from './types';

/* ---------- Kolekcja Kowala ---------- */

export const codexKey = (it: Pick<Item, 'kind' | 'ore'>) => `${it.kind}|${it.ore}`;
/** Wszystkie modele: rodzaje każdego slotu × rudy. */
export const ALL_KINDS: string[] = SLOT_ORDER.flatMap(sl => SLOTS[sl].kinds.map(k => k[0]));
export const CODEX_TOTAL = ALL_KINDS.length * ORES.length;

/** Zapisuje odkryty model (zwraca true, gdy nowy). */
export function discover(ctx: Ctx, it: Item): boolean {
  const s = ctx.s;
  const k = codexKey(it);
  if (s.codex.includes(k)) return false;
  s.codex = [...s.codex, k];
  if (it.r > (s.stats.bestR ?? -1)) s.stats.bestR = it.r;
  ctx.cache = null;
  ctx.dirty = true;
  return true;
}

/** Ile modeli danej rudy odkryto. */
export const codexOre = (s: GameState, ore: number) => s.codex.filter(k => k.endsWith('|' + ore)).length;

/* ---------- osiągnięcia ---------- */

/** Ile kręgów Otchłani gracz już pokonał. */
export const abyssCleared = (s: GameState) => s.cleared.slice(ABYSS_FROM).filter(Boolean).length;

/** Wartość postępu osiągnięcia. */
export function achValue(s: GameState, id: AchId): number {
  switch (id) {
    case 'kowal': return s.stats.smelted;
    case 'przeskoki': return s.stats.jumps;
    case 'pogromca': return s.stats.kills;
    case 'bossowie': return s.stats.bosses;
    case 'kuznia': return s.legacy?.gen ? Math.max(30, s.forge.lvl) : s.forge.lvl; // Dziedzictwo było od kuźni 30
    case 'krainy': return s.cleared.filter(Boolean).length;
    case 'klucze': return s.stats.keys || 0;
    case 'wieza': return s.dungeons.wieza.best;
    case 'rzadkosc': return Math.max(s.stats.bestR ?? -1, ...Object.values(s.eq).map(it => it?.r ?? -1));
    case 'kolekcja': return s.codex.length;
    case 'otchlan': return abyssCleared(s);
    case 'runy': return Object.values(s.runes || {}).reduce((a: number, b) => a + (b ?? 0), 0);
    case 'towarzysze': return Object.keys(s.pets).length + Object.keys(s.mounts).length;
  }
}

/** Ile progów osiągnięto. */
export const achReached = (s: GameState, id: AchId) => ACHIEVEMENTS[id].tiers.filter(t => achValue(s, id) >= t).length;
export const achClaimed = (s: GameState, id: AchId) => Math.max(0, Math.floor(s.ach?.[id] ?? 0));
export const achReady = (s: GameState, id: AchId) => achClaimed(s, id) < achReached(s, id);
export const achCount = (s: GameState) => ACH_IDS.filter(id => achReady(s, id)).length;

/** Opis progu `t` (0 = pierwszy). */
export function achGoalText(id: AchId, t: number): string {
  const A = ACHIEVEMENTS[id];
  const n = A.tiers[Math.min(t, A.tiers.length - 1)];
  return A.d.replace('{n}', id === 'rzadkosc' ? RAR[n].n : n.toLocaleString('pl-PL'));
}

/** Nagroda za próg `t`: Księgi, Kamienie i złoto, wyżej także Zwoje i jaja. */
export function achReward(s: GameState, t: number): Reward {
  const r: Reward = {
    books: [3, 6, 12, 25, 50, 80][t] ?? 80,
    stones: [10, 25, 50, 100, 200, 300][t] ?? 300,
    gold: goldWave(s.bestG) * 50 * (t + 1),
  };
  if (t >= 2) r.scrolls = t - 1;
  if (t >= 3) r.eggs = { [Math.min(4, t - 1)]: 1 };
  return r;
}

/** Odbiór następnego progu osiągnięcia. */
export function claimAch(ctx: Ctx, id: AchId): Reward | null {
  const s = ctx.s;
  if (!ACHIEVEMENTS[id] || !achReady(s, id)) return null;
  const t = achClaimed(s, id);
  const r = achReward(s, t);
  s.ach = { ...s.ach, [id]: t + 1 };
  grant(ctx, r);
  toast(ctx, `Osiągnięcie: ${ACHIEVEMENTS[id].n} (${t + 1}/${ACHIEVEMENTS[id].tiers.length})`, 'good');
  return r;
}
