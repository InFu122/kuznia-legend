// Misje dzienne i tygodniowe oraz kalendarz logowania.
import { DAILY_COUNT, LOGIN_DAYS, MISSIONS, SKILLS, TECH_UNLOCK_FORGE, WEEKLY_BOOKS, WEEKLY_COUNT, missionText, landDef } from '../data';
import { drawSkill, petsUnlocked, skillsUnlocked } from './companions';
import { toast, type Ctx } from './context';
import { goldWave, todayStr } from './formulas';
import { grant } from './reward';
import { shuffle } from './rng';
import type { GameState, Mission, MissionKind, Reward, SkillId } from './types';

/** Numer tygodnia (od poniedziałku) w czasie lokalnym. */
export function weekStr(now: number): string {
  const d = new Date(now);
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return 'w' + Math.floor((day + 3) / 7); // 1970-01-01 to czwartek
}

/** Misje, które gracz może już wykonać. */
function available(s: GameState, scope: 'daily' | 'weekly'): MissionKind[] {
  return (Object.keys(MISSIONS) as MissionKind[]).filter(k => {
    if (!MISSIONS[k][scope]) return false;
    switch (k) {
      case 'boss': case 'dung': return s.cleared[0];
      case 'research': return s.forge.lvl >= TECH_UNLOCK_FORGE;
      case 'scroll': return skillsUnlocked(s) && s.scrolls > 0;
      default: return true;
    }
  });
}

function roll(ctx: Ctx, scope: 'daily' | 'weekly', count: number): Mission[] {
  const pool = available(ctx.s, scope).filter(k => k !== 'smelt');
  const first: MissionKind[] = ['smelt']; // wytop zawsze jest w zestawie
  const kinds = [...first, ...shuffle(ctx.rng, pool)].slice(0, count);
  return kinds.map(kind => ({ kind, goal: MISSIONS[kind][scope], n: 0, claimed: false }));
}

/** Nowy dzień i nowy tydzień losują nowe misje. */
export function ensureMissions(ctx: Ctx): void {
  const s = ctx.s;
  const now = ctx.now();
  const day = todayStr(now), week = weekStr(now);
  if (s.missions.day !== day) {
    s.missions.day = day;
    s.missions.daily = roll(ctx, 'daily', DAILY_COUNT);
    s.missions.chest = false;
    ctx.dirty = true;
  }
  if (s.missions.week !== week) {
    s.missions.week = week;
    s.missions.weekly = roll(ctx, 'weekly', WEEKLY_COUNT);
    ctx.dirty = true;
  }
}

/** Liczy postęp misji. Wołane przez silnik przy wytopie, walce, lochach itd. */
export function track(ctx: Ctx, kind: MissionKind, n = 1): void {
  ensureMissions(ctx);
  for (const m of [...ctx.s.missions.daily, ...ctx.s.missions.weekly]) {
    if (m.kind !== kind || m.n >= m.goal) continue;
    m.n = Math.min(m.goal, m.n + n);
    if (m.n >= m.goal) toast(ctx, `Misja wykonana: ${missionText(m.kind, m.goal)} — odbierz nagrodę w Zadaniach`, 'good');
  }
}

export const missionReward = (s: GameState, scope: 'daily' | 'weekly'): Reward =>
  scope === 'daily' ? { gold: goldWave(s.bestG) * 25 } : { books: WEEKLY_BOOKS };

/** Skrzynia za komplet misji dziennych. */
export function chestReward(s: GameState): Reward {
  const L = landDef(s.maxLand);
  const r: Reward = { ores: { [L.main]: 12, [L.rare]: 3 }, books: 2 };
  if (skillsUnlocked(s)) r.scrolls = 1;
  if (petsUnlocked(s)) r.stones = 10;
  return r;
}

export function claimMission(ctx: Ctx, scope: 'daily' | 'weekly', i: number): Reward | null {
  ensureMissions(ctx);
  const m = ctx.s.missions[scope][i];
  if (!m || m.claimed || m.n < m.goal) return null;
  m.claimed = true;
  const r = missionReward(ctx.s, scope);
  grant(ctx, r);
  ctx.emit({ t: 'sfx', k: 'claim' });
  return r;
}

export const chestReady = (s: GameState) => !s.missions.chest && s.missions.daily.length > 0 && s.missions.daily.every(m => m.claimed);

export function claimChest(ctx: Ctx): Reward | null {
  if (!chestReady(ctx.s)) return null;
  ctx.s.missions.chest = true;
  const r = chestReward(ctx.s);
  grant(ctx, r);
  ctx.emit({ t: 'sfx', k: 'rare', r: 3 });
  return r;
}

/** Ile nagród czeka na odbiór (misje, skrzynia, kalendarz). */
export function claimable(ctx: Ctx): number {
  ensureMissions(ctx);
  const s = ctx.s;
  const done = (m: Mission) => m.n >= m.goal && !m.claimed;
  return s.missions.daily.filter(done).length + s.missions.weekly.filter(done).length + (chestReady(s) ? 1 : 0) + (canClaimLogin(ctx) ? 1 : 0);
}

/* ---------- kalendarz logowania ---------- */

export const canClaimLogin = (ctx: Ctx) => ctx.s.login.last !== todayStr(ctx.now());

/** Nagroda za dzień kalendarza (0–6). Dzień 7 losuje Zwój od rzadkości Epicki wzwyż. */
export function loginReward(s: GameState, idx: number): Reward {
  const L = landDef(s.maxLand);
  const g = goldWave(s.bestG);
  switch (idx) {
    case 0: return { gold: g * 60 };
    case 1: return { ores: { [L.main]: 10 } };
    case 2: return { books: 3 };
    case 3: return { scrolls: 2 };
    case 4: return { ores: { [L.rare]: 3 } };
    case 5: return { stones: 20, eggs: { 0: 1 } };
    default: return skillsUnlocked(s) ? {} : { scrolls: 3 };
  }
}

export function claimLogin(ctx: Ctx): { idx: number; reward: Reward; skill: { id: SkillId; dupe: boolean } | null } | null {
  const s = ctx.s;
  if (!canClaimLogin(ctx)) return null;
  const idx = s.login.idx % LOGIN_DAYS.length;
  const reward = loginReward(s, idx);
  grant(ctx, reward);
  const skill = idx === 6 && skillsUnlocked(s) ? drawSkill(ctx, 3) : null;
  s.login = { last: todayStr(ctx.now()), idx: (idx + 1) % LOGIN_DAYS.length };
  ctx.emit({ t: 'sfx', k: idx === 6 ? 'rare' : 'claim', r: 3 });
  if (skill) toast(ctx, `Epicki Zwój: ${SKILLS[skill.id].n}${skill.dupe ? ' (kopia)' : ''}`, 'good');
  ctx.dirty = true;
  return { idx, reward, skill };
}
