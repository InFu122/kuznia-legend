import type { TechId } from '../engine/types';

export type TechBranch = 'kucie' | 'walka' | 'ekonomia' | 'towarzysze';
export type TechEffect =
  | 'jumpRel' | 'saveOre' | 'forgeTime' | 'forgeCost' | 'autoSpeed'
  | 'dmgPct' | 'hpPct' | 'crit' | 'bossPct'
  | 'goldPct' | 'extraOre' | 'offlineMin' | 'rarePct'
  | 'eggPct' | 'hatchTime' | 'compPct' | 'compCost'
  | 'runeCost' | 'abyssPct' | 'keys' | 'bossLoot' | 'eggUp';

export interface TechDef {
  n: string;
  branch: TechBranch;
  eff: TechEffect;
  per: number;     // wartość efektu na poziom
  max: number;
  req: number;     // wymagany poziom kuźni
  b0: number;      // Księgi Wiedzy: koszt poziomu l (0-based) = b0 × (l + 1)
  d: string;       // opis z {v} = łączna wartość
  /**
   * Kolejne stopnie badania: [poziom kuźni, ile poziomów dochodzi]. Stopień II otwiera się na 40., III na 100. poziomie
   * kuźni — badania starczają na całą grę (kuźnia do 200), a nie tylko na pierwsze miesiące.
   */
  tiers?: readonly (readonly [number, number])[];
}

/** Stopnie badań: od tych poziomów kuźni dochodzą kolejne poziomy istniejących badań. */
export const TECH_TIER_FORGE = [40, 100] as const;
const II = TECH_TIER_FORGE[0], III = TECH_TIER_FORGE[1];

export const TECH_BRANCHES: { id: TechBranch; n: string }[] = [
  { id: 'kucie', n: 'Kucie' },
  { id: 'walka', n: 'Walka' },
  { id: 'ekonomia', n: 'Ekonomia' },
  { id: 'towarzysze', n: 'Towarzysze' },
];

/** Drzewko technologii Akademii Kowalskiej. Odblokowuje się na 3. poziomie kuźni. */
export const TECH: Record<TechId, TechDef> = {
  k_hart: { n: 'Hartowanie', branch: 'kucie', eff: 'jumpRel', per: 2.5, max: 10, req: 3, b0: 2, d: '+{v}% szansy na przeskok (względnie)', tiers: [[II, 3], [III, 3]] },
  k_miech: { n: 'Wielkie miechy', branch: 'kucie', eff: 'forgeTime', per: 3, max: 10, req: 5, b0: 2, d: '−{v}% czasu ulepszeń kuźni' },
  k_auto: { n: 'Wprawne ręce', branch: 'kucie', eff: 'autoSpeed', per: 8, max: 5, req: 6, b0: 2, d: 'auto-wytop szybszy o {v}%', tiers: [[II, 3]] },
  k_oszcz: { n: 'Oszczędny wytop', branch: 'kucie', eff: 'saveOre', per: 4, max: 5, req: 8, b0: 3, d: '{v}% szansy, że ruda się nie zużyje', tiers: [[II, 2], [III, 2]] },
  k_tanie: { n: 'Cech kowali', branch: 'kucie', eff: 'forgeCost', per: 4, max: 5, req: 12, b0: 3, d: '−{v}% kosztu ulepszeń kuźni' },
  w_ostrze: { n: 'Ostrze', branch: 'walka', eff: 'dmgPct', per: 3, max: 20, req: 3, b0: 1, d: '+{v}% obrażeń', tiers: [[II, 5], [III, 5]] },
  w_pancerz: { n: 'Pancerz', branch: 'walka', eff: 'hpPct', per: 3, max: 20, req: 3, b0: 1, d: '+{v}% zdrowia', tiers: [[II, 5], [III, 5]] },
  w_precyzja: { n: 'Precyzja', branch: 'walka', eff: 'crit', per: 1, max: 10, req: 7, b0: 2, d: '+{v}% szansy na krytyk', tiers: [[II, 3], [III, 3]] },
  w_pogromca: { n: 'Łowca bossów', branch: 'walka', eff: 'bossPct', per: 3, max: 10, req: 10, b0: 2, d: '+{v}% obrażeń wobec bossów', tiers: [[II, 3], [III, 3]] },
  e_kupiec: { n: 'Kupiec', branch: 'ekonomia', eff: 'goldPct', per: 5, max: 10, req: 4, b0: 1, d: '+{v}% złota z walki i sprzedaży' }, // bez kolejnych stopni: złota w późnej grze i tak jest dość
  e_gornik: { n: 'Górnik', branch: 'ekonomia', eff: 'extraOre', per: 2, max: 10, req: 4, b0: 1, d: '{v}% szansy na dodatkową rudę z fali', tiers: [[II, 3], [III, 3]] },
  e_noc: { n: 'Nocna zmiana', branch: 'ekonomia', eff: 'offlineMin', per: 30, max: 14, req: 5, b0: 1, d: '+{v} limitu nagród offline (bazowo 1 h)', tiers: [[II, 2], [III, 2]] },
  e_poszuk: { n: 'Poszukiwacz', branch: 'ekonomia', eff: 'rarePct', per: 5, max: 10, req: 9, b0: 2, d: '+{v}% szansy na rzadką rudę (względnie)', tiers: [[II, 3], [III, 3]] },
  t_hodowca: { n: 'Hodowca', branch: 'towarzysze', eff: 'eggPct', per: 10, max: 10, req: 8, b0: 2, d: '+{v}% szansy na jajo z bossów i lochów (względnie)', tiers: [[II, 3], [III, 3]] },
  t_wylegarnia: { n: 'Wylęgarnia', branch: 'towarzysze', eff: 'hatchTime', per: 5, max: 10, req: 9, b0: 2, d: '−{v}% czasu wykluwania jaj', tiers: [[II, 2], [III, 2]] },
  t_wiez: { n: 'Więź', branch: 'towarzysze', eff: 'compPct', per: 2, max: 10, req: 11, b0: 3, d: '+{v}% siły chowańców i wierzchowców', tiers: [[II, 3], [III, 3]] },
  t_stajnia: { n: 'Stajnia', branch: 'towarzysze', eff: 'compCost', per: 4, max: 5, req: 13, b0: 3, d: '−{v}% Kamieni na ulepszenia chowańców i wierzchowców', tiers: [[II, 2], [III, 2]] },
  // Badania późnej gry (od 30. poziomu kuźni)
  k_runy: { n: 'Mistrz run', branch: 'kucie', eff: 'runeCost', per: 4, max: 6, req: 30, b0: 4, d: '−{v}% złota i rudy na poziomy run', tiers: [[III, 4]] },
  w_otchlan: { n: 'Zew Otchłani', branch: 'walka', eff: 'abyssPct', per: 4, max: 10, req: 110, b0: 6, d: '+{v}% obrażeń wobec wrogów Otchłani' },
  e_klucz: { n: 'Klucznik', branch: 'ekonomia', eff: 'keys', per: 1, max: 1, req: 45, b0: 25, d: '+{v} klucz dziennie do każdego lochu z kluczami', tiers: [[III, 1]] },
  e_zyla: { n: 'Bogate złoża', branch: 'ekonomia', eff: 'bossLoot', per: 10, max: 8, req: 70, b0: 5, d: '+{v}% rzadkiej rudy z bossów krain', tiers: [[III, 4]] },
  t_gniazdo: { n: 'Złote gniazdo', branch: 'towarzysze', eff: 'eggUp', per: 4, max: 10, req: 60, b0: 5, d: '{v}% szansy, że jajo z bossa będzie o rzadkość lepsze' },
};
export const TECH_IDS = Object.keys(TECH) as TechId[];
export const TECH_UNLOCK_FORGE = 3;
