import { describe, expect, it } from 'vitest';
import { ARENA_SHOP, ARENA_SHOP_IDS, LEAGUE, LEAGUES, LEAGUE_SEASON_GEMS, leagueWeekTokens } from '../src/data';
import {
  TOP_TIER, arenaShopBlock, arenaShopReward, ghostNow, groupGhosts, leagueMove, leaguePts, seasonOfWeek, standings, weekFrac, weekStart,
} from '../src/engine/league';
import { seasonOf } from '../src/engine/shop';
import { PASS } from '../src/data';
import { newState } from '../src/engine/state';

describe('ligi areny', () => {
  it('punkty ligowe zależą od siły przeciwnika', () => {
    expect(leaguePts(true, 1000, 1000)).toBe(LEAGUE.WIN_PTS);
    expect(leaguePts(true, 1000, 100)).toBe(LEAGUE.WIN_PTS / 2);
    expect(leaguePts(true, 1000, 5000)).toBe(LEAGUE.WIN_PTS * 1.5);
    expect(leaguePts(true, 1000, 1150)).toBe(23);
    expect(leaguePts(false, 1000, 1000)).toBe(LEAGUE.LOSS_PTS);
  });

  it('duchy grupy są zawsze te same i rosną z tygodniem', () => {
    const a = groupGhosts('w2963:2:0', 2, 29);
    const b = groupGhosts('w2963:2:0', 2, 29);
    expect(a).toEqual(b);
    expect(a.length).toBe(29);
    expect(new Set(a.map(g => g.n)).size).toBe(29);
    expect(groupGhosts('w2963:2:0', 2, 5)).toEqual(a.slice(0, 5));
    const mean = LEAGUE.GHOST_MEAN + 2 * LEAGUE.GHOST_STEP;
    for (const g of a) { expect(g.fin).toBeGreaterThanOrEqual(Math.floor(mean * 0.35)); expect(g.fin).toBeLessThanOrEqual(Math.ceil(mean * 1.65)); }
    expect(ghostNow(a[0], 0)).toBe(0);
    expect(ghostNow(a[0], 1)).toBe(a[0].fin);
    // wyższa liga — silniejsze duchy (średnio)
    const avg = (t: number) => groupGhosts('k', t, 29).reduce((x, g) => x + g.fin, 0) / 29;
    expect(avg(6)).toBeGreaterThan(avg(0));
  });

  it('tabela: 30 miejsc, gracze przed duchami przy remisie', () => {
    const members = { u1: { n: 'Adam', pts: 120, w: 6, l: 0 }, u2: { n: 'Ewa', pts: 0, w: 0, l: 0 } };
    const rows = standings('w1:0:0', 0, members, ['u1', 'u2'], 0);
    expect(rows.length).toBe(LEAGUE.GROUP);
    expect(rows[0].id).toBe('u1');
    expect(rows[1].id).toBe('u2'); // remis 0:0 z duchami — gracz wyżej
    const end = standings('w1:0:0', 0, members, ['u1', 'u2'], 1);
    for (let i = 1; i < end.length; i++) expect(end[i - 1].pts).toBeGreaterThanOrEqual(end[i].pts);
  });

  it('awans, spadek, krańce lig', () => {
    expect(leagueMove(0, 1)).toBe(1);
    expect(leagueMove(0, 5)).toBe(1);
    expect(leagueMove(0, 6)).toBe(0);
    expect(leagueMove(0, 30)).toBe(0);          // z Brązu się nie spada
    expect(leagueMove(3, 26)).toBe(-1);
    expect(leagueMove(3, 25)).toBe(0);
    expect(leagueMove(TOP_TIER, 1)).toBe(0);    // z Diamentu I nie ma awansu
    expect(leagueMove(TOP_TIER, 30)).toBe(-1);
    expect(LEAGUES.length).toBe(LEAGUE_SEASON_GEMS.length);
    expect(leagueWeekTokens(0, 1)).toBeGreaterThan(leagueWeekTokens(0, 6));
    expect(leagueWeekTokens(6, 20)).toBeGreaterThan(leagueWeekTokens(0, 20));
  });

  it('tydzień i sezon: tydzień zaczyna się w poniedziałek, sezon jak przepustka', () => {
    const now = Date.UTC(2026, 10, 4, 15); // środa
    const dn = Math.floor(now / 86400000);
    const week = 'w' + Math.floor((dn + 3) / 7);
    expect(new Date(weekStart(week)).getUTCDay()).toBe(1);
    expect(weekStart(week)).toBeLessThanOrEqual(now);
    expect(now - weekStart(week)).toBeLessThan(7 * 86400000);
    expect(seasonOfWeek(week).n).toBe(seasonOf(now).n);
    // sezon trwa 4 pełne tygodnie
    const w0 = 'w' + Math.floor((Math.floor(PASS.EPOCH / 86400000) + 3) / 7);
    expect(seasonOfWeek(w0).n).toBe(1);
    expect(seasonOfWeek('w' + (Number(w0.slice(1)) + 3)).n).toBe(1);
    expect(seasonOfWeek('w' + (Number(w0.slice(1)) + 4)).n).toBe(2);
    expect(weekFrac(0, Date.UTC(2026, 10, 2, 0))).toBe(0);
    expect(weekFrac(6, Date.UTC(2026, 10, 8, 12))).toBeCloseTo(6.5 / 7);
  });

  it('sklep areny: limity, Żetony, odblokowanie', () => {
    const s = newState(0);
    expect(arenaShopBlock(s, {}, 'ksiegi', 100)).toBeNull();
    expect(arenaShopBlock(s, {}, 'ksiegi', 1)).toBe('za mało Żetonów');
    expect(arenaShopBlock(s, { ksiegi: ARENA_SHOP.ksiegi.day }, 'ksiegi', 999)).toBe('na dziś wyprzedane');
    expect(arenaShopBlock(s, {}, 'jajo', 999)).toBe('jeszcze niedostępne');
    for (const id of ARENA_SHOP_IDS) {
      const r = arenaShopReward(id);
      expect(Object.keys(r).length).toBe(id === 'bilet' ? 0 : 1);
      expect(r.gems).toBeUndefined();
    }
  });
});
