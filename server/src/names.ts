// Nicki graczy: unikalne na serwerze (bez względu na wielkość liter i polskie znaki), nadawane nowym
// graczom automatycznie, zmieniane w Kodeksie. Rejestr: kolekcja „names” użytkownika systemowego,
// klucz = nick sprowadzony do liter i cyfr; przy koncie gracza — jego obecny nick i czas ostatniej zmiany.
import { FAKE_PLAYERS } from '../../src/data';
import { pick, ri } from '../../src/engine/rng';
import { EXHAUSTED, INVALID, PRECONDITION, SYSTEM_USER, err, parse, serverRng, userOf } from './common';
import { fold, nameClean } from './filter';

export const NAME_MIN = 3;
export const NAME_MAX = 16;
/** Zmiana nicku najwyżej raz na dobę (pierwsza zmiana wygenerowanego nicku — od razu). */
export const RENAME_COOLDOWN_MS = 24 * 3600000;
const NAME_CHARS = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż _.\-]+$/;
const RESERVED = ['kowal', 'duch', 'admin', 'administrator', 'moderator', 'mod', 'system', 'serwer', 'kuznialegend', 'gm', ...FAKE_PLAYERS];
const NOUNS = ['Iskra', 'Młot', 'Kowadło', 'Miech', 'Żar', 'Stal', 'Ruda', 'Grot', 'Hart', 'Ogień', 'Kleszcze', 'Topór'];

interface Mine { n: string; key: string; t: number; gen: boolean }

/** Klucz w rejestrze: „Łukasz_K.” i „lukaszk” to ten sam nick. */
export const nameKey = (n: string) => fold(n).replace(/[^a-z0-9]/g, '');

/** Porządkuje nick: bez nadmiarowych spacji. */
export const tidyName = (n: unknown) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim() : '');

/** Opis problemu z nickiem albo null, gdy nick można nadać. */
export function nickProblem(n: string): string | null {
  if (n.length < NAME_MIN || n.length > NAME_MAX) return `Nick musi mieć od ${NAME_MIN} do ${NAME_MAX} znaków.`;
  if (!NAME_CHARS.test(n)) return 'Nick może zawierać litery, cyfry, spację oraz znaki _ . -';
  if (!/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(n)) return 'Nick musi zawierać co najmniej jedną literę.';
  const key = nameKey(n);
  if (key.length < 2) return 'Nick jest za krótki.';
  if (RESERVED.some(r => nameKey(r) === key)) return 'Tego nicku nie można użyć.';
  if (!nameClean(n)) return 'Ten nick zawiera niedozwolone słowo.';
  return null;
}

function readMine(nk: nkruntime.Nakama, userId: string): Mine | null {
  const o = nk.storageRead([{ collection: 'names', key: 'mine', userId }]);
  return o.length ? (o[0].value as Mine) : null;
}

/** Zajmuje nick w rejestrze. Zwraca false, gdy należy do kogoś innego. */
function claim(nk: nkruntime.Nakama, userId: string, n: string): boolean {
  const key = nameKey(n);
  const o = nk.storageRead([{ collection: 'names', key, userId: SYSTEM_USER }]);
  if (o.length && o[0].value.u !== userId) return false;
  try {
    nk.storageWrite([{
      collection: 'names', key, userId: SYSTEM_USER, value: { u: userId, n },
      version: o.length ? o[0].version : '*', permissionRead: 0, permissionWrite: 0,
    }]);
    return true;
  } catch {
    return false; // ktoś zajął go w tej samej chwili
  }
}

function setMine(nk: nkruntime.Nakama, userId: string, mine: Mine): void {
  nk.storageWrite([{ collection: 'names', key: 'mine', userId, value: mine as unknown as { [k: string]: unknown }, permissionRead: 0, permissionWrite: 0 }]);
  nk.accountUpdateId(userId, null, mine.n);
}

/** Wolny nick w stylu „Iskra_4821”. */
function generate(nk: nkruntime.Nakama, userId: string): string {
  const rng = serverRng(nk);
  for (let i = 0; i < 30; i++) {
    const n = `${pick(rng, NOUNS)}_${ri(rng, i < 20 ? 100 : 10000, i < 20 ? 9999 : 99999)}`;
    if (claim(nk, userId, n)) return n;
  }
  throw err('Nie udało się nadać nicku, spróbuj ponownie.', EXHAUSTED);
}

/**
 * Nick gracza według serwera. Przy pierwszym zapisie: obecne imię z gry, jeśli jest wolne i poprawne,
 * a w przeciwnym razie wygenerowany nick. Potem nick zmienia już tylko `name_set`.
 */
export function ensureName(nk: nkruntime.Nakama, userId: string, wanted: string): { name: string; fresh: boolean } {
  const mine = readMine(nk, userId);
  if (mine) return { name: mine.n, fresh: false };
  const n = tidyName(wanted);
  let name: string;
  let gen = false;
  if (!nickProblem(n) && claim(nk, userId, n)) name = n;
  else { name = generate(nk, userId); gen = true; }
  setMine(nk, userId, { n: name, key: nameKey(name), t: 0, gen });
  return { name, fresh: true };
}

/** Obecny nick gracza (albo null, gdy jeszcze nie zapisał gry na serwerze). */
export const nameOf = (nk: nkruntime.Nakama, userId: string) => readMine(nk, userId)?.n ?? null;

/** Zwalnia nick (np. konto porzucone po przeniesieniu na inne urządzenie). */
export function releaseName(nk: nkruntime.Nakama, userId: string): void {
  const mine = readMine(nk, userId);
  if (!mine) return;
  nk.storageDelete([{ collection: 'names', key: mine.key, userId: SYSTEM_USER }, { collection: 'names', key: 'mine', userId }]);
}

/** Zmiana nicku: unikalny, bez wulgaryzmów, najwyżej raz na dobę. */
export function rpcNameSet(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const n = tidyName(parse(payload).name);
  const problem = nickProblem(n);
  if (problem) throw err(problem, INVALID);
  const mine = readMine(nk, userId);
  if (!mine) throw err('Najpierw zapisz grę na serwerze.', PRECONDITION);
  const now = Date.now();
  if (mine.n === n) return JSON.stringify({ name: n, next: mine.t + RENAME_COOLDOWN_MS, serverTime: now });
  if (!mine.gen && now - mine.t < RENAME_COOLDOWN_MS) {
    const h = Math.ceil((mine.t + RENAME_COOLDOWN_MS - now) / 3600000);
    throw err(`Nick możesz zmienić raz na dobę — spróbuj za ${h} h.`, PRECONDITION);
  }
  const key = nameKey(n);
  if (!claim(nk, userId, n)) throw err('Ten nick jest zajęty.', INVALID);
  if (key !== mine.key) nk.storageDelete([{ collection: 'names', key: mine.key, userId: SYSTEM_USER }]);
  setMine(nk, userId, { n, key, t: now, gen: false });
  return JSON.stringify({ name: n, next: now + RENAME_COOLDOWN_MS, serverTime: now });
}
