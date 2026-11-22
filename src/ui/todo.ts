// Czerwone kropki: tylko gdy gracz ma coś do odebrania albo do otwarcia (zwoje, siodła, jaja, znaleziska, darmowy wybór cechy).
// Same nowości (świeżo odblokowane funkcje) kropek nie dostają — zapowiada je ogłoszenie i wskazówka palcem.
import type { Game } from '../engine/game';

export type HeroSub = 'eq' | 'runes' | 'skills' | 'pets' | 'mounts';

/** Co czeka w podzakładkach Bohatera. */
export function heroTodo(game: Game): Partial<Record<HeroSub, boolean>> {
  const s = game.s;
  return {
    eq: Object.values(s.eq).some(it => !!it?.aw && !it.awc), // przebudzony przedmiot: darmowy wybór cechy
    skills: game.unlocked('umiejetnosci') && s.scrolls > 0, // Zwoje zaklęć do otwarcia
    pets: game.unlocked('chowance') && !s.hatch && s.eggs.some(n => n > 0), // jajo do włożenia do Inkubatora
    mounts: game.unlocked('wierzchowce') && s.saddles > 0, // Siodła do otwarcia
  };
}
export const heroAny = (game: Game) => Object.values(heroTodo(game)).some(Boolean);

/** Kuźnia: znaleziska ze skrzyń czekają na decyzję. */
export const forgeTodo = (game: Game) => game.s.found.length > 0;
