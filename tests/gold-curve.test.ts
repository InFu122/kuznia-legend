import { describe, expect, it } from 'vitest';
import { B } from '../src/data';
import { vaultUnit } from '../src/engine/dungeon';
import { upgradeCost } from '../src/engine/forge';
import { goldWave, goldWaveOf, goldWaves, goldWavesSmooth } from '../src/engine/formulas';
import { makeGame } from './helpers';

describe('krzywa złota', () => {
  it('złoto z fali nigdy nie maleje z postępem (dawniej spadało w krainach 5–7: 21 → 12 → 8)', () => {
    let prev = 0;
    for (let g = 0; g <= 400; g++) {
      const w = goldWave(g);
      expect(w).toBeGreaterThanOrEqual(prev);
      prev = w;
    }
    expect(goldWave(59)).toBeGreaterThan(goldWave(39)); // boss 6. krainy płaci więcej niż boss 4.
  });

  it('wygładzenie: fale na ulepszenie rosną najwyżej ×1,4 na poziom i nie przekraczają dawnych', () => {
    for (let f = 2; f <= B.FORGE_MAX; f++) {
      expect(goldWavesSmooth(f)).toBeLessThanOrEqual(goldWaves(f) + 1e-9);
      expect(goldWavesSmooth(f) / goldWavesSmooth(f - 1)).toBeLessThanOrEqual(1.4 + 1e-9);
    }
    expect(goldWavesSmooth(10)).toBe(goldWaves(10)); // początek gry bez zmian
    expect(goldWavesSmooth(40)).toBe(goldWaves(40)); // późna gra bez zmian
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
