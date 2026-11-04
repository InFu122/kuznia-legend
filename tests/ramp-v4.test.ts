import { describe, expect, it } from 'vitest';
import { B, ORES, R } from '../src/data';
import { rollSubs, smelt, smeltDraws } from '../src/engine/forge';
import { JUMP_V, dist, dropChance, jumpChances, oreBase, oreNominal, oreRamps, smeltRarity } from '../src/engine/formulas';
import { mulberry32 } from '../src/engine/rng';
import { verifySmelt } from '../src/engine/verify';
import { makeGame } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;

describe('zasady w wersji 4: nowa ruda wchodzi stopniowo', () => {
  it('tylko rudy podnoszące minimum (Srebro, Mithril, Adamantyt, Smocza Stal)', () => {
    expect(ORES.map((_, i) => i).filter(oreRamps)).toEqual([2, 3, 4, 5]);
  });

  it('na poziomie odblokowania połowa o rzadkość niżej, potem mniej, po 5 poziomach pełne minimum (zasady v4–v5)', () => {
    const A = ORES[4];
    expect(dropChance(4, A.lvl, 5)).toBe(B.RAMP_DROP);
    expect(dropChance(4, A.lvl + 2, 5)).toBeCloseTo(B.RAMP_DROP * 0.6);
    expect(dropChance(4, A.lvl + B.RAMP_LEVELS, 5)).toBe(0);
    expect(dropChance(4, 1, 5)).toBe(B.RAMP_DROP); // przed odblokowaniem — jak przy odblokowaniu (podgląd)
    expect(dropChance(4, A.lvl, 3)).toBe(0);    // dawne zasady: bez spadku
    const d = dist(4, A.lvl, 0, 5);
    expect(d[0]).toEqual([3, B.RAMP_DROP]);
    expect(d[1][0]).toBe(4);
    expect(dist(4, A.lvl + 5, 0, 5)[0][0]).toBe(4);
    expect(dist(7, ORES[7].lvl, 0, 5)[0][0]).toBe(4); // Obsydian nie podnosi minimum względem Adamantytu
  });
});

describe('zasady w wersji 6: ruda dojrzewa z kuźnią', () => {
  it('ranga bazowa rośnie od odblokowania do jakości docelowej; ułamek to szansa na rangę niżej', () => {
    const A = ORES[4];
    expect(oreBase(4, A.lvl)).toBeCloseTo(A.v6[0]);
    expect(oreBase(4, A.v6[2])).toBeCloseTo(A.v6[1]);
    expect(oreBase(4, 200)).toBeCloseTo(A.v6[1]);
    for (let l = A.lvl + 1; l <= A.v6[2]; l++) expect(oreBase(4, l)).toBeGreaterThan(oreBase(4, l - 1));
    // Adamantyt na 25. poziomie: ranga 3,6 → Epicki, 40% wyników bez przeskoku o rangę niżej (Wyjątkowy)
    expect(oreNominal(4, A.lvl)).toBe(4);
    const [q1, q2] = jumpChances(A.lvl, 0, 4);
    expect(dropChance(4, A.lvl)).toBeCloseTo(0.4 * (100 - q1 - q2), 6);
    expect(dist(4, A.lvl).map(([r]) => r)).toEqual([R.WYJATKOWY, R.EPICKI, R.HEROICZNY, R.LEGENDARNY]);
    // dojrzała ruda: bez spadku
    expect(dropChance(4, A.v6[2])).toBe(0);
    expect(dist(4, A.v6[2])[0][0]).toBe(R.LEGENDARNY);
    // Żelazo na starcie: pół na pół Zwykły i Niepospolity (przed przeskokiem)
    expect(dist(1, 1).map(([r]) => r)).toEqual([R.ZWYKLY, R.NIEPOSPOLITY, R.RZADKI, R.WYJATKOWY]);
  });

  it('wytop: część wyników o rzadkość niżej; nie liczą się jako przeskok i nabijają gwarancję', () => {
    const { ctx, s } = makeGame(11);
    s.forge.lvl = ORES[4].lvl; s.stats.smelted = 10; s.ores[4] = 2000;
    let low = 0, jumps0 = s.stats.jumps;
    for (let i = 0; i < 2000; i++) {
      s.pity = 0;
      const it = smelt(ctx, 4, null)!;
      if (it.jump === -1) { low++; expect(it.r).toBe(R.WYJATKOWY); expect(s.pity).toBe(1); }
    }
    const pd = dropChance(4, ORES[4].lvl) / 100;
    expect(low / 2000).toBeGreaterThan(pd - 0.04);
    expect(low / 2000).toBeLessThan(pd + 0.04);
    expect(s.stats.jumps - jumps0).toBeLessThan(2000 - low);
  });

  it('gwarancja przeskoku działa także po wyniku o rzadkość niżej', () => {
    const { ctx, s } = makeGame(12);
    s.forge.lvl = ORES[4].lvl; s.stats.smelted = 10; s.ores[4] = 10;
    s.seeds = [];
    let it;
    do { s.pity = B.PITY_MAX; it = smelt(ctx, 4, null)!; } while (it.forced !== 'pity');
    expect(it.jump).toBe(1);
    expect(it.r).toBe(R.HEROICZNY);
  });

  it('serwer: wynik o rzadkość niżej przechodzi kontrolę, a zawyżony nie; dawne zasady tylko dla wcześniejszych wytopów', () => {
    const { ctx, s } = makeGame(13);
    const L = ORES[4].lvl;
    s.forge.lvl = L; s.stats.smelted = 10; s.ores[4] = 10;
    // ziarno z wynikiem w strefie spadku według zasad v6 i v5
    const edge = 100 - Math.min(dropChance(4, L), dropChance(4, L, 5));
    let n = 0;
    while (smeltDraws(mulberry32(seedFor(n))).roll < edge) n++;
    s.seeds = [seedFor(n)]; s.sx = n;
    const it = smelt(ctx, 4, null)!;
    expect(it.jv).toBe(JUMP_V);
    expect(it.jump).toBe(-1);
    expect(it.r).toBe(R.WYJATKOWY);
    expect(verifySmelt(it, seedFor(n), 0, L)).toBeNull();
    // zawyżony: udaje, że nie było spadku
    const fake = { ...it, jump: 0, r: R.EPICKI };
    expect(verifySmelt(fake, seedFor(n), 0, L)).not.toBeNull();
    // ten sam wytop według zasad w wersji 5 (Adamantyt z minimum Legendarnym, spadek na Epicki) — tylko jako wytop sprzed aktualizacji
    const rng = mulberry32(seedFor(n)); smeltDraws(rng);
    const r5 = smeltRarity(4, L, -1, 5);
    expect(r5).toBe(R.EPICKI);
    const v5 = { ...it, jv: 5, jump: -1, r: r5, subs: rollSubs(rng, r5) };
    expect(verifySmelt(v5, seedFor(n), 0, L, 5)).toBeNull();
    expect(verifySmelt(v5, seedFor(n), 0, L)).not.toBeNull();
  });
});
