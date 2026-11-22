// Osiągnięcia (długie cele z progami) i Kolekcja Kowala (odkryte modele przedmiotów: rodzaj × ruda).

export type AchId = 'kowal' | 'przeskoki' | 'pogromca' | 'bossowie' | 'kuznia' | 'krainy' | 'klucze' | 'wieza' | 'rzadkosc' | 'kolekcja' | 'otchlan' | 'runy' | 'towarzysze'
  | 'legendy' | 'nauka' | 'zadania' | 'dni';
export interface AchDef { n: string; d: string; tiers: number[] }

/**
 * `d` — opis celu; {n} zastępuje liczba z progu. Progi rosną aż na lata gry; nowe progi dopisuje się tylko na końcu
 * (zapis trzyma liczbę odebranych progów, więc wstawienie progu w środek przesunęłoby postęp graczy).
 */
export const ACHIEVEMENTS: Record<AchId, AchDef> = {
  kowal: { n: 'Kowal z powołania', d: 'Wykuj {n} przedmiotów', tiers: [100, 1000, 10000, 50000, 200000, 500000, 1000000] },
  przeskoki: { n: 'Ręka szczęścia', d: 'Trafiaj przeskok rzadkości {n} razy', tiers: [10, 100, 1000, 5000, 20000, 50000, 100000] },
  legendy: { n: 'Legendy z kuźni', d: 'Wykuj {n} przedmiotów Legendarnych lub rzadszych', tiers: [1, 10, 100, 500, 2000, 10000] },
  pogromca: { n: 'Pogromca', d: 'Pokonaj {n} wrogów', tiers: [1000, 10000, 100000, 1000000, 10000000, 25000000, 50000000] },
  bossowie: { n: 'Łowca bossów', d: 'Pokonaj {n} bossów krain', tiers: [5, 16, 50, 150, 400, 1000, 2500] },
  kuznia: { n: 'Mistrz kuźni', d: 'Ulepsz kuźnię do {n}. poziomu', tiers: [5, 10, 25, 50, 100, 150, 200] },
  krainy: { n: 'Wędrowiec', d: 'Pokonaj bossów {n} krain', tiers: [1, 4, 8, 12, 16] },
  klucze: { n: 'Odkrywca lochów', d: 'Zużyj {n} kluczy w lochach', tiers: [10, 100, 500, 2000, 6000, 15000, 30000] },
  wieza: { n: 'Zdobywca Wieży', d: 'Dojdź do {n}. piętra Wieży Wyzwań', tiers: [25, 50, 100, 200, 400, 600, 1000] },
  rzadkosc: { n: 'Blask rzadkości', d: 'Wykuj przedmiot co najmniej {n}', tiers: [3, 4, 5, 6] },
  kolekcja: { n: 'Kolekcjoner', d: 'Odkryj {n} modeli przedmiotów', tiers: [20, 50, 100, 150, 217, 310] },
  otchlan: { n: 'Zstępujący w Otchłań', d: 'Pokonaj bossa {n}. kręgu Otchłani', tiers: [1, 5, 10, 20, 35, 50, 75, 100] },
  runy: { n: 'Runmistrz', d: 'Zbierz {n} poziomów run', tiers: [10, 50, 120, 240, 400] },
  nauka: { n: 'Uczony kowal', d: 'Zdobądź {n} poziomów badań w Akademii', tiers: [10, 40, 80, 130, 180, 209] },
  towarzysze: { n: 'Przyjaciel zwierząt', d: 'Zdobądź {n} chowańców i wierzchowców', tiers: [2, 6, 12, 18] },
  zadania: { n: 'Pracowity', d: 'Wykonaj {n} zadań dziennych i tygodniowych', tiers: [10, 100, 500, 1500, 4000, 10000] },
  dni: { n: 'Wierny kowal', d: 'Odbierz prezent za logowanie {n} razy', tiers: [7, 30, 60, 100, 180, 365, 730] },
};

/** Sława kowala za odebrany próg `t` (0 = pierwszy): wyższe progi — więcej. Sława daje tytuły (Piętno Kowala). */
export const achFame = (t: number) => 25 * (t + 1);
export const ACH_IDS = Object.keys(ACHIEVEMENTS) as AchId[];

/** Kolekcja Kowala: każdy odkryty model (rodzaj × ruda) daje na zawsze +0,05% obrażeń i zdrowia. */
export const CODEX_PCT = 0.05;
