import type { FoeType, SetId } from '../engine/types';

export interface SetBonus {
  dmgPct?: number; hpPct?: number; crit?: number; spd?: number; ls?: number; dodge?: number; bossPct?: number;
  vs?: Partial<Record<FoeType, number>>;
}

export interface SetDef {
  n: string;          // nazwa zestawu
  ore: string;        // nazwa rudy unikalnej
  land: number;       // kraina, której boss ją upuszcza
  col: string;
  b2: SetBonus; d2: string;
  b4: SetBonus; d4: string;
}

/** Rudy unikalne wypadają z bossów (i z Leży Bossów). Część zestawu = ruda unikalna + ruda bazowa. */
export const SETS: Record<SetId, SetDef> = {
  lowca: { n: 'Łowca Nocy', ore: 'Kieł Wilkołaka', land: 1, col: '#9b8cff', b2: { dmgPct: 10 }, d2: '+10% obrażeń', b4: { crit: 6 }, d4: '+6% szansy na krytyk' },
  straz: { n: 'Kamienna Straż', ore: 'Serce Golema', land: 4, col: '#b8a58a', b2: { hpPct: 10 }, d2: '+10% zdrowia', b4: { hpPct: 20, dodge: 4 }, d4: 'tarcza: +20% zdrowia i +4% uniku' },
  wicher: { n: 'Wichrowy Jeździec', ore: 'Pióro Gryfa', land: 6, col: '#8fd0ff', b2: { spd: 10 }, d2: '+10% szybkości ataku', b4: { spd: 15, dmgPct: 5 }, d4: '+15% szybkości ataku i +5% obrażeń' },
  nekro: { n: 'Nekromanta', ore: 'Kość Lisza', land: 10, col: '#9fe0c2', b2: { ls: 5 }, d2: '+5% kradzieży życia', b4: { vs: { Nieumarli: 30, Demony: 15 } }, d4: '+30% obrażeń wobec nieumarłych, +15% wobec demonów' },
  smok: { n: 'Smoczy Łowca', ore: 'Łuska Smoka', land: 13, col: '#ff8a65', b2: { dmgPct: 10 }, d2: '+10% obrażeń', b4: { vs: { Smoki: 30 }, bossPct: 10 }, d4: '+30% obrażeń wobec smoków, +10% wobec bossów' },
  gwiazda: { n: 'Gwiezdny Wędrowiec', ore: 'Odłamek Gwiazdy', land: 15, col: '#f6e7a6', b2: { dmgPct: 12, hpPct: 12 }, d2: '+12% obrażeń i zdrowia', b4: { dmgPct: 20, hpPct: 20 }, d4: '+20% obrażeń i zdrowia' },
};
export const SET_IDS = Object.keys(SETS) as SetId[];
export const SET_FORGE_LVL = 15;
/** Która ruda unikalna wypada z bossa danej krainy. */
export const setOfLand = (land: number): SetId | null => SET_IDS.find(id => SETS[id].land === land) ?? null;
