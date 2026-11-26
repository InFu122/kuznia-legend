// Okno wydarzenia: licznik, główna nagroda (strój i ramka), tor progów, jak zdobywać punkty i loch sezonowy.
import { useState } from 'preact/hooks';
import { EVENT, EVENT_MILESTONES, FRAMES, SKINS } from '../../data';
import { dungeonBgUrl, resUrl } from '../../art/render';
import { eventByIndex, eventIcon, eventOf, eventPts, eventReached, evWord, milestoneReward } from '../../engine/events';
import type { Game } from '../../engine/game';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { rewardChips } from '../RewardIcons';
import { Avatar } from '../Avatar';
import type { Reward } from '../../engine/types';
import { ClaimReveal, RewardCard, Track, TrackHead, rewardTier } from './Track';

export function EventView({ game, close, onDung }: { game: Game; close: () => void; onDung: () => void }) {
  const [msg, setMsg] = useState('');
  const [reveal, setReveal] = useState<Reward | null>(null);
  const now = game.ctx.now();
  const ev = eventOf(now);
  const e = game.event();
  const pts = eventPts(e);
  const reached = eventReached(e);
  const todo = Math.max(0, reached - e.got);
  const next = eventByIndex(ev.i + 1);
  const nm = EVENT_MILESTONES[reached];
  const prev = reached ? EVENT_MILESTONES[reached - 1].pts : 0;
  const last = EVENT_MILESTONES.length - 1;
  const grand = milestoneReward(e.ev, last, game.s);
  const gChips = rewardChips(grand).filter(c => c.cls !== 'look');
  const keys = game.dungKeys('sezon');
  const capped = e.dpts >= EVENT.DAY_CAP;
  const claim = () => {
    const r = game.claimEvent();
    if (r) setReveal(r); else setMsg('Nie ma nic do odebrania.');
  };
  const scene = `url(${dungeonBgUrl('ev_' + ev.kind)})`;
  return (
    <>
      <section class={`ev-hero ev-${ev.kind}`} style={{ '--bg': scene } as Record<string, string>}>
        <div class="psh-top">
          <span class="eyebrow">Wydarzenie</span>
          <span class="ps-time"><Px src={resUrl('czas')} size={14} />{tfmt(ev.end - now)}</span>
        </div>
        <div class="psh-title">{ev.def.n}</div>
        <div class="evh-pts"><Px src={resUrl(eventIcon(ev.kind))} size={36} /><b class="num">{fmt(pts)}</b><span>{evWord(pts, ev.def)}</span></div>
        {nm ? (
          <div class="evh-next">
            <div class="bar big"><i style={{ width: ((pts - prev) / (nm.pts - prev)) * 100 + '%' }} /></div>
            <small>do następnej nagrody <b>{fmt(nm.pts - pts)}</b></small>
          </div>
        ) : <small class="evh-done">Wszystkie nagrody zdobyte!</small>}
      </section>

      <section class="ev-grand">
        <div class="evg-av" aria-hidden="true"><Avatar skin={ev.def.skin} frame={ev.def.frame} size={70} /></div>
        <div class="evg-main">
          <span class="eyebrow">Główna nagroda · {fmt(EVENT_MILESTONES[last].pts)}</span>
          <b class="evg-t">{SKINS[ev.def.skin].n} i ramka „{FRAMES[ev.def.frame].n}”</b>
          <ul class="pso-show">
            {gChips.map(c => <li key={c.key} class={`t-${rewardTier([c])}`} title={c.t}><Px src={c.ic!} size={22} />{c.n && c.n !== '1' && <b>{c.n}</b>}</li>)}
          </ul>
          <div class="evg-bar"><div class="bar"><i style={{ width: Math.min(100, (pts / EVENT_MILESTONES[last].pts) * 100) + '%' }} /></div><small class="num">{fmt(pts)} / {fmt(EVENT_MILESTONES[last].pts)}</small></div>
        </div>
      </section>

      <TrackHead title="Linia nagród" done={reached} total={EVENT_MILESTONES.length} part={nm ? (pts - prev) / (nm.pts - prev) : 1} todo={todo} />
      <Track focus={Math.min(e.got, reached)} cls="ev">
        {EVENT_MILESTONES.map((m, i) => {
          const p0 = i ? EVENT_MILESTONES[i - 1].pts : 0;
          const fill = pts >= m.pts ? 1 : pts <= p0 ? 0 : (pts - p0) / (m.pts - p0);
          const st = i < e.got ? 'got' : i < reached ? 'ready' : 'lock';
          return (
            <li key={i} class={`tcol${i < reached ? ' done' : ''}${i === reached ? ' cur' : ''}${i === last ? ' big' : ''}`} style={{ '--fill': fill } as Record<string, number>}>
              <RewardCard r={milestoneReward(e.ev, i, game.s)} state={st} prem={i === last} onClaim={claim} />
              <span class="tk-node pts"><b>{fmt(m.pts)}</b>{i === reached && <i class="tk-me" aria-label={`Ty: ${fmt(pts)}`}><span>{fmt(pts)}</span></i>}</span>
            </li>
          );
        })}
      </Track>
      {msg && <p class="sub" role="status">{msg}</p>}

      <section class="ev-earn">
        <span class="eyebrow">Jak zdobywać {ev.def.cur}</span>
        <p class="sub">{ev.def.d}</p>
        <div class="evcap">
          <span>Z codziennej gry dziś</span>
          <div class="bar"><i style={{ width: Math.min(100, (e.dpts / EVENT.DAY_CAP) * 100) + '%' }} /></div>
          <b class="num">{fmt(e.dpts)}/{fmt(EVENT.DAY_CAP)}</b>
        </div>
        {capped && <small class="evcap-note">Dzienny limit zdobyty — dalej tylko loch sezonowy (bez limitu).</small>}
        <button class="ev-dung" style={{ '--bg': scene } as Record<string, string>} onClick={onDung}>
          <span class="evd-main">
            <span class="eyebrow">Loch sezonowy · bez limitu</span>
            <b>{ev.def.dung}</b>
            <small>{ev.def.cur} za każde piętro · klucze: {keys}/{EVENT.KEYS}{e.best ? ` · rekord: piętro ${e.best}` : ''}</small>
          </span>
          <span class="dr-go">Wejdź ›</span>
        </button>
      </section>
      <p class="sub">Nieodebrane nagrody trafią do ciebie same po końcu wydarzenia. Następne: <b>{next.def.n}</b> (za {tfmt(next.start - now)}).</p>
      {todo > 0 && (
        <div class="claimbar"><button class="btn primary big" onClick={claim}>Odbierz nagrody ({todo})</button></div>
      )}
      <button class="btn" onClick={close}>Zamknij</button>
      {reveal && <ClaimReveal r={reveal} onClose={() => setReveal(null)} />}
    </>
  );
}
