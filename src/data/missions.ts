// Misje dzienne i tygodniowe, kalendarz logowania, samouczek.
import type { MissionKind } from '../engine/types';

export interface MissionDef {
  kind: MissionKind;
  n: string;          // opis z {n} = cel (przy celu 1 część „: {n}” znika)
  daily: number;      // cel dzienny (0 = nie ma w dziennych)
  weekly: number;     // cel tygodniowy (0 = nie ma w tygodniowych)
}

/** Pula misji. Silnik losuje 5 dziennych spośród odblokowanych i 4 tygodniowe. */
export const MISSIONS: Record<MissionKind, MissionDef> = {
  smelt: { kind: 'smelt', n: 'Przetop rudy: {n}', daily: 30, weekly: 400 },
  wave: { kind: 'wave', n: 'Pokonaj fale wrogów: {n}', daily: 150, weekly: 2000 },
  boss: { kind: 'boss', n: 'Pokonaj bossa: {n}', daily: 1, weekly: 10 },
  jump: { kind: 'jump', n: 'Wykuj przedmioty z przeskokiem: {n}', daily: 3, weekly: 30 },
  sell: { kind: 'sell', n: 'Sprzedaj przedmioty: {n}', daily: 10, weekly: 0 },
  equip: { kind: 'equip', n: 'Załóż nowe przedmioty: {n}', daily: 5, weekly: 0 },
  dung: { kind: 'dung', n: 'Ukończ wyprawy do lochów: {n}', daily: 2, weekly: 12 },
  research: { kind: 'research', n: 'Rozpocznij badanie w Akademii: {n}', daily: 1, weekly: 0 },
  scroll: { kind: 'scroll', n: 'Otwórz Zwój zaklęć: {n}', daily: 1, weekly: 0 },
};
export const DAILY_COUNT = 5;
export const WEEKLY_COUNT = 4;
/** Nagroda tygodniowa za każdą misję: Księgi Wiedzy. */
export const WEEKLY_BOOKS = 5;

/** Kalendarz logowania: 7 dni, 7. dnia epicki Zwój (losowanie od rzadkości Epicki wzwyż). */
export const LOGIN_DAYS = [
  { n: 'Sakiewka złota' },
  { n: 'Worek rudy' },
  { n: 'Księgi Wiedzy' },
  { n: 'Zwoje zaklęć' },
  { n: 'Rzadka ruda' },
  { n: 'Kamienie i jajo' },
  { n: 'Epicki Zwój zaklęć' },
] as const;

/* ---------- samouczek ---------- */

export type TutTab = 'kuznia' | 'bohater' | 'nauka' | 'krainy' | 'lochy' | 'kodeks';

export interface TutStep {
  id: string;
  t: string;          // tytuł kroku
  d: string;          // co zrobić
  tab: TutTab;        // zakładka z przyciskiem
  target: string;     // selektor podświetlanego elementu
}

/** Pierwsze 15 minut według dokumentu projektowego: wytop, walka, ulepszenie kuźni, umiejętność, boss. */
export const TUTORIAL: TutStep[] = [
  { id: 'smelt1', t: 'Pierwszy wytop', d: 'Przetop Żelazo od starego mistrza. Pierwszy wytop to zawsze broń.', tab: 'kuznia', target: '.btn-forge' },
  { id: 'equip1', t: 'Załóż broń', d: 'Porównaj Moc i załóż nowy przedmiot — bohater od razu zacznie bić mocniej.', tab: 'kuznia', target: '.result-actions .btn' },
  { id: 'smelt3', t: 'Kuj dalej', d: 'Przetop jeszcze dwie rudy. Trzeci wytop na pewno przeskoczy rzadkość wyżej.', tab: 'kuznia', target: '.btn-forge' },
  { id: 'upgrade', t: 'Ulepsz kuźnię', d: 'Zbierz 150 złota z walki i ulepsz kuźnię do 2. poziomu. Ulepszenie trwa 30 sekund i podnosi szanse na przeskok.', tab: 'kuznia', target: '.upgrade-btn' },
  { id: 'stage5', t: 'Naprzód', d: 'Dojdź do 5. etapu Spalonej Wioski. Tam odblokujesz umiejętności.', tab: 'kuznia', target: '.arena .track' },
  { id: 'skill', t: 'Pierwsza umiejętność', d: 'Otwórz Zwój zaklęć w zakładce Bohater → Umiejętności.', tab: 'bohater', target: '.btn-scroll' },
  { id: 'boss1', t: 'Boss Spalonej Wioski', d: 'Na 10. etapie wyzwij Herszta Bandytów. Jeśli przegrasz, wzmocnij ekwipunek i wróć.', tab: 'kuznia', target: '.arena-actions .btn' },
  { id: 'dung1', t: 'Pierwszy loch', d: 'Wejdź do Skarbca Złota w zakładce Lochy.', tab: 'lochy', target: '.card.dung .btn' },
];

/** Tekst misji z celem. */
export const missionText = (kind: MissionKind, goal: number) =>
  goal === 1 ? MISSIONS[kind].n.replace(': {n}', '') : MISSIONS[kind].n.replace('{n}', goal.toLocaleString('pl-PL'));
