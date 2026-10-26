import { B, ENEMY_SCALE_AT_BOSS, FORGE_AT_BOSS, ITEM_LVL_GROWTH, JUMP_TABLE, LANDS, LEGEND, ORES, RARITY_AT_BOSS, RAR, SLOTS, SMITH_TITLES } from '../data';
import type { GameState, Item } from './types';

/** Globalny indeks trudności: kraina × 10 + etap (0–159). */
export const gOf = (land: number, stage: number) => land * 10 + (stage - 1);
export const curG = (s: GameState) => gOf(s.cur.land, s.cur.stage);

const MAX_G = LANDS.length * 10 - 1;
/** Rozbija indeks trudności na krainę i postęp w niej (0 = etap 1, 1 = boss). */
function landAt(g: number): [number, number] {
  const c = Math.min(MAX_G, Math.max(0, g));
  const land = Math.min(LANDS.length - 1, Math.floor(c / 10));
  return [land, Math.min(1, (c - land * 10) / 9)];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Oczekiwany poziom kuźni gracza na etapie g. */
export function forgeExp(g: number): number {
  const [L, t] = landAt(g);
  return lerp(L === 0 ? 1 : FORGE_AT_BOSS[L - 1], FORGE_AT_BOSS[L], t);
}
/** Oczekiwany mnożnik rzadkości ekwipunku na etapie g. */
export function rarityExp(g: number): number {
  const [L, t] = landAt(g);
  return lerp(L === 0 ? 1 : RARITY_AT_BOSS[L - 1], RARITY_AT_BOSS[L], t);
}
/** Mnożnik siły wrogów na etapie g (kalibracja z symulatora). */
export function enemyScale(g: number): number {
  const [L, t] = landAt(g);
  return lerp(L === 0 ? 1 : ENEMY_SCALE_AT_BOSS[L - 1], ENEMY_SCALE_AT_BOSS[L], t);
}
export const lvlFactor = (lvl: number) => Math.pow(ITEM_LVL_GROWTH, lvl);
/** Poziom przedmiotu wynika z poziomu kuźni, na której go wytopiono. */
export const itemLevelFor = (forgeLvl: number, extra: number) => Math.max(1, 2 * forgeLvl + extra);

/** Oczekiwane obrażenia i zdrowie gracza na etapie g — z nich skalują się wrogowie. */
/** Mnożnik z oczekiwanych substatów, żywiołów i legend — rośnie razem z rzadkością. */
export const extrasExp = (g: number) => 1.15 + 0.15 * (rarityExp(g) - 1);
export const Dstar = (g: number) => (10 + 23 * lvlFactor(2 * forgeExp(g) + 1) * rarityExp(g) * extrasExp(g)) * enemyScale(g);
export const Hstar = (g: number) => (100 + 150 * lvlFactor(2 * forgeExp(g) + 1) * rarityExp(g)) * enemyScale(g);
/** Złagodzenie pierwszej krainy dla gracza bez ekwipunku. */
export const early = (g: number) => (g < 10 ? 0.4 + 0.06 * g : 1);

export const upCost = (n: number) => Math.round(B.UPGRADE_COST_BASE * Math.pow(B.UPGRADE_COST_MULT, n - 1));
export const upTime = (n: number) => Math.pow(B.UPGRADE_TIME_MULT, n - 1) * 60000;
/** Złoto rośnie w tempie kosztów kuźni, więc to czas ulepszeń jest główną bramką, nie złoto. */
export const goldWave = (g: number) => Math.max(1, Math.round(upCost(Math.min(B.FORGE_MAX, Math.ceil(forgeExp(g)) + 1)) / 45));
export const sellPrice = (it: Item) => Math.max(1, Math.round((upCost(Math.min(B.FORGE_MAX, Math.floor(it.lvl / 2) + 1)) / 70) * (1 + it.r * 0.6)));
export const recPower = (land: number) => {
  const g = land * 10 + 5;
  return Math.round((Dstar(g) * 4 * 1.08 + Hstar(g) * 0.4) * early(g));
};

/** Szansa (w %) na przeskok o 1 i o 2 rzadkości na danym poziomie kuźni. */
export function jumpChances(lvl: number): [number, number] {
  for (let i = 0; i < JUMP_TABLE.length - 1; i++) {
    const [a, p1, q1] = JUMP_TABLE[i];
    const [b, p2, q2] = JUMP_TABLE[i + 1];
    if (lvl >= a && lvl <= b) {
      const t = (lvl - a) / (b - a);
      return [p1 + (p2 - p1) * t, q1 + (q2 - q1) * t];
    }
  }
  const last = JUMP_TABLE[JUMP_TABLE.length - 1];
  return [last[1], last[2]];
}
/** Smocza Stal przeskakuje najwyżej o 1, Gwiezdny Kruszec wcale. */
export const maxJump = (ore: number) => (ore === 6 ? 0 : ore === 5 ? 1 : 2);

/** Rozkład wyniku wytopu: lista [rzadkość, szansa w %]. */
export function dist(ore: number, lvl: number): [number, number][] {
  const [p1, p2] = jumpChances(lvl);
  const r = ORES[ore].floor;
  const mj = maxJump(ore);
  if (mj === 0) return [[r, 100]];
  if (mj === 1) return [[r, 100 - p1 - p2], [r + 1, p1 + p2]];
  return [[r, 100 - p1 - p2], [r + 1, p1], [r + 2, p2]];
}

export const legStage = (fame: number) => (fame >= LEGEND[3].at ? 3 : fame >= LEGEND[2].at ? 2 : fame >= LEGEND[1].at ? 1 : 0);

export function mainVal(it: Item): number {
  return Math.round(SLOTS[it.slot].base * lvlFactor(it.lvl) * RAR[it.r].m * (1 + LEGEND[it.ls || 0].b));
}
export function baseName(it: Item): string {
  const adj = ORES[it.ore].adj[it.g === 'm' ? 0 : it.g === 'f' ? 1 : 2];
  return adj + ' ' + it.kind;
}
export const itemName = (it: Item) => (it.aw ? it.aw.name : baseName(it));

export function smithTitle(fame: number) {
  let t: (typeof SMITH_TITLES)[number] = SMITH_TITLES[0];
  for (const x of SMITH_TITLES) if (fame >= x.at) t = x;
  return t;
}
export function nextSmithTitle(fame: number) {
  return SMITH_TITLES.find(x => x.at > fame) ?? null;
}

export function todayStr(now: number): string {
  const d = new Date(now);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
export function clockStr(now: number): string {
  const d = new Date(now);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
