// Wojna klanów — co tydzień, według zegara serwera (UTC).
//   Poniedziałek: dobór przeciwnika o podobnej sile (gdy brak — klan-widmo, który zdobywa punkty sam).
//   Wtorek–piątek: punkty za aktywność dnia (kucie, walka w krainach, lochy, boss klanowy), najwyżej 300 dziennie od osoby.
//   Sobota: każdy ma 3 ataki na obrońców wrogiego klanu (pojedynek bohaterów jak na arenie).
//   Niedziela: wynik i skrzynie dla wszystkich, którzy zdobyli punkty, oraz Doświadczenie klanu.
//
// Punkty dni aktywności liczy zapis gry (save_put): różnica liczników od pierwszego zapisu danego dnia.
// Dzięki temu wliczają się też nagrody za nieobecność i wytopy seryjne, a gra nie wysyła osobnych zgłoszeń.
//
// Magazyn (SYSTEM): war_pool/{tydzień} — klany czekające na przeciwnika i pary,
//                   war_clan/{tydzień}:{klan} — skład, punkty, ataki i wynik klanu.
// Magazyn gracza:   war/me — punkty dnia i liczniki z początku dnia.
import { GHOST_CLANS, GHOST_NAMES, WAR, WAR_DAYS, type WarDayKind } from '../../src/data';
import { frameOr, skinOr } from '../../src/engine/cosmetics';
import { duel, scaleFighter } from '../../src/engine/duel';
import { warChest, type WarResult } from '../../src/engine/clan';
import { shuffle } from '../../src/engine/rng';
import type { GameState } from '../../src/engine/types';
import { readHero, readHeroes } from './arena';
import { clanOf, postClan } from './clan';
import { addClanXp, clanPower, pushRewards, readPending } from './clanlife';
import { INVALID, PRECONDITION, SYSTEM_USER, UNAUTH, err, goldStage, parse, serverRng, testSpeed, updateObject, userOf } from './common';
import { clanSeasonSettle, warSeason, warSeasonResult } from './clanrank';
import { nameOf } from './names';

const DAY_MS = 86400000;
const POOL = 'war_pool';
const WAR_C = 'war_clan';
const LOG_MAX = 30;
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };

export interface WarClock { week: string; day: number; ends: number; test: boolean }

/** Tydzień i dzień wojny (poniedziałek = 0). W trybie testowym (TEST_SPEED > 1) administrator może je przestawić. */
export function warClock(nk: nkruntime.Nakama, ctx: nkruntime.Context, now: number): WarClock {
  const dn = Math.floor(now / DAY_MS);
  const clock: WarClock = { week: 'w' + Math.floor((dn + 3) / 7), day: (dn + 3) % 7, ends: (dn + 1) * DAY_MS, test: false };
  if (testSpeed(ctx) > 1) {
    const o = nk.storageRead([{ collection: 'war_test', key: 'clock', userId: SYSTEM_USER }]);
    if (o.length) {
      const v = o[0].value as { w?: unknown; d?: unknown };
      if (typeof v.w === 'string' && /^w\d+$/.test(v.w)) clock.week = v.w;
      if (typeof v.d === 'number' && v.d >= 0 && v.d <= 6) clock.day = Math.floor(v.d);
      clock.test = true;
    }
  }
  return clock;
}
const prevWeek = (w: string) => 'w' + (Number(w.slice(1)) - 1);

interface Def { id: string; n: string; power: number }
interface Ghost { n: string; tag: string; power: number; active: number; f: number[]; def: Def[] }
interface WarLog { t: number; a: string; d: string; w: boolean; p: number }
interface WarClan {
  week: string; g: string; n: string; tag: string; power: number; active: number;
  opp: string | null;              // id klanu-przeciwnika, 'ghost' (klan-widmo) albo null (czeka na dobór)
  ghost: Ghost | null;
  roster: Record<string, string>;  // skład wojny: id gracza → nick
  pts: Record<string, number>;
  days: number[];                  // punkty klanu w kolejnych dniach tygodnia
  atk: Record<string, number>;     // zużyte ataki w sobotę
  beaten: Record<string, number>;  // obrońcy wroga pokonani przez klan (pierwsza wygrana daje premię)
  log: WarLog[];
  done: boolean;
  res?: { r: WarResult; us: number; them: number; vs: string };
  t: number;
}
interface Pool { wait: { g: string; power: number; t: number }[]; pairs: Record<string, string> }
interface Base { sx: number; k: number; keys: number; tw: number }
interface WarMe { week: string; g: string; d: number; base: Base; dp: number; out: boolean; fin?: string }

const keyOf = (week: string, g: string) => week + ':' + g;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const tagOf = (g: nkruntime.Group) => ((g.metadata || {}) as { tag?: string }).tag || '';

function readWar(nk: nkruntime.Nakama, week: string, g: string): WarClan | null {
  const o = nk.storageRead([{ collection: WAR_C, key: keyOf(week, g), userId: SYSTEM_USER }]);
  return o.length ? (o[0].value as unknown as WarClan) : null;
}
function readMe(nk: nkruntime.Nakama, userId: string): WarMe | null {
  const o = nk.storageRead([{ collection: 'war', key: 'me', userId }]);
  return o.length ? (o[0].value as unknown as WarMe) : null;
}
function writeMe(nk: nkruntime.Nakama, userId: string, me: WarMe): void {
  nk.storageWrite([{ collection: 'war', key: 'me', userId, value: me as unknown as { [k: string]: unknown }, permissionRead: 0, permissionWrite: 0 }]);
}

/** Obecni członkowie klanu: id → nick. */
function rosterOf(nk: nkruntime.Nakama, groupId: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const u of nk.groupUsersList(groupId, 100).groupUsers || []) {
    if (u.user && typeof u.state === 'number' && u.state <= 2) out[u.user.userId] = u.user.displayName || u.user.username || 'Kowal';
  }
  return out;
}

/** Ilu członków grało w ostatnich 3 dniach (od tego zależy siła klanu-widma). */
function activeCount(nk: nkruntime.Nakama, ids: string[], now: number): number {
  if (!ids.length) return 1;
  let n = 0;
  for (const o of nk.storageRead(ids.map(userId => ({ collection: 'save', key: 'state', userId })))) {
    if (now - (Number((o.value as { savedAt?: number }).savedAt) || 0) < 3 * DAY_MS) n++;
  }
  return Math.max(1, n);
}

/* ---------- klan-widmo ---------- */

function makeGhost(nk: nkruntime.Nakama, rec: WarClan): Ghost {
  const rng = serverRng(nk);
  const c = GHOST_CLANS[Math.floor(rng.next() * GHOST_CLANS.length)];
  const size = Math.max(1, Object.keys(rec.roster).length);
  const avg = Math.max(1, rec.power / size);
  const names = shuffle(rng, GHOST_NAMES.slice());
  const nDef = Math.max(3, Math.min(10, rec.active + 1));
  const def: Def[] = [];
  for (let i = 0; i < nDef; i++) def.push({ id: 'cien-' + i, n: names[i % names.length], power: Math.max(1, Math.round(avg * (0.7 + 0.55 * rng.next()))) });
  def.sort((a, b) => b.power - a.power);
  const f: number[] = [];
  for (let d = 0; d < 7; d++) f.push(0.75 + 0.4 * rng.next());
  return { n: c.n, tag: c.tag, power: Math.round(rec.power * (0.9 + 0.2 * rng.next())), active: rec.active, f, def };
}

/** Punkty klanu-widma za cały dzień `d`. */
function ghostDay(gh: Ghost, d: number): number {
  if (d >= 1 && d <= 4) return Math.round(WAR.GHOST_PER_MEMBER * gh.active * gh.f[d]);
  if (d === 5) return Math.round(gh.active * WAR.ATTACKS * WAR.WIN_PTS * 0.55 * gh.f[d]);
  return 0;
}

/** Punkty klanu-widma dzień po dniu; bieżący dzień rośnie z upływem czasu. */
function ghostDays(gh: Ghost, clock: WarClock | null, now: number): number[] {
  const out: number[] = [];
  const frac = clock ? Math.max(0, Math.min(1, (now - (clock.ends - DAY_MS)) / DAY_MS)) : 1;
  for (let d = 0; d < 7; d++) {
    const full = ghostDay(gh, d);
    out.push(!clock || d < clock.day ? full : d === clock.day ? Math.round(full * frac) : 0);
  }
  return out;
}

/* ---------- dobór przeciwnika ---------- */

/** Para dla klanu: id przeciwnika, 'ghost' albo null (czeka do końca poniedziałku na klan o podobnej sile). */
function matchClan(nk: nkruntime.Nakama, clock: WarClock, g: string, power: number): string | null {
  let opp: string | null = null;
  updateObject<Pool>(nk, POOL, clock.week, SYSTEM_USER, cur => {
    const p: Pool = cur ? { wait: cur.wait.slice(), pairs: { ...cur.pairs } } : { wait: [], pairs: {} };
    opp = null;
    if (p.pairs[g]) { opp = p.pairs[g]; return null; }
    let best: Pool['wait'][number] | null = null;
    let bestD = Infinity;
    for (const w of p.wait) {
      if (w.g === g) continue;
      const r = Math.max(1, w.power) / Math.max(1, power);
      if (r < 1 / 3 || r > 3) continue;
      const dd = Math.abs(Math.log(r));
      if (dd < bestD) { bestD = dd; best = w; }
    }
    const waiting = p.wait.some(w => w.g === g);
    if (best) {
      const b = best;
      p.wait = p.wait.filter(w => w.g !== g && w.g !== b.g);
      p.pairs[g] = b.g;
      p.pairs[b.g] = g;
      opp = b.g;
      return p;
    }
    if (clock.day === 0) {
      if (waiting) return null;
      p.wait.push({ g, power, t: Date.now() });
      return p;
    }
    p.wait = p.wait.filter(w => w.g !== g);
    p.pairs[g] = 'ghost';
    opp = 'ghost';
    return p;
  }, perm);
  return opp;
}

function resolveOpp(nk: nkruntime.Nakama, clock: WarClock, rec: WarClan): WarClan {
  const opp = matchClan(nk, clock, rec.g, rec.power);
  if (opp === null) return rec;
  const ghost = opp === 'ghost' ? makeGhost(nk, rec) : null;
  const out = updateObject<WarClan>(nk, WAR_C, keyOf(rec.week, rec.g), SYSTEM_USER,
    cur => (cur && cur.opp === null ? { ...cur, opp, ghost } : null), perm) as WarClan;
  if (opp !== 'ghost') {
    // Drugi klan czekał na przeciwnika — dostaje nas.
    updateObject<WarClan>(nk, WAR_C, keyOf(rec.week, opp), SYSTEM_USER, cur => (cur && cur.opp === null ? { ...cur, opp: rec.g } : null), perm);
    postClan(nk, rec.g, { k: 'sys', t: `Wojna klanów: przeciwnik w tym tygodniu to ${readWar(nk, rec.week, opp)?.n || 'klan o podobnej sile'}.` });
  }
  return out;
}

/** Wojna klanu w tym tygodniu (powstaje przy pierwszym kontakcie członka). */
function ensureWar(nk: nkruntime.Nakama, clock: WarClock, g: nkruntime.Group, now: number): WarClan {
  let rec = readWar(nk, clock.week, g.id);
  if (!rec) {
    const roster = rosterOf(nk, g.id);
    const ids = Object.keys(roster);
    const fresh: WarClan = {
      week: clock.week, g: g.id, n: g.name, tag: tagOf(g), power: clanPower(nk, ids), active: activeCount(nk, ids, now),
      opp: null, ghost: null, roster, pts: {}, days: [0, 0, 0, 0, 0, 0, 0], atk: {}, beaten: {}, log: [], done: false, t: now,
    };
    rec = updateObject<WarClan>(nk, WAR_C, keyOf(clock.week, g.id), SYSTEM_USER, cur => (cur ? null : fresh), perm) as WarClan;
  }
  if (rec.opp === null && !rec.done) rec = resolveOpp(nk, clock, rec);
  return rec;
}

/** Gracz w tym tygodniu: tworzy wojnę klanu, dopisuje do składu w poniedziałek, rozlicza poprzedni tydzień. */
function touchUser(nk: nkruntime.Nakama, clock: WarClock, userId: string, g: nkruntime.Group, now: number): { rec: WarClan; me: WarMe } {
  let me = readMe(nk, userId);
  let dirty = false;
  if (!me || me.week !== clock.week) {
    try { finalize(nk, prevWeek(clock.week), g.id, now); } catch { /* rozliczy następna osoba */ }
    me = { week: clock.week, g: g.id, d: -1, base: { sx: 0, k: 0, keys: 0, tw: 0 }, dp: 0, out: false };
    dirty = true;
  }
  let rec = ensureWar(nk, clock, g, now);
  let out = me.g !== g.id; // zmiana klanu w trakcie tygodnia: punkty od przyszłego tygodnia
  if (!out && !rec.roster[userId]) {
    if (clock.day === 0) {
      const n = nameOf(nk, userId) || 'Kowal';
      rec = updateObject<WarClan>(nk, WAR_C, keyOf(clock.week, g.id), SYSTEM_USER,
        cur => (cur && !cur.roster[userId] ? { ...cur, roster: { ...cur.roster, [userId]: n } } : null), perm) as WarClan;
    } else out = true;
  }
  if (out !== me.out) { me.out = out; dirty = true; }
  if (dirty) writeMe(nk, userId, me);
  return { rec, me };
}

function addPoints(nk: nkruntime.Nakama, week: string, g: string, userId: string, day: number, n: number): void {
  if (n <= 0) return;
  updateObject<WarClan>(nk, WAR_C, keyOf(week, g), SYSTEM_USER, cur => {
    if (!cur || cur.done || !cur.roster[userId]) return null;
    const days = cur.days.slice();
    days[day] += n;
    return { ...cur, days, pts: { ...cur.pts, [userId]: (cur.pts[userId] || 0) + n } };
  }, perm);
}

/* ---------- punkty dni aktywności ---------- */

const baseOf = (s: GameState): Base => ({ sx: s.sx || 0, k: s.stats.kills || 0, keys: s.stats.keys || 0, tw: s.dungeons.wieza.best || 0 });

/** Punkty dnia `kind` od początku dnia (bez limitu). */
function dayPoints(kind: WarDayKind, s: GameState, b: Base): number {
  const n = baseOf(s);
  switch (kind) {
    case 'kucie': return Math.max(0, n.sx - b.sx);
    case 'fale': return Math.max(0, Math.floor((n.k - b.k) / WAR.KILLS_PER_PT));
    case 'lochy': return Math.max(0, n.keys - b.keys) * WAR.KEY_PTS + Math.max(0, n.tw - b.tw) * WAR.TOWER_PTS;
    default: return 0;
  }
}

/** Po każdym zapisie gry: punkty wojenne za aktywność dnia. Nie przerywa zapisu przy błędzie. */
export function warOnSave(nk: nkruntime.Nakama, logger: nkruntime.Logger, ctx: nkruntime.Context, userId: string, c: { g: nkruntime.Group } | null, prev: GameState | null, s: GameState): void {
  if (!c) return;
  try {
    const now = Date.now();
    const clock = warClock(nk, ctx, now);
    const kind = WAR_DAYS[clock.day].k;
    let me = readMe(nk, userId);
    if (!me || me.week !== clock.week) me = touchUser(nk, clock, userId, c.g, now).me;
    if (me.out || me.g !== c.g.id) return;
    if (kind === 'nagrody') {
      if (me.fin === clock.week) return;
      finalize(nk, clock.week, c.g.id, now);
      me.fin = clock.week;
      writeMe(nk, userId, me);
      return;
    }
    if (kind !== 'kucie' && kind !== 'fale' && kind !== 'lochy') return;
    let dirty = false;
    if (me.d !== clock.day) {
      // Pierwszy zapis dnia: liczniki z poprzedniego zapisu są punktem wyjścia; przy okazji dobór przeciwnika.
      me.d = clock.day;
      me.base = baseOf(prev || s);
      me.dp = 0;
      dirty = true;
      ensureWar(nk, clock, c.g, now);
    }
    const n = Math.min(WAR.DAY_CAP, dayPoints(kind, s, me.base));
    if (n > me.dp) {
      addPoints(nk, clock.week, c.g.id, userId, clock.day, n - me.dp);
      me.dp = n;
      dirty = true;
    }
    if (dirty) writeMe(nk, userId, me);
  } catch (e) {
    logger.warn('Wojna klanów: punkty gracza %s: %s', userId, String(e));
  }
}

/** Atak na bossa klanowego w piątek (dzień bossa) daje punkty wojenne. */
export function warOnBossAttack(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, g: nkruntime.Group, now: number): void {
  const clock = warClock(nk, ctx, now);
  if (WAR_DAYS[clock.day].k !== 'boss') return;
  let me = readMe(nk, userId);
  if (!me || me.week !== clock.week) me = touchUser(nk, clock, userId, g, now).me;
  if (me.out || me.g !== g.id) return;
  if (me.d !== clock.day) { me.d = clock.day; me.dp = 0; }
  const add = Math.min(WAR.BOSS_PTS, WAR.DAY_CAP - me.dp);
  if (add <= 0) return;
  addPoints(nk, clock.week, g.id, userId, clock.day, add);
  me.dp += add;
  writeMe(nk, userId, me);
}

/* ---------- wynik i nagrody ---------- */

const RESULT_N: Record<WarResult, string> = { win: 'zwycięstwo', draw: 'remis', loss: 'porażka' };

/** Rozlicza wojnę klanu (raz): wynik, skrzynie dla wszystkich z punktami, Doświadczenie klanu. */
function finalize(nk: nkruntime.Nakama, week: string, gid: string, now: number): WarClan | null {
  let rec = readWar(nk, week, gid);
  if (!rec || rec.done) return rec;
  if (rec.opp === null) rec = resolveOpp(nk, { week, day: 6, ends: 0, test: false }, rec);
  const us = sum(rec.days);
  let them = 0;
  let vs = '';
  if (rec.opp === 'ghost' && rec.ghost) { them = sum(ghostDays(rec.ghost, null, now)); vs = rec.ghost.n; }
  else if (rec.opp) { const o = readWar(nk, week, rec.opp); them = o ? sum(o.days) : 0; vs = o ? o.n : 'klan'; }
  const r: WarResult = us > them ? 'win' : us === them ? 'draw' : 'loss';
  let flipped = false;
  const out = updateObject<WarClan>(nk, WAR_C, keyOf(week, gid), SYSTEM_USER, cur => {
    flipped = false;
    if (!cur || cur.done) return null;
    flipped = true;
    return { ...cur, done: true, res: { r, us, them, vs } };
  }, perm) as WarClan;
  if (!flipped || us <= 0) return out;

  const ranked = Object.entries(rec.pts).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
  const best: Record<string, number> = {};
  for (const o of nk.storageRead(ranked.map(([u]) => ({ collection: 'save', key: 'state', userId: u })))) {
    best[o.userId] = goldStage((o.value as { state?: object }).state);
  }
  ranked.forEach(([u, p], i) => {
    try {
      pushRewards(nk, u, [{ why: `Wojna klanów z klanem ${vs}: ${RESULT_N[r]}${i < 3 ? `, ${i + 1}. miejsce w klanie` : ''}`, r: warChest(r, i, p, best[u] || 0) }]);
    } catch { /* następna osoba */ }
  });
  const xp = r === 'win' ? WAR.WIN_XP : r === 'draw' ? Math.round((WAR.WIN_XP + WAR.LOSS_XP) / 2) : WAR.LOSS_XP;
  try { addClanXp(nk, gid, xp, `Wojna klanów z klanem ${vs}: ${RESULT_N[r]} ${us}:${them}`); } catch { /* klan mógł zniknąć */ }
  try { warSeasonResult(nk, week, gid, rec.n, rec.tag, r, us, ranked.map(([u]) => u)); } catch { /* Puchary nie są konieczne */ }
  const podium = ranked.slice(0, 3).map(([u], i) => `${i + 1}. ${rec?.roster[u] || 'Kowal'}`).join(', ');
  postClan(nk, gid, { k: 'sys', t: `Wojna klanów z klanem ${vs}: ${RESULT_N[r]} ${us}:${them}! Najwięcej punktów: ${podium}. Skrzynie czekają w zakładce Klan.` });
  return out;
}

/* ---------- bitwa (sobota) ---------- */

interface DefView extends Def { ghost: boolean }

/** Obrońcy wrogiego klanu: bohaterowie areny członków (bez nich — cienie o sile klanu). */
function defendersOf(nk: nkruntime.Nakama, rec: WarClan, o: WarClan | null): DefView[] {
  if (rec.opp === 'ghost' && rec.ghost) return rec.ghost.def.map(d => ({ ...d, ghost: true }));
  if (!o) return [];
  const ids = Object.keys(o.roster);
  const heroes = readHeroes(nk, ids);
  const list: DefView[] = ids.filter(u => heroes[u]).map(u => ({ id: u, n: heroes[u].f.name || o.roster[u], power: heroes[u].power, ghost: false }));
  if (!list.length) {
    const avg = Math.max(1, o.power / Math.max(1, ids.length));
    for (let i = 0; i < 3; i++) list.push({ id: 'cien-' + i, n: `Cień ${['I', 'II', 'III'][i]}`, power: Math.round(avg * (0.85 + 0.15 * i)), ghost: true });
  }
  return list.sort((a, b) => b.power - a.power).slice(0, 30);
}

/* ---------- widok ---------- */

function view(nk: nkruntime.Nakama, clock: WarClock, rec: WarClan, userId: string, me: WarMe, now: number, extra: Record<string, unknown> = {}) {
  const o = rec.opp && rec.opp !== 'ghost' ? readWar(nk, rec.week, rec.opp) : null;
  const themDays = rec.opp === 'ghost' && rec.ghost ? ghostDays(rec.ghost, rec.done ? null : clock, now) : o ? o.days : [0, 0, 0, 0, 0, 0, 0];
  const inWar = !me.out && me.g === rec.g && !!rec.roster[userId];
  const members = Object.entries(rec.roster)
    .map(([u, n]) => ({ n, pts: rec.pts[u] || 0, atk: rec.atk[u] || 0, me: u === userId }))
    .sort((a, b) => b.pts - a.pts || Number(b.me) - Number(a.me))
    .slice(0, 50);
  const def = clock.day === 5 && rec.opp ? defendersOf(nk, rec, o).map(d => ({ ...d, beaten: rec.beaten[d.id] || 0 })) : [];
  const log = rec.log.map(l => ({ ...l, us: true })).concat(o ? o.log.map(l => ({ ...l, us: false })) : [])
    .sort((a, b) => b.t - a.t).slice(0, 12);
  return {
    week: rec.week, day: clock.day, ends: clock.ends, test: clock.test,
    us: { n: rec.n, tag: rec.tag, power: rec.power, total: sum(rec.days), days: rec.days },
    them: rec.opp === null ? null : rec.opp === 'ghost' && rec.ghost
      ? { n: rec.ghost.n, tag: rec.ghost.tag, power: rec.ghost.power, total: sum(themDays), days: themDays, ghost: true }
      : { n: o ? o.n : 'Klan', tag: o ? o.tag : '', power: o ? o.power : 0, total: sum(themDays), days: themDays, ghost: false },
    me: {
      in: inWar, pts: rec.pts[userId] || 0, today: me.d === clock.day ? me.dp : 0, cap: WAR.DAY_CAP,
      atkLeft: inWar ? Math.max(0, WAR.ATTACKS - (rec.atk[userId] || 0)) : 0,
    },
    members, def, log,
    res: rec.res || null,
    rewards: readPending(nk, userId),
    serverTime: now,
    ...extra,
  };
}

/* ---------- RPC ---------- */

function myClan(nk: nkruntime.Nakama, userId: string): nkruntime.Group {
  const c = clanOf(nk, userId);
  if (!c) throw err('Nie jesteś w klanie.', PRECONDITION);
  return c.g;
}

/** Stan wojny klanu gracza w tym tygodniu. */
export function rpcWarState(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const g = myClan(nk, userId);
  const now = Date.now();
  const clock = warClock(nk, ctx, now);
  const t = touchUser(nk, clock, userId, g, now);
  let rec = t.rec;
  if (clock.day === 6 && !rec.done) rec = finalize(nk, clock.week, g.id, now) || rec;
  try { clanSeasonSettle(nk, ctx, userId, now); } catch { /* rozliczy następne wejście */ }
  let season = null;
  try { season = warSeason(nk, ctx, g.id, now); } catch { /* skrót sezonu nie jest konieczny */ }
  return JSON.stringify(view(nk, clock, rec, userId, t.me, now, { season }));
}

/** Atak w sobotę na obrońcę `id` wrogiego klanu. Walkę rozgrywa serwer (jak na arenie). */
export function rpcWarAttack(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const id = String(parse(payload).id || '');
  const g = myClan(nk, userId);
  const now = Date.now();
  const clock = warClock(nk, ctx, now);
  if (WAR_DAYS[clock.day].k !== 'bitwa') throw err('Bitwa trwa w sobotę.', PRECONDITION);
  const t = touchUser(nk, clock, userId, g, now);
  let rec = t.rec;
  if (t.me.out || !rec.roster[userId]) throw err('Dołączasz do wojny od przyszłego tygodnia (skład ustala się w poniedziałek).', PRECONDITION);
  if (!rec.opp) throw err('Klan nie ma jeszcze przeciwnika.', PRECONDITION);
  if ((rec.atk[userId] || 0) >= WAR.ATTACKS) throw err('Wykorzystałeś już wszystkie ataki w tej bitwie.', PRECONDITION);
  const hero = readHero(nk, userId);
  if (!hero) throw err('Zapisz grę, żeby twój bohater mógł stanąć do bitwy.', PRECONDITION);
  const o = rec.opp !== 'ghost' ? readWar(nk, rec.week, rec.opp) : null;
  const d = defendersOf(nk, rec, o).find(x => x.id === id);
  if (!d) throw err('Nie ma takiego obrońcy — odśwież.', INVALID);

  const foeHero = d.ghost ? null : readHero(nk, d.id);
  const foe = foeHero ? foeHero.f : scaleFighter(hero.f, d.power / Math.max(1, hero.power), d.n);
  const res = duel(hero.f, foe, Math.floor(serverRng(nk).next() * 0xffffffff));
  const ratio = Math.max(0.5, Math.min(2, d.power / Math.max(1, hero.power)));
  let pts = 0;
  let used = false;
  rec = updateObject<WarClan>(nk, WAR_C, keyOf(clock.week, g.id), SYSTEM_USER, cur => {
    used = false;
    if (!cur || cur.done || (cur.atk[userId] || 0) >= WAR.ATTACKS) return null;
    used = true;
    pts = res.win ? Math.round(WAR.WIN_PTS * ratio) + (cur.beaten[d.id] ? 0 : WAR.FIRST_BLOOD) : WAR.LOSS_PTS;
    const days = cur.days.slice();
    days[clock.day] += pts;
    const log = cur.log.concat({ t: now, a: cur.roster[userId] || hero.f.name, d: d.n, w: res.win, p: pts });
    return {
      ...cur, days, log: log.slice(-LOG_MAX),
      pts: { ...cur.pts, [userId]: (cur.pts[userId] || 0) + pts },
      atk: { ...cur.atk, [userId]: (cur.atk[userId] || 0) + 1 },
      beaten: res.win ? { ...cur.beaten, [d.id]: (cur.beaten[d.id] || 0) + 1 } : cur.beaten,
    };
  }, perm) as WarClan;
  if (!used) throw err('Wykorzystałeś już wszystkie ataki w tej bitwie.', PRECONDITION);
  return JSON.stringify(view(nk, clock, rec, userId, t.me, now, {
    fight: {
      win: res.win, ms: res.ms, frames: res.frames, crits: res.crits, skills: res.skills, pts,
      me: { name: hero.f.name, power: hero.power, look: hero.look ?? {}, sk: skinOr(hero.sk), fr: frameOr(hero.fr) },
      foe: { name: d.n, power: d.power, ghost: d.ghost, look: (foeHero ? foeHero.look : hero.look) ?? {}, sk: skinOr(foeHero?.sk), fr: frameOr(foeHero?.fr) },
    },
  }));
}

/** Tylko testy (TEST_SPEED > 1, wywołanie z http_key): ustawia tydzień i dzień wojny albo przywraca zegar (`clear`). */
export function rpcWarTestClock(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (ctx.userId) throw err('Tylko dla administratora serwera.', UNAUTH);
  if (testSpeed(ctx) <= 1) throw err('Zegar wojny można przestawić tylko w trybie testowym (TEST_SPEED > 1).', PRECONDITION);
  const req = parse(payload);
  const key = { collection: 'war_test', key: 'clock', userId: SYSTEM_USER };
  if (req.clear === true) nk.storageDelete([key]);
  else nk.storageWrite([{ ...key, value: { w: typeof req.w === 'string' ? req.w : '', d: Number(req.d) }, permissionRead: 0, permissionWrite: 0 }]);
  return JSON.stringify(warClock(nk, ctx, Date.now()));
}

/** Skrót dla clan_sync (kropki w grze): dzień wojny i ataki do wykorzystania w sobotę. */
export function warBrief(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, g: nkruntime.Group): { day: number; atk: number } {
  const clock = warClock(nk, ctx, Date.now());
  if (WAR_DAYS[clock.day].k !== 'bitwa') return { day: clock.day, atk: 0 };
  const rec = readWar(nk, clock.week, g.id);
  const me = readMe(nk, userId);
  if (!rec || !rec.opp || rec.done || !rec.roster[userId] || (me && me.week === clock.week && (me.out || me.g !== g.id))) return { day: clock.day, atk: 0 };
  return { day: clock.day, atk: Math.max(0, WAR.ATTACKS - (rec.atk[userId] || 0)) };
}
