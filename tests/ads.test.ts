import { describe, expect, it } from 'vitest';
import { AD, AD_BUFFS, adMax } from '../src/data';
import { adCountLocal, adsLeft } from '../src/engine/shop';
import { makeGame } from './helpers';

describe('reklamy z nagrodą', () => {
  it('dzienne limity reklam', () => {
    expect(adMax('arena')).toBe(AD.ARENA_DAY);
    expect(adMax('ruda')).toBe(AD_BUFFS.ruda.day);
    expect(adMax('gems')).toBe(AD.GEMS_DAY);
    const { ctx, s } = makeGame();
    for (let i = 0; i < AD_BUFFS.zloto.day; i++) expect(adCountLocal(ctx, 'zloto')).toBe(true);
    expect(adCountLocal(ctx, 'zloto')).toBe(false);
    expect(adsLeft(s.shop, 'zloto')).toBe(0);
    expect(adsLeft(s.shop, 'ruda')).toBe(AD_BUFFS.ruda.day);
  });

  it('×2 ruda za reklamę działa godzinę, kolejne przedłużają', () => {
    const { g, s, advance } = makeGame();
    expect(g.adReward('ruda')).toBe(true);
    const until = s.buffs.ruda!;
    expect(until - g.ctx.now()).toBe(AD_BUFFS.ruda.ms);
    advance(10 * 60000);
    expect(g.adReward('ruda')).toBe(true);
    expect(s.buffs.ruda!).toBe(until + AD_BUFFS.ruda.ms);
  });
});
