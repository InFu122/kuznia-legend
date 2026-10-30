import {
  B, DIVINE_JUMP, ENEMY_SCALE_AT_BOSS, FORGE_AT_BOSS, GOLD_CUT, GOLD_CUT_FROM, GOLD_CUT_TO, GOLD_TIME_K, GOLD_WAVES, GOLD_WAVES_GROWTH, ITEM_LVL_GROWTH, ITEM_LVL_GROWTH_HI, ITEM_LVL_SOFT,
  JUMP_TABLE, LANDS, LEGEND, ORES, ORE_LVL_V4, ORE_ORDER, RARITY_AT_BOSS, RAR, SLOTS, SMITH_TITLES, UPGRADE_MIN, oreRank,
} from '../data';
import type { GameState, Item } from './types';

/** Globalny indeks trudności: kraina × 10 + etap (kampania 0–159, dalej kręgi Otchłani). */
export const gOf = (land: number, stage: number) => land * 10 + (stage - 1);
export const curG = (s: GameState) => gOf(s.cur.land, s.cur.stage);

/** Rozbija indeks trudności na krainę i postęp w niej (0 = etap 1, 1 = boss). */
function landAt(g: number): [number, number] {
  const c = Math.max(0, g);
  const land = Math.floor(c / 10);
  return [land, Math.min(1, (c - land * 10) / 9)];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LAST = LANDS.length - 1;
/** Oczekiwany poziom kuźni przy bossie krainy L; w Otchłani +4 poziomy na krąg (do najwyższego poziomu). */
export const forgeAtBoss = (L: number) => (L <= LAST ? FORGE_AT_BOSS[L] : Math.min(B.FORGE_MAX, FORGE_AT_BOSS[LAST] + 4 * (L - LAST)));
/** Oczekiwany mnożnik rzadkości przy bossie krainy L (w Otchłani powoli do 6). */
export const rarityAtBoss = (L: number) => (L <= LAST ? RARITY_AT_BOSS[L] : Math.min(6, RARITY_AT_BOSS[LAST] + 0.035 * (L - LAST)));
/**
 * Mnożnik siły wrogów przy bossie krainy L. W Otchłani rośnie o 3% na krąg, a gdy kuźnia nie może już urosnąć
 * (najwyższy poziom), każdy krąg jest o 10% trudniejszy — Otchłań nie ma dna.
 */
export function enemyAtBoss(L: number): number {
  if (L <= LAST) return ENEMY_SCALE_AT_BOSS[L];
  const k = L - LAST;
  const capAt = Math.ceil((B.FORGE_MAX - FORGE_AT_BOSS[LAST]) / 4);
  return ENEMY_SCALE_AT_BOSS[LAST] * (1 + 0.03 * k) * Math.pow(1.1, Math.max(0, k - capAt));
}
/** Oczekiwany poziom kuźni gracza na etapie g. */
export function forgeExp(g: number): number {
  const [L, t] = landAt(g);
  return lerp(L === 0 ? 1 : forgeAtBoss(L - 1), forgeAtBoss(L), t);
}
/** Oczekiwany mnożnik rzadkości ekwipunku na etapie g. */
export function rarityExp(g: number): number {
  const [L, t] = landAt(g);
  return lerp(L === 0 ? 1 : rarityAtBoss(L - 1), rarityAtBoss(L), t);
}
/** Mnożnik siły wrogów na etapie g (kalibracja z symulatora). */
export function enemyScale(g: number): number {
  const [L, t] = landAt(g);
  return lerp(L === 0 ? 1 : enemyAtBoss(L - 1), enemyAtBoss(L), t);
}
/** Mnożnik siły przedmiotu z poziomu: +8% na poziom do ITEM_LVL_SOFT, dalej mniej (kuźnia rośnie do 200). */
export const lvlFactor = (lvl: number) =>
  Math.pow(ITEM_LVL_GROWTH, Math.min(lvl, ITEM_LVL_SOFT)) * Math.pow(ITEM_LVL_GROWTH_HI, Math.max(0, lvl - ITEM_LVL_SOFT));
/** Poziom przedmiotu wynika z poziomu kuźni, na której go wytopiono. */
export const itemLevelFor = (forgeLvl: number, extra: number) => Math.max(1, 2 * forgeLvl + extra);

/** Oczekiwane obrażenia i zdrowie gracza na etapie g — z nich skalują się wrogowie. */
/** Mnożnik z oczekiwanych substatów, żywiołów i legend — rośnie razem z rzadkością. */
export const extrasExp = (g: number) => 1.15 + 0.15 * (rarityExp(g) - 1);
export const Dstar = (g: number) => (10 + 23 * lvlFactor(2 * forgeExp(g) + 1) * rarityExp(g) * extrasExp(g)) * enemyScale(g);
export const Hstar = (g: number) => (100 + 150 * lvlFactor(2 * forgeExp(g) + 1) * rarityExp(g)) * enemyScale(g);
/** Złagodzenie pierwszej krainy dla gracza bez ekwipunku. */
export const early = (g: number) => (g < 10 ? 0.4 + 0.06 * g : 1);

/** Koszt ulepszenia kuźni do poziomu n: ×1,5 na poziom do 30., dalej ×1,04. */
export const upCost = (n: number) =>
  Math.round(B.UPGRADE_COST_BASE * Math.pow(B.UPGRADE_COST_MULT, Math.min(n, B.UPGRADE_COST_SOFT) - 1) * Math.pow(B.UPGRADE_COST_MULT_HI, Math.max(0, n - B.UPGRADE_COST_SOFT)));
/** Czas ulepszenia kuźni do poziomu n (tabela UPGRADE_MIN). Pierwsze ulepszenie trwa 30 s (samouczek). */
export const upTime = (n: number) => (UPGRADE_MIN[Math.max(2, Math.min(B.FORGE_MAX, n))] ?? 0) * 60000;
/** Fale złota na minutę czasu ulepszenia: GOLD_TIME_K do poziomu GOLD_CUT_FROM, potem płynnie do GOLD_TIME_K × GOLD_CUT. */
export const goldTimeK = (f: number) =>
  GOLD_TIME_K * (1 + (GOLD_CUT - 1) * Math.min(1, Math.max(0, (f - GOLD_CUT_FROM) / (GOLD_CUT_TO - GOLD_CUT_FROM))));
/** Ile fal walki „kosztuje” następne ulepszenie przy kuźni na poziomie f. */
export const goldWaves = (f: number) =>
  Math.max(GOLD_WAVES * Math.pow(GOLD_WAVES_GROWTH, Math.max(0, Math.min(f, B.UPGRADE_COST_SOFT) - 1)), goldTimeK(f) * (UPGRADE_MIN[Math.min(B.FORGE_MAX, f + 1)] ?? 0));
/** Złoto z fali na etapie g: koszt następnego ulepszenia oczekiwanej kuźni podzielony przez liczbę fal (rośnie z poziomem). */
export const goldWave = (g: number) => {
  const f = Math.min(B.FORGE_MAX, Math.ceil(forgeExp(g)));
  return Math.max(1, Math.round(upCost(Math.min(B.FORGE_MAX, f + 1)) / goldWaves(f)));
};
/** Najmniejszy etap g, na którym gra oczekuje kuźni co najmniej f (powyżej najwyższego poziomu — bez granicy). */
const gAtForgeCache = new Map<number, number>();
export function gAtForge(f: number): number {
  if (f > B.FORGE_MAX) return Number.POSITIVE_INFINITY;
  let g = gAtForgeCache.get(f);
  if (g === undefined) {
    let lo = 0, hi = 10;
    while (forgeExp(hi) < f && hi < 1e6) hi *= 2;
    while (lo < hi) { const m = (lo + hi) >> 1; if (forgeExp(m) >= f) hi = m; else lo = m + 1; }
    g = lo;
    gAtForgeCache.set(f, g);
  }
  return g;
}
/**
 * Etap, od którego liczy się złoto gracza (fale, nagrody w „falach złota”, koszty run i przekuwania):
 * etap `g` (domyślnie najdalszy), ale nie dalej, niż przewiduje kuźnia gracza + B.GOLD_FORGE_AHEAD poziomy.
 * Dzięki temu gracz, który zaszedł daleko w kampanii z niską kuźnią, nie dostaje złota skrojonego na wyższy poziom.
 */
export const goldG = (s: Pick<GameState, 'bestG' | 'forge'>, g = s.bestG) =>
  Math.min(Math.max(0, g || 0), gAtForge(Math.max(1, (s.forge?.lvl || 1) + B.GOLD_FORGE_AHEAD)));
/** Złoto z fali dla gracza na etapie `g` (domyślnie najdalszym). */
export const goldWaveOf = (s: Pick<GameState, 'bestG' | 'forge'>, g = s.bestG) => goldWave(goldG(s, g));

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
 * z którymi powstał. 1 — do października 2026: ta sama szansa na każdą rzadkość. 2 — przeskok na
 * rzadkości Legendarną, Mityczną i Boską jest trudniejszy, a pewny przeskok nie daje Boskiego.
 * 3 — Gwiezdny Kruszec daje najmniej Mityczny, a Boski tylko z przeskoku z małą szansą
 * (mnożnik `div` rudy, domyślnie DIVINE_JUMP); nowe rudy: Obsydian, Eteryt, Boska Ruda.
 * 4 — ruda, która podnosi minimum rzadkości (Srebro, Mithril, Adamantyt, Smocza Stal), wchodzi stopniowo —
 * tuż po odblokowaniu część wytopów wychodzi o rzadkość niżej (`dropChance`).
 * 5 — obecna: kuźnia do 200. poziomu, rudy otwierają się dużo później (`oreLvl`; dawne poziomy w ORE_LVL_V4).
 */
export const JUMP_V = 5;
/** Od którego poziomu kuźni ruda daje się wytopić według zasad wersji `ver`. */
export const oreLvl = (ore: number, ver = JUMP_V) => (ver < 5 ? ORE_LVL_V4[ore] ?? ORES[ore]?.lvl ?? 1 : ORES[ore]?.lvl ?? 1);
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
/** Minimalna rzadkość rudy według zasad wersji `ver` (do wersji 2 Gwiezdny Kruszec dawał zawsze Boski). */
export const oreFloor = (ore: number, ver = JUMP_V) => (ver < 3 && ore === 6 ? 6 : ORES[ore]?.floor ?? 0);
/** Najwyższy przeskok rudy (do wersji 2: Smocza Stal o 1, Gwiezdny Kruszec wcale). */
export const maxJump = (ore: number, ver = JUMP_V) => (ver < 3 ? (ore === 6 ? 0 : ore === 5 ? 1 : 2) : ORES[ore]?.mj ?? 2);
/** Mnożnik szansy na przeskok kończący się rzadkością `r` (od wersji 3 Boski — według rudy). */
const jumpToMult = (ore: number, r: number, ver: number) => (ver >= 3 && r >= 6 ? ORES[ore]?.div ?? DIVINE_JUMP : JUMP_TO_MULT[Math.min(6, r)]);

/**
 * Szansa (w %) na przeskok o 1 i o 2 rzadkości przy wytopie rudy `ore` (bez rudy — szansa bazowa).
 * Od wersji 2 przeskok tym trudniejszy, im rzadszy wynik (JUMP_TO_MULT). Gdy ruda przeskakuje najwyżej o 1,
 * obie szanse prowadzą do tej samej rzadkości (wytop sumuje je).
 */
export function jumpChances(lvl: number, rel = 0, ore = -1, ver = JUMP_V): [number, number] {
  const [p1, p2] = jumpBase(lvl, rel);
  if (ore < 0 || ver < 2 || !ORES[ore]) return [p1, p2];
  const f = oreFloor(ore, ver);
  const m1 = jumpToMult(ore, f + 1, ver);
  const m2 = maxJump(ore, ver) >= 2 ? jumpToMult(ore, f + 2, ver) : m1;
  return [p1 * m1, p2 * m2];
}

/** Czy pewny przeskok (po PITY_MAX wytopach bez przeskoku) działa dla tej rudy. Od wersji 2 nie daje Boskiego. */
export const pityAllowed = (ore: number, ver = JUMP_V) => maxJump(ore, ver) >= 1 && (ver < 2 || oreFloor(ore, ver) + 1 <= 5);

/** Czy ruda podnosi minimum rzadkości względem poprzedniej rudy w grze (Srebro, Mithril, Adamantyt, Smocza Stal). */
export function oreRamps(ore: number): boolean {
  const k = oreRank(ore);
  return k > 0 && !!ORES[ore] && ORES[ore].lvl > 1 && ORES[ore].floor > ORES[ORE_ORDER[k - 1]].floor;
}

/**
 * Szansa (w %) na wynik o rzadkość niżej niż minimum rudy (od wersji 4): ruda, która podnosi minimum, wchodzi
 * stopniowo — na poziomie kuźni, na którym się odblokowuje, B.RAMP_DROP %, potem mniej z każdym poziomem,
 * a po B.RAMP_LEVELS poziomach już zawsze pełne minimum. Spadek wypada przy najwyższych wynikach losowania.
 */
export const dropChance = (ore: number, flvl: number, ver = JUMP_V) =>
  (ver < 4 || !oreRamps(ore) ? 0 : B.RAMP_DROP * Math.max(0, Math.min(1, 1 - (flvl - oreLvl(ore, ver)) / B.RAMP_LEVELS)));

/** Rozkład wyniku wytopu: lista [rzadkość, szansa w %]. */
export function dist(ore: number, lvl: number, rel = 0, ver = JUMP_V): [number, number][] {
  const [p1, p2] = jumpChances(lvl, rel, ore, ver);
  const r = oreFloor(ore, ver);
  const mj = maxJump(ore, ver);
  const pd = dropChance(ore, lvl, ver);
  const low: [number, number][] = pd > 0 ? [[r - 1, pd]] : [];
  if (mj === 0) return [...low, [r, 100 - pd]];
  if (mj === 1) return [...low, [r, 100 - p1 - p2 - pd], [r + 1, p1 + p2]];
  return [...low, [r, 100 - p1 - p2 - pd], [r + 1, p1], [r + 2, p2]];
}

export const legStage = (fame: number) => (fame >= LEGEND[3].at ? 3 : fame >= LEGEND[2].at ? 2 : fame >= LEGEND[1].at ? 1 : 0);

export function mainVal(it: Item): number {
  return Math.round(SLOTS[it.slot].base * lvlFactor(it.lvl) * RAR[it.r].m * (ORES[it.ore]?.q ?? 1) * (1 + LEGEND[it.ls || 0].b));
}

/** Boskie przedmioty mają własne imię — zawsze to samo dla danego przedmiotu (z numeru wytopu, rodzaju i kowala). */
const DIV_A = ['Gniew', 'Łza', 'Serce', 'Pieśń', 'Oddech', 'Tchnienie', 'Szept', 'Blask', 'Furia', 'Duma', 'Wola', 'Gromowładztwo', 'Przysięga', 'Iskra', 'Korona', 'Sąd'];
const DIV_B = ['Peruna', 'Świtu', 'Gwiazd', 'Burzy', 'Smoka', 'Bogów', 'Wieczności', 'Jutrzenki', 'Swarożyca', 'Tytanów', 'Niebios', 'Welesa', 'Słońca', 'Otchłani', 'Świętowita', 'Zorzy'];
export function divineName(it: Item): string {
  const key = `${it.sx ?? it.id}|${it.kind}|${it.smith}|${it.slot}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h >>>= 0;
  return `${DIV_A[h % DIV_A.length]} ${DIV_B[(h >>> 8) % DIV_B.length]}`;
}
export function baseName(it: Item): string {
  const adj = ORES[it.ore].adj[it.g === 'm' ? 0 : it.g === 'f' ? 1 : 2];
  return adj + ' ' + it.kind;
}
export const itemName = (it: Item) => (it.aw ? it.aw.name : it.r >= 6 ? divineName(it) : baseName(it));

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
