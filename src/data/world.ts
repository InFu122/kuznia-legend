import type { ElemKey, FoeType } from '../engine/types';

export interface LandDef {
  n: string;
  act: 1 | 2 | 3 | 4;
  main: number;            // główna ruda (indeks ORES)
  rare: number;            // rzadka ruda
  rc: number;              // szansa na rzadką rudę z fali (0–1)
  el: ElemKey | null;      // domieszka krainy
  boss: string;
  type: FoeType;
  foes: string[];
}

/** 16 krain w 4 aktach. Dodanie krainy = dopisanie wiersza (indeks wyznacza trudność). */
export const LANDS: LandDef[] = [
  { n: 'Spalona Wioska', act: 1, main: 0, rare: 1, rc: 0.05, el: null, boss: 'Herszt Bandytów', type: 'Bestie', foes: ['Wygłodniały wilk', 'Wściekły pies', 'Dziki odyniec'] },
  { n: 'Mroczny Las', act: 1, main: 0, rare: 1, rc: 0.10, el: 'jad', boss: 'Wilkołak Alfa', type: 'Bestie', foes: ['Leśny wilk', 'Olbrzymi pająk', 'Dzik'] },
  { n: 'Mokradła Wiedźm', act: 1, main: 1, rare: 2, rc: 0.03, el: 'jad', boss: 'Wiedźma z Mokradeł', type: 'Bestie', foes: ['Bagienna ropucha', 'Olbrzymia pijawka', 'Błotny wąż'] },
  { n: 'Ruiny Twierdzy', act: 1, main: 1, rare: 2, rc: 0.06, el: 'jasn', boss: 'Upadły Rycerz', type: 'Nieumarli', foes: ['Szkielet strażnik', 'Upiorny łucznik', 'Zjawa'] },
  { n: 'Krasnoludzkie Kopalnie', act: 2, main: 2, rare: 3, rc: 0.02, el: 'zar', boss: 'Kamienny Golem', type: 'Bestie', foes: ['Kret olbrzymi', 'Kamienny chrząszcz', 'Jaskiniowy troll'] },
  { n: 'Lodowe Szczyty', act: 2, main: 2, rare: 3, rc: 0.03, el: 'szron', boss: 'Lodowy Olbrzym', type: 'Bestie', foes: ['Śnieżny wilk', 'Yeti', 'Lodowy żywiołak'] },
  { n: 'Grzmiące Przełęcze', act: 2, main: 2, rare: 3, rc: 0.04, el: 'burz', boss: 'Gromowy Gryf', type: 'Bestie', foes: ['Harpia', 'Burzowy sokół', 'Górski troll'] },
  { n: 'Głębiny Podgórza', act: 2, main: 3, rare: 4, rc: 0.01, el: 'cien', boss: 'Pajęcza Królowa', type: 'Bestie', foes: ['Jaskiniowy pająk', 'Ślepy pełzacz', 'Grzybołak'] },
  { n: 'Nawiedzone Krypty', act: 3, main: 3, rare: 4, rc: 0.015, el: 'cien', boss: 'Upiorny Hrabia', type: 'Nieumarli', foes: ['Ghul', 'Szkielet', 'Upiór'] },
  { n: 'Pustynia Kości', act: 3, main: 3, rare: 4, rc: 0.02, el: 'zar', boss: 'Kościany Skorpion', type: 'Nieumarli', foes: ['Mumia', 'Pustynny skorpion', 'Piaskowy upiór'] },
  { n: 'Cytadela Lisza', act: 3, main: 4, rare: 5, rc: 0.003, el: 'cien', boss: 'Król Lisz', type: 'Nieumarli', foes: ['Rycerz śmierci', 'Nekromanta', 'Kościany golem'] },
  { n: 'Spaczony Klasztor', act: 3, main: 4, rare: 5, rc: 0.004, el: 'jasn', boss: 'Upadły Opat', type: 'Demony', foes: ['Opętany mnich', 'Chochlik', 'Spaczony kapłan'] },
  { n: 'Wulkaniczne Pustkowia', act: 4, main: 4, rare: 5, rc: 0.005, el: 'zar', boss: 'Ognisty Tytan', type: 'Demony', foes: ['Ognisty chochlik', 'Magmowy golem', 'Piekielny ogar'] },
  { n: 'Smocze Turnie', act: 4, main: 5, rare: 6, rc: 0.0003, el: 'zar', boss: 'Czerwony Smok', type: 'Smoki', foes: ['Wywerna', 'Smoczy kultysta', 'Młody smok'] },
  { n: 'Burzowe Wyspy', act: 4, main: 5, rare: 6, rc: 0.0005, el: 'burz', boss: 'Burzowy Lewiatan', type: 'Smoki', foes: ['Morski wąż', 'Burzowa wywerna', 'Smok błyskawic'] },
  { n: 'Gwiezdny Krater', act: 4, main: 5, rare: 6, rc: 0.001, el: 'jasn', boss: 'Gwiezdny Pożeracz', type: 'Demony', foes: ['Gwiezdny pomiot', 'Pustkowiec', 'Strażnik krateru'] },
];

export const ROMAN = ['', 'I', 'II', 'III', 'IV'];
export const FOE_GENITIVE: Record<FoeType, string> = { Bestie: 'Bestii', Nieumarli: 'Umarłych', Demony: 'Demonów', Smoki: 'Smoków' };
export const DUNGEON_FOES = ['Kopalniany golem', 'Jaskiniowy troll', 'Kamienny pełzacz', 'Kret olbrzymi'];

/** Symulowani gracze Wielkiego Obiegu (do czasu podłączenia serwera). */
export const FAKE_PLAYERS = ['Marek_PL', 'Kasia.W', 'Bartek99', 'Zbyszko', 'Ola_Kowalka', 'Grzegorz_M', 'Wojtek_z_Gór', 'Iga_R', 'Kuba1987', 'Natalia_S', 'Piotrek_Młot', 'Ewa.Stal'];
