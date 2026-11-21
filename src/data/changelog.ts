// Dziennik zmian („Co nowego”): po aktualizacji gra pokazuje najnowszy wpis, dopóki gracz nie zaznaczy
// „Nie pokazuj ponownie” (wtedy zapisuje opts.logSeen = id wpisu). Wszystkie wpisy są też w Kodeksie.
//
// PRZED KAŻDYM WYDANIEM (AAB do Google Play): dopisz NOWY wpis NA POCZĄTKU listy, z nowym `id`.
// Bez nowego wpisu gracze po aktualizacji nie zobaczą okna (ostatni wpis już widzieli).
// Piszemy dla gracza: krótko, konkretnie, bez nazw technicznych.

export interface LogEntry {
  /** Niepowtarzalny identyfikator wpisu (np. data wydania). */
  id: string;
  /** Data do wyświetlenia. */
  date: string;
  add?: string[];
  change?: string[];
  fix?: string[];
  remove?: string[];
}

export const CHANGELOG: LogEntry[] = [
  {
    id: '2026-11-21',
    date: '21 listopada 2026',
    add: [
      'Okno „Co nowego” — po każdej aktualizacji zobaczysz tu, co się zmieniło. Wszystkie wpisy znajdziesz też w Kodeksie.',
      'Wybór muzyki: nutka obok Mocy. Muzyka automatyczna albo wybrany utwór — gra do końca, potem wraca automat.',
      'Ekran nie gaśnie w czasie gry, a po minucie bez dotyku gra się przyciemnia, żeby oszczędzać baterię. Dotknij, aby wrócić. Oba ustawienia są w Kodeksie.',
      'Gdy wyjdzie nowa wersja, gra poprosi o aktualizację — wszyscy grają na tej samej.',
    ],
    change: [
      'Pasek wytopu: domieszka to zakładka nad rudą, a przycisk Wytop pokazuje rudę i domieszkę (np. „Żelazo + Żarowiec”).',
      'Muzyka lochu i bossa gra co najmniej 15 sekund, nawet gdy boss padnie szybciej.',
      'Napis „Offline” wisi pod górnym paskiem i nie zasłania Mocy.',
    ],
  },
];

/** Najnowszy wpis (pusty napis, gdy dziennik jest pusty). */
export const LATEST_LOG = CHANGELOG[0]?.id ?? '';
