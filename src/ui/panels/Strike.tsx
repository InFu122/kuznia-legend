// Atak na bossa klanowego i smoka jako krótka scena: bohater zadaje serię ciosów, które razem dają
// obrażenia policzone przez serwer, potem ocena ciosu, przełamanie fazy albo pokonanie i karta wyniku
// (ranking, rekord, łup z ataku, cios ostateczny). Same obrażenia i nagrody liczy serwer.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../../engine/game';
import type { Reward } from '../../engine/types';
import { HeroSprite } from '../Arena';
import { Px } from '../Px';
import { fmt, fmtShort } from '../format';
import { sparks } from '../fx';
import { buzzRank } from '../haptics';
import { RewardIcons, RewardTiles } from '../RewardIcons';
import { play } from '../sound';
import { ChestIcon } from './ClanUi';

/** Przeciwnik na scenie (przed atakiem). */
export interface StrikeFoe { name: string; img: string; size: number; hp: number; max: number }
/** Wynik ataku do pokazania. `broke` — przełamana faza smoka, `killed` — pokonany boss albo smok. */
export interface StrikeRun {
  id: number;
  kind: 'boss' | 'raid';
  foe: StrikeFoe;
  dmg: number; q?: number; bonus: number; broke: boolean; killed: boolean;
  base: Reward; loot: Reward | null; last: Reward | null;
  rank: [number, number]; passed: string[]; record: boolean;
}

/** Ocena ciosu z losowania obrażeń (0–1: od najsłabszego do najmocniejszego w zakresie ±15%). */
export function quality(q: number | undefined): { n: string; t: number } | null {
  if (typeof q !== 'number') return null;
  return q >= 0.9 ? { n: 'Idealny cios!', t: 3 } : q >= 0.65 ? { n: 'Świetny cios!', t: 2 } : q >= 0.35 ? { n: 'Dobry cios', t: 1 } : { n: 'Cios', t: 0 };
}

/** Części serii ciosów: pięć zwykłych i mocniejszy ostatni, razem dokładnie `dmg`. */
export function splitHits(dmg: number, rnd: () => number = Math.random): number[] {
  const w = [0.11, 0.12, 0.13, 0.14, 0.15, 0.35].map(x => x * (0.85 + 0.3 * rnd()));
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map(x => Math.floor((dmg * x) / sum));
  parts[parts.length - 1] += dmg - parts.reduce((a, b) => a + b, 0);
  return parts;
}

/** Kto został wyprzedzony w rankingu obrażeń (z listy przed atakiem). */
export function overtaken(top: { n: string; d: number; me: boolean }[], before: number, after: number): string[] {
  return top.filter(x => !x.me && x.d > before && x.d < after).map(x => x.n);
}

/** Rekord ciosu (osobno boss i smok) zapamiętany na tym urządzeniu. Zwraca, czy to nowy rekord. */
export function bumpRecord(kind: 'boss' | 'raid', dmg: number): boolean {
  try {
    const k = 'kl-best-' + kind;
    const best = Number(localStorage.getItem(k)) || 0;
    if (dmg > best) localStorage.setItem(k, String(dmg));
    return best > 0 && dmg > best;
  } catch { return false; }
}

const HIT_AT = [0, 230, 460, 690, 920, 1300];
const STAMP_AT = 1550;
const DOWN_AT = 2500;
/** Jak długo trwa scena (potem znów widać aktualnego przeciwnika). */
export const strikeMs = (r: StrikeRun) => (r.broke || r.killed ? 4400 : 2900);

/** Stan sceny: aktualny wynik i czy scena jeszcze trwa (wtedy karta pokazuje przeciwnika sprzed ataku). */
export function useStrike() {
  const [run, setRun] = useState<StrikeRun | null>(null);
  const [active, setActive] = useState(false);
  const t = useRef(0);
  const start = (r: StrikeRun) => {
    setRun(r);
    setActive(true);
    clearTimeout(t.current);
    t.current = window.setTimeout(() => setActive(false), strikeMs(r));
  };
  useEffect(() => () => clearTimeout(t.current), []);
  return { run, active, start };
}

interface Fl { id: number; text: string; cls: string; x: number; y: number }

/** Scena walki: bohater, przeciwnik, seria ciosów i pasek życia. `foe` — aktualny przeciwnik (bez sceny). */
export function StrikeStage({ game, foe, run, active, busy, label, downText }: {
  game: Game; foe: StrikeFoe; run: StrikeRun | null; active: boolean; busy: boolean;
  label: (hp: number, max: number) => ComponentChildren; downText: string;
}) {
  const shown = active && run ? run.foe : foe;
  const [hp, setHp] = useState(shown.hp);
  const [trail, setTrail] = useState(shown.hp);
  const [combo, setCombo] = useState(0);
  const [fls, setFls] = useState<Fl[]>([]);
  const [stamp, setStamp] = useState(false);
  const [down, setDown] = useState(false);
  const [flash, setFlash] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const vibe = game.s.opts.vibe !== false;

  // Bez sceny pasek pokazuje aktualne zdrowie.
  useEffect(() => { if (!active) { setHp(foe.hp); setTrail(foe.hp); setCombo(0); setStamp(false); setDown(false); } }, [active, foe.hp, foe.max, foe.name]);

  useEffect(() => {
    if (!run || !active) return;
    const ts: number[] = [];
    const at = (ms: number, fn: () => void) => ts.push(window.setTimeout(fn, ms));
    const bump = (el: HTMLElement | null, cls: string, ms: number) => {
      if (!el) return;
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
      at(ms, () => el.classList.remove(cls));
    };
    const parts = splitHits(run.dmg);
    let left = run.foe.hp;
    setHp(left); setTrail(left); setCombo(0); setStamp(false); setDown(false); setFls([]);
    parts.forEach((p, i) => at(HIT_AT[i], () => {
      const fin = i === parts.length - 1;
      bump(heroRef.current, 'lunge', 260);
      bump(foeRef.current, 'hit', 300);
      left = Math.max(0, left - p);
      setHp(left);
      at(380, () => setTrail(left));
      setCombo(i + 1);
      const id = Date.now() + i;
      setFls(l => [...l.slice(-6), { id, text: '−' + fmtShort(p), cls: fin ? 'fin' : 'dmg', x: 40 + (i % 3) * 7 + Math.random() * 5, y: 14 + ((i * 37) % 30) }]);
      at(fin ? 1100 : 800, () => setFls(l => l.filter(z => z.id !== id)));
      if (fin) {
        setFlash(x => x + 1);
        play('crit');
        const qq = quality(run.q);
        if (qq && qq.t >= 2) void buzzRank(qq.t + 1, vibe);
      } else play('hit');
    }));
    at(STAMP_AT, () => setStamp(true));
    if (run.broke || run.killed) at(DOWN_AT, () => {
      setDown(true);
      play('kill');
      sparks(boxRef.current, run.killed ? 6 : 4);
      void buzzRank(run.killed ? 7 : 5, vibe);
    });
    return () => ts.forEach(clearTimeout);
  }, [run?.id]);

  const q = run && active ? quality(run.q) : null;
  const pct = (x: number) => Math.max(0, Math.min(100, (x / Math.max(1, shown.max)) * 100));
  return (
    <>
      <div ref={boxRef} class={`sk-stage${flash ? ` fl${flash % 2}` : ''}`}>
        <div ref={heroRef} class={`sk-hero${busy ? ' wind' : ''}`}>
          <HeroSprite eq={game.s.eq} skin={game.s.look.skin} />
        </div>
        <div ref={foeRef} class={`sk-foe${down ? ' down' : ''}`}>
          <Px src={shown.img} size={shown.size} alt={shown.name} />
        </div>
        <div class="floats">
          {fls.map(x => <span key={x.id} class={`fl sk-fl ${x.cls}`} style={{ left: x.x + '%', top: x.y + '%' }}>{x.text}</span>)}
        </div>
        {active && combo > 1 && !stamp && <span class="sk-combo" key={combo}>×{combo}</span>}
        {active && run && stamp && !down && (
          <div class={`sk-stamp q${q?.t ?? 1}`} role="status">
            {q && <small>{q.n}</small>}
            <b>−{fmtShort(run.dmg)}</b>
          </div>
        )}
        {active && down && <div class="sk-down" role="status">{downText}</div>}
      </div>
      <div class="cb-hp">
        <div class="bar big cb-hpbar sk-hp" role="progressbar" aria-label={`Zdrowie: ${shown.name}`} aria-valuenow={Math.round(pct(hp))} aria-valuemin={0} aria-valuemax={100}>
          <s style={{ width: pct(trail) + '%' }} /><i style={{ width: pct(hp) + '%' }} />
        </div>
        <span class="num">{label(Math.round(hp), shown.max)}</span>
      </div>
    </>
  );
}

/** Skrzynia, która po chwili się otwiera i pokazuje nagrodę. */
function Chest({ title, sub, r, tier, delay }: { title: string; sub: string; r: Reward; tier: number; delay: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => { setOpen(true); play('rare'); }, delay); return () => clearTimeout(t); }, []);
  return (
    <div class={`sk-chest t${tier}${open ? ' open' : ''}`} style={{ '--d': delay - 700 + 'ms' } as Record<string, string>}>
      <span class="sk-chest-ic"><ChestIcon tier={tier} state={open ? 'got' : 'open'} size={46} /></span>
      <div class="cmain">
        <b>{title}</b>
        {open ? <RewardTiles r={r} /> : <small>{sub}</small>}
      </div>
    </div>
  );
}

/** Karta wyniku ataku pod przyciskiem. */
export function StrikeResult({ run, what }: { run: StrikeRun; what: string }) {
  const q = quality(run.q);
  const share = Math.min(100, (run.dmg / Math.max(1, run.foe.max)) * 100);
  const [from, to] = run.rank;
  const up = to > 0 && (from === 0 || to < from);
  const base = run.killed || run.broke ? DOWN_AT + 600 : STAMP_AT + 300;
  const ref = useRef<HTMLElement>(null);
  // Gdy scena się kończy, karta wyniku wjeżdża na ekran (zwykle jest pod przyciskiem ataku).
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), base);
    return () => clearTimeout(t);
  }, [run.id]);
  return (
    <section ref={ref} class="card sk-res" key={run.id} style={{ '--d': STAMP_AT + 'ms' } as Record<string, string>}>
      <div class="sk-res-top">
        {q && <span class={`sk-q q${q.t}`}>{q.n}</span>}
        <b class="num">−{fmt(run.dmg)}</b>
        <small>{share >= 0.1 ? share.toFixed(share < 10 ? 1 : 0).replace('.', ',') : '<0,1'}% życia {what}{run.bonus > 0 ? ` · w tym +${Math.round(run.bonus * 100)}% za słabość` : ''}</small>
      </div>
      {(run.record || up) && (
        <div class="sk-badges">
          {run.record && <span class="sk-badge rec">Nowy rekord ciosu!</span>}
          {up && <span class="sk-badge up">{from ? `Ranking: ${from}. → ${to}. miejsce` : `Ranking: ${to}. miejsce`}</span>}
        </div>
      )}
      {run.passed.length > 0 && <p class="sk-pass">Wyprzedzasz: <b>{run.passed.slice(0, 3).join(', ')}</b>{run.passed.length > 3 ? ` i ${run.passed.length - 3} innych` : ''}</p>}
      <div class="sk-gain"><small>Za atak</small><RewardIcons r={run.base} size={18} /></div>
      {(run.killed || run.broke) && (
        <p class="sk-pass">{run.killed
          ? `${run.kind === 'raid' ? 'Smok pokonany! Wielkie skrzynie' : 'Boss pokonany! Skrzynie'} trafiają do wszystkich, którzy walczyli.`
          : 'Faza przełamana! Skrzynie z rudą dostają wszyscy, którzy w niej walczyli.'}</p>
      )}
      {run.loot && <Chest title="Łup z ataku!" sub="Otwieranie…" r={run.loot} tier={2} delay={base + 700} />}
      {run.last && <Chest title="Cios ostateczny!" sub={run.killed ? `Dobijasz: ${run.foe.name}` : 'Przełamujesz fazę smoka'} r={run.last} tier={4} delay={base + (run.loot ? 1500 : 700)} />}
    </section>
  );
}
