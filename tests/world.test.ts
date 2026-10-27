import { describe, expect, it } from 'vitest';
import { B, LANDS } from '../src/data';
import { equip, smelt } from '../src/engine/forge';
import { applyOffline } from '../src/engine/offline';
import { migrate, newState } from '../src/engine/state';
import { makeGame, simulate, T0 } from './helpers';

describe('walka i postęp', () => {
  it('bohater z auto-wytopem przechodzi pierwsze etapy bez błędów liczbowych', () => {
    const { g, s } = makeGame(3);
    s.forge.lvl = 5;
    s.ores[0] = 40; s.ores[1] = 40;
    s.auto = true;
    simulate(g, 10 * 60 * 1000);
    expect(s.cur.stage + s.cur.land * 10).toBeGreaterThan(3);
    expect(Number.isFinite(g.b.heroHp)).toBe(true);
    expect(Number.isFinite(s.gold)).toBe(true);
    expect(s.stats.kills).toBeGreaterThan(50);
  });

  it('pokonanie bossa odblokowuje następną krainę', () => {
    const { g, ctx, s, events } = makeGame(5);
    s.forge.lvl = 30; s.ores[4] = 8; s.stats.smelted = 10;
    for (let i = 0; i < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true); // mocny ekwipunek
    s.cur.stage = 10;
    g.challengeBoss();
    expect(g.b.enemy?.boss).toBe(true);
    simulate(g, 60000);
    expect(s.cleared[0]).toBe(true);
    expect(s.maxLand).toBe(1);
    expect(s.cur.land).toBe(1);
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'boss')).toBe(true);
  });

  it('każda kraina ma poprawne rudy i domieszki', () => {
    expect(LANDS.length).toBe(16);
    for (const L of LANDS) {
      expect(L.rare).toBe(L.main + 1);
      expect(L.rc).toBeGreaterThan(0);
      expect(L.foes.length).toBeGreaterThan(0);
    }
  });
});


describe('nagrody offline', () => {
  it('ignorują krótkie przerwy i mają limit 8 godzin', () => {
    const { ctx } = makeGame();
    expect(applyOffline(ctx, 30000)).toBeNull();
    const r = applyOffline(ctx, 24 * 3600 * 1000)!;
    expect(r.capped).toBe(true);
    expect(r.ms).toBe(B.OFFLINE_CAP_MS);
    expect(r.gold).toBeGreaterThan(0);
    expect(r.main).toBeGreaterThan(0);
  });

  it('kończą ulepszenie kuźni i otwierają Skrzynię nocnej zmiany', () => {
    const { ctx, s } = makeGame();
    s.forge.lvl = 5; s.forge.up = 6; s.forge.left = 60000;
    s.auto = true; s.ores[1] = 1000;
    const r = applyOffline(ctx, 2 * 3600 * 1000)!;
    expect(s.forge.lvl).toBe(6);
    expect(r.forgeUp).toBe(6);
    expect(r.chestCount).toBe(B.OFFLINE_CHEST_MAX);
  });
});

describe('nagrody offline i technologie', () => {
  it('Nocna zmiana wydłuża limit, a badanie kończy się poza grą', () => {
    const { ctx, s } = makeGame();
    s.tech.lv.e_noc = 2;
    s.tech.cur = { id: 'w_ostrze', left: 3600000, total: 3600000 };
    const r = applyOffline(ctx, 24 * 3600 * 1000)!;
    expect(r.ms).toBe(B.OFFLINE_CAP_MS + 60 * 60000);
    expect(r.tech).toBe('w_ostrze');
    expect(s.tech.lv.w_ostrze).toBe(1);
    expect(s.tech.cur).toBeNull();
  });
});

describe('zapis gry', () => {
  it('migracja uzupełnia brakujące pola starego zapisu', () => {
    const old: Record<string, unknown> = { ...newState(T0), v: 1 };
    delete old.dungeons;
    delete old.stats;
    delete old.tech;
    delete old.books;
    old.dung = { day: '2026-1-1', keys: 1, best: 7 };
    old.cleared = [true, false];
    const s = migrate(old, T0);
    expect(s.dungeons.sztolnia.best).toBe(7);
    expect(s.dungeons.skarbiec.keys).toBe(B.DUNGEON_KEYS);
    expect('dung' in s).toBe(false);
    expect(s.tech.lv).toEqual({});
    expect(s.books).toBe(0);
    expect(s.stats.smelted).toBe(0);
    expect(s.cleared.length).toBe(LANDS.length);
    expect(s.cleared[0]).toBe(true);
  });
  it('śmieciowe dane dają nową grę', () => {
    expect(migrate('zepsute', T0).gold).toBe(0);
    expect(migrate(null, T0).ores[0]).toBe(10);
  });
});
