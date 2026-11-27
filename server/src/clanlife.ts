// Życie klanu (etap 4b): Wspólna Kuźnia Klanu (datki → Doświadczenie i poziom klanu z premiami),
// boss klanowy (wspólne zdrowie, 3 ataki dziennie, skrzynie dla wszystkich atakujących),
// pomoc w ulepszeniach kuźni i prośby o rudę. Monety klanowe i inne nagrody trafiają do kolejki nagród gracza;
// gra bierze każdą raz (numer w zapisie), a serwer usuwa je po zapisie z tym numerem.
//
// Magazyn:
//   clan_state/{groupId} (SYSTEM)  — stan klanu: Doświadczenie, boss, prośby, kronika,
//   clan/daily (gracz)             — dzienne liczniki: datki, ataki, dobre uczynki, czas ostatniej prośby o rudę,
//   clan/helped (gracz)            — ile pomocy dostał przy ulepszeniu na dany poziom (kontrola tempa kuźni),
//   clan/helpedT (gracz)           — ile pomocy dostał przy badaniu „id:poziom” (gra skraca badanie sama),
//   clan/rewards (gracz)           — nagrody czekające na odbiór.
// Skrzynia tygodnia i Kowal tygodnia: punkty aktywności członków w stanie klanu (`wk`), poprzedni zwycięzca w `top`.
import { B, CLAN, CLAN_LEVELS, CLAN_WEEK, ORES, ORE_WANT, TECH, clanBossHp, clanBossOf, clanEmbOf, clanLevelOf, clanWeekGoal, type ClanWeekKind } from '../../src/data';
import { clanAttackReward, clanBossChest, clanWeekChest, type ServerReward } from '../../src/engine/clan';
import type { Reward, TechId } from '../../src/engine/types';
import { clanOf, postClan } from './clan';
import { raidBrief } from './raid';
import { warBrief, warClock, warOnBossAttack } from './war';
import { INVALID, NOT_FOUND, PRECONDITION, SYSTEM_USER, err, goldStage, parse, readSave, serverDay, serverRng, updateObject, userOf } from './common';
import { clanSeasonSettle, updateClanPower } from './clanrank';
import { nameOf } from './names';

/** Prośba o pomoc: ulepszenie kuźni na poziom `lvl` albo badanie `tk` („id:poziom”, nazwa w `tn`). */
interface HelpReq { uid: string; n: string; lvl: number; got: string[]; t: number; tk?: string; tn?: string }
interface OreReq { id: string; uid: string; n: string; ore: number; want: number; got: number; t: number }
interface Boss { lvl: number; hp: number; max: number; dmg: Record<string, number>; who: Record<string, string>; t: number }
/** Tydzień klanu: punkty łącznie i każdego członka (`by`), imiona, odebrane skrzynie (numery 0–4). */
interface Week { id: string; pts: number; by: Record<string, number>; who: Record<string, string>; got: Record<string, number[]> }
interface WeekTop { wk: string; uid: string; n: string; pts: number }
export interface ClanState {
  xp: number; boss: Boss; kills: number; helps: HelpReq[]; ores: OreReq[]; log: { t: number; m: string; n?: number }[]; raidLvl?: number;
  wk?: Week; top?: WeekTop | null;
}
interface Daily { day: string; don: number; atk: number; deed: number; oreT: number }
type Helped = Record<string, number>;
interface Pending { list: ServerReward[] }

const STATE = 'clan_state';
const PENDING_MAX = 60;
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };

const myName = (nk: nkruntime.Nakama, userId: string) => nameOf(nk, userId) || 'Kowal';
const DAY_MS = 86400000;

/* ---------- Skrzynia tygodnia i Kowal tygodnia ---------- */

const freshWeek = (id: string): Week => ({ id, pts: 0, by: {}, who: {}, got: {} });
/** Punkty tygodnia — wywoływane w środku zmiany stanu klanu (`st` to już kopia). */
function bumpWeek(st: ClanState, wk: string, uid: string, who: string, pts: number): void {
  const w: Week = st.wk && st.wk.id === wk ? { ...st.wk, by: { ...st.wk.by }, who: { ...st.wk.who } } : freshWeek(wk);
  w.pts += pts;
  w.by[uid] = (w.by[uid] || 0) + pts;
  w.who[uid] = who;
  st.wk = w;
}
/** Najaktywniejszy członek tygodnia (przy remisie — pierwszy, który zdobył punkty). */
function bestOf(w: Week): { uid: string; n: string; pts: number } | null {
  let top: { uid: string; n: string; pts: number } | null = null;
  for (const [u, p] of Object.entries(w.by)) if (p > 0 && (!top || p > top.pts)) top = { uid: u, n: w.who[u] || 'Kowal', pts: p };
  return top;
}
/** Ile skrzyń tygodnia otworzył klan (przy obecnej liczbie członków). */
const opened = (w: Week, members: number) => CLAN_WEEK.TIERS.filter((_, i) => w.pts >= clanWeekGoal(i, members)).length;

/** Rozliczenie skończonego tygodnia: nieodebrane skrzynie dla każdego, kto dołożył punkty, i nagroda Kowala tygodnia. */
function settleWeek(nk: nkruntime.Nakama, groupId: string, ids: string[], w: Week): void {
  const members = new Set(ids);
  const n = opened(w, ids.length);
  const users = Object.keys(w.by).filter(u => w.by[u] > 0 && members.has(u));
  const best: Record<string, number> = {};
  if (users.length) for (const o of nk.storageRead(users.map(u => ({ collection: 'save', key: 'state', userId: u })))) best[o.userId] = goldStage((o.value as { state?: object }).state);
  for (const u of users) {
    const got = w.got[u] || [];
    const items: { why: string; r: Reward }[] = [];
    for (let t = 0; t < n; t++) if (!got.includes(t)) items.push({ why: `Skrzynia tygodnia klanu nr ${t + 1}`, r: clanWeekChest(t, best[u] || 0) });
    if (items.length) { try { pushRewards(nk, u, items); } catch { /* następna osoba */ } }
  }
  const top = bestOf(w);
  if (top && members.has(top.uid)) {
    try { pushRewards(nk, top.uid, [{ why: 'Kowal tygodnia w klanie', r: { ...CLAN_WEEK.TOP_REWARD } }]); } catch { /* nagroda przy następnej okazji przepada */ }
    postClan(nk, groupId, { k: 'sys', t: `Kowal tygodnia: ${top.n} (${top.pts} pkt)! Nagroda czeka w zakładce Klan.` });
  }
}
/** Nowy tydzień: rozlicza poprzedni i zaczyna liczyć od zera. Zwraca aktualny stan klanu. */
function rollWeek(nk: nkruntime.Nakama, groupId: string, ids: string[], wk: string): ClanState | null {
  let old: Week | null = null;
  const st = updateObject<ClanState>(nk, STATE, groupId, SYSTEM_USER, cur => {
    old = null;
    if (!cur) return null;
    if (!cur.wk) return { ...cur, wk: freshWeek(wk) };
    if (cur.wk.id === wk) return null;
    old = cur.wk;
    const t = bestOf(cur.wk);
    return { ...cur, wk: freshWeek(wk), top: t ? { wk: cur.wk.id, ...t } : null };
  }, perm);
  const o = old as Week | null;
  if (o) settleWeek(nk, groupId, ids, o);
  return st;
}
/** Punkty tygodnia za aktywność poza tym plikiem (bitwa w wojnie, atak na smoka). */
export function addWeekPoints(nk: nkruntime.Nakama, ctx: nkruntime.Context, groupId: string, uid: string, kind: ClanWeekKind): void {
  const wk = warClock(nk, ctx, Date.now()).week;
  const ids = memberIds(nk, groupId);
  ensureState(nk, groupId, ids);
  rollWeek(nk, groupId, ids, wk);
  const who = myName(nk, uid);
  updateObject<ClanState>(nk, STATE, groupId, SYSTEM_USER, cur => {
    if (!cur) return null;
    const st: ClanState = { ...cur };
    bumpWeek(st, wk, uid, who, CLAN_WEEK.PTS[kind]);
    return st;
  }, perm);
}

export function memberIds(nk: nkruntime.Nakama, groupId: string): string[] {
  return (nk.groupUsersList(groupId, 100).groupUsers || []).filter(u => u.user && typeof u.state === 'number' && u.state <= 2).map(u => u.user.userId);
}

/** Łączna Moc członków (z rankingu Mocy, liczonej przez serwer). */
export function clanPower(nk: nkruntime.Nakama, ids: string[]): number {
  if (!ids.length) return 0;
  let sum = 0;
  for (const r of nk.leaderboardRecordsList('moc', ids, ids.length).ownerRecords || []) sum += r.score;
  return sum;
}

function newBoss(lvl: number, power: number, now: number): Boss {
  const max = clanBossHp(power, lvl);
  return { lvl, hp: max, max, dmg: {}, who: {}, t: now };
}

export function readState(nk: nkruntime.Nakama, groupId: string): ClanState | null {
  const o = nk.storageRead([{ collection: STATE, key: groupId, userId: SYSTEM_USER }]);
  return o.length ? (o[0].value as unknown as ClanState) : null;
}

/** Stan klanu; przy pierwszym użyciu powstaje z pierwszym bossem. */
export function ensureState(nk: nkruntime.Nakama, groupId: string, ids: string[]): ClanState {
  const cur = readState(nk, groupId);
  if (cur) return cur;
  const power = clanPower(nk, ids);
  return updateObject<ClanState>(nk, STATE, groupId, SYSTEM_USER, c => c ? null : {
    xp: 0, boss: newBoss(0, power, Date.now()), kills: 0, helps: [], ores: [], log: [],
  }, perm) as ClanState;
}

/** Wpis w kronice; ten sam wpis w ciągu godziny tylko zwiększa licznik (np. „wspiera Wspólną Kuźnię ×3”). */
export const addLog = (st: ClanState, m: string, now: number) => {
  const last = st.log[st.log.length - 1];
  if (last && last.m === m && now - last.t < 3600000) {
    st.log[st.log.length - 1] = { t: now, m, n: (last.n || 1) + 1 };
    return;
  }
  st.log.push({ t: now, m });
  if (st.log.length > CLAN.LOG_MAX) st.log.splice(0, st.log.length - CLAN.LOG_MAX);
};

/** Poziom klanu gracza (0 bez klanu) — serwer wpisuje go do zapisu, bo od niego zależą premie. */
export function clanLevelFor(nk: nkruntime.Nakama, userId: string, known?: { g: nkruntime.Group } | null): number {
  const c = known === undefined ? clanOf(nk, userId) : known;
  if (!c) return 0;
  const st = readState(nk, c.g.id);
  return st ? clanLevelOf(st.xp) : 0;
}

/* ---------- dzienne liczniki, pomoc, nagrody ---------- */

const freshDaily = (day: string): Daily => ({ day, don: 0, atk: 0, deed: 0, oreT: 0 });

function readDaily(nk: nkruntime.Nakama, userId: string, now: number): Daily {
  const o = nk.storageRead([{ collection: 'clan', key: 'daily', userId }]);
  const d = o.length ? (o[0].value as unknown as Daily) : null;
  const day = serverDay(now);
  if (!d) return freshDaily(day);
  return d.day === day ? d : { ...freshDaily(day), oreT: d.oreT || 0 };
}

/** Zmienia dzienne liczniki atomowo; `fn` zwraca false, gdy limit jest wyczerpany. */
function bumpDaily(nk: nkruntime.Nakama, userId: string, now: number, fn: (d: Daily) => boolean): Daily {
  let ok = true;
  const out = updateObject<Daily>(nk, 'clan', 'daily', userId, cur => {
    const day = serverDay(now);
    const d: Daily = !cur ? freshDaily(day) : cur.day === day ? { ...cur } : { ...freshDaily(day), oreT: cur.oreT || 0 };
    ok = fn(d);
    return ok ? d : null;
  }, perm);
  if (!ok) throw err('Na dziś limit wyczerpany, wróć jutro.', PRECONDITION);
  return out as Daily;
}

export function readHelped(nk: nkruntime.Nakama, userId: string): Helped {
  const o = nk.storageRead([{ collection: 'clan', key: 'helped', userId }]);
  return o.length ? (o[0].value as unknown as Helped) : {};
}
function readHelpedT(nk: nkruntime.Nakama, userId: string): Helped {
  const o = nk.storageRead([{ collection: 'clan', key: 'helpedT', userId }]);
  return o.length ? (o[0].value as unknown as Helped) : {};
}
/** Badanie „id:poziom” podane przez grę (znane badanie, poziom w jego zakresie) albo pusty napis. */
function tkOf(raw: unknown): string {
  const m = /^([a-z_]+):(\d+)$/.exec(String(raw || ''));
  if (!m) return '';
  const T = TECH[m[1] as TechId];
  const lv = Number(m[2]);
  return T && lv >= 1 && lv <= T.max ? `${m[1]}:${lv}` : '';
}
const techName = (tk: string) => { const [id, lv] = tk.split(':'); return `${TECH[id as TechId]?.n ?? 'Badanie'} → poz. ${lv}`; };
const isTech = (h: HelpReq) => !!h.tk;

export function readPending(nk: nkruntime.Nakama, userId: string): ServerReward[] {
  const o = nk.storageRead([{ collection: 'clan', key: 'rewards', userId }]);
  return o.length ? ((o[0].value as unknown as Pending).list || []) : [];
}

/** Dodaje nagrody do kolejki gracza. */
export function pushRewards(nk: nkruntime.Nakama, userId: string, items: { why: string; r: Reward }[]): void {
  if (!items.length) return;
  const add = items.map(x => ({ id: nk.uuidv4().slice(0, 18), why: x.why, r: x.r }));
  updateObject<Pending>(nk, 'clan', 'rewards', userId, cur => {
    const list = (cur?.list || []).concat(add);
    return { list: list.slice(-PENDING_MAX) };
  }, perm);
}

/** Usuwa z kolejki nagrody, które gra już zapisała (numery w `got`). Woła to zapis gry. */
export function ackRewards(nk: nkruntime.Nakama, userId: string, got: string[]): void {
  if (!got.length) return;
  const seen = new Set(got);
  if (!readPending(nk, userId).some(x => seen.has(x.id))) return;
  updateObject<Pending>(nk, 'clan', 'rewards', userId, cur => {
    if (!cur) return null;
    const list = cur.list.filter(x => !seen.has(x.id));
    return list.length === cur.list.length ? null : { list };
  }, perm);
}

/** Dobre uczynki (pomoc, dary rudy): Monety za pierwsze DEEDS_PER_DAY dziennie. */
function deedReward(nk: nkruntime.Nakama, userId: string, now: number, count: number, why: string): number {
  if (count <= 0) return 0;
  let paid = 0;
  updateObject<Daily>(nk, 'clan', 'daily', userId, cur => {
    const day = serverDay(now);
    const d: Daily = !cur ? freshDaily(day) : cur.day === day ? { ...cur } : { ...freshDaily(day), oreT: cur.oreT || 0 };
    paid = Math.max(0, Math.min(count, CLAN.DEEDS_PER_DAY - d.deed));
    d.deed += count;
    return d;
  }, perm);
  if (paid) pushRewards(nk, userId, [{ why, r: { coins: paid * CLAN.DEED_COINS } }]);
  return paid;
}

/* ---------- widok klanu dla gry ---------- */

interface Ctx { userId: string; g: nkruntime.Group; ids: string[]; st: ClanState; now: number; wk: string; wkEnds: number; tk: string }

/** Sprzątanie: wygasłe prośby, prośby byłych członków, własna prośba o pomoc po zakończonym ulepszeniu. */
function tidy(nk: nkruntime.Nakama, c: Ctx, up: number | null): ClanState {
  const keep = (st: ClanState) => {
    const ids = new Set(c.ids);
    const helps = st.helps.filter(h => ids.has(h.uid) && c.now - h.t < CLAN.HELP_TTL_MS && h.got.length < CLAN.HELP_MAX
      && !(h.uid === c.userId && (isTech(h) ? h.tk !== c.tk : up !== null && h.lvl !== up)));
    const ores = st.ores.filter(o => ids.has(o.uid) && c.now - o.t < CLAN.ORE_TTL_MS && o.got < o.want);
    return { helps, ores };
  };
  const k = keep(c.st);
  if (k.helps.length === c.st.helps.length && k.ores.length === c.st.ores.length) return c.st;
  return updateObject<ClanState>(nk, STATE, c.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    const x = keep(cur);
    return { ...cur, ...x };
  }, perm) as ClanState;
}

/** Skrzynia tygodnia w widoku: punkty klanu i moje, progi, odebrane skrzynie, kto prowadzi i Kowal poprzedniego tygodnia. */
function weekView(c: Ctx, userId: string) {
  const w = c.st.wk && c.st.wk.id === c.wk ? c.st.wk : freshWeek(c.wk);
  const lead = bestOf(w);
  const top = c.st.top;
  return {
    pts: w.pts, mine: w.by[userId] || 0, goals: CLAN_WEEK.TIERS.map((_, i) => clanWeekGoal(i, c.ids.length)), got: w.got[userId] || [],
    open: opened(w, c.ids.length), ends: c.wkEnds,
    lead: lead ? { n: lead.n, pts: lead.pts, me: lead.uid === userId } : null,
    top: top ? { uid: top.uid, n: top.n, pts: top.pts, me: top.uid === userId } : null,
  };
}

function view(nk: nkruntime.Nakama, c: Ctx, up: number | null, extra: Record<string, unknown> = {}) {
  const { st, userId, now } = c;
  const d = readDaily(nk, userId, now);
  const helped = readHelped(nk, userId);
  const lvl = clanLevelOf(st.xp);
  const b = st.boss;
  const top = Object.entries(b.dmg).sort((x, y) => y[1] - x[1]);
  const rank = top.findIndex(([u]) => u === userId);
  const mine = st.helps.find(h => h.uid === userId && !isTech(h)) || null;
  const mineT = st.helps.find(h => h.uid === userId && isTech(h)) || null;
  const myOre = st.ores.find(o => o.uid === userId) || null;
  return {
    clan: { id: c.g.id, name: c.g.name, tag: ((c.g.metadata || {}) as { tag?: string }).tag || '', emb: clanEmbOf(((c.g.metadata || {}) as { emb?: unknown }).emb) },
    lvl, xp: st.xp, cur: lvl ? CLAN_LEVELS[lvl - 1].xp : 0, next: lvl < CLAN_LEVELS.length ? CLAN_LEVELS[lvl].xp : null,
    boss: {
      n: clanBossOf(b.lvl).n, pal: clanBossOf(b.lvl).pal, lvl: b.lvl, hp: b.hp, max: b.max, kills: st.kills,
      mine: b.dmg[userId] || 0, rank: rank >= 0 ? rank + 1 : 0, fighters: top.length,
      top: top.slice(0, 5).map(([u, v]) => ({ n: b.who[u] || 'Kowal', d: v, me: u === userId })),
    },
    left: { don: Math.max(0, CLAN.DONATE_PER_DAY - d.don), atk: Math.max(0, CLAN.BOSS_ATTACKS - d.atk), deed: Math.max(0, CLAN.DEEDS_PER_DAY - d.deed) },
    oreNext: d.oreT ? d.oreT + CLAN.ORE_COOLDOWN_MS : 0,
    helps: st.helps.filter(h => h.uid !== userId).map(h => ({
      uid: h.uid, n: h.n, lvl: h.lvl, k: isTech(h) ? 't' : 'f', tn: h.tn, got: h.got.length, done: h.got.includes(userId),
    })),
    myHelp: mine ? { lvl: mine.lvl, got: mine.got.length } : null,
    myHelpT: mineT ? { tk: mineT.tk, got: mineT.got.length } : null,
    helped: up ? { lvl: up, n: Math.min(CLAN.HELP_MAX, helped[String(up)] || 0) } : null,
    helpedT: c.tk ? { tk: c.tk, n: Math.min(CLAN.HELP_MAX, readHelpedT(nk, userId)[c.tk] || 0) } : null,
    ores: st.ores.filter(o => o.uid !== userId).map(o => ({ id: o.id, n: o.n, ore: o.ore, want: o.want, got: o.got })),
    myOre: myOre ? { id: myOre.id, ore: myOre.ore, want: myOre.want, got: myOre.got } : null,
    log: st.log.slice(-15).reverse(),
    week: weekView(c, userId),
    rewards: readPending(nk, userId),
    serverTime: now,
    ...extra,
  };
}

/** Kontekst klanu gracza albo błąd, gdy nie jest w klanie (przy okazji rozlicza skończony tydzień klanu). */
function clanCtx(nk: nkruntime.Nakama, userId: string, ctx: nkruntime.Context, payload = ''): Ctx {
  const c = clanOf(nk, userId);
  if (!c) throw err('Nie jesteś w klanie.', PRECONDITION);
  const ids = memberIds(nk, c.g.id);
  const now = Date.now();
  const clock = warClock(nk, ctx, now);
  let st = ensureState(nk, c.g.id, ids);
  if (!st.wk || st.wk.id !== clock.week) st = rollWeek(nk, c.g.id, ids, clock.week) || st;
  return { userId, g: c.g, ids, st, now, wk: clock.week, wkEnds: clock.ends + (6 - clock.day) * DAY_MS, tk: tkOf(parse(payload).tk) };
}

/** Poziom ulepszenia kuźni podany przez grę (sprawdzony z zapisem: najwyżej o 2 ponad zapisany poziom). */
function upOf(nk: nkruntime.Nakama, userId: string, raw: unknown): number | null {
  const up = Math.floor(Number(raw));
  if (!Number.isFinite(up) || up <= 1) return 0;
  const s = readSave(nk, userId);
  const lvl = s ? s.value.state.forge.lvl : 1;
  return up <= lvl + 2 && up <= B.FORGE_MAX ? up : null;
}

/* ---------- RPC ---------- */

/** Stan klanu, nagrody do odebrania i pomoc przy bieżącym ulepszeniu kuźni (`up`). */
export function rpcClanSync(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const up = upOf(nk, userId, parse(payload).up);
  try { clanSeasonSettle(nk, ctx, userId, Date.now()); } catch { /* rozliczy następne wejście */ }
  const c = clanOf(nk, userId);
  if (!c) {
    const helped = readHelped(nk, userId);
    return JSON.stringify({
      clan: null, rewards: readPending(nk, userId), serverTime: Date.now(),
      helped: up ? { lvl: up, n: Math.min(CLAN.HELP_MAX, helped[String(up)] || 0) } : null,
    });
  }
  const x = clanCtx(nk, userId, ctx, payload);
  x.st = tidy(nk, x, up);
  try { updateClanPower(nk, x.g, x.ids, clanLevelOf(x.st.xp)); } catch { /* ranking nie jest konieczny */ }
  const extra: Record<string, unknown> = {};
  try { extra.war = warBrief(nk, ctx, userId, x.g); extra.raid = raidBrief(nk, ctx, userId, x.g); } catch { /* skrót nie jest konieczny */ }
  return JSON.stringify(view(nk, x, up, extra));
}

/** Datek do Wspólnej Kuźni: Doświadczenie dla klanu, Monety dla gracza. Złoto płaci gra. */
export function rpcClanDonate(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const x = clanCtx(nk, userId, ctx, payload);
  const up = upOf(nk, userId, parse(payload).up);
  bumpDaily(nk, userId, x.now, d => (d.don < CLAN.DONATE_PER_DAY ? (d.don++, true) : false));
  const who = myName(nk, userId);
  const before = clanLevelOf(x.st.xp);
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    const st = { ...cur, xp: cur.xp + CLAN.DONATE_XP, log: cur.log.slice() };
    addLog(st, `${who} wspiera Wspólną Kuźnię`, x.now);
    bumpWeek(st, x.wk, userId, who, CLAN_WEEK.PTS.don);
    return st;
  }, perm) as ClanState;
  pushRewards(nk, userId, [{ why: 'Datek do Wspólnej Kuźni', r: { coins: CLAN.DONATE_COINS } }]);
  const after = clanLevelOf(x.st.xp);
  if (after > before) postClan(nk, x.g.id, { k: 'sys', t: `Wspólna Kuźnia osiąga ${after}. poziom! Nowa premia: ${CLAN_LEVELS[after - 1].d}.` });
  return JSON.stringify(view(nk, x, up, { levelUp: after > before ? after : 0 }));
}

/** Atak na bossa klanowego: obrażenia z Mocy liczonej przez serwer. */
export function rpcClanBossAttack(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const x = clanCtx(nk, userId, ctx, payload);
  const up = upOf(nk, userId, parse(payload).up);
  const save = readSave(nk, userId);
  const power = Math.max(1, save ? save.value.power || 0 : 0);
  const bestG = goldStage(save && save.value.state);
  bumpDaily(nk, userId, x.now, d => (d.atk < CLAN.BOSS_ATTACKS ? (d.atk++, true) : false));
  const rng = serverRng(nk);
  const roll = Math.round(power * (1 - CLAN.BOSS_SPREAD + 2 * CLAN.BOSS_SPREAD * rng.next()));
  const who = myName(nk, userId);
  const nextPower = clanPower(nk, x.ids);
  let dealt = 0;
  let killed: Boss | null = null;
  const before = clanLevelOf(x.st.xp);
  // Nagrodę liczymy przed zapisem ataku: gdyby jej liczenie się wywróciło, atak nie przepadnie.
  const reward = clanAttackReward(bestG);
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    const b: Boss = { ...cur.boss, dmg: { ...cur.boss.dmg }, who: { ...cur.boss.who } };
    const st: ClanState = { ...cur, boss: b, log: cur.log.slice() };
    dealt = Math.min(roll, b.hp);
    b.hp -= dealt;
    b.dmg[userId] = (b.dmg[userId] || 0) + dealt;
    b.who[userId] = who;
    bumpWeek(st, x.wk, userId, who, CLAN_WEEK.PTS.atk);
    killed = null;
    if (b.hp <= 0) {
      killed = b;
      st.kills = (cur.kills || 0) + 1;
      st.xp = cur.xp + CLAN.BOSS_KILL_XP + CLAN.BOSS_KILL_XP_LVL * b.lvl;
      st.boss = newBoss(b.lvl + 1, nextPower, x.now);
      addLog(st, `${who} zadaje ostatni cios: ${clanBossOf(b.lvl).n} (poz. ${b.lvl + 1}) pokonany`, x.now);
    }
    return st;
  }, perm) as ClanState;
  pushRewards(nk, userId, [{ why: 'Atak na bossa klanowego', r: reward }]);
  try { warOnBossAttack(nk, ctx, userId, x.g, x.now); } catch { /* wojna nie blokuje ataku na bossa */ }

  const k = killed as Boss | null;
  if (k) {
    const ranked = Object.entries(k.dmg).sort((a, b) => b[1] - a[1]);
    const saves = nk.storageRead(ranked.map(([u]) => ({ collection: 'save', key: 'state', userId: u })));
    const best: Record<string, number> = {};
    for (const o of saves) best[o.userId] = goldStage((o.value as { state?: object }).state);
    const name = clanBossOf(k.lvl).n;
    ranked.forEach(([u], i) => {
      try { pushRewards(nk, u, [{ why: `Skrzynia: ${name} (poz. ${k.lvl + 1})${i < 3 ? `, ${i + 1}. miejsce` : ''}`, r: clanBossChest(k.lvl, i, best[u] || 0) }]); } catch { /* następna osoba */ }
    });
    const podium = ranked.slice(0, 3).map(([u], i) => `${i + 1}. ${k.who[u] || 'Kowal'}`).join(', ');
    postClan(nk, x.g.id, { k: 'sys', t: `${name} pokonany! ${podium}. Skrzynie czekają w zakładce Klan.` });
  }
  const after = clanLevelOf(x.st.xp);
  if (after > before) postClan(nk, x.g.id, { k: 'sys', t: `Wspólna Kuźnia osiąga ${after}. poziom! Nowa premia: ${CLAN_LEVELS[after - 1].d}.` });
  return JSON.stringify(view(nk, x, up, { hit: { dmg: dealt, killed: !!k }, levelUp: after > before ? after : 0 }));
}

/** Wpis na czacie klanu z przyciskiem „Pomóż” (prośby o pomoc i o rudę). */
const ask = (nk: nkruntime.Nakama, groupId: string, t: string) => postClan(nk, groupId, { k: 'ask', t, go: 'pomoc' });

/** Prośba o pomoc przy trwającym ulepszeniu kuźni na poziom `up` albo (`what: 'tech'`) przy trwającym badaniu `tk`. */
export function rpcClanHelpAsk(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const up = upOf(nk, userId, req.up);
  const x = clanCtx(nk, userId, ctx, payload);
  const tech = req.what === 'tech';
  if (tech ? !x.tk : !up) throw err(tech ? 'Pomoc przydaje się w czasie badania.' : 'Pomoc przydaje się w czasie ulepszenia kuźni.', PRECONDITION);
  const have = Math.min(CLAN.HELP_MAX, tech ? readHelpedT(nk, userId)[x.tk] || 0 : readHelped(nk, userId)[String(up)] || 0);
  if (have >= CLAN.HELP_MAX) throw err(tech ? 'To badanie dostało już pełną pomoc klanu.' : 'To ulepszenie dostało już pełną pomoc klanu.', PRECONDITION);
  const who = myName(nk, userId);
  const tn = tech ? techName(x.tk) : '';
  let fresh = false;
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    fresh = false;
    if (!cur) return null;
    const old = cur.helps.find(h => h.uid === userId && isTech(h) === tech);
    if (old && (tech ? old.tk === x.tk : old.lvl === up)) return null;
    const helps = cur.helps.filter(h => !(h.uid === userId && isTech(h) === tech));
    helps.push(tech ? { uid: userId, n: who, lvl: 0, tk: x.tk, tn, got: [], t: x.now } : { uid: userId, n: who, lvl: up as number, got: [], t: x.now });
    fresh = true;
    return { ...cur, helps };
  }, perm) as ClanState;
  if (fresh) ask(nk, x.g.id, tech ? `${who} prosi o pomoc w badaniu: ${tn}.` : `${who} prosi o pomoc: Kuźnia → poziom ${up}.`);
  return JSON.stringify(view(nk, x, up));
}

/** Pomoc klanowiczom w ulepszeniach i badaniach (wszystkim naraz albo jednej prośbie: `uid` i `k` — 'f' kuźnia, 't' badanie). */
export function rpcClanHelp(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const only = typeof req.uid === 'string' ? req.uid : '';
  const kind = req.k === 't' || req.k === 'f' ? req.k : '';
  const x = clanCtx(nk, userId, ctx, payload);
  const up = upOf(nk, userId, req.up);
  const ids = new Set(x.ids);
  const helper = myName(nk, userId);
  let done: HelpReq[] = [];
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    done = [];
    const helps = cur.helps.map(h => {
      if (h.uid === userId || (only && h.uid !== only) || (kind && (isTech(h) ? 't' : 'f') !== kind)
        || !ids.has(h.uid) || h.got.includes(userId) || h.got.length >= CLAN.HELP_MAX) return h;
      const n = { ...h, got: h.got.concat(userId) };
      done.push(n);
      return n;
    });
    if (!done.length) return null;
    const st: ClanState = { ...cur, helps: helps.filter(h => h.got.length < CLAN.HELP_MAX) };
    bumpWeek(st, x.wk, userId, helper, CLAN_WEEK.PTS.help * done.length);
    return st;
  }, perm) as ClanState;
  if (!done.length) throw err('Nie ma komu pomóc, wszystkie prośby mają już twoją pomoc.', PRECONDITION);
  for (const h of done) {
    const key = isTech(h) ? h.tk as string : String(h.lvl);
    updateObject<Helped>(nk, 'clan', isTech(h) ? 'helpedT' : 'helped', h.uid, cur => {
      const m: Helped = {};
      // Pomoc przy badaniach: tylko kilka ostatnich badań (starsze nie są już potrzebne).
      const old = Object.entries(cur || {});
      for (const [k, v] of isTech(h) ? old.slice(-8) : old) m[k] = v;
      if ((m[key] || 0) >= h.got.length) return null;
      m[key] = Math.min(CLAN.HELP_MAX, h.got.length);
      return m;
    }, perm);
    if (h.got.length >= CLAN.HELP_MAX) {
      postClan(nk, x.g.id, { k: 'sys', t: `${h.n} ma pełną pomoc klanu (${CLAN.HELP_MAX}/${CLAN.HELP_MAX}): ${isTech(h) ? h.tn : `Kuźnia → poziom ${h.lvl}`}. Dzięki!` });
    }
  }
  const paid = deedReward(nk, userId, x.now, done.length, 'Pomoc w ulepszeniach');
  return JSON.stringify(view(nk, x, up, { helpedNow: done.length, paid }));
}

/** Prośba o rudę (raz na 8 godzin, ruda dostępna na twoim poziomie kuźni). */
export function rpcClanOreAsk(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const ore = Math.floor(Number(req.ore));
  if (!ORES[ore]) throw err('Nieznana ruda.', INVALID);
  if (!(ORE_WANT[ore] > 0)) throw err(`O ${ORES[ore].n} nie można prosić klanu.`, INVALID);
  const x = clanCtx(nk, userId, ctx, payload);
  const up = upOf(nk, userId, req.up);
  const save = readSave(nk, userId);
  if (!save || ORES[ore].lvl > save.value.state.forge.lvl) throw err(`${ORES[ore].n} odblokujesz na ${ORES[ore].lvl}. poziomie kuźni.`, PRECONDITION);
  const d = readDaily(nk, userId, x.now);
  if (d.oreT && x.now - d.oreT < CLAN.ORE_COOLDOWN_MS) throw err('O rudę możesz prosić raz na 8 godzin.', PRECONDITION);
  const who = myName(nk, userId);
  let open = false;
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    open = cur.ores.some(o => o.uid === userId && x.now - o.t < CLAN.ORE_TTL_MS && o.got < o.want);
    if (open) return null;
    const ores = cur.ores.filter(o => o.uid !== userId);
    ores.push({ id: nk.uuidv4().slice(0, 13), uid: userId, n: who, ore, want: ORE_WANT[ore], got: 0, t: x.now });
    return { ...cur, ores };
  }, perm) as ClanState;
  if (open) throw err('Twoja prośba o rudę jeszcze trwa.', PRECONDITION);
  ask(nk, x.g.id, `${who} prosi o rudę: ${ORE_WANT[ore]} × ${ORES[ore].n}.`);
  updateObject<Daily>(nk, 'clan', 'daily', userId, cur => ({ ...(cur && cur.day === serverDay(x.now) ? cur : freshDaily(serverDay(x.now))), oreT: x.now }), perm);
  return JSON.stringify(view(nk, x, up));
}

/** Dar rudy dla klanowicza (najwyżej 5 sztuk naraz). Rudę odejmuje gra po odpowiedzi serwera (`given`). */
export function rpcClanOreGive(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const id = String(req.id || '');
  const n = Math.max(1, Math.min(CLAN.ORE_GIVE_MAX, Math.floor(Number(req.n)) || 0));
  const x = clanCtx(nk, userId, ctx, payload);
  const up = upOf(nk, userId, req.up);
  const ids = new Set(x.ids);
  const giver = myName(nk, userId);
  let given = 0;
  let to: OreReq | null = null;
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    given = 0; to = null;
    const r = cur.ores.find(o => o.id === id);
    if (!r || r.uid === userId || !ids.has(r.uid) || r.got >= r.want) return null;
    given = Math.min(n, r.want - r.got);
    to = { ...r, got: r.got + given };
    const t = to;
    const st: ClanState = { ...cur, ores: cur.ores.map(o => (o.id === id ? t : o)).filter(o => o.got < o.want) };
    bumpWeek(st, x.wk, userId, giver, CLAN_WEEK.PTS.ore);
    return st;
  }, perm) as ClanState;
  const r = to as OreReq | null;
  if (!r || !given) throw err('Ta prośba jest już spełniona albo wygasła.', NOT_FOUND);
  const who = myName(nk, userId);
  pushRewards(nk, r.uid, [{ why: `Ruda od: ${who}`, r: { ores: { [r.ore]: given } } }]);
  const paid = deedReward(nk, userId, x.now, 1, 'Dar rudy dla klanu');
  if (r.got >= r.want) {
    logEvent(nk, x, `${r.n} dostaje komplet rudy (${ORES[r.ore].n} × ${r.want})`);
    postClan(nk, x.g.id, { k: 'sys', t: `${r.n} ma komplet rudy: ${ORES[r.ore].n} × ${r.want}. Dzięki!` });
  }
  return JSON.stringify(view(nk, x, up, { given, paid }));
}

/** Odbiór otwartych skrzyń tygodnia (każdy, kto w tym tygodniu dołożył choć 1 punkt). */
export function rpcClanWeekClaim(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const x = clanCtx(nk, userId, ctx, payload);
  const up = upOf(nk, userId, parse(payload).up);
  let tiers: number[] = [];
  let none = '';
  // Skrzynie liczymy przed zapisem „odebrane”: gdyby liczenie się wywróciło, skrzynie nie przepadną.
  const save = readSave(nk, userId);
  const bestG = goldStage(save && save.value.state);
  const chests = CLAN_WEEK.TIERS.map((_, t) => clanWeekChest(t, bestG));
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    tiers = []; none = '';
    if (!cur || !cur.wk || cur.wk.id !== x.wk) { none = 'Tydzień klanu dopiero się zaczął.'; return null; }
    if (!(cur.wk.by[userId] > 0)) { none = 'Skrzynie odbiera każdy, kto w tym tygodniu dołożył choć 1 punkt. Zrób coś dla klanu.'; return null; }
    const got = cur.wk.got[userId] || [];
    for (let t = 0; t < opened(cur.wk, x.ids.length); t++) if (!got.includes(t)) tiers.push(t);
    if (!tiers.length) { none = 'Nie ma nowej skrzyni do odebrania.'; return null; }
    return { ...cur, wk: { ...cur.wk, got: { ...cur.wk.got, [userId]: got.concat(tiers) } } };
  }, perm) as ClanState;
  if (!tiers.length) throw err(none || 'Nie ma nowej skrzyni do odebrania.', PRECONDITION);
  pushRewards(nk, userId, tiers.map(t => ({ why: `Skrzynia tygodnia klanu nr ${t + 1}`, r: chests[t] })));
  return JSON.stringify(view(nk, x, up, { claimed: tiers.length }));
}

/** Doświadczenie dla klanu (wojna, smok) z wpisem w kronice; nowy poziom ogłasza na czacie. */
export function addClanXp(nk: nkruntime.Nakama, groupId: string, xp: number, m: string, extra: (st: ClanState) => void = () => {}): void {
  const now = Date.now();
  const st0 = ensureState(nk, groupId, memberIds(nk, groupId));
  const before = clanLevelOf(st0.xp);
  const st = updateObject<ClanState>(nk, STATE, groupId, SYSTEM_USER, cur => {
    if (!cur) return null;
    const next: ClanState = { ...cur, xp: cur.xp + Math.max(0, Math.round(xp)), log: cur.log.slice() };
    addLog(next, m, now);
    extra(next);
    return next;
  }, perm) as ClanState;
  const after = clanLevelOf(st.xp);
  if (after > before) postClan(nk, groupId, { k: 'sys', t: `Wspólna Kuźnia osiąga ${after}. poziom! Nowa premia: ${CLAN_LEVELS[after - 1].d}.` });
}

function logEvent(nk: nkruntime.Nakama, x: Ctx, m: string): void {
  try {
    x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
      if (!cur) return null;
      const st = { ...cur, log: cur.log.slice() };
      addLog(st, m, x.now);
      return st;
    }, perm) as ClanState;
  } catch { /* kronika nie jest konieczna */ }
}
