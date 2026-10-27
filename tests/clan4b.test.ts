import { describe, expect, it } from 'vitest';
import { CLAN, CLAN_LEVELS, CLAN_SHOP, clanBonus, clanBossHp, clanLevelOf } from '../src/data';
import { applyClanHelp, clanBossChest, cleanReward, donateCost, shopBlock, shopLeft, takeServerRewards } from '../src/engine/clan';
import { upgradeTime } from '../src/engine/forge';
import { allMods } from '../src/engine/mods';
import { migrate } from '../src/engine/state';
import { makeGame } from './helpers';

describe('Wspólna Kuźnia Klanu', () => {
  it('poziom klanu rośnie z Doświadczeniem, premie się sumują', () => {
    expect(clanLevelOf(0)).toBe(0);
    expect(clanLevelOf(CLAN_LEVELS[0].xp - 1)).toBe(0);
    expect(clanLevelOf(CLAN_LEVELS[0].xp)).toBe(1);
    expect(clanLevelOf(CLAN_LEVELS[9].xp * 5)).toBe(10);
    expect(clanBonus(0)).toEqual({});
    expect(clanBonus(3)).toEqual({ goldPct: 3, dmgPct: 2, hpPct: 2 });
    expect(clanBonus(10)).toEqual({ goldPct: 8, dmgPct: 10, hpPct: 10, extraOre: 5, forgeTime: 3, offlineMin: 30 });
  });

  it('premie klanu działają w grze i podnoszą Moc', () => {
    const { g, s } = makeGame(2);
    const before = allMods(s);
    const p0 = g.stats.power;
    g.setClanLvl(10);
    const after = allMods(s);
    expect(after.dmgPct - before.dmgPct).toBe(10);
    expect(after.forgeTime - before.forgeTime).toBe(3);
    expect(g.stats.power).toBeGreaterThan(p0);
    expect(upgradeTime(s, 10)).toBeLessThan(upgradeTime({ ...s, clanLvl: 0 }, 10));
  });

  it('datek kosztuje złoto z najdalszego etapu', () => {
    const { s } = makeGame(1);
    const early = donateCost(s);
    s.bestG = 80;
    expect(donateCost(s)).toBeGreaterThan(early);
  });
});

describe('nagrody od serwera', () => {
  it('każda nagroda trafia do gry tylko raz', () => {
    const { ctx, s } = makeGame(3);
    const list = [{ id: 'a1', why: 'Datek', r: { coins: 5 } }, { id: 'a2', why: 'Skrzynia', r: { gold: 100, books: 2, ores: { 3: 4 } } }];
    expect(takeServerRewards(ctx, list)).toHaveLength(2);
    expect(takeServerRewards(ctx, list)).toHaveLength(0);
    expect(s.clanCoins).toBe(5);
    expect(s.books).toBe(2);
    expect(s.ores[3]).toBe(4);
    expect(s.clanGot).toEqual(['a1', 'a2']);
  });

  it('dziwne wartości nagrody są pomijane', () => {
    expect(cleanReward({ gold: -5, coins: NaN, books: 2.7, ores: { 1: -3, 2: 4 } })).toMatchObject({ gold: 0, coins: 0, books: 2, ores: { 2: 4 } });
  });

  it('lista odebranych nagród ma ograniczoną długość', () => {
    const { ctx, s } = makeGame(3);
    takeServerRewards(ctx, Array.from({ length: 130 }, (_, i) => ({ id: 'x' + i, why: '', r: { coins: 1 } })));
    expect(s.clanGot.length).toBe(100);
    expect(s.clanCoins).toBe(130);
  });

  it('skrzynia bossa: pierwsze miejsce dostaje więcej i jajo, wyższy boss daje więcej', () => {
    const a = clanBossChest(3, 0, 40), b = clanBossChest(3, 5, 40), c = clanBossChest(8, 5, 40);
    expect(a.coins!).toBeGreaterThan(b.coins!);
    expect(a.eggs).toBeTruthy();
    expect(b.eggs).toBeUndefined();
    expect(c.gold!).toBeGreaterThan(b.gold!);
    expect(clanBossHp(1e6, 2)).toBeGreaterThan(clanBossHp(1e6, 1));
    expect(clanBossHp(0, 0)).toBe(CLAN.BOSS_HP_MIN);
  });
});

describe('pomoc klanu w ulepszeniu kuźni', () => {
  it('każda pomoc skraca trwające ulepszenie o 3% jego czasu, najwyżej 10 pomocy', () => {
    const { g, ctx, s } = makeGame(4);
    s.forge.lvl = 12; s.gold = 1e9;
    g.upgrade();
    const full = upgradeTime(s, 13);
    expect(s.forge.left).toBeCloseTo(full);
    expect(applyClanHelp(ctx, 13, 4)).toBe(4);
    expect(s.forge.left).toBeCloseTo(full * 0.88);
    expect(applyClanHelp(ctx, 13, 4)).toBe(0);  // te same pomoce drugi raz nic nie dają
    expect(applyClanHelp(ctx, 13, 50)).toBe(6); // ponad limit się nie liczy
    expect(s.forge.left).toBeCloseTo(full * 0.7);
  });

  it('pomoc dla innego poziomu nie skraca bieżącego ulepszenia', () => {
    const { g, ctx, s } = makeGame(4);
    s.forge.lvl = 8; s.gold = 1e9;
    g.upgrade();
    const left = s.forge.left;
    applyClanHelp(ctx, 5, 3);
    expect(s.forge.left).toBe(left);
  });
});

describe('sklep klanowy', () => {
  it('zakup kosztuje Monety, ma limit tygodniowy i wymaga poziomu klanu', () => {
    const { g, s, ctx } = makeGame(5);
    const now = ctx.now();
    s.clanCoins = 1000;
    expect(shopBlock(s, 'ksiega', now)).toMatch(/poziomu klanu/);
    expect(g.buyClan('ksiega')).toBe(false);
    s.clanLvl = 1;
    for (let i = 0; i < CLAN_SHOP.ksiega.week; i++) expect(g.buyClan('ksiega')).toBe(true);
    expect(g.buyClan('ksiega')).toBe(false);
    expect(shopLeft(s, 'ksiega', now)).toBe(0);
    expect(s.books).toBe(CLAN_SHOP.ksiega.week);
    expect(s.clanCoins).toBe(1000 - CLAN_SHOP.ksiega.week * CLAN_SHOP.ksiega.cost);
  });

  it('limity odnawiają się w nowym tygodniu', () => {
    const { g, s, ctx, advance } = makeGame(5);
    s.clanCoins = 1000;
    for (let i = 0; i < CLAN_SHOP.zloto.week; i++) g.buyClan('zloto');
    expect(shopLeft(s, 'zloto', ctx.now())).toBe(0);
    advance(7 * 86400000);
    expect(shopLeft(s, 'zloto', ctx.now())).toBe(CLAN_SHOP.zloto.week);
    expect(g.buyClan('zloto')).toBe(true);
  });

  it('za mało Monet — nie da się kupić', () => {
    const { g, s } = makeGame(5);
    s.clanCoins = 5;
    expect(g.buyClan('zloto')).toBe(false);
    expect(s.clanCoins).toBe(5);
  });
});

describe('zapis v7', () => {
  it('stary zapis dostaje puste pola klanu', () => {
    const s = migrate({ v: 6, name: 'Stary', stats: { smelted: 4 } }, 0);
    expect(s.clanLvl).toBe(0);
    expect(s.clanCoins).toBe(0);
    expect(s.clanShop).toEqual({ week: '', n: {} });
    expect(s.clanHelp).toEqual({ lvl: 0, n: 0 });
    expect(s.clanGot).toEqual([]);
  });

  it('nowa gra od zera zachowuje poziom klanu i odebrane nagrody', () => {
    const { g, s } = makeGame(6);
    s.clanLvl = 4; s.clanGot = ['a']; s.clanCoins = 50;
    g.reset();
    expect(g.s.clanLvl).toBe(4);
    expect(g.s.clanGot).toEqual(['a']);
    expect(g.s.clanCoins).toBe(0);
  });
});
