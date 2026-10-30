// Dziedzictwo na serwerze: nowego pokolenia już nie ma (kuźnia rośnie do 200), ale serwer dalej trzyma premie tych,
// którzy je przeszli — Gwiazdy Mistrza i Pamiątkę Rodu (legacy/state). save_put wpisuje je do każdego zapisu.
import type { GameState } from '../../src/engine/types';
import { PRECONDITION, err } from './common';

type Legacy = GameState['legacy'];
const EMPTY: Legacy = { gen: 0, stars: 0, item: null };

export function readLegacy(nk: nkruntime.Nakama, userId: string): Legacy {
  const o = nk.storageRead([{ collection: 'legacy', key: 'state', userId }]);
  return o.length ? (o[0].value as unknown as Legacy) : EMPTY;
}

/** Dziedzictwo wycofane (kuźnia rośnie do 200. poziomu) — stara wersja gry dostaje czytelną odmowę. */
export function rpcLegacy(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, _payload: string): string {
  throw err('Dziedzictwa już nie ma — kuźnia rośnie teraz do 200. poziomu. Zaktualizuj grę.', PRECONDITION);
}
