// Dziedzictwo (nowe pokolenie od kuźni 30) zostało wycofane: kuźnia rośnie do 200. poziomu, a gra jest długoterminowa.
// Kto przeszedł Dziedzictwo, zachowuje premie na zawsze: Gwiazdy Mistrza (+5% obrażeń i złota każda — `allMods`)
// i Pamiątkę Rodu (przedmiot działający w 50% — `extraOf` w stats.ts). Z serwerem trzyma je serwer (`legacy/state`).
import { B } from '../data';
import type { GameState } from './types';

/** Czy gracz ma premie z dawnego Dziedzictwa. */
export const hasLegacy = (s: GameState) => (s.legacy?.stars || 0) > 0 || !!s.legacy?.item;
/** Premia Gwiazd Mistrza w % (obrażenia i złoto). */
export const legacyPct = (s: GameState) => Math.max(0, s.legacy?.stars || 0) * B.LEGACY_STAR_PCT;
