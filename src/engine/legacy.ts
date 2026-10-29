// Dziedzictwo: od 30. poziomu kuźni bohater przechodzi na emeryturę i zaczyna się nowe pokolenie.
// Kuźnia, kampania, ekwipunek, złoto i rudy wracają do początku; zostaje to, co gracz zbierał długo
// (Nauka, umiejętności, chowańce, wierzchowce, zasoby rzadkie, klan, sklep i przepustka).
// Nagrody: Gwiazdy Mistrza (+5% obrażeń i złota każda) i Pamiątka Rodu — wybrany przedmiot działający w 50%.
// Z serwerem nowe pokolenie zaczyna serwer (server/src/legacy.ts) tą samą funkcją, a gwiazdy i Pamiątkę trzyma u siebie.
import { B } from '../data';
import { newState } from './state';
import type { GameState, Item, SlotId } from './types';

/** Gwiazdy za to pokolenie: 1 za kuźnię 30 i 1 za każde 4 pokonane krainy. */
export const legacyStars = (s: GameState) => 1 + Math.floor(s.cleared.filter(Boolean).length / B.LEGACY_LANDS_PER_STAR);

/** Dlaczego nie można jeszcze zacząć nowego pokolenia (albo null). */
export function legacyBlock(s: GameState): string | null {
  if (s.forge.lvl < B.LEGACY_FORGE) return `od ${B.LEGACY_FORGE}. poziomu kuźni`;
  if (s.forge.up) return 'poczekaj na koniec ulepszenia kuźni';
  return null;
}

/**
 * Stan gry nowego pokolenia. `slot` — przedmiot, który zostaje Pamiątką Rodu (null = zostaje dotychczasowa).
 * Zwraca nowy stan (stary się nie zmienia).
 */
export function legacyReset(s: GameState, slot: SlotId | null, now: number): GameState {
  const n = newState(now);
  const heir: Item | null = slot && s.eq[slot] ? JSON.parse(JSON.stringify(s.eq[slot])) : s.legacy?.item ?? null;
  const keep: Partial<GameState> = {
    name: s.name, sx: s.sx, seeds: s.seeds, obIn: s.obIn, obOut: s.obOut,
    // Nauka, umiejętności, towarzysze, zasoby rzadkie
    tech: s.tech, books: s.books, scrolls: s.scrolls, skills: s.skills, eggs: s.eggs, hatch: s.hatch,
    pets: s.pets, petSel: s.petSel, saddles: s.saddles, mounts: s.mounts, mountSel: s.mountSel, stones: s.stones, seals: s.seals,
    // lochy: rekordy zostają, klucze na dziś też
    dungeons: s.dungeons,
    // runy slotów zostają (to wzmocnienie kuźni, nie przedmiotów)
    runes: s.runes,
    // kolekcja i osiągnięcia należą do konta
    codex: s.codex, ach: s.ach,
    // klan, sklep, przepustka, konto
    clanLvl: s.clanLvl, clanCoins: s.clanCoins, clanShop: s.clanShop, clanGot: s.clanGot,
    gems: s.gems, shop: s.shop, buffs: s.buffs, pass: s.pass, event: s.event,
    missions: s.missions, login: s.login, tut: s.tut, opts: s.opts, stats: s.stats, smith: s.smith,
    speed: s.speed, auto: s.auto, autoStop: s.autoStop, nid: s.nid,
    look: { ...s.look, skins: s.look.skins.includes('zloty') ? s.look.skins : [...s.look.skins, 'zloty'] },
    legacy: { gen: (s.legacy?.gen || 0) + 1, stars: (s.legacy?.stars || 0) + legacyStars(s), item: heir },
  };
  return Object.assign(n, keep);
}
