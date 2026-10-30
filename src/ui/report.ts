// Zgłoszenia od testerów: dane, które pomagają odtworzyć problem, i automatyczne raporty błędów skryptu.
import type { Game } from '../engine/game';
import { landDef } from '../data';
import { getLink } from '../save/server';
import { APP_VERSION, isNative, isStandalone } from './pwa';

/** Kontekst zgłoszenia: wersja gry, urządzenie i stan kowala (bez danych osobowych). */
export function reportMeta(game: Game | null): Record<string, string | number> {
  const m: Record<string, string | number> = {
    version: APP_VERSION,
    ua: navigator.userAgent.slice(0, 200),
    screen: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio || 1}`,
    mode: isNative() ? 'aplikacja' : isStandalone() ? 'zainstalowana' : 'przeglądarka',
  };
  if (game) {
    m.forge = game.s.forge.lvl;
    m.land = landDef(game.s.cur.land)?.n ?? '';
    m.power = Math.round(game.stats.power);
  }
  return m;
}

const IGNORE = /ResizeObserver loop|AbortError|NetworkError|Failed to fetch|Load failed|play\(\) request|NotAllowedError/i;
let sent = 0;

/** Błędy skryptu trafiają na serwer (najwyżej kilka na sesję), żeby było wiadomo, co psuje się testerom. */
export function watchErrors(game: Game): void {
  const send = (msg: string, stack?: string) => {
    if (sent >= 5 || IGNORE.test(msg)) return;
    const link = getLink();
    if (!link?.online) return;
    sent++;
    const text = (msg + (stack ? '\n' + stack.split('\n').slice(0, 6).join('\n') : '')).slice(0, 600);
    link.feedback('auto', text, reportMeta(game)).catch(() => { /* bez sieci — trudno */ });
  };
  window.addEventListener('error', e => send(String(e.message || 'błąd'), e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason as unknown;
    send(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
}
