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
  const notes: { userId: string; code: number; content: unknown }[] = [];
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
    notificationsList: (userId: string) => ({ notifications: notes.filter(n => n.userId === userId).map((n, i) => ({ id: 'n' + i, code: n.code, content: n.content, createTime: 1 })) }),
    notificationsDeleteId: () => {},
    notificationsSend: (ns: { userId: string; code: number; content: unknown }[]) => { notes.push(...ns); },
    uuidv4: () => 'u' + (++ver),
    sha256Hash: (s: string) => (s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) >>> 0).toString(16).padStart(8, '0') + 'ab',
    accountGetId: () => ({ wallet: {}, user: { username: 'x' } }),
    walletUpdate: () => ({}),
    userGroupsList: () => ({ userGroups: [] }),
  };
  return { nk: nk as unknown as nkruntime.Nakama, store, notes };
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
});
