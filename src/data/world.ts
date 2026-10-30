import type { ElemKey, FoeType } from '../engine/types';
import { oreRank } from './items';

export interface LandDef {
  n: string;
  act: 1 | 2 | 3 | 4 | 5;  // 5 — Otchłań (kręgi po ostatniej krainie)
  main: number;            // główna ruda (najczęstsza; indeks ORES)
  rare: number;            // rzadka ruda krainy (następna po głównej) — z niej nagrody bossa i misji
  drops: [number, number][]; // rozkład rud, gdy fala zostawia rudę: [ruda, % dropów]; nowe rudy pojawiają się z małą szansą
  el: ElemKey | null;      // domieszka krainy
  boss: string;
  type: FoeType;
  foes: string[];
}

/** 16 krain w 4 aktach. Dodanie krainy = dopisanie wiersza (indeks wyznacza trudność). */
export const LANDS: LandDef[] = [
  { n: 'Spalona Wioska', act: 1, main: 0, rare: 1, drops: [[0, 95], [1, 5]], el: null, boss: 'Herszt Bandytów', type: 'Bestie', foes: ['Wygłodniały wilk', 'Wściekły pies', 'Dziki odyniec'] },
  { n: 'Mroczny Las', act: 1, main: 0, rare: 1, drops: [[0, 85], [1, 15]], el: 'jad', boss: 'Wilkołak Alfa', type: 'Bestie', foes: ['Leśny wilk', 'Olbrzymi pająk', 'Dzik'] },
  { n: 'Mokradła Wiedźm', act: 1, main: 0, rare: 1, drops: [[0, 65], [1, 33], [2, 2]], el: 'jad', boss: 'Wiedźma z Mokradeł', type: 'Bestie', foes: ['Bagienna ropucha', 'Olbrzymia pijawka', 'Błotny wąż'] },
  { n: 'Ruiny Twierdzy', act: 1, main: 1, rare: 2, drops: [[0, 45], [1, 50], [2, 5]], el: 'jasn', boss: 'Upadły Rycerz', type: 'Nieumarli', foes: ['Szkielet strażnik', 'Upiorny łucznik', 'Zjawa'] },
  { n: 'Krasnoludzkie Kopalnie', act: 2, main: 2, rare: 3, drops: [[1, 30], [2, 63.5], [3, 6], [4, 0.5]], el: 'zar', boss: 'Kamienny Golem', type: 'Bestie', foes: ['Kret olbrzymi', 'Kamienny chrząszcz', 'Jaskiniowy troll'] },
  { n: 'Lodowe Szczyty', act: 2, main: 2, rare: 3, drops: [[1, 20], [2, 70], [3, 9], [4, 1]], el: 'szron', boss: 'Lodowy Olbrzym', type: 'Bestie', foes: ['Śnieżny wilk', 'Yeti', 'Lodowy żywiołak'] },
  { n: 'Grzmiące Przełęcze', act: 2, main: 2, rare: 3, drops: [[1, 10], [2, 74], [3, 14], [4, 2]], el: 'burz', boss: 'Gromowy Gryf', type: 'Bestie', foes: ['Harpia', 'Burzowy sokół', 'Górski troll'] },
  { n: 'Głębiny Podgórza', act: 2, main: 2, rare: 3, drops: [[2, 70], [3, 26], [4, 4]], el: 'cien', boss: 'Pajęcza Królowa', type: 'Bestie', foes: ['Jaskiniowy pająk', 'Ślepy pełzacz', 'Grzybołak'] },
  { n: 'Nawiedzone Krypty', act: 3, main: 2, rare: 3, drops: [[2, 50], [3, 42], [4, 6], [7, 1], [5, 1]], el: 'cien', boss: 'Upiorny Hrabia', type: 'Nieumarli', foes: ['Ghul', 'Szkielet', 'Upiór'] },
  { n: 'Pustynia Kości', act: 3, main: 3, rare: 4, drops: [[2, 35], [3, 52], [4, 9], [7, 2], [5, 2]], el: 'zar', boss: 'Kościany Skorpion', type: 'Nieumarli', foes: ['Mumia', 'Pustynny skorpion', 'Piaskowy upiór'] },
  { n: 'Cytadela Lisza', act: 3, main: 3, rare: 4, drops: [[2, 20], [3, 58], [4, 15], [7, 3], [5, 4]], el: 'cien', boss: 'Król Lisz', type: 'Nieumarli', foes: ['Rycerz śmierci', 'Nekromanta', 'Kościany golem'] },
  { n: 'Spaczony Klasztor', act: 3, main: 3, rare: 4, drops: [[2, 10], [3, 58], [4, 21], [7, 5], [5, 6]], el: 'jasn', boss: 'Upadły Opat', type: 'Demony', foes: ['Opętany mnich', 'Chochlik', 'Spaczony kapłan'] },
  { n: 'Wulkaniczne Pustkowia', act: 4, main: 3, rare: 4, drops: [[3, 50], [4, 33], [7, 5], [5, 10], [8, 1], [6, 1]], el: 'zar', boss: 'Ognisty Tytan', type: 'Demony', foes: ['Ognisty chochlik', 'Magmowy golem', 'Piekielny ogar'] },
  { n: 'Smocze Turnie', act: 4, main: 4, rare: 5, drops: [[3, 35], [4, 38], [7, 7], [5, 15], [8, 2], [6, 3]], el: 'zar', boss: 'Czerwony Smok', type: 'Smoki', foes: ['Wywerna', 'Smoczy kultysta', 'Młody smok'] },
  { n: 'Burzowe Wyspy', act: 4, main: 4, rare: 5, drops: [[3, 22], [4, 40], [7, 8], [5, 22], [8, 3], [6, 5]], el: 'burz', boss: 'Burzowy Lewiatan', type: 'Smoki', foes: ['Morski wąż', 'Burzowa wywerna', 'Smok błyskawic'] },
  { n: 'Gwiezdny Krater', act: 4, main: 4, rare: 5, drops: [[3, 10], [4, 37], [7, 8], [5, 32], [8, 4], [6, 9]], el: 'jasn', boss: 'Gwiezdny Pożeracz', type: 'Demony', foes: ['Gwiezdny pomiot', 'Pustkowiec', 'Strażnik krateru'] },
];

/**
 * Otchłań: po ostatniej krainie kampanii kolejne kręgi bez końca (indeks krainy ≥ LANDS.length). Krąg powtarza
 * motyw krainy z aktów III i IV, ma silniejszych wrogów i bossa „z Otchłani” oraz rudy z końca gry.
 * Krainy zawsze bierzemy przez `landDef(i)` — działa dla kampanii i dla Otchłani.
 */
export const ABYSS_FROM = LANDS.length;
export const isAbyss = (i: number) => i >= ABYSS_FROM;
/** Numer kręgu Otchłani (1, 2, …) dla krainy `i`. */
export const abyssCircle = (i: number) => i - ABYSS_FROM + 1;
/** Kraina kampanii, której motyw (tło, wrogowie, boss) powtarza krąg — akty III i IV po kolei. */
export const abyssBase = (i: number) => (i < ABYSS_FROM ? i : 8 + ((i - ABYSS_FROM) % 8));
const ABYSS_DROPS: [number, number][] = [[4, 14], [7, 26], [5, 32], [8, 18], [6, 10]];
const abyssLands = new Map<number, LandDef>();
export function landDef(i: number): LandDef {
  if (!(i >= 0)) return LANDS[0];
  if (i < ABYSS_FROM) return LANDS[i];
  let L = abyssLands.get(i);
  if (!L) {
    const b = LANDS[abyssBase(i)];
    L = { ...b, n: `Otchłań ${abyssCircle(i)} · ${b.n}`, act: 5, main: 5, rare: 8, drops: ABYSS_DROPS, boss: `${b.boss} z Otchłani` };
    if (abyssLands.size > 500) abyssLands.clear();
    abyssLands.set(i, L);
  }
  return L;
}

/** Ruda rzadsza niż główna ruda krainy. */
export const isRareOre = (L: LandDef, ore: number) => oreRank(ore) > oreRank(L.main);

/** Rozkład rud krainy w % dropów; `rarePct` (Poszukiwacz, Sowa) zwiększa udział rud rzadszych niż główna. */
export function oreShares(L: LandDef, rarePct = 0): [number, number][] {
  const w = L.drops.map(([o, p]) => [o, isRareOre(L, o) ? p * (1 + rarePct / 100) : p] as [number, number]);
  const sum = w.reduce((a, [, p]) => a + p, 0);
  return w.map(([o, p]) => [o, (p / sum) * 100]);
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** Nazwa aktu do wyświetlenia (akt 5 to Otchłań). */
export const actName = (act: number) => (act >= 5 ? 'Otchłań' : `Akt ${ROMAN[act]}`);
export const FOE_GENITIVE: Record<FoeType, string> = { Bestie: 'Bestii', Nieumarli: 'Umarłych', Demony: 'Demonów', Smoki: 'Smoków' };
export const DUNGEON_FOES = ['Kopalniany golem', 'Jaskiniowy troll', 'Kamienny pełzacz', 'Kret olbrzymi'];

/** Symulowani gracze Wielkiego Obiegu (do czasu podłączenia serwera). */
export const FAKE_PLAYERS = ['Marek_PL', 'Kasia.W', 'Bartek99', 'Zbyszko', 'Ola_Kowalka', 'Grzegorz_M', 'Wojtek_z_Gór', 'Iga_R', 'Kuba1987', 'Natalia_S', 'Piotrek_Młot', 'Ewa.Stal'];
