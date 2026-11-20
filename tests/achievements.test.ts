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

describe('osiągnięcia długoterminowe i Sława kowala', () => {
  it('próg daje Sławę (wyższy próg — więcej), a Sława daje tytuły', () => {
    const { g, s } = makeGame(11);
    s.stats.smelted = 1000;
    const f0 = s.smith.fame;
    expect(g.claimAch('kowal')).not.toBeNull();
    expect(s.smith.fame).toBe(f0 + 25);
    expect(g.claimAch('kowal')).not.toBeNull();
    expect(s.smith.fame).toBe(f0 + 25 + 50);
  });

  it('nowe osiągnięcia liczą wytopy Legendarne+, zadania, dni logowania i poziomy badań', () => {
    const { s } = makeGame(12);
    s.stats.leg = 12; s.stats.missions = 101; s.stats.days = 31;
    s.tech.lv = { k_hart: 5, k_miech: 6 };
    expect(achReached(s, 'legendy')).toBe(2);
    expect(achReached(s, 'zadania')).toBe(2);
    expect(achReached(s, 'dni')).toBe(2);
    expect(achValue(s, 'nauka')).toBe(11);
  });

  it('stare progi zostają na swoich miejscach (nowe dopisane tylko na końcu)', () => {
    expect(ACHIEVEMENTS.kowal.tiers.slice(0, 5)).toEqual([100, 1000, 10000, 50000, 200000]);
    expect(ACHIEVEMENTS.bossowie.tiers.slice(0, 5)).toEqual([5, 16, 50, 150, 400]);
    for (const A of Object.values(ACHIEVEMENTS)) for (let i = 1; i < A.tiers.length; i++) expect(A.tiers[i]).toBeGreaterThan(A.tiers[i - 1]);
  });

  it('stary zapis dostaje raz Sławę za już odebrane progi', () => {
    const { s } = makeGame(13);
    const raw = JSON.parse(JSON.stringify(s));
    raw.ach = { kowal: 2, bossowie: 1 };
    raw.smith = { fame: 100, sent: [], log: [] }; // bez znacznika v
    const m = migrate(raw, T0);
    expect(m.smith.fame).toBe(100 + 25 + 50 + 25);
    expect(migrate(JSON.parse(JSON.stringify(m)), T0).smith.fame).toBe(m.smith.fame); // tylko raz
  });
});
