// Życie klanu po stronie gry: nagrody od serwera (każda raz), pomoc klanu w ulepszeniu kuźni i sklep klanowy.
// Wspólną Kuźnię, bossa klanowego, prośby o pomoc i rudę prowadzi serwer (server/src/clanlife.ts).
import { CLAN, CLAN_SHOP, SHOP_GOLD_WAVES, type ClanShopId } from '../data';
import { toast, type Ctx } from './context';
import { upgradeTime } from './forge';
import { goldWave } from './formulas';
import { weekStr } from './missions';
import { grant } from './reward';
import type { GameState, Reward } from './types';

/** Nagroda od serwera z numerem — gra przyznaje ją raz, a serwer usuwa ją po zapisie z tym numerem. */
export interface ServerReward { id: string; why: string; r: Reward }

/** Ile pamiętamy numerów odebranych nagród. */
const GOT_MAX = 100;

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
function cleanMap(m: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (m && typeof m === 'object') for (const [k, v] of Object.entries(m)) if (num(v)) out[k] = num(v);
  return out;
}
/** Nagroda od serwera bez dziwnych wartości. */
export function cleanReward(r: Reward): Reward {
  return {
    gold: num(r.gold), books: num(r.books), scrolls: num(r.scrolls), saddles: num(r.saddles), stones: num(r.stones), seals: num(r.seals), coins: num(r.coins),
    ores: cleanMap(r.ores), eggs: cleanMap(r.eggs),
  };
}

/** Przyznaje nagrody od serwera, których gra jeszcze nie wzięła. Zwraca przyznane. */
export function takeServerRewards(ctx: Ctx, list: ServerReward[]): ServerReward[] {
  const s = ctx.s;
  const got = new Set(s.clanGot);
  const out: ServerReward[] = [];
  for (const x of list) {
    if (!x || typeof x.id !== 'string' || got.has(x.id) || !x.r) continue;
    grant(ctx, cleanReward(x.r));
    s.clanGot.push(x.id);
    got.add(x.id);
    out.push(x);
  }
  if (s.clanGot.length > GOT_MAX) s.clanGot.splice(0, s.clanGot.length - GOT_MAX);
  return out;
}

/**
 * Pomoc klanu w ulepszeniu kuźni na poziom `lvl`: serwer liczy `n` pomocy łącznie.
 * Każda nowa pomoc skraca trwające ulepszenie o 3% jego pełnego czasu. Zwraca liczbę nowych pomocy.
 */
export function applyClanHelp(ctx: Ctx, lvl: number, n: number): number {
  const s = ctx.s;
  if (!(lvl > 1)) return 0;
  if (s.clanHelp.lvl !== lvl) s.clanHelp = { lvl, n: 0 };
  const add = Math.min(CLAN.HELP_MAX, Math.floor(n)) - s.clanHelp.n;
  if (add <= 0) return 0;
  s.clanHelp.n += add;
  if (s.forge.up === lvl) s.forge.left = Math.max(0, s.forge.left - (add * CLAN.HELP_PCT / 100) * upgradeTime(s, lvl));
  ctx.dirty = true;
  return add;
}

/** Datek do Wspólnej Kuźni kosztuje złoto z najdalszego etapu. */
export const donateCost = (s: GameState) => goldWave(s.bestG) * CLAN.DONATE_GOLD_WAVES;

/** Ile sztuk towaru można jeszcze kupić w tym tygodniu. */
export function shopLeft(s: GameState, id: ClanShopId, now: number): number {
  const bought = s.clanShop.week === weekStr(now) ? s.clanShop.n[id] ?? 0 : 0;
  return Math.max(0, CLAN_SHOP[id].week - bought);
}

/** Co daje towar ze sklepu klanowego. */
export function shopReward(s: GameState, id: ClanShopId): Reward {
  switch (id) {
    case 'zloto': return { gold: goldWave(s.bestG) * SHOP_GOLD_WAVES };
    case 'ksiega': return { books: 1 };
    case 'zwoj': return { scrolls: 1 };
    case 'kamienie': return { stones: 10 };
    case 'siodlo': return { saddles: 1 };
    case 'smocza': return { ores: { 5: 5 } };
    case 'jajo': return { eggs: { 2: 1 } };
    case 'pieczec': return { seals: 1 };
  }
}

/** Dlaczego nie da się kupić towaru (albo null). */
export function shopBlock(s: GameState, id: ClanShopId, now: number): string | null {
  const it = CLAN_SHOP[id];
  if (s.clanLvl < it.lvl) return `od ${it.lvl}. poziomu klanu`;
  if (shopLeft(s, id, now) <= 0) return 'wyprzedane do poniedziałku';
  if (s.clanCoins < it.cost) return 'za mało Monet';
  return null;
}

export function buyClanShop(ctx: Ctx, id: ClanShopId): boolean {
  const s = ctx.s;
  const now = ctx.now();
  if (!CLAN_SHOP[id] || shopBlock(s, id, now)) return false;
  const week = weekStr(now);
  if (s.clanShop.week !== week) s.clanShop = { week, n: {} };
  s.clanCoins -= CLAN_SHOP[id].cost;
  s.clanShop.n[id] = (s.clanShop.n[id] ?? 0) + 1;
  grant(ctx, shopReward(s, id));
  toast(ctx, `Kupiono: ${CLAN_SHOP[id].n}.`, 'good');
  return true;
}

/** Nagroda za atak na bossa klanowego. */
export function clanAttackReward(bestG: number): Reward {
  return { coins: CLAN.BOSS_ATTACK_COINS, gold: goldWave(bestG) * CLAN.BOSS_ATTACK_GOLD_WAVES };
}

/**
 * Skrzynia za pokonanie bossa klanowego poziomu `lvl` dla gracza z miejscem `rank` (0 = najwięcej obrażeń).
 * Pierwsze miejsce dostaje +50% i jajo, drugie i trzecie +25%.
 */
export function clanBossChest(lvl: number, rank: number, bestG: number): Reward {
  const k = rank === 0 ? 1.5 : rank < 3 ? 1.25 : 1;
  const L = Math.max(0, Math.min(30, Math.floor(lvl)));
  const r: Reward = {
    coins: Math.round((20 + 4 * L) * k),
    gold: Math.round(goldWave(bestG) * (30 + 5 * L) * k),
    books: 1 + Math.floor(L / 3),
    stones: 5 + 2 * L,
  };
  if (L >= 2) r.scrolls = 1 + Math.floor(L / 6);
  if (rank === 0) r.eggs = { [Math.min(4, 1 + Math.floor(L / 4))]: 1 };
  return r;
}
