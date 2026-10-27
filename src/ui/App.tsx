import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import type { ModalData } from '../engine/types';
import { Arena } from './Arena';
import { ModalShell, ModalView } from './Modals';
import { Toasts } from './Toasts';
import { fmt } from './format';
import { TabIcon, type Tab } from './icons';
import { CodexPanel } from './panels/Codex';
import { DungeonPanel } from './panels/Dungeon';
import { ForgePanel } from './panels/Forge';
import { HeroPanel } from './panels/Hero';
import { LandsPanel } from './panels/Lands';
import { ResearchPanel } from './panels/Research';

const TABS: [Tab, string][] = [['kuznia', 'Kuźnia'], ['bohater', 'Bohater'], ['nauka', 'Nauka'], ['krainy', 'Krainy'], ['lochy', 'Lochy'], ['kodeks', 'Kodeks']];

export interface SaveInfo { mode: 'local' | 'cloud' }

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
    });
    const id = setInterval(() => force(x => x + 1), 250);
    force(x => x + 1);
    onReady?.();
    return () => { off(); clearInterval(id); };
  }, [game]);

  const modal = queue.current[0] ?? null;
  game.uiBusy = !!modal;
  const close = () => { queue.current.shift(); force(x => x + 1); };
  const open = (m: ModalData) => { queue.current.unshift(m); force(x => x + 1); };
  const goTab = (t: Tab, scroll = false) => {
    setTab(t);
    if (scroll) panelRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const s = game.s;
  return (
    <>
      <div class="app">
        <header class="top">
          <div>
            <div class="brand">Kuźnia Legend</div>
            <div class="save-badge">{save.mode === 'cloud' ? 'Zapis w chmurze' : 'Zapis w przeglądarce'}</div>
          </div>
          <div class="res">
            <span><small>Moc</small><b>{fmt(game.stats.power)}</b></span>
            <span class="gold"><small>Złoto</small><b>{fmt(s.gold)}</b></span>
            <span><small>Kuźnia</small><b>{s.forge.lvl}{s.forge.up ? '↑' : ''}</b></span>
            <span class="books"><small>Księgi</small><b>{fmt(s.books)}</b></span>
          </div>
        </header>
        <Arena game={game} onTab={t => goTab(t, true)} />
        <main class="panel" ref={panelRef}>
          {tab === 'kuznia' && <ForgePanel game={game} onInfo={k => open({ kind: 'info', k })} />}
          {tab === 'bohater' && <HeroPanel game={game} onItem={item => open({ kind: 'item', item })} />}
          {tab === 'nauka' && <ResearchPanel game={game} />}
          {tab === 'krainy' && <LandsPanel game={game} />}
          {tab === 'lochy' && <DungeonPanel game={game} />}
          {tab === 'kodeks' && <CodexPanel game={game} saveMode={save.mode} onReset={() => open({ kind: 'reset' })} />}
        </main>
      </div>
      <nav class="tabs" aria-label="Zakładki">
        <div class="tabs-in">
          {TABS.map(([id, n]) => (
            <button key={id} class={`tab${tab === id ? ' on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}>
              <TabIcon tab={id} /><span>{n}</span>
            </button>
          ))}
        </div>
      </nav>
      {modal && (
        <ModalShell locked={modal.kind === 'dungChoice'} onClose={close}>
          <ModalView m={modal} game={game} close={close} />
        </ModalShell>
      )}
      <Toasts game={game} />
    </>
  );
}
