import { describe, expect, it } from 'vitest';
import { addFound, autoTarget, autoTargets, smelt } from '../src/engine/forge';
import { makeGame, simulate } from './helpers';

describe('auto-wytop do wybranej rzadkości', () => {
  it('cele: rzadkości powyżej minimum rudy (Gwiezdny Kruszec — tylko Boski)', () => {
    expect(autoTargets(0)).toEqual([1, 2]);
    expect(autoTargets(4)).toEqual([5, 6]);
    expect(autoTargets(5)).toEqual([6]);
    expect(autoTargets(6)).toEqual([6]);
  });

  it('wybór spoza zakresu rudy zamienia się na najniższy cel', () => {
    const { g, s } = makeGame(2);
    s.oreSel = 1; s.autoStop = 6;
    expect(autoTarget(s)).toBe(2);
    g.setAutoStop(3);
    expect(s.autoStop).toBe(3);
    g.setAutoStop(5); // Żelazo nie da Mitycznego
    expect(s.autoStop).toBe(3);
  });

  it('słabsze sprzedaje, pusty slot zakłada, na celu staje z dźwiękiem i oknem decyzji', () => {
    const { g, s, events } = makeGame(4);
    s.forge.lvl = 8; s.ores[1] = 500; s.oreSel = 1; s.stats.smelted = 10;
    s.autoStop = 3; // Epicki z Żelaza = przeskok o 2 (rzadki)
    g.toggleAuto();
    const gold0 = s.gold;
    for (let i = 0; i < 400 && !s.pending; i++) simulate(g, 1000);
    expect(s.pending).not.toBeNull();
    expect(s.pending!.r).toBeGreaterThanOrEqual(3);
    expect(s.auto).toBe(true);        // auto zostaje włączony, tylko czeka na decyzję
    expect(g.autoPaused).toBe(true);
    expect(events.some(e => e.t === 'sfx' && e.k === 'alert')).toBe(true);
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'decide')).toBe(true);
    expect(Object.keys(s.eq).length).toBeGreaterThan(0);   // puste miejsca dostały przedmioty
    expect(s.gold).toBeGreaterThan(gold0);                  // reszta sprzedana
    // po decyzji auto-wytop jedzie dalej sam
    const n = s.stats.smelted;
    g.equipPending();
    simulate(g, 5000);
    expect(s.stats.smelted).toBeGreaterThan(n);
    expect(s.auto).toBe(true);
  });

  it('ręczny wytop otwiera okno decyzji', () => {
    const { g, events } = makeGame(1);
    g.s.ores[1] = 3;
    g.smeltManual();
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'decide')).toBe(true);
  });

  it('znaleziska (skrzynia bossa, Zbrojownia) czekają na gracza — auto-wytop ich nie rusza', () => {
    const { g, ctx, s } = makeGame(6);
    s.forge.lvl = 8; s.ores[1] = 200; s.ores[2] = 1; s.oreSel = 1; s.stats.smelted = 10; s.autoStop = 3;
    const it = smelt(ctx, 2, null)!;
    addFound(ctx, [it]);
    g.toggleAuto();
    simulate(g, 20000);
    expect(s.found).toContain(it);
    g.takeFound(0, true);
    expect(s.eq[it.slot]).toBe(it);
    expect(s.found).toHaveLength(0);
  });

  it('nadmiar znalezisk idzie na sprzedaż (najstarsze)', () => {
    const { ctx, s } = makeGame(7);
    s.ores[0] = 30; s.stats.smelted = 10;
    const items = Array.from({ length: 25 }, () => smelt(ctx, 0, null)!);
    const gold = s.gold;
    addFound(ctx, items);
    expect(s.found).toHaveLength(20);
    expect(s.found[0]).toBe(items[5]);
    expect(s.gold).toBeGreaterThan(gold);
  });
});

import { equipBestSkills, selectBestMount, selectBestPet } from '../src/engine/companions';
import { fullStats } from '../src/engine/stats';

describe('Załóż najlepsze', () => {
  it('umiejętności, chowaniec i wierzchowiec z największą Mocą', () => {
    const { ctx, s } = makeGame(3);
    s.skills.lv = { deszcz: 5, tarcza: 1, okrzyk: 8, eliksir: 1, kula: 6 };
    s.skills.eq = ['tarcza', null, null];
    s.pets = { wilczek: { lvl: 1, stars: 0 }, feniks: { lvl: 10, stars: 2 } };
    s.petSel = 'wilczek';
    s.mounts = { kon: { lvl: 1, stars: 0 }, smok: { lvl: 5, stars: 1 } };
    s.mountSel = 'kon';
    const p0 = fullStats(ctx).power;
    expect(equipBestSkills(ctx)).toBe(true);
    expect(s.skills.eq.filter(Boolean)).toHaveLength(3);
    expect(selectBestPet(ctx)).toBe(true);
    expect(s.petSel).toBe('feniks');
    expect(selectBestMount(ctx)).toBe(true);
    expect(s.mountSel).toBe('smok');
    expect(fullStats(ctx).power).toBeGreaterThan(p0);
    // drugi raz nic się nie zmienia
    expect(equipBestSkills(ctx)).toBe(false);
    expect(selectBestPet(ctx)).toBe(false);
  });
});
