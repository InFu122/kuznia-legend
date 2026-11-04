// Reklamy z nagrodą (tylko aplikacja na Androida; wtyczka @capacitor-community/admob z Google UMP do zgód RODO).
//
// W przeglądarce i w artefakcie zostaje reklama testowa (odliczanie w Shop.tsx). W aplikacji bez prawdziwej
// jednostki reklamowej (VITE_ADMOB_REWARDED) Google pokazuje swoje reklamy testowe — tak jest w APK dla znajomych.
// Zgoda: przed pierwszą reklamą gra pyta Google UMP, czy gracz w UE musi wyrazić zgodę; jeśli tak — pokazuje
// formularz zgody (treść ustawiasz w AdMob → Prywatność i wiadomości). Zmiana decyzji: Kodeks → Prywatność reklam.
import { isNative } from './pwa';
import { holdMusic } from './music';

type AM = typeof import('@capacitor-community/admob');

/** Przykładowa jednostka Google „reklama z nagrodą” — zawsze pokazuje reklamę testową. */
const TEST_UNIT = 'ca-app-pub-3940256099942544/5224354917';
const UNIT = (import.meta.env.VITE_ADMOB_REWARDED as string | undefined) || TEST_UNIT;

let mod: Promise<AM | null> | null = null;
let consentAsked = false;

/** Czy gra pokazuje prawdziwe reklamy (aplikacja z wtyczką AdMob). */
export const adsNative = () => isNative() && !!window.Capacitor?.isPluginAvailable?.('AdMob');

async function admob(): Promise<AM | null> {
  if (!adsNative()) return null;
  mod ??= (async () => {
    const m = await import('@capacitor-community/admob');
    await m.AdMob.initialize({});
    return m;
  })().catch(e => {
    console.warn('Kuźnia Legend: AdMob —', e);
    mod = null;
    return null;
  });
  return mod;
}

/** Zgoda na reklamy (RODO). Formularz pokazuje się tylko, gdy Google go wymaga i gracz jeszcze nie zdecydował. */
async function consent(m: AM): Promise<boolean> {
  const info = await m.AdMob.requestConsentInfo();
  if (!consentAsked && info.isConsentFormAvailable && info.status === m.AdmobConsentStatus.REQUIRED) {
    consentAsked = true;
    return (await m.AdMob.showConsentForm()).canRequestAds;
  }
  return info.canRequestAds;
}

export type AdResult = 'ok' | 'cancel' | 'fail';

/** Ładuje i pokazuje reklamę z nagrodą. `ok` — gracz obejrzał do końca (nagroda), `cancel` — zamknął wcześniej. */
export async function showRewarded(): Promise<AdResult> {
  const m = await admob();
  if (!m) return 'fail';
  try {
    if (!(await consent(m))) return 'fail';
    await m.AdMob.prepareRewardVideoAd({ adId: UNIT, isTesting: UNIT === TEST_UNIT });
  } catch (e) {
    console.warn('Kuźnia Legend: reklama się nie wczytała —', e);
    return 'fail';
  }
  const E = m.RewardAdPluginEvents;
  return new Promise<AdResult>(resolve => {
    let earned = false;
    let finished = false;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const finish = (r: AdResult) => {
      if (finished) return;
      finished = true;
      holdMusic(false);
      for (const h of handles) void h.then(x => x.remove()).catch(() => {});
      resolve(r);
    };
    handles.push(m.AdMob.addListener(E.Rewarded, () => { earned = true; }));
    handles.push(m.AdMob.addListener(E.Dismissed, () => finish(earned ? 'ok' : 'cancel')));
    handles.push(m.AdMob.addListener(E.FailedToShow, () => finish('fail')));
    holdMusic(true);
    m.AdMob.showRewardVideoAd().then(() => { earned = true; }, () => finish('fail'));
  });
}

/** Czy pokazać przycisk „Prywatność reklam” (gracz z UE może zmienić zgodę). */
export async function privacyOptionsNeeded(): Promise<boolean> {
  const m = await admob();
  if (!m) return false;
  try {
    const info = await m.AdMob.requestConsentInfo();
    return String(info.privacyOptionsRequirementStatus) === 'REQUIRED'; // (wyliczenie nie jest eksportowane z wtyczki)
  } catch {
    return false;
  }
}

/** Formularz Google do zmiany zgody na reklamy. */
export async function showPrivacyOptions(): Promise<void> {
  const m = await admob();
  if (m) await m.AdMob.showPrivacyOptionsForm();
}
