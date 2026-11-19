// Pasek „Cel” nad areną (samouczek, a potem najbliższe zadanie) i wyskakujący czat nad dolnym paskiem.
import { TUTORIAL, missionText, type TutStep } from '../data';
import type { Game } from '../engine/game';
import type { Mission } from '../engine/types';
import { getChat, type ChatMsg } from '../save/chat';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { TabIcon } from './icons';
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

/** Jak długo wiadomość wisi nad dolnym paskiem. */
const POP_MS = 6000;
/** Czas na zniknięcie (płynne wygaszenie). */
const POP_OUT_MS = 400;

const msgText = (m: ChatMsg) => (m.k === 'drop' && m.it ? `wykuł(a) ${m.it.name}` : m.t);

/**
 * Wyskakujący czat: gdy ktoś napisze, nad dolnym paskiem na kilka sekund pojawia się jego wiadomość
 * (dotknięcie otwiera czat na tym kanale), potem pasek znika. Nowa wiadomość przedłuża czas.
 * Na stałe czat jest w Menu. Pasek unosi się nad treścią, więc nic na ekranie nie skacze.
 */
export function ChatPop({ game, onOpen }: { game: Game; onOpen: (ch: 'global' | 'clan') => void }) {
  const chat = getChat();
  if (!game.net || !game.unlocked('czat') || !chat?.live || chat.viewing) return null;
  const m = chat.live;
  if (chat.muted.has(m.uid)) return null;
  const age = Date.now() - chat.liveAt;
  if (age > POP_MS + POP_OUT_MS) return null;
  const unread = chat.unreadTotal;
  return (
    <button key={m.id} class={`chatpop${age > POP_MS ? ' out' : ''}`} data-chat onClick={() => onOpen(m.ch)}
      aria-label={`Nowa wiadomość${m.ch === 'clan' ? ' w klanie' : ''} od ${m.n || 'gracza'}: ${msgText(m)}. Otwórz czat`}>
      <TabIcon tab="czat" />
      <span class="cp-t">
        {m.ch === 'clan' && <b class="cl-ch">[Klan]</b>}
        {m.k === 'ann' ? <i>{m.t}</i> : <><b class="cl-n">{m.n}:</b> {msgText(m)}</>}
      </span>
      {unread > 1 && <i class="badge">{unread > 99 ? '99+' : unread}</i>}
    </button>
  );
}
