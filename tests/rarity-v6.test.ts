// 10 rzadkości i płynne szanse rud (zasady przeskoku v6). Dawne przedmioty (indeksy 0–6) nie zmieniają się.
import { describe, expect, it } from 'vitest';
import { ORES, ORE_ORDER, R, RANK_MAX, RAR, RAR_ORDER, SLOTS, rAt, rCmp, rGe, rRank, subMult } from '../src/data';
import { achValue } from '../src/engine/achievements';
import { smelt } from '../src/engine/forge';
import { JUMP_V, dist, lvlFactor, mainVal, oreBase, oreLvl, sellPrice } from '../src/engine/formulas';
import { verifySmelt } from '../src/engine/verify';
import { validateSave } from '../server/src/validate';
import type { Item } from '../src/engine/types';
import { makeGame } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;
const item = (r: number, extra: Partial<Item> = {}): Item => ({
  id: 1, slot: 'bron', kind: 'Miecz', g: 'm', ore: 4, r, lvl: 60, subs: [], el: null, jump: 0, flvl: 30, forced: '', jv: JUMP_V,
  smith: 'Adam', land: 'Spalona Wioska', fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: ['Adam'], obieg: false, set: null, ...extra,
});

describe('10 rzadkości', () => {
  it('kolejność: Zwykły … Rzadki, Wyjątkowy, Epicki, Heroiczny, Legendarny, Pradawny, Mityczny, Boski', () => {
    expect(RAR_ORDER.map(r => RAR[r].n)).toEqual(['Zwykły', 'Niepospolity', 'Rzadki', 'Wyjątkowy', 'Epicki', 'Heroiczny', 'Legendarny', 'Pradawny', 'Mityczny', 'Boski']);
    expect([...RAR_ORDER].sort((a, b) => a - b)).toEqual(RAR.map((_, i) => i));
    for (let k = 1; k <= RANK_MAX; k++) {
      expect(RAR[rAt(k)].m).toBeGreaterThan(RAR[rAt(k - 1)].m);
      expect(RAR[rAt(k)].s).toBeGreaterThanOrEqual(RAR[rAt(k - 1)].s);
      expect(RAR[rAt(k)].o).toBeGreaterThan(RAR[rAt(k - 1)].o);
      expect(rRank(rAt(k))).toBe(k);
    }
    expect(rGe(R.HEROICZNY, R.EPICKI)).toBe(true);
    expect(rGe(R.HEROICZNY, R.LEGENDARNY)).toBe(false);
    expect([R.MITYCZNY, R.WYJATKOWY, R.BOSKI, R.ZWYKLY].sort(rCmp)).toEqual([R.ZWYKLY, R.WYJATKOWY, R.MITYCZNY, R.BOSKI]);
  });

  it('dawne rzadkości bez zmian: statystyki dodatkowe, cena sprzedaży i siła', () => {
    for (let r = 0; r <= 6; r++) {
      expect(subMult(r)).toBeCloseTo(1 + 0.15 * r, 10);
      expect(RAR[r].o).toBe(r);
    }
    expect(mainVal(item(R.LEGENDARNY))).toBe(Math.round(SLOTS.bron.base * lvlFactor(60) * 3.2));
    expect(mainVal(item(R.HEROICZNY))).toBeLessThan(mainVal(item(R.LEGENDARNY)));
    expect(mainVal(item(R.HEROICZNY))).toBeGreaterThan(mainVal(item(R.EPICKI)));
    expect(sellPrice(item(R.PRADAWNY))).toBeGreaterThan(sellPrice(item(R.LEGENDARNY)));
    expect(sellPrice(item(R.PRADAWNY))).toBeLessThan(sellPrice(item(R.MITYCZNY)));
  });

  it('osiągnięcie „Blask rzadkości”: nowa rzadkość liczy się jak dawna poniżej', () => {
    const { s } = makeGame(1);
    s.stats.bestR = R.HEROICZNY;
    expect(achValue(s, 'rzadkosc')).toBe(R.EPICKI);
    s.stats.bestR = R.PRADAWNY;
    expect(achValue(s, 'rzadkosc')).toBe(R.LEGENDARNY);
  });
});

describe('płynne szanse rud', () => {
  it('najlepsza ruda na każdym poziomie kuźni: średnia siła rośnie małymi krokami, bez spadków po zmianie rudy', () => {
    const mean = (f: number) => {
      let o = 0;
      for (let k = ORE_ORDER.length - 2; k >= 0; k--) if (oreLvl(ORE_ORDER[k]) <= f) { o = ORE_ORDER[k]; break; }
      return dist(o, f).reduce((a, [r, p]) => a + RAR[r].m * (ORES[o].q ?? 1) * p / 100, 0);
    };
    for (let f = 2; f <= 200; f++) {
      const a = mean(f - 1), b = mean(f);
      expect(b, `poziom ${f}`).toBeGreaterThan(a * 0.98);
      expect(b, `poziom ${f}`).toBeLessThan(a * 1.25);
    }
  });

  it('żadna ruda nie daje od razu twardego minimum: na poziomie odblokowania mieszanka dwóch rzadkości (poza Miedzią i Boską Rudą)', () => {
    for (const o of ORE_ORDER) {
      const b = oreBase(o, ORES[o].lvl);
      if (o === 0 || b === Math.round(b)) continue;
      const d = dist(o, ORES[o].lvl);
      expect(d.length, ORES[o].n).toBeGreaterThanOrEqual(3);
      expect(d[0][1], ORES[o].n).toBeGreaterThan(5);
    }
  });

  it('serwer sprawdza wytopy v6: zwykłe, z gwarancją i na różnych poziomach kuźni', () => {
    for (const [ore, lvl] of [[1, 1], [2, 7], [3, 20], [4, 33], [5, 75], [6, 105]] as const) {
      const { ctx, s } = makeGame(ore + 2);
      s.forge.lvl = lvl; s.stats.smelted = 10; s.ores[ore] = 100;
      for (let n = 0; n < 40; n++) {
        s.seeds = [seedFor(n)]; s.sx = n;
        if (n % 10 === 9) s.pity = 99;
        const it = smelt(ctx, ore, null)!;
        expect(verifySmelt(it, seedFor(n), 0, lvl), `${ORES[ore].n} ${lvl}: ${RAR[it.r].n}`).toBeNull();
        if (rRank(it.r) < RANK_MAX) expect(verifySmelt({ ...it, r: rAt(rRank(it.r) + 1) }, seedFor(n), 0, lvl)).not.toBeNull();
      }
    }
  });

  it('kontrola zapisu: nowa rzadkość z właściwej rudy przechodzi, z niewłaściwej nie', () => {
    const { s } = makeGame(3);
    s.forge.lvl = 80;
    s.eq = { bron: item(R.PRADAWNY, { ore: 5, flvl: 75 }) };
    expect(validateSave(s).filter(x => /rzadkość/.test(x))).toEqual([]);
    s.eq = { bron: item(R.PRADAWNY, { ore: 0 }) };
    expect(validateSave(s).filter(x => /rzadkość/.test(x)).length).toBe(1);
    s.eq = { bron: item(R.WYJATKOWY, { ore: 1, flvl: 3 }) };
    expect(validateSave(s).filter(x => /rzadkość/.test(x))).toEqual([]);
  });
});
