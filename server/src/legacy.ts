// Dziedzictwo na serwerze: nowe pokolenie zaczyna serwer (ta sama funkcja co w grze — legacyReset),
// więc Gwiazdy Mistrza i Pamiątki Rodu nie da się dopisać w zapisie. Pamiątką może zostać tylko przedmiot uznany przez serwer.
// Magazyn gracza (tylko serwer): legacy/state — pokolenie, gwiazdy, Pamiątka. save_put wpisuje je do każdego zapisu.
import { SLOTS } from '../../src/data';
import { legacyBlock, legacyReset } from '../../src/engine/legacy';
import type { GameState, SlotId } from '../../src/engine/types';
import { INVALID, PRECONDITION, SAVE_COLLECTION, SAVE_KEY, err, parse, readSave, userOf, type SaveMeta, type SaveValue } from './common';
import { powerOf, proofFor, verifiedEq } from './save';

type Legacy = GameState['legacy'];
const EMPTY: Legacy = { gen: 0, stars: 0, item: null };

export function readLegacy(nk: nkruntime.Nakama, userId: string): Legacy {
  const o = nk.storageRead([{ collection: 'legacy', key: 'state', userId }]);
  return o.length ? (o[0].value as unknown as Legacy) : EMPTY;
}

/** Nowe pokolenie. `slot` — przedmiot na Pamiątkę Rodu (brak = zostaje dotychczasowa). Zwraca nowy stan gry i wersję zapisu. */
export function rpcLegacy(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const slot = typeof req.slot === 'string' && req.slot ? (req.slot as SlotId) : null;
  if (slot && !SLOTS[slot]) throw err('Nieznany slot.', INVALID);
  const cur = readSave(nk, userId);
  if (!cur) throw err('Najpierw zapisz grę.', PRECONDITION);
  const s = cur.value.state;
  s.legacy = readLegacy(nk, userId);
  const block = legacyBlock(s);
  if (block) throw err(`Dziedzictwo: ${block}.`, PRECONDITION);
  const meta: SaveMeta = cur.value.meta || { t0: Date.now(), f0: s.forge.lvl, pity: [] };
  if (slot) {
    const ver = verifiedEq(proofFor(nk, userId, s, meta), s, meta.pity || []);
    if (!ver.eq[slot]) throw err('Tego przedmiotu serwer nie uznaje (wykuty bez połączenia albo zmieniony) — wybierz inny.', PRECONDITION);
  }
  const now = Date.now();
  const next = legacyReset(s, slot, now);
  next.savedAt = now;
  const value: SaveValue = {
    state: next, power: powerOf(next, next.eq), savedAt: now,
    // Kuźnia zaczyna od 1. poziomu: kontrola tempa kuźni liczy od teraz.
    meta: { ...meta, t0: now, f0: 1 },
  };
  let version: string;
  try {
    version = nk.storageWrite([{
      collection: SAVE_COLLECTION, key: SAVE_KEY, userId, value: value as unknown as { [k: string]: unknown },
      version: cur.version, permissionRead: 1, permissionWrite: 0,
    }])[0].version;
  } catch {
    throw err('Zapis zmienił się w międzyczasie — spróbuj jeszcze raz.', PRECONDITION);
  }
  nk.storageWrite([{ collection: 'legacy', key: 'state', userId, value: next.legacy as unknown as { [k: string]: unknown }, permissionRead: 0, permissionWrite: 0 }]);
  return JSON.stringify({ state: next, version, serverTime: now });
}
