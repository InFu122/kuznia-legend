import { describe, expect, it } from 'vitest';
import { B, ORES } from '../src/data';
import { rollSubs, smelt, smeltDraws } from '../src/engine/forge';
import { JUMP_V, dist, dropChance, oreRamps } from '../src/engine/formulas';
import { mulberry32 } from '../src/engine/rng';
import { verifySmelt } from '../src/engine/verify';
import { makeGame } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;

describe('zasady w wersji 4: nowa ruda wchodzi stopniowo', () => {
  it('tylko rudy podnoszące minimum (Srebro, Mithril, Adamantyt, Smocza Stal)', () => {
    expect(ORES.map((_, i) => i).filter(oreRamps)).toEqual([2, 3, 4, 5]);
  });

  it('na poziomie odblokowania połowa o rzadkość niżej, potem mniej, po 5 poziomach pełne minimum', () => {
    const A = ORES[4];
    expect(dropChance(4, A.lvl)).toBe(B.RAMP_DROP);
    expect(dropChance(4, A.lvl + 2)).toBeCloseTo(B.RAMP_DROP * 0.6);
    expect(dropChance(4, A.lvl + B.RAMP_LEVELS)).toBe(0);
    expect(dropChance(4, 1)).toBe(B.RAMP_DROP); // przed odblokowaniem — jak przy odblokowaniu (podgląd)
    expect(dropChance(4, A.lvl, 3)).toBe(0);    // dawne zasady: bez spadku
    const d = dist(4, A.lvl);
    expect(d[0]).toEqual([3, B.RAMP_DROP]);
    expect(d[1][0]).toBe(4);
    expect(dist(4, A.lvl + 5)[0][0]).toBe(4);
    expect(dist(7, ORES[7].lvl)[0][0]).toBe(4); // Obsydian nie podnosi minimum względem Adamantytu
  });

  it('wytop: część wyników o rzadkość niżej; nie liczą się jako przeskok i nabijają gwarancję', () => {
    const { ctx, s } = makeGame(11);
    s.forge.lvl = ORES[4].lvl; s.stats.smelted = 10; s.ores[4] = 2000;
    let low = 0, jumps0 = s.stats.jumps;
    for (let i = 0; i < 2000; i++) {
      s.pity = 0;
      const it = smelt(ctx, 4, null)!;
      if (it.jump === -1) { low++; expect(it.r).toBe(3); expect(s.pity).toBe(1); }
    }
    expect(low / 2000).toBeGreaterThan(0.45);
    expect(low / 2000).toBeLessThan(0.55);
    expect(s.stats.jumps - jumps0).toBeLessThan(2000 - low);
  });

  it('gwarancja przeskoku działa także po wyniku o rzadkość niżej', () => {
    const { ctx, s } = makeGame(12);
    s.forge.lvl = ORES[4].lvl; s.stats.smelted = 10; s.ores[4] = 10;
    s.seeds = [];
    let it;
    do { s.pity = B.PITY_MAX; it = smelt(ctx, 4, null)!; } while (it.forced !== 'pity');
    expect(it.jump).toBe(1);
    expect(it.r).toBe(5);
  });

  it('serwer: wynik o rzadkość niżej przechodzi kontrolę, a zawyżony nie; dawne zasady tylko dla wcześniejszych wytopów', () => {
    const { ctx, s } = makeGame(13);
    s.forge.lvl = ORES[4].lvl; s.stats.smelted = 10; s.ores[4] = 10;
    // ziarno z wynikiem w strefie spadku
    let n = 0;
    while (smeltDraws(mulberry32(seedFor(n))).roll < 100 - B.RAMP_DROP) n++;
    s.seeds = [seedFor(n)]; s.sx = n;
    const it = smelt(ctx, 4, null)!;
    expect(it.jv).toBe(JUMP_V);
    expect(it.jump).toBe(-1);
    expect(it.r).toBe(3);
    expect(verifySmelt(it, seedFor(n), 0, s.forge.lvl)).toBeNull();
    // zawyżony: udaje, że nie było spadku
    const fake = { ...it, jump: 0, r: 4 };
    expect(verifySmelt(fake, seedFor(n), 0, s.forge.lvl)).not.toBeNull();
    // ten sam wytop według zasad w wersji 3 (bez spadku) — tylko jako wytop sprzed aktualizacji
    const rng = mulberry32(seedFor(n)); smeltDraws(rng);
    const v3 = { ...fake, jv: 3, subs: rollSubs(rng, 4) };
    expect(verifySmelt(v3, seedFor(n), 0, s.forge.lvl, 3)).toBeNull();
    expect(verifySmelt(v3, seedFor(n), 0, s.forge.lvl)).not.toBeNull();
  });
});
