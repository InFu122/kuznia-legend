// Dziedzictwo (nowe pokolenie) zostało wycofane — kuźnia rośnie do 200. Kto je przeszedł, zachowuje premie.
import { describe, expect, it } from 'vitest';
import { B, LANDS } from '../src/data';
import { achValue } from '../src/engine/achievements';
import { equip, smelt } from '../src/engine/forge';
import { hasLegacy, legacyPct } from '../src/engine/legacy';
import { allMods } from '../src/engine/mods';
import { migrate } from '../src/engine/state';
import { computeStats, extraOf } from '../src/engine/stats';
import type { Item } from '../src/engine/types';
import { makeGame, T0 } from './helpers';

function veteran(seed = 1) {
  const h = makeGame(seed);
  const { ctx, s } = h;
  s.forge.lvl = 30; s.ores[4] = 200; s.stats.smelted = 10;
  for (let i = 0; i < 120 && Object.keys(s.eq).length < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true);
  s.cleared = LANDS.map((_, i) => i < 9); s.maxLand = 9; s.bestG = 95;
  return h;
}

describe('Dziedzictwo — tylko premie', () => {
  it('nowy gracz nie ma premii; gracz po Dziedzictwie zachowuje Gwiazdy Mistrza i Pamiątkę Rodu', () => {
    const { s } = veteran();
    expect(hasLegacy(s)).toBe(false);
    expect(legacyPct(s)).toBe(0);
    const heir = JSON.parse(JSON.stringify(s.eq.bron)) as Item;
    s.legacy = { gen: 2, stars: 5, item: heir };
    expect(hasLegacy(s)).toBe(true);
    expect(legacyPct(s)).toBe(5 * B.LEGACY_STAR_PCT);
    const m = allMods(s);
    expect(m.dmgPct).toBe(5 * B.LEGACY_STAR_PCT + allMods({ ...s, legacy: { gen: 0, stars: 0, item: null } }).dmgPct);
    const bare = computeStats({}, allMods(s), { ...extraOf(s), heir: null });
    const withHeir = computeStats({}, allMods(s), extraOf(s));
    const full = computeStats({ bron: heir }, allMods(s), { ...extraOf(s), heir: null });
    expect(withHeir.dmg - bare.dmg).toBeCloseTo((full.dmg - bare.dmg) * B.LEGACY_HEIR_PCT / 100, 0);
  });

  it('gra nie ma już nowego pokolenia; zapis zachowuje premie, a osiągnięcie kuźni nie skacze do 200', () => {
    const { g, s } = veteran(2);
    expect((g as unknown as Record<string, unknown>).legacy).toBeUndefined();
    s.legacy = { gen: 1, stars: 3, item: null };
    s.forge.lvl = 4;
    const back = migrate(JSON.parse(JSON.stringify(s)), T0);
    expect(back.legacy).toEqual({ gen: 1, stars: 3, item: null });
    expect(achValue(back, 'kuznia')).toBe(30);
    const old = JSON.parse(JSON.stringify(s));
    delete old.legacy;
    expect(migrate(old, T0).legacy).toEqual({ gen: 0, stars: 0, item: null });
    // dawne osiągnięcie „pokolenia” znika z zapisu (serwer by go nie przepuścił)
    const withOld = JSON.parse(JSON.stringify(s));
    withOld.ach = { kowal: 1, pokolenia: 2 };
    expect(migrate(withOld, T0).ach).toEqual({ kowal: 1 });
  });
});
