/// <reference path="../server/types/nakama-runtime.d.ts" />
// Pomoc klanu przy badaniach i przy ulepszeniach powyżej 30. poziomu, wpisy na czacie klanu
// oraz przyspieszenie reklamą (raz na ulepszenie i raz na badanie) — z prostą atrapą Nakamy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AD, CLAN, adUpCut } from '../src/data';
import { upgradeTime } from '../src/engine/forge';
import { techKey } from '../src/engine/mods';
import { newState } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { rpcClanHelp, rpcClanHelpAsk, rpcClanOreAsk, rpcClanSync } from '../server/src/clanlife';
import { rpcAdUp } from '../server/src/shop';

const GID = 'g1';
const NAMES: Record<string, string> = { u1: 'Iskra', u2: 'Topór', u3: 'Mruk' };
const T0 = Date.parse('2026-11-24T12:00:00Z');

function makeNk() {
  const store = new Map<string, { value: unknown; version: string }>();
  let ver = 0;
  const msgs: { [k: string]: unknown }[] = [];
  const k = (c: string, key: string, u: string) => `${c}|${key}|${u}`;
  const group = { id: GID, name: 'Bractwo', metadata: { tag: 'BKW' }, edgeCount: 3, maxCount: 30 };
  const nk = {
    storageRead: (reqs: { collection: string; key: string; userId: string }[]) => reqs.flatMap(r => {
      const o = store.get(k(r.collection, r.key, r.userId));
      return o ? [{ ...r, value: JSON.parse(JSON.stringify(o.value)), version: o.version }] : [];
    }),
    storageWrite: (ws: { collection: string; key: string; userId: string; value: unknown; version?: string }[]) => ws.map(w => {
      const id = k(w.collection, w.key, w.userId);
      const cur = store.get(id);
      if (w.version === '*' && cur) throw new Error('exists');
      if (w.version && w.version !== '*' && (!cur || cur.version !== w.version)) throw new Error('version');
      const v = String(++ver);
      store.set(id, { value: JSON.parse(JSON.stringify(w.value)), version: v });
      return { version: v };
    }),
    storageDelete: (ds: { collection: string; key: string; userId: string }[]) => { for (const d of ds) store.delete(k(d.collection, d.key, d.userId)); },
    userGroupsList: (uid: string) => ({ userGroups: NAMES[uid] ? [{ group, state: 2 }] : [] }),
    groupUsersList: () => ({ groupUsers: Object.keys(NAMES).map(u => ({ user: { userId: u, username: u, displayName: NAMES[u], online: false }, state: 2 })) }),
    leaderboardRecordsList: () => ({ ownerRecords: [] }),
    leaderboardRecordWrite: () => ({}),
    channelIdBuild: () => 'ch',
    channelMessageSend: (_c: string, content: { [k: string]: unknown }) => { msgs.push(content); },
    uuidv4: () => 'id-' + (++ver),
    sha256Hash: () => '1234abcd',
    accountGetId: () => ({ wallet: {} }),
    walletUpdate: () => ({}),
  };
  for (const [u, n] of Object.entries(NAMES)) store.set(k('names', 'mine', u), { value: { n, key: n.toLowerCase(), t: 0, gen: false }, version: String(++ver) });
  /** Zapis gry gracza na serwerze. */
  const save = (u: string, s: GameState) => store.set(k('save', 'state', u), { value: { state: s, savedAt: Date.now(), power: 1000 }, version: String(++ver) });
  return { nk: nk as unknown as nkruntime.Nakama, msgs, save };
}
const ctxOf = (userId: string) => ({ userId, env: {} }) as unknown as nkruntime.Context;
const log = {} as nkruntime.Logger;
const call = (fn: (c: nkruntime.Context, l: nkruntime.Logger, nk: nkruntime.Nakama, p: string) => string, nk: nkruntime.Nakama, u: string, body: object) =>
  JSON.parse(fn(ctxOf(u), log, nk, JSON.stringify(body)));

/** Stan gracza z trwającym ulepszeniem kuźni na `up` i badaniem `k_hart` poziomu 1. */
function playing(up: number): GameState {
  const s = newState(T0);
  s.forge.lvl = up - 1;
  s.forge.up = up;
  s.forge.left = upgradeTime(s, up) * 0.8;
  s.tech.cur = { id: 'k_hart', left: 3600000, total: 4 * 3600000 };
  return s;
}

describe('Pomoc klanu przy badaniach i wpisy na czacie (serwer)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(T0)); });
  afterEach(() => vi.useRealTimers());

  it('pomoc przy ulepszeniu kuźni działa też powyżej 30. poziomu', () => {
    const { nk, save } = makeNk();
    save('u1', playing(45));
    save('u2', playing(10));
    call(rpcClanHelpAsk, nk, 'u1', { up: 45, tk: '' });
    const v = call(rpcClanSync, nk, 'u2', { up: 10, tk: '' });
    expect(v.helps).toEqual([expect.objectContaining({ uid: 'u1', lvl: 45, k: 'f', got: 0 })]);
    call(rpcClanHelp, nk, 'u2', { up: 10, tk: '', uid: 'u1', k: 'f' });
    expect(call(rpcClanSync, nk, 'u1', { up: 45, tk: '' }).helped).toEqual({ lvl: 45, n: 1 });
  });

  it('prośba o pomoc w badaniu: osobna od kuźni, liczona dla „id:poziom”, z wpisem na czacie', () => {
    const { nk, msgs, save } = makeNk();
    const s1 = playing(12);
    save('u1', s1);
    save('u2', playing(10));
    const tk = techKey(s1);
    expect(tk).toBe('k_hart:1');
    call(rpcClanHelpAsk, nk, 'u1', { up: 12, tk });
    call(rpcClanHelpAsk, nk, 'u1', { up: 12, tk, what: 'tech' });
    expect(msgs.filter(m => m.k === 'ask').map(m => m.t)).toEqual([
      'Iskra prosi o pomoc: Kuźnia → poziom 12.',
      'Iskra prosi o pomoc w badaniu: Hartowanie → poz. 1.',
    ]);
    // Druga prośba o to samo nie powtarza wpisu na czacie.
    call(rpcClanHelpAsk, nk, 'u1', { up: 12, tk, what: 'tech' });
    expect(msgs.filter(m => m.k === 'ask')).toHaveLength(2);
    const v = call(rpcClanSync, nk, 'u2', { up: 10, tk: '' });
    expect(v.helps.map((h: { k: string; tn?: string }) => [h.k, h.tn])).toEqual([['f', undefined], ['t', 'Hartowanie → poz. 1']]);
    // Pomoc tylko przy badaniu: kuźnia nie dostaje nic.
    call(rpcClanHelp, nk, 'u2', { up: 10, tk: '', uid: 'u1', k: 't' });
    const me = call(rpcClanSync, nk, 'u1', { up: 12, tk });
    expect(me.helpedT).toEqual({ tk, n: 1 });
    expect(me.helped).toEqual({ lvl: 12, n: 0 });
    expect(me.myHelpT).toEqual({ tk, got: 1 });
  });

  it('pełna pomoc (10/10) i prośba o rudę trafiają na czat klanu', () => {
    const { nk, msgs, save } = makeNk();
    save('u1', playing(12));
    save('u2', playing(10));
    call(rpcClanHelpAsk, nk, 'u1', { up: 12, tk: '' });
    // Atrapa ma tylko dwóch pomocników — dobijamy licznik w stanie klanu do 9 i u2 pomaga dziesiąty raz.
    const st = JSON.parse(JSON.stringify((nk.storageRead([{ collection: 'clan_state', key: GID, userId: '00000000-0000-0000-0000-000000000000' }])[0] || { value: null }).value));
    expect(st?.helps?.length).toBe(1);
    if (st) {
      st.helps[0].got = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9'];
      nk.storageWrite([{ collection: 'clan_state', key: GID, userId: '00000000-0000-0000-0000-000000000000', value: st } as unknown as nkruntime.StorageWriteRequest]);
      call(rpcClanHelp, nk, 'u2', { up: 10, tk: '', uid: 'u1', k: 'f' });
      expect(msgs.some(m => m.k === 'sys' && String(m.t).includes(`pełną pomoc klanu (${CLAN.HELP_MAX}/${CLAN.HELP_MAX})`))).toBe(true);
    }
    call(rpcClanOreAsk, nk, 'u2', { up: 10, tk: '', ore: 0 });
    expect(msgs.some(m => m.k === 'ask' && String(m.t).startsWith('Topór prosi o rudę:'))).toBe(true);
  });
});

describe('Przyspieszenie reklamą (serwer)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(T0)); });
  afterEach(() => vi.useRealTimers());

  it('kuźnia: −10% pełnego czasu do przyspieszeń (kontrola tempa), tylko raz na ulepszenie', () => {
    const { nk, save } = makeNk();
    const s = playing(20);
    save('u1', s);
    const r = call(rpcAdUp, nk, 'u1', { what: 'forge', key: 20 });
    const cut = adUpCut(upgradeTime(s, 20), s.forge.left);
    expect(cut).toBe(Math.round(upgradeTime(s, 20) * AD.UP_PCT / 100));
    expect(r.adUp).toEqual({ what: 'forge', key: 20, cut });
    expect(r.boost).toEqual({ lvl: 20, ms: cut });
    expect(() => call(rpcAdUp, nk, 'u1', { what: 'forge', key: 20 })).toThrow(/już przyspieszone reklamą/);
    // Następne ulepszenie znowu można przyspieszyć.
    save('u1', playing(21));
    expect(call(rpcAdUp, nk, 'u1', { what: 'forge', key: 21 }).adUp.key).toBe(21);
  });

  it('badanie: osobno od kuźni, co najmniej 5 minut, raz na badanie', () => {
    const { nk, save } = makeNk();
    const s = playing(20);
    s.tech.cur = { id: 'k_hart', left: 20 * 60000, total: 30 * 60000 };
    save('u1', s);
    const r = call(rpcAdUp, nk, 'u1', { what: 'tech', key: 'k_hart:1' });
    expect(r.adUp).toEqual({ what: 'tech', key: 'k_hart:1', cut: AD.UP_MIN_MS });
    expect(() => call(rpcAdUp, nk, 'u1', { what: 'tech', key: 'k_hart:1' })).toThrow(/już przyspieszone reklamą/);
    expect(call(rpcAdUp, nk, 'u1', { what: 'forge', key: 20 }).adUp.what).toBe('forge');
  });
});
