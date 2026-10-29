import { B, ENEMY_SCALE_AT_BOSS, FORGE_AT_BOSS, GOLD_TIME_K, GOLD_WAVES, GOLD_WAVES_GROWTH, ITEM_LVL_GROWTH, JUMP_TABLE, LANDS, LEGEND, ORES, RARITY_AT_BOSS, RAR, SLOTS, SMITH_TITLES, UPGRADE_MIN } from '../data';
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
/** Czas ulepszenia kuźni do poziomu n (tabela UPGRADE_MIN). Pierwsze ulepszenie trwa 30 s (samouczek). */
export const upTime = (n: number) => (UPGRADE_MIN[Math.max(2, Math.min(B.FORGE_MAX, n))] ?? 0) * 60000;
/** Ile fal walki „kosztuje” następne ulepszenie przy kuźni na poziomie f. */
export const goldWaves = (f: number) =>
  Math.max(GOLD_WAVES * Math.pow(GOLD_WAVES_GROWTH, Math.max(0, f - 1)), GOLD_TIME_K * (UPGRADE_MIN[Math.min(B.FORGE_MAX, f + 1)] ?? 0));
/** Złoto z fali na etapie g: koszt następnego ulepszenia oczekiwanej kuźni podzielony przez liczbę fal (rośnie z poziomem). */
export const goldWave = (g: number) => {
  const f = Math.min(B.FORGE_MAX, Math.ceil(forgeExp(g)));
  return Math.max(1, Math.round(upCost(Math.min(B.FORGE_MAX, f + 1)) / goldWaves(f)));
};
/** Cena sprzedaży: mniej więcej pół fali złota za przedmiot Zwykły, więcej za rzadsze. */
export const sellPrice = (it: Item) => {
  const f = Math.min(B.FORGE_MAX, Math.floor(it.lvl / 2));
  return Math.max(1, Math.round((upCost(Math.min(B.FORGE_MAX, f + 1)) / (2 * goldWaves(Math.max(1, f)))) * (1 + it.r * 0.5)));
};
export const recPower = (land: number) => {
  const g = land * 10 + 5;
  return Math.round((Dstar(g) * 4 * 1.08 + Hstar(g) * 0.4) * early(g));
};

/**
 * Wersja zasad przeskoku zapisana w przedmiocie (`jv`), żeby serwer sprawdzał każdy wytop według zasad,
 * z którymi powstał. 1 — do października 2026: ta sama szansa na każdą rzadkość. 2 — obecna: przeskok na
 * rzadkości Legendarną, Mityczną i Boską jest trudniejszy, a pewny przeskok nie daje Boskiego.
 */
export const JUMP_V = 2;
/** Mnożnik szansy na przeskok, który kończy się na danej rzadkości (wersja 2). */
export const JUMP_TO_MULT = [1, 1, 1, 1, 0.8, 0.55, 0.25];

/** Bazowa szansa (w %) na przeskok o 1 i o 2 rzadkości na danym poziomie kuźni (z premią Hartowania `rel`). */
export function jumpBase(lvl: number, rel = 0): [number, number] {
  const k = 1 + rel / 100;
  for (let i = 0; i < JUMP_TABLE.length - 1; i++) {
    const [a, p1, q1] = JUMP_TABLE[i];
    const [b, p2, q2] = JUMP_TABLE[i + 1];
    if (lvl >= a && lvl <= b) {
      const t = (lvl - a) / (b - a);
      return [(p1 + (p2 - p1) * t) * k, (q1 + (q2 - q1) * t) * k];
    }
  }
  const last = JUMP_TABLE[JUMP_TABLE.length - 1];
  return [last[1] * k, last[2] * k];
}
/** Smocza Stal przeskakuje najwyżej o 1, Gwiezdny Kruszec wcale. */
export const maxJump = (ore: number) => (ore === 6 ? 0 : ore === 5 ? 1 : 2);

/**
 * Szansa (w %) na przeskok o 1 i o 2 rzadkości przy wytopie rudy `ore` (bez rudy — szansa bazowa).
 * Od wersji 2 przeskok tym trudniejszy, im rzadszy wynik (JUMP_TO_MULT). Gdy ruda przeskakuje najwyżej o 1,
 * obie szanse prowadzą do tej samej rzadkości (wytop sumuje je).
 */
export function jumpChances(lvl: number, rel = 0, ore = -1, ver = JUMP_V): [number, number] {
  const [p1, p2] = jumpBase(lvl, rel);
  if (ore < 0 || ver < 2 || !ORES[ore]) return [p1, p2];
  const f = ORES[ore].floor;
  const m1 = JUMP_TO_MULT[Math.min(6, f + 1)];
  const m2 = maxJump(ore) >= 2 ? JUMP_TO_MULT[Math.min(6, f + 2)] : m1;
  return [p1 * m1, p2 * m2];
}

/** Czy pewny przeskok (po PITY_MAX wytopach bez przeskoku) działa dla tej rudy. Od wersji 2 nie daje Boskiego. */
export const pityAllowed = (ore: number, ver = JUMP_V) => maxJump(ore) >= 1 && (ver < 2 || ORES[ore].floor + 1 <= 5);

/** Rozkład wyniku wytopu: lista [rzadkość, szansa w %]. */
export function dist(ore: number, lvl: number, rel = 0, ver = JUMP_V): [number, number][] {
  const [p1, p2] = jumpChances(lvl, rel, ore, ver);
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
