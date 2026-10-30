import type { ElemKey, Gender, SlotId, SubId } from '../engine/types';

/**
 * Rudy. `floor` = minimalna rzadkość, `lvl` = od którego poziomu kuźni da się ją wytopić,
 * `q` = jakość (mnożnik statystyki głównej), `mj` = najwyższy przeskok (domyślnie 2),
 * `div` = mnożnik szansy na przeskok, który kończy się Boskim (domyślnie DIVINE_JUMP).
 * Indeksy są stałe (zapisują je przedmioty i zapisy gry) — kolejność w grze wyznacza ORE_ORDER.
 */
export interface OreDef { n: string; floor: number; lvl: number; col: string; adj: readonly [string, string, string]; q?: number; mj?: number; div?: number; d?: string }
export const ORES: readonly OreDef[] = [
  { n: 'Miedź', floor: 0, lvl: 1, col: '#c47a4b', adj: ['Miedziany', 'Miedziana', 'Miedziane'] },
  { n: 'Żelazo', floor: 1, lvl: 1, col: '#9ba3ab', adj: ['Żelazny', 'Żelazna', 'Żelazne'] },
  { n: 'Srebro', floor: 2, lvl: 5, col: '#dfe5ec', adj: ['Srebrny', 'Srebrna', 'Srebrne'] },
  { n: 'Mithril', floor: 3, lvl: 12, col: '#7cd3df', adj: ['Mithrilowy', 'Mithrilowa', 'Mithrilowe'] },
  { n: 'Adamantyt', floor: 4, lvl: 25, col: '#86b874', adj: ['Adamantytowy', 'Adamantytowa', 'Adamantytowe'] },
  { n: 'Smocza Stal', floor: 5, lvl: 60, col: '#d6493f', adj: ['Smoczostalowy', 'Smoczostalowa', 'Smoczostalowe'], mj: 1 },
  { n: 'Gwiezdny Kruszec', floor: 5, lvl: 100, col: '#f3e3a1', adj: ['Gwiezdny', 'Gwiezdna', 'Gwiezdne'], q: 1.15, mj: 1, div: 0.12, d: 'najwięcej szans na Boski poza Boską Rudą' },
  { n: 'Obsydian', floor: 4, lvl: 40, col: '#6a5a8a', adj: ['Obsydianowy', 'Obsydianowa', 'Obsydianowe'], q: 1.1, mj: 1, d: 'Legendarny z lepszą jakością' },
  { n: 'Eteryt', floor: 5, lvl: 85, col: '#8fd8f0', adj: ['Eterytowy', 'Eterytowa', 'Eterytowe'], q: 1.08, mj: 1, div: 0.07, d: 'Mityczny z lepszą jakością' },
  { n: 'Boska Ruda', floor: 5, lvl: 120, col: '#ffd76a', adj: ['Niebiański', 'Niebiańska', 'Niebiańskie'], q: 1.25, mj: 1, div: 0.6, d: 'bardzo rzadka: największa szansa na Boski' },
];
/**
 * Poziom kuźni, od którego dało się wytopić rudę według zasad przeskoku do wersji 4 (kuźnia do 30. poziomu).
 * Od wersji 5 (kuźnia do 200. poziomu) rudy otwierają się dużo później — `lvl` w ORES. Serwer sprawdza dawne wytopy według tej tabeli.
 */
export const ORE_LVL_V4: readonly number[] = [1, 1, 5, 10, 15, 20, 25, 17, 23, 25];
/** Kolejność rud w grze (od najprostszej). Boska Ruda jest osobno: nie wypada w krainach i nie da się jej rafinować. */
export const ORE_ORDER = [0, 1, 2, 3, 4, 7, 5, 8, 6, 9];
export const DIVINE_ORE = 9;
/** Miejsce rudy w kolejności jakości (indeksy nie rosną z jakością — nowe rudy dopisano na końcu). */
export const oreRank = (ore: number) => ORE_ORDER.indexOf(ore);
/** Najlepsza ruda nie lepsza od `ore`, którą kuźnia na poziomie `lvl` umie wytopić (nigdy Boska Ruda). */
export function oreCap(ore: number, lvl: number): number {
  let k = Math.min(oreRank(ore), oreRank(DIVINE_ORE) - 1);
  while (k > 0 && ORES[ORE_ORDER[k]].lvl > lvl) k--;
  return ORE_ORDER[Math.max(0, k)];
}
/** Mnożnik szansy na przeskok kończący się Boskim dla rud bez własnego `div` (zasady przeskoku w wersji 3). */
export const DIVINE_JUMP = 0.04;

/** Rzadkości: mnożnik statystyki głównej i liczba substatów. */
export const RAR = [
  { n: 'Zwykły', m: 1, s: 0 },
  { n: 'Niepospolity', m: 1.3, s: 1 },
  { n: 'Rzadki', m: 1.7, s: 1 },
  { n: 'Epicki', m: 2.3, s: 2 },
  { n: 'Legendarny', m: 3.2, s: 3 },
  { n: 'Mityczny', m: 4.5, s: 3 },
  { n: 'Boski', m: 6.5, s: 4 },
] as const;

export interface SlotDef { n: string; stat: 'dmg' | 'hp'; base: number; kinds: [string, Gender][] }

export const SLOTS: Record<SlotId, SlotDef> = {
  bron: { n: 'Broń', stat: 'dmg', base: 12, kinds: [['Miecz', 'm'], ['Topór', 'm'], ['Młot', 'm'], ['Włócznia', 'f'], ['Buława', 'f'],
    ['Sztylet', 'm'], ['Szabla', 'f'], ['Halabarda', 'f'], ['Kostur', 'm'], ['Łuk', 'm']] },
  helm: { n: 'Hełm', stat: 'hp', base: 30, kinds: [['Hełm', 'm'], ['Kaptur', 'm'], ['Diadem', 'm']] },
  zbroja: { n: 'Napierśnik', stat: 'hp', base: 50, kinds: [['Napierśnik', 'm'], ['Kolczuga', 'f'], ['Szata', 'f']] },
  rekawice: { n: 'Rękawice', stat: 'hp', base: 20, kinds: [['Rękawice', 'p'], ['Karwasze', 'p'], ['Szpony', 'p']] },
  buty: { n: 'Buty', stat: 'hp', base: 25, kinds: [['Buty', 'p'], ['Nagolenniki', 'p'], ['Trzewiki', 'p']] },
  pas: { n: 'Pas', stat: 'hp', base: 25, kinds: [['Pas', 'm'], ['Sakwa', 'f'], ['Rzemień', 'm']] },
  pierscien: { n: 'Pierścień', stat: 'dmg', base: 5, kinds: [['Pierścień', 'm'], ['Sygnet', 'm'], ['Obrączka', 'f']] },
  amulet: { n: 'Amulet', stat: 'dmg', base: 6, kinds: [['Amulet', 'm'], ['Medalion', 'm'], ['Talizman', 'm']] },
};

/**
 * Długości list rodzajów w kolejnych wersjach gry. Rodzaj przedmiotu losuje się jako kinds[⌊u·długość⌋],
 * więc serwer sprawdza przedmioty z ziarnem także dla wcześniejszych długości. Nowe rodzaje dopisujemy
 * zawsze na końcu listy i dodajemy tu nową długość.
 */
export const KIND_POOL_SIZES: Record<SlotId, number[]> = {
  bron: [5, 10], helm: [1, 3], zbroja: [1, 3], rekawice: [1, 3], buty: [1, 3], pas: [1, 3], pierscien: [1, 3], amulet: [1, 3],
};

export const SLOT_ORDER: SlotId[] = ['bron', 'helm', 'zbroja', 'rekawice', 'buty', 'pas', 'pierscien', 'amulet'];

/** Substaty: wartość = losowa z [lo, hi] × (1 + 0,15 × rzadkość). `cap` = limit sumy u bohatera. */
export const SUBS: Record<SubId, { n: string; u: string; lo: number; hi: number }> = {
  crit: { n: 'Szansa na krytyk', u: '%', lo: 0.5, hi: 1.5 },
  critd: { n: 'Obrażenia krytyczne', u: '%', lo: 3, hi: 8 },
  spd: { n: 'Szybkość ataku', u: '%', lo: 1, hi: 3 },
  ls: { n: 'Kradzież życia', u: '%', lo: 0.5, hi: 1.5 },
  dodge: { n: 'Unik', u: '%', lo: 0.5, hi: 1.5 },
  regen: { n: 'Regeneracja zdrowia', u: '%/s', lo: 0.1, hi: 0.3 },
  boss: { n: 'Obrażenia wobec bossów', u: '%', lo: 2, hi: 5 },
};
export const STAT_CAPS = { crit: 40, critd: 150, spd: 60, ls: 15, dodge: 25, regen: 3 } as const;
export const SUB_IDS = Object.keys(SUBS) as SubId[];

/** Domieszki żywiołów: drugi, opcjonalny składnik wytopu. */
export const ELEM: Record<ElemKey, { n: string; el: string; eff: 'dmg' | 'slow' | 'ls' | 'holy'; v: number; d: string }> = {
  zar: { n: 'Żarowiec', el: 'Ogień', eff: 'dmg', v: 10, d: '+10% obrażeń (podpalenie)' },
  szron: { n: 'Szronit', el: 'Lód', eff: 'slow', v: 15, d: 'wróg atakuje o 15% wolniej' },
  burz: { n: 'Burzyt', el: 'Błyskawica', eff: 'dmg', v: 12, d: '+12% obrażeń (piorun łańcuchowy)' },
  jad: { n: 'Jadowit', el: 'Trucizna', eff: 'dmg', v: 8, d: '+8% obrażeń (trucizna)' },
  cien: { n: 'Obsydian Cienia', el: 'Cień', eff: 'ls', v: 4, d: '+4% kradzieży życia' },
  jasn: { n: 'Jasnokwarc', el: 'Światło', eff: 'holy', v: 20, d: '+20% obrażeń wobec nieumarłych i demonów' },
};
export const ELEM_KEYS = Object.keys(ELEM) as ElemKey[];

/** Wytop seryjny: ile wytopów jednym przyciskiem i od którego poziomu kuźni. */
/** Wytop seryjny: [ile przedmiotów naraz, od którego poziomu kuźni]. */
export const BATCH_OPTIONS: [number, number][] = [[1, 1], [2, 12], [3, 20]];
/**
 * Rafinacja: ile sztuk rudy (indeks) daje 1 sztukę następnej. Im szlachetniejsza ruda, tym drożej —
 * rafinacja zużywa nadmiar, ale wytapianie rudy wprost zawsze opłaca się bardziej niż jej uszlachetnianie.
 */
export const REFINE: Record<number, { to: number; k: number }> = {
  0: { to: 1, k: 8 }, 1: { to: 2, k: 10 }, 2: { to: 3, k: 12 }, 3: { to: 4, k: 15 },
  4: { to: 7, k: 18 }, 7: { to: 5, k: 20 }, 5: { to: 8, k: 25 }, 8: { to: 6, k: 30 },
};
