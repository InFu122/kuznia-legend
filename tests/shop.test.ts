import { describe, expect, it } from 'vitest';
import { AD, AD_BUFFS, GEM_SHOP, PASS, PASS_LEVELS, speedupGems } from '../src/data';
import { applyOffline } from '../src/engine/offline';
import {
  applyBoost, buffMult, buffMultSpan, buffUntil, gemItemBlock, passLevel, passUnclaimed, passUpdate, passXp, seasonOf, shopToday, speedupCost, utcDay,
} from '../src/engine/shop';
import { migrate } from '../src/engine/state';
import { makeGame, T0 } from './helpers';

const DAY = 86400000;

describe('Przepustka Kowala', () => {
  it('sezony po 28 dni od poniedziałku 26 października 2026', () => {
    const s1 = seasonOf(PASS.EPOCH + 1000);
    expect(s1.n).toBe(1);
    expect(s1.end - s1.start).toBe(28 * DAY);
    expect(seasonOf(PASS.EPOCH + 28 * DAY).n).toBe(2);
    expect(new Date(PASS.EPOCH).getUTCDay()).toBe(1); // poniedziałek
  });

  it('punkty z wytopów, wrogów, bossów, kluczy i Wieży; dzienny limit; nowy dzień liczy od nowa', () => {
    const { s } = makeGame(1);
    const now = PASS.EPOCH + 3 * DAY + 3600000;
    let { p } = passUpdate(null, s, null, now);
    expect(passXp(p)).toBe(0);
    s.stats.smelted += 100; s.stats.kills += 500; s.stats.bosses += 1; s.stats.keys += 2; s.dungeons.wieza.best += 3;
    p = passUpdate(p, s, null, now + 1000).p;
    expect(p.dxp).toBe(Math.floor(100 * PASS.XP_SMELT + 500 * PASS.XP_KILL + PASS.XP_BOSS + 2 * PASS.XP_KEY + 3 * PASS.XP_TOWER));
    s.stats.kills += 1e6;
    p = passUpdate(p, s, null, now + 2000).p;
    expect(p.dxp).toBe(PASS.DAY_CAP);
    // następny dzień: dzisiejsze punkty przechodzą do sumy, licznik od zera
    p = passUpdate(p, s, null, now + DAY).p;
    expect(p.xp).toBe(PASS.DAY_CAP);
    expect(p.dxp).toBe(0);
    expect(passLevel(p)).toBe(Math.floor(PASS.DAY_CAP / PASS.XP_PER_LVL));
  });

  it('odbiór: darmowe do poziomu, złote tylko po zakupie, Klejnoty w nagrodach', () => {
    const { s } = makeGame(2);
    const now = PASS.EPOCH + DAY;
    let { p } = passUpdate(null, s, null, now);
    p = { ...p, xp: 5 * PASS.XP_PER_LVL };
    let u = passUnclaimed(p, s);
    expect(u.free).toBe(5);
    expect(u.prem).toBe(0);
    expect(u.r.gems).toBe(15); // poziom 5 darmowej ścieżki
    p = u.next;
    expect(passUnclaimed(p, s).free).toBe(0);
    p = { ...p, prem: true };
    u = passUnclaimed(p, s);
    expect(u.prem).toBe(5);
    expect(u.r.gems).toBe(30);
    expect(PASS_LEVELS).toHaveLength(PASS.LEVELS);
    expect(PASS_LEVELS[29].prem.some(x => x.k === 'egg' && x.n === 4)).toBe(true);
  });

  it('nowy sezon: poprzedni stan wraca jako `old` (nieodebrane nagrody), nowy od zera', () => {
    const { s } = makeGame(3);
    let { p } = passUpdate(null, s, null, PASS.EPOCH + DAY);
    p = { ...p, xp: 3 * PASS.XP_PER_LVL, prem: true };
    const r = passUpdate(p, s, null, PASS.EPOCH + 29 * DAY);
    expect(r.old?.season).toBe(1);
    expect(r.p.season).toBe(2);
    expect(passXp(r.p)).toBe(0);
    expect(r.p.prem).toBe(false);
  });

  it('bez serwera: wrogowie z nocy liczą się do nowego dnia', () => {
    const { g, s, advance } = makeGame(4);
    s.maxLand = 2; s.cleared = s.cleared.map((_, i) => i < 2);
    g.tick(5000);
    advance(DAY);
    g.offline(8 * 3600000);
    g.tick(5000);
    expect(s.pass!.d).toBe(utcDay(T0 + DAY + 10000));
    expect(s.pass!.dxp).toBeGreaterThan(0);
  });
});

describe('sklep i reklamy', () => {
  it('limity dzienne, dostępność towarów i Klejnoty', () => {
    const { s } = makeGame(5);
    const sh = shopToday(undefined, T0);
    expect(gemItemBlock(s, sh, 'ksiegi', 0)).toBe('za mało Klejnotów');
    expect(gemItemBlock(s, sh, 'ksiegi', 100)).toBeNull();
    expect(gemItemBlock(s, sh, 'jajo', 1000)).toBe('jeszcze niedostępne'); // chowańce później
    expect(gemItemBlock(s, { ...sh, n: { ksiegi: GEM_SHOP.ksiegi.day } }, 'ksiegi', 1000)).toBe('na dziś wyprzedane');
    expect(shopToday({ ...sh, n: { ksiegi: 3 }, once: ['starter'] }, T0 + DAY).n).toEqual({});
    expect(shopToday({ ...sh, once: ['starter'] }, T0 + DAY).once).toEqual(['starter']);
  });

  it('zakupy bez serwera: towar, prezent dnia, pakiet testowy, przepustka', () => {
    const { g, s } = makeGame(6);
    expect(g.buyGemItem('ksiegi')).toBe(false);
    expect(g.buyPack('starter')).toBe(true);
    expect(s.gems).toBe(300);
    expect(s.books).toBe(10);
    expect(g.buyPack('starter')).toBe(false);
    expect(g.buyGemItem('ksiegi')).toBe(true);
    expect(s.gems).toBe(300 - GEM_SHOP.ksiegi.cost);
    expect(s.books).toBe(15);
    expect(g.claimGift()).not.toBeNull();
    expect(g.claimGift()).toBeNull();
    expect(g.buyPass()).toBe(false);          // 240 < 500
    g.buyPack('gems_550');
    expect(g.buyPass()).toBe(true);
    expect(s.pass!.prem).toBe(true);
  });

  it('wzmocnienia: ×2 przez godzinę, przedłużane do 3 h, z limitem dziennym', () => {
    const { g, s, ctx } = makeGame(7);
    expect(buffMult(s, 'ruda', T0)).toBe(1);
    for (let i = 0; i < AD_BUFFS.ruda.day; i++) expect(g.adReward('ruda')).toBe(true);
    expect(g.adReward('ruda')).toBe(false);
    expect(s.buffs.ruda).toBe(T0 + AD.BUFF_MAX_MS);
    expect(buffMult(s, 'ruda', ctx.now())).toBe(2);
    expect(buffUntil(T0 + 30 * 60000, T0, 'zloto')).toBe(T0 + 90 * 60000);
    // nieobecność 4 h, wzmocnienie jeszcze przez 1 h → ×1,25
    s.buffs = { zloto: T0 + 3600000 };
    expect(buffMultSpan(s, 'zloto', T0, T0 + 4 * 3600000)).toBeCloseTo(1.25);
    expect(g.adReward('gems')).toBe(true);
    expect(g.adReward('gems')).toBe(false);
    expect(s.gems).toBe(AD.GEMS);
  });

  it('wzmocnienie rudy podwaja rudę za nieobecność', () => {
    const a = makeGame(8);
    const b = makeGame(8);
    for (const h of [a, b]) { h.s.maxLand = 3; h.s.cur.land = 3; }
    b.s.buffs = { ruda: T0 + 10 * 3600000 };
    const ra = applyOffline(a.ctx, 2 * 3600000)!;
    const rb = applyOffline(b.ctx, 2 * 3600000)!;
    const sum = (x: number[]) => x.reduce((p, c) => p + c, 0);
    expect(sum(rb.ores)).toBeGreaterThan(sum(ra.ores) * 1.7);
    expect(rb.gold).toBe(ra.gold);
  });

  it('przyspieszenia: kuźnia i Nauka 1 Klejnot za minutę; pomoc z serwera kończy ulepszenie', () => {
    expect(speedupGems(0)).toBe(0);
    expect(speedupGems(1000)).toBe(1);
    expect(speedupGems(60 * 60000)).toBe(60);
    expect(speedupGems(60 * 60000, 'tech')).toBe(60);
    expect(speedupGems(1000, 'tech')).toBe(1);
    const { g, s, ctx } = makeGame(9);
    s.forge.lvl = 5; s.forge.up = 6; s.forge.left = 3 * 3600000;
    expect(speedupCost(s, 'forge')).toBe(180);
    s.gems = 100;
    expect(g.speedup('forge')).toBe(false);
    s.gems = 200;
    expect(g.speedup('forge')).toBe(true);
    expect(s.forge.lvl).toBe(6);
    expect(s.gems).toBe(20);
    // z serwera: łączny czas przyspieszenia ulepszenia na poziom 7, liczony raz
    s.forge.up = 7; s.forge.left = 3600000;
    expect(applyBoost(ctx, 7, 3600000 + 5000)).toBeGreaterThan(0);
    expect(s.forge.left).toBe(0);
    expect(applyBoost(ctx, 7, 3600000 + 5000)).toBe(0);
  });

  it('stary zapis dostaje puste Klejnoty, sklep i przepustkę', () => {
    const old = JSON.parse(JSON.stringify(makeGame(10).s));
    delete old.gems; delete old.shop; delete old.pass; delete old.buffs; delete old.boost;
    const m = migrate(old, T0);
    expect(m.gems).toBe(0);
    expect(m.shop.n).toEqual({});
    expect(m.pass).toBeNull();
    expect(m.buffs).toEqual({});
    expect(m.boost).toEqual({ lvl: 0, ms: 0 });
  });
});
