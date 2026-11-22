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
    id: '2026-11-22',
    date: '22 listopada 2026',
    add: [
      'Runy aż do Boskiej Rudy: każda runa ma teraz 50 poziomów — po 5 na każdą rudę (rzadkie rudy kosztują mniej sztuk).',
      'Przebudzenie: sam wybierasz cechę przedmiotu — przeciw Bestiom, Nieumarłym, Demonom, Smokom albo bossom. Gra podpowiada, z kim walczysz teraz i kogo spotkasz dalej. Pierwszy wybór jest darmowy (także dla przedmiotów przebudzonych wcześniej), każda kolejna zmiana kosztuje złoto.',
      'Przekuwanie z potwierdzeniem i losowaniem: wartość nabija się na twoich oczach, a kolor paska pokazuje, jak dobry jest rzut.',
      'Otwieranie zwojów, siodeł i jaj z dreszczykiem — poświata przechodzi przez kolejne rzadkości aż do wylosowanej.',
      'Ulepszanie chowańców i wierzchowców w oknie z podglądem: co się zmieni i ile Mocy zyskasz.',
    ],
    change: [
      'Przebudzony przedmiot daje +15% do statystyki głównej (było +10%).',
      'Karta przedmiotu pokazuje wszystkie progi legendy i skąd bierze się Sława Czynów.',
      'Premie bohatera (wobec rodzajów wrogów, bossów i inne) mają ikonki i rozwijają się po dotknięciu.',
      'Nowe karty umiejętności: rodzaj, główna wartość, odnowienie i postęp do następnego poziomu.',
      'Powiadomienia nie zasłaniają złota, Klejnotów ani Mocy, a przy otwartym oknie czekają, aż je zamkniesz.',
      'Poziomy run 26–30 kosztują teraz Obsydian zamiast Smoczej Stali.',
    ],
    remove: [
      'Powiadomienie „Sprzedano za … złota” — monety lecą prosto do licznika złota.',
    ],
  },
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
