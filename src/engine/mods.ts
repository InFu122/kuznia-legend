import { TECH, TECH_IDS } from '../data';
import type { GameState, Mods, TechId } from './types';

export const techLvl = (s: GameState, id: TechId) => s.tech.lv[id] ?? 0;

/** Zsumowane efekty zbadanych technologii. */
export function techMods(s: GameState): Mods {
  const m: Mods = { jumpRel: 0, saveOre: 0, forgeTime: 0, forgeCost: 0, autoSpeed: 0, dmgPct: 0, hpPct: 0, crit: 0, bossPct: 0, goldPct: 0, extraOre: 0, offlineMin: 0, rarePct: 0 };
  for (const id of TECH_IDS) m[TECH[id].eff] += techLvl(s, id) * TECH[id].per;
  return m;
}
