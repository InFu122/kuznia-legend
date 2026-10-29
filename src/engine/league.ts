// Ligi areny: wspólne obliczenia gry i serwera (punkty ligowe, duchy w grupie, tabela, awanse, sklep areny).
// Tydzień ligi to tydzień wojny klanów (poniedziałek–niedziela, UTC); sezon ligi to sezon Przepustki Kowala (28 dni).
import { ARENA_SHOP, FAKE_PLAYERS, GHOST_NAMES, LEAGUE, LEAGUES, type ArenaShopId } from '../data';
import { mulberry32, shuffle } from './rng';
import { seasonOf } from './shop';
import type { GameState, Reward } from './types';
import { mountsUnlocked, petsUnlocked, skillsUnlocked } from './companions';

const DAY_MS = 86400000;
export const TOP_TIER = LEAGUES.length - 1;

/** Punkty ligowe za walkę: wygrana 20 z równym przeciwnikiem (×0,5–1,5 według stosunku Mocy), porażka 3. */
export function leaguePts(win: boolean, myPower: number, oppPower: number): number {
  if (!win) return LEAGUE.LOSS_PTS;
  const k = myPower > 0 ? Math.max(0.5, Math.min(1.5, oppPower / myPower)) : 1;
  return Math.round(LEAGUE.WIN_PTS * k);
}
export const fightTokens = (win: boolean) => (win ? LEAGUE.WIN_TOKENS : LEAGUE.LOSS_TOKENS);

/** Początek tygodnia „wNNNN” (poniedziałek 00:00 UTC). */
export const weekStart = (week: string) => (Number(week.slice(1)) * 7 - 3) * DAY_MS;
/** Sezon, do którego należy tydzień. */
export const seasonOfWeek = (week: string) => seasonOf(weekStart(week));
/** Jaka część tygodnia minęła (0–1): dzień tygodnia (poniedziałek = 0) i pora dnia. */
export const weekFrac = (day: number, now: number) => Math.max(0, Math.min(1, (day + (now % DAY_MS) / DAY_MS) / 7));

/** Ziarno z tekstu (FNV-1a). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export interface Ghost { n: string; fin: number }
/** Duchy grupy: imię i wynik na koniec tygodnia (zawsze te same dla danej grupy). */
export function groupGhosts(key: string, tier: number, count: number): Ghost[] {
  const rng = mulberry32(hash(key));
  const pool = shuffle(rng, [...FAKE_PLAYERS, ...GHOST_NAMES]);
  const mean = LEAGUE.GHOST_MEAN + LEAGUE.GHOST_STEP * tier;
  const out: Ghost[] = [];
  for (let i = 0; i < LEAGUE.GROUP; i++) {
    const n = pool[i % pool.length] + (i >= pool.length ? '_' + (1 + Math.floor(i / pool.length)) : '');
    out.push({ n, fin: Math.round(mean * (0.35 + 1.3 * rng.next())) });
  }
  // Gracze zajmują kolejne miejsca w grupie, duchy — pozostałe (zawsze pierwsze `count` z listy).
  return out.slice(0, Math.max(0, count));
}
/** Wynik ducha w danej chwili tygodnia. */
export const ghostNow = (g: Ghost, frac: number) => Math.round(g.fin * frac);

export interface Member { n: string; pts: number; w: number; l: number }
export interface Row { id: string; n: string; pts: number; ghost: boolean }

/** Tabela grupy: gracze i duchy od najlepszego. Przy remisie wyżej gracz, potem kolejność dołączenia. */
export function standings(key: string, tier: number, members: Record<string, Member>, order: string[], frac: number): Row[] {
  const ids = order.filter(id => members[id]);
  const rows: Row[] = ids.map(id => ({ id, n: members[id].n, pts: members[id].pts, ghost: false }));
  groupGhosts(key, tier, LEAGUE.GROUP - ids.length).forEach((g, i) => rows.push({ id: 'duch-' + i, n: g.n, pts: ghostNow(g, frac), ghost: true }));
  const pos = new Map(rows.map((r, i) => [r.id, i]));
  return rows.sort((a, b) => b.pts - a.pts || Number(a.ghost) - Number(b.ghost) || pos.get(a.id)! - pos.get(b.id)!);
}

/** Zmiana ligi po tygodniu: +1 awans (najlepsza piątka), −1 spadek (ostatnia piątka), 0 utrzymanie. */
export function leagueMove(tier: number, rank: number): -1 | 0 | 1 {
  if (rank >= 1 && rank <= LEAGUE.PROMO && tier < TOP_TIER) return 1;
  if (rank > LEAGUE.GROUP - LEAGUE.DEMO && tier > 0) return -1;
  return 0;
}
/** Strefa miejsca w tabeli (do kolorów). */
export function zoneOf(tier: number, rank: number): 'up' | 'down' | '' {
  const m = leagueMove(tier, rank);
  return m > 0 ? 'up' : m < 0 ? 'down' : '';
}

/* ---------- sklep areny ---------- */

export function arenaShopOpen(s: GameState, id: ArenaShopId): boolean {
  switch (id) {
    case 'zwoj': return skillsUnlocked(s);
    case 'siodlo': return mountsUnlocked(s);
    case 'jajo': return petsUnlocked(s);
    default: return true;
  }
}

/** Co daje towar sklepu areny (bilet nie ma nagrody — dodaje walkę na arenie). */
export function arenaShopReward(id: ArenaShopId): Reward {
  switch (id) {
    case 'ksiegi': return { books: 3 };
    case 'kamienie': return { stones: 20 };
    case 'zwoj': return { scrolls: 1 };
    case 'siodlo': return { saddles: 1 };
    case 'jajo': return { eggs: { 2: 1 } };
    case 'pieczec': return { seals: 1 };
    case 'bilet': return {};
  }
}

export function arenaShopBlock(s: GameState | null, bought: Partial<Record<ArenaShopId, number>>, id: ArenaShopId, tokens: number): string | null {
  const it = ARENA_SHOP[id];
  if (!it) return 'nieznany towar';
  if (s && !arenaShopOpen(s, id)) return 'jeszcze niedostępne';
  if ((bought[id] ?? 0) >= it.day) return 'na dziś wyprzedane';
  if (tokens < it.cost) return 'za mało Żetonów';
  return null;
}
