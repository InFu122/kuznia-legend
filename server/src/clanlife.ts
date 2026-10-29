// Życie klanu (etap 4b): Wspólna Kuźnia Klanu (datki → Doświadczenie i poziom klanu z premiami),
// boss klanowy (wspólne zdrowie, 3 ataki dziennie, skrzynie dla wszystkich atakujących),
// pomoc w ulepszeniach kuźni i prośby o rudę. Monety klanowe i inne nagrody trafiają do kolejki nagród gracza;
// gra bierze każdą raz (numer w zapisie), a serwer usuwa je po zapisie z tym numerem.
//
// Magazyn:
//   clan_state/{groupId} (SYSTEM)  — stan klanu: Doświadczenie, boss, prośby, kronika,
//   clan/daily (gracz)             — dzienne liczniki: datki, ataki, dobre uczynki, czas ostatniej prośby o rudę,
//   clan/helped (gracz)            — ile pomocy dostał przy ulepszeniu na dany poziom (kontrola tempa kuźni),
//   clan/rewards (gracz)           — nagrody czekające na odbiór.
import { CLAN, CLAN_LEVELS, ORES, ORE_WANT, clanBossHp, clanBossOf, clanLevelOf } from '../../src/data';
import { clanAttackReward, clanBossChest, type ServerReward } from '../../src/engine/clan';
import type { Reward } from '../../src/engine/types';
import { clanOf, postClan } from './clan';
import { raidBrief } from './raid';
import { warBrief, warOnBossAttack } from './war';
import { INVALID, NOT_FOUND, PRECONDITION, SYSTEM_USER, err, parse, readSave, serverDay, serverRng, updateObject, userOf } from './common';
import { clanSeasonSettle, updateClanPower } from './clanrank';
import { nameOf } from './names';

interface HelpReq { uid: string; n: string; lvl: number; got: string[]; t: number }
interface OreReq { id: string; uid: string; n: string; ore: number; want: number; got: number; t: number }
interface Boss { lvl: number; hp: number; max: number; dmg: Record<string, number>; who: Record<string, string>; t: number }
export interface ClanState { xp: number; boss: Boss; kills: number; helps: HelpReq[]; ores: OreReq[]; log: { t: number; m: string; n?: number }[]; raidLvl?: number }
interface Daily { day: string; don: number; atk: number; deed: number; oreT: number }
type Helped = Record<string, number>;
interface Pending { list: ServerReward[] }

const STATE = 'clan_state';
const PENDING_MAX = 60;
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };

const myName = (nk: nkruntime.Nakama, userId: string) => nameOf(nk, userId) || 'Kowal';

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
  if (!ok) throw err('Na dziś limit wyczerpany — wróć jutro.', PRECONDITION);
  return out as Daily;
}

export function readHelped(nk: nkruntime.Nakama, userId: string): Helped {
  const o = nk.storageRead([{ collection: 'clan', key: 'helped', userId }]);
  return o.length ? (o[0].value as unknown as Helped) : {};
}

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

interface Ctx { userId: string; g: nkruntime.Group; ids: string[]; st: ClanState; now: number }

/** Sprzątanie: wygasłe prośby, prośby byłych członków, własna prośba o pomoc po zakończonym ulepszeniu. */
function tidy(nk: nkruntime.Nakama, c: Ctx, up: number | null): ClanState {
  const keep = (st: ClanState) => {
    const ids = new Set(c.ids);
    const helps = st.helps.filter(h => ids.has(h.uid) && c.now - h.t < CLAN.HELP_TTL_MS && h.got.length < CLAN.HELP_MAX
      && !(up !== null && h.uid === c.userId && h.lvl !== up));
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

function view(nk: nkruntime.Nakama, c: Ctx, up: number | null, extra: Record<string, unknown> = {}) {
  const { st, userId, now } = c;
  const d = readDaily(nk, userId, now);
  const helped = readHelped(nk, userId);
  const lvl = clanLevelOf(st.xp);
  const b = st.boss;
  const top = Object.entries(b.dmg).sort((x, y) => y[1] - x[1]);
  const rank = top.findIndex(([u]) => u === userId);
  const mine = st.helps.find(h => h.uid === userId) || null;
  const myOre = st.ores.find(o => o.uid === userId) || null;
  return {
    clan: { id: c.g.id, name: c.g.name, tag: ((c.g.metadata || {}) as { tag?: string }).tag || '' },
    lvl, xp: st.xp, cur: lvl ? CLAN_LEVELS[lvl - 1].xp : 0, next: lvl < CLAN_LEVELS.length ? CLAN_LEVELS[lvl].xp : null,
    boss: {
      n: clanBossOf(b.lvl).n, pal: clanBossOf(b.lvl).pal, lvl: b.lvl, hp: b.hp, max: b.max, kills: st.kills,
      mine: b.dmg[userId] || 0, rank: rank >= 0 ? rank + 1 : 0, fighters: top.length,
      top: top.slice(0, 5).map(([u, v]) => ({ n: b.who[u] || 'Kowal', d: v, me: u === userId })),
    },
    left: { don: Math.max(0, CLAN.DONATE_PER_DAY - d.don), atk: Math.max(0, CLAN.BOSS_ATTACKS - d.atk), deed: Math.max(0, CLAN.DEEDS_PER_DAY - d.deed) },
    oreNext: d.oreT ? d.oreT + CLAN.ORE_COOLDOWN_MS : 0,
    helps: st.helps.filter(h => h.uid !== userId).map(h => ({ uid: h.uid, n: h.n, lvl: h.lvl, got: h.got.length, done: h.got.includes(userId) })),
    myHelp: mine ? { lvl: mine.lvl, got: mine.got.length } : null,
    helped: up ? { lvl: up, n: Math.min(CLAN.HELP_MAX, helped[String(up)] || 0) } : null,
    ores: st.ores.filter(o => o.uid !== userId).map(o => ({ id: o.id, n: o.n, ore: o.ore, want: o.want, got: o.got })),
    myOre: myOre ? { id: myOre.id, ore: myOre.ore, want: myOre.want, got: myOre.got } : null,
    log: st.log.slice(-15).reverse(),
    rewards: readPending(nk, userId),
    serverTime: now,
    ...extra,
  };
}

/** Kontekst klanu gracza albo błąd, gdy nie jest w klanie. */
function clanCtx(nk: nkruntime.Nakama, userId: string): Ctx {
  const c = clanOf(nk, userId);
  if (!c) throw err('Nie jesteś w klanie.', PRECONDITION);
  const ids = memberIds(nk, c.g.id);
  return { userId, g: c.g, ids, st: ensureState(nk, c.g.id, ids), now: Date.now() };
}

/** Poziom ulepszenia kuźni podany przez grę (sprawdzony z zapisem: najwyżej o 2 ponad zapisany poziom). */
function upOf(nk: nkruntime.Nakama, userId: string, raw: unknown): number | null {
  const up = Math.floor(Number(raw));
  if (!Number.isFinite(up) || up <= 1) return 0;
  const s = readSave(nk, userId);
  const lvl = s ? s.value.state.forge.lvl : 1;
  return up <= lvl + 2 && up <= 30 ? up : null;
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
  const x = clanCtx(nk, userId);
  x.st = tidy(nk, x, up);
  try { updateClanPower(nk, x.g, x.ids, clanLevelOf(x.st.xp)); } catch { /* ranking nie jest konieczny */ }
  const extra: Record<string, unknown> = {};
  try { extra.war = warBrief(nk, ctx, userId, x.g); extra.raid = raidBrief(nk, ctx, userId, x.g); } catch { /* skrót nie jest konieczny */ }
  return JSON.stringify(view(nk, x, up, extra));
}

/** Datek do Wspólnej Kuźni: Doświadczenie dla klanu, Monety dla gracza. Złoto płaci gra. */
export function rpcClanDonate(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const x = clanCtx(nk, userId);
  const up = upOf(nk, userId, parse(payload).up);
  bumpDaily(nk, userId, x.now, d => (d.don < CLAN.DONATE_PER_DAY ? (d.don++, true) : false));
  const who = myName(nk, userId);
  const before = clanLevelOf(x.st.xp);
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    const st = { ...cur, xp: cur.xp + CLAN.DONATE_XP, log: cur.log.slice() };
    addLog(st, `${who} wspiera Wspólną Kuźnię`, x.now);
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
  const x = clanCtx(nk, userId);
  const up = upOf(nk, userId, parse(payload).up);
  const save = readSave(nk, userId);
  const power = Math.max(1, save ? save.value.power || 0 : 0);
  const bestG = save ? save.value.state.bestG || 0 : 0;
  bumpDaily(nk, userId, x.now, d => (d.atk < CLAN.BOSS_ATTACKS ? (d.atk++, true) : false));
  const rng = serverRng(nk);
  const roll = Math.round(power * (1 - CLAN.BOSS_SPREAD + 2 * CLAN.BOSS_SPREAD * rng.next()));
  const who = myName(nk, userId);
  const nextPower = clanPower(nk, x.ids);
  let dealt = 0;
  let killed: Boss | null = null;
  const before = clanLevelOf(x.st.xp);
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    const b: Boss = { ...cur.boss, dmg: { ...cur.boss.dmg }, who: { ...cur.boss.who } };
    const st: ClanState = { ...cur, boss: b, log: cur.log.slice() };
    dealt = Math.min(roll, b.hp);
    b.hp -= dealt;
    b.dmg[userId] = (b.dmg[userId] || 0) + dealt;
    b.who[userId] = who;
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
  pushRewards(nk, userId, [{ why: 'Atak na bossa klanowego', r: clanAttackReward(bestG) }]);
  try { warOnBossAttack(nk, ctx, userId, x.g, x.now); } catch { /* wojna nie blokuje ataku na bossa */ }

  const k = killed as Boss | null;
  if (k) {
    const ranked = Object.entries(k.dmg).sort((a, b) => b[1] - a[1]);
    const saves = nk.storageRead(ranked.map(([u]) => ({ collection: 'save', key: 'state', userId: u })));
    const best: Record<string, number> = {};
    for (const o of saves) best[o.userId] = ((o.value as { state?: { bestG?: number } }).state || {}).bestG || 0;
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

/** Prośba o pomoc przy trwającym ulepszeniu kuźni na poziom `up`. */
export function rpcClanHelpAsk(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const up = upOf(nk, userId, parse(payload).up);
  if (!up) throw err('Pomoc przydaje się w czasie ulepszenia kuźni.', PRECONDITION);
  const x = clanCtx(nk, userId);
  const have = Math.min(CLAN.HELP_MAX, readHelped(nk, userId)[String(up)] || 0);
  if (have >= CLAN.HELP_MAX) throw err('To ulepszenie dostało już pełną pomoc klanu.', PRECONDITION);
  const who = myName(nk, userId);
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    const old = cur.helps.find(h => h.uid === userId);
    if (old && old.lvl === up) return null;
    const helps = cur.helps.filter(h => h.uid !== userId);
    helps.push({ uid: userId, n: who, lvl: up, got: [], t: x.now });
    return { ...cur, helps };
  }, perm) as ClanState;
  return JSON.stringify(view(nk, x, up));
}

/** Pomoc klanowiczom w ulepszeniach (wszystkim naraz albo jednej osobie `uid`). */
export function rpcClanHelp(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const only = typeof req.uid === 'string' ? req.uid : '';
  const x = clanCtx(nk, userId);
  const up = upOf(nk, userId, req.up);
  const ids = new Set(x.ids);
  let done: HelpReq[] = [];
  x.st = updateObject<ClanState>(nk, STATE, x.g.id, SYSTEM_USER, cur => {
    if (!cur) return null;
    done = [];
    const helps = cur.helps.map(h => {
      if (h.uid === userId || (only && h.uid !== only) || !ids.has(h.uid) || h.got.includes(userId) || h.got.length >= CLAN.HELP_MAX) return h;
      const n = { ...h, got: h.got.concat(userId) };
      done.push(n);
      return n;
    });
    if (!done.length) return null;
    return { ...cur, helps: helps.filter(h => h.got.length < CLAN.HELP_MAX) };
  }, perm) as ClanState;
  if (!done.length) throw err('Nie ma komu pomóc — wszystkie prośby mają już twoją pomoc.', PRECONDITION);
  for (const h of done) {
    updateObject<Helped>(nk, 'clan', 'helped', h.uid, cur => {
      const m: Helped = { ...(cur || {}) };
      if ((m[String(h.lvl)] || 0) >= h.got.length) return null;
      m[String(h.lvl)] = Math.min(CLAN.HELP_MAX, h.got.length);
      return m;
    }, perm);
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
  const x = clanCtx(nk, userId);
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
  updateObject<Daily>(nk, 'clan', 'daily', userId, cur => ({ ...(cur && cur.day === serverDay(x.now) ? cur : freshDaily(serverDay(x.now))), oreT: x.now }), perm);
  return JSON.stringify(view(nk, x, up));
}

/** Dar rudy dla klanowicza (najwyżej 5 sztuk naraz). Rudę odejmuje gra po odpowiedzi serwera (`given`). */
export function rpcClanOreGive(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const id = String(req.id || '');
  const n = Math.max(1, Math.min(CLAN.ORE_GIVE_MAX, Math.floor(Number(req.n)) || 0));
  const x = clanCtx(nk, userId);
  const up = upOf(nk, userId, req.up);
  const ids = new Set(x.ids);
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
    return { ...cur, ores: cur.ores.map(o => (o.id === id ? t : o)).filter(o => o.got < o.want) };
  }, perm) as ClanState;
  const r = to as OreReq | null;
  if (!r || !given) throw err('Ta prośba jest już spełniona albo wygasła.', NOT_FOUND);
  const who = myName(nk, userId);
  pushRewards(nk, r.uid, [{ why: `Ruda od: ${who}`, r: { ores: { [r.ore]: given } } }]);
  const paid = deedReward(nk, userId, x.now, 1, 'Dar rudy dla klanu');
  if (r.got >= r.want) logEvent(nk, x, `${r.n} dostaje komplet rudy (${ORES[r.ore].n} × ${r.want})`);
  return JSON.stringify(view(nk, x, up, { given, paid }));
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
