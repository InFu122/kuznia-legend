import type { DungId } from '../engine/types';

export interface DungeonInfo {
  n: string;
  short: string;      // krótka nazwa nagrody
  reward: string;
  how: string;
  keys: number;       // klucze dziennie; 0 = bez limitu
  unlock: string;     // opis warunku
}

export const DUNGEONS: Record<DungId, DungeonInfo> = {
  skarbiec: { n: 'Skarbiec Złota', short: 'Złoto', reward: 'Złoto', how: '30 sekund walki z goblinami niosącymi worki; każdy kolejny daje więcej złota.', keys: 2, unlock: 'po pokonaniu 1. bossa' },
  sztolnia: { n: 'Głęboka Sztolnia', short: 'Lepsza ruda', reward: 'Ruda o poziom lepsza niż w twojej krainie', how: 'Schodzisz piętro po piętrze. Co 5 pięter wybierasz: wyjść z łupem albo ryzykować; porażka zabiera połowę worka.', keys: 2, unlock: 'po pokonaniu 2. bossa' },
  wieza: { n: 'Wieża Wyzwań', short: 'Księgi Wiedzy', reward: 'Księgi Wiedzy co 5 pięter, złoto z każdego piętra', how: 'Nieskończone piętra coraz silniejszych strażników. Postęp zostaje — zaczynasz od pierwszego niepokonanego piętra.', keys: 0, unlock: 'od 3. poziomu kuźni' },
  leza: { n: 'Leża Bossów', short: 'Rudy unikalne', reward: 'Rudy unikalne do zestawów', how: 'Walka z silniejszą wersją pokonanego bossa. Każdy boss z rudą unikalną daje własną rudę.', keys: 3, unlock: 'po pokonaniu Wilkołaka Alfy' },
  kopalnia: { n: 'Kopalnia Kryształów', short: 'Kamienie', reward: 'Kamienie do chowańców i wierzchowców', how: '10 fal kryształowych golemów, coraz silniejszych. Każda fala daje Kamienie; po 10. fali — Siodło (od aktu III).', keys: 2, unlock: 'w akcie II' },
  labirynt: { n: 'Labirynt Minotaura', short: 'Rzadkie rudy i Księgi', reward: 'Rzadkie rudy, Księgi Wiedzy, Zwoje', how: '10 komnat. Przed każdą wybierasz jedne z dwojga drzwi: walka, elita, skarb, źródło albo ołtarz z błogosławieństwem na resztę biegu. Na końcu czeka Minotaur.', keys: 1, unlock: 'w akcie II' },
  zbrojownia: { n: 'Zapomniana Zbrojownia', short: 'Przedmioty z historią', reward: 'Przedmioty z Wielkiego Obiegu', how: 'Trzy skrzynie strzeżone przez duchy dawnych właścicieli. Każdy pokonany duch oddaje przedmiot z jego historią.', keys: 1, unlock: 'w akcie II' },
  krypta: { n: 'Krypta Bohaterów', short: 'Pieczęcie Legendy', reward: 'Pieczęcie Legendy (+1000 Sławy Czynów)', how: 'Walczysz tylko przedmiotami z legendą — reszta zostaje przed wejściem. 5 strażników, a zasady zmieniają się co tydzień.', keys: 1, unlock: 'gdy pierwszy przedmiot zostanie Zahartowany' },
  sezon: { n: 'Loch sezonowy', short: 'Punkty wydarzenia', reward: 'Punkty wydarzenia, na końcu skrzynia', how: '10 pięter wrogów wydarzenia, coraz silniejszych; na ostatnim czeka boss. Każde piętro daje punkty wydarzenia — także gdy przegrasz dalej. Loch zmienia się z każdym wydarzeniem.', keys: 2, unlock: 'po pokonaniu 1. bossa' },
  oltarze: { n: 'Ołtarze Żywiołów', short: 'Domieszki', reward: 'Domieszki żywiołu dnia', how: '5 strażników żywiołu. Każdego dnia tygodnia inny żywioł; porażka zabiera połowę nagrody.', keys: 2, unlock: 'od 10. poziomu kuźni' },
};
export const DUNG_ORDER: DungId[] = ['sezon', 'skarbiec', 'sztolnia', 'wieza', 'leza', 'oltarze', 'kopalnia', 'labirynt', 'zbrojownia', 'krypta'];
export const DUNG_SOON: string[] = [];

/* ---------- Labirynt Minotaura ---------- */

export type LabDoor = 'walka' | 'elita' | 'skarb' | 'zrodlo' | 'oltarz';
export const LAB_ROOMS = 10;
export const LAB_DOORS: Record<LabDoor, { n: string; d: string; w: number }> = {
  walka: { n: 'Walka', d: 'zwykły strażnik, rzadka ruda', w: 34 },
  elita: { n: 'Elita', d: 'silny strażnik, rudy i Księgi', w: 22 },
  skarb: { n: 'Skarb', d: 'skrzynia bez walki', w: 14 },
  zrodlo: { n: 'Źródło', d: 'pełne leczenie', w: 12 },
  oltarz: { n: 'Ołtarz', d: 'błogosławieństwo do końca biegu', w: 18 },
};
export const LAB_BLESSINGS = [
  { k: 'dmg', v: 20, n: '+20% obrażeń' },
  { k: 'hp', v: 25, n: '+25% wytrzymałości' },
  { k: 'ls', v: 8, n: '+8% kradzieży życia' },
] as const;

/* ---------- Krypta Bohaterów ---------- */

export type KryptaRule = 'zywioly' | 'szybkosc' | 'krew' | 'giganci';
/** Zasada tygodnia (numer tygodnia modulo 4). */
export const KRYPTA_RULES: Record<KryptaRule, { n: string; d: string }> = {
  zywioly: { n: 'Tydzień Ciszy Żywiołów', d: 'żywioły i domieszki nie działają' },
  szybkosc: { n: 'Tydzień Szybkości', d: 'obie strony atakują o 50% szybciej' },
  krew: { n: 'Tydzień Krwi', d: 'kradzież życia ×2, regeneracja wyłączona' },
  giganci: { n: 'Tydzień Gigantów', d: 'strażnicy mają 2× zdrowia, ale 0,6× obrażeń' },
};
export const KRYPTA_ORDER: KryptaRule[] = ['zywioly', 'szybkosc', 'krew', 'giganci'];
export const KRYPTA_FLOORS = 5;
export const SEAL_FAME = 1000;
export const ZBROJOWNIA_CHESTS = 3;
export const KOPALNIA_WAVES = 10;
