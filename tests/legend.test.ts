import { describe, expect, it } from 'vitest';
import { equip, smelt } from '../src/engine/forge';
import { addFame } from '../src/engine/legend';
import { makeGame } from './helpers';

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
