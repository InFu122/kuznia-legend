import { DUNGEONS, DUNG_ORDER, LANDS, SKILL_SLOTS, TUTORIAL } from '../data';
import type { Battle, DungId, Fx, GameState } from './types';

/**
 * Wersje zapisu:
 * 2 — poziom przedmiotu liczony z poziomu kuźni (wcześniej z postępu w kampanii),
 * 3 — technologie, Księgi Wiedzy, rudy unikalne, wiele lochów,
 * 4 — umiejętności, chowańce, wierzchowce, Kamienie, Pieczęcie Legendy, kolejne lochy,
 * 5 — misje, kalendarz logowania, samouczek, ustawienia dźwięku,
 * 6 — ziarna wytopu z serwera, prawdziwy Wielki Obieg,
 * 7 — życie klanu: poziom klanu, Monety i sklep klanowy, pomoc w ulepszeniach.
 */
export const SAVE_VERSION = 7;

function newDungeons(): GameState['dungeons'] {
  const d = {} as GameState['dungeons'];
  for (const id of DUNG_ORDER) d[id] = { day: '', keys: DUNGEONS[id].keys, best: 0 };
  return d;
}

export function newState(now: number): GameState {
  return {
    v: SAVE_VERSION, name: 'Kowal', gold: 0, ores: [10, 5, 0, 0, 0, 0, 0], els: {},
    forge: { lvl: 1, up: 0, left: 0 }, pity: 0, eq: {}, pending: null,
    cur: { land: 0, stage: 1, wave: 1 }, maxLand: 0, frontStage: 1, cleared: LANDS.map(() => false), bestG: 0,
    auto: false, oreSel: 1, elSel: null,
    smith: { fame: 0, sent: [], log: [] },
    dungeons: newDungeons(), books: 0, uniq: {}, uniqSel: null, tech: { lv: {}, cur: null },
    scrolls: 0, skills: { lv: {}, cards: {}, eq: Array(SKILL_SLOTS).fill(null) },
    eggs: [0, 0, 0, 0, 0], hatch: null, pets: {}, petSel: null,
    saddles: 0, mounts: {}, mountSel: null, stones: 0, seals: 0, found: [],
    missions: { day: '', daily: [], chest: false, week: '', weekly: [] }, login: { last: '', idx: 0 }, tut: 0,
    opts: { sound: true, vol: 0.6 },
    stats: { smelted: 0, jumps: 0, kills: 0, bosses: 0 },
    sx: 0, seeds: [], obIn: [], obOut: [],
    clanLvl: 0, clanCoins: 0, clanShop: { week: '', n: {} }, clanHelp: { lvl: 0, n: 0 }, clanGot: [],
    speed: 1, savedAt: 0, lastSeen: now, nid: 1,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Uzupełnia brakujące pola starszego zapisu, żeby nowe wersje gry go wczytały. */
export function migrate(raw: unknown, now: number): GameState {
  const d = newState(now);
  if (!isObj(raw)) return d;
  const out = Object.assign(d, raw) as GameState & { dung?: { day: string; keys: number; best: number } };
  const fresh = newState(now);
  out.forge = Object.assign(fresh.forge, isObj(raw.forge) ? raw.forge : {});
  out.cur = Object.assign(fresh.cur, isObj(raw.cur) ? raw.cur : {});
  out.smith = Object.assign(fresh.smith, isObj(raw.smith) ? raw.smith : {});
  out.stats = Object.assign(fresh.stats, isObj(raw.stats) ? raw.stats : {});
  out.tech = Object.assign(fresh.tech, isObj(raw.tech) ? raw.tech : {});
  if (!isObj(out.tech.lv)) out.tech.lv = {};
  const dungeons = isObj(raw.dungeons) ? raw.dungeons : {};
  out.dungeons = fresh.dungeons;
  for (const id of DUNG_ORDER) if (isObj(dungeons[id])) Object.assign(out.dungeons[id as DungId], dungeons[id]);
  if (isObj(raw.dung)) Object.assign(out.dungeons.sztolnia, raw.dung); // zapis sprzed wersji 3
  delete out.dung;
  if (!Array.isArray(out.ores) || out.ores.length !== fresh.ores.length) out.ores = fresh.ores;
  if (!Array.isArray(out.cleared)) out.cleared = fresh.cleared;
  while (out.cleared.length < LANDS.length) out.cleared.push(false);
  if (!isObj(out.eq)) out.eq = {};
  if (!isObj(out.els)) out.els = {};
  if (!isObj(out.uniq)) out.uniq = {};
  if (typeof out.books !== 'number') out.books = 0;
  out.skills = Object.assign(fresh.skills, isObj(raw.skills) ? raw.skills : {});
  if (!isObj(out.skills.lv)) out.skills.lv = {};
  if (!isObj(out.skills.cards)) out.skills.cards = {};
  if (!Array.isArray(out.skills.eq)) out.skills.eq = fresh.skills.eq;
  while (out.skills.eq.length < SKILL_SLOTS) out.skills.eq.push(null);
  if (!Array.isArray(out.eggs) || out.eggs.length !== 5) out.eggs = fresh.eggs;
  for (const k of ['pets', 'mounts'] as const) if (!isObj(out[k])) out[k] = {};
  for (const k of ['scrolls', 'saddles', 'stones', 'seals'] as const) if (typeof out[k] !== 'number') out[k] = 0;
  if (!Array.isArray(out.found)) out.found = [];
  out.missions = Object.assign(fresh.missions, isObj(raw.missions) ? raw.missions : {});
  if (!Array.isArray(out.missions.daily) || !Array.isArray(out.missions.weekly)) out.missions = fresh.missions;
  out.login = Object.assign(fresh.login, isObj(raw.login) ? raw.login : {});
  out.opts = Object.assign(fresh.opts, isObj(raw.opts) ? raw.opts : {});
  if (typeof out.tut !== 'number') out.tut = 0;
  if (typeof out.sx !== 'number' || !(out.sx >= 0)) out.sx = 0;
  if (!Array.isArray(out.seeds)) out.seeds = [];
  if (!Array.isArray(out.obIn)) out.obIn = [];
  if (!Array.isArray(out.obOut)) out.obOut = [];
  if (typeof out.clanLvl !== 'number' || !(out.clanLvl >= 0)) out.clanLvl = 0;
  if (typeof out.clanCoins !== 'number' || !(out.clanCoins >= 0)) out.clanCoins = 0;
  if (!isObj(out.clanShop) || !isObj(out.clanShop.n)) out.clanShop = fresh.clanShop;
  if (!isObj(out.clanHelp) || typeof out.clanHelp.lvl !== 'number' || typeof out.clanHelp.n !== 'number') out.clanHelp = fresh.clanHelp;
  if (!Array.isArray(out.clanGot)) out.clanGot = [];
  const oldVersion = typeof raw.v === 'number' ? raw.v : 1;
  for (const it of [...Object.values(out.eq), out.pending, ...out.found, ...out.obIn, ...out.obOut]) {
    if (!it) continue;
    it.flvl ??= 0; it.forced ??= ''; it.kills ??= {}; it.bosses ??= 0; it.owners ??= [it.smith]; it.obieg ??= false; it.ls ??= 0; it.aw ??= null;
    it.set ??= null;
    if (oldVersion < 2) it.lvl = 2 * (it.flvl || out.forge.lvl) + 1;
  }
  if (oldVersion < 5 && out.stats.smelted > 0) out.tut = TUTORIAL.length; // stary gracz nie potrzebuje samouczka
  out.maxLand = Math.min(out.maxLand, LANDS.length - 1);
  out.cur.land = Math.min(out.cur.land, out.maxLand);
  out.v = SAVE_VERSION;
  return out;
}

export function newFx(): Fx {
  return { cd: Array(SKILL_SLOTS).fill(1500), dmgT: 0, dmgV: 0, spdT: 0, spdV: 0, lsT: 0, lsV: 0, shield: 0, shieldT: 0, stunT: 0 };
}

export function newBattle(): Battle {
  return { mode: 'camp', enemy: null, heroHp: 1, heroMax: 1, ht: 0, et: 0, pt: 0, pause: 0, dung: null, autoT: 0, obiegT: 75000, fx: newFx() };
}
