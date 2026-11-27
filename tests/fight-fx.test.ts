// Ciekawsze walki: przebieg pojedynku do odtworzenia, łup z ataku, cios ostateczny i premie areny.
import { describe, expect, it } from 'vitest';
import { CLAN, streakBonus } from '../src/data';
import { attackLoot, lastHitChest } from '../src/engine/clan';
import { duel, EV_MAX, type Fighter } from '../src/engine/duel';

const hero = (k: number, name = 'A'): Fighter => ({
  name, skills: [{ id: 'deszcz', lvl: 3 }, { id: 'tarcza', lvl: 2 }, { id: 'eliksir', lvl: 2 }],
  st: { dmg: 100 * k, hp: 1500 * k, crit: 15, critd: 60, spd: 10, ls: 2, dodge: 5, regen: 1, eldmg: 0, slow: 0, petAtk: 10 * k, petInt: 1500 },
});

describe('przebieg pojedynku', () => {
  it('zdarzenia zgadzają się z wynikiem: krytyki, umiejętności i obie strony', () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = duel(hero(1), hero(1.05, 'B'), seed);
      expect(r.ev.length).toBeGreaterThan(0);
      expect(r.ev.length).toBeLessThanOrEqual(EV_MAX);
      const n = (s: 0 | 1, k: string) => r.ev.filter(e => e[1] === s && e[2] === k).length;
      expect([n(0, 'c'), n(1, 'c')]).toEqual(r.crits);
      expect([n(0, 's'), n(1, 's')]).toEqual(r.skills);
      expect(r.ev.every((e, i) => i === 0 || e[0] >= r.ev[i - 1][0])).toBe(true);
      expect(r.ev.every(e => e[0] <= r.ms && e[3] >= 0)).toBe(true);
      expect(r.ev.filter(e => e[2] === 's').every(e => typeof e[4] === 'string')).toBe(true);
    }
  });

  it('suma ciosów w obrońcę pokrywa jego zdrowie, gdy przegrywa', () => {
    const r = duel(hero(3), hero(1, 'B'), 5);
    expect(r.win).toBe(true);
    const dealt = r.ev.filter(e => e[1] === 0 && e[2] !== 'd' && !(e[2] === 's' && e[4] !== 'deszcz')).reduce((a, e) => a + e[3], 0);
    expect(dealt).toBeGreaterThanOrEqual(1500 * 0.99);
  });
});

describe('łup z ataku i cios ostateczny', () => {
  it('łup wypada z szansą CLAN.LOOT_CHANCE i zawsze coś zawiera', () => {
    expect(attackLoot(CLAN.LOOT_CHANCE, 0.5, 3)).toBeNull();
    expect(attackLoot(0.99, 0.1, 3)).toBeNull();
    for (let b = 0; b < 1; b += 0.01) {
      const l = attackLoot(0, b, 7, 'zar');
      expect(l).not.toBeNull();
      expect(Object.keys(l!).length).toBe(1);
    }
    expect(attackLoot(0, 0.85, 5, 'szron')).toEqual({ els: { szron: 4 } });
    expect(attackLoot(0, 0.85, 5, 'woda')).toEqual({ coins: 25 });
    expect(attackLoot(0, 0.85, 5)).toEqual({ coins: 25 });
    expect(attackLoot(0, 0.95, 30)).toEqual({ eggs: { 3: 1 } });
  });

  it('cios ostateczny przy dobiciu smoka daje podwójną skrzynię', () => {
    const a = lastHitChest(4, 50), b = lastHitChest(4, 50, true);
    expect(b.coins).toBe(a.coins! * 2);
    expect(b.scrolls).toBe(2);
    expect(a.gold).toBeGreaterThan(0);
  });
});

describe('premie areny', () => {
  it('seria: od 3 wygranych +50% złota, od 5 +100%; Żetony za 3., 5., 10. wygraną z rzędu', () => {
    expect([1, 2, 3, 4, 5, 6, 10].map(streakBonus)).toEqual([
      { gold: 0, tk: 0 }, { gold: 0, tk: 0 }, { gold: 0.5, tk: 3 }, { gold: 0.5, tk: 0 },
      { gold: 1, tk: 5 }, { gold: 1, tk: 0 }, { gold: 1, tk: 5 },
    ]);
  });
});
