// Umiejętności, chowańce i wierzchowce. Rzadkość (0–4) korzysta z nazw i kolorów RAR: Zwykły … Legendarny.
import type { MountId, PetId, SkillId } from '../engine/types';

/* ---------- umiejętności ---------- */

export type SkillKind = 'dmg' | 'shield' | 'heal' | 'buffDmg' | 'buffSpd' | 'buffLs' | 'stun';

export interface SkillDef {
  n: string;
  r: number;           // rzadkość 0–4
  kind: SkillKind;
  v: number;           // wartość na 1. poziomie (% obrażeń, % zdrowia, % premii albo sekundy ogłuszenia)
  dur: number;         // czas działania w ms (wzmocnienia, tarcza)
  cd: number;          // odnowienie w ms
  d: string;           // opis z {v}
}

/** Trzy umiejętności rzucają się same, gdy są gotowe. Duplikaty ze Zwojów podnoszą poziom. */
export const SKILLS: Record<SkillId, SkillDef> = {
  deszcz: { n: 'Deszcz Strzał', r: 0, kind: 'dmg', v: 120, dur: 0, cd: 8000, d: 'zadaje {v}% obrażeń' },
  tarcza: { n: 'Tarcza Run', r: 0, kind: 'shield', v: 20, dur: 6000, cd: 15000, d: 'tarcza pochłania {v}% zdrowia przez 6 s' },
  okrzyk: { n: 'Okrzyk Bojowy', r: 1, kind: 'buffDmg', v: 25, dur: 6000, cd: 16000, d: '+{v}% obrażeń przez 6 s' },
  eliksir: { n: 'Eliksir Życia', r: 1, kind: 'heal', v: 25, dur: 0, cd: 20000, d: 'leczy {v}% zdrowia, gdy spadnie poniżej 60%' },
  kula: { n: 'Ognista Kula', r: 2, kind: 'dmg', v: 200, dur: 0, cd: 11000, d: 'zadaje {v}% obrażeń' },
  nova: { n: 'Lodowa Nova', r: 2, kind: 'stun', v: 2.5, dur: 0, cd: 14000, d: 'zamraża wroga na {v} s' },
  krwawe: { n: 'Krwawe Ostrze', r: 3, kind: 'buffLs', v: 25, dur: 6000, cd: 18000, d: '+{v}% kradzieży życia przez 6 s' },
  burza: { n: 'Gniew Burzy', r: 3, kind: 'buffSpd', v: 50, dur: 6000, cd: 18000, d: '+{v}% szybkości ataku przez 6 s' },
  oddech: { n: 'Oddech Smoka', r: 4, kind: 'dmg', v: 450, dur: 0, cd: 25000, d: 'zadaje {v}% obrażeń' },
};
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];
export const SKILL_SLOTS = 3;
export const SKILL_MAX = 10;
/** Wartość umiejętności rośnie o 8% bazowej na poziom. */
export const SKILL_GROWTH = 0.08;

/* ---------- chowańce ---------- */

export type PetTrait = 'crit' | 'goldPct' | 'hpPct' | 'eldmg' | 'rarePct' | 'spd' | 'ls' | 'regen' | 'bossPct';

export interface PetDef {
  n: string;
  r: number;
  atk: number;         // obrażenia ataku chowańca w % obrażeń bohatera
  int: number;         // odstęp między atakami w ms
  trait: PetTrait;
  tv: number;          // wartość cechy na 1. poziomie
  d: string;           // opis cechy z {v}
}

export const PETS: Record<PetId, PetDef> = {
  wilczek: { n: 'Wilczek', r: 0, atk: 12, int: 1500, trait: 'crit', tv: 3, d: '+{v}% szansy na krytyk' },
  kruk: { n: 'Kruk', r: 0, atk: 8, int: 1200, trait: 'goldPct', tv: 10, d: '+{v}% złota' },
  zolw: { n: 'Żółw Skalny', r: 1, atk: 9, int: 2000, trait: 'hpPct', tv: 10, d: '+{v}% zdrowia' },
  salamandra: { n: 'Salamandra', r: 1, atk: 13, int: 1500, trait: 'eldmg', tv: 8, d: '+{v}% obrażeń z żywiołów' },
  sowa: { n: 'Sowa Śnieżna', r: 2, atk: 11, int: 1300, trait: 'rarePct', tv: 15, d: '+{v}% szansy na rzadką rudę (względnie)' },
  gryfiatko: { n: 'Gryfiątko', r: 2, atk: 16, int: 1400, trait: 'spd', tv: 8, d: '+{v}% szybkości ataku' },
  wilkor: { n: 'Wilkor Cienia', r: 3, atk: 20, int: 1300, trait: 'ls', tv: 4, d: '+{v}% kradzieży życia' },
  feniks: { n: 'Feniks', r: 4, atk: 24, int: 1500, trait: 'regen', tv: 1, d: '+{v}% regeneracji zdrowia na sekundę' },
  smoczek: { n: 'Smoczek', r: 4, atk: 30, int: 1600, trait: 'bossPct', tv: 15, d: '+{v}% obrażeń wobec bossów' },
};
export const PET_IDS = Object.keys(PETS) as PetId[];
/** Czas wykluwania jaja według rzadkości. */
export const HATCH_MS = [30, 60, 120, 240, 480].map(m => m * 60000);

/* ---------- wierzchowce ---------- */

export interface MountDef { n: string; r: number; dmg: number; hp: number }

export const MOUNTS: Record<MountId, MountDef> = {
  kon: { n: 'Koń Bojowy', r: 0, dmg: 3, hp: 3 },
  dzik: { n: 'Dzik Pancerny', r: 0, dmg: 2, hp: 5 },
  wilk: { n: 'Wilk Stepowy', r: 1, dmg: 5, hp: 2 },
  niedzwiedz: { n: 'Niedźwiedź Wojenny', r: 2, dmg: 5, hp: 7 },
  jaszczur: { n: 'Jaszczur Pustyni', r: 2, dmg: 7, hp: 4 },
  jednorozec: { n: 'Jednorożec', r: 3, dmg: 7, hp: 9 },
  gryf: { n: 'Gryf', r: 3, dmg: 9, hp: 7 },
  smok: { n: 'Smok Cienia', r: 4, dmg: 12, hp: 12 },
};
export const MOUNT_IDS = Object.keys(MOUNTS) as MountId[];

/* ---------- wspólne ---------- */

/** Szanse rzadkości przy otwieraniu Zwoju albo Siodła (w %). */
export const DRAW_ODDS = [45, 30, 16, 7, 2];
export const COMPANION_MAX = 40;   // maks. poziom chowańca i wierzchowca
export const STARS_MAX = 5;        // duplikaty dają gwiazdki
export const STAR_BONUS = 0.15;    // +15% za gwiazdkę
export const DUPE_STONES = 10;     // duplikat ponad 5 gwiazdek zamienia się w Kamienie
/** Koszt ulepszenia chowańca/wierzchowca z poziomu l na l+1 (w Kamieniach). */
export const levelCost = (lvl: number, r: number) => Math.round(4 * Math.pow(1.17, lvl - 1) * (1 + 0.25 * r));
/** Mnożnik siły chowańca/wierzchowca od poziomu i gwiazdek. */
export const companionMult = (lvl: number, stars: number) => (1 + 0.05 * (lvl - 1)) * (1 + STAR_BONUS * stars);

/** Odblokowania (indeks krainy, do której trzeba dotrzeć). */
export const SKILLS_UNLOCK_G = 4;   // 5. etap pierwszej krainy
export const PETS_UNLOCK_LAND = 4;  // akt II
export const MOUNTS_UNLOCK_LAND = 8; // akt III

/** Wartość umiejętności na danym poziomie. */
export const skillValue = (id: SkillId, lvl: number) => Math.round(SKILLS[id].v * (1 + SKILL_GROWTH * (lvl - 1)) * 10) / 10;
/** Obrażenia chowańca na trafienie w % obrażeń bohatera. */
export const petAtkPct = (id: PetId, lvl: number, stars: number) => PETS[id].atk * companionMult(lvl, stars);
/** Wartość cechy chowańca na danym poziomie i z gwiazdkami. */
export const petTraitValue = (id: PetId, lvl: number, stars: number) =>
  Math.round(PETS[id].tv * (1 + 0.05 * (lvl - 1)) * (1 + STAR_BONUS * stars) * 10) / 10;
