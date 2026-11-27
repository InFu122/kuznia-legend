/// <reference path="../server/types/nakama-runtime.d.ts" />
// Arena na serwerze tak jak w Nakamie: moduł złożony jak server/build.mjs, zmienne globalne zamrożone po starcie,
// a potem lista przeciwników i kilka walk (z duchami i z innym graczem) na prostej atrapie Nakamy.
import { describe, expect, it } from 'vitest';
import { buildSync } from 'esbuild';
import vm from 'node:vm';
import { B } from '../src/data';
import { newState } from '../src/engine/state';
import type { GameState } from '../src/engine/types';

const code = buildSync({
  entryPoints: ['server/src/main.ts'], bundle: true, format: 'esm', platform: 'neutral', target: 'es2017', write: false, logLevel: 'silent',
}).outputFiles[0].text;
// Tryb ścisły jak w Nakamie: zapis do zamrożonego obiektu rzuca błąd, a nie przechodzi po cichu.
const strict = '"use strict";\n' + code;

function deepFreeze(o: unknown, seen = new Set<unknown>()) {
  if (o === null || (typeof o !== 'object' && typeof o !== 'function') || seen.has(o)) return;
  seen.add(o);
  for (const k of Object.getOwnPropertyNames(o)) {
    const d = Object.getOwnPropertyDescriptor(o, k);
    if (d && 'value' in d) deepFreeze(d.value, seen);
  }
  Object.freeze(o);
}

type Rec = { ownerId: string; username: string; score: number; subscore: number; metadata: Record<string, unknown>; rank: number };
function makeNk() {
  const store = new Map<string, { value: unknown; version: string }>();
  const boards = new Map<string, Map<string, Rec>>();
  const notes: { userId: string; code: number; content: unknown; senderId?: string; t: number }[] = [];
  const wallet: Record<string, Record<string, number>> = {};
  let ver = 0;
  const key = (c: string, k: string, u: string) => `${c}|${k}|${u}`;
  const board = (id: string) => { if (!boards.has(id)) boards.set(id, new Map()); return boards.get(id)!; };
  const ranked = (id: string) => [...board(id).values()].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
  const nk = {
    storageRead: (reqs: { collection: string; key: string; userId: string }[]) => reqs.flatMap(r => {
      const o = store.get(key(r.collection, r.key, r.userId));
      return o ? [{ ...r, value: JSON.parse(JSON.stringify(o.value)), version: o.version }] : [];
    }),
    storageWrite: (ws: { collection: string; key: string; userId: string; value: unknown; version?: string }[]) => ws.map(w => {
      const id = key(w.collection, w.key, w.userId);
      const cur = store.get(id);
      if (w.version === '*' && cur) throw new Error('exists');
      if (w.version && w.version !== '*' && (!cur || cur.version !== w.version)) throw new Error('version');
      const v = String(++ver);
      store.set(id, { value: JSON.parse(JSON.stringify(w.value)), version: v });
      return { version: v };
    }),
    storageDelete: (ds: { collection: string; key: string; userId: string }[]) => { for (const d of ds) store.delete(key(d.collection, d.key, d.userId)); },
    leaderboardRecordsList: (id: string, owners: string[], limit: number) => {
      const all = ranked(id);
      return { records: all.slice(0, limit), ownerRecords: owners.length ? all.filter(r => owners.includes(r.ownerId)) : [] };
    },
    leaderboardRecordWrite: (id: string, ownerId: string, username: string, score: number, subscore: number, metadata: Record<string, unknown>) => {
      const r = { ownerId, username, score, subscore, metadata, rank: 0 };
      board(id).set(ownerId, r);
      return r;
    },
    notificationsList: (userId: string) => ({ notifications: notes.map((n, i) => ({ ...n, id: 'n' + i })).filter(n => n.userId === userId).map(n => ({ id: n.id, code: n.code, content: n.content, senderId: n.senderId, createTime: n.t })) }),
    notificationsDeleteId: () => {},
    notificationsSend: (ns: { userId: string; code: number; content: unknown; senderId?: string }[]) => { notes.push(...ns.map(n => ({ ...n, t: Math.floor(Date.now() / 1000) }))); },
    uuidv4: () => 'u' + (++ver),
    sha256Hash: (s: string) => (s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) >>> 0).toString(16).padStart(8, '0') + 'ab',
    accountGetId: () => ({ wallet: {}, user: { username: 'x' } }),
    walletUpdate: (userId: string, ch: Record<string, number>) => {
      const w = (wallet[userId] ??= {});
      for (const [k, v] of Object.entries(ch)) w[k] = (w[k] ?? 0) + v;
      return { updated: { ...w } };
    },
    userGroupsList: () => ({ userGroups: [] }),
  };
  return { nk: nk as unknown as nkruntime.Nakama, store, notes, wallet };
}

describe('arena na serwerze po zamrożeniu zmiennych globalnych', () => {
  const ctx = vm.createContext({});
  vm.runInContext(strict, ctx);
  const builtins = new Set(Object.getOwnPropertyNames(vm.runInNewContext('globalThis')));
  for (const k of Object.getOwnPropertyNames(ctx)) if (!builtins.has(k)) deepFreeze((ctx as Record<string, unknown>)[k]);
  const g = ctx as unknown as Record<string, (...a: unknown[]) => unknown>;
  const log = { warn: () => {}, info: () => {}, error: () => {}, debug: () => {} };
  const c = (userId: string, username = userId) => ({ userId, username, env: {} });

  /** Gracz po kilku krainach: zapis na serwerze i bohater areny (jak po save_put). */
  function player(nk: nkruntime.Nakama, store: Map<string, { value: unknown; version: string }>, userId: string, name: string) {
    const s: GameState = newState(Date.now());
    s.name = name;
    s.maxLand = Math.max(B.ARENA_UNLOCK_LAND, 6);
    s.cleared = s.cleared.map((_, i) => i < s.maxLand);
    s.bestG = 60;
    s.forge.lvl = 20;
    store.set(`save|state|${userId}`, { value: { state: s, savedAt: Date.now(), power: 50000 }, version: 'v' + userId });
    g.updateArenaHero(nk, log, userId, userId, s, s.eq, 50000);
  }

  it('lista przeciwników i walki z duchami działają', () => {
    const { nk, store } = makeNk();
    player(nk, store, 'a1', 'Topór');
    const list = JSON.parse(g.rpcArenaList(c('a1'), log, nk, '{}') as string);
    expect(list.opp).toHaveLength(3);
    expect(list.left).toBe(B.ARENA_FIGHTS);
    const res = JSON.parse(g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ i: 0, id: list.opp[0].id })) as string);
    expect(typeof res.win).toBe('boolean');
    expect(res.gold).toBeGreaterThan(0);
    expect(res.left).toBe(B.ARENA_FIGHTS - 1);
    expect(Array.isArray(res.frames)).toBe(true);
    // Liga przyjęła walkę (jej błąd serwer pomija po cichu, więc sprawdzamy wprost).
    expect(res.league).not.toBeNull();
    expect(res.lp).toBeGreaterThan(0);
    expect(() => JSON.parse(g.rpcArenaLeague(c('a1'), log, nk, '{}') as string)).not.toThrow();
  });

  it('walka z bohaterem innego gracza zmienia ocenę obu i wysyła wieść', () => {
    const { nk, store, notes } = makeNk();
    player(nk, store, 'a1', 'Topór');
    player(nk, store, 'b2', 'Iskra');
    const list = JSON.parse(g.rpcArenaList(c('a1'), log, nk, JSON.stringify({ refresh: true })) as string);
    const i = list.opp.findIndex((o: { ghost: boolean }) => !o.ghost);
    expect(i).toBeGreaterThanOrEqual(0);
    const res = JSON.parse(g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ i, id: list.opp[i].id })) as string);
    expect(res.foe.ghost).toBe(false);
    expect(notes).toHaveLength(1);
    // Wszystkie walki dnia, potem koniec.
    let left = res.left;
    while (left > 0) left = JSON.parse(g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ i: 0 })) as string).left;
    expect(() => g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ i: 0 }))).toThrow(/koniec walk/);
  });

  /** Bohater areny gracza `userId` dużo silniejszy (do testów, które potrzebują pewnej wygranej). */
  function buff(store: Map<string, { value: unknown; version: string }>, userId: string, k: number) {
    const o = store.get(`arena|hero|${userId}`)!;
    const h = o.value as { f: { st: { dmg: number; hp: number } }; power: number };
    h.f.st.dmg *= k; h.f.st.hp *= k; h.power *= k;
  }

  it('seria wygranych daje więcej złota i Żetony za 3. i 5. wygraną z rzędu; przebieg walki przychodzi z wynikiem', () => {
    const { nk, store, wallet } = makeNk();
    player(nk, store, 'a1', 'Topór');
    player(nk, store, 'b2', 'Iskra');
    buff(store, 'a1', 30);
    const streaks: number[] = [], bonus: { gold: number; tk: number }[] = [];
    for (let n = 0; n < B.ARENA_FIGHTS; n++) {
      const list = JSON.parse(g.rpcArenaList(c('a1'), log, nk, '{}') as string);
      const i = list.opp.findIndex((o: { ghost: boolean }) => !o.ghost);
      const res = JSON.parse(g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ i, id: list.opp[i].id })) as string);
      expect(res.win).toBe(true);
      expect(res.ev.length).toBeGreaterThan(0);
      expect(res.ev[0][1]).toBe(0);
      streaks.push(res.streak);
      bonus.push({ gold: res.bonus.gold, tk: res.bonus.tk });
    }
    expect(streaks).toEqual([1, 2, 3, 4, 5]);
    expect(bonus.map(b => b.gold)).toEqual([0, 0, 0.5, 0.5, 1]);
    expect(bonus.map(b => b.tk)).toEqual([0, 0, 3, 0, 5]);
    expect(wallet.a1.tokens).toBe(5 * 5 + 3 + 5);
  });

  it('rewanż: raz na przegraną obronę, przez 24 h, z premią za wygraną', () => {
    const { nk, store, notes } = makeNk();
    player(nk, store, 'a1', 'Topór');
    player(nk, store, 'b2', 'Iskra');
    buff(store, 'b2', 30);
    // Iskra (silna) atakuje Topora i wygrywa — Topór dostaje wieść o przegranej obronie.
    const lb = JSON.parse(g.rpcArenaList(c('b2'), log, nk, '{}') as string);
    const ib = lb.opp.findIndex((o: { ghost: boolean }) => !o.ghost);
    expect(JSON.parse(g.rpcArenaFight(c('b2'), log, nk, JSON.stringify({ i: ib, id: lb.opp[ib].id })) as string).win).toBe(true);
    expect(notes.filter(n => n.userId === 'a1')).toHaveLength(1);
    const la = JSON.parse(g.rpcArenaList(c('a1'), log, nk, '{}') as string);
    const rv = la.log[0].rv as string;
    expect(rv).toBeTruthy();
    expect(la.log[0].until).toBeGreaterThan(Date.now());
    // Topór słabnie, Iskra też — rewanż wygrany.
    buff(store, 'a1', 100);
    const opp = JSON.stringify(la.opp);
    const res = JSON.parse(g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ rv })) as string);
    expect(res.foe.name).toBe('Iskra');
    expect(res.win).toBe(true);
    expect(res.bonus.rv).toBe(true);
    expect(res.bonus.gold).toBe(1);
    expect(res.bonus.tk).toBe(3);
    expect(res.left).toBe(B.ARENA_FIGHTS - 1);
    // Rewanż nie losuje nowych rywali i nie da się go powtórzyć.
    expect(JSON.stringify(res.opp)).toBe(opp);
    expect(res.log[0].rv).toBeUndefined();
    expect(() => g.rpcArenaFight(c('a1'), log, nk, JSON.stringify({ rv }))).toThrow(/rewanż nie jest już możliwy/);
  });
});
