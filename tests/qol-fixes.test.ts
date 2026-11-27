// Poprawki z przeglądu: krótkie duże liczby (bln, bld) i powrót z za trudnej krainy.
import { describe, expect, it } from 'vitest';
import { shortNum } from '../src/engine/num';
import { fmt } from '../src/ui/format';
import { makeGame, simulate } from './helpers';

describe('Duże liczby', () => {
  it('trzy cyfry znaczące z jednostką, bilion i biliard', () => {
    expect(shortNum(81)).toBe('81');
    expect(shortNum(123456)).toBe('123 tys.');
    expect(shortNum(12_345_678)).toBe('12,3 mln');
    expect(shortNum(999.6e6)).toBe('1,00 mld');
    expect(shortNum(421.24e9)).toBe('421 mld');
    expect(shortNum(1539.86e9)).toBe('1,54 bln');
    expect(shortNum(2.1e15)).toBe('2,10 bld');
    expect(fmt(1000.05e9)).toBe('1,00 bln');
    expect(fmt(421.24e9)).toBe('421,24 mld');
  });
});

describe('Za trudna kraina', () => {
  /** Bohater bez ekwipunku w 6. krainie, na 1. etapie: nie ma szans. */
  function stuckGame() {
    const t = makeGame(3);
    t.s.maxLand = 6;
    t.s.cleared = t.s.cleared.map((_, i) => i < 6);
    t.g.goLand(5);
    t.s.cur.stage = 1;
    return t;
  }

  it('śmierć na 1. etapie: prawdziwy komunikat i propozycja powrotu', () => {
    const { g, s, events } = stuckGame();
    simulate(g, 120_000);
    expect(g.b.stuck).toBe(5);
    expect(s.cur.land).toBe(5);
    expect(s.cur.stage).toBe(1);
    const msgs = events.filter(e => e.t === 'toast').map(e => (e as { msg: string }).msg);
    expect(msgs.some(m => m.includes('Ta kraina jest jeszcze za trudna'))).toBe(true);
    expect(msgs.some(m => m.includes('cofasz się'))).toBe(false);
  });

  it('powrót do poprzedniej krainy kasuje propozycję', () => {
    const { g, s } = stuckGame();
    simulate(g, 120_000);
    g.goLand(s.cur.land - 1);
    expect(s.cur.land).toBe(4);
    expect(g.b.stuck).toBeUndefined();
  });
});
