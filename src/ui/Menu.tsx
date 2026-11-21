// Menu (czwarty przycisk na dole): wszystko, czego nie trzeba mieć pod kciukiem przez cały czas.
// Widać wszystko od początku: zablokowane funkcje są wyblakłe, z kłódką, warunkiem i paskiem postępu,
// a najbliższe odblokowanie jest podświetlone (i opisane na dole).
import type { JSX } from 'preact';
import { FEATURES, FEATURE_IDS, type FeatureId } from '../data';
import type { Game } from '../engine/game';
import { passUnclaimed } from '../engine/shop';
import { unlockProgress, unlockWhen } from '../engine/unlocks';
import { clanLife } from '../save/clanlife';
import { getChat } from '../save/chat';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { LockIcon, TabIcon, type Tab } from './icons';
import { toast } from '../engine/context';
import { fmt } from './format';

/** Funkcje tylko z serwerem (klan, czat, ranking) w wersji bez serwera. */
const onlineOnly = (n: string) => `${n} działa tylko w grze połączonej z serwerem (aplikacja na telefonie). Ta wersja gra bez serwera.`;

/** Funkcje, które mieszkają w Menu (znaczek „nowe” na przycisku Menu). */
const MENU_FEATURES: FeatureId[] = ['nauka', 'zadania', 'klan', 'sklep', 'czat'];

const giftWaiting = (game: Game) => game.shopNow.gift !== game.shopNow.day;
const passWaiting = (game: Game) => {
  const p = game.s.pass ? passUnclaimed(game.s.pass, game.s) : null;
  return !!(p && p.free + p.prem);
};

/** Co czeka w Menu: liczba (nagrody z Zadań i sprawy klanu) i czy jest coś bez liczby (prezent, przepustka, nowość). */
export function menuTodo(game: Game): { n: number; dot: boolean; fresh: boolean } {
  const n = (game.unlocked('zadania') ? game.claimable() : 0) + (game.unlocked('klan') ? clanLife.todo() : 0);
  // Kropka: prezent w sklepie, przepustka albo nieprzeczytane w czacie klanu (świat bywa zbyt gadatliwy na kropkę).
  const dot = (game.unlocked('sklep') && (giftWaiting(game) || passWaiting(game))) || (game.unlocked('czat') && (getChat()?.unread.clan ?? 0) > 0);
  const fresh = MENU_FEATURES.some(id => game.s.unlNew.includes(id));
  return { n, dot, fresh };
}

interface TileDef {
  key: string;
  n: string;
  d: string;
  ic: JSX.Element;
  go: () => void;
  badge?: number;
  dot?: boolean;
  fresh?: boolean;
  attrs: Record<string, string>;
  /** Zablokowany (wyblakły, z kłódką) albo niedostępny bez serwera. */
  locked?: boolean;
  /** Postęp do odblokowania 0–1. */
  prog?: number;
  /** Najbliższe odblokowanie. */
  next?: boolean;
}

/** Następna funkcja do odblokowania: ta, do której gracz ma najbliżej. */
function nextUnlock(game: Game): FeatureId | null {
  let best: FeatureId | null = null, bestP = -1;
  for (const id of FEATURE_IDS) {
    if (game.unlocked(id) || (FEATURES[id].net && !game.net)) continue;
    const [now, goal] = unlockProgress(game.s, id);
    const p = now / Math.max(1, goal);
    if (p > bestP) { best = id; bestP = p; }
  }
  return best;
}

export function MenuView({ game, close, goTab }: { game: Game; close: () => void; goTab?: (t: Tab) => void }) {
  const s = game.s;
  const show = (m: Parameters<Game['openModal']>[0]) => () => { close(); game.openModal(m); };
  const view = (t: Tab) => () => { close(); goTab?.(t); };
  const seen = (id: FeatureId, act: () => void) => () => { game.seenFeatures([id]); act(); };
  const next = nextUnlock(game);
  const tiles: TileDef[] = [];
  /**
   * Kafelek funkcji odblokowywanej z postępem: gdy zablokowana — wyblakły, z kłódką, warunkiem i paskiem postępu
   * (dotknięcie: okno z kłódką); bez serwera (klan, czat) — wyblakły z informacją, że działa tylko online.
   */
  const add = (id: FeatureId | null, t: TileDef, online = false) => {
    if (online && !game.net) {
      tiles.push({ ...t, d: 'tylko w aplikacji z serwerem', badge: 0, dot: false, fresh: false, locked: true, go: () => { close(); toast(game.ctx, onlineOnly(t.n)); } });
    } else if (id && !game.unlocked(id)) {
      const [now, goal] = unlockProgress(s, id);
      tiles.push({ ...t, d: unlockWhen(id), badge: 0, dot: false, fresh: false, locked: true, prog: now / Math.max(1, goal), next: id === next, go: show({ kind: 'locked', id }) });
    } else tiles.push(t);
  };
  add('nauka', { key: 'nauka', n: 'Nauka', d: `Księgi: ${fmt(s.books)}`, ic: <Px src={resUrl('ksiega')} size={36} />, go: view('nauka'), fresh: s.unlNew.includes('nauka'), attrs: { 'data-tab': 'nauka' } });
  {
    const n = game.unlocked('zadania') ? game.claimable() : 0;
    add('zadania', { key: 'zadania', n: 'Zadania', d: n ? `${n} do odebrania` : 'dzienne i tygodniowe', ic: <Px src={resUrl('trofeum')} size={36} />, go: seen('zadania', show({ kind: 'missions' })), badge: n, fresh: s.unlNew.includes('zadania'), attrs: { 'data-btn': 'zadania' } });
  }
  add('klan', { key: 'klan', n: 'Klan', d: 'smok, wojna, boss', ic: <Px src={resUrl('moneta')} size={36} />, go: view('klan'), badge: game.unlocked('klan') ? clanLife.todo() : 0, fresh: s.unlNew.includes('klan'), attrs: { 'data-tab': 'klan' } }, true);
  {
    const n = game.net && game.unlocked('czat') ? getChat()?.unreadTotal ?? 0 : 0;
    add('czat', { key: 'czat', n: 'Czat', d: n ? `${n} nowych` : 'świat i klan', ic: <span class="mt-svg"><TabIcon tab="czat" /></span>, go: seen('czat', show({ kind: 'chat' })), badge: n, fresh: s.unlNew.includes('czat'), attrs: { 'data-btn': 'czat' } }, true);
  }
  const shopOn = game.unlocked('sklep');
  add('sklep', { key: 'sklep', n: 'Sklep', d: shopOn && giftWaiting(game) ? 'prezent czeka' : 'klejnoty, pakiety', ic: <Px src={resUrl('klejnot')} size={36} />, go: seen('sklep', show({ kind: 'shop' })), dot: shopOn && giftWaiting(game), fresh: s.unlNew.includes('sklep'), attrs: { 'data-menu': 'sklep' } });
  if (s.pass || !shopOn) add('sklep', { key: 'pass', n: 'Przepustka', d: 'nagrody za postęp', ic: <Px src={resUrl('przepustka')} size={36} />, go: show({ kind: 'shop', tab: 'przepustka' }), dot: shopOn && passWaiting(game), attrs: { 'data-menu': 'przepustka' } });
  add(null, { key: 'ranking', n: 'Ranking', d: 'moc, wieża, arena', ic: <Px src={resUrl('puchar')} size={36} />, go: show({ kind: 'ranking' }), attrs: { 'data-menu': 'ranking' } }, true);
  add(null, { key: 'look', n: 'Wygląd', d: 'stroje i ramki', ic: <Px src={resUrl('runa')} size={36} />, go: show({ kind: 'look' }), attrs: { 'data-menu': 'look' } });
  add(null, { key: 'kodeks', n: 'Kodeks', d: 'kolekcja, konto, ustawienia', ic: <span class="mt-svg"><TabIcon tab="ustawienia" /></span>, go: view('kodeks'), attrs: { 'data-tab': 'kodeks' } });

  return (
    <>
      <div class="h">Menu</div>
      <div class="menu-grid">
        {tiles.map(t => (
          <button key={t.key} class={`mtile${t.badge || t.dot ? ' todo' : ''}${t.locked ? ' locked' : ''}${t.next ? ' next' : ''}`} onClick={t.go} {...t.attrs}
            aria-label={t.locked ? `${t.n}: zablokowane — ${t.d}` : undefined}>
            <span class="mt-ic">{t.ic}{t.locked && <i class="mt-lock" aria-hidden="true"><LockIcon /></i>}</span>
            <b>{t.n}</b>
            <small>{t.d}</small>
            {t.prog !== undefined && <span class="mt-prog" aria-hidden="true"><i style={{ width: Math.min(100, t.prog * 100) + '%' }} /></span>}
            {t.badge ? <i class="badge">{t.badge > 99 ? '99+' : t.badge}</i> : t.dot ? <i class="badge dotb" aria-hidden="true" /> : null}
            {t.fresh && <i class="badge dotb new" aria-label="nowe" />}
          </button>
        ))}
      </div>
      {next && (
        <button class="menu-next" onClick={show({ kind: 'locked', id: next })}>
          <Px src={resUrl('klucz')} size={20} />
          <span>Następne: <b>{FEATURES[next].n}</b> — {unlockWhen(next)}</span>
        </button>
      )}
    </>
  );
}
