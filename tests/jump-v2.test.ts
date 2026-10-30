import { describe, expect, it } from 'vitest';
import { B } from '../src/data';
import { rollSubs, smelt, smeltDraws } from '../src/engine/forge';
import { JUMP_V, dist, jumpChances, pityAllowed } from '../src/engine/formulas';
import { mulberry32 } from '../src/engine/rng';
import { verifySmelt } from '../src/engine/verify';
import { makeGame } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;

describe('przeskoki w wersji 2: rzadsze wyniki są trudniejsze', () => {
  it('Boski z przeskoku jest rzadki: z Adamantytu ok. 1%, ze Smoczej Stali ok. 7% na 30. poziomie kuźni', () => {
    const ad = dist(4, 30, 0, 2);   // Legendarny, Mityczny, Boski (zasady w wersji 2)
    expect(ad[2][0]).toBe(6);
    expect(ad[2][1]).toBeCloseTo(1, 1);
    expect(ad[1][1]).toBeCloseTo(13.75, 1);
    const ds = dist(5, 30, 0, 2);   // Mityczny, Boski
    expect(ds[1][1]).toBeCloseTo(7.25, 1);
    // niskie rzadkości bez zmian
    expect(jumpChances(10, 0, 0)).toEqual(jumpChances(10, 0));
  });

  it('pewny przeskok nie daje Boskiego (Smocza Stal), ale działa dla niższych rud', () => {
    expect(pityAllowed(5)).toBe(false);
    expect(pityAllowed(4)).toBe(true);
    expect(pityAllowed(5, 1)).toBe(true); // dawne zasady
    expect(pityAllowed(6)).toBe(false); // Gwiezdny Kruszec: pewny przeskok nie daje Boskiego
    const { ctx, s } = makeGame(5);
    s.forge.lvl = 25; s.ores[5] = 5000; s.stats.smelted = 10;
    let pity = 0;
    for (let i = 0; i < 3000; i++) { s.pity = B.PITY_MAX; if (smelt(ctx, 5, null)!.forced === 'pity') pity++; }
    expect(pity).toBe(0);
  });

  it('nowe przedmioty mają wersję zasad; dawne przechodzą kontrolę tylko jako wytopy sprzed aktualizacji', () => {
    const { ctx, s } = makeGame(2);
    s.forge.lvl = 30; s.stats.smelted = 10; s.ores[4] = 100;
    // ziarno, przy którym dawne zasady dawały przeskok o 2 (Boski), a nowe już nie
    const [, oldP2] = jumpChances(30, 0, 4, 1);
    const [, newP2] = jumpChances(30, 0, 4, 2);
    let n = 0;
    while (true) { const r = smeltDraws(mulberry32(seedFor(n))).roll; if (r >= newP2 && r < oldP2) break; n++; }
    s.seeds = [seedFor(n)]; s.sx = n;
    const it = smelt(ctx, 4, null)!;
    expect(it.jv).toBe(JUMP_V);
    expect(it.r).toBe(5); // dziś: Mityczny
    expect(verifySmelt(it, seedFor(n), 0, 30)).toBeNull();
    // ten sam wytop według dawnych zasad: Boski, bez numeru wersji
    const rng = mulberry32(seedFor(n)); smeltDraws(rng);
    const old = { ...it, r: 6, jump: 2, subs: rollSubs(rng, 6), jv: undefined };
    expect(verifySmelt(old, seedFor(n), 0, 30, 1)).toBeNull();
    expect(verifySmelt(old, seedFor(n), 0, 30, 2)).not.toBeNull();
    expect(verifySmelt(old, seedFor(n), 0, 30)).not.toBeNull(); // dziś przedmiot bez wersji zasad nie przejdzie
    // nieznana wersja zasad — odrzucona
    expect(verifySmelt({ ...it, jv: 7 }, seedFor(n), 0, 30, 1)).not.toBeNull();
  });
});
