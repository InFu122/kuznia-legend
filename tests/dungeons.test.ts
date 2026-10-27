import { describe, expect, it } from 'vitest';
import { B, DUNGEONS, DUNG_ORDER } from '../src/data';
import { equip, smelt } from '../src/engine/forge';
import type { DungId } from '../src/engine/types';
import { makeGame, simulate } from './helpers';

/** Bohater z bardzo mocnym ekwipunkiem (do testów nagród, nie balansu). */
function strongGame(seed = 2) {
  const h = makeGame(seed);
  const { ctx, s } = h;
  s.forge.lvl = 30; s.ores[4] = 200; s.stats.smelted = 10;
  for (let i = 0; i < 200 && Object.keys(s.eq).length < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true); // wszystkie 8 slotów
  s.cleared = s.cleared.map((_, i) => i < 2);
  s.maxLand = 2;
  return h;
}

describe('lochy', () => {
  it('na starcie żaden loch nie jest dostępny', () => {
    const { g } = makeGame();
    for (const id of DUNG_ORDER) {
      expect(g.dungUnlocked(id)).toBe(false);
      expect(g.startDung(id)).toBe(false);
    }
  });

  it('klucze zużywają się i wracają następnego dnia', () => {
    const { g, s, advance } = strongGame();
    for (let i = 0; i < DUNGEONS.skarbiec.keys; i++) {
      expect(g.startDung('skarbiec')).toBe(true);
      g.dungExit();
    }
    expect(g.startDung('skarbiec')).toBe(false);
    advance(24 * 3600 * 1000);
    expect(g.dungKeys('skarbiec')).toBe(DUNGEONS.skarbiec.keys);
    expect(s.dungeons.skarbiec.keys).toBe(DUNGEONS.skarbiec.keys);
  });

  it('Skarbiec trwa 30 sekund i daje złoto', () => {
    const { g, s, events } = strongGame();
    const gold = s.gold;
    g.startDung('skarbiec');
    simulate(g, B.SKARBIEC_MS + 2000);
    expect(g.b.mode).toBe('camp');
    expect(s.gold).toBeGreaterThan(gold);
    const end = events.find(e => e.t === 'modal' && e.m.kind === 'dungEnd');
    expect(end).toBeTruthy();
  });

  it('Sztolnia zatrzymuje się na wyborze co 5 pięter, a wyjście oddaje cały łup', () => {
    const { g, s, events } = strongGame();
    const tier = g.dungTier();
    const before = s.ores[tier];
    g.startDung('sztolnia');
    simulate(g, 60000);
    const choice = events.find(e => e.t === 'modal' && e.m.kind === 'dungChoice');
    expect(choice).toBeTruthy();
    expect(g.b.dung?.floor).toBe(B.DUNGEON_CHECKPOINT);
    const loot = g.b.dung!.loot.ores![tier]!;
    g.dungExit();
    expect(s.ores[tier]).toBe(before + loot);
  });

  it('Wieża Wyzwań nie ma limitu kluczy i zapamiętuje najwyższe piętro', () => {
    const { g, s } = strongGame();
    s.forge.lvl = 30;
    expect(g.dungKeys('wieza')).toBe(Number.POSITIVE_INFINITY);
    g.startDung('wieza');
    simulate(g, 90000);
    expect(s.dungeons.wieza.best).toBeGreaterThan(5);
    g.dungExit();
    expect(s.books).toBeGreaterThan(0);
    g.startDung('wieza');
    expect(g.b.dung?.floor).toBe(s.dungeons.wieza.best + 1);
  });

  it('Leża Bossów dają rudę unikalną zestawu pokonanego bossa', () => {
    const { g, s } = strongGame();
    expect(g.startDung('leza', 0)).toBe(false); // boss 1. krainy nie ma rudy unikalnej
    expect(g.startDung('leza', 1)).toBe(true);
    simulate(g, 60000);
    expect(g.b.mode).toBe('camp');
    expect(s.uniq.lowca).toBeGreaterThanOrEqual(2);
  });

  it('porażka w Sztolni zabiera połowę łupu', () => {
    const { g, ctx, s } = makeGame();
    s.cleared[0] = s.cleared[1] = true;
    s.maxLand = 2;
    s.bestG = 60; // słaby bohater w trudnej sztolni
    const tier = g.dungTier();
    const before = s.ores[tier];
    g.startDung('sztolnia');
    g.b.dung!.loot.ores = { [tier]: 9 };
    simulate(g, 30000);
    expect(ctx.b.mode).toBe('camp');
    expect(s.ores[tier]).toBe(before + 4);
  });

  it('każdy loch ma opis', () => {
    for (const id of DUNG_ORDER as DungId[]) expect(DUNGEONS[id].how.length).toBeGreaterThan(10);
  });
});
