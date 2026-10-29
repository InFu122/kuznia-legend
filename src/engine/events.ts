// Wydarzenia co 2 tygodnie: punkty z codziennej gry (z dziennym limitem, jak Przepustka Kowala) i z lochu sezonowego,
// progi z nagrodami, a po końcu wydarzenia nieodebrane nagrody trafiają do gracza same.
// Liczy gra (także z serwerem); serwer sprawdza w zapisie, czy punkty mieszczą się w tym, co da się zdobyć.
import { DUNGEONS, EVENT, EVENTS, EVENT_MILESTONES, EVENT_ORDER, EVENT_RUN_MAX, type EventDef, type EventKind } from '../data';
import { toast, type Ctx } from './context';
import { grant } from './reward';
import { addReward, passBaseOf, passItemsReward, utcDay } from './shop';
import type { DungId, EventTrack, GameState, PassBase, Reward } from './types';

const DAY_MS = 86400000;
const LEN = EVENT.DAYS * DAY_MS;

export interface EventInfo { i: number; kind: EventKind; def: EventDef; start: number; end: number }

/** Wydarzenie trwające w chwili `now`. */
export function eventOf(now: number): EventInfo {
  const i = Math.floor((now - EVENT.EPOCH) / LEN);
  const kind = EVENT_ORDER[((i % EVENT_ORDER.length) + EVENT_ORDER.length) % EVENT_ORDER.length];
  const start = EVENT.EPOCH + i * LEN;
  return { i, kind, def: EVENTS[kind], start, end: start + LEN };
}
/** Wydarzenie o numerze `i` (np. stan sprzed zmiany wydarzenia). */
export const eventByIndex = (i: number) => eventOf(EVENT.EPOCH + i * LEN + 1);

/** Punkty z gry od liczników `b` według wag wydarzenia (bez dziennego limitu). */
export function eventActPts(s: GameState, b: PassBase, w: EventDef['w']): number {
  const n = passBaseOf(s);
  const d = (x: number, y: number) => Math.max(0, x - y);
  return Math.floor(d(n.sm, b.sm) * w.sm + d(n.k, b.k) * w.k + d(n.b, b.b) * w.b + d(n.keys, b.keys) * w.keys + d(n.tw, b.tw) * w.tw);
}

export const eventPts = (e: EventTrack) => e.pts + e.dpts;
/** Ile progów nagród osiągnięto. */
export const eventReached = (e: EventTrack) => EVENT_MILESTONES.filter(m => eventPts(e) >= m.pts).length;
/** Punkty za piętro lochu sezonowego. */
export const eventFloorPts = (floor: number) => EVENT.FLOOR_PTS + EVENT.FLOOR_STEP * floor;

const newTrack = (i: number, base: PassBase, day: string): EventTrack => ({ ev: i, pts: 0, d: day, base, dpts: 0, got: 0, best: 0 });

/** Stan wydarzenia po zmianie gry. Nowy dzień zaczyna liczenie od bieżących liczników; nowe wydarzenie — od zera (`old` — poprzednie). */
export function eventUpdate(e: EventTrack | null | undefined, s: GameState, now: number): { e: EventTrack; old: EventTrack | null } {
  const ev = eventOf(now);
  const day = utcDay(now);
  const from = passBaseOf(s);
  let old: EventTrack | null = null;
  let cur: EventTrack | null = e && typeof e.ev === 'number' && e.base ? { ...e, base: { ...e.base } } : null;
  if (!cur || cur.ev !== ev.i) { old = cur; cur = newTrack(ev.i, from, day); }
  if (cur.d !== day) { cur.pts += cur.dpts; cur.dpts = 0; cur.d = day; cur.base = from; }
  cur.dpts = Math.min(EVENT.DAY_CAP, eventActPts(s, cur.base, ev.def.w));
  return { e: cur, old };
}

/** Nieodebrane nagrody progów. */
export function eventUnclaimed(e: EventTrack, s: GameState): { r: Reward; n: number } {
  const reached = eventReached(e);
  let r: Reward = {};
  for (let i = e.got; i < reached; i++) r = addReward(r, passItemsReward(EVENT_MILESTONES[i].r, s));
  return { r, n: Math.max(0, reached - e.got) };
}

/** Aktualny stan wydarzenia w grze; kończy poprzednie (jego nieodebrane nagrody trafiają do gracza). */
export function tickEvent(ctx: Ctx): EventTrack {
  const s = ctx.s;
  const { e, old } = eventUpdate(s.event, s, ctx.now());
  s.event = e;
  if (old) {
    const u = eventUnclaimed(old, s);
    if (u.n) {
      grant(ctx, u.r);
      toast(ctx, `${eventByIndex(old.ev).def.n} dobiegł końca — nieodebrane nagrody (${u.n}) trafiły do ciebie.`, 'good');
      ctx.dirty = true;
    }
  }
  return e;
}

/** Odbiera nagrody wszystkich osiągniętych progów. */
export function claimEvent(ctx: Ctx): Reward | null {
  const e = tickEvent(ctx);
  const u = eventUnclaimed(e, ctx.s);
  if (!u.n) return null;
  grant(ctx, u.r);
  ctx.s.event = { ...e, got: eventReached(e) };
  ctx.dirty = true;
  return u.r;
}

/** Punkty z lochu sezonowego (od razu, bez dziennego limitu). */
export function addEventPts(ctx: Ctx, n: number, floor: number): void {
  const e = tickEvent(ctx);
  ctx.s.event = { ...e, pts: e.pts + n, best: Math.max(e.best, floor) };
  ctx.dirty = true;
}

/** Najwięcej punktów, jakie da się zdobyć w wydarzeniu do chwili `now` (kontrola zapisu na serwerze). */
export function eventPtsMax(e: EventTrack, now: number): number {
  const ev = eventByIndex(e.ev);
  const days = Math.max(1, Math.ceil((Math.min(now, ev.end) - ev.start) / DAY_MS) + 1);
  return days * (EVENT.DAY_CAP + (EVENT.KEYS + 3) * EVENT_RUN_MAX);
}

/** Tło lochu: loch sezonowy ma scenę wydarzenia. */
export const dungScene = (id: string, now: number) => (id === 'sezon' ? 'ev_' + eventOf(now).kind : id);
/** Nazwa lochu: loch sezonowy ma nazwę wydarzenia. */
export const dungName = (id: DungId, now: number) => (id === 'sezon' ? eventOf(now).def.dung : DUNGEONS[id].n);
/** Ikona punktów wydarzenia. */
export const eventIcon = (kind: EventKind) => ({ kuznia: 'iskra', lowy: 'trofeum', upiory: 'swieca' })[kind];

/** Nazwa punktów wydarzenia w formie pasującej do liczby („Iskra”, „Iskry”, „Iskier”). */
export function evWord(n: number, def: EventDef): string {
  const m10 = n % 10, m100 = n % 100;
  return n === 1 ? def.cur1 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? def.cur : def.curGen;
}
/** Liczba z nazwą punktów wydarzenia („1 Iskra”, „24 Iskry”, „5 Iskier”). */
export const evText = (n: number, def: EventDef) => `${n.toLocaleString('pl-PL')} ${evWord(n, def)}`;
