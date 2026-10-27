// Umiejętności (Zwoje zaklęć), chowańce (Jaja i wykluwanie), wierzchowce (Siodła) i Pieczęcie Legendy.
import {
  COMPANION_MAX, DRAW_ODDS, DUPE_STONES, HATCH_MS, MOUNTS, MOUNTS_UNLOCK_LAND, MOUNT_IDS, PETS, PETS_UNLOCK_LAND, PET_IDS,
  SEAL_FAME, SKILLS, SKILLS_UNLOCK_G, SKILL_IDS, SKILL_MAX, STARS_MAX, levelCost,
} from '../data';
import { toast, type Ctx } from './context';
import { baseName } from './formulas';
import { checkLegend } from './legend';
import { track } from './missions';
import { pick } from './rng';
import { invalidate } from './stats';
import type { GameState, MountId, PetId, SkillId, SlotId } from './types';

export const skillsUnlocked = (s: GameState) => s.bestG >= SKILLS_UNLOCK_G;
export const petsUnlocked = (s: GameState) => s.maxLand >= PETS_UNLOCK_LAND;
export const mountsUnlocked = (s: GameState) => s.maxLand >= MOUNTS_UNLOCK_LAND;

/** Losuje rzadkość 0–4 według DRAW_ODDS (od rzadkości `min` wzwyż). */
export function drawRarity(ctx: Ctx, min = 0): number {
  const odds = DRAW_ODDS.map((p, r) => (r >= min ? p : 0));
  let x = ctx.rng.next() * odds.reduce((a, b) => a + b, 0);
  for (let r = 0; r < odds.length; r++) { x -= odds[r]; if (x < 0) return r; }
  return min;
}

/* ---------- umiejętności ---------- */

/** Ile kopii trzeba, żeby wejść z poziomu `lvl` na następny. */
export const skillNeed = (lvl: number) => lvl;

/** Otwiera Zwój: nowa umiejętność albo kopia, która podnosi poziom. */
export function openScroll(ctx: Ctx): { id: SkillId; dupe: boolean } | null {
  const s = ctx.s;
  if (s.scrolls < 1 || !skillsUnlocked(s)) return null;
  s.scrolls--;
  track(ctx, 'scroll');
  return drawSkill(ctx, 0);
}

/** Losuje umiejętność od rzadkości `min` (epicki Zwój z kalendarza: min = 3). */
export function drawSkill(ctx: Ctx, min: number): { id: SkillId; dupe: boolean } {
  const s = ctx.s;
  const r = drawRarity(ctx, min);
  const id = pick(ctx.rng, SKILL_IDS.filter(k => SKILLS[k].r === r));
  const dupe = !!s.skills.lv[id];
  if (!dupe) {
    s.skills.lv[id] = 1;
    s.skills.cards[id] = 0;
    const free = s.skills.eq.indexOf(null);
    if (free >= 0) s.skills.eq[free] = id;
  } else {
    s.skills.cards[id] = (s.skills.cards[id] ?? 0) + 1;
    let lvl = s.skills.lv[id] ?? 1;
    while (lvl < SKILL_MAX && (s.skills.cards[id] ?? 0) >= skillNeed(lvl)) { s.skills.cards[id]! -= skillNeed(lvl); lvl++; }
    s.skills.lv[id] = lvl;
  }
  invalidate(ctx);
  ctx.dirty = true;
  return { id, dupe };
}

export function equipSkill(ctx: Ctx, id: SkillId | null, slot: number): boolean {
  const eq = ctx.s.skills.eq;
  if (slot < 0 || slot >= eq.length || (id && !ctx.s.skills.lv[id])) return false;
  const was = id ? eq.indexOf(id) : -1;
  if (was >= 0) eq[was] = eq[slot]; // zamiana miejscami
  eq[slot] = id;
  invalidate(ctx);
  ctx.dirty = true;
  return true;
}

/* ---------- chowańce ---------- */

/** Dodaje chowańca albo wierzchowca do kolekcji; duplikat daje gwiazdkę (albo Kamienie po 5 gwiazdkach). */
function grant<K extends string>(ctx: Ctx, coll: Partial<Record<K, { lvl: number; stars: number }>>, id: K): boolean {
  const c = coll[id];
  if (!c) { coll[id] = { lvl: 1, stars: 0 }; return false; }
  if (c.stars < STARS_MAX) c.stars++;
  else ctx.s.stones += DUPE_STONES;
  return true;
}

export function startHatch(ctx: Ctx, r: number): boolean {
  const s = ctx.s;
  if (s.hatch || !petsUnlocked(s) || (s.eggs[r] ?? 0) < 1) return false;
  s.eggs[r]--;
  s.hatch = { r, left: HATCH_MS[r], total: HATCH_MS[r] };
  ctx.dirty = true;
  return true;
}

/** Odlicza wykluwanie. Zwraca chowańca, który się wykluł. */
export function tickHatch(ctx: Ctx, ms: number, quiet = false): PetId | null {
  const h = ctx.s.hatch;
  if (!h) return null;
  h.left -= ms;
  if (h.left > 0) return null;
  ctx.s.hatch = null;
  const id = pick(ctx.rng, PET_IDS.filter(k => PETS[k].r === h.r));
  const dupe = grant(ctx, ctx.s.pets, id);
  if (!ctx.s.petSel) ctx.s.petSel = id;
  invalidate(ctx);
  ctx.dirty = true;
  if (!quiet) ctx.emit({ t: 'modal', m: { kind: 'draw', what: 'pet', id, dupe } });
  return id;
}

export function selectPet(ctx: Ctx, id: PetId | null): boolean {
  if (id && !ctx.s.pets[id]) return false;
  ctx.s.petSel = id;
  invalidate(ctx);
  ctx.dirty = true;
  return true;
}

/* ---------- wierzchowce ---------- */

export function openSaddle(ctx: Ctx): { id: MountId; dupe: boolean } | null {
  const s = ctx.s;
  if (s.saddles < 1 || !mountsUnlocked(s)) return null;
  s.saddles--;
  const r = drawRarity(ctx);
  const id = pick(ctx.rng, MOUNT_IDS.filter(k => MOUNTS[k].r === r));
  const dupe = grant(ctx, s.mounts, id);
  if (!s.mountSel) s.mountSel = id;
  invalidate(ctx);
  ctx.dirty = true;
  return { id, dupe };
}

export function selectMount(ctx: Ctx, id: MountId | null): boolean {
  if (id && !ctx.s.mounts[id]) return false;
  ctx.s.mountSel = id;
  invalidate(ctx);
  ctx.dirty = true;
  return true;
}

/* ---------- ulepszanie Kamieniami ---------- */

export function upgradeCost(kind: 'pet' | 'mount', id: PetId | MountId, lvl: number): number {
  const r = kind === 'pet' ? PETS[id as PetId].r : MOUNTS[id as MountId].r;
  return levelCost(lvl, r);
}

export function levelUp(ctx: Ctx, kind: 'pet' | 'mount', id: PetId | MountId): boolean {
  const s = ctx.s;
  const c = kind === 'pet' ? s.pets[id as PetId] : s.mounts[id as MountId];
  if (!c || c.lvl >= COMPANION_MAX) return false;
  const cost = upgradeCost(kind, id, c.lvl);
  if (s.stones < cost) return false;
  s.stones -= cost;
  c.lvl++;
  invalidate(ctx);
  ctx.dirty = true;
  return true;
}

/* ---------- Pieczęcie Legendy ---------- */

/** Pieczęć Legendy dodaje 1000 Sławy Czynów założonemu przedmiotowi. */
export function useSeal(ctx: Ctx, slot: SlotId): boolean {
  const it = ctx.s.eq[slot];
  if (!it || ctx.s.seals < 1) return false;
  ctx.s.seals--;
  it.fame += SEAL_FAME;
  checkLegend(ctx, it, false);
  toast(ctx, `${baseName(it)}: +${SEAL_FAME} Sławy Czynów`, 'good');
  ctx.dirty = true;
  return true;
}
