import { describe, expect, it } from 'vitest';
import { SETS, SET_FORGE_LVL, TECH, TECH_IDS } from '../src/data';
import { equip, smelt, startUpgrade } from '../src/engine/forge';
import { computeStats } from '../src/engine/stats';
import { techBlock, techCost, techMods, tickResearch } from '../src/engine/tech';
import { upCost } from '../src/engine/formulas';
import { makeGame } from './helpers';

describe('technologie', () => {
  it('badanie pobiera Księgi i złoto, trwa określony czas i podnosi poziom', () => {
    const { g, ctx, s } = makeGame();
    s.forge.lvl = 3;
    expect(techBlock(s, 'w_ostrze')).toBe('books');
    const c = techCost('w_ostrze', 0);
    s.books = c.books; s.gold = c.gold;
    expect(g.research('w_ostrze')).toBe(true);
    expect(s.books).toBe(0);
    expect(s.gold).toBe(0);
    expect(techBlock(s, 'w_pancerz')).toBe('busy');
    expect(tickResearch(ctx, c.ms - 1, true)).toBe(false);
    expect(tickResearch(ctx, 1, true)).toBe(true);
    expect(s.tech.lv.w_ostrze).toBe(1);
    expect(techMods(s).dmgPct).toBe(TECH.w_ostrze.per);
  });

  it('technologie wymagają poziomu kuźni i mają limit poziomów', () => {
    const { s } = makeGame();
    s.books = 1e6; s.gold = 1e12;
    expect(techBlock(s, 'w_ostrze')).toBe('forge');
    s.forge.lvl = 30;
    s.tech.lv.w_ostrze = TECH.w_ostrze.max;
    expect(techBlock(s, 'w_ostrze')).toBe('max');
    for (const id of TECH_IDS) if (id !== 'w_ostrze') expect(techBlock(s, id)).toBeNull();
  });

  it('Ostrze i Pancerz podnoszą obrażenia i zdrowie', () => {
    const { ctx, s } = makeGame();
    equip(ctx, smelt(ctx, 1, null)!, true);
    const base = computeStats(s.eq, techMods(s));
    s.tech.lv.w_ostrze = 10; s.tech.lv.w_pancerz = 10;
    const up = computeStats(s.eq, techMods(s));
    expect(up.dmg / base.dmg).toBeCloseTo(1.3, 5);
    expect(up.hp / base.hp).toBeCloseTo(1.3, 5);
  });

  it('Cech kowali obniża koszt ulepszenia kuźni', () => {
    const { ctx, s } = makeGame();
    s.tech.lv.k_tanie = 5;
    s.gold = 1000;
    startUpgrade(ctx);
    expect(s.gold).toBe(1000 - Math.round(upCost(2) * 0.8));
  });
});

describe('zestawy', () => {
  it('ruda unikalna daje część zestawu od 15. poziomu kuźni', () => {
    const { g, ctx, s } = makeGame();
    s.stats.smelted = 10;
    s.uniq.lowca = 1;
    s.uniqSel = 'lowca';
    s.ores[1] = 10;
    expect(smelt(ctx, 1, null)!.set).toBeNull();
    expect(s.uniq.lowca).toBe(1);
    s.forge.lvl = SET_FORGE_LVL;
    const it = smelt(ctx, 1, null)!;
    expect(it.set).toBe('lowca');
    expect(s.uniq.lowca).toBe(0);
    expect(smelt(ctx, 1, null)!.set).toBeNull();
    g.setUniq(null);
    expect(s.uniqSel).toBeNull();
  });

  it('części zestawu trafiają w różne miejsca, a 2 i 4 części dają bonusy', () => {
    const { ctx, s } = makeGame(4);
    s.stats.smelted = 10;
    s.forge.lvl = SET_FORGE_LVL;
    s.ores[1] = 10;
    s.uniq.straz = 4;
    s.uniqSel = 'straz';
    const slots = new Set<string>();
    const base = computeStats(s.eq, techMods(s)).hp;
    for (let i = 0; i < 4; i++) {
      const it = smelt(ctx, 1, null)!;
      slots.add(it.slot);
      equip(ctx, it, true);
    }
    expect(slots.size).toBe(4);
    const st = computeStats(s.eq, techMods(s));
    expect(st.sets).toEqual([{ id: 'straz', count: 4 }]);
    const noSet = computeStats(Object.fromEntries(Object.entries(s.eq).map(([k, v]) => [k, { ...v!, set: null }])), techMods(s));
    const hpPct = (SETS.straz.b2.hpPct ?? 0) + (SETS.straz.b4.hpPct ?? 0);
    expect(st.hp / noSet.hp).toBeCloseTo(1 + hpPct / 100, 5);
    expect(st.dodge - noSet.dodge).toBeCloseTo(SETS.straz.b4.dodge ?? 0, 5);
    expect(base).toBeLessThan(st.hp);
  });
});
