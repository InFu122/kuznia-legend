import { describe, expect, it } from 'vitest';
import { ELEM_KEYS, RAID, RAID_PHASES, WAR, WAR_DAYS, raidPhaseHp } from '../src/data';
import { cleanReward, raidFinalChest, raidPhaseChest, takeServerRewards, warChest } from '../src/engine/clan';
import { applyOffline } from '../src/engine/offline';
import { migrate } from '../src/engine/state';
import { makeGame } from './helpers';

describe('wojna klanów — zasady wspólne gry i serwera', () => {
  it('tydzień ma 7 dni: dobór, 4 dni aktywności, bitwa, nagrody', () => {
    expect(WAR_DAYS.map(d => d.k)).toEqual(['dobor', 'kucie', 'fale', 'lochy', 'boss', 'bitwa', 'nagrody']);
    expect(WAR.DAY_CAP).toBeGreaterThanOrEqual(WAR.BOSS_PTS * 3); // trzy ataki na bossa mieszczą się w limicie
  });

  it('skrzynia wojenna: zwycięzcy więcej niż przegrani, podium więcej, rośnie z udziałem', () => {
    const win = warChest('win', 5, 600, 30);
    const loss = warChest('loss', 5, 600, 30);
    const draw = warChest('draw', 5, 600, 30);
    expect(win.coins!).toBeGreaterThan(draw.coins!);
    expect(draw.coins!).toBeGreaterThan(loss.coins!);
    expect(win.scrolls).toBe(1);
    expect(loss.scrolls).toBeUndefined();
    expect(warChest('win', 0, 600, 30).coins!).toBeGreaterThan(warChest('win', 1, 600, 30).coins!);
    expect(warChest('win', 0, 600, 30).eggs).toEqual({ 2: 1 });
    expect(warChest('win', 5, 50, 30).coins!).toBeLessThan(win.coins!);
    expect(warChest('win', 5, 5000, 30).coins).toBe(win.coins); // udział liczy się do 600 punktów
    expect(loss.books!).toBeGreaterThanOrEqual(1);
  });

  it('dzień kucia, walki i lochów: gra liczy wytopy, wrogów (także offline) i klucze', () => {
    const { g, ctx, s } = makeGame(3);
    s.maxLand = 2; s.cleared = s.cleared.map((_, i) => i < 3);
    const k0 = s.stats.kills;
    applyOffline(ctx, 4 * 3600 * 1000);
    expect(s.stats.kills).toBeGreaterThan(k0 + 100);
    expect(s.stats.keys).toBe(0);
    expect(g.startDung('sztolnia')).toBe(true);
    expect(s.stats.keys).toBe(1);
    // stary zapis bez licznika kluczy
    const old = JSON.parse(JSON.stringify(s));
    delete old.stats.keys;
    expect(migrate(old, Date.now()).stats.keys).toBe(0);
  });
});

describe('Smocze Leże', () => {
  it('cztery fazy, każda ze słabością na inny żywioł', () => {
    expect(RAID_PHASES).toHaveLength(4);
    const weak = RAID_PHASES.map(p => p.weak);
    expect(new Set(weak).size).toBe(4);
    for (const w of weak) expect(ELEM_KEYS).toContain(w);
  });

  it('zdrowie rośnie z Mocą klanu i poziomem smoka, z minimum dla małych klanów', () => {
    expect(raidPhaseHp(0, 0)).toBe(RAID.HP_MIN / 4);
    expect(raidPhaseHp(100000, 0)).toBe(100000 * RAID.HP_POWER / 4);
    expect(raidPhaseHp(100000, 3)).toBeGreaterThan(raidPhaseHp(100000, 2));
    // klan, w którym wszyscy atakują 2 razy dziennie, łamie fazę w 1–2 dni
    const daily = 100000 * RAID.DMG_MULT * RAID.ATTACKS;
    expect(raidPhaseHp(100000, 0) / daily).toBeLessThan(1);
    expect(raidPhaseHp(100000, 0) / daily).toBeGreaterThan(0.4);
  });

  it('skrzynia fazy daje rudę żywiołu słabości następnej fazy; wielka skrzynia — Smoczą Stal', () => {
    for (let ph = 0; ph < 4; ph++) {
      const c = raidPhaseChest(ph, 2, 30);
      expect(Object.keys(c.els!)).toEqual([RAID_PHASES[(ph + 1) % 4].weak]);
    }
    const first = raidFinalChest(1, 0, 30);
    const rest = raidFinalChest(1, 5, 30);
    expect(first.ores![5]!).toBeGreaterThan(rest.ores![5]!);
    expect(first.eggs).toBeDefined();
    expect(rest.eggs).toBeUndefined();
    expect(raidFinalChest(5, 5, 30).books!).toBeGreaterThan(rest.books!);
  });

  it('gra przyjmuje rudy żywiołów od serwera (tylko znane żywioły)', () => {
    const { ctx, s } = makeGame(4);
    expect(cleanReward({ els: { szron: 3, zle: 5 } as never }).els).toEqual({ szron: 3 });
    const before = s.els.szron ?? 0;
    takeServerRewards(ctx, [{ id: 'r1', why: 'test', r: { els: { szron: 3 } } }]);
    takeServerRewards(ctx, [{ id: 'r1', why: 'test', r: { els: { szron: 3 } } }]);
    expect(s.els.szron).toBe(before + 3);
  });
});
