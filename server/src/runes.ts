// Przekuwanie na serwerze: serwer sprawdza pochodzenie przedmiotu (ziarno wytopu albo podpis), sam losuje nową statystykę
// i podpisuje wynik — przekuty przedmiot dalej liczy się do rankingów i areny. Rudę i złoto płaci gra (jak przy innych akcjach).
import { SLOTS } from '../../src/data';
import { reforgeBlock, rerollSub } from '../../src/engine/runes';
import type { Item } from '../../src/engine/types';
import { INVALID, PRECONDITION, err, parse, readSave, serverDay, serverRng, signItem, signSecret, updateObject, userOf } from './common';

const REFORGE_DAY = 100;
import { proofFor, smeltOk } from './save';

export function rpcReforge(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const it = req.item as Item | undefined;
  const i = Math.floor(Number(req.i));
  if (!it || typeof it !== 'object' || !SLOTS[it.slot] || !Array.isArray(it.subs) || !(i >= 0 && i < it.subs.length)) throw err('Zły przedmiot albo statystyka.', INVALID);
  const save = readSave(nk, userId);
  if (!save) throw err('Najpierw zapisz grę.', PRECONDITION);
  const s = save.value.state;
  const block = reforgeBlock({ ...s, ores: s.ores.map(() => 1e9), gold: 1e18 }, it); // koszt płaci gra — tu tylko poziom kuźni i statystyki
  if (block) throw err(`Przekuwanie: ${block}.`, PRECONDITION);
  const key = signSecret(nk);
  let ok = false;
  if (typeof it.sx === 'number') ok = smeltOk(proofFor(nk, userId, s, save.value.meta), it, s.sx);
  else if (typeof it.sig === 'string') ok = it.sig === signItem(nk, key, it);
  if (!ok) throw err('Tego przedmiotu serwer nie uznaje (wykuty bez połączenia, zmieniony albo jeszcze niezapisany) — spróbuj po zapisie gry.', PRECONDITION);
  // Najwyżej REFORGE_DAY przekuć dziennie (koszt płaci gra, więc serwer ogranicza liczbę losowań).
  let over = false;
  const day = serverDay(Date.now());
  updateObject<{ day: string; n: number }>(nk, 'runes', 'day', userId, cur => {
    const d = cur && cur.day === day ? cur : { day, n: 0 };
    over = d.n >= REFORGE_DAY;
    return over ? null : { day, n: d.n + 1 };
  }, { read: 0, write: 0 });
  if (over) throw err('Na dziś koniec przekuwania — wróć jutro.', PRECONDITION);
  const out = rerollSub(serverRng(nk), it, i) as Item;
  delete out.sx;
  out.sig = signItem(nk, key, out);
  return JSON.stringify({ item: out });
}
