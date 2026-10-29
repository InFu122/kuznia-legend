// Gra jako aplikacja z przeglądarki (PWA): service worker (działa bez internetu), instalacja na ekranie
// głównym i sprawdzanie, czy serwer ma nowszą wersję gry. Nie dotyczy artefaktu claude.ai ani aplikacji Capacitor.

export const APP_VERSION = __APP_VERSION__;
const CHECK_MS = 10 * 60000;

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let installEvt: InstallPrompt | null = null;
let updateReady = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());

/** Aplikacja na telefon (Capacitor) — tam gra jest w paczce i nie potrzebuje service workera. */
export const isNative = () => !!window.Capacitor?.isNativePlatform?.();
/** Gra uruchomiona z ekranu głównego (zainstalowana). */
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Czy to „prawdziwa” strona gry (nasz serwer), a nie artefakt, podgląd czy aplikacja. */
function webApp(): boolean {
  if (import.meta.env.DEV || import.meta.env.MODE === 'single' || isNative()) return false;
  if (window.top !== window.self) return false;
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

export const canInstall = () => !!installEvt;
export const hasUpdate = () => updateReady;
export function onPwa(f: () => void): () => void { subs.add(f); return () => subs.delete(f); }

export async function install(): Promise<boolean> {
  if (!installEvt) return false;
  await installEvt.prompt();
  const r = await installEvt.userChoice.catch(() => ({ outcome: 'dismissed' }));
  installEvt = null;
  notify();
  return r.outcome === 'accepted';
}

async function checkVersion() {
  try {
    const r = await fetch('version.json', { cache: 'no-store' });
    if (!r.ok) return;
    const v = (await r.json()) as { id?: string };
    if (v.id && v.id !== __BUILD_ID__ && !updateReady) { updateReady = true; notify(); }
  } catch { /* bez sieci — sprawdzimy później */ }
}

export function initPwa(): void {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e as InstallPrompt; notify(); });
  window.addEventListener('appinstalled', () => { installEvt = null; notify(); });
  if (!webApp()) return;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.warn('Kuźnia Legend: service worker —', e));
  setInterval(() => void checkVersion(), CHECK_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkVersion(); });
}
