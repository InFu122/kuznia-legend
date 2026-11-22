import { describe, expect, it, vi } from 'vitest';

// Sprzątanie porzuconego konta dotyka areny, klanu i rankingów — tu sprawdzamy tylko, czy zostało wywołane.
vi.mock('../src/arena', () => ({ leaveArena: vi.fn() }));
vi.mock('../src/clan', () => ({ leaveClan: vi.fn() }));
vi.mock('../src/names', () => ({ releaseName: vi.fn() }));

import { leaveArena } from '../src/arena';
import { GOOGLE_CLIENT_ID, googleForget, googleOwner, googleSub, rpcGoogleLink, rpcGoogleSwitch } from '../src/google';

const NOW = 1_800_000_000_000;
const ok = { aud: GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', exp: NOW / 1000 + 600, sub: '112233445566778899001' };
const TOKEN = 'a'.repeat(60) + '.' + 'b'.repeat(60) + '.' + 'c'.repeat(40);

/** Udawana Nakama: magazyn w pamięci, tokeninfo zwraca podane dane, urządzenia zapisuje. */
function fakeNk(claims: Record<string, unknown> | null = ok) {
  const store = new Map<string, { value: unknown }>();
  const k = (c: string, key: string, u: string) => `${c}/${key}/${u}`;
  const linked: [string, string][] = [];
  const nk = {
    httpRequest: () => (claims ? { code: 200, body: JSON.stringify(claims), headers: [] } : { code: 400, body: '{"error":"invalid_token"}', headers: [] }),
    storageRead: (q: { collection: string; key: string; userId: string }[]) =>
      q.flatMap(r => (store.has(k(r.collection, r.key, r.userId)) ? [{ ...r, value: store.get(k(r.collection, r.key, r.userId))!.value, version: 'v' }] : [])),
    storageWrite: (w: { collection: string; key: string; userId: string; value: unknown; version?: string }[]) => {
      for (const o of w) {
        if (o.version === '*' && store.has(k(o.collection, o.key, o.userId))) throw new Error('version check failed');
        store.set(k(o.collection, o.key, o.userId), { value: o.value });
      }
    },
    storageDelete: (d: { collection: string; key: string; userId: string }[]) => { for (const o of d) store.delete(k(o.collection, o.key, o.userId)); },
    linkDevice: (u: string, d: string) => { linked.push([u, d]); },
    leaderboardRecordDelete: () => {},
  } as unknown as nkruntime.Nakama;
  return { nk, store, linked };
}
const ctx = (userId: string) => ({ userId, username: 'u-' + userId }) as unknown as nkruntime.Context;
const logger = { info: () => {}, warn: () => {} } as unknown as nkruntime.Logger;

describe('logowanie przez Google', () => {
  it('przyjmuje tylko tokeny dla tej gry, od Google i jeszcze ważne', () => {
    expect(googleSub(ok, NOW)).toBe(ok.sub);
    expect(googleSub({ ...ok, iss: 'accounts.google.com' }, NOW)).toBe(ok.sub);
    expect(googleSub({ ...ok, aud: 'inna-aplikacja.apps.googleusercontent.com' }, NOW)).toBeNull();
    expect(googleSub({ ...ok, iss: 'https://evil.example' }, NOW)).toBeNull();
    expect(googleSub({ ...ok, exp: NOW / 1000 - 1 }, NOW)).toBeNull();
    expect(googleSub({ ...ok, sub: 'abc' }, NOW)).toBeNull();
  });

  it('łączy konto, a drugie konto z tym samym Google dostaje tylko informację, kim jest kowal', () => {
    vi.useFakeTimers({ now: NOW });
    const { nk, store } = fakeNk();
    store.set('save/state/A', { value: { state: { name: 'Adam', forge: { lvl: 42 } } } });
    expect(JSON.parse(rpcGoogleLink(ctx('A'), logger, nk, JSON.stringify({ token: TOKEN })))).toMatchObject({ linked: true });
    expect(googleOwner(nk, ok.sub)).toBe('A');
    expect(JSON.parse(rpcGoogleLink(ctx('A'), logger, nk, JSON.stringify({ token: TOKEN })))).toMatchObject({ linked: true });
    const r = JSON.parse(rpcGoogleLink(ctx('B'), logger, nk, JSON.stringify({ token: TOKEN })));
    expect(r).toMatchObject({ conflict: true, other: { name: 'Adam', forge: 42 } });
    expect(googleOwner(nk, ok.sub)).toBe('A');
    vi.useRealTimers();
  });

  it('odrzuca token, którego Google nie potwierdził', () => {
    const { nk } = fakeNk(null);
    expect(() => rpcGoogleLink(ctx('A'), logger, nk, JSON.stringify({ token: TOKEN }))).toThrow();
    expect(() => rpcGoogleLink(ctx('A'), logger, nk, JSON.stringify({ token: 'krótki' }))).toThrow();
  });

  it('nowy telefon przechodzi na konto z Google; puste konto gościa jest sprzątane', () => {
    vi.useFakeTimers({ now: NOW });
    const { nk, linked } = fakeNk();
    rpcGoogleLink(ctx('A'), logger, nk, JSON.stringify({ token: TOKEN }));
    vi.mocked(leaveArena).mockClear();
    rpcGoogleSwitch(ctx('B'), logger, nk, JSON.stringify({ token: TOKEN, device: 'kl-abcdef123456' }));
    expect(linked).toEqual([['A', 'kl-abcdef123456']]);
    expect(leaveArena).toHaveBeenCalledWith(nk, 'B');
    expect(() => rpcGoogleSwitch(ctx('A'), logger, nk, JSON.stringify({ token: TOKEN, device: 'kl-abcdef123456' }))).toThrow(/Już grasz/);
    expect(() => rpcGoogleSwitch(ctx('B'), logger, nk, JSON.stringify({ token: TOKEN, device: 'zly' }))).toThrow();
    vi.useRealTimers();
  });

  it('konto bez kowala na Google — nic się nie zmienia', () => {
    vi.useFakeTimers({ now: NOW });
    const { nk, linked } = fakeNk();
    expect(() => rpcGoogleSwitch(ctx('B'), logger, nk, JSON.stringify({ token: TOKEN, device: 'kl-abcdef123456' }))).toThrow(/nie ma jeszcze kowala/);
    expect(linked).toEqual([]);
    vi.useRealTimers();
  });

  it('konto z własnym Google nie jest sprzątane przy przejściu na inne, a usunięcie konta zwalnia Google', () => {
    vi.useFakeTimers({ now: NOW });
    const a = fakeNk();
    rpcGoogleLink(ctx('A'), logger, a.nk, JSON.stringify({ token: TOKEN }));
    // B ma własne Google (inne konto Google) i przechodzi na kowala A
    a.store.set('google/mine/B', { value: { sub: '998877665544332211' } });
    vi.mocked(leaveArena).mockClear();
    rpcGoogleSwitch(ctx('B'), logger, a.nk, JSON.stringify({ token: TOKEN, device: 'kl-abcdef123456' }));
    expect(leaveArena).not.toHaveBeenCalled();
    googleForget(a.nk, 'A');
    expect(googleOwner(a.nk, ok.sub)).toBeNull();
    vi.useRealTimers();
  });
});
