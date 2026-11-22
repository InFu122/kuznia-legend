// Logowanie przez Google. Telefon pobiera od Google token tożsamości (Credential Manager), serwer sprawdza go u Google
// i zapamiętuje, które konto gry należy do tego konta Google. Na nowym telefonie to samo konto Google przenosi tam
// postęp — tak jak kod przeniesienia, tylko bez kodu. Logowanie jest dobrowolne: konto gościa działa jak dotąd.
import { leaveArena } from './arena';
import { leaveClan } from './clan';
import { releaseName } from './names';
import { BOARDS, type BoardId } from './ranking';
import { INVALID, NOT_FOUND, PRECONDITION, SYSTEM_USER, err, parse, readSave, userOf } from './common';

/** Klient OAuth „Aplikacja internetowa” z Google Cloud. Jawny — token musi być wystawiony właśnie dla niego. */
export const GOOGLE_CLIENT_ID = '938097614064-ku6cvjo4fao8fvav0u8cs0elfsstih86.apps.googleusercontent.com';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const COLL = 'google';
const UNAVAILABLE = 14 as nkruntime.Codes; // HTTP 503

interface Claims { sub?: unknown; aud?: unknown; iss?: unknown; exp?: unknown }

/** Identyfikator konta Google z danych tokenu — tylko gdy token jest dla tej gry, od Google i jeszcze ważny. */
export function googleSub(c: Claims, nowMs: number): string | null {
  if (c.aud !== GOOGLE_CLIENT_ID) return null;
  if (typeof c.iss !== 'string' || !ISSUERS.includes(c.iss)) return null;
  const exp = Number(c.exp);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return null;
  return typeof c.sub === 'string' && /^\d{5,40}$/.test(c.sub) ? c.sub : null;
}

/** Sprawdza token u Google (podpis i ważność sprawdza Google, odbiorcę i wystawcę — my). Zwraca identyfikator konta Google. */
export function verifyGoogle(nk: nkruntime.Nakama, token: unknown): string {
  if (typeof token !== 'string' || token.length < 100 || token.length > 4096 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
    throw err('Zły token Google.', INVALID);
  }
  let res: nkruntime.HttpResponse;
  try {
    res = nk.httpRequest('https://oauth2.googleapis.com/tokeninfo?id_token=' + token, 'get', {}, undefined, 8000);
  } catch {
    throw err('Google nie odpowiada — spróbuj za chwilę.', UNAVAILABLE);
  }
  let claims: Claims = {};
  try { claims = JSON.parse(res.body) as Claims; } catch { /* zostaje puste — odrzucone niżej */ }
  const sub = res.code === 200 ? googleSub(claims, Date.now()) : null;
  if (!sub) throw err('Logowanie przez Google nie powiodło się — spróbuj ponownie.', INVALID);
  return sub;
}

/** Konto gry połączone z tym kontem Google (albo null). */
export function googleOwner(nk: nkruntime.Nakama, sub: string): string | null {
  const o = nk.storageRead([{ collection: COLL, key: sub, userId: SYSTEM_USER }]);
  return o.length ? String((o[0].value as { u?: string }).u || '') || null : null;
}

/** Konto Google, z którym jest połączone to konto gry (albo null). */
export function googleOf(nk: nkruntime.Nakama, userId: string): string | null {
  const o = nk.storageRead([{ collection: COLL, key: 'mine', userId }]);
  return o.length ? String((o[0].value as { sub?: string }).sub || '') || null : null;
}

/** Usuwa połączenie z Google (przy usuwaniu konta). */
export function googleForget(nk: nkruntime.Nakama, userId: string): void {
  const sub = googleOf(nk, userId);
  if (sub && googleOwner(nk, sub) === userId) nk.storageDelete([{ collection: COLL, key: sub, userId: SYSTEM_USER }]);
  nk.storageDelete([{ collection: COLL, key: 'mine', userId }]);
}

/**
 * Urządzenie przeszło na inne konto. Dotychczasowe znika z rankingów, areny i klanu, a nick się zwalnia (zapis zostaje
 * w bazie) — chyba że jest połączone z Google: wtedy gracz może do niego wrócić tamtym kontem Google, więc zostaje jak jest.
 */
export function abandonAccount(nk: nkruntime.Nakama, userId: string, username: string): boolean {
  if (googleOf(nk, userId)) return false;
  for (const id of Object.keys(BOARDS) as BoardId[]) {
    try { nk.leaderboardRecordDelete(id, userId); } catch { /* brak wyniku */ }
  }
  leaveArena(nk, userId);
  leaveClan(nk, userId, username);
  releaseName(nk, userId);
  return true;
}

/**
 * Łączy konto gry z kontem Google. Gdy to konto Google ma już innego kowala, nic nie zmienia i zwraca, kim on jest —
 * gracz decyduje, czy go wczytać (google_switch).
 */
export function rpcGoogleLink(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const sub = verifyGoogle(nk, parse(payload).token);
  const now = Date.now();
  const owner = googleOwner(nk, sub);
  if (owner === userId) return JSON.stringify({ linked: true, google: true, serverTime: now });
  if (owner) {
    const st = readSave(nk, owner)?.value.state;
    return JSON.stringify({ conflict: true, other: { name: st?.name ?? '', forge: st?.forge?.lvl ?? 0 }, serverTime: now });
  }
  const mine = googleOf(nk, userId);
  if (mine && mine !== sub) throw err('To konto gry jest już połączone z innym kontem Google.', PRECONDITION);
  try {
    nk.storageWrite([{ collection: COLL, key: sub, userId: SYSTEM_USER, value: { u: userId, t: now }, version: '*', permissionRead: 0, permissionWrite: 0 }]);
  } catch {
    throw err('Spróbuj jeszcze raz.', PRECONDITION); // ktoś w tej samej chwili połączył to konto Google
  }
  nk.storageWrite([{ collection: COLL, key: 'mine', userId, value: { sub, t: now }, permissionRead: 0, permissionWrite: 0 }]);
  logger.info('Konto %s połączone z Google', userId);
  return JSON.stringify({ linked: true, google: true, serverTime: now });
}

/**
 * Wczytuje kowala z konta Google na tym urządzeniu: nowy identyfikator urządzenia dołącza do tamtego konta (jak przy kodzie
 * przeniesienia), a gra loguje się na nie od nowa.
 */
export function rpcGoogleSwitch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const device = typeof req.device === 'string' ? req.device : '';
  if (!/^kl-[A-Za-z0-9-]{8,100}$/.test(device)) throw err('Zły identyfikator urządzenia.', INVALID);
  const sub = verifyGoogle(nk, req.token);
  const owner = googleOwner(nk, sub);
  if (!owner) throw err('To konto Google nie ma jeszcze kowala. Zacznij grę tutaj, a potem połącz ją z Google w Kodeksie.', NOT_FOUND);
  if (owner === userId) throw err('Już grasz kowalem z tego konta Google.', INVALID);
  nk.linkDevice(owner, device);
  const left = abandonAccount(nk, userId, ctx.username ?? '');
  logger.info('Logowanie Google: urządzenie konta %s dołączone do konta %s%s', userId, owner, left ? '' : ' (stare konto zostaje — ma własne Google)');
  return JSON.stringify({ ok: true, google: true, serverTime: Date.now() });
}
