import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, CODEX_PCT } from '../src/data';
import { CODEX_TOTAL, achCount, achReached, achReward, achValue } from '../src/engine/achievements';
import { smelt } from '../src/engine/forge';
import { allMods } from '../src/engine/mods';
import { migrate } from '../src/engine/state';
import { makeGame, T0 } from './helpers';

describe('Kolekcja Kowala', () => {
  it('310 modeli; wytop odkrywa model i najlepszą rzadkość; premia do obrażeń i zdrowia', () => {
    expect(CODEX_TOTAL).toBe(31 * 10);
    const { ctx, s } = makeGame(1);
    const m0 = allMods(s);
    s.forge.lvl = 10; s.ores[2] = 100; s.stats.smelted = 10;
    for (let i = 0; i < 60; i++) smelt(ctx, 2, null);
    expect(s.codex.length).toBeGreaterThan(5);
    expect(new Set(s.codex).size).toBe(s.codex.length);
    expect(s.codex.every(k => k.endsWith('|2'))).toBe(true);
    expect(s.stats.bestR).toBeGreaterThanOrEqual(2);
    expect(allMods(s).dmgPct - m0.dmgPct).toBeCloseTo(s.codex.length * CODEX_PCT);
  });

  it('stary zapis: kolekcja z obecnego ekwipunku; kolekcja i osiągnięcia zostają po Dziedzictwie', () => {
    const { ctx, s } = makeGame(2);
    s.forge.lvl = 10; s.ores[2] = 10; s.stats.smelted = 10;
    const it = smelt(ctx, 2, null)!;
    s.eq[it.slot] = it;
    const old = JSON.parse(JSON.stringify(s));
    delete old.codex; delete old.ach; delete old.stats.bestR;
    const m = migrate(old, T0);
    expect(m.codex).toEqual([`${it.kind}|2`]);
    expect(m.stats.bestR).toBe(it.r);
    s.ach = { kowal: 1 };
    const n = migrate(JSON.parse(JSON.stringify(s)), T0);
    expect(n.codex).toEqual(s.codex);
    expect(n.ach).toEqual({ kowal: 1 });
  });
});

describe('osiągnięcia', () => {
  it('progi, odbiór po kolei, nagrody rosną z progiem', () => {
    const { g, s } = makeGame(3);
    expect(achCount(s)).toBe(0);
    s.stats.smelted = 1500;
    expect(achValue(s, 'kowal')).toBe(1500);
    expect(achReached(s, 'kowal')).toBe(2);
    const b0 = s.books;
    expect(g.claimAch('kowal')).not.toBeNull();
    expect(g.claimAch('kowal')).not.toBeNull();
    expect(g.claimAch('kowal')).toBeNull();
    expect(s.ach.kowal).toBe(2);
    expect(s.books).toBe(b0 + achReward(s, 0).books! + achReward(s, 1).books!);
    expect(achReward(s, 3).eggs).toBeDefined();
    expect(achReward(s, 0).scrolls).toBeUndefined();
    expect(ACHIEVEMENTS.kolekcja.tiers[ACHIEVEMENTS.kolekcja.tiers.length - 1]).toBe(CODEX_TOTAL);
  });

  it('licznik do odebrania wchodzi do kropki Zadań', () => {
    const { g, s } = makeGame(4);
    const c0 = g.claimable();
    s.stats.kills = 5000;
    expect(g.claimable()).toBe(c0 + 1);
  });
});
