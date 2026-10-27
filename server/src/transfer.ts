// Przenoszenie konta na inne urządzenie: stare urządzenie pokazuje jednorazowy kod (ważny 10 minut),
// nowe wpisuje go i od tej chwili oba urządzenia logują się na to samo konto.
import { leaveArena } from './arena';
import { EXHAUSTED, INVALID, SYSTEM_USER, err, parse, updateObject, userOf } from './common';
import { BOARDS, type BoardId } from './ranking';

export const CODE_TTL_MS = 10 * 60000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez 0/O i 1/I
const CODE_LEN = 8;
const MAX_TRIES = 10;
const TRIES_WINDOW_MS = 60 * 60000;

interface CodeEntry { u: string; exp: number }
interface Tries { n: number; t: number }

/** Kod w postaci „ABCD-EFGH” → „ABCDEFGH” (wielkie litery, bez spacji i myślników). */
export const normCode = (s: unknown) => (typeof s === 'string' ? s.toUpperCase().replace(/[^A-Z0-9]/g, '') : '');

function newCode(nk: nkruntime.Nakama): string {
  const h = nk.sha256Hash(nk.uuidv4());
  let c = '';
  for (let i = 0; i < CODE_LEN; i++) c += CODE_ALPHABET[parseInt(h.slice(i * 2, i * 2 + 2), 16) % CODE_ALPHABET.length];
  return c;
}

/** Nowy kod przeniesienia (poprzedni kod tego konta przestaje działać). */
export function rpcTransferCode(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const exp = Date.now() + CODE_TTL_MS;
  const mine = nk.storageRead([{ collection: 'transfer', key: 'mine', userId }]);
  if (mine.length && mine[0].value.code) nk.storageDelete([{ collection: 'transfer', key: String(mine[0].value.code), userId: SYSTEM_USER }]);
  let code = '';
  for (let i = 0; i < 5 && !code; i++) {
    const c = newCode(nk);
    try {
      nk.storageWrite([{ collection: 'transfer', key: c, userId: SYSTEM_USER, value: { u: userId, exp }, version: '*', permissionRead: 0, permissionWrite: 0 }]);
      code = c;
    } catch { /* taki kod już jest — losuj dalej */ }
  }
  if (!code) throw err('Nie udało się utworzyć kodu, spróbuj ponownie.', EXHAUSTED);
  nk.storageWrite([{ collection: 'transfer', key: 'mine', userId, value: { code, exp }, permissionRead: 0, permissionWrite: 0 }]);
  return JSON.stringify({ code, exp, serverTime: Date.now() });
}

/**
 * Nowe urządzenie wpisuje kod i podaje swój nowy identyfikator. Serwer dołącza ten identyfikator do konta z kodu;
 * dotychczasowe konto tego urządzenia znika z rankingów i areny (zapis zostaje w bazie).
 */
export function rpcTransferRedeem(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const now = Date.now();
  const device = typeof req.device === 'string' ? req.device : '';
  if (!/^kl-[A-Za-z0-9-]{8,100}$/.test(device)) throw err('Zły identyfikator urządzenia.', INVALID);

  // Ograniczenie prób, żeby nie dało się zgadywać kodów.
  updateObject<Tries>(nk, 'transfer', 'tries', userId, cur => {
    const t = cur && now - cur.t < TRIES_WINDOW_MS ? cur : { n: 0, t: now };
    if (t.n >= MAX_TRIES) throw err('Za dużo prób — spróbuj za godzinę.', EXHAUSTED);
    return { n: t.n + 1, t: t.t };
  });

  const code = normCode(req.code);
  const objs = code.length === CODE_LEN ? nk.storageRead([{ collection: 'transfer', key: code, userId: SYSTEM_USER }]) : [];
  const entry = objs.length ? (objs[0].value as CodeEntry) : null;
  if (!entry || entry.exp < now) throw err('Kod jest nieprawidłowy albo wygasł. Wygeneruj nowy na drugim urządzeniu.', INVALID);
  if (entry.u === userId) throw err('To kod tego samego konta — wpisz go na innym urządzeniu.', INVALID);

  nk.linkDevice(entry.u, device);
  nk.storageDelete([
    { collection: 'transfer', key: code, userId: SYSTEM_USER },
    { collection: 'transfer', key: 'mine', userId: entry.u },
  ]);
  // Dotychczasowe konto tego urządzenia nie będzie już używane.
  for (const id of Object.keys(BOARDS) as BoardId[]) {
    try { nk.leaderboardRecordDelete(id, userId); } catch { /* brak wyniku */ }
  }
  leaveArena(nk, userId);
  nk.storageDelete([{ collection: 'transfer', key: 'tries', userId }]);
  logger.info('Przeniesienie konta: urządzenie konta %s dołączone do konta %s', userId, entry.u);
  return JSON.stringify({ ok: true, serverTime: now });
}
