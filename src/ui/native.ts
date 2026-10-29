// Tylko w aplikacji na telefon (Capacitor): lokalne powiadomienia i przycisk „wstecz” Androida.
// Powiadomienia planuje sam telefon, gdy gra schodzi w tło — serwer nie jest do tego potrzebny:
// koniec ulepszenia kuźni, koniec badania, wyklucie jaja i limit nagród za nieobecność.
import { B, LANDS, TECH } from '../data';
import type { Game } from '../engine/game';
import { allMods } from '../engine/mods';
import { isNative } from './pwa';

type LN = typeof import('@capacitor/local-notifications').LocalNotifications;
let ln: LN | null = null;
const ASKED = 'kl-notify-asked';

/** Co i kiedy przypomnieć (ms od teraz, w czasie rzeczywistym — z tempem testowym krócej). */
export function upcoming(game: Game): { id: number; at: number; title: string; body: string }[] {
  const s = game.s;
  const sp = Math.max(1, s.speed || 1);
  const out: { id: number; at: number; title: string; body: string }[] = [];
  if (s.forge.up && s.forge.left > 0) out.push({ id: 1, at: s.forge.left / sp, title: 'Kuźnia gotowa!', body: `Ulepszenie do ${s.forge.up}. poziomu się skończyło — wracaj kuć lepszy ekwipunek.` });
  if (s.tech.cur && s.tech.cur.left > 0) out.push({ id: 2, at: s.tech.cur.left / sp, title: 'Badanie zakończone', body: `${TECH[s.tech.cur.id].n} — nowy poziom czeka. Wybierz następne badanie.` });
  if (s.hatch && s.hatch.left > 0) out.push({ id: 3, at: s.hatch.left / sp, title: 'Jajo się wykluwa!', body: 'Nowy chowaniec czeka w zakładce Bohater.' });
  const cap = B.OFFLINE_CAP_MS + allMods(s).offlineMin * 60000;
  out.push({ id: 4, at: cap, title: 'Bohater czeka na rozkazy', body: `Łupy z ${LANDS[s.cur.land].n} doszły do limitu nagród za nieobecność. Zajrzyj do kuźni!` });
  return out.filter(n => n.at > 30000);
}

async function plugin(): Promise<LN | null> {
  if (!isNative()) return null;
  if (!ln) ln = (await import('@capacitor/local-notifications')).LocalNotifications;
  return ln;
}

/** Prośba o zgodę na powiadomienia — raz, po minucie gry (nie od razu po uruchomieniu). */
async function askOnce(): Promise<void> {
  const p = await plugin();
  if (!p) return;
  try {
    if (localStorage.getItem(ASKED)) return;
    localStorage.setItem(ASKED, '1');
  } catch { /* bez pamięci — zapytamy */ }
  const st = await p.checkPermissions();
  if (st.display === 'prompt' || st.display === 'prompt-with-rationale') await p.requestPermissions();
}

async function schedule(game: Game): Promise<void> {
  const p = await plugin();
  if (!p || !game.s.opts.notify) return;
  const st = await p.checkPermissions();
  if (st.display !== 'granted') return;
  const now = Date.now();
  await p.schedule({
    notifications: upcoming(game).map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: new Date(now + n.at), allowWhileIdle: true } })),
  });
}

async function cancelAll(): Promise<void> {
  const p = await plugin();
  if (!p) return;
  const pending = await p.getPending();
  if (pending.notifications.length) await p.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
}

/** Start w aplikacji: powiadomienia przy zejściu w tło, „wstecz” zamyka okno albo chowa grę. */
export async function initNative(game: Game, closeModal: () => boolean): Promise<void> {
  if (!isNative()) return;
  setTimeout(() => void askOnce().catch(() => {}), 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void schedule(game).catch(e => console.warn('Kuźnia Legend: powiadomienia —', e));
    else void cancelAll().catch(() => {});
  });
  void cancelAll().catch(() => {});
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => { if (!closeModal()) void App.minimizeApp(); });
}
