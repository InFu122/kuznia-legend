import { describe, expect, it } from 'vitest';
import { B, SUBS, RAR, qMult, subMult } from '../src/data';
import { equip, smelt } from '../src/engine/forge';
import { mulberry32 } from '../src/engine/rng';
import { farmLandFor, reforgeBlock, reforgeCost, rerollSub, runeBlock, runeCost, runePay } from '../src/engine/runes';
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
  it('koszt: pięć poziomów na rudę w kolejności odblokowania, od Miedzi do Boskiej Rudy (rzadkie taniej)', () => {
    const { s } = armed();
    expect(B.RUNE_MAX).toBe(50);
    expect(runeCost(s, 1)).toMatchObject({ ore: 0, n: 20 });
    expect(runeCost(s, 5)).toMatchObject({ ore: 0, n: 60 });
    expect(runeCost(s, 6)).toMatchObject({ ore: 1, n: 20 });
    expect(runeCost(s, 26)).toMatchObject({ ore: 7, n: 20 });  // Obsydian
    expect(runeCost(s, 31)).toMatchObject({ ore: 5, n: 20 });  // Smocza Stal
    expect(runeCost(s, 36)).toMatchObject({ ore: 8, n: 10 });  // Eteryt — o połowę mniej
    expect(runeCost(s, 45)).toMatchObject({ ore: 6, n: 30 });  // Gwiezdny Kruszec — o połowę mniej
    expect([46, 47, 48, 49, 50].map(l => runeCost(s, l))).toEqual([1, 2, 2, 3, 3].map(n => expect.objectContaining({ ore: 9, n })));
    // ten sam koszt rośnie w złocie z poziomem
    expect(runeCost(s, 50).gold).toBeGreaterThan(runeCost(s, 30).gold);
    // zawsze dokładnie ruda z kosztu — lepsze rudy jej nie zastępują
    s.ores[0] = 10; s.ores[1] = 5000; s.ores[2] = 5000;
    expect(runePay(s, 1)).toMatchObject({ ore: 0, n: 20, avail: 10, enough: false });
    expect(runeBlock(s, 'bron')).toMatch(/Miedź/);
    s.ores[0] = 20;
    expect(runePay(s, 1).enough).toBe(true);
    expect(runeBlock(s, 'bron')).toBeNull();
    // gdzie farmić: kraina z największym udziałem rudy spośród odblokowanych
    s.maxLand = 6;
    expect(farmLandFor(s, 0)).toEqual({ land: 0, pct: 95 });
    expect(farmLandFor(s, 2)?.land).toBe(6);
    expect(farmLandFor(s, 5)).toBeNull();
  });

  it('ulepszenie zabiera tylko rudę z kosztu', () => {
    const { g, s } = armed(7);
    s.ores = [25, 0, 100, 0, 0, 0, 50, 50, 50, 50];
    expect(g.upgradeRune('helm')).toBe(true);
    expect(s.ores).toEqual([5, 0, 100, 0, 0, 0, 50, 50, 50, 50]);
    expect(g.upgradeRune('helm')).toBe(false); // poziom 2 kosztuje 30 Miedzi, a zostało 5
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
    expect(migrate(JSON.parse(JSON.stringify(s)), T0).runes.bron).toBe(10);
    expect(migrate({ ...JSON.parse(JSON.stringify(s)), runes: undefined }, T0).runes).toEqual({});
  });
});

describe('przekuwanie', () => {
  it('od 15. poziomu kuźni; koszt w rudzie przedmiotu, rośnie z rzadkością', () => {
    const { s } = armed(3);
    const it = Object.values(s.eq).find(x => x && x.subs.length)!;
    expect(reforgeCost(s, it)).toMatchObject({ ore: it.ore, n: Math.round(15 * (RAR[it.r].o + 1)) });
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
      expect(x.v).toBeGreaterThanOrEqual(Math.round(SUBS[x.id].lo * subMult(it.r) * qMult(it.q) * 10) / 10 - 0.05);
      expect(x.v).toBeLessThanOrEqual(Math.round(SUBS[x.id].hi * subMult(it.r) * qMult(it.q) * 10) / 10 + 0.05);
    }
    expect(rerollSub(rng, it, 9)).toBeNull();
  });

  it('gra bez serwera: płaci, daje wybór, a zaakceptowana wersja zachowuje sławę i legendę', () => {
    const { g, s } = armed(5);
    const it = Object.values(s.eq).find(x => x && x.subs.length)!;
    it.fame = 777;
    const ore0 = s.ores[it.ore];
    const cand = g.reforge(it.slot, 0)!;
    expect(s.ores[it.ore]).toBe(ore0 - Math.round(15 * (RAR[it.r].o + 1)));
    expect(s.eq[it.slot]).toBe(it); // przed wyborem nic się nie zmienia
    expect(g.acceptReforge(cand)).toBe(true);
    expect(s.eq[it.slot]!.subs[0]).toEqual(cand.subs[0]);
    expect(s.eq[it.slot]!.fame).toBe(777);
    expect(B.REFORGE_FORGE_LVL).toBeLessThanOrEqual(15);
  });
});

describe('runy bohatera: ile dają', () => {
  it('runeGain liczy zysk całych run, jednej runy i następnego poziomu', async () => {
    const { runeGain } = await import('../src/engine/runes');
    const { makeGame } = await import('./helpers');
    const { g, s } = makeGame(4);
    s.ores[1] = 5;
    g.smeltManual(); g.equipPending();
    const sl = Object.keys(s.eq).find(k => s.eq[k as keyof typeof s.eq])! as keyof typeof s.eq;
    expect(runeGain(s).power).toBe(0);
    s.runes = { [sl]: 7 };
    const one = runeGain(s, sl);
    expect(one.power).toBeGreaterThan(0);
    expect(runeGain(s).power).toBeCloseTo(one.power);
    const next = runeGain(s, sl, true);
    expect(next.power).toBeGreaterThan(0);
    expect(next.power).toBeLessThan(one.power); // jeden poziom mniej niż siedem
  });
});

describe('runy: opis dla gracza', () => {
  it('mówi, że runa działa dla każdego przedmiotu w miejscu, z poprawną odmianą', async () => {
    const { runeForAll } = await import('../src/engine/runes');
    expect(runeForAll('bron')).toBe('każdej broni, którą założysz');
    expect(runeForAll('helm')).toBe('każdego hełmu, który założysz');
    expect(runeForAll('buty')).toBe('każdych butów, które założysz');
  });
});
