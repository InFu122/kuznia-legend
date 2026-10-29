// Uwagi i błędy od testerów. Gracz wysyła je z Kodeksu (albo gra sama zgłasza błąd skryptu); serwer zapisuje je
// w kolekcji „feedback”. Adam czyta je przez feedback_list (wywołanie z kluczem http_key z .env) albo w konsoli Nakamy.
import { EXHAUSTED, INVALID, SYSTEM_USER, err, parse, updateObject, userOf } from './common';
import { nameOf } from './names';

const KINDS = ['uwaga', 'blad', 'auto'] as const;
type Kind = (typeof KINDS)[number];
/** Ile zgłoszeń dziennie z jednego konta (ochrona przed zalaniem). */
const DAILY: Record<Kind, number> = { uwaga: 10, blad: 10, auto: 20 };

interface Limit { day: string; n: Partial<Record<Kind, number>>; seen: string[] }

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

export function rpcFeedback(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const kind = (KINDS as readonly string[]).includes(req.kind as string) ? (req.kind as Kind) : 'uwaga';
  const text = str(req.text, kind === 'auto' ? 600 : 1000).trim();
  if (text.length < (kind === 'auto' ? 1 : 5)) throw err('Napisz kilka słów (co najmniej 5 znaków).', INVALID);
  const day = new Date().toISOString().slice(0, 10);
  const sig = kind + ':' + text.slice(0, 80);
  let refused = '';
  updateObject<Limit>(nk, 'feedback', 'limit', userId, cur => {
    const l: Limit = cur && cur.day === day ? cur : { day, n: {}, seen: [] };
    if ((l.n[kind] ?? 0) >= DAILY[kind]) { refused = 'limit'; return null; }
    if (kind === 'auto' && l.seen.includes(sig)) { refused = 'dup'; return null; } // ten sam błąd raz dziennie
    l.n[kind] = (l.n[kind] ?? 0) + 1;
    if (kind === 'auto') l.seen = [...l.seen, sig].slice(-30);
    return l;
  });
  if (refused === 'dup') return JSON.stringify({ ok: true, dup: true });
  if (refused) throw err('Na dziś to już dużo zgłoszeń — dziękujemy! Wróć jutro.', EXHAUSTED);
  const m = (req.meta && typeof req.meta === 'object' ? req.meta : {}) as Record<string, unknown>;
  const meta: Record<string, string | number> = {};
  for (const k of ['version', 'ua', 'screen', 'tab', 'forge', 'land', 'power', 'mode', 'url']) {
    const v = m[k];
    if (typeof v === 'number' && Number.isFinite(v)) meta[k] = v;
    else if (typeof v === 'string') meta[k] = v.slice(0, 200);
  }
  const now = Date.now();
  // Klucz malejący z czasem — lista zwraca od najnowszych.
  const key = String(1e13 - now).padStart(13, '0') + '_' + nk.uuidv4().slice(0, 8);
  nk.storageWrite([{
    collection: 'feedback', key, userId: SYSTEM_USER, permissionRead: 0, permissionWrite: 0,
    value: { t: now, kind, by: userId, name: nameOf(nk, userId), text, meta },
  }]);
  return JSON.stringify({ ok: true });
}

/**
 * Lista zgłoszeń (najnowsze pierwsze) — tylko z kluczem serwera, np. w przeglądarce:
 *   https://ADRES/v2/rpc/feedback_list?http_key=NAKAMA_HTTP_KEY&unwrap
 */
export function rpcFeedbackList(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  if (ctx.userId) throw err('Tylko dla administratora.', INVALID);
  const list = nk.storageList(SYSTEM_USER, 'feedback', 100);
  const rows = (list.objects ?? []).filter(o => o.key !== 'limit').map(o => {
    const v = o.value as { t: number; kind: string; name: string; text: string; meta: Record<string, unknown> };
    return { kiedy: new Date(v.t).toISOString().replace('T', ' ').slice(0, 16) + ' UTC', rodzaj: v.kind, kto: v.name ?? '(bez nicku)', tekst: v.text, szczegoly: v.meta };
  });
  return JSON.stringify({ zgloszenia: rows.length, lista: rows }, null, 1);
}
