import { describe, expect, it } from 'vitest';
import { EVENT, EVENT_MILESTONES, EVENT_ORDER } from '../src/data';
import { equip, smelt } from '../src/engine/forge';
import { claimEvent, eventOf, eventPts, eventPtsMax, eventReached, eventUnclaimed, eventUpdate, tickEvent } from '../src/engine/events';
import { migrate } from '../src/engine/state';
import type { GameEvent, ModalData } from '../src/engine/types';
import { T0, makeGame, simulate } from './helpers';

const DAY = 86400000;
const modals = (events: GameEvent[]): ModalData[] => events.flatMap(e => (e.t === 'modal' ? [e.m] : []));

describe('wydarzenia', () => {
  it('co 14 dni kolejne wydarzenie, kolejność się powtarza', () => {
    const a = eventOf(EVENT.EPOCH + 1);
    expect(a.i).toBe(0);
    expect(a.kind).toBe(EVENT_ORDER[0]);
    expect(eventOf(EVENT.EPOCH + 14 * DAY).kind).toBe(EVENT_ORDER[1]);
    expect(eventOf(EVENT.EPOCH + 28 * DAY).kind).toBe(EVENT_ORDER[2]);
    expect(eventOf(EVENT.EPOCH + 42 * DAY).kind).toBe(EVENT_ORDER[0]);
    expect(eventOf(EVENT.EPOCH - 1).i).toBe(-1);
    expect(a.end - a.start).toBe(14 * DAY);
    for (let i = 1; i < EVENT_MILESTONES.length; i++) expect(EVENT_MILESTONES[i].pts).toBeGreaterThan(EVENT_MILESTONES[i - 1].pts);
  });

  it('punkty z gry z dziennym limitem; nowy dzień liczy od nowa', () => {
    const { s } = makeGame();
    const t = EVENT.EPOCH + 2 * DAY + 3600000; // Festiwal Kuźni: wytop = 1 pkt
    let { e } = eventUpdate(null, s, t);
    expect(e.dpts).toBe(0);
    s.stats.smelted += 150;
    e = eventUpdate(e, s, t + 1000).e;
    expect(e.dpts).toBe(150);
    s.stats.smelted += 1000;
    e = eventUpdate(e, s, t + 2000).e;
    expect(e.dpts).toBe(EVENT.DAY_CAP);
    e = eventUpdate(e, s, t + DAY).e;
    expect(e.pts).toBe(EVENT.DAY_CAP);
    expect(e.dpts).toBe(0);
    s.stats.smelted += 30;
    e = eventUpdate(e, s, t + DAY + 1000).e;
    expect(eventPts(e)).toBe(EVENT.DAY_CAP + 30);
    expect(eventReached(e)).toBe(EVENT_MILESTONES.filter(m => m.pts <= EVENT.DAY_CAP + 30).length);
  });

  it('odbiór progów i automatyczne nagrody po końcu wydarzenia', () => {
    const { ctx, s, advance } = makeGame();
    advance(EVENT.EPOCH + DAY - T0);
    tickEvent(ctx);
    s.event = { ...s.event!, pts: 600 };
    const books0 = s.books;
    const r = claimEvent(ctx);
    expect(r).not.toBeNull();
    expect(s.event!.got).toBe(3);
    expect(s.books).toBe(books0 + 3);
    expect(claimEvent(ctx)).toBeNull();
    // kolejny próg osiągnięty, ale wydarzenie się kończy — nagroda przychodzi sama
    s.event = { ...s.event!, pts: 900 };
    const stones0 = s.stones;
    advance(14 * DAY);
    const e = tickEvent(ctx);
    expect(e.ev).toBe(1);
    expect(eventPts(e)).toBe(0);
    expect(s.stones).toBe(stones0 + 30);
    expect(eventUnclaimed(e, s).n).toBe(0);
  });

  it('loch sezonowy: punkty za piętra, boss i skrzynia', () => {
    const h = makeGame(5);
    const { g, ctx, s, events } = h;
    h.advance(EVENT.EPOCH + DAY - T0);
    s.forge.lvl = 30; s.ores[4] = 200; s.stats.smelted = 10;
    for (let i = 0; i < 200 && Object.keys(s.eq).length < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true);
    s.cleared = s.cleared.map((_, i) => i < 2); s.maxLand = 2; s.bestG = 12;
    expect(g.dungUnlocked('sezon')).toBe(true);
    expect(g.dungKeys('sezon')).toBe(EVENT.KEYS);
    const books0 = s.books;
    expect(g.startDung('sezon')).toBe(true);
    simulate(g, 400000);
    expect(g.b.mode).toBe('camp');
    const end = modals(events).find(m => m.kind === 'dungEnd');
    expect(end && end.kind === 'dungEnd' && end.id === 'sezon').toBe(true);
    const floors = s.dungeons.sezon.best;
    expect(floors).toBeGreaterThan(0);
    const pts = Array.from({ length: floors }, (_, i) => EVENT.FLOOR_PTS + EVENT.FLOOR_STEP * (i + 1)).reduce((a, b) => a + b, 0);
    expect(s.event!.pts).toBe(pts);
    expect(end && end.kind === 'dungEnd' && end.evp).toBe(pts);
    expect(s.event!.best).toBe(floors);
    if (floors >= EVENT.FLOORS) expect(s.books).toBeGreaterThan(books0);
    expect(g.dungKeys('sezon')).toBe(EVENT.KEYS - 1);
  });

  it('kontrola zapisu: limit punktów i migracja', () => {
    const e = { ev: 0, pts: 0, d: '', base: { sm: 0, k: 0, b: 0, keys: 0, tw: 0 }, dpts: 0, got: 0, best: 0 };
    expect(eventPtsMax(e, EVENT.EPOCH + DAY)).toBeGreaterThan(EVENT.DAY_CAP);
    expect(eventPtsMax(e, EVENT.EPOCH + 13 * DAY)).toBeGreaterThan(eventPtsMax(e, EVENT.EPOCH + DAY));
    expect(eventPtsMax(e, EVENT.EPOCH + 60 * DAY)).toBe(eventPtsMax(e, EVENT.EPOCH + 14 * DAY - 1));
    const m = migrate({ v: 12, event: 'zle' }, T0);
    expect(m.event).toBeNull();
    expect(m.dungeons.sezon).toEqual({ day: '', keys: EVENT.KEYS, best: 0 });
  });
});
