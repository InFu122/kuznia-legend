// Sklep, Klejnoty (waluta premium), reklamy z nagrodą i Przepustka Kowala. Te same liczby czyta gra i serwer.

/* ---------- Klejnoty za prawdziwe pieniądze ---------- */

/** Pakiety Klejnotów. `id` = identyfikator produktu w Google Play; cena w złotych tylko do wyświetlenia przed połączeniem ze sklepem. */
export interface GemPack { id: string; n: string; gems: number; bonus: number; pln: number; once?: boolean; d?: string }
export const GEM_PACKS: GemPack[] = [
  { id: 'starter', n: 'Pakiet Nowicjusza', gems: 300, bonus: 0, pln: 9.99, once: true, d: '300 Klejnotów, 10 Ksiąg Wiedzy, 2 Zwoje zaklęć i Rzadkie jajo — tylko raz' },
  { id: 'gems_100', n: 'Garść Klejnotów', gems: 100, bonus: 0, pln: 4.99 },
  { id: 'gems_550', n: 'Sakiewka Klejnotów', gems: 500, bonus: 50, pln: 22.99 },
  { id: 'gems_1200', n: 'Szkatuła Klejnotów', gems: 1000, bonus: 200, pln: 44.99 },
  { id: 'gems_2600', n: 'Kufer Klejnotów', gems: 2000, bonus: 600, pln: 89.99 },
  { id: 'gems_7000', n: 'Skarbiec Klejnotów', gems: 5000, bonus: 2000, pln: 219.99 },
];
export const STARTER_EXTRA = { books: 10, scrolls: 2, eggs: { 2: 1 } };

/* ---------- towary za Klejnoty ---------- */

export type GemItemId = 'zloto' | 'ruda' | 'ksiegi' | 'kamienie' | 'zwoj' | 'siodlo' | 'jajo' | 'klucze';
export interface GemItem { n: string; d: string; cost: number; day: number; need?: 'skills' | 'pets' | 'mounts' | 'dungeons' }
/** Towary za Klejnoty z dziennym limitem (od północy UTC). */
export const GEM_SHOP: Record<GemItemId, GemItem> = {
  zloto: { n: 'Sakwa złota', d: 'złoto za 300 fal z najdalszego etapu', cost: 40, day: 5 },
  ruda: { n: 'Wóz rudy', d: '200 sztuk najlepszej rudy, którą wytapiasz', cost: 50, day: 3 },
  ksiegi: { n: 'Księgi Wiedzy ×5', d: 'do badań w Nauce', cost: 60, day: 3 },
  kamienie: { n: 'Kamienie ×30', d: 'do gwiazdek chowańców i wierzchowców', cost: 40, day: 3 },
  zwoj: { n: 'Zwój zaklęć', d: 'losuje umiejętność', cost: 90, day: 2, need: 'skills' },
  siodlo: { n: 'Siodło', d: 'losuje wierzchowca', cost: 120, day: 1, need: 'mounts' },
  jajo: { n: 'Rzadkie jajo', d: 'wykluwa chowańca co najmniej rzadkiego', cost: 150, day: 1, need: 'pets' },
  klucze: { n: 'Komplet kluczy', d: 'odnawia dzisiejsze klucze do wszystkich lochów', cost: 80, day: 1, need: 'dungeons' },
};
export const GEM_ITEM_IDS = Object.keys(GEM_SHOP) as GemItemId[];

/** Przyspieszenie (kuźnia, badania): 1 Klejnot za każde rozpoczęte 4 minuty, co najmniej 1. */
export const SPEEDUP_MIN_PER_GEM = 4;
export const speedupGems = (ms: number) => (ms > 0 ? Math.max(1, Math.ceil(ms / 60000 / SPEEDUP_MIN_PER_GEM)) : 0);

/** Darmowy prezent dnia w sklepie: złoto za 100 fal i 30 sztuk najlepszej rudy. */
export const DAILY_GIFT = { goldWaves: 100, ore: 30 };

/* ---------- reklamy z nagrodą ---------- */

export type BuffId = 'ruda' | 'zloto';
/** Wzmocnienia za obejrzaną reklamę: ×2 ruda albo ×2 złoto z fal (także w nagrodach za nieobecność) przez godzinę. */
export const AD_BUFFS: Record<BuffId, { n: string; d: string; mult: number; ms: number; day: number }> = {
  ruda: { n: 'Gorączka rudy', d: '×2 ruda z fal przez godzinę', mult: 2, ms: 3600000, day: 4 },
  zloto: { n: 'Złota passa', d: '×2 złoto z fal przez godzinę', mult: 2, ms: 3600000, day: 4 },
};
export const BUFF_IDS = Object.keys(AD_BUFFS) as BuffId[];
export const AD = {
  GEMS: 5,                    // Klejnoty za reklamę w sklepie
  GEMS_DAY: 1,
  BUFF_MAX_MS: 3 * 3600000,   // kolejne reklamy przedłużają wzmocnienie najwyżej do 3 godzin naprzód
  OFFER_EVERY_MS: 4 * 60000,  // co tyle minut gry na polu walki pojawia się ikonka reklamy
  OFFER_SHOW_MS: 90000,       // ikonka znika po 1,5 minuty
  TEST_AD_MS: 5000,           // reklama testowa (zanim gra dostanie prawdziwe reklamy)
} as const;

/* ---------- Przepustka Kowala ---------- */

export const PASS = {
  LEVELS: 30,
  XP_PER_LVL: 1200,             // 30 poziomów = 36 000 pkt ≈ 24 dni z dziennym limitem (sezon ma 28)
  DAY_CAP: 1500,              // najwyżej tyle punktów przepustki dziennie
  SEASON_DAYS: 28,
  EPOCH: Date.UTC(2026, 9, 26), // poniedziałek 26 października 2026 — początek sezonu 1
  PREM_COST: 500,             // złota ścieżka za Klejnoty
  // punkty: wytop 0,1 · wróg 0,02 · boss krainy 40 · klucz w lochu 20 · piętro Wieży 5
  XP_SMELT: 0.1, XP_KILL: 0.02, XP_BOSS: 40, XP_KEY: 20, XP_TOWER: 5,
} as const;
export const SEASON_NAMES = ['Żar Kuźni', 'Szron Gór', 'Burza Przełęczy', 'Cień Krypt', 'Smocze Ognie', 'Gwiezdny Pył'];

/** Nagroda przepustki: rodzaj i ilość (złoto liczone w falach z najdalszego etapu, ruda — najlepsza wytapiana). */
export type PassKind = 'gold' | 'ore' | 'books' | 'stones' | 'scrolls' | 'gems' | 'egg' | 'saddles' | 'seals';
export interface PassItem { k: PassKind; n: number }
export interface PassLevel { free: PassItem[]; prem: PassItem[] }

function passLevels(): PassLevel[] {
  const out: PassLevel[] = [];
  for (let L = 1; L <= PASS.LEVELS; L++) {
    const c = (L - 1) % 4;
    const free: PassItem[] = L % 5 === 0 ? [{ k: 'gems', n: 15 }]
      : [[{ k: 'gold', n: 80 + 10 * L }], [{ k: 'ore', n: 30 + 3 * L }], [{ k: 'books', n: 1 + Math.floor(L / 10) }], [{ k: 'stones', n: 10 + Math.floor(L / 2) }]][c] as PassItem[];
    const prem: PassItem[] = [[{ k: 'gold', n: 200 + 20 * L }], [{ k: 'ore', n: 80 + 6 * L }], [{ k: 'books', n: 3 + Math.floor(L / 6) }], [{ k: 'scrolls', n: 1 }]][c] as PassItem[];
    if (L % 5 === 0) prem.push({ k: 'gems', n: L === PASS.LEVELS ? 100 : 30 });
    if (L === 10) prem.push({ k: 'egg', n: 2 });
    if (L === 15) prem.push({ k: 'saddles', n: 1 });
    if (L === 20) prem.push({ k: 'egg', n: 3 });
    if (L === 25) prem.push({ k: 'seals', n: 2 });
    if (L === 30) prem.push({ k: 'egg', n: 4 });
    out.push({ free, prem });
  }
  return out;
}
/** Nagrody kolejnych poziomów (indeks 0 = poziom 1). */
export const PASS_LEVELS = passLevels();
