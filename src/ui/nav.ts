// Nawigacja: na dole tylko cztery przyciski — Bohater, Kuźnia, Przygoda (Krainy i Lochy) i Menu
// (Nauka, Klan, Kodeks z ustawieniami oraz okna: Zadania, Sklep, Przepustka, Ranking). Widok (`Tab`) to to, co jest na ekranie,
// a przycisk na dole (`Nav`) — grupa, do której ten widok należy.
import type { Tab } from './icons';

export type Nav = 'bohater' | 'kuznia' | 'przygoda' | 'menu';

export const NAVS: [Nav, string][] = [['bohater', 'Bohater'], ['kuznia', 'Kuźnia'], ['przygoda', 'Przygoda'], ['menu', 'Menu']];

export const NAV_OF: Record<Tab, Nav> = {
  kuznia: 'kuznia', bohater: 'bohater', krainy: 'przygoda', lochy: 'przygoda', nauka: 'menu', klan: 'menu', kodeks: 'menu',
};

export const VIEW_NAME: Record<Tab, string> = {
  kuznia: 'Kuźnia', bohater: 'Bohater', krainy: 'Krainy', lochy: 'Lochy', nauka: 'Nauka', klan: 'Klan', kodeks: 'Kodeks',
};

/** Widoki w Przygodzie (podzakładki). */
export const ADVENTURE: Tab[] = ['krainy', 'lochy'];

/** Jak dojść do widoku — tekst wskazówki samouczka („Otwórz Menu → Nauka”). */
export function reachText(t: Tab): string {
  const nav = NAV_OF[t];
  if (nav === 'przygoda') return `Otwórz Przygodę → ${VIEW_NAME[t]}.`;
  if (nav === 'menu') return `Otwórz Menu → ${VIEW_NAME[t]}.`;
  return `Przejdź do zakładki ${VIEW_NAME[t]}.`;
}

/**
 * Selektory przycisku prowadzącego do widoku: najpierw sam widok (podzakładka w Przygodzie, kafelek w otwartym Menu),
 * a gdy go nie widać — przycisk na dolnym pasku.
 */
export const reachTarget = (t: Tab): string[] => [`[data-tab="${t}"]`, `[data-tab="${NAV_OF[t]}"]`];
