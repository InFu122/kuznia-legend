// Nad zakładkami Przygody (Krainy · Lochy · Arena): wydarzenie i sezon w tym samym stylu — widać je od razu,
// niezależnie od tego, która podzakładka jest otwarta.
import { EVENT_MILESTONES, PASS } from '../../data';
import { dungeonBgUrl, resUrl } from '../../art/render';
import { eventIcon, eventOf, eventPts, eventReached, evText, evWord } from '../../engine/events';
import { passLevel, passUnclaimed, passXp, seasonOf } from '../../engine/shop';
import type { Game } from '../../engine/game';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { SegBar } from './Track';

/** Wiersz wydarzenia albo sezonu na całą szerokość: ikona, nazwa i czas, postęp z liczbami, przycisk z liczbą nagród. */
function Row({ bg, cls, icon, eyebrow, time, name, bar, sub, btn, n, onClick }: {
  bg: string; cls: string; icon: string; eyebrow: string; time: string; name: string; bar: preact.ComponentChildren; sub: preact.ComponentChildren;
  btn: string; n: number; onClick: () => void;
}) {
  return (
    <button class={`adv-row ${cls}${n ? ' ready' : ''}`} onClick={onClick} style={{ '--bg': `url(${bg})` } as Record<string, string>}>
      <span class="ar-ic"><Px src={icon} size={34} /></span>
      <span class="ar-main">
        <span class="ar-top"><span class="eyebrow">{eyebrow}</span><span class="ar-time"><Px src={resUrl('czas')} size={11} />{time}</span></span>
        <b class="ar-name">{name}</b>
        {bar}
        <small class="ar-sub">{sub}</small>
      </span>
      <span class={`ar-btn${n ? ' on' : ''}`}>{n ? <>Odbierz<b>{n}</b></> : <>{btn} ›</>}</span>
    </button>
  );
}

export function AdventureBanners({ game, onEvent, onPass }: { game: Game; onEvent: () => void; onPass: () => void }) {
  const now = game.ctx.now();
  const ev = eventOf(now);
  const e = game.event();
  const pts = eventPts(e);
  const reached = eventReached(e);
  const todo = game.eventTodo();
  const next = EVENT_MILESTONES[reached];
  const prev = reached ? EVENT_MILESTONES[reached - 1].pts : 0;

  const season = seasonOf(now);
  const p = game.s.pass;
  const lvl = p ? passLevel(p) : 0;
  const inLvl = p ? (lvl >= PASS.LEVELS ? PASS.XP_PER_LVL : passXp(p) - lvl * PASS.XP_PER_LVL) : 0;
  const un = p ? passUnclaimed(p, game.s) : null;
  const claim = un ? un.free + un.prem : 0;

  return (
    <div class="adv-banners rows">
      <Row bg={dungeonBgUrl('ev_' + ev.kind)} cls={`ev-${ev.kind}`} icon={resUrl(eventIcon(ev.kind))}
        eyebrow="Wydarzenie" time={tfmt(ev.end - now)} name={ev.def.n}
        bar={<SegBar n={EVENT_MILESTONES.length} full={reached} part={next ? (pts - prev) / (next.pts - prev) : 1} />}
        sub={next ? <><b>{fmt(pts)}</b> / {fmt(next.pts)} {evWord(next.pts, ev.def)} do następnej nagrody</> : <>Wszystkie nagrody zdobyte · <b>{evText(pts, ev.def)}</b></>}
        btn="Zobacz" n={todo} onClick={onEvent} />
      {p && (
        <Row bg={dungeonBgUrl('wieza')} cls="season" icon={resUrl('przepustka')}
          eyebrow={`Przepustka · sezon ${season.n}`} time={tfmt(season.end - now)} name={season.name}
          bar={<span class="bar ar-bar"><i style={{ width: (inLvl / PASS.XP_PER_LVL) * 100 + '%' }} /></span>}
          sub={lvl >= PASS.LEVELS ? <><b>Poziom {lvl}/{PASS.LEVELS}</b> · ukończona</> : <><b>Poziom {lvl}/{PASS.LEVELS}</b> · do {lvl + 1}. poziomu {fmt(PASS.XP_PER_LVL - inLvl)} pkt</>}
          btn="Zobacz" n={claim} onClick={onPass} />
      )}
    </div>
  );
}
