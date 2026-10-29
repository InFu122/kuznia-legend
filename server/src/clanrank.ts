// Ranking klanów (Moc klanu) i sezony wojen.
//
// klany_moc — suma Mocy członków (ownerem rekordu jest klan); aktualizuje ją clan_sync, usuwa rozwiązanie klanu.
// klany_s{N} — Puchary klanów w sezonie N (28 dni, jak Przepustka Kowala i ligi areny); dopisuje je rozliczenie
// każdej wojny (war.ts → finalize). Ranking sezonu tworzy się przy pierwszej wojnie sezonu.
// Każdy, kto zdobył punkty w wojnie sezonu, dostaje po jego końcu nagrodę według miejsca klanu, za który walczył
// (clan_season/me — sezony z klanem i odebrane nagrody; rozliczenie leniwie przy clan_sync i war_state).
import { CLAN_SEASON_REWARDS } from '../../src/data';
import { clanSeasonReward, warTrophies, type WarResult } from '../../src/engine/clan';
import { seasonOfWeek, weekStart } from '../../src/engine/league';
import { clanOf } from './clan';
import { clanPower } from './clanlife';
import { parse, updateObject, userOf } from './common';
import { giveReward } from './shop';
import { warClock } from './war';

const DAY_MS = 86400000;
export const POWER_BOARD = 'klany_moc';
const seasonBoard = (n: number) => 'klany_s' + n;
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };

interface ClanMeta { n: string; tag: string; m: number; lvl: number }
interface SeasonMe { s: Record<string, { g: string; n: string }>; got: number[] }

const tagOf = (g: nkruntime.Group) => ((g.metadata || {}) as { tag?: string }).tag || '';

export function createClanBoards(nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
  try {
    nk.leaderboardCreate(POWER_BOARD, true, 'descending' as nkruntime.SortOrder, 'set' as nkruntime.Operator, null, { title: 'Moc klanów' }, true);
  } catch (e) {
    logger.warn('Ranking klanów: %s', String(e));
  }
}

function ensureSeasonBoard(nk: nkruntime.Nakama, n: number): void {
  try {
    nk.leaderboardCreate(seasonBoard(n), true, 'descending' as nkruntime.SortOrder, 'incr' as nkruntime.Operator, null, { title: `Sezon wojen ${n}` }, true);
  } catch { /* już istnieje */ }
}

function ownClanRecord(nk: nkruntime.Nakama, board: string, gid: string): nkruntime.LeaderboardRecord | null {
  try {
    const r = nk.leaderboardRecordsList(board, [gid], 1);
    return r.ownerRecords && r.ownerRecords.length ? r.ownerRecords[0] : null;
  } catch {
    return null; // ranking sezonu jeszcze nie powstał
  }
}

/** Moc klanu w rankingu (po clan_sync członka). Zapisuje tylko zmianę. */
export function updateClanPower(nk: nkruntime.Nakama, g: nkruntime.Group, ids: string[], lvl: number): void {
  const power = clanPower(nk, ids);
  const meta: ClanMeta = { n: g.name, tag: tagOf(g), m: ids.length, lvl };
  const rec = ownClanRecord(nk, POWER_BOARD, g.id);
  const old = (rec?.metadata || {}) as Partial<ClanMeta>;
  if (rec && rec.score === power && old.n === meta.n && old.tag === meta.tag && old.m === meta.m && old.lvl === meta.lvl) return;
  if (power <= 0) return;
  nk.leaderboardRecordWrite(POWER_BOARD, g.id, '', power, ids.length, meta as unknown as { [k: string]: unknown });
}

/** Rozwiązany klan znika z rankingu Mocy (Puchary sezonu zostają w historii). */
export function dropClanPower(nk: nkruntime.Nakama, gid: string): void {
  try { nk.leaderboardRecordDelete(POWER_BOARD, gid); } catch { /* nie było rekordu */ }
}

/** Po rozliczeniu wojny: Puchary dla klanu i zapis udziału w sezonie dla każdego, kto zdobył punkty. */
export function warSeasonResult(nk: nkruntime.Nakama, week: string, gid: string, n: string, tag: string, result: WarResult, pts: number, players: string[]): void {
  const t = warTrophies(result, pts);
  if (!t) return;
  const season = seasonOfWeek(week).n;
  ensureSeasonBoard(nk, season);
  const g = nk.groupsGetId([gid])[0];
  const members = g ? g.edgeCount : 0;
  nk.leaderboardRecordWrite(seasonBoard(season), gid, '', t, result === 'win' ? 1 : 0, { n, tag, m: members } as unknown as { [k: string]: unknown });
  for (const u of players) {
    try {
      updateObject<SeasonMe>(nk, 'clan_season', 'me', u, cur => {
        const me: SeasonMe = cur ? { s: { ...cur.s }, got: cur.got.slice() } : { s: {}, got: [] };
        if (me.got.includes(season)) return null;
        if (me.s[season]?.g === gid) return null;
        me.s[season] = { g: gid, n };
        return me;
      }, perm);
    } catch { /* następna osoba */ }
  }
}

/** Nagrody za zakończone sezony wojen, w których gracz zdobywał punkty. */
export function clanSeasonSettle(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, now: number): void {
  const o = nk.storageRead([{ collection: 'clan_season', key: 'me', userId }]);
  if (!o.length) return;
  const sNow = seasonOfWeek(warClock(nk, ctx, now).week).n;
  const due = Object.keys((o[0].value as unknown as SeasonMe).s).map(Number).filter(n => n < sNow && !(o[0].value as unknown as SeasonMe).got.includes(n));
  if (!due.length) return;
  let pay: { why: string; gems: number; coins: number; rank: number }[] = [];
  updateObject<SeasonMe>(nk, 'clan_season', 'me', userId, cur => {
    pay = [];
    if (!cur) return null;
    const me: SeasonMe = { s: { ...cur.s }, got: cur.got.slice() };
    for (const k of Object.keys(me.s)) {
      const n = Number(k);
      if (n >= sNow || me.got.includes(n)) continue;
      const rec = ownClanRecord(nk, seasonBoard(n), me.s[k].g);
      const rw = rec ? clanSeasonReward(rec.rank) : null;
      if (rec && rw) pay.push({ why: `Sezon wojen ${n}: klan ${me.s[k].n} na ${rec.rank}. miejscu (+${rw.gems} Klejnotów)`, ...rw, rank: rec.rank });
      me.got.push(n);
      delete me.s[k];
    }
    me.got = me.got.filter(n => n >= sNow - 3);
    return me;
  }, perm);
  for (const p of pay) giveReward(nk, userId, p.why, { gems: p.gems, coins: p.coins, frames: p.rank <= 3 ? ['puchar'] : undefined });
}

/** Skrót sezonu wojen klanu (do war_state). */
export function warSeason(nk: nkruntime.Nakama, ctx: nkruntime.Context, gid: string, now: number) {
  const clock = warClock(nk, ctx, now);
  const se = seasonOfWeek(clock.week);
  const vnow = weekStart(clock.week) + clock.day * DAY_MS + (now % DAY_MS);
  const rec = ownClanRecord(nk, seasonBoard(se.n), gid);
  return { n: se.n, name: se.name, end: now + se.end - vnow, trophies: rec ? rec.score : 0, wins: rec ? rec.subscore : 0, rank: rec ? rec.rank : 0 };
}

/** Ranking klanów: `moc` (Moc klanów) albo `sezon` (Puchary w bieżącym sezonie wojen). */
export function rpcClanRanking(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const kind = req.board === 'sezon' ? 'sezon' : 'moc';
  const now = Date.now();
  const mine = clanOf(nk, userId);
  const gid = mine ? mine.g.id : '';
  const season = warSeason(nk, ctx, gid || '00000000-0000-0000-0000-000000000000', now);
  const board = kind === 'moc' ? POWER_BOARD : seasonBoard(season.n);
  let top: nkruntime.LeaderboardRecord[] = [];
  try { top = nk.leaderboardRecordsList(board, [], 30).records || []; } catch { top = []; }
  const row = (r: nkruntime.LeaderboardRecord) => {
    const m = (r.metadata || {}) as Partial<ClanMeta>;
    return { rank: r.rank, n: m.n || 'Klan', tag: m.tag || '', score: r.score, sub: r.subscore, m: m.m || 0, me: r.ownerId === gid };
  };
  const own = gid ? ownClanRecord(nk, board, gid) : null;
  return JSON.stringify({
    board: kind, records: top.map(row), mine: own ? row(own) : null, clan: mine ? { n: mine.g.name, tag: tagOf(mine.g) } : null,
    season: { ...season, rewards: CLAN_SEASON_REWARDS }, serverTime: now,
  });
}
