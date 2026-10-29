import { describe, expect, it } from 'vitest';
import { B, ORES } from '../src/data';
import { canSmelt, equip, smelt, startUpgrade, tickForge } from '../src/engine/forge';
import { maxJump, upCost, upTime } from '../src/engine/formulas';
import { constRng, makeGame } from './helpers';

describe('wytop', () => {
  it('ruda zawsze gwarantuje minimalną rzadkość i nigdy nie przekracza limitu przeskoku', () => {
    const { ctx, s } = makeGame(7);
    s.forge.lvl = 30;
    s.stats.smelted = 10;
    for (let o = 0; o < ORES.length; o++) {
      s.ores[o] = 3000;
      for (let i = 0; i < 3000; i++) {
        const it = smelt(ctx, o, null)!;
        expect(it.r).toBeGreaterThanOrEqual(ORES[o].floor);
        expect(it.r).toBeLessThanOrEqual(Math.min(6, ORES[o].floor + maxJump(o)));
      }
    }
  });

  it('na 30. poziomie około co piąty wytop Mithrilu przeskakuje na Legendarny, a co 45. na Mityczny', () => {
    const { ctx, s } = makeGame(11);
    s.forge.lvl = 30;
    s.stats.smelted = 10;
    s.ores[3] = 20000;
    let up1 = 0, up2 = 0;
    for (let i = 0; i < 20000; i++) {
      const it = smelt(ctx, 3, null)!;
      if (it.r === 4) up1++;
      if (it.r === 5) up2++;
    }
    // bazowo 25% i 4%, ale przeskok na Legendarny ×0,8, na Mityczny ×0,55
    expect(up1 / 20000).toBeGreaterThan(0.18);
    expect(up1 / 20000).toBeLessThan(0.22);
    expect(up2 / 20000).toBeGreaterThan(0.016);
    expect(up2 / 20000).toBeLessThan(0.029);
  });

  it(`po ${B.PITY_MAX} wytopach bez przeskoku następny przeskakuje na pewno`, () => {
    const { ctx, s } = makeGame(1, constRng(0.999));
    s.stats.smelted = 10;
    s.ores[1] = 100;
    for (let i = 0; i < B.PITY_MAX; i++) expect(smelt(ctx, 1, null)!.jump).toBe(0);
    const it = smelt(ctx, 1, null)!;
    expect(it.jump).toBe(1);
    expect(it.forced).toBe('pity');
    expect(s.pity).toBe(0);
  });

  it('samouczek: pierwszy przedmiot to broń, trzeci wytop przeskakuje', () => {
    const { ctx } = makeGame(1, constRng(0.999));
    expect(smelt(ctx, 1, null)!.slot).toBe('bron');
    smelt(ctx, 1, null);
    const third = smelt(ctx, 1, null)!;
    expect(third.jump).toBe(1);
    expect(third.forced).toBe('tut');
  });

  it('nie da się wytopić rudy zablokowanej albo bez zapasu', () => {
    const { ctx, s } = makeGame();
    s.ores[3] = 5;
    expect(canSmelt(ctx, 3)).toBe(false); // Mithril od 10. poziomu
    expect(smelt(ctx, 3, null)).toBeNull();
    s.ores[0] = 0;
    expect(smelt(ctx, 0, null)).toBeNull();
  });

  it('domieszka zużywa się tylko od 10. poziomu kuźni', () => {
    const { ctx, s } = makeGame();
    s.els.zar = 2;
    expect(smelt(ctx, 1, 'zar')!.el).toBeNull();
    s.forge.lvl = 10;
    expect(smelt(ctx, 1, 'zar')!.el).toBe('zar');
    expect(s.els.zar).toBe(1);
  });

  it('przetopienie legendy przenosi połowę Sławy na nowy przedmiot', () => {
    const { ctx } = makeGame();
    const a = smelt(ctx, 1, null)!;
    equip(ctx, a, true);
    a.fame = 4000;
    a.kills = { Bestie: 4000 };
    const b = { ...smelt(ctx, 1, null)!, slot: a.slot };
    equip(ctx, b, true);
    expect(b.fame).toBe(2000);
    expect(b.kills.Bestie).toBe(2000);
    expect(b.ls).toBe(1);
  });
});

describe('ulepszanie kuźni', () => {
  it('pobiera złoto i kończy się po czasie ulepszenia', () => {
    const { ctx, s } = makeGame();
    s.gold = 1000;
    expect(startUpgrade(ctx)).toBe(true);
    expect(s.gold).toBe(1000 - upCost(2));
    expect(startUpgrade(ctx)).toBe(false); // drugie ulepszenie naraz
    expect(tickForge(ctx, upTime(2) - 1, true)).toBe(false);
    expect(tickForge(ctx, 2, true)).toBe(true);
    expect(s.forge.lvl).toBe(2);
  });
});
