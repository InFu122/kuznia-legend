/// <reference path="../server/types/nakama-runtime.d.ts" />
// Skrzynia tygodnia i Kowal tygodnia na serwerze — z prostą atrapą Nakamy (magazyn z wersjami, jeden klan).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAN_WEEK, clanEmbOf, clanWeekGoal } from '../src/data';
import { clanWeekChest } from '../src/engine/clan';
import { addWeekPoints, readPending, rpcClanDonate, rpcClanSync, rpcClanWeekClaim } from '../server/src/clanlife';

const GID = 'g1';
const NAMES: Record<string, string> = { u1: 'Iskra', u2: 'Topór', u3: 'Mruk', u4: 'Sowa', u5: 'Rdza' };

function makeNk() {
  const store = new Map<string, { value: unknown; version: string }>();
  let ver = 0;
  const msgs: { [k: string]: unknown }[] = [];
  const k = (c: string, key: string, u: string) => `${c}|${key}|${u}`;
  const group = { id: GID, name: 'Bractwo', metadata: { tag: 'BKW', emb: { c: 2, i: 3 } }, edgeCount: 5, maxCount: 30 };
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
  };
  for (const [u, n] of Object.entries(NAMES)) store.set(k('names', 'mine', u), { value: { n, key: n.toLowerCase(), t: 0, gen: false }, version: String(++ver) });
  return { nk: nk as unknown as nkruntime.Nakama, msgs };
}
const ctxOf = (userId: string) => ({ userId, env: {} }) as unknown as nkruntime.Context;
const log = {} as nkruntime.Logger;
const sync = (nk: nkruntime.Nakama, u: string) => JSON.parse(rpcClanSync(ctxOf(u), log, nk, '{}'));

describe('Skrzynia tygodnia i Kowal tygodnia (serwer)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-24T12:00:00Z')); }); // wtorek
  afterEach(() => vi.useRealTimers());

  it('punkty za aktywność, progi z liczby członków, odbiór tylko z własnym wkładem, herb w widoku', () => {
    const { nk } = makeNk();
    let v = sync(nk, 'u1');
    expect(v.clan.emb).toEqual({ c: 2, i: 3 });
    expect(v.week.goals).toEqual(CLAN_WEEK.TIERS.map((_, i) => clanWeekGoal(i, 5)));
    expect(v.week.pts).toBe(0);
    for (let i = 0; i < 3; i++) v = JSON.parse(rpcClanDonate(ctxOf('u1'), log, nk, '{}'));
    expect(v.week.pts).toBe(3 * CLAN_WEEK.PTS.don);
    expect(v.week.mine).toBe(30);
    expect(() => rpcClanWeekClaim(ctxOf('u1'), log, nk, '{}')).toThrow(/Nie ma nowej skrzyni/);
    for (let i = 0; i < 9; i++) addWeekPoints(nk, ctxOf('u1'), GID, 'u1', 'war'); // +72 → 102 ≥ 100
    v = sync(nk, 'u1');
    expect(v.week.open).toBe(1);
    expect(v.week.lead).toEqual({ n: 'Iskra', pts: 102, me: true });
    const c = JSON.parse(rpcClanWeekClaim(ctxOf('u1'), log, nk, '{}'));
    expect(c.claimed).toBe(1);
    expect(c.week.got).toEqual([0]);
    expect(readPending(nk, 'u1').some(r => r.why === 'Skrzynia tygodnia klanu nr 1')).toBe(true);
    expect(() => rpcClanWeekClaim(ctxOf('u1'), log, nk, '{}')).toThrow(/Nie ma nowej skrzyni/);
    expect(() => rpcClanWeekClaim(ctxOf('u3'), log, nk, '{}')).toThrow(/dołożył choć 1 punkt/);
  });

  it('nowy tydzień: nieodebrane skrzynie trafiają do kolejki, najaktywniejszy zostaje Kowalem tygodnia', () => {
    const { nk, msgs } = makeNk();
    sync(nk, 'u1');
    for (let i = 0; i < 20; i++) addWeekPoints(nk, ctxOf('u2'), GID, 'u2', 'raid'); // 160
    for (let i = 0; i < 10; i++) addWeekPoints(nk, ctxOf('u4'), GID, 'u4', 'war');  // 80 → razem 240 (2 skrzynie)
    expect(sync(nk, 'u2').week.open).toBe(1);
    JSON.parse(rpcClanWeekClaim(ctxOf('u2'), log, nk, '{}')); // u2 odbiera skrzynię 1 sam
    for (let i = 0; i < 2; i++) addWeekPoints(nk, ctxOf('u4'), GID, 'u4', 'war');   // 256 ≥ 250 → skrzynia 2
    vi.setSystemTime(new Date('2026-12-01T12:00:00Z')); // następny tydzień
    const v = sync(nk, 'u3');
    expect(v.week.pts).toBe(0);
    expect(v.week.top).toMatchObject({ uid: 'u2', n: 'Topór', pts: 160 });
    const p2 = readPending(nk, 'u2').map(r => r.why);
    expect(p2.filter(w => w.startsWith('Skrzynia tygodnia klanu nr 1')).length).toBe(1); // bez podwójnej
    expect(p2).toContain('Skrzynia tygodnia klanu nr 2');
    expect(p2).toContain('Kowal tygodnia w klanie');
    const p4 = readPending(nk, 'u4').map(r => r.why);
    expect(p4).toEqual(expect.arrayContaining(['Skrzynia tygodnia klanu nr 1', 'Skrzynia tygodnia klanu nr 2']));
    expect(readPending(nk, 'u3').some(r => r.why.startsWith('Skrzynia tygodnia'))).toBe(false); // bez wkładu — bez skrzyni
    expect(msgs.some(m => String(m.t).startsWith('Kowal tygodnia: Topór'))).toBe(true);
    // drugie wejście w tym samym tygodniu nie rozlicza ponownie
    sync(nk, 'u1');
    expect(readPending(nk, 'u2').filter(r => r.why === 'Kowal tygodnia w klanie').length).toBe(1);
  });

  it('skrzynie coraz cenniejsze; herb sprawdzany', () => {
    expect(clanWeekChest(0, 50).coins).toBeLessThan(clanWeekChest(4, 50).coins!);
    expect(clanWeekChest(4, 50).eggs).toEqual({ 3: 1 });
    expect(clanEmbOf({ c: 1, i: 2 })).toEqual({ c: 1, i: 2 });
    expect(clanEmbOf({ c: 99, i: 2 })).toBeNull();
    expect(clanEmbOf('x')).toBeNull();
  });
});
