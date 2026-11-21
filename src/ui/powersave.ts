// Ekran w czasie gry: nie gaśnie i telefon się nie blokuje (Keep Awake), a po chwili bez dotyku gra przechodzi
// w tryb oszczędzania — przyciemnia się (w aplikacji także podświetlenie ekranu), ale dalej widać, jak bohater
// walczy i kuźnia kuje. Dotknięcie przywraca jasność. Oba ustawienia są w Kodeksie (Ekran nie gaśnie, Oszczędzanie).
// Blokada (Menu → Zablokuj ekran): to samo przyciemnienie, ale dotyk nic nie robi — odblokowuje przesunięcie palcem,
// więc telefon w kieszeni niczego nie kliknie.
import { isNative } from './pwa';

/** Po ilu ms bez dotyku gra się przyciemnia. */
export const DIM_AFTER_MS = 60_000;
/** Podświetlenie ekranu w trybie oszczędzania (tylko aplikacja; 0 — najciemniej, 1 — najjaśniej). */
export const DIM_BACKLIGHT = 0.12;

/**
 * Licznik bezczynności: `poke()` przy każdym dotyku liczy czas od nowa; po `ms` bez dotyku woła `onIdle`.
 * `hold(true)` wstrzymuje przyciemnianie (np. na czas reklamy), `hold(false)` liczy od nowa.
 */
export class Idle {
  private t: ReturnType<typeof setTimeout> | null = null;
  private held = 0;
  private live = false;
  constructor(private ms: number, private onIdle: () => void) {}
  start() { this.live = true; this.poke(); }
  stop() { this.live = false; this.clear(); }
  poke() {
    this.clear();
    if (!this.live || this.held > 0) return;
    this.t = setTimeout(() => { this.t = null; if (this.live && this.held === 0) this.onIdle(); }, this.ms);
  }
  hold(on: boolean) {
    this.held = Math.max(0, this.held + (on ? 1 : -1));
    this.poke();
  }
  get armed() { return this.t !== null; }
  private clear() { if (this.t) clearTimeout(this.t); this.t = null; }
}

/** Wspólny licznik — reklamy wstrzymują przez niego przyciemnianie. */
let current: Idle | null = null;
export const setIdle = (i: Idle | null) => { current = i; };
/** Wstrzymuje przyciemnianie (reklama na cały ekran); `false` — liczy od nowa. */
export const holdDim = (on: boolean) => current?.hold(on);

/* ---------- blokada ekranu ---------- */
let locked = false;
const lockSubs = new Set<() => void>();
export const screenLocked = () => locked;
export function onLock(f: () => void): () => void { lockSubs.add(f); return () => lockSubs.delete(f); }
/** Włącza (albo zdejmuje) blokadę ekranu w grze. */
export function lockScreen(on = true): void {
  if (locked === on) return;
  locked = on;
  lockSubs.forEach(f => f());
}
/** Ile trzeba przesunąć suwak (część drogi), żeby odblokować. */
export const UNLOCK_AT = 0.85;

let awake: boolean | null = null;
/** Ekran nie gaśnie, dopóki gra jest na wierzchu (`false` — telefon gasi ekran jak zwykle). */
export async function keepAwake(on: boolean): Promise<void> {
  if (awake === on) return;
  awake = on;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    if (!(await KeepAwake.isSupported()).isSupported) return;
    await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
  } catch { /* przeglądarka bez Wake Lock albo artefakt w ramce — ekran gaśnie jak zwykle */ }
}

/** Podświetlenie w aplikacji: przyciemnione albo takie, jak ustawił gracz w telefonie. */
export async function backlight(dim: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    const { ScreenBrightness } = await import('@capacitor-community/screen-brightness');
    await ScreenBrightness.setBrightness({ brightness: dim ? DIM_BACKLIGHT : -1 });
  } catch { /* bez zmiany podświetlenia — zostaje samo przyciemnienie obrazu */ }
}
