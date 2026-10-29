import { BATCH_OPTIONS, DUNGEONS, DUNG_ORDER, LANDS, SKILL_SLOTS, TUTORIAL } from '../data';
import type { Battle, DungId, Fx, GameState } from './types';

/**
 * Wersje zapisu:
 * 2 — poziom przedmiotu liczony z poziomu kuźni (wcześniej z postępu w kampanii),
 * 3 — technologie, Księgi Wiedzy, rudy unikalne, wiele lochów,
 * 4 — umiejętności, chowańce, wierzchowce, Kamienie, Pieczęcie Legendy, kolejne lochy,
 * 5 — misje, kalendarz logowania, samouczek, ustawienia dźwięku,
 * 6 — ziarna wytopu z serwera, prawdziwy Wielki Obieg,
 * 7 — życie klanu: poziom klanu, Monety i sklep klanowy, pomoc w ulepszeniach,
 * 8 — auto-wytop do wybranej rzadkości, nowe tempo gry (dłuższe ulepszenia kuźni, mniej złota, rozkłady rud krain),
 * 9 — Klejnoty, sklep, Przepustka Kowala, wzmocnienia z reklam, przyspieszenia kuźni,
 * 10 — Dziedzictwo (pokolenie, Gwiazdy Mistrza, Pamiątka Rodu),
 * 11 — runy slotów,
 * 12 — osiągnięcia i Kolekcja Kowala.
 */
export const SAVE_VERSION = 13;

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
    auto: false, autoStop: 0, oreSel: 1, batch: 1, elSel: null,
    smith: { fame: 0, sent: [], log: [] },
    dungeons: newDungeons(), books: 0, uniq: {}, uniqSel: null, tech: { lv: {}, cur: null },
    scrolls: 0, skills: { lv: {}, cards: {}, eq: Array(SKILL_SLOTS).fill(null) },
    eggs: [0, 0, 0, 0, 0], hatch: null, pets: {}, petSel: null,
    saddles: 0, mounts: {}, mountSel: null, stones: 0, seals: 0, found: [],
    missions: { day: '', daily: [], chest: false, week: '', weekly: [] }, login: { last: '', idx: 0 }, tut: 0,
    opts: { sound: true, vol: 0.6, music: true, mvol: 0.5, notify: true },
    stats: { smelted: 0, jumps: 0, kills: 0, bosses: 0, keys: 0, bestR: -1 },
    sx: 0, seeds: [], obIn: [], obOut: [],
    clanLvl: 0, clanCoins: 0, clanShop: { week: '', n: {} }, clanHelp: { lvl: 0, n: 0 }, clanGot: [],
    gems: 0, shop: { day: '', n: {}, ads: {}, gift: '', once: [] }, buffs: {}, pass: null, event: null, boost: { lvl: 0, ms: 0 },
    runes: {}, codex: [], ach: {}, legacy: { gen: 0, stars: 0, item: null },
    speed: 1, savedAt: 0, lastSeen: now, nid: 1,
  };
}

/** Dawne wieści „X trafił do Wielkiego Obiegu.” (po jednej na przedmiot) łączą się w jeden wpis z licznikiem. */
function mergeSentLog(log: GameState['smith']['log']): GameState['smith']['log'] {
  const out: GameState['smith']['log'] = [];
  for (const l of log) {
    const m = !l.k && typeof l.m === 'string' ? /^(.*) trafił do Wielkiego Obiegu\.$/.exec(l.m) : null;
    const e = m ? { t: l.t, m: m[1], k: 'sent' as const, n: 1 } : l;
    const prev = out[out.length - 1];
    if (e.k === 'sent' && prev?.k === 'sent') prev.n = (prev.n ?? 1) + (e.n ?? 1);
    else out.push(e);
  }
  return out;
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
  if (!Array.isArray(out.smith.log)) out.smith.log = [];
  out.smith.log = mergeSentLog(out.smith.log);
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
  if (typeof out.autoStop !== 'number') out.autoStop = 0;
  // Wytop seryjny: tylko dostępne mnożniki (dawne ×5 i ×10 → ×3).
  if (typeof out.batch !== 'number' || !(out.batch >= 1)) out.batch = 1;
  out.batch = Math.max(...BATCH_OPTIONS.map(([n]) => n).filter(n => n <= out.batch));
  if (typeof out.clanLvl !== 'number' || !(out.clanLvl >= 0)) out.clanLvl = 0;
  if (typeof out.clanCoins !== 'number' || !(out.clanCoins >= 0)) out.clanCoins = 0;
  if (!isObj(out.clanShop) || !isObj(out.clanShop.n)) out.clanShop = fresh.clanShop;
  if (!isObj(out.clanHelp) || typeof out.clanHelp.lvl !== 'number' || typeof out.clanHelp.n !== 'number') out.clanHelp = fresh.clanHelp;
  if (!Array.isArray(out.clanGot)) out.clanGot = [];
  if (typeof out.gems !== 'number' || !(out.gems >= 0)) out.gems = 0;
  if (!isObj(out.shop) || !isObj(out.shop.n) || !isObj(out.shop.ads)) out.shop = fresh.shop;
  if (!Array.isArray(out.shop.once)) out.shop.once = [];
  if (!isObj(out.buffs)) out.buffs = {};
  if (!isObj(out.pass) || !isObj(out.pass.base) || typeof out.pass.season !== 'number') out.pass = null;
  if (!isObj(out.event) || !isObj(out.event.base) || typeof out.event.ev !== 'number' || typeof out.event.pts !== 'number') out.event = null;
  if (!isObj(out.boost) || typeof out.boost.lvl !== 'number' || typeof out.boost.ms !== 'number') out.boost = fresh.boost;
  if (!isObj(out.runes)) out.runes = {};
  if (!isObj(out.ach)) out.ach = {};
  if (!Array.isArray(raw.codex)) {
    // Kolekcja Kowala w starym zapisie: modele przedmiotów, które gracz ma teraz
    const have = [...Object.values(out.eq), out.legacy?.item, ...(Array.isArray(out.found) ? out.found : [])].filter((x): x is NonNullable<typeof x> => !!x && typeof x.kind === 'string');
    out.codex = [...new Set(have.map(it => `${it.kind}|${it.ore}`))];
  }
  if (!isObj(raw.stats) || typeof raw.stats.bestR !== 'number') out.stats.bestR = Math.max(-1, ...Object.values(out.eq).map(it => it?.r ?? -1));
  if (!isObj(out.legacy) || typeof out.legacy.gen !== 'number' || typeof out.legacy.stars !== 'number') out.legacy = fresh.legacy;
  if (!isObj(out.legacy.item)) out.legacy.item = null;
  const oldVersion = typeof raw.v === 'number' ? raw.v : 1;
  for (const it of [...Object.values(out.eq), out.pending, ...out.found, ...out.obIn, ...out.obOut, out.legacy.item]) {
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
