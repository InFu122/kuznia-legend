// Ligi areny (tygodniowe grupy po 30 osób), Żetony Areny i sklep areny. Te same liczby czyta gra i serwer.

export const LEAGUES = [
  { n: 'Brąz', col: '#c98a55' },
  { n: 'Srebro', col: '#c9d2dc' },
  { n: 'Złoto', col: '#f2c94c' },
  { n: 'Platyna', col: '#8fe0d0' },
  { n: 'Diament III', col: '#7fb8ff' },
  { n: 'Diament II', col: '#a98bff' },
  { n: 'Diament I', col: '#ff8bd8' },
] as const;

export const LEAGUE = {
  GROUP: 30,          // miejsc w grupie (brakujące zajmują duchy areny)
  PROMO: 5,           // tylu najlepszych awansuje
  DEMO: 5,            // tylu ostatnich spada
  WIN_PTS: 20,        // punkty ligowe za wygraną z równym przeciwnikiem (×0,5–1,5 według siły)
  LOSS_PTS: 3,
  WIN_TOKENS: 5,      // Żetony Areny za walkę
  LOSS_TOKENS: 1,
  GHOST_MEAN: 230,    // średni wynik ducha w Brązie na koniec tygodnia (+45 za każdą ligę wyżej)
  GHOST_STEP: 45,
} as const;

/** Żetony za tydzień w lidze: więcej w wyższej lidze i za miejsca na podium grupy. */
export const leagueWeekTokens = (tier: number, rank: number) => 20 + 15 * tier + (rank <= 5 ? 30 - 5 * (rank - 1) : 0);
/** Klejnoty za najwyższą ligę sezonu (sezon = 28 dni, jak Przepustka Kowala). */
export const LEAGUE_SEASON_GEMS = [0, 20, 50, 100, 150, 200, 300];

export type ArenaShopId = 'bilet' | 'ksiegi' | 'kamienie' | 'zwoj' | 'siodlo' | 'jajo' | 'pieczec';
export const ARENA_SHOP: Record<ArenaShopId, { n: string; d: string; cost: number; day: number }> = {
  bilet: { n: 'Bilet na arenę', d: '+1 walka dziś', cost: 20, day: 3 },
  ksiegi: { n: 'Księgi Wiedzy ×3', d: 'do badań', cost: 30, day: 3 },
  kamienie: { n: 'Kamienie ×20', d: 'dla towarzyszy', cost: 25, day: 3 },
  zwoj: { n: 'Zwój zaklęć', d: 'losuje umiejętność', cost: 60, day: 2 },
  siodlo: { n: 'Siodło', d: 'losuje wierzchowca', cost: 80, day: 1 },
  jajo: { n: 'Rzadkie jajo', d: 'chowaniec co najmniej rzadki', cost: 100, day: 1 },
  pieczec: { n: 'Pieczęć Legendy', d: '+Sława Czynów przedmiotu', cost: 120, day: 1 },
};
export const ARENA_SHOP_IDS = Object.keys(ARENA_SHOP) as ArenaShopId[];
