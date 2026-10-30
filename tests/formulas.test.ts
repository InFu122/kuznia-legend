import { describe, expect, it } from 'vitest';
import { ORES } from '../src/data';
import { dist, dropChance, jumpChances, legStage, maxJump, upCost, upTime } from '../src/engine/formulas';

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
        const low = dropChance(o, l) > 0 ? 1 : 0; // nowa ruda tuż po odblokowaniu: także o rzadkość niżej
        expect(d[0][0]).toBe(ORES[o].floor - low);
        expect(Math.max(...d.map(([r]) => r))).toBeLessThanOrEqual(6);
        expect(d.length).toBe(maxJump(o) + 1 + low);
        expect(d.every(([, p]) => p >= 0)).toBe(true);
      }
    }
  });
});

describe('kuźnia', () => {
  it('koszt ulepszenia rośnie o 50% na poziom', () => {
    expect(upCost(2)).toBe(150);
    expect(upCost(10)).toBe(3844);
  });
  it('pierwsze ulepszenia trwają minuty, potem dni; cała kuźnia (200 poziomów) to ok. roku', () => {
    expect(upTime(2)).toBe(30000);
    let sum = 0;
    for (let n = 2; n <= 10; n++) sum += upTime(n);
    expect(sum / 3600000).toBeLessThan(2.5);
    for (let n = 3; n <= 200; n++) expect(upTime(n)).toBeGreaterThanOrEqual(upTime(n - 1));
    for (let n = 11; n <= 20; n++) sum += upTime(n);
    expect(sum / 86400000).toBeGreaterThan(4.5);
    expect(sum / 86400000).toBeLessThan(6);
    for (let n = 21; n <= 200; n++) sum += upTime(n);
    expect(sum / 86400000).toBeGreaterThan(330);
    expect(sum / 86400000).toBeLessThan(400);
    expect(upTime(200) / 86400000).toBeLessThan(3);
    expect(upTime(201)).toBe(upTime(200));
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
