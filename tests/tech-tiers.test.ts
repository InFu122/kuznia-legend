// Stopnie badań (II od 40., III od 100. poziomu kuźni) i nowe badania późnej gry.
import { describe, expect, it } from 'vitest';
import { B, DUNGEONS, TECH, TECH_IDS, TECH_TIER_FORGE, landDef } from '../src/data';
import { upCost } from '../src/engine/formulas';
import { equip, smelt } from '../src/engine/forge';
import { runeCost } from '../src/engine/runes';
import { nextTier, techBlock, techCost, techMax, techMaxAll, techTier } from '../src/engine/tech';
import { validateSave } from '../server/src/validate';
import { makeGame } from './helpers';

describe('stopnie badań', () => {
  it('Ostrze: 20 poziomów, +5 od 40. poziomu kuźni, +5 od 100.', () => {
    expect(TECH_TIER_FORGE).toEqual([40, 100]);
    expect(techMax('w_ostrze', 39)).toBe(20);
    expect(techMax('w_ostrze', 40)).toBe(25);
    expect(techMax('w_ostrze', 100)).toBe(30);
    expect(techMaxAll('w_ostrze')).toBe(30);
    expect(techTier('w_ostrze', 19)).toMatchObject({ tier: 0 });
    expect(techTier('w_ostrze', 20)).toEqual({ tier: 1, forge: 40, start: 20 });
    expect(techTier('w_ostrze', 25)).toEqual({ tier: 2, forge: 100, start: 25 });
    expect(nextTier('w_ostrze', 50)).toEqual([100, 5]);
    expect(nextTier('w_ostrze', 100)).toBeNull();
    // Wielkie miechy i Cech kowali bez kolejnych stopni (tempo kuźni i koszt ulepszeń zostają)
    expect(techMaxAll('k_miech')).toBe(TECH.k_miech.max);
    expect(techMaxAll('k_tanie')).toBe(TECH.k_tanie.max);
  });

  it('po I stopniu badanie czeka na kuźnię (blokada „tier”), potem leci dalej', () => {
    const { s } = makeGame(1);
    s.tech.lv.w_ostrze = 20; s.books = 1e6; s.gold = 1e15;
    s.forge.lvl = 39;
    expect(techBlock(s, 'w_ostrze')).toBe('tier');
    s.forge.lvl = 40;
    expect(techBlock(s, 'w_ostrze')).toBeNull();
    s.tech.lv.w_ostrze = 30; s.forge.lvl = 120;
    expect(techBlock(s, 'w_ostrze')).toBe('max');
  });

  it('koszty: I stopień bez zmian; dalej część ceny ulepszenia kuźni i ok. doby na poziom', () => {
    const a = techCost('w_ostrze', 19), b = techCost('w_ostrze', 20), c = techCost('w_ostrze', 25);
    expect(a.gold).toBeLessThan(b.gold);
    expect(b.gold).toBe(Math.round(0.8 * upCost(40)));
    expect(c.gold).toBe(Math.round(0.8 * upCost(100)));
    expect(b.ms / 3600000).toBeCloseTo(24 + 0.12 * 40, 5);
    expect(c.ms).toBeGreaterThan(b.ms);
    expect(b.books).toBe(TECH.w_ostrze.b0 * 21);
    // nowe badania późnej gry od razu liczą się jak późne poziomy
    expect(techCost('w_otchlan', 0).gold).toBe(Math.round(0.8 * upCost(110)));
  });

  it('wszystkie badania razem: ok. 3 razy więcej Ksiąg niż I stopień — Akademia starcza mniej więcej na rok gry', () => {
    let first = 0, all = 0;
    for (const id of TECH_IDS) for (let l = 0; l < techMaxAll(id); l++) { const k = techCost(id, l).books; all += k; if (techTier(id, l).tier === 0 && TECH[id].req < 30) first += k; }
    expect(all / first).toBeGreaterThan(2.5);
    expect(all / first).toBeLessThan(4);
  });

  it('serwer: poziom badania ponad stopień otwarty przez kuźnię — odrzucony', () => {
    const { s } = makeGame(2);
    s.forge.lvl = 39; s.tech.lv.w_ostrze = 25;
    expect(validateSave(s).some(x => /technologia w_ostrze/.test(x))).toBe(true);
    s.forge.lvl = 40;
    expect(validateSave(s).some(x => /technologia/.test(x))).toBe(false);
  });
});

describe('badania późnej gry', () => {
  it('Mistrz run: taniej złoto i ruda na poziomy run', () => {
    const { s } = makeGame(3);
    s.forge.lvl = 40;
    const before = runeCost(s, 12);
    s.tech.lv.k_runy = 6;
    const after = runeCost(s, 12);
    expect(after.gold).toBe(Math.round(before.gold * 0.76));
    expect(after.n).toBe(Math.ceil(before.n * 0.76));
  });

  it('Klucznik: +1 klucz dziennie do lochów z kluczami (Wieża bez limitu)', () => {
    const { g, s, advance } = makeGame(4);
    s.maxLand = 6; s.cleared = s.cleared.map((_, i) => i < 6); s.forge.lvl = 50;
    s.tech.lv.e_klucz = 1;
    advance(86400000);
    expect(g.dungKeys('skarbiec')).toBe(DUNGEONS.skarbiec.keys + 1);
    expect(g.dungKeys('wieza')).toBe(Number.POSITIVE_INFINITY);
  });

  it('Bogate złoża: więcej rzadkiej rudy z powtórnie pokonanego bossa', () => {
    const run = (lv: number) => {
      const { g, s, events } = makeGame(5);
      s.forge.lvl = 120; s.ores[6] = 400; s.stats.smelted = 10; s.tech.lv.e_zyla = lv;
      for (let i = 0; i < 200 && Object.keys(s.eq).length < 8; i++) equip(g.ctx, smelt(g.ctx, 6, null)!, true);
      s.cleared[0] = true; s.maxLand = 1; s.cur = { land: 0, stage: 10, wave: 1 }; s.bestG = 15;
      const ore0 = s.ores[landDef(0).rare];
      g.challengeBoss();
      for (let t = 0; t < 400 && !events.some(e => e.t === 'loot' && e.boss); t++) g.tick(250);
      const loot = events.find(e => e.t === 'loot' && e.boss);
      return { ore: s.ores[landDef(0).rare] - ore0, loot };
    };
    const a = run(0), b = run(8);
    expect(a.loot && b.loot).toBeTruthy();
    expect(b.ore).toBeGreaterThan(a.ore);
    expect(B.STAGES_PER_LAND).toBe(10);
  });
});
