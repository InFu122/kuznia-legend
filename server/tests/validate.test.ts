import { describe, expect, it } from 'vitest';
import { equip, smelt } from '../../src/engine/forge';
import { newState } from '../../src/engine/state';
import { makeGame, simulate } from '../../tests/helpers';
import { cleanName, validateSave } from '../src/validate';

function played() {
  const h = makeGame(4);
  const { g, ctx, s } = h;
  s.forge.lvl = 30; s.ores[5] = 50; s.stats.smelted = 10;
  for (let i = 0; i < 40; i++) equip(ctx, smelt(ctx, 5, null)!, true);
  simulate(g, 60000);
  return h;
}

describe('kontrola zapisu na serwerze', () => {
  it('przepuszcza uczciwy zapis — nowy i rozegrany', () => {
    expect(validateSave(newState(0))).toEqual([]);
    expect(validateSave(played().s)).toEqual([]);
  });

  it('odrzuca niemożliwe wartości', () => {
    const { s } = played();
    s.forge.lvl = 31;
    s.gold = -5;
    s.ores[2] = Number.NaN;
    const it = Object.values(s.eq)[0]!;
    it.r = 6; it.ore = 0; // Boski z Miedzi
    it.subs[0].v = 999;
    s.tech.lv.w_ostrze = 99;
    s.pets = { wilczek: { lvl: 77, stars: 0 } };
    const p = validateSave(s);
    for (const frag of ['poziom kuźni', 'zasób gold', 'rudy', 'rzadkość 6', 'statystyka', 'technologia w_ostrze', 'chowaniec wilczek']) {
      expect(p.some(x => x.includes(frag))).toBe(true);
    }
  });

  it('czyści imię kowala', () => {
    expect(cleanName('  <b>Zbyszek</b>   z   Bogdańca  ')).toBe('bZbyszek/b z Bog') // 16 znaków;
    expect(cleanName('')).toBe('Kowal');
    expect(cleanName(42)).toBe('Kowal');
  });
});
