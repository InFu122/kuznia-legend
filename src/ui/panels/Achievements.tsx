// Osiągnięcia (zakładka w oknie Zadań) i Kolekcja Kowala (karta w Kodeksie).
import { useState } from 'preact/hooks';
import { ACHIEVEMENTS, ACH_IDS, CODEX_PCT, ORES, ORE_ORDER, SLOTS, SLOT_ORDER, achFame } from '../../data';
import { itemUrl, oreUrl, resUrl } from '../../art/render';
import { nextSmithTitle, smithTitle } from '../../engine/formulas';
import { ALL_KINDS, CODEX_TOTAL, achClaimed, achGoalText, achReached, achReward, achValue, codexOre, roman } from '../../engine/achievements';
import { RewardIcons } from '../RewardIcons';
import type { Game } from '../../engine/game';
import { f1, fmt } from '../format';
import { Px } from '../Px';

export function AchievementsView({ game }: { game: Game }) {
  const s = game.s;
  const list = ACH_IDS.map(id => ({ id, got: achClaimed(s, id), reached: achReached(s, id), A: ACHIEVEMENTS[id] }))
    .sort((a, b) => Number(b.reached > b.got) - Number(a.reached > a.got) || Number(a.got >= a.A.tiers.length) - Number(b.got >= b.A.tiers.length));
  const done = ACH_IDS.reduce((n, id) => n + achClaimed(s, id), 0);
  const all = ACH_IDS.reduce((n, id) => n + ACHIEVEMENTS[id].tiers.length, 0);
  const fame = s.smith.fame;
  const title = smithTitle(fame);
  const next = nextSmithTitle(fame);
  return (
    <>
      <div class="ach-head">
        <Px src={resUrl('trofeum')} size={36} />
        <div class="ah-main">
          <div class="eyebrow">Piętno Kowala · Sława {fmt(fame)}</div>
          <div class="h">{title.n}</div>
          {next ? (
            <>
              <div class="bar thin"><i style={{ width: Math.min(100, ((fame - title.at) / (next.at - title.at)) * 100) + '%' }} /></div>
              <small>do tytułu {next.n}: {fmt(next.at - fame)} Sławy</small>
            </>
          ) : <small>Najwyższy tytuł kowala</small>}
        </div>
        <span class="ah-num" aria-label={`Zdobyte progi: ${done} z ${all}`}><b>{done}</b>/{all}</span>
      </div>
      <p class="sub">Długie cele na całą grę. Każdy próg daje nagrodę i Sławę kowala (wyższe progi, więcej), a Sława daje tytuły.</p>
      <ul class="clist achlist">
        {list.map(({ id, got, reached, A }) => {
          const max = got >= A.tiers.length;
          const t = Math.min(got, A.tiers.length - 1);
          const goal = A.tiers[t];
          const v = achValue(s, id);
          const ready = reached > got;
          return (
            <li key={id} class={ready ? 'ready' : max ? 'max' : ''}>
              <div class="cmain">
                <div class="cname">{A.n} <span class="ach-tier">{got ? roman(got) : '—'}<small>/{roman(A.tiers.length)}</small></span> <span class="achpips" aria-label={`${got} z ${A.tiers.length}`}>{A.tiers.map((_, i) => <i key={i} class={i < got ? 'on' : i < reached ? 'ready' : ''} />)}</span></div>
                <div class="tech-cost">{max ? 'Wszystkie progi zdobyte' : `${achGoalText(id, t)} · ${id === 'rzadkosc' ? (v >= goal ? 'gotowe' : 'jeszcze nie') : `${fmt(Math.min(v, goal))}/${fmt(goal)}`}`}</div>
                {!max && id !== 'rzadkosc' && <div class="bar thin"><i style={{ width: Math.min(100, (v / goal) * 100) + '%' }} /></div>}
                {!max && <div class="ach-rew"><span class="tech-cost">Próg {roman(t + 1)}:</span><RewardIcons r={achReward(s, t)} size={16} /><span class="ach-fame">+{achFame(t)} Sławy</span></div>}
              </div>
              {ready && <button class="btn small primary" onClick={() => game.claimAch(id)}>Odbierz</button>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Kolekcja Kowala w Kodeksie: rudy jako kafelki w dwóch kolumnach; dotknięcie rozwija modele pod rzędem kafelka. */
export function CodexCard({ game }: { game: Game }) {
  const s = game.s;
  const [open, setOpen] = useState<number | null>(null);
  const n = s.codex.length;
  const openRow = open === null ? -1 : Math.floor(ORE_ORDER.indexOf(open) / 2);
  return (
    <section class="card">
      <div class="row"><div class="eyebrow">Kolekcja Kowala</div><span class="num">{n}/{CODEX_TOTAL}</span></div>
      <div class="h">+{f1(n * CODEX_PCT)}% obrażeń i zdrowia</div>
      <p class="sub">Każdy nowy model przedmiotu (rodzaj × ruda) daje na zawsze +{String(CODEX_PCT).replace('.', ',')}% obrażeń i zdrowia.</p>
      <ul class="codexores tiles">
        {ORE_ORDER.flatMap((i, idx) => {
          const o = ORES[i];
          const c = codexOre(s, i);
          const rowEnd = idx % 2 === 1 || idx === ORE_ORDER.length - 1;
          const out = [
            <li key={i}>
              <button class={`codexore${open === i ? ' on' : ''}${c === ALL_KINDS.length ? ' full' : ''}`} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <Px src={oreUrl(i)} size={22} />
                <span class="cname">{o.n}</span>
                <span class="num">{c}/{ALL_KINDS.length}</span>
                <span class="bar thin"><i style={{ width: (c / ALL_KINDS.length) * 100 + '%' }} /></span>
              </button>
            </li>,
          ];
          if (rowEnd && open !== null && Math.floor(idx / 2) === openRow) {
            out.push(
              <li key="grid" class="cx-open">
                <div class="codexgrid">
                  {SLOT_ORDER.flatMap(sl => SLOTS[sl].kinds.map(([k]) => {
                    const have = s.codex.includes(`${k}|${open}`);
                    return <span key={k} class={`cx${have ? ' have' : ''}`} title={have ? k : '?'}><Px src={itemUrl(k, open, have ? undefined : 0)} size={24} /></span>;
                  }))}
                </div>
              </li>,
            );
          }
          return out;
        })}
      </ul>
    </section>
  );
}
