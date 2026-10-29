import { describe, expect, it } from 'vitest';
import { B, SUBS } from '../src/data';
import { equip, smelt } from '../src/engine/forge';
import { legacyReset } from '../src/engine/legacy';
import { mulberry32 } from '../src/engine/rng';
import { reforgeBlock, reforgeCost, rerollSub, runeBlock, runeCost } from '../src/engine/runes';
import { migrate } from '../src/engine/state';
import { makeGame, T0 } from './helpers';

function armed(seed = 1) {
  const h = makeGame(seed);
  h.s.forge.lvl = 20; h.s.ores[3] = 200; h.s.stats.smelted = 10;
  for (let i = 0; i < 80 && Object.keys(h.s.eq).length < 8; i++) equip(h.ctx, smelt(h.ctx, 3, null)!, true);
  h.s.gold = 1e9; h.s.ores = [5000, 5000, 5000, 5000, 5000, 5000, 0];
  return h;
}

describe('runy slotów', () => {
  it('koszt: pięć poziomów na rudę, od Miedzi do Smoczej Stali', () => {
    const { s } = armed();
    expect(runeCost(s, 1)).toMatchObject({ ore: 0, n: 20 });
    expect(runeCost(s, 5)).toMatchObject({ ore: 0, n: 60 });
    expect(runeCost(s, 6)).toMatchObject({ ore: 1, n: 20 });
    expect(runeCost(s, 30).ore).toBe(5);
  });

  it('runa podnosi główną statystykę przedmiotu w slocie, zostaje po zmianie przedmiotu i po Dziedzictwie', () => {
    const { g, s } = armed(2);
    s.forge.lvl = 9;
    expect(runeBlock(s, 'bron')).toMatch(/10/);
    s.forge.lvl = 20;
    const d0 = g.stats.dmg;
    for (let i = 0; i < 10; i++) expect(g.upgradeRune('bron')).toBe(true);
    expect(s.runes.bron).toBe(10);
    expect(s.ores[0]).toBe(5000 - (20 + 30 + 40 + 50 + 60));
    expect(g.stats.dmg).toBeGreaterThan(d0);
    s.forge.lvl = 30;
    expect(legacyReset(s, null, T0).runes.bron).toBe(10);
    expect(migrate({ ...JSON.parse(JSON.stringify(s)), runes: undefined }, T0).runes).toEqual({});
  });
});

describe('przekuwanie', () => {
  it('od 15. poziomu kuźni; koszt w rudzie przedmiotu, rośnie z rzadkością', () => {
    const { s } = armed(3);
    const it = Object.values(s.eq).find(x => x && x.subs.length)!;
    expect(reforgeCost(s, it)).toMatchObject({ ore: it.ore, n: 15 * (it.r + 1) });
    s.forge.lvl = 14;
    expect(reforgeBlock(s, it)).toMatch(/15/);
  });

  it('losuje jedną statystykę od nowa: w zakresie rzadkości, bez powtórzeń z pozostałymi', () => {
    const { s } = armed(4);
    const it = Object.values(s.eq).find(x => x && x.subs.length >= 2)!;
    const rng = mulberry32(5);
    for (let k = 0; k < 200; k++) {
      const out = rerollSub(rng, it, 0)!;
      const x = out.subs[0];
      expect(out.subs.slice(1)).toEqual(it.subs.slice(1));
      expect(it.subs.slice(1).some(o => o.id === x.id)).toBe(false);
      expect(x.v).toBeGreaterThanOrEqual(Math.round(SUBS[x.id].lo * (1 + 0.15 * it.r) * 10) / 10 - 0.05);
      expect(x.v).toBeLessThanOrEqual(Math.round(SUBS[x.id].hi * (1 + 0.15 * it.r) * 10) / 10 + 0.05);
    }
    expect(rerollSub(rng, it, 9)).toBeNull();
  });

  it('gra bez serwera: płaci, daje wybór, a zaakceptowana wersja zachowuje sławę i legendę', () => {
    const { g, s } = armed(5);
    const it = Object.values(s.eq).find(x => x && x.subs.length)!;
    it.fame = 777;
    const ore0 = s.ores[it.ore];
    const cand = g.reforge(it.slot, 0)!;
    expect(s.ores[it.ore]).toBe(ore0 - 15 * (it.r + 1));
    expect(s.eq[it.slot]).toBe(it); // przed wyborem nic się nie zmienia
    expect(g.acceptReforge(cand)).toBe(true);
    expect(s.eq[it.slot]!.subs[0]).toEqual(cand.subs[0]);
    expect(s.eq[it.slot]!.fame).toBe(777);
    expect(B.REFORGE_FORGE_LVL).toBeLessThanOrEqual(15);
  });
});
