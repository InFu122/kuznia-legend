// Wspólne drobiazgi modułu serwera: błędy RPC, odczyt zapisu, sekrety i podpisy.
import { goldG } from '../../src/engine/formulas';
import { mulberry32, type Rng } from '../../src/engine/rng';
import type { GameState, Item } from '../../src/engine/types';
import { itemCore } from '../../src/engine/verify';

export const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';
export const SAVE_COLLECTION = 'save';
export const SAVE_KEY = 'state';

export const INVALID = 3 as nkruntime.Codes;          // INVALID_ARGUMENT → HTTP 400
export const NOT_FOUND = 5 as nkruntime.Codes;        // NOT_FOUND → HTTP 404
export const PRECONDITION = 9 as nkruntime.Codes;     // FAILED_PRECONDITION → HTTP 400
export const EXHAUSTED = 8 as nkruntime.Codes;        // RESOURCE_EXHAUSTED → HTTP 429
export const UNAUTH = 16 as nkruntime.Codes;          // UNAUTHENTICATED → HTTP 401

export function err(message: string, code: nkruntime.Codes): nkruntime.Error {
  return { message, code } as nkruntime.Error;
}

export function userOf(ctx: nkruntime.Context): string {
  if (!ctx.userId) throw err('Wymagane logowanie.', UNAUTH);
  return ctx.userId;
}

export function parse(payload: string): Record<string, unknown> {
  if (!payload) return {};
  try {
    const v = JSON.parse(payload);
    return v && typeof v === 'object' ? v : {};
  } catch {
    throw err('Niepoprawny JSON.', INVALID);
  }
}

/** Dane, które serwer trzyma przy zapisie gracza (gracz ich nie widzi ani nie zmienia). */
export interface SaveMeta {
  t0: number;        // od kiedy serwer liczy tempo rozwoju kuźni
  f0: number;        // poziom kuźni w chwili t0
  pity: number[];    // numery wytopów z pewnym przeskokiem, które serwer już uznał
  clMax?: number;    // najwyższy poziom klanu gracza (premia do czasu ulepszeń w kontroli tempa)
  jv2?: number;      // od tego numeru wytopu obowiązują zasady przeskoku w wersji 2 (wcześniejsze mogą mieć dawne)
  jv3?: number;      // od tego numeru wytopu obowiązują zasady w wersji 3 (nowe rudy; wcześniejsze mogą mieć wersję 2)
  jv4?: number;      // od tego numeru wytopu obowiązują zasady w wersji 4 (nowa ruda wchodzi stopniowo)
  jv5?: number;      // od tego numeru wytopu obowiązują zasady w wersji 5 (kuźnia do 200, rudy otwierają się później)
}
export interface SaveValue { state: GameState; power: number; savedAt: number; meta?: SaveMeta }

export function readSave(nk: nkruntime.Nakama, userId: string): (nkruntime.StorageObject & { value: SaveValue }) | null {
  const objs = nk.storageRead([{ collection: SAVE_COLLECTION, key: SAVE_KEY, userId }]);
  return objs.length ? (objs[0] as nkruntime.StorageObject & { value: SaveValue }) : null;
}

/** Obiekt w magazynie serwera tylko do odczytu przez serwer; tworzy go przy pierwszym użyciu. */
function serverSecret(nk: nkruntime.Nakama, userId: string, key: string): string {
  const read = () => nk.storageRead([{ collection: 'secret', key, userId }]);
  let objs = read();
  if (!objs.length) {
    const k = nk.sha256Hash(nk.uuidv4() + nk.uuidv4() + Date.now());
    try {
      nk.storageWrite([{ collection: 'secret', key, userId, value: { k }, version: '*', permissionRead: 0, permissionWrite: 0 }]);
    } catch { /* ktoś utworzył go równocześnie */ }
    objs = read();
  }
  return String(objs[0].value.k);
}

/** Sekret ziaren wytopu gracza — zna go tylko serwer. */
export const smeltSecret = (nk: nkruntime.Nakama, userId: string) => serverSecret(nk, userId, 'smelt');
/** Sekret serwera do podpisywania przedmiotów z Obiegu. */
export const signSecret = (nk: nkruntime.Nakama) => serverSecret(nk, SYSTEM_USER, 'sign');

/** Ziarno wytopu numer n (32 bity). */
export function seedOf(nk: nkruntime.Nakama, secret: string, n: number): number {
  return parseInt(nk.sha256Hash(secret + ':' + n).slice(0, 8), 16) >>> 0;
}

export const signItem = (nk: nkruntime.Nakama, key: string, it: Item) => nk.sha256Hash(key + '|' + itemCore(it)).slice(0, 24);

/** Losowość serwera (nieprzewidywalna dla gracza). */
export function serverRng(nk: nkruntime.Nakama): Rng {
  return mulberry32(parseInt(nk.sha256Hash(nk.uuidv4()).slice(0, 8), 16) >>> 0);
}

/** Zapis z kontrolą wersji: ponawia `fn`, gdy ktoś zmienił obiekt w międzyczasie. */
export function updateObject<T>(
  nk: nkruntime.Nakama, collection: string, key: string, userId: string,
  fn: (cur: T | null) => T | null, perm: { read: nkruntime.ReadPermissionValues; write: nkruntime.WritePermissionValues } = { read: 0, write: 0 },
): T | null {
  for (let i = 0; i < 6; i++) {
    const objs = nk.storageRead([{ collection, key, userId }]);
    const cur = objs.length ? (objs[0].value as T) : null;
    const next = fn(cur);
    if (next === null) return cur;
    try {
      nk.storageWrite([{
        collection, key, userId, value: next as unknown as { [k: string]: unknown },
        version: objs.length ? objs[0].version : '*', permissionRead: perm.read, permissionWrite: perm.write,
      }]);
      return next;
    } catch { /* konflikt wersji — spróbuj jeszcze raz */ }
  }
  throw err('Serwer jest zajęty, spróbuj za chwilę.', EXHAUSTED);
}

/** Najwyższe tempo testowe gry na tym serwerze (zmienna TEST_SPEED w .env; 1 = tryb testowy wyłączony). */
export function testSpeed(ctx: nkruntime.Context): number {
  const v = Math.floor(Number((ctx.env || {})['TEST_SPEED']));
  return Number.isFinite(v) && v > 1 ? Math.min(100, v) : 1;
}

/** Dzień według zegara serwera (UTC). */
export const serverDay = (now: number) => new Date(now).toISOString().slice(0, 10);

/** Etap, od którego liczą się nagrody w złocie: najdalszy etap kampanii, ale najwyżej 2 poziomy kuźni ponad gracza. */
export const goldStage = (st?: object | null): number => (st ? goldG(st as Pick<GameState, 'bestG' | 'forge'>) : 0);
