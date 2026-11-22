import { describe, expect, it } from 'vitest';
import { ABYSS_FROM, B, COMPANION_MAX, MOUNT_IDS, PET_IDS, R, SKILL_IDS, SKILL_MAX, SLOT_ORDER, STARS_MAX, TECH_IDS } from '../src/data';
import { techMaxAll } from '../src/engine/tech';
import { migrate } from '../src/engine/state';
import { makeGame, T0 } from './helpers';

describe('narzędzia dewelopera', () => {
  it('„wszystko na maks.”: kuźnia, kampania, Boski ekwipunek z legendą, runy, badania, umiejętności, towarzysze', () => {
    const { g, s } = makeGame();
    const p0 = g.stats.power;
    g.dev('max');
    expect(s.forge).toEqual({ lvl: B.FORGE_MAX, up: 0, left: 0 });
    expect(s.maxLand).toBe(ABYSS_FROM - 1);
    expect(s.cleared.slice(0, ABYSS_FROM - 1).every(Boolean)).toBe(true);
    for (const sl of SLOT_ORDER) {
      const it = s.eq[sl]!;
      expect(it.r).toBe(R.BOSKI);
      expect(it.ls).toBe(3);
      expect(it.aw).not.toBeNull();
      expect(s.runes[sl]).toBe(B.RUNE_MAX);
    }
    for (const id of TECH_IDS) expect(s.tech.lv[id]).toBe(techMaxAll(id));
    for (const id of SKILL_IDS) expect(s.skills.lv[id]).toBe(SKILL_MAX);
    expect(s.skills.eq.every(Boolean)).toBe(true);
    for (const id of PET_IDS) expect(s.pets[id]).toEqual({ lvl: COMPANION_MAX, stars: STARS_MAX });
    for (const id of MOUNT_IDS) expect(s.mounts[id]).toEqual({ lvl: COMPANION_MAX, stars: STARS_MAX });
    expect(s.petSel).toBeTruthy();
    expect(s.mountSel).toBeTruthy();
    expect(g.stats.power).toBeGreaterThan(p0 * 100);
    // zapis po wczytaniu zostaje taki sam
    const back = migrate(JSON.parse(JSON.stringify(s)), T0);
    expect(back.forge.lvl).toBe(B.FORGE_MAX);
    expect(back.eq.bron!.r).toBe(R.BOSKI);
    expect(back.runes.bron).toBe(B.RUNE_MAX);
  });

  it('kraina dalej, kuźnia +10, ukończenie czekania', () => {
    const { g, s } = makeGame();
    g.dev('land');
    expect(s.maxLand).toBe(1);
    expect(s.cur.land).toBe(1);
    expect(s.cleared[0]).toBe(true);
    const f = s.forge.lvl;
    g.dev('forge10');
    expect(s.forge.lvl).toBe(f + 10);
    s.forge = { lvl: 20, up: 21, left: 1e9 };
    g.dev('finish');
    expect(s.forge).toEqual({ lvl: 21, up: 0, left: 0 });
  });

});
