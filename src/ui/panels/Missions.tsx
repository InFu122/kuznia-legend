import { useState } from 'preact/hooks';
import { LOGIN_DAYS, missionText } from '../../data';
import type { Game } from '../../engine/game';
import { canClaimLogin, chestReady, chestReward, loginReward, missionReward } from '../../engine/missions';
import type { Mission } from '../../engine/types';
import { fmt } from '../format';
import { rewardText } from '../texts';
import { achCount } from '../../engine/achievements';
import { AchievementsView } from './Achievements';

type Tab = 'daily' | 'weekly' | 'login' | 'ach';
const TABS: [Tab, string][] = [['daily', 'Dzienne'], ['weekly', 'Tygodniowe'], ['login', 'Logowanie'], ['ach', 'Osiągnięcia']];

function MissionRow({ m, reward, onClaim }: { m: Mission; reward: string; onClaim: () => void }) {
  const done = m.n >= m.goal;
  return (
    <li class={m.claimed ? 'claimed' : ''}>
      <div class="cmain">
        <div class="cname">{missionText(m.kind, m.goal)}</div>
        <div class="bar" style={{ marginTop: '5px' }}><i style={{ width: Math.min(100, (m.n / m.goal) * 100) + '%' }} /></div>
        <div class="tech-cost">{fmt(m.n)}/{fmt(m.goal)} · {reward}</div>
      </div>
      {m.claimed ? <span class="tech-busy">Odebrano</span>
        : <button class={`btn small${done ? ' primary' : ''}`} disabled={!done} onClick={onClaim}>{done ? 'Odbierz' : 'W toku'}</button>}
    </li>
  );
}

export function MissionsView({ game, initial, close }: { game: Game; initial?: Tab; close: () => void }) {
  const [tab, setTab] = useState<Tab>(initial ?? 'daily');
  const ms = game.missions();
  const s = game.s;
  const dot = (t: Tab) => {
    const ready = (l: Mission[]) => l.some(m => m.n >= m.goal && !m.claimed);
    return t === 'daily' ? ready(ms.daily) || chestReady(s) : t === 'weekly' ? ready(ms.weekly) : t === 'ach' ? achCount(s) > 0 : canClaimLogin(game.ctx);
  };
  return (
    <>
      <div class="eyebrow">Zadania</div>
      <div class="seg seg4" role="tablist">
        {TABS.map(([id, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {n}{dot(id) && <span class="dot" aria-label="do odebrania" />}
          </button>
        ))}
      </div>
      {tab === 'daily' && (
        <>
          <ul class="clist">
            {ms.daily.map((m, i) => <MissionRow key={m.kind} m={m} reward={rewardText(missionReward(s, 'daily'))} onClaim={() => game.claimMission('daily', i)} />)}
          </ul>
          <div class={`chest${chestReady(s) ? ' ready' : ''}`}>
            <div>
              <b>Skrzynia za komplet</b>
              <div class="sub">{rewardText(chestReward(s))}</div>
            </div>
            {ms.chest ? <span class="tech-busy">Odebrano</span>
              : <button class={`btn small${chestReady(s) ? ' primary' : ''}`} disabled={!chestReady(s)} onClick={() => game.claimChest()}>Otwórz</button>}
          </div>
          <p class="sub">Nowe misje o północy.</p>
        </>
      )}
      {tab === 'weekly' && (
        <>
          <ul class="clist">
            {ms.weekly.map((m, i) => <MissionRow key={m.kind} m={m} reward={rewardText(missionReward(s, 'weekly'))} onClaim={() => game.claimMission('weekly', i)} />)}
          </ul>
          <p class="sub">Nowe misje tygodniowe w poniedziałek.</p>
        </>
      )}
      {tab === 'login' && <LoginView game={game} />}
      {tab === 'ach' && <AchievementsView game={game} />}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}

function LoginView({ game }: { game: Game }) {
  const s = game.s;
  const can = canClaimLogin(game.ctx);
  return (
    <>
      <p class="sub">Zaglądaj codziennie: każdego dnia jedna nagroda, a 7. dnia epicki Zwój zaklęć. Opuszczony dzień nie przepada — kalendarz czeka.</p>
      <div class="cal">
        {LOGIN_DAYS.map((d, i) => {
          const state = i < s.login.idx ? 'got' : i === s.login.idx ? (can ? 'now' : 'next') : '';
          const r = loginReward(s, i);
          return (
            <div key={i} class={`calday ${state}${i === 6 ? ' big' : ''}`}>
              <small>Dzień {i + 1}</small>
              <b>{d.n}</b>
              <span>{i === 6 && !Object.keys(r).length ? 'Epicki lub lepszy' : rewardText(r)}</span>
            </div>
          );
        })}
      </div>
      <button class="btn primary" disabled={!can} onClick={() => game.claimLogin()}>{can ? `Odbierz nagrodę dnia ${s.login.idx + 1}` : 'Następna nagroda jutro'}</button>
    </>
  );
}
