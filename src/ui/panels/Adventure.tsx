// Nad zakładkami Przygody (Krainy · Lochy · Arena): wydarzenie i sezon w tym samym stylu — widać je od razu,
// niezależnie od tego, która podzakładka jest otwarta.
import { EVENT_MILESTONES, PASS } from '../../data';
import { dungeonBgUrl, resUrl } from '../../art/render';
import { eventIcon, eventOf, eventPts, eventReached, evText } from '../../engine/events';
import { passLevel, passUnclaimed, passXp, seasonOf } from '../../engine/shop';
import type { Game } from '../../engine/game';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';

/** Kafelek wydarzenia albo sezonu: tło, ikona, czas do końca, nazwa, postęp i przycisk. */
function Tile({ bg, cls, icon, eyebrow, name, sub, pct, btn, ready, onClick }: {
  bg: string; cls: string; icon: string; eyebrow: string; name: string; sub: preact.ComponentChildren; pct: number; btn: string; ready: boolean; onClick: () => void;
}) {
  return (
    <button class={`adv-tile ${cls}${ready ? ' ready' : ''}`} onClick={onClick} style={{ '--bg': `url(${bg})` } as Record<string, string>}>
      <span class="at-top"><Px src={icon} size={26} /><span class="eyebrow">{eyebrow}</span></span>
      <b class="at-name">{name}</b>
      <span class="at-sub">{sub}</span>
      <span class="bar"><i style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} /></span>
      <span class={`at-btn${ready ? ' on' : ''}`}>{btn}</span>
      {ready && <i class="tab-dot" aria-hidden="true" />}
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
  const evPct = next ? ((pts - prev) / (next.pts - prev)) * 100 : 100;

  const season = seasonOf(now);
  const p = game.s.pass;
  const lvl = p ? passLevel(p) : 0;
  const inLvl = p ? (lvl >= PASS.LEVELS ? PASS.XP_PER_LVL : passXp(p) - lvl * PASS.XP_PER_LVL) : 0;
  const un = p ? passUnclaimed(p, game.s) : null;
  const claim = un ? un.free + un.prem : 0;

  return (
    <div class="adv-banners">
      <Tile bg={dungeonBgUrl('ev_' + ev.kind)} cls={`ev-${ev.kind}`} icon={resUrl(eventIcon(ev.kind))}
        eyebrow={`Wydarzenie · ${tfmt(ev.end - now)}`} name={ev.def.n}
        sub={<><b>{evText(pts, ev.def)}</b>{next ? ` · do nagrody ${fmt(next.pts - pts)}` : ' · wszystko zdobyte'}</>}
        pct={evPct} btn={todo ? `Odbierz (${todo})` : 'Nagrody'} ready={todo > 0} onClick={onEvent} />
      {p && (
        <Tile bg={dungeonBgUrl('wieza')} cls="season" icon={resUrl('przepustka')}
          eyebrow={`Sezon ${season.n} · ${tfmt(season.end - now)}`} name={season.name}
          sub={<>Przepustka: <b>poziom {lvl}/{PASS.LEVELS}</b></>}
          pct={(inLvl / PASS.XP_PER_LVL) * 100} btn={claim ? `Odbierz (${claim})` : 'Przepustka'} ready={claim > 0} onClick={onPass} />
      )}
    </div>
  );
}
