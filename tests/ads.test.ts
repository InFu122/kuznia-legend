import { describe, expect, it } from 'vitest';
import { AD, adMax } from '../src/data';
import { adCountLocal, adsLeft, offlineDouble } from '../src/engine/shop';
import { makeGame } from './helpers';

describe('drobne nagrody za reklamy', () => {
  it('dzienne limity reklam', () => {
    expect(adMax('arena')).toBe(AD.ARENA_DAY);
    expect(adMax('offline')).toBe(AD.OFFLINE_DAY);
    const { ctx, s } = makeGame();
    for (let i = 0; i < AD.OFFLINE_DAY; i++) expect(adCountLocal(ctx, 'offline')).toBe(true);
    expect(adCountLocal(ctx, 'offline')).toBe(false);
    expect(adsLeft(s.shop, 'offline')).toBe(0);
    expect(adsLeft(s.shop, 'arena')).toBe(AD.ARENA_DAY);
  });

  it('×2 nagrody za nieobecność: raz, od 30 minut', () => {
    const { g, s } = makeGame();
    s.cleared[0] = true; s.maxLand = 1; s.bestG = 12; s.cur.land = 1;
    g.offline(10 * 60000);
    expect(g.canDoubleOffline()).toBe(false);
    g.offline(3 * 3600000);
    expect(g.canDoubleOffline()).toBe(true);
    const gold0 = s.gold, ores0 = s.ores.slice();
    const rw = g.doubleOffline();
    expect(rw).not.toBeNull();
    expect(s.gold - gold0).toBe(rw!.gold);
    expect(rw!.gold).toBeGreaterThan(0);
    for (const [o, n] of Object.entries(rw!.ores ?? {})) expect(s.ores[Number(o)] - ores0[Number(o)]).toBe(n);
    expect(g.canDoubleOffline()).toBe(false);
    expect(g.doubleOffline()).toBeNull();
    expect(s.shop.ads.offline).toBe(1);
  });

  it('nagroda z raportu: złoto, rudy, domieszki krainy i Księgi', () => {
    const r = offlineDouble({ ms: 1, capped: false, land: 2, gold: 500, ores: [3, 0, 2, 0, 0, 0, 0], el: 4, books: 1, fame: 9, forgeUp: 0, tech: null, hatched: null, chest: [], chestCount: 0 });
    expect(r.gold).toBe(500);
    expect(r.ores).toEqual({ 0: 3, 2: 2 });
    expect(r.books).toBe(1);
  });
});
