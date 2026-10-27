// Sprawdzanie przedmiotów po stronie serwera. Silnik losuje wytop z ziarna, które zna tylko serwer
// (numer wytopu `sx`), więc serwer może odtworzyć losowanie i sprawdzić, czy przedmiot jest prawdziwy.
import { B, ORES, SET_FORGE_LVL, SLOTS, SLOT_ORDER } from '../data';
import { rollSubs, smeltDraws } from './forge';
import { itemLevelFor, jumpChances, maxJump } from './formulas';
import { mulberry32 } from './rng';
import type { Item } from './types';

/**
 * Odtwarza wytop z ziarna i porównuje z przedmiotem. Zwraca opis niezgodności albo null, gdy przedmiot się zgadza.
 * `maxRel` to obecna premia do przeskoku z technologii — w chwili wytopu mogła być tylko mniejsza.
 * `forgeLvl` to obecny poziom kuźni — przedmiot nie mógł powstać na wyższym.
 */
export function verifySmelt(it: Item, seed: number, maxRel: number, forgeLvl: number): string | null {
  const O = ORES[it.ore];
  if (!O || !SLOTS[it.slot]) return 'nieznana ruda lub miejsce';
  if (!(it.flvl >= 1 && it.flvl <= forgeLvl)) return 'poziom kuźni w chwili wytopu';
  if (O.lvl > it.flvl) return 'ruda niedostępna na tym poziomie kuźni';
  if (it.set && it.flvl < SET_FORGE_LVL) return 'zestaw przed odblokowaniem';
  if (it.el && it.flvl < B.ELEM_FORGE_LVL) return 'domieszka przed odblokowaniem';
  const mj = maxJump(it.ore);
  if (!(it.jump >= 0 && it.jump <= mj) || it.r !== Math.min(6, O.floor + it.jump)) return 'rzadkość';

  const rng = mulberry32(seed);
  const d = smeltDraws(rng);
  const [p1, p2] = jumpChances(it.flvl, maxRel);
  switch (it.forced) {
    case '':
      if (it.jump === 2 && d.roll >= p2) return 'przeskok o 2 bez wylosowania';
      if (it.jump === 1 && d.roll >= p1 + p2) return 'przeskok bez wylosowania';
      break;
    case 'tut':
      if (it.jump !== 1 || it.flvl > 2) return 'przeskok samouczka';
      break;
    case 'pity': {
      // Pewny przeskok przychodzi tylko po nieudanym losowaniu.
      const [q1, q2] = jumpChances(it.flvl, 0);
      if (it.jump !== 1 || d.roll < q1 + q2) return 'pewny przeskok';
      break;
    }
    case 'set':
      if (it.jump !== 1 || !it.set) return 'przeskok z rudy unikalnej';
      break;
    default:
      return 'rodzaj przeskoku';
  }

  // Pierwszy wytop w grze to zawsze podstawowa broń.
  const kinds = SLOTS[it.slot].kinds;
  const first = it.slot === 'bron' && it.kind === kinds[0][0] && it.flvl <= 2;
  if (!it.set && !first && SLOT_ORDER[Math.floor(d.slot * SLOT_ORDER.length)] !== it.slot) return 'miejsce';
  const kind = kinds[Math.floor(d.kind * kinds.length)];
  if (!first && (kind[0] !== it.kind || kind[1] !== it.g)) return 'rodzaj przedmiotu';
  if (it.lvl !== itemLevelFor(it.flvl, d.lvl)) return 'poziom przedmiotu';
  const subs = rollSubs(rng, it.r);
  if (!Array.isArray(it.subs) || subs.length !== it.subs.length || subs.some((x, i) => x.id !== it.subs[i].id || x.v !== it.subs[i].v)) return 'statystyki dodatkowe';
  return null;
}

/** Część przedmiotu, którą podpisuje serwer. Sława, historia i przebudzenie zmieniają się w grze, więc ich nie obejmuje. */
export function itemCore(it: Item): string {
  return JSON.stringify([it.slot, it.kind, it.g, it.ore, it.r, it.lvl, it.subs.map(x => [x.id, x.v]), it.el, it.set, it.smith, it.land, !!it.npc]);
}

/** Czy przedmiot ma dowód pochodzenia od serwera (ziarno wytopu albo podpis). */
export const hasProof = (it: Item) => typeof it.sx === 'number' || typeof it.sig === 'string';
