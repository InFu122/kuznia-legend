import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import type { ModalData } from '../engine/types';
import { Arena } from './Arena';
import { ModalShell, ModalView } from './Modals';
import { Toasts } from './Toasts';
import { fmt } from './format';
import { TabIcon, type Tab } from './icons';
import { ClanPanel } from './panels/Clan';
import { clanLife } from '../save/clanlife';
import { CodexPanel } from './panels/Codex';
import { getChat } from '../save/chat';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { DungeonPanel } from './panels/Dungeon';
import { ForgePanel } from './panels/Forge';
import { HeroPanel } from './panels/Hero';
import { LandsPanel } from './panels/Lands';
import { ResearchPanel } from './panels/Research';
import { TUTORIAL } from '../data';
import { tutStep } from '../engine/tutorial';
import { play, setSound, unlockAudio } from './sound';

const TABS: [Tab, string][] = [['kuznia', 'Kuźnia'], ['bohater', 'Bohater'], ['nauka', 'Nauka'], ['krainy', 'Krainy'], ['lochy', 'Lochy'], ['klan', 'Klan'], ['kodeks', 'Kodeks']];

export interface SaveInfo {
  mode: 'local' | 'cloud' | 'server' | 'connecting' | 'offline';
  error?: string;              // serwer odrzucił zapis
  reason?: string;             // dlaczego nie ma połączenia
  retry?: () => void;          // połącz ponownie teraz
  redeem?: (code: string) => Promise<void>;  // przejmij konto z kodu przeniesienia
}

const SAVE_LABEL: Record<SaveInfo['mode'], string> = {
  local: 'Zapis w przeglądarce',
  cloud: 'Zapis w chmurze',
  server: 'Zapis na serwerze',
  connecting: 'Łączenie z serwerem…',
  offline: 'Brak serwera — zapis lokalny',
};

export function App({ game, save, onReady }: { game: Game; save: SaveInfo; onReady?: () => void }) {
  const [tab, setTab] = useState<Tab>('kuznia');
  const [, force] = useState(0);
  const queue = useRef<ModalData[]>([]);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (game.s.stats.smelted === 0) queue.current.push({ kind: 'intro' });
    const off = game.on(e => {
      if (e.t === 'modal') { queue.current.push(e.m); force(x => x + 1); }
      else if (e.t === 'change') force(x => x + 1);
      else if (e.t === 'sfx') play(e.k, e.r);
      else if (e.t === 'drop') play(e.rare ? 'dropRare' : 'drop');
    });
    const id = setInterval(() => force(x => x + 1), 250);
    force(x => x + 1);
    onReady?.();
    // Kalendarz logowania wita gracza, który już grał (nowy gracz ma najpierw wstęp i samouczek).
    if (game.s.stats.smelted > 0 && game.canClaimLogin()) { queue.current.push({ kind: 'missions', tab: 'login' }); force(x => x + 1); }
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => { off(); clearInterval(id); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, [game]);

  // Podświetlenie przycisku, o którym mówi bieżący krok samouczka.
  const step = tutStep(game.s);
  useEffect(() => {
    document.querySelectorAll('.tut-hl').forEach(el => el.classList.remove('tut-hl'));
    if (step && tab === step.tab && !queue.current.length) document.querySelector(step.target)?.classList.add('tut-hl');
  });
  setSound(game.s.opts.sound, game.s.opts.vol);

  // Wstęp jest dla nowego gracza — znika, gdy z serwera przyszedł zapis z postępem.
  if (queue.current[0]?.kind === 'intro' && game.s.stats.smelted > 0) queue.current.shift();
  const modal = queue.current[0] ?? null;
  // Okno z decyzją wstrzymuje auto-wytop; czat, rankingi i arena nie.
  game.uiBusy = !!modal && modal.kind !== 'chat' && modal.kind !== 'ranking' && modal.kind !== 'arena';
  const close = () => { queue.current.shift(); force(x => x + 1); };
  const open = (m: ModalData) => { queue.current.unshift(m); force(x => x + 1); };
  const goTab = (t: Tab, scroll = false) => {
    setTab(t);
    if (scroll) panelRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  /** Przełącza na zakładkę kroku samouczka i przewija do podświetlonego elementu. */
  const showStep = (t: Tab, target: string) => {
    setTab(t);
    setTimeout(() => document.querySelector(target)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }), 60);
  };
  const s = game.s;
  const nClaim = game.claimable();
  const chat = getChat();
  const unread = chat?.unreadTotal ?? 0;
  const tabs = game.net ? TABS : TABS.filter(([id]) => id !== 'klan'); // klany i czat tylko z serwerem
  return (
    <>
      <div class="app">
        <header class="top">
          <div class="top-row">
            <div>
              <div class="brand">Kuźnia Legend{s.speed > 1 && <span class="speed-badge" title="Tempo testowe">×{s.speed}</span>}</div>
              <div class={`save-badge ${save.mode}`} title={save.error ?? save.reason}>{save.error ? 'Serwer odrzucił zapis' : SAVE_LABEL[save.mode]}</div>
            </div>
            <div class="top-btns">
              {game.net && (
                <button class="quests" data-chat onClick={() => open({ kind: 'chat' })} aria-label={`Czat${unread ? `: ${unread} nowych` : ''}`}>
                  <TabIcon tab="czat" /><span class="qlabel">Czat</span>{unread > 0 && <i class="badge">{unread > 99 ? '99+' : unread}</i>}
                </button>
              )}
              <button class="quests" onClick={() => open({ kind: 'missions' })} aria-label={`Zadania${nClaim ? `: ${nClaim} do odebrania` : ''}`}>
                <TabIcon tab="kodeks" /><span class="qlabel">Zadania</span>{nClaim > 0 && <i class="badge">{nClaim}</i>}
              </button>
            </div>
          </div>
          <div class="res">
            <span><small>Moc</small><b>{fmt(game.stats.power)}</b></span>
            <span class="gold"><small>Złoto</small><b><Px src={resUrl('zloto')} size={16} />{fmt(s.gold)}</b></span>
            <span><small>Kuźnia</small><b>{s.forge.lvl}{s.forge.up ? '↑' : ''}</b></span>
            <span class="books"><small>Księgi</small><b><Px src={resUrl('ksiega')} size={16} />{fmt(s.books)}</b></span>
          </div>
        </header>
        <Arena game={game} onTab={t => goTab(t, true)} />
        {step && (
          <section class="tutbar" aria-label="Samouczek">
            <div class="cmain">
              <div class="eyebrow">Samouczek {game.s.tut + 1}/{TUTORIAL.length}</div>
              <b>{step.t}</b>
              <div class="sub">{step.d}</div>
            </div>
            <button class="btn small primary" onClick={() => showStep(step.tab, step.target)}>Pokaż</button>
          </section>
        )}
        <main class="panel" ref={panelRef}>
          {tab === 'kuznia' && <ForgePanel game={game} onInfo={k => open({ kind: 'info', k })} onFound={() => open({ kind: 'found' })} />}
          {tab === 'bohater' && <HeroPanel game={game} onItem={item => open({ kind: 'item', item })} />}
          {tab === 'nauka' && <ResearchPanel game={game} />}
          {tab === 'krainy' && <LandsPanel game={game} />}
          {tab === 'klan' && <ClanPanel game={game} online={save.mode === 'server'} openChat={() => open({ kind: 'chat', ch: 'clan' })} />}
          {tab === 'lochy' && <DungeonPanel game={game} online={save.mode === 'server'} onArena={() => open({ kind: 'arena' })} />}
          {tab === 'kodeks' && <CodexPanel game={game} save={save} onReset={() => open({ kind: 'reset' })} onRanking={() => open({ kind: 'ranking' })} />}
        </main>
      </div>
      <nav class="tabs" aria-label="Zakładki">
        <div class="tabs-in" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map(([id, n]) => (
            <button key={id} data-tab={id} class={`tab${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}>
              <TabIcon tab={id} /><span>{n}</span>
              {id === 'klan' && tab !== 'klan' && clanLife.todo() > 0 && <i class="tab-dot" aria-label="w klanie coś czeka" />}
            </button>
          ))}
        </div>
      </nav>
      {modal && (
        <ModalShell locked={modal.kind === 'dungChoice' || modal.kind === 'labChoice'} onClose={close}>
          <ModalView m={modal} game={game} close={close} goTab={t => goTab(t)} />
        </ModalShell>
      )}
      <Toasts game={game} />
    </>
  );
}
