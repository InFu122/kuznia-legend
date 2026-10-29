// Okno wydarzenia: za co są punkty, dzisiejszy limit, progi z nagrodami i loch sezonowy.
import { useState } from 'preact/hooks';
import { EVENT, EVENT_MILESTONES } from '../../data';
import { dungeonBgUrl, resUrl } from '../../art/render';
import { eventByIndex, eventIcon, eventOf, eventPts, eventReached, evWord } from '../../engine/events';
import type { Game } from '../../engine/game';
import { passItemsReward } from '../../engine/shop';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { rewardText } from '../texts';

export function EventView({ game, close, onDung }: { game: Game; close: () => void; onDung: () => void }) {
  const [msg, setMsg] = useState('');
  const now = game.ctx.now();
  const ev = eventOf(now);
  const e = game.event();
  const pts = eventPts(e);
  const reached = eventReached(e);
  const todo = Math.max(0, reached - e.got);
  const next = eventByIndex(ev.i + 1);
  const claim = () => {
    const r = game.claimEvent();
    setMsg(r ? `Odebrano: ${rewardText(r)}.` : 'Nie ma nic do odebrania.');
  };
  return (
    <>
      <div class="li-head" style={{ '--bg': `url(${dungeonBgUrl('ev_' + ev.kind)})` } as Record<string, string>}>
        <div class="eyebrow">Wydarzenie · jeszcze {tfmt(ev.end - now)}</div>
        <div class="h">{ev.def.n}</div>
      </div>
      <div class="ev-total">
        <Px src={resUrl(eventIcon(ev.kind))} size={28} />
        <b class="num">{fmt(pts)}</b>
        <span>{evWord(pts, ev.def)}</span>
      </div>
      <p class="sub">{ev.def.d}</p>
      <p class="sub">
        Z codziennej gry dziś: <b class="num">{fmt(e.dpts)}/{fmt(EVENT.DAY_CAP)}</b>. Bez limitu: <b>{ev.def.dung}</b> — loch sezonowy w zakładce Lochy
        ({EVENT.KEYS} klucze dziennie, {ev.def.cur} za każde piętro{e.best ? `, twój rekord: piętro ${e.best}` : ''}).
      </p>
      <button class="linkbtn" onClick={onDung}>Do lochu sezonowego</button>
      <div class="row" style={{ marginTop: '6px' }}>
        <div class="eyebrow">Nagrody</div>
        {todo > 0 && <button class="btn small primary" onClick={claim}>Odbierz ({todo})</button>}
      </div>
      {msg && <p class="sub" role="status">{msg}</p>}
      <ol class="ev-list">
        {EVENT_MILESTONES.map((m, i) => {
          const st = i < e.got ? 'got' : i < reached ? 'ready' : 'lock';
          return (
            <li key={i} class={st}>
              <span class="num">{fmt(m.pts)}</span>
              <span>{rewardText(passItemsReward(m.r, game.s))}</span>
              <small>{st === 'got' ? 'odebrane' : st === 'ready' ? 'do odebrania' : `brakuje ${fmt(m.pts - pts)}`}</small>
            </li>
          );
        })}
      </ol>
      <p class="sub">Nieodebrane nagrody trafią do ciebie same po końcu wydarzenia. Następne: <b>{next.def.n}</b> (za {tfmt(next.start - now)}).</p>
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}
