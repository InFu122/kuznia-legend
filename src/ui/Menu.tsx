// Menu (czwarty przycisk na dole): wszystko, czego nie trzeba mieć pod kciukiem przez cały czas.
// Zablokowane funkcje się tu nie pokazują — na dole jest tylko jedna podpowiedź, co odblokuje się następne.
import type { JSX } from 'preact';
import { FEATURES, FEATURE_IDS, type FeatureId } from '../data';
import type { Game } from '../engine/game';
import { passUnclaimed } from '../engine/shop';
import { unlockProgress, unlockWhen } from '../engine/unlocks';
import { clanLife } from '../save/clanlife';
import { getChat } from '../save/chat';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { TabIcon, type Tab } from './icons';
import { fmt } from './format';

/** Funkcje, które mieszkają w Menu (znaczek „nowe” na przycisku Menu). */
const MENU_FEATURES: FeatureId[] = ['nauka', 'zadania', 'klan', 'sklep'];

const giftWaiting = (game: Game) => game.shopNow.gift !== game.shopNow.day;
const passWaiting = (game: Game) => {
  const p = game.s.pass ? passUnclaimed(game.s.pass, game.s) : null;
  return !!(p && p.free + p.prem);
};

/** Co czeka w Menu: liczba (nagrody z Zadań i sprawy klanu) i czy jest coś bez liczby (prezent, przepustka, nowość). */
export function menuTodo(game: Game): { n: number; dot: boolean; fresh: boolean } {
  const n = (game.unlocked('zadania') ? game.claimable() : 0) + (game.unlocked('klan') ? clanLife.todo() : 0);
  const dot = (game.unlocked('sklep') && (giftWaiting(game) || passWaiting(game)));
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
  const tiles: TileDef[] = [];
  if (game.unlocked('nauka')) tiles.push({ key: 'nauka', n: 'Nauka', d: `Księgi: ${fmt(s.books)}`, ic: <Px src={resUrl('ksiega')} size={36} />, go: view('nauka'), fresh: s.unlNew.includes('nauka'), attrs: { 'data-tab': 'nauka' } });
  if (game.unlocked('zadania')) {
    const n = game.claimable();
    tiles.push({ key: 'zadania', n: 'Zadania', d: n ? `${n} do odebrania` : 'dzienne i tygodniowe', ic: <Px src={resUrl('trofeum')} size={36} />, go: seen('zadania', show({ kind: 'missions' })), badge: n, fresh: s.unlNew.includes('zadania'), attrs: { 'data-btn': 'zadania' } });
  }
  if (game.unlocked('klan')) tiles.push({ key: 'klan', n: 'Klan', d: 'smok, wojna, boss', ic: <Px src={resUrl('moneta')} size={36} />, go: view('klan'), badge: clanLife.todo(), fresh: s.unlNew.includes('klan'), attrs: { 'data-tab': 'klan' } });
  if (game.unlocked('czat')) {
    const n = getChat()?.unreadTotal ?? 0;
    tiles.push({ key: 'czat', n: 'Czat', d: n ? `${n} nowych` : 'świat i klan', ic: <span class="mt-svg"><TabIcon tab="czat" /></span>, go: seen('czat', show({ kind: 'chat' })), badge: n, fresh: s.unlNew.includes('czat'), attrs: { 'data-menu': 'czat' } });
  }
  if (game.unlocked('sklep')) {
    tiles.push({ key: 'sklep', n: 'Sklep', d: giftWaiting(game) ? 'prezent czeka' : 'klejnoty, pakiety', ic: <Px src={resUrl('klejnot')} size={36} />, go: seen('sklep', show({ kind: 'shop' })), dot: giftWaiting(game), fresh: s.unlNew.includes('sklep'), attrs: { 'data-menu': 'sklep' } });
    if (s.pass) tiles.push({ key: 'pass', n: 'Przepustka', d: 'nagrody za postęp', ic: <Px src={resUrl('przepustka')} size={36} />, go: show({ kind: 'shop', tab: 'przepustka' }), dot: passWaiting(game), attrs: { 'data-menu': 'przepustka' } });
  }
  if (game.net) tiles.push({ key: 'ranking', n: 'Ranking', d: 'moc, wieża, arena', ic: <Px src={resUrl('puchar')} size={36} />, go: show({ kind: 'ranking' }), attrs: { 'data-menu': 'ranking' } });
  tiles.push({ key: 'look', n: 'Wygląd', d: 'stroje i ramki', ic: <Px src={resUrl('runa')} size={36} />, go: show({ kind: 'look' }), attrs: { 'data-menu': 'look' } });
  tiles.push({ key: 'kodeks', n: 'Kodeks', d: 'kolekcja, konto, ustawienia', ic: <span class="mt-svg"><TabIcon tab="ustawienia" /></span>, go: view('kodeks'), attrs: { 'data-tab': 'kodeks' } });

  const next = nextUnlock(game);
  return (
    <>
      <div class="h">Menu</div>
      <div class="menu-grid">
        {tiles.map(t => (
          <button key={t.key} class={`mtile${t.badge || t.dot ? ' todo' : ''}`} onClick={t.go} {...t.attrs}>
            {t.ic}
            <b>{t.n}</b>
            <small>{t.d}</small>
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
