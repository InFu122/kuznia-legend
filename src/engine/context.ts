import type { Rng } from './rng';
import type { Battle, GameEvent, GameState, Stats } from './types';

/** Wszystko, czego potrzebują funkcje silnika: stan, walka, losowość, czas i kanał zdarzeń dla interfejsu. */
export interface Ctx {
  s: GameState;
  b: Battle;
  rng: Rng;
  now: () => number;
  emit: (e: GameEvent) => void;
  cache: Stats | null;
  dirty: boolean;
}

export const toast = (ctx: Ctx, msg: string, kind?: 'good' | 'bad') => ctx.emit({ t: 'toast', msg, kind });
