// Rajd klanowy „Smocze Leże” — co tydzień nowy smok o czterech fazach. Każda faza ma słabość na jeden żywioł:
// założone przedmioty z tym żywiołem zwiększają obrażenia (+10% za każdy, najwyżej +40%).
// Każdy ma 2 ataki dziennie (dzień według zegara wojny klanów). Przełamanie fazy daje skrzynię wszystkim, którzy w niej walczyli
// (z rudą żywiołu na następną fazę), pokonanie smoka — wielką skrzynię, Doświadczenie klanu i silniejszego smoka za tydzień.
//
// Magazyn (SYSTEM): raid/{tydzień}:{klan}. Poziom smoka klanu: clan_state.raidLvl.
import { RAID, RAID_PHASES, raidPhaseHp } from '../../src/data';
import { raidAttackReward, raidFinalChest, raidPhaseChest } from '../../src/engine/clan';
import type { GameState } from '../../src/engine/types';
import { clanOf, postClan } from './clan';
import { addClanXp, clanPower, memberIds, pushRewards, readPending, readState } from './clanlife';
import { PRECONDITION, SYSTEM_USER, err, readSave, serverRng, updateObject, userOf } from './common';
import { nameOf } from './names';
import { warClock, type WarClock } from './war';

const RAID_C = 'raid';
const DAY_MS = 86400000;
const LOG_MAX = 20;
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };

interface Raid {
  week: string; lvl: number; ph: number; hp: number; max: number;
  dmg: Record<string, number>;   // obrażenia w całym rajdzie
  pd: Record<string, number>;    // obrażenia w bieżącej fazie
  who: Record<string, string>;
  used: Record<string, { d: string; n: number }>; // ataki gracza w danym dniu
  done: boolean; t: number; log: { t: number; m: string }[];
}
const dayKey = (c: WarClock) => c.week + ':' + c.day;
const usedToday = (r: Raid, userId: string, c: WarClock) => { const u = (r.used || {})[userId]; return u && u.d === dayKey(c) ? u.n : 0; };

const keyOf = (week: string, g: string) => week + ':' + g;

function readRaid(nk: nkruntime.Nakama, week: string, g: string): Raid | null {
  const o = nk.storageRead([{ collection: RAID_C, key: keyOf(week, g), userId: SYSTEM_USER }]);
  return o.length ? (o[0].value as unknown as Raid) : null;
}

/** Smok klanu w tym tygodniu (zdrowie według Mocy klanu z chwili pojawienia się smoka). */
function ensureRaid(nk: nkruntime.Nakama, week: string, g: string, now: number): Raid {
  const cur = readRaid(nk, week, g);
  if (cur) return cur;
  const lvl = readState(nk, g)?.raidLvl || 0;
  const max = raidPhaseHp(clanPower(nk, memberIds(nk, g)), lvl);
  const fresh: Raid = { week, lvl, ph: 0, hp: max, max, dmg: {}, pd: {}, who: {}, used: {}, done: false, t: now, log: [] };
  return updateObject<Raid>(nk, RAID_C, keyOf(week, g), SYSTEM_USER, c => (c ? null : fresh), perm) as Raid;
}

/** Słabość bieżącej fazy i premia gracza za założone przedmioty z tym żywiołem. */
function weakOf(s: GameState | null, ph: number) {
  const el = RAID_PHASES[Math.min(ph, RAID_PHASES.length - 1)].weak;
  const n = s ? Object.values(s.eq).filter(it => it && it.el === el).length : 0;
  return { el, n, bonus: Math.min(RAID.WEAK_MAX, n * RAID.WEAK_PER_ITEM) };
}

function view(nk: nkruntime.Nakama, clock: WarClock, r: Raid, userId: string, now: number, extra: Record<string, unknown> = {}) {
  const top = Object.entries(r.dmg).sort((a, b) => b[1] - a[1]);
  const rank = top.findIndex(([u]) => u === userId);
  const save = readSave(nk, userId);
  return {
    week: r.week, ends: clock.ends + (6 - clock.day) * DAY_MS, lvl: r.lvl, ph: r.ph, hp: r.hp, max: r.max, done: r.done,
    mine: r.dmg[userId] || 0, phase: r.pd[userId] || 0, rank: rank >= 0 ? rank + 1 : 0, fighters: top.length,
    top: top.slice(0, 5).map(([u, v]) => ({ n: r.who[u] || 'Kowal', d: v, me: u === userId })),
    left: r.done ? 0 : Math.max(0, RAID.ATTACKS - usedToday(r, userId, clock)),
    weak: weakOf(save ? save.value.state : null, r.ph),
    log: r.log.slice(-8).reverse(),
    rewards: readPending(nk, userId),
    serverTime: now,
    ...extra,
  };
}

function myClan(nk: nkruntime.Nakama, userId: string): nkruntime.Group {
  const c = clanOf(nk, userId);
  if (!c) throw err('Nie jesteś w klanie.', PRECONDITION);
  return c.g;
}

/** Stan smoka w tym tygodniu. */
export function rpcRaidState(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const g = myClan(nk, userId);
  const now = Date.now();
  const clock = warClock(nk, ctx, now);
  return JSON.stringify(view(nk, clock, ensureRaid(nk, clock.week, g.id, now), userId, now));
}

/** Atak na smoka: obrażenia z Mocy liczonej przez serwer i premii żywiołu. */
export function rpcRaidAttack(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const g = myClan(nk, userId);
  const now = Date.now();
  const clock = warClock(nk, ctx, now);
  let r = ensureRaid(nk, clock.week, g.id, now);
  if (r.done) throw err('Smok pokonany — następny pojawi się w poniedziałek.', PRECONDITION);
  const save = readSave(nk, userId);
  const power = Math.max(1, save ? save.value.power || 0 : 0);
  const bestG = save ? save.value.state.bestG || 0 : 0;
  if (usedToday(r, userId, clock) >= RAID.ATTACKS) throw err('Na dziś ataki na smoka wykorzystane — wróć jutro.', PRECONDITION);
  const w = weakOf(save ? save.value.state : null, r.ph);
  const roll = Math.round(power * RAID.DMG_MULT * (1 - RAID.SPREAD + 2 * RAID.SPREAD * serverRng(nk).next()) * (1 + w.bonus));
  const who = nameOf(nk, userId) || 'Kowal';
  let dealt = 0;
  let broke: { ph: number; pd: Record<string, number> } | null = null;
  let killed = false;
  let limit = false;
  r = updateObject<Raid>(nk, RAID_C, keyOf(clock.week, g.id), SYSTEM_USER, cur => {
    dealt = 0; broke = null; killed = false; limit = false;
    if (!cur || cur.done) return null;
    const n = usedToday(cur, userId, clock);
    if (n >= RAID.ATTACKS) { limit = true; return null; }
    const x: Raid = { ...cur, dmg: { ...cur.dmg }, pd: { ...cur.pd }, who: { ...cur.who }, used: { ...(cur.used || {}), [userId]: { d: dayKey(clock), n: n + 1 } }, log: cur.log.slice() };
    dealt = Math.min(roll, x.hp);
    x.hp -= dealt;
    x.dmg[userId] = (x.dmg[userId] || 0) + dealt;
    x.pd[userId] = (x.pd[userId] || 0) + dealt;
    x.who[userId] = who;
    if (x.hp <= 0) {
      broke = { ph: x.ph, pd: x.pd };
      x.log.push({ t: now, m: `${who} przełamuje fazę „${RAID_PHASES[x.ph].n}”` });
      x.ph++;
      x.pd = {};
      if (x.ph >= RAID_PHASES.length) { x.done = true; killed = true; x.hp = 0; x.log.push({ t: now, m: `${who} zadaje ostatni cios — smok pokonany!` }); }
      else x.hp = x.max;
    }
    if (x.log.length > LOG_MAX) x.log.splice(0, x.log.length - LOG_MAX);
    return x;
  }, perm) as Raid;
  if (limit) throw err('Na dziś ataki na smoka wykorzystane — wróć jutro.', PRECONDITION);
  if (!dealt) throw err('Smok pokonany — następny pojawi się w poniedziałek.', PRECONDITION);
  pushRewards(nk, userId, [{ why: 'Atak na smoka', r: raidAttackReward(bestG) }]);

  const lvl = r.lvl;
  const best = (ids: string[]) => {
    const m: Record<string, number> = {};
    for (const o of nk.storageRead(ids.map(u => ({ collection: 'save', key: 'state', userId: u })))) {
      m[o.userId] = ((o.value as { state?: { bestG?: number } }).state || {}).bestG || 0;
    }
    return m;
  };
  const b = broke as { ph: number; pd: Record<string, number> } | null;
  if (b) {
    const ids = Object.keys(b.pd);
    const bg = best(ids);
    const name = RAID_PHASES[b.ph].n;
    for (const u of ids) { try { pushRewards(nk, u, [{ why: `Smocze Leże: faza „${name}”`, r: raidPhaseChest(b.ph, lvl, bg[u] || 0) }]); } catch { /* następna osoba */ } }
    if (!killed) postClan(nk, g.id, { k: 'sys', t: `Smocze Leże: faza „${name}” przełamana (${who})! Skrzynie dla ${ids.length} walczących. Teraz: ${RAID_PHASES[b.ph + 1].d}` });
  }
  if (killed) {
    const ranked = Object.entries(r.dmg).sort((x, y) => y[1] - x[1]);
    const bg = best(ranked.map(([u]) => u));
    ranked.forEach(([u], i) => {
      try { pushRewards(nk, u, [{ why: `Smocze Leże (poz. ${lvl + 1}): smok pokonany${i < 3 ? `, ${i + 1}. miejsce` : ''}`, r: raidFinalChest(lvl, i, bg[u] || 0) }]); } catch { /* następna osoba */ }
    });
    try {
      addClanXp(nk, g.id, RAID.KILL_XP + RAID.KILL_XP_LVL * lvl, `Smocze Leże: smok poziomu ${lvl + 1} pokonany`, st => { st.raidLvl = Math.max(st.raidLvl || 0, lvl + 1); });
    } catch { /* Doświadczenie przy następnej okazji */ }
    const podium = ranked.slice(0, 3).map(([u], i) => `${i + 1}. ${r.who[u] || 'Kowal'}`).join(', ');
    postClan(nk, g.id, { k: 'sys', t: `Smok poziomu ${lvl + 1} pokonany! ${podium}. Wielkie skrzynie czekają w zakładce Klan.` });
  }
  return JSON.stringify(view(nk, clock, r, userId, now, { hit: { dmg: dealt, bonus: w.bonus, phase: b ? b.ph : -1, killed } }));
}

/** Skrót dla clan_sync (kropki w grze): ataki na smoka do wykorzystania dziś. */
export function raidBrief(nk: nkruntime.Nakama, ctx: nkruntime.Context, userId: string, g: nkruntime.Group): { left: number; done: boolean } {
  const clock = warClock(nk, ctx, Date.now());
  const r = readRaid(nk, clock.week, g.id);
  if (!r) return { left: RAID.ATTACKS, done: false };
  return { left: r.done ? 0 : Math.max(0, RAID.ATTACKS - usedToday(r, userId, clock)), done: r.done };
}
