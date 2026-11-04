// Google Play: dane konta usługi do sprawdzania zakupów i ocena zakupu zwróconego przez Nakamę.
//
// Klucz konta usługi Google (plik JSON z Google Cloud) leży na serwerze w katalogu `sekrety/` obok docker-compose.yml;
// docker-compose podpina go do katalogu modułu (/nakama/data/modules/sekrety). Pliku nie ma w repozytorium.
// Bez pliku zakupy czekają (gra ich nie zamyka), a Google zwraca graczowi pieniądze za niepotwierdzony zakup po 3 dniach.

/** Nazwa pakietu aplikacji w Google Play (ta sama co appId w capacitor.config.ts). */
export const PLAY_PACKAGE = 'pl.kuznialegend.gra';
export const PLAY_KEY_FILE = 'sekrety/google-play.json';

export interface PlayCred { email: string; key: string }

/** Dane konta usługi z pliku albo null, gdy pliku nie ma lub jest niepoprawny. Czytane przy każdym zakupie (rzadko). */
export function playCredentials(nk: nkruntime.Nakama): PlayCred | null {
  let raw = '';
  try { raw = nk.fileRead(PLAY_KEY_FILE); } catch { return null; }
  try {
    const j = JSON.parse(raw) as { client_email?: unknown; private_key?: unknown };
    if (typeof j.client_email === 'string' && typeof j.private_key === 'string' && j.private_key.includes('PRIVATE KEY')) {
      return { email: j.client_email, key: j.private_key };
    }
  } catch { /* zły plik */ }
  return null;
}

/**
 * Potwierdzenie zakupu dla Nakamy. Serwer składa je sam z nazwy pakietu, produktu i tokenu zakupu — gra podaje
 * tylko token, więc nie podsunie zakupu z innej aplikacji ani tańszego produktu (Google sprawdza token dla tego produktu).
 */
export const playReceipt = (productId: string, token: string) => JSON.stringify({ packageName: PLAY_PACKAGE, productId, purchaseToken: token });

/**
 * Ocena zakupu: `ok` — zapłacony, można wydać pakiet; `pending` — płatność w toku (np. gotówką w sklepie);
 * `void` — anulowany albo zwrócony; `other` — zakup zgłosiło już inne konto; `none` — brak zakupu tego produktu.
 */
export type PurchaseVerdict = 'ok' | 'pending' | 'void' | 'other' | 'none';

export function purchaseVerdict(p: Pick<nkruntime.ValidatedPurchase, 'userId' | 'productId' | 'refundTime' | 'providerResponse'> | undefined, userId: string, productId: string): PurchaseVerdict {
  if (!p || p.productId !== productId) return 'none';
  if (p.userId && p.userId !== userId) return 'other';
  if (p.refundTime) return 'void';
  // Odpowiedź Google (ProductPurchase): purchaseState 0 — zakupiony, 1 — anulowany, 2 — oczekuje na płatność.
  let state = 0;
  try {
    const r = JSON.parse(p.providerResponse || '{}') as { purchaseState?: unknown };
    if (typeof r.purchaseState === 'number') state = r.purchaseState;
  } catch { /* brak szczegółów — Nakama i tak odrzuca niepoprawne zakupy */ }
  if (state === 2) return 'pending';
  return state === 0 ? 'ok' : 'void';
}
