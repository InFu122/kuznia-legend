// Samouczek: łańcuch kroków z pierwszych 15 minut gry. Każdy krok sprawdza stan gry i daje małą nagrodę.
import { SLOT_ORDER, TUTORIAL } from '../data';
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
    // Wejście do lochu zużywa klucz (Wieża jest bez kluczy — liczy się rekord). Samo obejrzenie zakładki
    // ustawia dzień lochu, więc nie może kończyć kroku.
    case 'dung1': return (s.stats.keys || 0) > 0 || Object.values(s.dungeons).some(d => d.best > 0);
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
  const done: string[] = [];
  while (s.tut < TUTORIAL.length && stepDone(s, TUTORIAL[s.tut].id)) {
    const step = TUTORIAL[s.tut];
    grant(ctx, TUT_REWARDS[step.id] ?? {});
    s.tut++;
    done.push(step.t);
  }
  if (!done.length) return false;
  ctx.emit({ t: 'sfx', k: 'claim' });
  // Kilka kroków naraz (np. bohater sam doszedł do 5. etapu) — jeden komunikat zamiast stosu.
  const list = done.length > 1 ? `${done.slice(0, -1).join(', ')} i ${done[done.length - 1]}` : done[0];
  toast(ctx, s.tut >= TUTORIAL.length ? `Zrobione: ${list}. Samouczek ukończony! Codzienne zadania są w Menu → Zadania.` : `Zrobione: ${list}`, 'good');
  ctx.dirty = true;
  return true;
}

/**
 * Podpowiedź w trakcie kroków „Naprzód” i „Boss”: bohater ma puste miejsca na sprzęt, a w kuźni leży ruda.
 * Nowy gracz po trzech wytopach zwykle czeka, aż bohater sam dojdzie do bossa — i pada na 10. etapie.
 * Zwraca liczbę założonych przedmiotów i rudy wybranej do wytopu albo null, gdy podpowiedź nie jest potrzebna.
 */
export function gearHint(s: GameState): { worn: number; ore: number } | null {
  const step = tutStep(s);
  if (!step || (step.id !== 'stage5' && step.id !== 'boss1') || s.pending) return null;
  const worn = SLOT_ORDER.filter(k => !!s.eq[k]).length;
  const ore = s.ores[s.oreSel] ?? 0;
  return worn < SLOT_ORDER.length && ore > 0 ? { worn, ore } : null;
}
