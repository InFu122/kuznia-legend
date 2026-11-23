// Runy slotów i przekuwanie statystyk dodatkowych — ujścia rudy i złota.
// Runa: każdy z 8 slotów ma poziom 0–50; +1% głównej statystyki przedmiotu w tym slocie za poziom (działa na każdy założony przedmiot).
// Po pięć poziomów na każdą rudę w kolejności odblokowania (ORE_ORDER): 1–5 Miedź, 6–10 Żelazo, 11–15 Srebro, 16–20 Mithril,
// 21–25 Adamantyt, 26–30 Obsydian, 31–35 Smocza Stal, 36–40 Eteryt, 41–45 Gwiezdny Kruszec, 46–50 Boska Ruda.
// Rzadkie rudy kosztują mniej sztuk (RUNE_ORE_MULT, Boska Ruda po 1–3), żeby ostatnie poziomy dało się zrobić.
// Każdy slot płaci dokładnie rudą ze swojego poziomu — bez zamienników. Słabsze rudy zostają potrzebne przez całą grę,
// więc opłaca się wracać do wcześniejszych krain i je farmić (karta runy podpowiada, gdzie dana ruda wypada najczęściej).
// Przekuwanie: jedna statystyka dodatkowa przedmiotu losowana od nowa za rudę przedmiotu i złoto; gracz wybiera, którą wersję zatrzymać.
// Z serwerem przekuwa serwer (server/src/runes.ts) i podpisuje przedmiot, żeby dalej liczył się do rankingów.
import { B, DIVINE_ORE, LANDS, ORES, ORE_ORDER, RAR, SLOTS, SUBS, SUB_IDS, qMult, subMult } from '../data';
import { toast, type Ctx } from './context';
import { goldWaveOf } from './formulas';
import { allMods } from './mods';
import { rnd, type Rng } from './rng';
import { computeStats, extraOf, invalidate } from './stats';
import type { GameState, Item, SlotId } from './types';

export interface Cost { ore: number; n: number; gold: number }

/* ---------- runy ---------- */

/**
 * Ile runy dają bohaterowi (obrażenia, zdrowie, Moc): różnica statystyk z runami i bez nich.
 * `slot` — tylko runa tego miejsca; `next` — zysk z jeszcze jednego poziomu w tym miejscu.
 */
export function runeGain(s: GameState, slot?: SlotId, next = false): { dmg: number; hp: number; power: number } {
  const extra = extraOf(s);
  const mods = allMods(s);
  const cur = { ...(s.runes ?? {}) };
  const other = { ...cur };
  if (next && slot) other[slot] = Math.min(B.RUNE_MAX, runeLvl(s, slot) + 1);
  else if (slot) delete other[slot];
  else for (const k of Object.keys(other) as SlotId[]) delete other[k];
  const a = computeStats(s.eq, mods, { ...extra, runes: next ? other : cur });
  const b = computeStats(s.eq, mods, { ...extra, runes: next ? cur : other });
  return { dmg: a.dmg - b.dmg, hp: a.hp - b.hp, power: a.power - b.power };
}

/** Dla kogo działa runa miejsca — w mowie gracza („dla każdej broni”), żeby było jasne, że nie dla jednego przedmiotu. */
export const RUNE_FOR: Record<SlotId, string> = {
  bron: 'każdej broni', helm: 'każdego hełmu', zbroja: 'każdego napierśnika', rekawice: 'każdych rękawic',
  buty: 'każdych butów', pas: 'każdego pasa', pierscien: 'każdego pierścienia', amulet: 'każdego amuletu',
};
/** To samo ze zdaniem względnym: „dla każdej broni, którą założysz”. */
export const runeForAll = (slot: SlotId) =>
  `${RUNE_FOR[slot]}, ${slot === 'bron' ? 'którą' : slot === 'rekawice' || slot === 'buty' ? 'które' : 'który'} założysz`;
/** „obrażeń” albo „zdrowia” — główna statystyka miejsca. */
export const runeStat = (slot: SlotId) => (SLOTS[slot].stat === 'dmg' ? 'obrażeń' : 'zdrowia');

export const runeLvl = (s: GameState, slot: SlotId) => Math.max(0, Math.min(B.RUNE_MAX, Math.floor(s.runes?.[slot] ?? 0)));

/** Ruda dla poziomów runy: `tier` = (poziom − 1) / 5, po kolei jak rudy otwierają się w kuźni. */
export const runeOre = (tier: number) => ORE_ORDER[Math.max(0, Math.min(ORE_ORDER.length - 1, tier))];
/** Rzadkie rudy: mniej sztuk na poziom (Eteryt i Gwiezdny Kruszec o połowę). */
const RUNE_ORE_MULT: Record<number, number> = { 8: 0.5, 6: 0.5 };
/** Boska Ruda (bossowie IV aktu, lochy sezonowe — bardzo rzadka): sztuk na kolejne poziomy 46–50. */
const RUNE_DIVINE = [1, 2, 2, 3, 3];

/** Koszt wzmocnienia runy na poziom `lvl` (1–50). */
export function runeCost(s: GameState, lvl: number): Cost {
  const tier = Math.floor((lvl - 1) / 5);
  const step = (lvl - 1) % 5;
  const ore = runeOre(tier);
  const k = 1 - allMods(s).runeCost / 100; // Mistrz run
  const base = ore === DIVINE_ORE ? RUNE_DIVINE[step] : (20 + 10 * step) * (RUNE_ORE_MULT[ore] ?? 1);
  return { ore, n: Math.max(1, Math.ceil(base * k)), gold: Math.round(goldWaveOf(s) * 5 * lvl * k) };
}

export interface RunePay extends Cost {
  /** Ile masz tej rudy. */
  avail: number;
  enough: boolean;
}

/** Czym zapłacisz za poziom `lvl` runy: zawsze ruda z kosztu (bez zamienników). */
export function runePay(s: GameState, lvl: number): RunePay {
  const c = runeCost(s, lvl);
  const avail = Math.max(0, Math.floor(s.ores[c.ore] ?? 0));
  return { ...c, avail, enough: avail >= c.n };
}

/**
 * Gdzie farmić rudę `ore`: odblokowana kraina kampanii, w której ta ruda ma największy udział w dropach
 * (przy remisie dalsza — więcej złota). `null`, gdy żadna odblokowana kraina jej nie daje.
 */
export function farmLandFor(s: GameState, ore: number): { land: number; pct: number } | null {
  let best: { land: number; pct: number } | null = null;
  for (let i = 0; i <= Math.min(s.maxLand, LANDS.length - 1); i++) {
    const p = LANDS[i].drops.find(([o]) => o === ore)?.[1] ?? 0;
    if (p > 0 && (!best || p >= best.pct)) best = { land: i, pct: p };
  }
  return best;
}

export function runeBlock(s: GameState, slot: SlotId): string | null {
  if (s.forge.lvl < B.RUNE_FORGE_LVL) return `od ${B.RUNE_FORGE_LVL}. poziomu kuźni`;
  const L = runeLvl(s, slot);
  if (L >= B.RUNE_MAX) return 'maksymalny poziom';
  const c = runePay(s, L + 1);
  if (!c.enough) return `za mało: ${ORES[c.ore].n}`;
  if (s.gold < c.gold) return 'za mało złota';
  return null;
}

export function upgradeRune(ctx: Ctx, slot: SlotId): boolean {
  const s = ctx.s;
  if (!SLOTS[slot] || runeBlock(s, slot)) return false;
  const L = runeLvl(s, slot) + 1;
  const c = runePay(s, L);
  s.ores[c.ore] -= c.n;
  s.gold -= c.gold;
  s.runes = { ...s.runes, [slot]: L };
  invalidate(ctx);
  ctx.dirty = true;
  toast(ctx, `Runa ${SLOTS[slot].n} ${L}: +${L * B.RUNE_PCT}% ${runeStat(slot)} dla ${RUNE_FOR[slot]} — na zawsze.`, 'good');
  return true;
}

/* ---------- przekuwanie ---------- */

/** Koszt przekucia jednej statystyki: ruda przedmiotu (z Boskiej Rudy — Gwiezdny Kruszec) i złoto, więcej dla wyższej rzadkości. */
export function reforgeCost(s: GameState, it: Item): Cost {
  return { ore: it.ore === DIVINE_ORE ? 6 : it.ore, n: Math.round(15 * (RAR[it.r].o + 1)), gold: Math.round(goldWaveOf(s) * 10 * (RAR[it.r].o + 1)) };
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
  const v = Math.round(rnd(rng, SUBS[id].lo, SUBS[id].hi) * subMult(it.r) * qMult(it.q) * 10) / 10; // z premią za jakość
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
