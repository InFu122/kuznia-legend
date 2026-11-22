import type { SetId } from '../engine/types';

export interface SetDef {
  ore: string;        // nazwa rudy unikalnej
  land: number;       // kraina, której boss ją upuszcza
  col: string;
}

/**
 * Rudy unikalne wypadają z bossów (i z Leży Bossów). Wytop z rudą unikalną ma pewny przeskok o co najmniej 1 rzadkość.
 * (Premie za zestawy — 2 i 4 części z tej samej rudy — zostały usunięte w listopadzie 2026; identyfikatory rud zostają.)
 */
export const SETS: Record<SetId, SetDef> = {
  lowca: { ore: 'Kieł Wilkołaka', land: 1, col: '#9b8cff' },
  straz: { ore: 'Serce Golema', land: 4, col: '#b8a58a' },
  wicher: { ore: 'Pióro Gryfa', land: 6, col: '#8fd0ff' },
  nekro: { ore: 'Kość Lisza', land: 10, col: '#9fe0c2' },
  smok: { ore: 'Łuska Smoka', land: 13, col: '#ff8a65' },
  gwiazda: { ore: 'Odłamek Gwiazdy', land: 15, col: '#f6e7a6' },
};
export const SET_IDS = Object.keys(SETS) as SetId[];
export const SET_FORGE_LVL = 15;
/** Która ruda unikalna wypada z bossa danej krainy. */
export const setOfLand = (land: number): SetId | null => SET_IDS.find(id => SETS[id].land === land) ?? null;
