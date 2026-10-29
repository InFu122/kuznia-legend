import { describe, expect, it } from 'vitest';
import { B, LANDS } from '../src/data';
import { equip, smelt } from '../src/engine/forge';
import { legacyBlock, legacyReset, legacyStars } from '../src/engine/legacy';
import { allMods } from '../src/engine/mods';
import { migrate } from '../src/engine/state';
import { computeStats, extraOf } from '../src/engine/stats';
import { makeGame, T0 } from './helpers';

function veteran(seed = 1) {
  const h = makeGame(seed);
  const { ctx, s } = h;
  s.forge.lvl = 30; s.ores[6] = 200; s.stats.smelted = 10;
  for (let i = 0; i < 120 && Object.keys(s.eq).length < 8; i++) equip(ctx, smelt(ctx, 6, null)!, true);
  s.cleared = LANDS.map((_, i) => i < 9); s.maxLand = 9; s.bestG = 95;
  s.gold = 1e9; s.books = 77; s.scrolls = 5; s.gems = 123; s.tech.lv = { w_ostrze: 4 }; s.pets = { wilczek: { lvl: 5, stars: 1 } };
  return h;
}

describe('Dziedzictwo', () => {
  it('dostępne od 30. poziomu kuźni, gwiazdy za kuźnię i pokonane krainy', () => {
    const { s } = veteran();
    expect(legacyBlock(s)).toBeNull();
    expect(legacyStars(s)).toBe(1 + Math.floor(9 / B.LEGACY_LANDS_PER_STAR));
    s.forge.lvl = 29;
    expect(legacyBlock(s)).toMatch(/30/);
  });

  it('nowe pokolenie: od nowa kuźnia, kampania, ekwipunek i zasoby bazowe; zostaje Nauka, towarzysze, Klejnoty', () => {
    const { s } = veteran();
    const n = legacyReset(s, 'bron', T0);
    expect(n.forge).toEqual({ lvl: 1, up: 0, left: 0 });
    expect(n.maxLand).toBe(0);
    expect(n.cleared.every(c => !c)).toBe(true);
    expect(n.bestG).toBe(0);
    expect(n.eq).toEqual({});
    expect(n.gold).toBe(0);
    expect(n.books).toBe(77);
    expect(n.scrolls).toBe(5);
    expect(n.gems).toBe(123);
    expect(n.tech.lv.w_ostrze).toBe(4);
    expect(n.pets.wilczek?.lvl).toBe(5);
    expect(n.sx).toBe(s.sx);
    expect(n.legacy.gen).toBe(1);
    expect(n.legacy.stars).toBe(legacyStars(s));
    expect(n.legacy.item?.slot).toBe('bron');
    expect(n.legacy.item).not.toBe(s.eq.bron); // kopia
    // drugie pokolenie bez nowej Pamiątki: zostaje dotychczasowa, gwiazdy się sumują
    n.forge.lvl = 30;
    const n2 = legacyReset(n, null, T0);
    expect(n2.legacy.gen).toBe(2);
    expect(n2.legacy.item?.slot).toBe('bron');
    expect(n2.legacy.stars).toBe(legacyStars(s) + 1);
  });

  it('Gwiazdy Mistrza: +5% obrażeń i złota każda; Pamiątka Rodu dodaje połowę statystyk', () => {
    const { s } = veteran();
    const n = legacyReset(s, 'bron', T0);
    const m = allMods(n);
    expect(m.dmgPct).toBe(n.legacy.stars * B.LEGACY_STAR_PCT + allMods({ ...n, legacy: { gen: 0, stars: 0, item: null } }).dmgPct);
    const bare = computeStats({}, allMods(n), { ...extraOf(n), heir: null });
    const withHeir = computeStats({}, allMods(n), extraOf(n));
    expect(withHeir.dmg).toBeGreaterThan(bare.dmg);
    const full = computeStats({ bron: n.legacy.item! }, allMods(n), { ...extraOf(n), heir: null });
    expect(withHeir.dmg - bare.dmg).toBeCloseTo((full.dmg - bare.dmg) * B.LEGACY_HEIR_PCT / 100, 0);
  });

  it('gra bez serwera: nowe pokolenie z przycisku; stary zapis dostaje puste Dziedzictwo', () => {
    const { g, s } = veteran(2);
    expect(g.legacy('helm')).toBe(true);
    expect(g.s.forge.lvl).toBe(1);
    expect(g.s.legacy.item?.slot).toBe('helm');
    expect(g.legacy(null)).toBe(false); // kuźnia 1
    const old = JSON.parse(JSON.stringify(s));
    delete old.legacy;
    expect(migrate(old, T0).legacy).toEqual({ gen: 0, stars: 0, item: null });
  });
});
