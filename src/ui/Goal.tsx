// Pasek „Cel” nad areną (samouczek, a potem najbliższe zadanie) i jednolinijkowy czat nad dolnym paskiem.
import { TUTORIAL, missionText, type TutStep } from '../data';
import type { Game } from '../engine/game';
import type { Mission } from '../engine/types';
import { getChat, type ChatMsg } from '../save/chat';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { LockIcon, TabIcon } from './icons';
import { unlockWhen } from '../engine/unlocks';
import { toast } from '../engine/context';
import { fmt } from './format';

/** Zadanie do pokazania: niedokończone, najbliżej celu (najpierw dzienne). */
function pickMission(ms: Mission[]): Mission | null {
  let best: Mission | null = null, bp = -1;
  for (const m of ms) {
    if (m.claimed || m.n >= m.goal) continue;
    const p = m.n / m.goal;
    if (p > bp) { best = m; bp = p; }
  }
  return best;
}

export function GoalStrip({ game, step, onShow, onMissions }: {
  game: Game; step: TutStep | null; onShow: () => void; onMissions: (tab?: 'login') => void;
}) {
  const s = game.s;
  if (step) {
    const done = s.tut / TUTORIAL.length;
    return (
      <button class="goal tut" onClick={onShow} aria-label={`Samouczek: ${step.t}. ${step.d} Pokaż, gdzie nacisnąć`}>
        <Px src={resUrl('swieca')} size={26} />
        <span class="goal-main">
          <small>Samouczek {s.tut + 1}/{TUTORIAL.length}</small>
          <b>{step.t}</b>
          <span class="goal-d">{step.d}</span>
          <span class="goal-bar"><i style={{ width: done * 100 + '%' }} /></span>
        </span>
        <span class="goal-go">Pokaż</span>
      </button>
    );
  }
  if (!game.unlocked('zadania')) return null;
  const n = game.claimable();
  if (n > 0 || game.canClaimLogin()) {
    const login = n === 0;
    return (
      <button class="goal ready" onClick={() => onMissions(login ? 'login' : undefined)}>
        <Px src={resUrl('trofeum')} size={26} />
        <span class="goal-main"><b>{login ? 'Prezent za logowanie czeka' : `Nagrody do odebrania: ${n}`}</b></span>
        <span class="goal-go">Odbierz</span>
      </button>
    );
  }
  const ms = game.missions();
  const m = pickMission(ms.daily) ?? pickMission(ms.weekly);
  if (!m) return null;
  return (
    <button class="goal" onClick={() => onMissions()} aria-label={`Cel: ${missionText(m.kind, m.goal)}, ${m.n} z ${m.goal}. Otwórz zadania`}>
      <Px src={resUrl('trofeum')} size={26} />
      <span class="goal-main">
        <b>{missionText(m.kind, m.goal)}</b>
        <span class="goal-bar"><i style={{ width: Math.min(100, (m.n / m.goal) * 100) + '%' }} /></span>
      </span>
      <span class="goal-num">{fmt(m.n)}/{fmt(m.goal)}</span>
    </button>
  );
}

/** Gra bez serwera (np. wersja w przeglądarce do testów): czatu, klanu i rankingu nie ma. */
export const CHAT_OFFLINE = 'Czat działa tylko w grze połączonej z serwerem (aplikacja na telefonie). Ta wersja gra bez serwera, więc czatu tu nie ma.';

/** Ostatnie wiadomości z obu kanałów (bez wyciszonych graczy), od najstarszej. */
function lastMsgs(n: number): ChatMsg[] {
  const chat = getChat();
  if (!chat) return [];
  return [...chat.msgs.global, ...chat.msgs.clan].filter(m => !chat.muted.has(m.uid)).sort((a, b) => a.time - b.time).slice(-n);
}

const msgText = (m: ChatMsg) => (m.k === 'drop' && m.it ? `wykuł(a) ${m.it.name}` : m.t);

/**
 * Czat nad dolnym paskiem: dwie ostatnie wiadomości (nowa wjeżdża z błyskiem) i licznik nieprzeczytanych.
 * Bez serwera — informacja, że czat jest tylko w aplikacji z serwerem. Przed odblokowaniem: kłódka i kiedy się otworzy.
 */
export function ChatLine({ game, onOpen, onLocked }: { game: Game; onOpen: () => void; onLocked: () => void }) {
  if (!game.net) {
    return (
      <button class="chatline off" data-btn="czat" onClick={() => toast(game.ctx, CHAT_OFFLINE)} aria-label="Czat: niedostępny w tej wersji">
        <TabIcon tab="czat" />
        <span class="cl-rows"><span class="cl-t muted">Czat działa w aplikacji z serwerem — ta wersja gra bez serwera</span></span>
      </button>
    );
  }
  if (!game.unlocked('czat')) {
    return (
      <button class="chatline locked" data-btn="czat" onClick={onLocked} aria-label="Czat: zablokowany">
        <LockIcon />
        <span class="cl-rows"><span class="cl-t muted">Czat otworzy się {unlockWhen('czat')}</span></span>
      </button>
    );
  }
  const chat = getChat();
  const ms = lastMsgs(2);
  const unread = chat?.unreadTotal ?? 0;
  const last = ms[ms.length - 1];
  return (
    <button class={`chatline${unread ? ' unread' : ''}`} data-chat data-btn="czat" onClick={onOpen} aria-label={`Czat${unread ? `: ${unread} nowych` : ''}. Otwórz`}>
      <TabIcon tab="czat" />
      <span class="cl-rows" key={last ? `${last.time}:${last.uid}` : 'none'}>
        {ms.length ? ms.map((m, i) => (
          <span key={i} class={`cl-t${i === ms.length - 1 ? ' last' : ''}`}>
            {m.ch === 'clan' && <b class="cl-ch">[Klan]</b>}
            {m.k === 'sys' || m.k === 'ann' ? <i>{m.t}</i> : <><b class="cl-n">{m.n}:</b> {msgText(m)}</>}
          </span>
        )) : <span class="cl-t muted">{chat && chat.state !== 'on' ? 'Łączenie z czatem…' : 'Czat — napisz do innych kowali'}</span>}
      </span>
      {unread > 0 && <i class="badge">{unread > 99 ? '99+' : unread}</i>}
    </button>
  );
}
