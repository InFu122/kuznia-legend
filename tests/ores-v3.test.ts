import { describe, expect, it } from 'vitest';
import { B, DIVINE_ORE, EVENT_MILESTONES, LANDS, ORES, ORE_ORDER, PASS_LEVELS, oreCap, oreRank } from '../src/data';
import { obiegItem } from '../src/engine/obieg';
import { refineRatio, refineTo, rollSubs, smelt, smeltDraws } from '../src/engine/forge';
import { JUMP_V, dist, divineName, itemLevelFor, itemName, oreFloor } from '../src/engine/formulas';
import { mulberry32 } from '../src/engine/rng';
import { bestOre, passItemsReward } from '../src/engine/shop';
import { migrate, newState } from '../src/engine/state';
import { computeStats, extraOf } from '../src/engine/stats';
import { allMods } from '../src/engine/mods';
import { verifySmelt } from '../src/engine/verify';
import type { Item } from '../src/engine/types';
import { T0, makeGame } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;
const divPct = (ore: number, lvl = 30) => dist(ore, lvl).find(([r]) => r === 6)?.[1] ?? 0;

describe('rudy w wersji 3: Boski tylko z przeskoku', () => {
  it('żadna ruda nie daje Boskiego na pewno; Gwiezdny Kruszec kilka %, Boska Ruda kilkanaście %', () => {
    for (let o = 0; o < ORES.length; o++) expect(dist(o, 30)[0][0], ORES[o].n).toBeLessThan(6);
    expect(divPct(6)).toBeGreaterThan(2);
    expect(divPct(6)).toBeLessThan(5);
    expect(divPct(DIVINE_ORE)).toBeGreaterThan(14);
    expect(divPct(DIVINE_ORE)).toBeLessThan(20);
    expect(divPct(5)).toBeLessThan(divPct(8));
    expect(divPct(8)).toBeLessThan(divPct(6));
    // Obsydian: Legendarny z lepszą jakością, przeskok najwyżej do Mitycznego
    expect(dist(7, 30).map(([r]) => r)).toEqual([4, 5]);
  });

  it('kolejność rud w grze i ograniczenia: Boska Ruda nie wypada w krainach i nie jest „najlepszą rudą” sklepu', () => {
    expect(ORE_ORDER.slice().sort((a, b) => a - b)).toEqual(ORES.map((_, i) => i));
    for (let k = 1; k < ORE_ORDER.length; k++) expect(ORES[ORE_ORDER[k]].lvl).toBeGreaterThanOrEqual(ORES[ORE_ORDER[k - 1]].lvl);
    for (const L of LANDS) expect(L.drops.some(([o]) => o === DIVINE_ORE)).toBe(false);
    expect(LANDS.some(L => L.drops.some(([o]) => o === 7))).toBe(true);
    expect(LANDS.some(L => L.drops.some(([o]) => o === 8))).toBe(true);
    // kuźnia do 200: rudy otwierają się później (Adamantyt 25, Obsydian 40, Smocza Stal 60, Eteryt 85, Gwiezdny Kruszec 100)
    expect(oreCap(DIVINE_ORE, 200)).toBe(6);
    expect(oreCap(DIVINE_ORE, 45)).toBe(7);
    expect(oreCap(DIVINE_ORE, 30)).toBe(4);
    expect(oreCap(5, 16)).toBe(3);
    expect(oreRank(7)).toBeLessThan(oreRank(5));
    const s = newState(T0);
    s.forge.lvl = 100;
    expect(bestOre(s)).toBe(6);
    s.forge.lvl = 90;
    expect(bestOre(s)).toBe(8);
  });

  it('rafinacja idzie po kolei rud, a Boskiej Rudy nie da się zrobić ani przerobić', () => {
    expect([0, 1, 2, 3, 4, 7, 5, 8].map(refineTo)).toEqual([1, 2, 3, 4, 7, 5, 8, 6]);
    expect(refineTo(6)).toBe(-1);
    expect(refineTo(DIVINE_ORE)).toBe(-1);
    const s = newState(T0);
    s.forge.lvl = 100;
    expect(refineRatio(s, 6)).toBe(0);
    expect(refineRatio(s, 8)).toBeGreaterThan(0);
    s.forge.lvl = 99;
    expect(refineRatio(s, 8)).toBe(0); // Gwiezdny Kruszec dopiero od 100. poziomu
  });

  it('stary zapis z 7 rudami dostaje nowe rudy z zerem, a stare ilości zostają', () => {
    const raw = JSON.parse(JSON.stringify(newState(T0)));
    raw.ores = [5, 4, 3, 2, 1, 7, 9];
    const s = migrate(raw, T0);
    expect(s.ores).toEqual([5, 4, 3, 2, 1, 7, 9, 0, 0, 0]);
  });

  it('wytop z rudy unikalnej nie gwarantuje Boskiego', () => {
    const { ctx, s } = makeGame(3);
    s.forge.lvl = 100; s.stats.smelted = 10; s.ores[6] = 400;
    s.uniq.smok = 400;
    s.uniqSel = 'smok';
    let div = 0;
    for (let i = 0; i < 400; i++) { const it = smelt(ctx, 6, null)!; if (it.r >= 6) div++; expect(it.forced).not.toBe('set'); }
    expect(div).toBeLessThan(40);
  });
});

describe('dawne Boskie przedmioty zostają', () => {
  it('Gwiezdny Kruszec wykuty według zasad w wersji 2 przechodzi kontrolę jako wytop sprzed aktualizacji', () => {
    const { ctx, s } = makeGame(4);
    s.forge.lvl = 100; s.stats.smelted = 10; s.ores[6] = 5;
    const n = 7;
    s.seeds = [seedFor(n)]; s.sx = n;
    const it = smelt(ctx, 6, null)!;
    expect(it.jv).toBe(JUMP_V);
    expect(verifySmelt(it, seedFor(n), 0, 100)).toBeNull();
    // ten sam wytop według zasad w wersji 2 (kuźnia 30): Gwiezdny Kruszec zawsze Boski, bez przeskoku
    const rng = mulberry32(seedFor(n)); const dr = smeltDraws(rng);
    const old: Item = { ...it, r: 6, jump: 0, flvl: 30, lvl: itemLevelFor(30, dr.lvl), subs: rollSubs(rng, 6), jv: 2 };
    expect(oreFloor(6, 2)).toBe(6);
    expect(verifySmelt(old, seedFor(n), 0, 30, 2)).toBeNull();
    expect(verifySmelt(old, seedFor(n), 0, 30, 3)).not.toBeNull();
    // nowe rudy nie istniały w wersji 2
    expect(verifySmelt({ ...old, ore: 7 }, seedFor(n), 0, 30, 2)).not.toBeNull();
  });
});

describe('Boskie przedmioty są wyjątkowe', () => {
  const base = (r: number, extra: Partial<Item> = {}): Item => ({
    id: 1, slot: 'bron', kind: 'Miecz', g: 'm', ore: 6, r, lvl: 30, subs: [], el: null, jump: 1, flvl: 30, forced: '', jv: JUMP_V,
    smith: 'Adam', land: LANDS[15].n, fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: ['Adam'], obieg: false, set: null, sx: 11, ...extra,
  });

  it('własna nazwa: stała dla przedmiotu, różna dla różnych wytopów', () => {
    const a = base(6);
    expect(itemName(a)).toBe(divineName(a));
    expect(divineName(a)).toBe(divineName({ ...a, fame: 999, ls: 2 }));
    const names = new Set(Array.from({ length: 40 }, (_, i) => divineName({ ...a, sx: i })));
    expect(names.size).toBeGreaterThan(25);
    expect(itemName(base(5))).not.toBe(divineName(base(5)));
  });

  it('Boska aura: każdy założony Boski przedmiot daje % obrażeń i zdrowia', () => {
    const s = newState(T0);
    const one = computeStats({ bron: base(5) }, allMods(s), extraOf(s));
    const div = computeStats({ bron: base(6) }, allMods(s), extraOf(s));
    expect(one.aura).toBe(0);
    expect(div.aura).toBe(1);
    // ta sama broń, ale Boska: wyższa statystyka główna i aura na całość
    const two = computeStats({ bron: base(6), helm: { ...base(6), slot: 'helm', kind: 'Hełm', sx: 12 } }, allMods(s), extraOf(s));
    expect(two.aura).toBe(2);
    const noAura = computeStats({ bron: base(6), helm: { ...base(6), slot: 'helm', kind: 'Hełm', sx: 12 } }, { ...allMods(s), dmgPct: allMods(s).dmgPct - 2 * B.DIVINE_AURA }, extraOf(s));
    expect(two.dmg / noAura.dmg).toBeGreaterThan(1.05);
  });

  it('Obieg nie rozdaje Boskich przedmiotów', () => {
    const { ctx, s } = makeGame(9);
    s.maxLand = 15; s.forge.lvl = 30;
    for (let i = 0; i < 300; i++) expect(obiegItem(ctx).r).toBeLessThanOrEqual(5);
  });

  it('Boska Ruda: w przepustce (złota ścieżka, poziom 30) i za ostatni próg wydarzenia', () => {
    const s = newState(T0);
    expect(passItemsReward(PASS_LEVELS[29].prem, s).ores?.[DIVINE_ORE]).toBe(1);
    expect(PASS_LEVELS.some(L => L.free.some(x => x.k === 'divine'))).toBe(false);
    expect(passItemsReward(EVENT_MILESTONES[EVENT_MILESTONES.length - 1].r, s).ores?.[DIVINE_ORE]).toBe(1);
  });
});
