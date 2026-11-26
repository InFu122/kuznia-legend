// Tylko w aplikacji na telefon (Capacitor): lokalne powiadomienia i przycisk „wstecz” Androida.
// Powiadomienia planuje sam telefon, gdy gra schodzi w tło — serwer nie jest do tego potrzebny:
// koniec ulepszenia kuźni, koniec badania, wyklucie jaja, limit nagród za nieobecność i (rano) prezent dnia w sklepie. W ustawieniach: stan zgody
// telefonu i próbne powiadomienie.
import { TECH, landDef } from '../data';
import type { Game } from '../engine/game';
import { offlineCapMs } from '../engine/offline';
import { utcDay } from '../engine/shop';
import { itemLevelFor } from '../engine/formulas';
import { isNative, isStandalone } from './pwa';
import { EXIT_WINDOW_MS } from './back';
import { toast } from '../engine/context';
import { flushSave } from '../save/server';
import { registerPlugin } from '@capacitor/core';

type LNMod = typeof import('@capacitor/local-notifications');
type LN = LNMod['LocalNotifications'];
let mod: LNMod | null = null;
const ASKED = 'kl-notify-asked';

/** Co i kiedy przypomnieć (ms od teraz, w czasie rzeczywistym — z tempem testowym krócej). */
/** Godzina przypomnienia o prezencie dnia (czas telefonu). */
const GIFT_HOUR = 9;

export function upcoming(game: Game): { id: number; at: number; title: string; body: string }[] {
  const s = game.s;
  const sp = Math.max(1, s.speed || 1);
  const out: { id: number; at: number; title: string; body: string }[] = [];
  // Treści: krótko i konkretnie, co się stało; bez ponaglania i bez długich myślników.
  if (s.forge.up && s.forge.left > 0) out.push({ id: 1, at: s.forge.left / sp, title: 'Kuźnia ulepszona', body: `Kuźnia ma teraz ${s.forge.up}. poziom. Od teraz wykuwasz mocniejsze przedmioty, od ${itemLevelFor(s.forge.up, 0)}. do ${itemLevelFor(s.forge.up, 2)}. poziomu.` });
  if (s.tech.cur && s.tech.cur.left > 0) out.push({ id: 2, at: s.tech.cur.left / sp, title: 'Badanie ukończone', body: `${TECH[s.tech.cur.id].n} ma teraz ${(s.tech.lv[s.tech.cur.id] ?? 0) + 1}. poziom. Akademia czeka na kolejne badanie.` });
  if (s.hatch && s.hatch.left > 0) out.push({ id: 3, at: s.hatch.left / sp, title: 'Jajo się wykluło', body: 'Nowy chowaniec jest w zakładce Bohater.' });
  const cap = offlineCapMs(s);
  out.push({ id: 4, at: cap, title: 'Łupy za nieobecność są pełne', body: `Bohater zebrał limit łupów w krainie ${landDef(s.cur.land).n}. Odbierzesz je po powrocie do gry.` });
  // Prezent dnia w sklepie: nowy jest od północy UTC (w Polsce 1:00 albo 2:00), ale przypomnienie dopiero rano, o 9:00
  // na zegarze telefonu. Gdy dzisiejszy jest już odebrany, dopiero następnego dnia.
  if (game.unlocked('sklep')) {
    const now = Date.now();
    const t = new Date(now);
    t.setHours(GIFT_HOUR, 0, 0, 0);
    if (t.getTime() <= now + 60000) t.setDate(t.getDate() + 1);
    if (s.shop?.gift && s.shop.gift === utcDay(t.getTime())) t.setDate(t.getDate() + 1);
    out.push({ id: 5, at: t.getTime() - now, title: 'Prezent w sklepie', body: 'Darmowy prezent dnia czeka w sklepie: złoto i ruda.' });
  }
  return out.filter(n => n.at > 30000);
}

/**
 * Wtyczka powiadomień opakowana w obiekt. Sam obiekt wtyczki Capacitora „ma” każdą metodę — także `then` — więc zwrócony
 * wprost z funkcji async byłby wzięty za obietnicę: telefon wywołałby nieistniejące `then()` i nic by się nie zaplanowało.
 */
async function plugin(): Promise<{ p: LN } | null> {
  if (!isNative()) return null;
  mod ??= await import('@capacitor/local-notifications');
  return { p: mod.LocalNotifications };
}

/** Zgoda telefonu na powiadomienia: `web` — gra w przeglądarce (bez powiadomień). */
export type NotifyState = 'granted' | 'denied' | 'prompt' | 'web';
const stateOf = (d: string): NotifyState => (d === 'granted' ? 'granted' : d === 'denied' ? 'denied' : 'prompt');

export async function notifyState(): Promise<NotifyState> {
  const x = await plugin();
  if (!x) return 'web';
  return stateOf((await x.p.checkPermissions()).display);
}

/** Pyta o zgodę, jeśli telefon jeszcze może zapytać (Android 13+); zwraca stan po odpowiedzi. */
export async function askNotify(): Promise<NotifyState> {
  const x = await plugin();
  if (!x) return 'web';
  let st = await x.p.checkPermissions();
  if (st.display === 'prompt' || st.display === 'prompt-with-rationale') st = await x.p.requestPermissions();
  return stateOf(st.display);
}

/** Próbne powiadomienie od razu (z ustawień) — żeby gracz zobaczył, że działają. */
export async function testNotify(): Promise<NotifyState> {
  const st = await askNotify();
  const x = await plugin();
  if (!x || st !== 'granted') return st;
  // Od razu, bez alarmu (i bez „dokładnego alarmu”, o który wtyczka inaczej pyta ekranem ustawień telefonu).
  await x.p.schedule({ notifications: [{ id: 9, title: 'Kuźnia Legend', body: 'Powiadomienia działają. Dam znać, gdy kuźnia, badanie albo łupy będą gotowe, a rano o prezencie dnia.', isExactNotification: false }] });
  return st;
}

/** Powiadomienia naprawdę działają: włączone w grze i telefon pozwala. */
export const notifyOn = (game: Game, st: NotifyState | null) => game.s.opts.notify && st === 'granted';

/**
 * Gracz chce powiadomień (przełącznik w Kodeksie, przypomnienie): telefon pyta „Zezwól / Nie zezwalaj”.
 * Zgoda — włączone w grze; odmowa — w grze zostają wyłączone (przełącznik nie udaje, że działają).
 */
export async function enableNotify(game: Game): Promise<NotifyState> {
  const st = await askNotify();
  game.setNotify(st === 'granted');
  return st;
}

/** Własna wtyczka aplikacji (android/…/AppSettingsPlugin.java): ekran powiadomień gry w ustawieniach telefonu. */
const AppSettings = registerPlugin<{ openNotifications(): Promise<void> }>('AppSettings');
export const canOpenNotifySettings = () => isNative() && !!window.Capacitor?.isPluginAvailable?.('AppSettings');
export async function openNotifySettings(): Promise<boolean> {
  if (!canOpenNotifySettings()) return false;
  try { await AppSettings.openNotifications(); return true; } catch { return false; }
}

/** Powrót do gry (np. z ustawień telefonu) — okna z powiadomieniami sprawdzają wtedy zgodę jeszcze raz. */
const backFns = new Set<() => void>();
export function onComeBack(fn: () => void): () => void {
  backFns.add(fn);
  const vis = () => { if (!document.hidden) fn(); };
  document.addEventListener('visibilitychange', vis);
  return () => { backFns.delete(fn); document.removeEventListener('visibilitychange', vis); };
}

/** Prośba o zgodę na powiadomienia — raz, po minucie gry (nie od razu po uruchomieniu). */
async function askOnce(): Promise<void> {
  try {
    if (localStorage.getItem(ASKED)) return;
    localStorage.setItem(ASKED, '1');
  } catch { /* bez pamięci — zapytamy */ }
  await askNotify();
}

async function schedule(game: Game): Promise<void> {
  const x = await plugin();
  if (!x || !game.s.opts.notify) return;
  const st = await x.p.checkPermissions();
  if (st.display !== 'granted') return;
  const now = Date.now();
  await x.p.schedule({
    // Bez „dokładnych alarmów”: wtyczka (8.3+) przy domyślnym isExactNotification otwierała przy każdym planowaniu
    // ekran „Alarmy i przypomnienia” — a tego uprawnienia gra celowo nie ma (manifest). Przypomnienie może przyjść parę minut później.
    notifications: upcoming(game).map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: new Date(now + n.at), allowWhileIdle: true }, isExactNotification: false })),
  });
}

async function cancelAll(): Promise<void> {
  const x = await plugin();
  if (!x) return;
  const pending = await x.p.getPending();
  const ours = pending.notifications.filter(n => n.id !== 9); // próbne zostaje — przychodzi za chwilę
  if (ours.length) await x.p.cancel({ notifications: ours.map(n => ({ id: n.id })) });
}

/**
 * Start w aplikacji: powiadomienia przy zejściu w tło i przycisk „wstecz”: `back` zamyka okno albo wraca do Kuźni;
 * gdy nie ma już nic do cofnięcia, pierwsze naciśnięcie pokazuje podpowiedź, a drugie (w ciągu 2 s) zamyka grę.
 */
export async function initNative(game: Game, back: () => boolean): Promise<void> {
  if (!isNative()) return;
  setTimeout(() => void askOnce().catch(() => {}), 60000);
  // Zejście w tło i powrót: Android nie zawsze zgłasza zmianę widoczności strony, więc słuchamy też zdarzeń aplikacji
  // (pause/resume). Każde przejście liczy się raz, a planowanie i kasowanie idą po kolei — szybki powrót nie zostawi
  // zaplanowanych powiadomień, które przyszłyby w trakcie gry.
  let away = false;
  let queue: Promise<void> = Promise.resolve();
  const run = (f: () => Promise<void>) => { queue = queue.then(f).catch(e => console.warn('Kuźnia Legend: powiadomienia —', e)); };
  const leave = () => { if (away) return; away = true; run(() => schedule(game)); };
  const come = () => { if (!away) return; away = false; run(cancelAll); for (const fn of backFns) fn(); };
  document.addEventListener('visibilitychange', () => (document.hidden ? leave() : come()));
  run(cancelAll);
  const { App } = await import('@capacitor/app');
  await App.addListener('pause', leave);
  await App.addListener('resume', come);
  let last = 0;
  await App.addListener('backButton', () => {
    if (back()) { last = 0; return; }
    const now = Date.now();
    if (now - last < EXIT_WINDOW_MS) {
      // zapis przed wyjściem (najwyżej 1,5 s czekania)
      void Promise.race([flushSave(), new Promise(r => setTimeout(r, 1500))]).finally(() => void App.exitApp());
      return;
    }
    last = now;
    toast(game.ctx, 'Naciśnij „wstecz” jeszcze raz, aby wyjść z gry.');
  });
}

/**
 * Zainstalowana gra w przeglądarce (bez aplikacji): „wstecz” telefonu cofa historię przeglądarki. Gra trzyma jeden
 * wpis zapasu — „wstecz” zamyka okno albo wraca do Kuźni i odnawia zapas; gdy nie ma nic do cofnięcia, wychodzi.
 */
export function initHistoryBack(back: () => boolean): () => void {
  if (isNative() || !isStandalone()) return () => {};
  try { history.pushState({ kl: 1 }, ''); } catch { return () => {}; }
  const onPop = () => { if (back()) { try { history.pushState({ kl: 1 }, ''); } catch { /* bez historii */ } } };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}
