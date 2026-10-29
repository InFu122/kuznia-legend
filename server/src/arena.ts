// Arena: walki z kopiami bohaterów innych graczy. Serwer trzyma kopię bohatera z ostatniego zapisu
// (tylko z uznanych przedmiotów), sam rozgrywa pojedynek i zmienia ocenę obu stron.
import { B, FAKE_PLAYERS, LANDS } from '../../src/data';
import { duel, eloDelta, fighterStats, scaleFighter, type Fighter } from '../../src/engine/duel';
import { goldWave } from '../../src/engine/formulas';
import { allMods } from '../../src/engine/mods';
import { shuffle } from '../../src/engine/rng';
import { computeStats, extraOf } from '../../src/engine/stats';
import type { GameState } from '../../src/engine/types';
import { INVALID, NOT_FOUND, PRECONDITION, err, parse, readSave, serverDay, serverRng, userOf } from './common';
import { leagueBrief, leagueOnFight } from './league';
import { boardMeta, ownRecord } from './ranking';
import { cleanName } from './validate';

const HERO = { collection: 'arena', key: 'hero' };
const ME = { collection: 'arena', key: 'me' };
const START_RATING = 1000;
const OPPONENTS = 3;
/** Kod powiadomienia: ktoś zaatakował twojego bohatera. */
export const NOTE_DEFENSE = 101;

/** Wygląd bohatera na arenie: rodzaj i ruda widocznego ekwipunku. */
export type Look = Record<string, { kind: string; ore: number }>;
export interface Hero { f: Fighter; power: number; land: string; t: number; look?: Look }

const LOOK_SLOTS = ['bron', 'helm', 'zbroja', 'rekawice', 'buty', 'pas', 'amulet'];
function lookOf(eq: GameState['eq']): Look {
  const o: Look = {};
  for (const k of LOOK_SLOTS) {
    const it = (eq as Record<string, { kind?: unknown; ore?: unknown } | null | undefined>)[k];
    if (it && typeof it.kind === 'string') o[k] = { kind: it.kind.slice(0, 24), ore: Math.max(0, Math.min(6, Math.floor(Number(it.ore)) || 0)) };
  }
  return o;
}
interface Opp { id: string; name: string; rating: number; power: number; land: string; ghost: boolean; k?: number }
interface ArenaMe { day: string; left: number; wins: number; losses: number; opp: Opp[]; extra?: number }

const arenaOpen = (s: GameState) => s.maxLand >= B.ARENA_UNLOCK_LAND;

/** Po każdym zapisie: aktualna kopia bohatera i miejsce w rankingu areny. */
export function updateArenaHero(
  nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, username: string, s: GameState, eq: GameState['eq'], power: number,
): void {
  if (!arenaOpen(s)) return;
  const st = computeStats(eq, allMods(s), extraOf(s));
  const name = cleanName(s.name);
  const hero: Hero = { f: { name, st: fighterStats(st), skills: extraOf(s).skills ?? [] }, power, land: LANDS[s.maxLand].n, t: Date.now(), look: lookOf(eq) };
  try {
    nk.storageWrite([{ ...HERO, userId, value: hero as unknown as { [k: string]: unknown }, permissionRead: 0, permissionWrite: 0 }]);
    const rec = ownRecord(nk, 'arena', userId);
    const meta = boardMeta(s, power);
    if (!rec) nk.leaderboardRecordWrite('arena', userId, username, START_RATING, 0, meta);
    else if (!rec.metadata || rec.metadata.power !== power || rec.metadata.name !== meta.name) {
      nk.leaderboardRecordWrite('arena', userId, username, rec.score, rec.subscore, meta);
    }
  } catch (e) {
    logger.warn('Arena: nie zapisano bohatera %s: %s', userId, String(e));
  }
}

export function readHero(nk: nkruntime.Nakama, userId: string): Hero | null {
  const o = nk.storageRead([{ ...HERO, userId }]);
  return o.length ? (o[0].value as Hero) : null;
}

/** Bohaterowie areny wielu graczy naraz (wojna klanów: obrońcy). */
export function readHeroes(nk: nkruntime.Nakama, ids: string[]): Record<string, Hero> {
  const out: Record<string, Hero> = {};
  if (!ids.length) return out;
  for (const o of nk.storageRead(ids.map(userId => ({ ...HERO, userId })))) out[o.userId] = o.value as Hero;
  return out;
}

const rating = (nk: nkruntime.Nakama, userId: string) => ownRecord(nk, 'arena', userId)?.score ?? START_RATING;

/** Trzech przeciwników o podobnej ocenie; gdy graczy brakuje, dochodzą duchy areny (słabsza, równa i silniejsza kopia ciebie). */
function pickOpponents(nk: nkruntime.Nakama, userId: string, mine: number, me: Hero): Opp[] {
  const rng = serverRng(nk);
  const top = nk.leaderboardRecordsList('arena', [], 100).records || [];
  const near = top.filter(r => r.ownerId !== userId).sort((a, b) => Math.abs(a.score - mine) - Math.abs(b.score - mine)).slice(0, 6);
  const opp: Opp[] = shuffle(rng, near).slice(0, OPPONENTS).map(r => ({
    id: r.ownerId, name: (r.metadata && r.metadata.name) || r.username, rating: r.score,
    power: (r.metadata && r.metadata.power) || 0, land: (r.metadata && r.metadata.land) || '', ghost: false,
  }));
  const ks = [0.85, 1, 1.15];
  const names = shuffle(rng, FAKE_PLAYERS);
  for (let i = 0; opp.length < OPPONENTS; i++) {
    const k = ks[i % ks.length];
    opp.push({ id: 'duch-' + i, name: names[i % names.length], rating: Math.round(mine + (k - 1) * 600), power: Math.round(me.power * k), land: me.land, ghost: true, k });
  }
  return opp.sort((a, b) => a.power - b.power);
}

function loadMe(nk: nkruntime.Nakama, userId: string, now: number): { me: ArenaMe; version: string } {
  const o = nk.storageRead([{ ...ME, userId }]);
  const me: ArenaMe = o.length ? (o[0].value as ArenaMe) : { day: '', left: B.ARENA_FIGHTS, wins: 0, losses: 0, opp: [] };
  const day = serverDay(now);
  if (me.day !== day) { me.day = day; me.left = B.ARENA_FIGHTS; me.extra = 0; }
  return { me, version: o.length ? o[0].version : '*' };
}

/** Dodatkowa walka na dziś (bilet ze sklepu areny, reklama). Zwraca liczbę walk do stoczenia. */
export function addArenaFight(nk: nkruntime.Nakama, userId: string, now: number): number {
  for (let i = 0; i < 5; i++) {
    const { me, version } = loadMe(nk, userId, now);
    me.left++;
    me.extra = (me.extra ?? 0) + 1;
    try { saveMe(nk, userId, me, version); return me.left; } catch { /* konflikt wersji — jeszcze raz */ }
  }
  throw err('Serwer jest zajęty, spróbuj za chwilę.', PRECONDITION);
}

function saveMe(nk: nkruntime.Nakama, userId: string, me: ArenaMe, version: string): void {
  try {
    nk.storageWrite([{ ...ME, userId, value: me as unknown as { [k: string]: unknown }, version, permissionRead: 1, permissionWrite: 0 }]);
  } catch {
    throw err('Arena: dane zmieniły się w międzyczasie, odśwież.', PRECONDITION);
  }
}

/** Ostatnie obrony: kto zaatakował twojego bohatera. Starsze wieści serwer usuwa. */
function defenseLog(nk: nkruntime.Nakama, userId: string) {
  const list = nk.notificationsList(userId, 100).notifications || [];
  const mine = list.filter(n => n.code === NOTE_DEFENSE).sort((a, b) => Number(b.createTime) - Number(a.createTime));
  const old = mine.slice(10).map(n => n.id).filter((x): x is string => !!x);
  if (old.length) nk.notificationsDeleteId(old, userId);
  return mine.slice(0, 10).map(n => {
    const c = (typeof n.content === 'string' ? JSON.parse(n.content) : n.content) as { who: string; won: boolean; d: number };
    return { who: c.who, won: c.won, d: c.d, t: Number(n.createTime) * 1000 };
  });
}

function view(nk: nkruntime.Nakama, userId: string, me: ArenaMe, hero: Hero) {
  const rec = ownRecord(nk, 'arena', userId);
  return {
    rating: rec ? rec.score : START_RATING, rank: rec ? rec.rank : 0, left: me.left, max: B.ARENA_FIGHTS + (me.extra ?? 0),
    wins: me.wins, losses: me.losses, power: hero.power, opp: me.opp, log: defenseLog(nk, userId), serverTime: Date.now(),
  };
}

function myHero(nk: nkruntime.Nakama, userId: string): Hero {
  const hero = readHero(nk, userId);
  if (!hero) throw err(`Arena otwiera się po pokonaniu bossa ${LANDS[0].n} i zapisie gry.`, PRECONDITION);
  return hero;
}

/** Stan areny: ocena, walki na dziś, przeciwnicy i dziennik obrony. `refresh` losuje nowych przeciwników. */
export function rpcArenaList(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const now = Date.now();
  const hero = myHero(nk, userId);
  const { me, version } = loadMe(nk, userId, now);
  if (!me.opp.length || req.refresh === true) me.opp = pickOpponents(nk, userId, rating(nk, userId), hero);
  saveMe(nk, userId, me, version);
  return JSON.stringify({ ...view(nk, userId, me, hero), league: leagueBrief(nk, ctx, userId) });
}

/** Walka z przeciwnikiem numer `i` z listy. Wynik, zmiana oceny i nagroda liczy serwer. */
export function rpcArenaFight(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const now = Date.now();
  const hero = myHero(nk, userId);
  const { me, version } = loadMe(nk, userId, now);
  if (me.left <= 0) throw err('Na dziś koniec walk na arenie — wróć jutro.', PRECONDITION);
  const i = Math.floor(Number(req.i));
  const opp = me.opp[i];
  if (!opp || (typeof req.id === 'string' && req.id !== opp.id)) throw err('Nie ma takiego przeciwnika — odśwież listę.', INVALID);

  let foe: Fighter;
  let foeLook: Look | undefined = hero.look;
  if (opp.ghost) foe = scaleFighter(hero.f, opp.k ?? 1, opp.name);
  else {
    const h = readHero(nk, opp.id);
    if (!h) throw err('Przeciwnik zniknął z areny — odśwież listę.', NOT_FOUND);
    foe = h.f;
    foeLook = h.look;
  }
  const rng = serverRng(nk);
  const res = duel(hero.f, foe, Math.floor(rng.next() * 0xffffffff));

  const myRec = ownRecord(nk, 'arena', userId);
  const mine = myRec ? myRec.score : START_RATING;
  const theirs = opp.ghost ? opp.rating : rating(nk, opp.id);
  const d = eloDelta(mine, theirs, res.win);
  const next = Math.max(0, mine + d);
  if (res.win) me.wins++; else me.losses++;
  const save = readSave(nk, userId);
  const meta = save ? boardMeta(save.value.state, hero.power) : { name: hero.f.name, land: hero.land, power: hero.power };
  nk.leaderboardRecordWrite('arena', userId, ctx.username ?? '', next, me.wins, meta);

  if (!opp.ghost) {
    // Obrońca traci albo zyskuje połowę tego, co atakujący, i dostaje wieść o walce.
    try {
      const rec = ownRecord(nk, 'arena', opp.id);
      if (rec) {
        const dd = eloDelta(rec.score, mine, !res.win, 16);
        nk.leaderboardRecordWrite('arena', opp.id, rec.username, Math.max(0, rec.score + dd), rec.subscore, rec.metadata);
        nk.notificationsSend([{ userId: opp.id, subject: 'Arena', code: NOTE_DEFENSE, persistent: true, senderId: userId, content: { who: hero.f.name, won: !res.win, d: dd } }]);
      }
    } catch (e) {
      logger.warn('Arena: nie zmieniono oceny obrońcy %s: %s', opp.id, String(e));
    }
  }

  // Nagroda w złocie: jak za kilkadziesiąt fal na najdalszym etapie kampanii.
  const bestG = save ? save.value.state.bestG : 0;
  const gold = goldWave(bestG) * (res.win ? 30 : 8);
  me.left--;
  me.opp = pickOpponents(nk, userId, next, hero);
  saveMe(nk, userId, me, version);
  // Liga: punkty i Żetony (walka już się odbyła — błąd ligi nie cofa walki).
  let lg: ReturnType<typeof leagueOnFight> | null = null;
  try {
    lg = leagueOnFight(nk, ctx, userId, hero.f.name, res.win, hero.power, opp.power);
  } catch (e) {
    logger.warn('Arena: liga nie przyjęła walki %s: %s', userId, String(e));
  }
  return JSON.stringify({
    lp: lg ? lg.lp : 0, tk: lg ? lg.tk : 0, league: lg ? lg.league : null,
    win: res.win, ms: res.ms, frames: res.frames, crits: res.crits, skills: res.skills,
    me: { name: hero.f.name, power: hero.power, look: hero.look ?? {} }, foe: { name: opp.name, power: opp.power, ghost: opp.ghost, look: foeLook ?? {} },
    d, gold, ...view(nk, userId, me, hero),
  });
}

/** Usuwa gracza z areny (np. po przeniesieniu konta na inne urządzenie). */
export function leaveArena(nk: nkruntime.Nakama, userId: string): void {
  nk.storageDelete([{ ...HERO, userId }]);
}
