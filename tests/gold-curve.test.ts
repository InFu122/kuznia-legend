import { describe, expect, it } from 'vitest';
import { B, GOLD_CUT, GOLD_TIME_K, UPGRADE_MIN } from '../src/data';
import { vaultUnit } from '../src/engine/dungeon';
import { upgradeCost } from '../src/engine/forge';
import { goldWave, goldWaveOf, goldWaves, goldWavesSmooth, upCost } from '../src/engine/formulas';
import { makeGame } from './helpers';
import { COMPANION_MAX, PET_GOLD_MAX, STARS_MAX, TECH, petTraitValue } from '../src/data';
import { allMods } from '../src/engine/mods';
import { migrate } from '../src/engine/state';
import { techCost, techText } from '../src/engine/tech';

describe('krzywa złota', () => {
  it('złoto z fali nigdy nie maleje z postępem (dawniej spadało w krainach 5–7: 21 → 12 → 8)', () => {
    let prev = 0;
    for (let g = 0; g <= 400; g++) {
      const w = goldWave(g);
      expect(w).toBeGreaterThanOrEqual(prev);
      prev = w;
    }
    // Między kuźnią 10 a ok. 18 złoto z fali stoi w miejscu (cel fal rośnie tam szybciej niż koszt), dalej rośnie.
    expect(goldWave(99)).toBeGreaterThan(goldWave(39)); // boss 10. krainy płaci więcej niż boss 4.
  });

  it('wygładzenie: fale na ulepszenie nie przekraczają celu, a złoto z fali nie maleje z poziomem kuźni', () => {
    const per = (f: number) => upCost(Math.min(B.FORGE_MAX, f + 1)) / goldWavesSmooth(f);
    for (let f = 2; f <= B.FORGE_MAX; f++) {
      expect(goldWavesSmooth(f)).toBeLessThanOrEqual(goldWaves(f) + 1e-6);
      expect(per(f)).toBeGreaterThanOrEqual(per(f - 1) - 1e-6);
    }
    expect(goldWavesSmooth(10)).toBe(goldWaves(10)); // początek gry bez zmian
    expect(goldWavesSmooth(40)).toBeCloseTo(goldWaves(40), 6); // późna gra: dokładnie cel
    // Cel: od 20. poziomu kuźni K × GOLD_CUT fal na minutę czasu ulepszenia (dawniej × 2,5).
    expect(goldWaves(25)).toBeCloseTo(GOLD_TIME_K * GOLD_CUT * UPGRADE_MIN[26], 6);
  });

  it('koszt ulepszeń: ×1,5 na poziom, ale od 11. do 24. poziomu szybciej (B.UPGRADE_COST_MULT_MID)', () => {
    expect(upCost(10) / upCost(9)).toBeCloseTo(1.5, 3);
    expect(upCost(11) / upCost(10)).toBeCloseTo(B.UPGRADE_COST_MULT_MID, 3);
    expect(upCost(24) / upCost(23)).toBeCloseTo(B.UPGRADE_COST_MULT_MID, 3);
    expect(upCost(25) / upCost(24)).toBeCloseTo(1.5, 3);
    expect(upCost(31) / upCost(30)).toBeCloseTo(1.04, 3);
  });

  it('Skarbiec: goblin wart co najmniej 1/500 kosztu ulepszenia — 15 goblinów to ok. 1/5 ulepszenia', () => {
    const { s } = makeGame(3);
    s.forge.lvl = 18; s.bestG = 55;
    const unit = vaultUnit(s);
    expect(unit).toBeGreaterThanOrEqual(goldWaveOf(s));
    const cost = upgradeCost(s, 19);
    let sum = 0;
    for (let k = 1; k <= 15; k++) sum += unit * (3 + 0.5 * k);
    expect(sum / cost).toBeGreaterThan(0.2);
    expect(sum / cost).toBeLessThan(0.3);
  });
});

describe('premie do złota (listopad 2026)', () => {
  it('Kupiec: +2,5% na poziom, najwyżej +25%', () => {
    expect(TECH.e_kupiec.per).toBe(2.5);
    expect(TECH.e_kupiec.per * TECH.e_kupiec.max).toBe(25);
    expect(techText('e_kupiec', 3)).toBe('+7,5% złota z walki i sprzedaży');
  });

  it('Kruk: premia do złota najwyżej 10%, także z Więzią', () => {
    expect(petTraitValue('kruk', 1, 0)).toBe(2);
    expect(petTraitValue('kruk', 15, 0)).toBeCloseTo(3.4, 5);
    expect(petTraitValue('kruk', COMPANION_MAX, STARS_MAX)).toBe(PET_GOLD_MAX);
    const { s } = makeGame();
    s.pets.kruk = { lvl: COMPANION_MAX, stars: STARS_MAX };
    s.petSel = 'kruk';
    s.tech.lv.t_wiez = 10;
    expect(allMods(s).goldPct).toBe(PET_GOLD_MAX);
    // Inne cechy bez limitu
    expect(petTraitValue('zolw', COMPANION_MAX, STARS_MAX)).toBeGreaterThan(PET_GOLD_MAX);
  });

  it('stary zapis: Nocna zmiana ponad 12 poziomów wraca do 12 z oddaniem Ksiąg, trwające badanie ponad limit jest przerwane', () => {
    const { s } = makeGame();
    s.tech.lv.e_noc = 14;
    s.books = 5;
    const back = techCost('e_noc', 12).books + techCost('e_noc', 13).books;
    const m = migrate(JSON.parse(JSON.stringify(s)), Date.now());
    expect(m.tech.lv.e_noc).toBe(12);
    expect(m.books).toBe(5 + back);
    const s2 = JSON.parse(JSON.stringify(s));
    s2.tech.lv.e_noc = 12;
    s2.tech.cur = { id: 'e_noc', left: 1000, total: 5000 };
    const m2 = migrate(s2, Date.now());
    expect(m2.tech.cur).toBeNull();
    expect(m2.books).toBe(5 + techCost('e_noc', 12).books);
    // Zwykłe badania bez zmian
    const s3 = JSON.parse(JSON.stringify(s));
    s3.tech.lv.e_noc = 7;
    s3.tech.cur = { id: 'e_noc', left: 1000, total: 5000 };
    const m3 = migrate(s3, Date.now());
    expect(m3.tech.lv.e_noc).toBe(7);
    expect(m3.tech.cur).not.toBeNull();
  });
});
