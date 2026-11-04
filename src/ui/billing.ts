// Płatności Google Play (tylko aplikacja z Google Play na Androidzie; wtyczka @capgo/native-purchases).
//
// Zakup: Google Play pobiera płatność → gra wysyła token zakupu do serwera (iap_google) → serwer sprawdza go
// u Google i wydaje pakiet → dopiero wtedy gra „zużywa” zakup (można kupić ten pakiet znowu). Jeśli coś przerwie
// drogę (brak sieci, zamknięta aplikacja), zakup zostaje niezużyty: gra ponawia go przy starcie i przy otwarciu
// sklepu (`recoverPurchases`). Zakupu niepotwierdzonego przez 3 dni Google sam zwraca graczowi pieniądze.
import { GEM_PACKS } from '../data';
import type { ServerLink, ShopResp } from '../save/server';
import { isNative } from './pwa';

type NP = typeof import('@capgo/native-purchases');

/** Błąd zakupu z opisem dla gracza (pokazywany wprost w sklepie). */
export class PlayError extends Error {}
let mod: Promise<NP | null> | null = null;

/** Czy ta wersja gry ma płatności Google Play (aplikacja z wtyczką). */
export const billingNative = () => isNative() && !!window.Capacitor?.isPluginAvailable?.('NativePurchases');

async function plugin(): Promise<NP | null> {
  if (!billingNative()) return null;
  mod ??= (async () => {
    const m = await import('@capgo/native-purchases');
    // Zakupy zamykamy sami — dopiero po potwierdzeniu przez serwer gry.
    await m.NativePurchases.configure({ autoFinishTransactions: false });
    const { isBillingSupported } = await m.NativePurchases.isBillingSupported();
    return isBillingSupported ? m : null;
  })().catch(e => {
    console.warn('Kuźnia Legend: Google Play —', e);
    mod = null;
    return null;
  });
  return mod;
}

/** Ceny pakietów w walucie gracza z Google Play (np. „22,99 zł”). Pusto, gdy sklep niedostępny. */
export async function storePrices(): Promise<Record<string, string>> {
  const m = await plugin();
  if (!m) return {};
  try {
    const { products } = await m.NativePurchases.getProducts({ productIdentifiers: GEM_PACKS.map(p => p.id), productType: m.PURCHASE_TYPE.INAPP });
    return Object.fromEntries(products.filter(p => p.priceString).map(p => [p.identifier, p.priceString]));
  } catch (e) {
    console.warn('Kuźnia Legend: ceny z Google Play —', e);
    return {};
  }
}

/** Serwer wydaje pakiet; gdy potwierdzi (`done`), zakup jest zużywany w Google Play. */
async function deliver(m: NP, link: ServerLink, id: string, token: string): Promise<ShopResp> {
  const r = await link.iapGoogle(id, token);
  if (r.done) await m.NativePurchases.consumePurchase({ purchaseToken: token }).catch(e => console.warn('Kuźnia Legend: zużycie zakupu —', e));
  return r;
}

export type BuyResult = { k: 'ok'; r: ShopResp } | { k: 'pending' } | { k: 'cancel' };

/** Zakup pakietu Klejnotów. Błąd (np. brak sieci) — wyjątek z opisem dla gracza. */
export async function buyPack(link: ServerLink, id: string): Promise<BuyResult> {
  const m = await plugin();
  if (!m) throw new PlayError('Płatności Google Play nie działają na tym urządzeniu.');
  let t: Awaited<ReturnType<NP['NativePurchases']['purchaseProduct']>>;
  try {
    t = await m.NativePurchases.purchaseProduct({
      productIdentifier: id, productType: m.PURCHASE_TYPE.INAPP, isConsumable: false, autoAcknowledgePurchases: false,
    });
  } catch (e) {
    const code = String((e as { code?: unknown }).code ?? '');
    const msg = String((e as Error).message ?? e);
    if (code === 'USER_CANCELED') return { k: 'cancel' };
    if (/pending/i.test(msg)) return { k: 'pending' };
    if (code === 'ITEM_ALREADY_OWNED') {
      // Poprzedni zakup tego pakietu czeka na wydanie — dokończ go.
      const done = await recoverPurchases(link);
      if (done.length) return { k: 'ok', r: done[done.length - 1] };
      throw new PlayError('Poprzedni zakup tego pakietu jeszcze czeka na serwer — spróbuj za chwilę.');
    }
    if (code === 'BILLING_UNAVAILABLE' || code === 'SERVICE_UNAVAILABLE' || code === 'SERVICE_DISCONNECTED' || code === 'NETWORK_ERROR') {
      throw new PlayError('Google Play jest teraz niedostępny — sprawdź internet i konto Google w Sklepie Play.');
    }
    if (code === 'ITEM_UNAVAILABLE' || /not found/i.test(msg)) throw new PlayError('Ten pakiet nie jest jeszcze dostępny w Google Play.');
    throw new PlayError('Zakup nie doszedł do skutku.');
  }
  if (t.purchaseState !== '1' || !t.purchaseToken) return { k: 'pending' };
  return { k: 'ok', r: await deliver(m, link, id, t.purchaseToken) };
}

/** Dokańcza zakupy, które zapłacono, ale gra nie zdążyła ich wydać. Zwraca odpowiedzi serwera dla wydanych. */
export async function recoverPurchases(link: ServerLink): Promise<ShopResp[]> {
  const m = await plugin();
  if (!m || !link.online) return [];
  let list: { productIdentifier: string; purchaseToken?: string; purchaseState?: string }[] = [];
  try {
    list = (await m.NativePurchases.getUnfinishedTransactions()).transactions;
  } catch (e) {
    console.warn('Kuźnia Legend: niedokończone zakupy —', e);
    return [];
  }
  const out: ShopResp[] = [];
  for (const t of list) {
    if (!t.purchaseToken || !GEM_PACKS.some(p => p.id === t.productIdentifier)) continue;
    try {
      const r = await deliver(m, link, t.productIdentifier, t.purchaseToken);
      if (r.done) out.push(r);
    } catch (e) {
      console.warn('Kuźnia Legend: zakup czeka —', e);
    }
  }
  return out;
}
