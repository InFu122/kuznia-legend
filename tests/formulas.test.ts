import { describe, expect, it } from 'vitest';
import { ORES } from '../src/data';
import { dist, jumpChances, legStage, maxJump, upCost, upTime } from '../src/engine/formulas';

describe('szanse przeskoku', () => {
  it('zgadzają się z tabelą balansu na krańcach', () => {
    expect(jumpChances(1)).toEqual([10, 1]);
    expect(jumpChances(30)).toEqual([25, 4]);
  });
  it('rosną z każdym poziomem kuźni', () => {
    for (let l = 2; l <= 30; l++) {
      const [a1, a2] = jumpChances(l - 1);
      const [b1, b2] = jumpChances(l);
      expect(b1).toBeGreaterThan(a1);
      expect(b2).toBeGreaterThan(a2);
    }
  });
  it('rozkład każdej rudy sumuje się do 100% i nie przekracza Boskiego', () => {
    for (let o = 0; o < ORES.length; o++) {
      for (let l = 1; l <= 30; l++) {
        const d = dist(o, l);
        expect(d.reduce((s, [, p]) => s + p, 0)).toBeCloseTo(100, 6);
        expect(d[0][0]).toBe(ORES[o].floor);
        expect(Math.max(...d.map(([r]) => r))).toBeLessThanOrEqual(6);
        expect(d.length).toBe(maxJump(o) + 1);
      }
    }
  });
});

describe('kuźnia', () => {
  it('koszt ulepszenia rośnie o 50% na poziom', () => {
    expect(upCost(2)).toBe(150);
    expect(upCost(10)).toBe(3844);
  });
  it('pierwsze ulepszenia trwają minuty, ostatnie dni; łącznie ok. 2 miesięcy', () => {
    expect(upTime(2)).toBe(30000);
    let sum = 0;
    for (let n = 2; n <= 10; n++) sum += upTime(n);
    expect(sum / 3600000).toBeLessThan(2.5);
    for (let n = 3; n <= 30; n++) expect(upTime(n)).toBeGreaterThan(upTime(n - 1));
    expect(upTime(30) / 86400000).toBeGreaterThan(7);
    for (let n = 11; n <= 30; n++) sum += upTime(n);
    expect(sum / 86400000).toBeGreaterThan(50);
    expect(sum / 86400000).toBeLessThan(65);
  });
});

describe('progi legendy', () => {
  it('Zahartowany od 1000, Sławny od 5000, Przebudzony od 20 000 Sławy', () => {
    expect(legStage(999)).toBe(0);
    expect(legStage(1000)).toBe(1);
    expect(legStage(5000)).toBe(2);
    expect(legStage(19999)).toBe(2);
    expect(legStage(20000)).toBe(3);
  });
});
