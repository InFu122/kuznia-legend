import { describe, expect, it } from 'vitest';
import { equip, smelt } from '../src/engine/forge';
import { B, LEGEND } from '../src/data';
import { goldWaveOf } from '../src/engine/formulas';
import { addFame, awChangeCost } from '../src/engine/legend';
import { migrate } from '../src/engine/state';
import { T0, makeGame } from './helpers';

describe('legendy przedmiotów', () => {
  it('przedmiot przechodzi przez trzy progi i budzi się jako Zguba typu, z którym walczył najwięcej', () => {
    const { ctx, events } = makeGame();
    const it = smelt(ctx, 1, null)!;
    equip(ctx, it, true);
    addFame(ctx, 1000, 'Nieumarli', false);
    expect(it.ls).toBe(1);
    addFame(ctx, 4000, 'Nieumarli', false);
    expect(it.ls).toBe(2);
    addFame(ctx, 3000, 'Bestie', false);
    addFame(ctx, 12000, 'Nieumarli', false);
    expect(it.ls).toBe(3);
    expect(it.aw).toEqual({ kind: 'type', t: 'Nieumarli', v: 25, name: 'Zguba Umarłych' });
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'awaken')).toBe(true);
  });

  it('gdy najwięcej Sławy dali bossowie, przedmiot staje się Pogromcą', () => {
    const { ctx } = makeGame();
    const it = smelt(ctx, 1, null)!;
    equip(ctx, it, true);
    addFame(ctx, 2000, 'Bestie', false);
    for (let i = 0; i < 400; i++) addFame(ctx, 0, 'Bestie', true); // 400 × 50 Sławy
    expect(it.aw?.name).toBe('Pogromca');
  });

  it('progi legendy podnoszą Moc bohatera', () => {
    const { g, ctx } = makeGame();
    const it = smelt(ctx, 1, null)!;
    equip(ctx, it, true);
    const before = g.stats.power;
    addFame(ctx, 5000, 'Bestie', false);
    expect(g.stats.power).toBeGreaterThan(before);
  });
});

describe('cecha przebudzenia: wybór gracza', () => {
  const awoken = () => {
    const h = makeGame();
    const it = smelt(h.ctx, 1, null)!;
    equip(h.ctx, it, true);
    addFame(h.ctx, 20000, 'Bestie', false); // farmił Bestie — podpowiedź: Zguba Bestii
    return { ...h, it: h.s.eq[it.slot]! };
  };

  it('Przebudzony daje +15% (więcej niż Sławny) i podpowiada cechę z najwięcej Sławy', () => {
    const { it } = awoken();
    expect(LEGEND[3].b).toBeGreaterThan(LEGEND[2].b);
    expect(it.aw?.name).toBe('Zguba Bestii');
    expect(it.awc ?? 0).toBe(0);
  });

  it('pierwszy wybór za darmo (np. Nieumarli zamiast Bestii), kolejna zmiana za złoto', () => {
    const { g, s, it } = awoken();
    s.gold = 0;
    expect(g.setAwakening(it.slot, 'Nieumarli')).toBe(true);
    expect(it.aw).toEqual({ kind: 'type', t: 'Nieumarli', v: 25, name: 'Zguba Umarłych' });
    expect(it.awc).toBe(1);
    const cost = awChangeCost(s, it);
    expect(cost).toBe(Math.round(goldWaveOf(s) * B.AW_CHANGE_WAVES));
    expect(g.setAwakening(it.slot, 'boss')).toBe(false); // brak złota
    expect(it.aw?.name).toBe('Zguba Umarłych');
    s.gold = cost;
    expect(g.setAwakening(it.slot, 'boss')).toBe(true);
    expect(it.aw).toEqual({ kind: 'boss', v: 15, name: 'Pogromca' });
    expect(s.gold).toBe(0);
    expect(g.setAwakening(it.slot, 'boss')).toBe(false); // ta sama cecha — nic się nie dzieje
  });

  it('potwierdzenie podpowiedzi zużywa darmowy wybór bez kosztu; zmiana działa w walce', () => {
    const { g, s, it } = awoken();
    const gold = s.gold;
    expect(g.setAwakening(it.slot, 'Bestie')).toBe(true);
    expect(s.gold).toBe(gold);
    expect(it.awc).toBe(1);
    expect(g.stats.vs.Bestie).toBe(25);
    s.gold = 1e15;
    g.setAwakening(it.slot, 'Smoki');
    expect(g.stats.vs.Bestie ?? 0).toBe(0);
    expect(g.stats.vs.Smoki).toBe(25);
  });

  it('wczytanie: cecha z zapisu z tabeli (bez zawyżonych wartości), przebudzony bez cechy dostaje podpowiedź', () => {
    const { s, it } = awoken();
    const raw = JSON.parse(JSON.stringify(s));
    raw.eq[it.slot].aw = { kind: 'type', t: 'Demony', v: 999, name: 'Oszust' };
    expect(migrate(raw, T0).eq[it.slot]!.aw).toEqual({ kind: 'type', t: 'Demony', v: 25, name: 'Zguba Demonów' });
    raw.eq[it.slot].aw = { kind: 'type', t: 'Krasnoludy', v: 25, name: 'x' };
    expect(migrate(raw, T0).eq[it.slot]!.aw?.name).toBe('Zguba Bestii');
  });
});
