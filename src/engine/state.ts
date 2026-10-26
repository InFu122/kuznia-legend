import { B, LANDS } from '../data';
import type { Battle, GameState } from './types';

/** 2 = poziom przedmiotu liczony z poziomu kuźni (wcześniej z postępu w kampanii). */
export const SAVE_VERSION = 2;

export function newState(now: number): GameState {
  return {
    v: SAVE_VERSION, name: 'Kowal', gold: 0, ores: [10, 5, 0, 0, 0, 0, 0], els: {},
    forge: { lvl: 1, up: 0, left: 0 }, pity: 0, eq: {}, pending: null,
    cur: { land: 0, stage: 1, wave: 1 }, maxLand: 0, frontStage: 1, cleared: LANDS.map(() => false), bestG: 0,
    auto: false, oreSel: 1, elSel: null,
    smith: { fame: 0, sent: [], log: [] }, dung: { day: '', keys: B.DUNGEON_KEYS, best: 0 },
    stats: { smelted: 0, jumps: 0, kills: 0, bosses: 0 },
    speed: 1, savedAt: 0, lastSeen: now, nid: 1,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Uzupełnia brakujące pola starszego zapisu, żeby nowe wersje gry go wczytały. */
export function migrate(raw: unknown, now: number): GameState {
  const d = newState(now);
  if (!isObj(raw)) return d;
  const out = Object.assign(d, raw) as GameState;
  const fresh = newState(now);
  out.forge = Object.assign(fresh.forge, isObj(raw.forge) ? raw.forge : {});
  out.cur = Object.assign(fresh.cur, isObj(raw.cur) ? raw.cur : {});
  out.smith = Object.assign(fresh.smith, isObj(raw.smith) ? raw.smith : {});
  out.dung = Object.assign(fresh.dung, isObj(raw.dung) ? raw.dung : {});
  out.stats = Object.assign(fresh.stats, isObj(raw.stats) ? raw.stats : {});
  if (!Array.isArray(out.ores) || out.ores.length !== fresh.ores.length) out.ores = fresh.ores;
  if (!Array.isArray(out.cleared)) out.cleared = fresh.cleared;
  while (out.cleared.length < LANDS.length) out.cleared.push(false);
  if (!isObj(out.eq)) out.eq = {};
  if (!isObj(out.els)) out.els = {};
  const oldVersion = typeof raw.v === 'number' ? raw.v : 1;
  for (const it of [...Object.values(out.eq), out.pending]) {
    if (!it) continue;
    it.flvl ??= 0; it.forced ??= ''; it.kills ??= {}; it.bosses ??= 0; it.owners ??= [it.smith]; it.obieg ??= false; it.ls ??= 0; it.aw ??= null;
    if (oldVersion < 2) it.lvl = 2 * (it.flvl || out.forge.lvl) + 1;
  }
  out.maxLand = Math.min(out.maxLand, LANDS.length - 1);
  out.cur.land = Math.min(out.cur.land, out.maxLand);
  out.v = SAVE_VERSION;
  return out;
}

export function newBattle(): Battle {
  return { mode: 'camp', enemy: null, heroHp: 1, heroMax: 1, ht: 0, et: 0, pause: 0, dung: null, autoT: 0, obiegT: 75000 };
}
