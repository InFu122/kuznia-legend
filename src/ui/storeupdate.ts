// Aktualizacja z Google Play: w aplikacji zainstalowanej ze sklepu gra pyta Google Play, czy jest nowsza wersja,
// i pokazuje pasek „Nowa wersja w Google Play” z przyciskiem „Aktualizuj” — Google pobiera ją w grze
// (ekran aktualizacji Google, potem gra sama się uruchamia ponownie) albo otwiera stronę gry w sklepie.
// W aplikacji spoza sklepu (APK testowe z GitHub Actions) Google Play nic nie zwraca — wtedy paska nie ma.
import { isNative } from './pwa';

type Mod = typeof import('@capawesome/capacitor-app-update');

/** Co ile sprawdzać przy otwartej grze i po powrocie do niej. */
const CHECK_MS = 6 * 3600_000;
const RESUME_MS = 30 * 60_000;

let mod: Mod | null = null;
let available = false;
let immediate = false;
let lastCheck = 0;
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());

const load = async () => (mod ??= await import('@capawesome/capacitor-app-update'));

/** Google Play ma nowszą wersję niż zainstalowana. */
export const storeUpdateReady = () => available;
export function onStoreUpdate(f: () => void): () => void { subs.add(f); return () => subs.delete(f); }

/** Pyta Google Play o nowszą wersję. Zwraca: true — jest, false — nie ma, null — nie da się sprawdzić (np. APK testowe). */
export async function checkStoreUpdate(): Promise<boolean | null> {
  if (!isNative()) return null;
  lastCheck = Date.now();
  try {
    const m = await load();
    const r = await m.AppUpdate.getAppUpdateInfo();
    const now = r.updateAvailability === m.AppUpdateAvailability.UPDATE_AVAILABLE;
    immediate = !!r.immediateUpdateAllowed;
    if (now !== available) { available = now; notify(); }
    return now;
  } catch {
    return null; // aplikacja nie ze sklepu albo brak sieci
  }
}

/** „Aktualizuj”: aktualizacja w grze (ekran Google), a gdy się nie da albo gracz ją przerwie — strona gry w sklepie. */
export async function updateFromStore(): Promise<void> {
  const m = await load();
  if (immediate) {
    try {
      const r = await m.AppUpdate.performImmediateUpdate();
      if (r.code === m.AppUpdateResultCode.OK) return;
      if (r.code === m.AppUpdateResultCode.CANCELED) return; // gracz sam zrezygnował — pasek zostaje
    } catch { /* spróbujemy przez sklep */ }
  }
  await m.AppUpdate.openAppStore();
}

/** Wersja aplikacji na telefonie (jak w Google Play: nazwa i numer kompilacji) albo null poza aplikacją. */
export async function nativeVersion(): Promise<{ name: string; code: string } | null> {
  if (!isNative()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const i = await App.getInfo();
    return { name: i.version, code: i.build };
  } catch {
    return null;
  }
}

export function initStoreUpdate(): void {
  if (!isNative()) return;
  void checkStoreUpdate();
  setInterval(() => void checkStoreUpdate(), CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastCheck >= RESUME_MS) void checkStoreUpdate();
  });
}
