// Ligi areny na serwerze: tygodniowe grupy po 30 osób, Żetony Areny i sklep areny.
//
// Pierwsza walka tygodnia dopisuje gracza do grupy jego ligi (league_idx/{tydzień}:{liga} — numer i zapełnienie
// bieżącej grupy, league_grp/{tydzień}:{liga}:{n} — gracze i ich punkty). Brakujące miejsca zajmują duchy areny,
// których wynik rośnie z upływem tygodnia (src/engine/league.ts).
// Tydzień rozlicza się leniwie: przy pierwszym wejściu na arenę w nowym tygodniu serwer liczy miejsce w starej grupie,
// zmienia ligę (awans/spadek) i wypłaca Żetony. Na koniec sezonu (28 dni, jak Przepustka Kowala) wypłaca Klejnoty
// za najwyższą ligę sezonu, a liga spada o jeden stopień.
//
// Magazyn gracza (tylko serwer): league/me — liga, grupa tygodnia, wynik sezonu; league/shop — dzienne limity sklepu areny.
// Żetony Areny żyją w portfelu Nakamy (klucz `tokens`).
import { ARENA_SHOP, LEAGUE, LEAGUE_SEASON_GEMS, leagueWeekTokens, type ArenaShopId } from '../../src/data';
import {
  TOP_TIER, arenaShopBlock, arenaShopReward, fightTokens, leagueMove, leaguePts, seasonOfWeek, standings, weekFrac, weekStart, type Member,
} from '../../src/engine/league';
import { addArenaFight } from './arena';
import { readPending } from './clanlife';
import { INVALID, PRECONDITION, SYSTEM_USER, err, parse, readSave, serverDay, updateObject, userOf } from './common';
import { giveReward, walletAdd, walletGems, walletGet, walletSpend } from './shop';
import { warClock, type WarClock } from './war';

export const TOKENS = 'tokens';
const DAY_MS = 86400000;
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };

interface Group { key: string; week: string; tier: number; members: Record<string, Member>; order: string[] }
interface Idx { n: number; fill: number }
interface LeagueMe {
  tier: number;
  week: string;          // tydzień, którego dotyczy `g`
  g: string | null;      // grupa w tym tygodniu (null — jeszcze nie walczył)
  season: number;        // sezon, w którym liczy się `best`
  best: number;          // najwyższa liga sezonu (−1 — bez walk w tym sezonie)
  last?: { week: string; tier: number; rank: number; move: number; tokens: number };
  lastSeason?: { n: number; best: number; gems: number };
}
interface ShopDay { day: string; n: Partial<Record<ArenaShopId, number>> }

function readGroup(nk: nkruntime.Nakama, key: string): Group | null {
  const o = nk.storageRead([{ collection: 'league_grp', key, userId: SYSTEM_USER }]);
  return o.length ? (o[0].value as unknown as Group) : null;
}

/** Rozlicza zaległy tydzień i sezon gracza; wypłaca Żetony i Klejnoty. Zwraca aktualny stan ligi. */
function settle(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, now: number): { me: LeagueMe; clock: WarClock } {
  const clock = warClock(nk, ctx, now);
  const sNow = seasonOfWeek(clock.week).n;
  let pay = { tokens: 0, gems: 0 };
  const me = updateObject<LeagueMe>(nk, 'league', 'me', userId, cur => {
    pay = { tokens: 0, gems: 0 };
    if (cur && cur.week === clock.week && cur.season === sNow) return null;
    const m: LeagueMe = cur ? { ...cur } : { tier: 0, week: clock.week, g: null, season: sNow, best: -1 };
    if (m.week !== clock.week) {
      const grp = m.g ? readGroup(nk, m.g) : null;
      if (grp && grp.members[userId]) {
        const rows = standings(grp.key, grp.tier, grp.members, grp.order, 1);
        const rank = rows.findIndex(r => r.id === userId) + 1;
        const move = leagueMove(grp.tier, rank);
        const tokens = leagueWeekTokens(grp.tier, rank);
        m.tier = Math.max(0, Math.min(TOP_TIER, grp.tier + move));
        m.last = { week: m.week, tier: grp.tier, rank, move, tokens };
        pay.tokens += tokens;
        if (seasonOfWeek(m.week).n === m.season) m.best = Math.max(m.best, m.tier);
      }
      m.week = clock.week;
      m.g = null;
    }
    if (m.season !== sNow) {
      if (m.best >= 0) {
        const gems = LEAGUE_SEASON_GEMS[m.best] ?? 0;
        m.lastSeason = { n: m.season, best: m.best, gems };
        pay.gems += gems;
      }
      if (cur) m.tier = Math.max(0, m.tier - 1);
      m.season = sNow;
      m.best = -1;
    }
    return m;
  }, perm)!;
  if (pay.tokens) walletAdd(nk, userId, TOKENS, pay.tokens, `liga: tydzień ${me.last?.week ?? ''}`);
  if (pay.gems) walletAdd(nk, userId, 'gems', pay.gems, `liga: sezon ${me.lastSeason?.n ?? ''}`);
  return { me, clock };
}

/** Dopisuje gracza do bieżącej grupy jego ligi; zwraca klucz grupy. */
function joinGroup(nk: nkruntime.Nakama, week: string, tier: number, userId: string, name: string): string {
  const ik = `${week}:${tier}`;
  const idx = updateObject<Idx>(nk, 'league_idx', ik, SYSTEM_USER, cur => {
    const c = cur ?? { n: 0, fill: 0 };
    return c.fill >= LEAGUE.GROUP ? { n: c.n + 1, fill: 1 } : { n: c.n, fill: c.fill + 1 };
  }, perm)!;
  const key = `${ik}:${idx.n}`;
  updateObject<Group>(nk, 'league_grp', key, SYSTEM_USER, cur => {
    const g: Group = cur ?? { key, week, tier, members: {}, order: [] };
    if (g.members[userId]) return null;
    g.members[userId] = { n: name, pts: 0, w: 0, l: 0 };
    g.order.push(userId);
    return g;
  }, perm);
  return key;
}

export interface LeagueBrief { tier: number; rank: number; pts: number; tokens: number }

function rowsOf(nk: nkruntime.Nakama, me: LeagueMe, clock: WarClock, now: number) {
  const grp = me.g ? readGroup(nk, me.g) : null;
  return grp ? standings(grp.key, grp.tier, grp.members, grp.order, weekFrac(clock.day, now)) : null;
}

function briefOf(nk: nkruntime.Nakama, userId: string, me: LeagueMe, clock: WarClock, now: number): LeagueBrief {
  const rows = rowsOf(nk, me, clock, now);
  const i = rows ? rows.findIndex(r => r.id === userId) : -1;
  return { tier: me.tier, rank: i + 1, pts: i >= 0 ? rows![i].pts : 0, tokens: walletGet(nk, userId, TOKENS) };
}

/** Skrót ligi do odpowiedzi areny. */
export function leagueBrief(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string): LeagueBrief {
  const now = Date.now();
  const { me, clock } = settle(nk, ctx, userId, now);
  return briefOf(nk, userId, me, clock, now);
}

/** Po walce na arenie: punkty ligowe i Żetony. */
export function leagueOnFight(
  nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, name: string, win: boolean, myPower: number, oppPower: number,
): { lp: number; tk: number; league: LeagueBrief } {
  const now = Date.now();
  const { me, clock } = settle(nk, ctx, userId, now);
  if (!me.g) {
    const g = joinGroup(nk, clock.week, me.tier, userId, name);
    const upd = updateObject<LeagueMe>(nk, 'league', 'me', userId, cur => (cur && cur.week === clock.week && !cur.g ? { ...cur, g, best: Math.max(cur.best, cur.tier) } : null), perm);
    if (upd) Object.assign(me, upd);
  }
  const lp = leaguePts(win, myPower, oppPower);
  if (me.g) {
    updateObject<Group>(nk, 'league_grp', me.g, SYSTEM_USER, cur => {
      const m = cur?.members[userId];
      if (!cur || !m) return null;
      m.pts += lp;
      if (win) m.w++; else m.l++;
      m.n = name;
      return cur;
    }, perm);
  }
  const tk = fightTokens(win);
  walletAdd(nk, userId, TOKENS, tk, 'arena: walka');
  return { lp, tk, league: briefOf(nk, userId, me, clock, now) };
}

function readShopDay(nk: nkruntime.Nakama, userId: string, now: number): ShopDay {
  const o = nk.storageRead([{ collection: 'league', key: 'shop', userId }]);
  const v = o.length ? (o[0].value as unknown as ShopDay) : null;
  const day = serverDay(now);
  return v && v.day === day ? v : { day, n: {} };
}

function view(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, now: number, extra: Record<string, unknown> = {}) {
  const { me, clock } = settle(nk, ctx, userId, now);
  const rows = rowsOf(nk, me, clock, now);
  const se = seasonOfWeek(clock.week);
  // Czas według zegara ligi (w trybie testowym tydzień może być przestawiony) — gra dostaje „za ile” liczone od teraz.
  const vnow = weekStart(clock.week) + clock.day * DAY_MS + (now % DAY_MS);
  return {
    tier: me.tier, week: clock.week, ends: now + weekStart(clock.week) + 7 * DAY_MS - vnow,
    rows: rows ? rows.map(r => ({ n: r.n, pts: r.pts, ghost: r.ghost, me: r.id === userId })) : null,
    rank: rows ? rows.findIndex(r => r.id === userId) + 1 : 0,
    season: { n: se.n, name: se.name, end: now + se.end - vnow, best: me.best, gems: me.best >= 0 ? LEAGUE_SEASON_GEMS[me.best] ?? 0 : 0 },
    last: me.last ?? null, lastSeason: me.lastSeason ?? null,
    tokens: walletGet(nk, userId, TOKENS), gems: walletGems(nk, userId), shop: readShopDay(nk, userId, now).n,
    serverTime: now, ...extra,
  };
}

/** Liga: tabela grupy tygodnia, sezon, wynik zeszłego tygodnia, Żetony i limity sklepu areny. */
export function rpcArenaLeague(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  return JSON.stringify(view(nk, ctx, userOf(ctx), Date.now()));
}

/** Zakup w sklepie areny za Żetony (dzienny limit). Bilet dodaje walkę na arenie; reszta idzie do kolejki nagród. */
export function rpcArenaShopBuy(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const id = String(parse(payload).id || '') as ArenaShopId;
  const it = ARENA_SHOP[id];
  if (!it) throw err('Nie ma takiego towaru.', INVALID);
  const now = Date.now();
  const save = readSave(nk, userId);
  if (!save) throw err('Najpierw zapisz grę.', PRECONDITION);
  const block = arenaShopBlock(save.value.state, readShopDay(nk, userId, now).n, id, walletGet(nk, userId, TOKENS));
  if (block) throw err(`Nie da się kupić: ${block}.`, PRECONDITION);
  walletSpend(nk, userId, TOKENS, it.cost, `sklep areny: ${id}`, 'Za mało Żetonów Areny.');
  try {
    const day = serverDay(now);
    updateObject<ShopDay>(nk, 'league', 'shop', userId, cur => {
      const sh: ShopDay = cur && cur.day === day ? { day, n: { ...cur.n } } : { day, n: {} };
      if ((sh.n[id] ?? 0) >= it.day) throw err('Na dziś wyprzedane.', PRECONDITION);
      sh.n[id] = (sh.n[id] ?? 0) + 1;
      return sh;
    }, perm);
  } catch (e) {
    walletAdd(nk, userId, TOKENS, it.cost, `zwrot: ${id}`);
    throw e;
  }
  let left: number | undefined;
  if (id === 'bilet') left = addArenaFight(nk, userId, now);
  else giveReward(nk, userId, `Sklep areny: ${it.n}`, arenaShopReward(id));
  return JSON.stringify(view(nk, ctx, userId, now, { rewards: readPending(nk, userId), left }));
}
