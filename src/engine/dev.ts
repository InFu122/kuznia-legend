// Narzędzia dewelopera (Kodeks → Narzędzia dewelopera): przeskakiwanie etapów gry do testów.
// Z serwerem działają tylko na kontach z pliku sekrety/dev.txt na serwerze — serwer przyjmuje wtedy zapis bez
// sprawdzania (tempo kuźni, pochodzenie przedmiotów) i nie wpisuje konta do rankingów, areny ani wojny klanów.
// Bez serwera (podgląd w przeglądarce) włącza je 7 dotknięć wersji gry w Kodeksie.
import {
  ABYSS_FROM, B, COMPANION_MAX, DIVINE_ORE, ELEM_KEYS, LANDS, MOUNT_IDS, ORES, PET_IDS, R, SKILL_IDS, SKILL_MAX, SLOTS,
  SLOT_ORDER, STARS_MAX, TECH_IDS, TUTORIAL, landDef,
} from '../data';
import { equipBestSkills, selectBestMount, selectBestPet } from './companions';
import { toast, type Ctx } from './context';
import { JUMP_V, awakeningFor, gOf, itemLevelFor } from './formulas';
import { rollSubs } from './forge';
import { invalidate } from './stats';
import { techMaxAll } from './tech';
import type { Item, SlotId } from './types';

/** Boski przedmiot na najwyższym poziomie, z pełną legendą (cecha do wyboru — pierwszy wybór darmowy). */
function devItem(ctx: Ctx, slot: SlotId): Item {
  const s = ctx.s;
  const [kind, g] = SLOTS[slot].kinds[0];
  const it: Item = {
    id: s.nid++, slot, kind, g, ore: DIVINE_ORE, r: R.BOSKI, lvl: itemLevelFor(s.forge.lvl, 2),
    subs: rollSubs(ctx.rng, R.BOSKI), el: ELEM_KEYS[Math.floor(ctx.rng.next() * ELEM_KEYS.length)], jump: 0, flvl: s.forge.lvl, forced: '', jv: JUMP_V,
    smith: s.name, land: landDef(s.cur.land).n, fame: 25000, kills: {}, bosses: 500, ls: 3, aw: null, owners: [s.name], obieg: false, set: null,
  };
  it.aw = awakeningFor(it);
  return it;
}

/** Kampania: najdalsza zdobyta kraina `land` (wszystkie wcześniejsze pokonane), bohater walczy na jej 1. etapie. */
export function devLand(ctx: Ctx, land: number): void {
  const s = ctx.s;
  const L = Math.max(0, Math.min(ABYSS_FROM + 20, land));
  s.maxLand = L;
  s.cleared = Array.from({ length: Math.max(s.cleared.length, L) }, (_, i) => i < L || !!s.cleared[i]);
  s.frontStage = 1;
  s.bestG = Math.max(s.bestG, gOf(L, 1));
  s.cur = { land: L, stage: 1, wave: 1 };
  invalidate(ctx);
}

/** Kuźnia o `n` poziomów wyżej (bez czekania), do B.FORGE_MAX. */
export function devForge(ctx: Ctx, n: number): void {
  const s = ctx.s;
  s.forge = { lvl: Math.min(B.FORGE_MAX, s.forge.lvl + n), up: 0, left: 0 };
  invalidate(ctx);
}

/** Kończy od razu: ulepszenie kuźni, badanie w Nauce i wykluwanie jaja. */
export function devFinish(ctx: Ctx): void {
  const s = ctx.s;
  if (s.forge.up) s.forge = { lvl: s.forge.up, up: 0, left: 0 };
  if (s.tech.cur) s.tech.cur.left = 1;
  if (s.hatch) s.hatch.left = 1;
  invalidate(ctx);
}

/** Dorzuca zasoby: złoto, rudy, księgi, zwoje, kamienie, siodła, pieczęcie, jaja, domieszki. */
export function devResources(ctx: Ctx): void {
  const s = ctx.s;
  s.gold += 1e12;
  s.ores = ORES.map((_, i) => (s.ores[i] ?? 0) + 50000);
  for (const k of ELEM_KEYS) s.els[k] = (s.els[k] ?? 0) + 500;
  s.books += 500; s.scrolls += 50; s.stones += 50000; s.saddles += 30; s.seals += 30;
  s.eggs = s.eggs.map(n => n + 5);
  if (!s.gems || s.gems < 50000) s.gems = Math.max(s.gems || 0, 50000); // z serwerem Klejnoty ustala serwer
}

/** Wszystko na maksimum: kuźnia, kampania, przedmioty, runy, badania, umiejętności, chowańce, wierzchowce. */
export function devMax(ctx: Ctx): void {
  const s = ctx.s;
  s.tut = TUTORIAL.length;
  s.forge = { lvl: B.FORGE_MAX, up: 0, left: 0 };
  devResources(ctx);
  devLand(ctx, LANDS.length - 1);
  for (const sl of SLOT_ORDER) s.eq[sl] = devItem(ctx, sl);
  s.pending = null;
  s.runes = Object.fromEntries(SLOT_ORDER.map(sl => [sl, B.RUNE_MAX]));
  s.tech = { lv: Object.fromEntries(TECH_IDS.map(id => [id, techMaxAll(id)])), cur: null };
  for (const id of SKILL_IDS) { s.skills.lv[id] = SKILL_MAX; s.skills.cards[id] = 0; }
  for (const id of PET_IDS) s.pets[id] = { lvl: COMPANION_MAX, stars: STARS_MAX };
  for (const id of MOUNT_IDS) s.mounts[id] = { lvl: COMPANION_MAX, stars: STARS_MAX };
  equipBestSkills(ctx);
  selectBestPet(ctx);
  selectBestMount(ctx);
  s.stats.smelted = Math.max(s.stats.smelted, 1000);
  ctx.dirty = true;
  invalidate(ctx);
  toast(ctx, 'Narzędzia dewelopera: wszystko na maksimum', 'good');
}
