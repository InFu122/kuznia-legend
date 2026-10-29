import { describe, expect, it } from 'vitest';
import { CLAN_SEASON_REWARDS, WAR_TROPHIES } from '../src/data';
import { clanSeasonReward, warTrophies } from '../src/engine/clan';

describe('sezon wojen klanów', () => {
  it('Puchary za wynik i punkty klanu', () => {
    expect(warTrophies('win', 0)).toBe(0);
    expect(warTrophies('loss', 1)).toBe(WAR_TROPHIES.loss);
    expect(warTrophies('win', 999)).toBe(WAR_TROPHIES.win);
    expect(warTrophies('win', 5400)).toBe(WAR_TROPHIES.win + 5);
    expect(warTrophies('draw', 1e6)).toBe(WAR_TROPHIES.draw + WAR_TROPHIES.bonusMax);
    expect(warTrophies('win', 100)).toBeGreaterThan(warTrophies('draw', 100));
    expect(warTrophies('draw', 100)).toBeGreaterThan(warTrophies('loss', 100));
  });

  it('nagroda sezonu maleje z miejscem, każdy klan z wynikiem coś dostaje', () => {
    expect(clanSeasonReward(0)).toBeNull();
    const r = [1, 2, 3, 4, 10, 11, 25, 26, 500].map(k => clanSeasonReward(k)!);
    for (let i = 1; i < r.length; i++) expect(r[i].gems).toBeLessThanOrEqual(r[i - 1].gems);
    expect(r[0]).toEqual({ gems: CLAN_SEASON_REWARDS[0].gems, coins: CLAN_SEASON_REWARDS[0].coins });
    expect(r[2].gems).toBe(CLAN_SEASON_REWARDS[1].gems);
    expect(r[r.length - 1].gems).toBe(CLAN_SEASON_REWARDS[CLAN_SEASON_REWARDS.length - 1].gems);
  });
});
