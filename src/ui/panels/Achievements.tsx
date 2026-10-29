// Osiągnięcia (zakładka w oknie Zadań) i Kolekcja Kowala (karta w Kodeksie).
import { useState } from 'preact/hooks';
import { ACHIEVEMENTS, ACH_IDS, CODEX_PCT, ORES, SLOTS, SLOT_ORDER } from '../../data';
import { itemUrl, oreUrl } from '../../art/render';
import { ALL_KINDS, CODEX_TOTAL, achClaimed, achGoalText, achReached, achReward, achValue, codexOre } from '../../engine/achievements';
import type { Game } from '../../engine/game';
import { f1, fmt } from '../format';
import { Px } from '../Px';
import { rewardText } from '../texts';

export function AchievementsView({ game }: { game: Game }) {
  const s = game.s;
  const list = ACH_IDS.map(id => ({ id, got: achClaimed(s, id), reached: achReached(s, id), A: ACHIEVEMENTS[id] }))
    .sort((a, b) => Number(b.reached > b.got) - Number(a.reached > a.got) || Number(a.got >= a.A.tiers.length) - Number(b.got >= b.A.tiers.length));
  const done = ACH_IDS.reduce((n, id) => n + achClaimed(s, id), 0);
  const all = ACH_IDS.reduce((n, id) => n + ACHIEVEMENTS[id].tiers.length, 0);
  return (
    <>
      <p class="sub">Długie cele na całą grę. Postęp zostaje także po Dziedzictwie. Zdobyte progi: <b class="num">{done}/{all}</b>.</p>
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
                <div class="cname">{A.n} <span class="achpips" aria-label={`${got} z ${A.tiers.length}`}>{A.tiers.map((_, i) => <i key={i} class={i < got ? 'on' : i < reached ? 'ready' : ''} />)}</span></div>
                <div class="tech-cost">{max ? 'Wszystkie progi zdobyte' : `${achGoalText(id, t)} · ${id === 'rzadkosc' ? (v >= goal ? 'gotowe' : 'jeszcze nie') : `${fmt(Math.min(v, goal))}/${fmt(goal)}`}`}</div>
                {!max && id !== 'rzadkosc' && <div class="bar thin"><i style={{ width: Math.min(100, (v / goal) * 100) + '%' }} /></div>}
                {!max && <div class="tech-cost">Nagroda: {rewardText(achReward(s, t))}</div>}
              </div>
              {ready && <button class="btn small primary" onClick={() => game.claimAch(id)}>Odbierz</button>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Kolekcja Kowala w Kodeksie: odkryte modele według rud, z podglądem rodzajów. */
export function CodexCard({ game }: { game: Game }) {
  const s = game.s;
  const [open, setOpen] = useState<number | null>(null);
  const n = s.codex.length;
  return (
    <section class="card">
      <div class="row"><div class="eyebrow">Kolekcja Kowala</div><span class="num">{n}/{CODEX_TOTAL}</span></div>
      <div class="h">+{f1(n * CODEX_PCT)}% obrażeń i zdrowia</div>
      <p class="sub">Każdy nowy model przedmiotu (rodzaj × ruda) daje na zawsze +{String(CODEX_PCT).replace('.', ',')}% obrażeń i zdrowia. Kolekcja zostaje po Dziedzictwie.</p>
      <ul class="codexores">
        {ORES.map((o, i) => {
          const c = codexOre(s, i);
          return (
            <li key={i}>
              <button class={`codexore${open === i ? ' on' : ''}`} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <Px src={oreUrl(i)} size={22} />
                <span class="cname">{o.n}</span>
                <span class="bar thin"><i style={{ width: (c / ALL_KINDS.length) * 100 + '%' }} /></span>
                <span class="num">{c}/{ALL_KINDS.length}</span>
              </button>
              {open === i && (
                <div class="codexgrid">
                  {SLOT_ORDER.flatMap(sl => SLOTS[sl].kinds.map(([k]) => {
                    const have = s.codex.includes(`${k}|${i}`);
                    return <span key={k} class={`cx${have ? ' have' : ''}`} title={have ? k : '?'}><Px src={itemUrl(k, i, have ? undefined : 0)} size={24} /></span>;
                  }))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
