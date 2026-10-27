import { describe, expect, it } from 'vitest';
import { KOPALNIA_WAVES, KRYPTA_FLOORS, LAB_ROOMS, ZBROJOWNIA_CHESTS } from '../src/data';
import { kryptaRule, mineStones } from '../src/engine/dungeon';
import { equip, smelt } from '../src/engine/forge';
import type { GameEvent, ModalData } from '../src/engine/types';
import { makeGame, simulate } from './helpers';

function act2(seed = 7) {
  const h = makeGame(seed);
  const { ctx, s } = h;
  s.forge.lvl = 30; s.ores[4] = 200; s.stats.smelted = 10;
  for (let i = 0; i < 200 && Object.keys(s.eq).length < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true); // wszystkie 8 slotów
  s.cleared = s.cleared.map((_, i) => i < 4);
  s.maxLand = 4; s.bestG = 40;
  return h;
}
const modals = (events: GameEvent[]): ModalData[] => events.flatMap(e => (e.t === 'modal' ? [e.m] : []));

describe('Kopalnia Kryształów', () => {
  it('10 fal daje Kamienie; bez aktu III zamiast Siodła są dodatkowe Kamienie', () => {
    const { g, s } = act2();
    expect(g.startDung('kopalnia')).toBe(true);
    simulate(g, 120000);
    expect(g.b.mode).toBe('camp');
    expect(s.dungeons.kopalnia.best).toBe(KOPALNIA_WAVES);
    expect(s.stones).toBe(KOPALNIA_WAVES * mineStones(4) + 5);
    expect(s.saddles).toBe(0);
  });
});

describe('Labirynt Minotaura', () => {
  it('przed każdą komnatą czeka wybór z dwojga różnych drzwi, a na końcu Minotaur', () => {
    const { g, s, events } = act2();
    expect(g.startDung('labirynt')).toBe(true);
    let guard = 0;
    while (g.b.mode === 'dung' && guard++ < 400) {
      const d = g.b.dung!;
      if (d.doors) {
        expect(d.doors[0].kind).not.toBe(d.doors[1].kind);
        const i = d.doors.findIndex(x => x.kind === 'oltarz');
        g.labChoose(i >= 0 ? i : 0);
      }
      simulate(g, 1000);
    }
    expect(g.b.mode).toBe('camp');
    const end = modals(events).find(m => m.kind === 'dungEnd');
    expect(end && end.kind === 'dungEnd' && end.lost).toBe(false);
    expect(s.dungeons.labirynt.best).toBe(LAB_ROOMS);
    expect(s.books).toBeGreaterThanOrEqual(3);
    expect(modals(events).filter(m => m.kind === 'labChoice').length).toBe(LAB_ROOMS - 1);
  });

  it('ołtarz daje błogosławieństwo na resztę biegu', () => {
    const { g } = act2();
    g.startDung('labirynt');
    const d = g.b.dung!;
    d.doors = [{ kind: 'oltarz', bless: 0 }, { kind: 'zrodlo' }];
    g.labChoose(0);
    expect(d.bless.dmg).toBe(20);
    expect(d.floor).toBe(2);
    expect(d.doors).not.toBeNull();
  });
});

describe('Zapomniana Zbrojownia', () => {
  it('trzy duchy oddają trzy przedmioty z historią do decyzji gracza', () => {
    const { g, s, events } = act2();
    g.startDung('zbrojownia');
    simulate(g, 90000);
    expect(g.b.mode).toBe('camp');
    expect(s.found.length).toBe(ZBROJOWNIA_CHESTS);
    for (const it of s.found) { expect(it.obieg).toBe(true); expect(it.fame).toBeGreaterThanOrEqual(1000); }
    expect(modals(events).some(m => m.kind === 'found')).toBe(true);
    const gold = s.gold;
    g.takeFound(0, false);
    expect(s.gold).toBeGreaterThan(gold);
    const it = s.found[0];
    g.takeFound(0, true);
    expect(s.eq[it.slot]).toBe(it);
    expect(s.found.length).toBe(1);
  });
});

describe('Krypta Bohaterów', () => {
  it('otwiera się z pierwszym Zahartowanym przedmiotem i walczy tylko legendami', () => {
    const { g, s } = act2();
    expect(g.dungUnlocked('krypta')).toBe(false);
    for (const slot of ['bron', 'zbroja', 'helm', 'rekawice'] as const) { s.eq[slot]!.fame = 1500; s.eq[slot]!.ls = 1; } // połowa ekwipunku z legendą
    expect(g.dungUnlocked('krypta')).toBe(true);
    g.ctx.cache = null;
    const full = g.stats.power;
    g.startDung('krypta');
    const inside = g.stats.power;
    expect(inside).toBeLessThan(full);
    simulate(g, 120000);
    expect(g.b.mode).toBe('camp');
    expect(g.stats.power).toBeGreaterThanOrEqual(full); // znów cały ekwipunek
    expect(s.seals).toBeGreaterThan(0);
    expect(s.dungeons.krypta.best).toBeLessThanOrEqual(KRYPTA_FLOORS);
  });

  it('zasada zmienia się co tydzień w poniedziałek', () => {
    const mon = Date.UTC(2026, 9, 26, 12); // poniedziałek
    expect(kryptaRule(mon)).toBe(kryptaRule(mon + 6 * 86400000));
    expect(kryptaRule(mon)).not.toBe(kryptaRule(mon + 7 * 86400000));
    expect(kryptaRule(mon)).toBe(kryptaRule(mon + 28 * 86400000));
  });
});
