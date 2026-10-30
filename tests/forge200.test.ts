// Kuźnia do 200. poziomu, rudy otwierane później (zasady przeskoku v5) i Otchłań po kampanii.
import { describe, expect, it } from 'vitest';
import { ABYSS_FROM, B, LANDS, ORES, ORE_LVL_V4, isAbyss, landDef } from '../src/data';
import { canSmelt, equip, rollSubs, smelt, smeltDraws } from '../src/engine/forge';
import { JUMP_V, enemyAtBoss, forgeAtBoss, itemLevelFor, lvlFactor, oreLvl, recPower, upCost } from '../src/engine/formulas';
import { mulberry32 } from '../src/engine/rng';
import { migrate } from '../src/engine/state';
import { verifySmelt } from '../src/engine/verify';
import { onBack, runBack } from '../src/ui/back';
import { validateSave } from '../server/src/validate';
import type { Item } from '../src/engine/types';
import { T0, makeGame, simulate } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;

describe('kuźnia do 200. poziomu', () => {
  it('rudy otwierają się później; dawne poziomy zostają dla wytopów sprzed aktualizacji', () => {
    expect(B.FORGE_MAX).toBe(200);
    expect(JUMP_V).toBe(5);
    expect([2, 3, 4, 7, 5, 8, 6, 9].map(o => ORES[o].lvl)).toEqual([5, 12, 25, 40, 60, 85, 100, 120]);
    expect(oreLvl(4, 4)).toBe(ORE_LVL_V4[4]);
    expect(oreLvl(4)).toBe(25);
    const { ctx, s } = makeGame(2);
    s.ores[4] = 5;
    s.forge.lvl = 24;
    expect(canSmelt(ctx, 4)).toBe(false);
    s.forge.lvl = 25;
    expect(canSmelt(ctx, 4)).toBe(true);
  });

  it('liczby nie wybuchają: koszt i siła przedmiotów rosną wolniej po 30. poziomie', () => {
    expect(upCost(31) / upCost(30)).toBeCloseTo(B.UPGRADE_COST_MULT_HI, 5);
    expect(upCost(200)).toBeLessThan(1e11);
    expect(lvlFactor(62) / lvlFactor(61)).toBeCloseTo(1.04, 5);
    expect(lvlFactor(2 * 200 + 2)).toBeLessThan(1e9);
  });

  it('wytop sprzed aktualizacji (Adamantyt na kuźni 15, zasady v4) dalej przechodzi kontrolę, nowy już nie', () => {
    const { ctx, s } = makeGame(5);
    s.forge.lvl = 30; s.stats.smelted = 10; s.ores[4] = 5;
    const n = 3;
    s.seeds = [seedFor(n)]; s.sx = n;
    const it = smelt(ctx, 4, null)!;
    expect(verifySmelt(it, seedFor(n), 0, 30)).toBeNull();
    // ten sam wytop na kuźni 15 według zasad v4 (Adamantyt od 15. poziomu)
    const rng = mulberry32(seedFor(n)); const d = smeltDraws(rng);
    const old: Item = { ...it, flvl: 15, lvl: itemLevelFor(15, d.lvl), r: 4, jump: 0, subs: rollSubs(rng, 4), jv: 4 };
    if (d.roll < 100 - 50) {
      expect(verifySmelt(old, seedFor(n), 0, 30, 4)).toBeNull();
    }
    expect(verifySmelt({ ...old, jv: 5 }, seedFor(n), 0, 30, 5)).not.toBeNull();
  });
});

describe('Otchłań', () => {
  it('kręgi po kampanii: motyw z aktów III–IV, rudy z końca gry, coraz trudniejsi wrogowie', () => {
    const L = landDef(ABYSS_FROM);
    expect(isAbyss(ABYSS_FROM)).toBe(true);
    expect(L.act).toBe(5);
    expect(L.n).toMatch(/^Otchłań 1 · /);
    expect(L.boss).toMatch(/z Otchłani$/);
    expect(L.drops.reduce((a, [, p]) => a + p, 0)).toBe(100);
    expect(landDef(ABYSS_FROM + 8).n).toMatch(new RegExp(`· ${LANDS[8].n}$`));
    expect(forgeAtBoss(LANDS.length - 1)).toBe(120);
    expect(forgeAtBoss(ABYSS_FROM)).toBe(124);
    expect(forgeAtBoss(ABYSS_FROM + 100)).toBe(B.FORGE_MAX);
    for (let i = 1; i < LANDS.length + 40; i++) expect(recPower(i)).toBeGreaterThan(recPower(i - 1));
    expect(enemyAtBoss(ABYSS_FROM + 40) / enemyAtBoss(ABYSS_FROM + 39)).toBeGreaterThan(1.09);
  });

  it('po ostatnim bossie kampanii bohater schodzi do Otchłani; zapis i serwer to przepuszczają', () => {
    const { g, s } = makeGame(4);
    s.forge.lvl = 200; s.ores[6] = 300; s.stats.smelted = 10;
    for (let i = 0; i < 200 && Object.keys(s.eq).length < 8; i++) equip(g.ctx, smelt(g.ctx, 6, null)!, true);
    s.cleared = LANDS.map((_, i) => i < LANDS.length - 1);
    const last = LANDS.length - 1;
    s.maxLand = last; s.cur = { land: last, stage: 10, wave: 1 }; s.bestG = last * 10 + 9;
    g.challengeBoss();
    simulate(g, 120000);
    expect(s.cleared[last]).toBe(true);
    expect(s.maxLand).toBe(ABYSS_FROM);
    expect(s.cur.land).toBe(ABYSS_FROM);
    expect(s.cleared.length).toBeGreaterThan(ABYSS_FROM);
    const back = migrate(JSON.parse(JSON.stringify(s)), T0);
    expect(back.maxLand).toBe(ABYSS_FROM);
    expect(validateSave(back).filter(x => /kraina|postęp/.test(x))).toEqual([]);
  });
});

describe('przycisk „wstecz”', () => {
  it('najnowsze okno ma pierwszeństwo; bez okien nic nie obsługuje', () => {
    const log: string[] = [];
    const offA = onBack(() => { log.push('a'); return true; });
    const offB = onBack(() => { log.push('b'); return true; });
    expect(runBack()).toBe(true);
    offB();
    expect(runBack()).toBe(true);
    offA();
    expect(runBack()).toBe(false);
    expect(log).toEqual(['b', 'a']);
  });
});
