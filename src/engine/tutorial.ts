// Samouczek: łańcuch kroków z pierwszych 15 minut gry. Każdy krok sprawdza stan gry i daje małą nagrodę.
import { TUTORIAL } from '../data';
import { toast, type Ctx } from './context';
import { grant } from './reward';
import type { GameState, Reward } from './types';

/** Czy krok samouczka jest już wykonany. */
export function stepDone(s: GameState, id: string): boolean {
  switch (id) {
    case 'smelt1': return s.stats.smelted >= 1;
    case 'equip1': return !!s.eq.bron;
    case 'smelt3': return s.stats.smelted >= 3;
    case 'upgrade': return s.forge.lvl >= 2 || s.forge.up >= 2;
    case 'stage5': return s.bestG >= 4;
    case 'skill': return Object.keys(s.skills.lv).length > 0;
    case 'boss1': return s.cleared[0];
    case 'dung1': return Object.values(s.dungeons).some(d => d.best > 0 || d.day !== '');
    default: return true;
  }
}

/** Nagrody za kroki (1. ruda: Żelazo). */
export const TUT_REWARDS: Record<string, Reward> = {
  smelt1: { ores: { 1: 3 } },
  equip1: { gold: 50 },
  smelt3: { ores: { 1: 3 } },
  upgrade: { gold: 100 },
  stage5: { ores: { 1: 5 } },
  skill: { scrolls: 1 },
  boss1: { books: 2 },
  dung1: { gold: 300 },
};

export const tutStep = (s: GameState) => (s.tut < TUTORIAL.length ? TUTORIAL[s.tut] : null);

/** Przesuwa samouczek o wykonane kroki. Zwraca true, gdy coś się zmieniło. */
export function tutTick(ctx: Ctx): boolean {
  const s = ctx.s;
  let moved = false;
  while (s.tut < TUTORIAL.length && stepDone(s, TUTORIAL[s.tut].id)) {
    const step = TUTORIAL[s.tut];
    grant(ctx, TUT_REWARDS[step.id] ?? {});
    s.tut++;
    moved = true;
    ctx.emit({ t: 'sfx', k: 'claim' });
    toast(ctx, s.tut >= TUTORIAL.length ? 'Samouczek ukończony! Codzienne misje znajdziesz w Zadaniach.' : `Zrobione: ${step.t}`, 'good');
  }
  if (moved) ctx.dirty = true;
  return moved;
}
