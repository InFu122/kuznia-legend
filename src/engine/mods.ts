import { B, CODEX_PCT, MOUNTS, PETS, TECH, TECH_IDS, clanBonus, companionMult, petTraitValue } from '../data';
import type { GameState, Mods } from './types';

export const techLvl = (s: GameState, id: keyof GameState['tech']['lv']) => s.tech.lv[id] ?? 0;

const emptyMods = (): Mods => ({
  jumpRel: 0, saveOre: 0, forgeTime: 0, forgeCost: 0, autoSpeed: 0, dmgPct: 0, hpPct: 0, crit: 0, bossPct: 0,
  goldPct: 0, extraOre: 0, offlineMin: 0, rarePct: 0, spd: 0, ls: 0, regen: 0, eldmg: 0,
});

/** Zsumowane efekty zbadanych technologii. */
export function techMods(s: GameState): Mods {
  const m = emptyMods();
  for (const id of TECH_IDS) m[TECH[id].eff] += techLvl(s, id) * TECH[id].per;
  return m;
}

/** Siła cechy wybranego chowańca (z poziomem i gwiazdkami). */
export function petTrait(s: GameState): { trait: (typeof PETS)[keyof typeof PETS]['trait']; v: number } | null {
  const id = s.petSel;
  const c = id ? s.pets[id] : null;
  if (!id || !c) return null;
  return { trait: PETS[id].trait, v: petTraitValue(id, c.lvl, c.stars) };
}

/** Premie wierzchowca: +% obrażeń i zdrowia. */
export function mountBonus(s: GameState): { dmg: number; hp: number } {
  const id = s.mountSel;
  const c = id ? s.mounts[id] : null;
  if (!id || !c) return { dmg: 0, hp: 0 };
  const k = companionMult(c.lvl, c.stars);
  return { dmg: Math.round(MOUNTS[id].dmg * k * 10) / 10, hp: Math.round(MOUNTS[id].hp * k * 10) / 10 };
}

/** Wszystkie premie: technologie + cecha chowańca + wierzchowiec + poziom klanu. */
export function allMods(s: GameState): Mods {
  const m = techMods(s);
  const t = petTrait(s);
  if (t) m[t.trait] += t.v;
  const mb = mountBonus(s);
  m.dmgPct += mb.dmg;
  m.hpPct += mb.hp;
  for (const [k, v] of Object.entries(clanBonus(s.clanLvl || 0))) m[k as keyof Mods] += v ?? 0;
  // Kolekcja Kowala: każdy odkryty model +0,05% obrażeń i zdrowia
  const codex = Math.min(Array.isArray(s.codex) ? s.codex.length : 0, 400) * CODEX_PCT;
  m.dmgPct += codex;
  m.hpPct += codex;
  // Dziedzictwo: Gwiazdy Mistrza
  const stars = Math.max(0, s.legacy?.stars || 0);
  m.dmgPct += stars * B.LEGACY_STAR_PCT;
  m.goldPct += stars * B.LEGACY_STAR_PCT;
  return m;
}
