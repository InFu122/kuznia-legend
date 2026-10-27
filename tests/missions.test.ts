import { describe, expect, it } from 'vitest';
import { DAILY_COUNT, SKILLS, TUTORIAL, WEEKLY_BOOKS, WEEKLY_COUNT } from '../src/data';
import { smelt } from '../src/engine/forge';
import { upTime } from '../src/engine/formulas';
import { canClaimLogin, chestReady, claimChest, claimLogin, claimMission, ensureMissions, track } from '../src/engine/missions';
import { makeGame, simulate } from './helpers';

describe('misje', () => {
  it('codziennie 5 misji (zawsze z wytopem), co tydzień 4; nowy dzień losuje nowe', () => {
    const { ctx, s, advance } = makeGame();
    ensureMissions(ctx);
    expect(s.missions.daily.length).toBe(DAILY_COUNT);
    expect(s.missions.daily[0].kind).toBe('smelt');
    expect(s.missions.weekly.length).toBeLessThanOrEqual(WEEKLY_COUNT);
    s.missions.daily[0].n = 7;
    const day = s.missions.day;
    advance(24 * 3600 * 1000);
    ensureMissions(ctx);
    expect(s.missions.day).not.toBe(day);
    expect(s.missions.daily[0].n).toBe(0);
  });

  it('wytop liczy się do misji, nagrodę odbiera się po wykonaniu, a komplet otwiera skrzynię', () => {
    const { ctx, s } = makeGame();
    s.ores[1] = 100;
    ensureMissions(ctx);
    const m = s.missions.daily[0];
    expect(claimMission(ctx, 'daily', 0)).toBeNull();
    for (let i = 0; i < m.goal; i++) smelt(ctx, 1, null);
    expect(m.n).toBe(m.goal);
    const gold = s.gold;
    expect(claimMission(ctx, 'daily', 0)).not.toBeNull();
    expect(s.gold).toBeGreaterThan(gold);
    expect(claimMission(ctx, 'daily', 0)).toBeNull(); // drugi raz nie
    for (const x of s.missions.daily) { x.n = x.goal; }
    s.missions.daily.forEach((_, i) => claimMission(ctx, 'daily', i));
    expect(chestReady(s)).toBe(true);
    const books = s.books;
    expect(claimChest(ctx)).not.toBeNull();
    expect(s.books).toBe(books + 2);
    expect(claimChest(ctx)).toBeNull();
  });

  it('misja tygodniowa daje Księgi Wiedzy', () => {
    const { ctx, s } = makeGame();
    ensureMissions(ctx);
    const m = s.missions.weekly[0];
    track(ctx, m.kind, m.goal);
    const books = s.books;
    claimMission(ctx, 'weekly', 0);
    expect(s.books).toBe(books + WEEKLY_BOOKS);
  });
});

describe('kalendarz logowania', () => {
  it('jedna nagroda dziennie, 7. dnia epicki Zwój', () => {
    const { ctx, s, advance } = makeGame();
    s.bestG = 10; // umiejętności odblokowane
    for (let d = 0; d < 6; d++) {
      expect(claimLogin(ctx)!.idx).toBe(d);
      expect(canClaimLogin(ctx)).toBe(false);
      expect(claimLogin(ctx)).toBeNull();
      advance(24 * 3600 * 1000);
    }
    const r = claimLogin(ctx)!;
    expect(r.idx).toBe(6);
    expect(SKILLS[r.skill!.id].r).toBeGreaterThanOrEqual(3);
    expect(s.login.idx).toBe(0); // kalendarz zaczyna się od nowa
  });
});

describe('samouczek', () => {
  it('prowadzi przez pierwsze kroki i daje nagrody', () => {
    const { g, s } = makeGame(1, undefined, { tutorial: true });
    expect(s.tut).toBe(0);
    g.smeltManual();
    g.tick(16);
    expect(s.tut).toBe(1);           // pierwszy wytop
    g.equipPending();
    g.tick(16);
    expect(s.tut).toBe(2);           // broń założona
    expect(s.ores[1]).toBeGreaterThan(0);
    s.gold = 1000;
    g.smeltManual(); g.sellPending(); g.smeltManual(); g.sellPending();
    g.upgrade();
    g.tick(16);
    expect(s.tut).toBe(4);           // trzeci wytop i ulepszenie kuźni
    simulate(g, upTime(2) + 100);
    expect(s.forge.lvl).toBe(2);
  });

  it('pierwsze ulepszenie kuźni trwa 30 sekund', () => {
    expect(upTime(2)).toBe(30000);
    expect(TUTORIAL.length).toBeGreaterThan(5);
  });
});
