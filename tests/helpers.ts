import { TUTORIAL } from '../src/data';
import { Game } from '../src/engine/game';
import { mulberry32, type Rng } from '../src/engine/rng';
import { newState } from '../src/engine/state';
import type { GameEvent } from '../src/engine/types';

export const T0 = Date.UTC(2026, 9, 27, 10, 0, 0);

/** Gra z ustalonym ziarnem i sterowanym zegarem. Samouczek domyślnie ukończony (żeby nie dosypywał nagród). */
export function makeGame(seed = 1, rng?: Rng, opts: { tutorial?: boolean } = {}) {
  let t = T0;
  const state = newState(t);
  if (!opts.tutorial) state.tut = TUTORIAL.length;
  const g = new Game(state, { rng: rng ?? mulberry32(seed), now: () => t });
  const events: GameEvent[] = [];
  g.on(e => events.push(e));
  return { g, ctx: g.ctx, s: g.ctx.s, events, advance: (ms: number) => { t += ms; } };
}

/** Losowość zwracająca zawsze tę samą wartość — do wymuszania wyników. */
export const constRng = (v: number): Rng => ({ next: () => v });

/** Symuluje `ms` czasu gry w krokach po 50 ms. */
export function simulate(g: Game, ms: number, step = 50) {
  for (let t = 0; t < ms; t += step) g.tick(step);
}
