// Odblokowywanie funkcji (FEATURES): czy funkcja jest już dostępna, co trzeba zrobić i ogłoszenie nowej funkcji.
import { FEATURES, FEATURE_IDS, landDef, type FeatureId } from '../data';
import type { Ctx } from './context';
import type { GameState } from './types';

/** Czy funkcja jest odblokowana (bez sprawdzania połączenia z serwerem). */
export function isUnlocked(s: Pick<GameState, 'forge' | 'bestG' | 'maxLand'>, id: FeatureId): boolean {
  const F = FEATURES[id];
  return (F.forge === undefined || s.forge.lvl >= F.forge)
    && (F.g === undefined || s.bestG >= F.g)
    && (F.lands === undefined || s.maxLand >= F.lands);
}

/** Warunek odblokowania słowami, np. „na 3. poziomie kuźni” albo „po pokonaniu bossa krainy Spalona Wioska (Herszt Bandytów)”. */
export function unlockWhen(id: FeatureId): string {
  const F = FEATURES[id];
  if (F.forge !== undefined) return `na ${F.forge}. poziomie kuźni`;
  if (F.g !== undefined) return `na ${(F.g % 10) + 1}. etapie krainy ${landDef(Math.floor(F.g / 10)).n}`;
  const L = landDef((F.lands ?? 1) - 1);
  return `po pokonaniu bossa krainy ${L.n} (${L.boss})`;
}

/** Postęp do odblokowania: [teraz, cel, jednostka] — do paska w oknie z kłódką. */
export function unlockProgress(s: GameState, id: FeatureId): [number, number, string] {
  const F = FEATURES[id];
  if (F.forge !== undefined) return [s.forge.lvl, F.forge, 'poziom kuźni'];
  if (F.g !== undefined) return [Math.min(F.g, s.bestG) + 1, F.g + 1, 'etap'];
  return [Math.min(s.maxLand, F.lands ?? 1), F.lands ?? 1, 'pokonane krainy'];
}

/** Funkcje dostępne w tej grze (część tylko z serwerem). */
export const featuresFor = (net: boolean) => FEATURE_IDS.filter(id => net || !FEATURES[id].net);

/** Odblokowane funkcje — do starego zapisu, żeby nie ogłaszać tego, co gracz już zna. */
export const unlockedNow = (s: GameState) => FEATURE_IDS.filter(id => isUnlocked(s, id));

/**
 * Sprawdza, czy coś się właśnie odblokowało. Nowe funkcje trafiają do `s.unl` (już ogłoszone) i `s.unlNew`
 * (znaczek „nowe” do pierwszego otwarcia), a gra pokazuje okno z ogłoszeniem. Zwraca listę nowych funkcji.
 */
export function checkUnlocks(ctx: Ctx): FeatureId[] {
  const s = ctx.s;
  const fresh = featuresFor(ctx.net).filter(id => !s.unl.includes(id) && isUnlocked(s, id));
  if (!fresh.length) return fresh;
  s.unl.push(...fresh);
  for (const id of fresh) if (!s.unlNew.includes(id)) s.unlNew.push(id);
  ctx.dirty = true;
  ctx.emit({ t: 'modal', m: { kind: 'unlocked', ids: fresh } });
  ctx.emit({ t: 'sfx', k: 'claim' });
  return fresh;
}

/** Gracz zobaczył nową funkcję (otworzył zakładkę) — znika znaczek „nowe”. */
export function seenFeature(s: GameState, ids: FeatureId[]): boolean {
  const before = s.unlNew.length;
  s.unlNew = s.unlNew.filter(x => !ids.includes(x as FeatureId));
  return s.unlNew.length !== before;
}
