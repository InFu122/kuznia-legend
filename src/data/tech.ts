import type { TechId } from '../engine/types';

export type TechBranch = 'kucie' | 'walka' | 'ekonomia' | 'towarzysze';
export type TechEffect =
  | 'jumpRel' | 'saveOre' | 'forgeTime' | 'forgeCost' | 'autoSpeed'
  | 'dmgPct' | 'hpPct' | 'crit' | 'bossPct'
  | 'goldPct' | 'extraOre' | 'offlineMin' | 'rarePct'
  | 'eggPct' | 'hatchTime' | 'compPct' | 'compCost';

export interface TechDef {
  n: string;
  branch: TechBranch;
  eff: TechEffect;
  per: number;     // wartość efektu na poziom
  max: number;
  req: number;     // wymagany poziom kuźni
  b0: number;      // Księgi Wiedzy: koszt poziomu l (0-based) = b0 × (l + 1)
  d: string;       // opis z {v} = łączna wartość
}

export const TECH_BRANCHES: { id: TechBranch; n: string }[] = [
  { id: 'kucie', n: 'Kucie' },
  { id: 'walka', n: 'Walka' },
  { id: 'ekonomia', n: 'Ekonomia' },
  { id: 'towarzysze', n: 'Towarzysze' },
];

/** Drzewko technologii Akademii Kowalskiej. Odblokowuje się na 3. poziomie kuźni. */
export const TECH: Record<TechId, TechDef> = {
  k_hart: { n: 'Hartowanie', branch: 'kucie', eff: 'jumpRel', per: 2.5, max: 10, req: 3, b0: 2, d: '+{v}% szansy na przeskok (względnie)' },
  k_miech: { n: 'Wielkie miechy', branch: 'kucie', eff: 'forgeTime', per: 3, max: 10, req: 5, b0: 2, d: '−{v}% czasu ulepszeń kuźni' },
  k_auto: { n: 'Wprawne ręce', branch: 'kucie', eff: 'autoSpeed', per: 8, max: 5, req: 6, b0: 2, d: 'auto-wytop szybszy o {v}%' },
  k_oszcz: { n: 'Oszczędny wytop', branch: 'kucie', eff: 'saveOre', per: 4, max: 5, req: 8, b0: 3, d: '{v}% szansy, że ruda się nie zużyje' },
  k_tanie: { n: 'Cech kowali', branch: 'kucie', eff: 'forgeCost', per: 4, max: 5, req: 12, b0: 3, d: '−{v}% kosztu ulepszeń kuźni' },
  w_ostrze: { n: 'Ostrze', branch: 'walka', eff: 'dmgPct', per: 3, max: 20, req: 3, b0: 1, d: '+{v}% obrażeń' },
  w_pancerz: { n: 'Pancerz', branch: 'walka', eff: 'hpPct', per: 3, max: 20, req: 3, b0: 1, d: '+{v}% zdrowia' },
  w_precyzja: { n: 'Precyzja', branch: 'walka', eff: 'crit', per: 1, max: 10, req: 7, b0: 2, d: '+{v}% szansy na krytyk' },
  w_pogromca: { n: 'Łowca bossów', branch: 'walka', eff: 'bossPct', per: 3, max: 10, req: 10, b0: 2, d: '+{v}% obrażeń wobec bossów' },
  e_kupiec: { n: 'Kupiec', branch: 'ekonomia', eff: 'goldPct', per: 5, max: 10, req: 4, b0: 1, d: '+{v}% złota z walki i sprzedaży' },
  e_gornik: { n: 'Górnik', branch: 'ekonomia', eff: 'extraOre', per: 2, max: 10, req: 4, b0: 1, d: '{v}% szansy na dodatkową rudę z fali' },
  e_noc: { n: 'Nocna zmiana', branch: 'ekonomia', eff: 'offlineMin', per: 30, max: 8, req: 7, b0: 2, d: '+{v} min limitu nagród offline' },
  e_poszuk: { n: 'Poszukiwacz', branch: 'ekonomia', eff: 'rarePct', per: 5, max: 10, req: 9, b0: 2, d: '+{v}% szansy na rzadką rudę (względnie)' },
  t_hodowca: { n: 'Hodowca', branch: 'towarzysze', eff: 'eggPct', per: 10, max: 10, req: 8, b0: 2, d: '+{v}% szansy na jajo z bossów i lochów (względnie)' },
  t_wylegarnia: { n: 'Wylęgarnia', branch: 'towarzysze', eff: 'hatchTime', per: 5, max: 10, req: 9, b0: 2, d: '−{v}% czasu wykluwania jaj' },
  t_wiez: { n: 'Więź', branch: 'towarzysze', eff: 'compPct', per: 2, max: 10, req: 11, b0: 3, d: '+{v}% siły chowańców i wierzchowców' },
  t_stajnia: { n: 'Stajnia', branch: 'towarzysze', eff: 'compCost', per: 4, max: 5, req: 13, b0: 3, d: '−{v}% Kamieni na ulepszenia chowańców i wierzchowców' },
};
export const TECH_IDS = Object.keys(TECH) as TechId[];
export const TECH_UNLOCK_FORGE = 3;
