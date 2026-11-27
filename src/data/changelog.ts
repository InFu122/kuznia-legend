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
    id: '2026-11-27',
    date: '27 listopada 2026',
    add: [
      'Gdy kraina jest za trudna i bohater pada już na 1. etapie, na ekranie walki pojawia się przycisk powrotu do poprzedniej krainy.',
      'Rano, o 9:00, przychodzi przypomnienie o prezencie dnia w sklepie.',
    ],
    change: [
      'Wydarzenie i przepustka w Przygodzie są czytelniejsze: wyraźna linia nagród, a złota ścieżka zajmuje mniej miejsca i nadal pokazuje nagrody.',
      'Na ekranie walki przepustka i wydarzenie są po lewej stronie, a reklamy po prawej.',
      'Zakładka Runy jest niższa i czytelniejsza, a miejsca w ekwipunku mają własne ikony.',
      'Powiadomienia mają spokojniejsze i czytelniejsze treści.',
      'Bardzo duże liczby (złoto, Moc, obrażenia) pokazują się skrótem, np. 1,54 bln.',
      'Po zmianie zakładki Krainy, Lochy albo Arena pasek zakładek jest na górze ekranu.',
    ],
    fix: [
      'Czas ulepszania kuźni nie zasłania już przycisku „i”.',
      'Różnice szans w podglądzie ulepszenia kuźni zgadzają się z pokazanymi liczbami.',
      'Na wąskich telefonach mieszczą się górny pasek, zakładki bohatera, lista rywali na arenie oraz wydarzenie i przepustka w Przygodzie.',
    ],
  },
  {
    id: '2026-11-26',
    date: '26 listopada 2026',
    change: [
      'Ulepszenie kuźni pokazuje, jaki poziom będą miały nowe przedmioty, i jak zmieni się szansa na każdą rzadkość z wybranej rudy.',
    ],
    fix: [
      'Po wyjściu z gry nie otwiera się już ekran „Alarmy i przypomnienia”, a próbne powiadomienie przychodzi od razu.',
      'Zmiana zakładki Wojna albo Smok w klanie nie przewija już ekranu na samą górę.',
    ],
  },
  {
    id: '2026-11-25-2',
    date: '25 listopada 2026 (wieczór)',
    add: [
      'Przyspieszenie reklamą: ulepszenie kuźni i badanie w Akademii można raz skrócić reklamą o 10% pełnego czasu (co najmniej o 5 minut).',
      'Pomoc klanu także przy badaniach: do 10 pomocy, każda skraca badanie o 3%.',
      'Czat klanu pokazuje prośby o pomoc i o rudę z przyciskiem „Pomóż” oraz wiadomość, gdy ktoś zbierze pełną pomoc albo komplet rudy.',
      'Wydarzenie w Menu, obok Przepustki, z czasem do końca i kropką, gdy nagrody czekają.',
      'W oknie „i” krainy można przewijać sąsiednie krainy (strzałki albo przesunięcie palcem), żeby porównać łupy, i od razu przenieść się do walki.',
    ],
    change: [
      'Arena w nowej odsłonie: ocena, liga i walki na dziś w jednym nagłówku, przy rywalach trudność i stawka oceny, liga ze strefami awansu i spadku oraz osobna zakładka Obrona.',
      'Powiadomienia: włączenie w Kodeksie pyta telefon o zgodę, przełącznik pokazuje, czy naprawdę działają, a „Wyślij próbne” sprawdza je od razu. Po pierwszej krainie gra raz przypomni, co dają.',
      'Rzadkie przedmioty świecą i mają promienie także w siatce ekwipunku, nie tylko w szczegółach.',
      'Runy przed 10. poziomem kuźni mówią wprost, kiedy się odblokują, a karta Rafinacji jest widoczna od początku.',
      'Stare wiadomości czatu znikają: globalnego po dobie, klanowego po 3 dniach.',
      'Bez paska przewijania po prawej stronie ekranu.',
    ],
    fix: [
      'Powiadomienia telefonu (gotowa kuźnia, koniec badania, jajo, pełne łupy) wcześniej w ogóle nie przychodziły, teraz działają.',
      'Ataki na bossa klanowego i smoka oraz walki na arenie znów działają (wcześniej kończyły się błędem i nie dawały nagrody).',
      'Pomoc klanu działa też przy ulepszeniach kuźni powyżej 30. poziomu.',
    ],
  },
  {
    id: '2026-11-25',
    date: '25 listopada 2026',
    add: [
      'Jakość przedmiotów I–V: każdy wytop losuje jakość, która podnosi wszystkie statystyki przedmiotu (II: +4%, III: +8%, IV: +13%, V: +20%). Jakość V trafia się w 3 wytopach na 100. W podglądzie przedmiotu widać, ile daje jego jakość.',
      'Herb klanu: Przywódca wybiera kolor i symbol, a herb widać na banerze, w wyszukiwarce i na wojnie.',
      'Skrzynia tygodnia: datki, ataki na bossa i smoka, pomoc, dary rudy i bitwy dają klanowi wspólne punkty. Otwierają one 5 skrzyń dla każdego, kto w tym tygodniu dołożył choć punkt.',
      'Kowal tygodnia: najlepszy członek klanu w tygodniu dostaje Monety klanowe i Pieczęć Legendy oraz złotą odznakę.',
    ],
    change: [
      'Klan w nowej odsłonie: baner z poziomem klanu, „Dziś dla klanu”, zakładki z ikonami, arena bossa i smoka z podium, pomoc z paskami postępu, sklep w kafelkach i tablica wyniku wojny.',
      'Ruda unikalna daje teraz pewną jakość IV albo V zamiast przeskoku rzadkości.',
      'Domieszki żywiołów są ok. 5 razy słabsze: to dodatek, a nie konieczność. Moc postaci z domieszkami może przez to trochę spaść.',
      'Złoto z fal nie maleje już w dalszych krainach, a Skarbiec Złota płaci więcej (jeden klucz to ok. 1/5–1/3 ulepszenia kuźni).',
      'Krainy 15–16 i pierwszy krąg Otchłani są łagodniejsze.',
    ],
    fix: [
      'Okno „Witaj z powrotem” nie pokazuje się drugi raz po odebraniu nagrody dziennej.',
      'Nowy nick nie wraca już do starego po synchronizacji z serwerem.',
    ],
  },
  {
    id: '2026-11-23',
    date: '23 listopada 2026',
    add: [
      'Nowa Przepustka Kowala: nagrody jako karty na torze przesuwanym w bok (kolor karty mówi, ile nagroda jest warta), podgląd wszystkiego, co daje złota ścieżka, i okno z odebranymi nagrodami.',
      'Nowe okno wydarzenia: główna nagroda (strój i ramka) od razu na widoku, tor progów jak w przepustce i loch sezonowy pod ręką.',
      'Arena to teraz trzecia zakładka Przygody, obok Krain i Lochów. Nad zakładkami Przygody widać trwające wydarzenie i sezon.',
      'Przed wejściem do lochu pokazuje się okno ze strażnikiem, nagrodą i informacją, ile kluczy zostanie.',
    ],
    change: [
      'Kodeks podzielony na zakładki: Kowal, Kolekcja, Ustawienia i Konto.',
      'Bohater: założony ekwipunek jako karty z opisem każdej części, a Runy w osobnej zakładce z podsumowaniem premii.',
      'Kuźnia: czytelniejsze ulepszenie, wytop i rafinacja (z przyciskiem „Wszystko”).',
      'Auto-wytop ustawiasz tylko przyciskiem Auto na pasku. Gdy skończy się wybrana ruda, auto-wytop sam się wyłącza.',
      'Umiejętności: sloty jak karty i krótsza lista.',
      'Lochy: niższe, czytelniejsze karty.',
      'Przycisk „i” zawsze w prawym górnym rogu.',
      'Zostały tylko czerwone, delikatnie migające kropki, gdy masz coś do odebrania albo otwarcia.',
    ],
    remove: [
      'Premie za zestawy wyposażenia. Ruda unikalna nadal daje pewny przeskok rzadkości.',
    ],
    fix: [
      'Okno „Witaj z powrotem” pokazuje się przy starcie tylko raz.',
    ],
  },
  {
    id: '2026-11-22c',
    date: '22 listopada 2026',
    add: [
      'Regulamin gry: link w Kodeksie, obok polityki prywatności.',
    ],
    change: [
      'W sklepie, pod Klejnotami, krótka informacja: Klejnoty i Pakiet Nowicjusza dostajesz od razu po zakupie (z linkiem do regulaminu).',
      'Polityka prywatności i strona usuwania konta opisują logowanie przez Google.',
    ],
    fix: [
      'Logowanie przez Google: gdy się nie uda, gra pokazuje szczegóły błędu i przycisk „Kopiuj szczegóły”. Łatwiej zgłosić problem.',
    ],
  },
  {
    id: '2026-11-22b',
    date: '22 listopada 2026',
    add: [
      'Logowanie przez Google: w Kodeksie → Konto połączysz postęp z kontem Google, a na nowym telefonie albo po ponownej instalacji wczytasz kowala przyciskiem „Zaloguj przez Google” w oknie powitalnym. To dobrowolne, kod przeniesienia nadal działa.',
      'Szanse losowań w sklepie: przycisk „Szanse” przy Zwoju zaklęć, Siodle i Rzadkim jaju pokazuje, z jakim prawdopodobieństwem trafisz każdą rzadkość i każdą rzecz.',
      'Ruda unikalna na pasku wytopu: wybierasz ją obok domieszki, a przycisk Wytop pokazuje, czym właśnie wytapiasz.',
    ],
    change: [
      'Kopia chowańca lub wierzchowca, który ma już 5 gwiazdek, daje tym więcej Kamieni, im rzadszy jest towarzysz: od 10 (Zwykły) do 150 (Legendarny).',
      'Przy każdym chowańcu i wierzchowcu widać 5 gwiazdek: zdobyte złote, brakujące szare. Okno „i” wyjaśnia, skąd biorą się gwiazdki i co dają kopie.',
    ],
    fix: [
      'Boski ekwipunek jest czytelniejszy: spokojniejsza poświata, a nazwa przedmiotu na ciemnym tle.',
    ],
  },
  {
    id: '2026-11-22',
    date: '22 listopada 2026',
    add: [
      'Runy aż do Boskiej Rudy: każda runa ma teraz 50 poziomów, po 5 na każdą rudę (rzadkie rudy kosztują mniej sztuk).',
      'Przebudzenie: sam wybierasz cechę przedmiotu: przeciw Bestiom, Nieumarłym, Demonom, Smokom albo bossom. Gra podpowiada, z kim walczysz teraz i kogo spotkasz dalej. Pierwszy wybór jest darmowy (także dla przedmiotów przebudzonych wcześniej), każda kolejna zmiana kosztuje złoto.',
      'Przekuwanie z potwierdzeniem i losowaniem: wartość nabija się na twoich oczach, a kolor paska pokazuje, jak dobry jest rzut.',
      'Otwieranie zwojów, siodeł i jaj z dreszczykiem: poświata przechodzi przez kolejne rzadkości aż do wylosowanej.',
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
      'Powiadomienie „Sprzedano za … złota”: monety lecą prosto do licznika złota.',
    ],
  },
  {
    id: '2026-11-21',
    date: '21 listopada 2026',
    add: [
      'Okno „Co nowego”: po każdej aktualizacji zobaczysz tu, co się zmieniło. Wszystkie wpisy znajdziesz też w Kodeksie.',
      'Wybór muzyki: nutka obok Mocy. Muzyka automatyczna albo wybrany utwór (gra do końca, potem wraca automat).',
      'Ekran nie gaśnie w czasie gry, a po minucie bez dotyku gra się przyciemnia, żeby oszczędzać baterię. Dotknij, aby wrócić. Oba ustawienia są w Kodeksie.',
      'Gdy wyjdzie nowa wersja, gra poprosi o aktualizację. Wszyscy grają na tej samej.',
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
