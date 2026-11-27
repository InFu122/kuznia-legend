// Odtworzenie pojedynku policzonego przez serwer (arena, bitwa wojny klanów): ciosy, krytyki, uniki
// i umiejętności z przebiegu walki, paski życia ze „śladem”, zwolnione tempo przy ostatnim ciosie.
// Starszy serwer nie przysyła przebiegu (`ev`): wtedy widać same paski życia, jak dawniej.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { SKILLS } from '../../data';
import { dungeonBgUrl, skillUrl } from '../../art/render';
import type { DuelEv } from '../../engine/duel';
import { DUEL_FRAME_MS } from '../../engine/duel';
import type { SkillId } from '../../engine/types';
import type { DuelShow } from '../../save/server';
import { HeroSprite } from '../Arena';
import { Px } from '../Px';
import { fmtShort } from '../format';
import { play } from '../sound';

/** Odtworzenie jest 2× szybsze niż walka, a z „×2” 4×. Wybór „×2” gra pamięta. */
const BASE = 2;
const FAST_KEY = 'kl-duel-fast';
const readFast = () => { try { return localStorage.getItem(FAST_KEY) === '1'; } catch { return false; } };
const saveFast = (on: boolean) => { try { localStorage.setItem(FAST_KEY, on ? '1' : '0'); } catch { /* bez pamięci */ } };
/** Ostatnie pół sekundy walki w zwolnionym tempie. */
const SLOW_MS = 450;
/** Ile ms walki „ślad” na pasku życia zostaje w tyle. */
const TRAIL_MS = 650;

interface Fl { id: number; c: ComponentChildren; cls: string; x: number; y: number }
interface Cast { id: number; sk: SkillId }
type Side = 0 | 1;

/**
 * Zdrowie strony `side` w % w chwili `t` (ms walki). Klatki są co DUEL_FRAME_MS, a ostatnia przypada
 * na koniec walki `ms` (zwykle między pełnymi klatkami).
 */
export function hpAt(frames: [number, number][], t: number, side: Side, ms: number): number {
  const n = frames.length;
  const at = (i: number) => (i === n - 1 ? Math.max(ms, (n - 2) * DUEL_FRAME_MS) : i * DUEL_FRAME_MS);
  if (t >= at(n - 1)) return frames[n - 1][side];
  const i = Math.min(n - 2, Math.floor(Math.max(0, t) / DUEL_FRAME_MS));
  const k = Math.max(0, Math.min(1, (t - at(i)) / Math.max(1, at(i + 1) - at(i))));
  return frames[i][side] + (frames[i + 1][side] - frames[i][side]) * k;
}

/** Krótki efekt na postaci: klasa na chwilę (cios, trafienie). */
function bump(el: HTMLElement | null, cls: 'lunge' | 'hit', ms = 240) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/**
 * `summary` — linijka pod napisem Zwycięstwo/Porażka; `outro` — własne podsumowanie zamiast niego (arena);
 * `ko` — napis na koniec walki zamiast „Zwycięstwo!” / „Porażka” (np. przy rewanżu).
 */
export function DuelReplay({ f, summary, outro, ko: koText, title = 'Pojedynek', onDone }: {
  f: DuelShow; summary?: ComponentChildren; outro?: ComponentChildren; ko?: string; title?: string; onDone: () => void;
}) {
  const ev: DuelEv[] = f.ev ?? [];
  const [t, setT] = useState(0);
  const [ko, setKo] = useState(false);
  const [done, setDone] = useState(false);
  const [fast, setFast] = useState(readFast);
  const [fls, setFls] = useState<Fl[]>([]);
  const [casts, setCasts] = useState<[Cast | null, Cast | null]>([null, null]);
  const [shake, setShake] = useState(0);
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const run = useRef({ t: 0, i: 0, last: 0, id: 0, fast, over: false, flAt: 0, lane: [0, 0] });
  const fx = useRef({ shield: [0, 0], frozen: [0, 0], buff: [0, 0] });
  const timers = useRef<number[]>([]);
  run.current.fast = fast;

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const float = (side: Side, c: ComponentChildren, cls: string, force = false) => {
    const R = run.current;
    const now = performance.now();
    if (R.over || (!force && now - R.flAt < 70)) return;
    R.flAt = now;
    const id = ++R.id;
    // Trzy pasy na różnej wysokości po każdej stronie, żeby kolejne liczby nie nachodziły na siebie.
    const lane = R.lane[side] = (R.lane[side] + 1) % 3;
    const x = (side === 1 ? 56 : 10) + lane * 5 + Math.random() * 6;
    const y = 30 + lane * 15 + Math.random() * 4;
    const big = cls.includes('crit') || cls.includes('skill');
    setFls(l => (l.length > 6 && !force ? l : [...l.slice(-8), { id, c, cls, x, y }]));
    later(() => setFls(l => l.filter(z => z.id !== id)), big ? 1000 : 750);
  };
  const cast = (side: Side, sk: SkillId) => {
    const id = ++run.current.id;
    setCasts(c => { const n = c.slice() as [Cast | null, Cast | null]; n[side] = { id, sk }; return n; });
    later(() => setCasts(c => { if (c[side]?.id !== id) return c; const n = c.slice() as [Cast | null, Cast | null]; n[side] = null; return n; }), 1200);
  };

  const fire = (e: DuelEv) => {
    const [at, s, k, v] = e;
    const tg = (1 - s) as Side;
    const me = refs[s].current, foe = refs[tg].current;
    const num = (x: number) => fmtShort(x);
    switch (k) {
      case 'h':
        bump(me, 'lunge', 260); bump(foe, 'hit');
        float(tg, '−' + num(v), tg === 1 ? 'dmg' : 'hurt');
        play('hit');
        break;
      case 'c':
        bump(me, 'lunge', 260); bump(foe, 'hit');
        float(tg, <><small>KRYTYK</small>{num(v)}</>, tg === 1 ? 'crit' : 'crit hurt', true);
        setShake(x => x + 1);
        play('crit');
        break;
      case 'd':
        bump(me, 'lunge', 260);
        float(tg, 'Unik!', 'miss', true);
        play('dodge');
        break;
      case 'p':
        float(tg, '−' + num(v), 'pet');
        break;
      case 's': {
        const sk = e[4] as SkillId;
        const S = SKILLS[sk];
        if (!S) break;
        cast(s, sk);
        play('skill');
        const F = fx.current;
        if (S.kind === 'dmg') {
          bump(me, 'lunge', 260); bump(foe, 'hit');
          float(tg, num(v), 'skill', true);
          setShake(x => x + 1);
        } else if (S.kind === 'heal') float(s, '+' + num(v), 'heal', true);
        else if (S.kind === 'shield') F.shield[s] = at + S.dur;
        else if (S.kind === 'stun') F.frozen[tg] = at + v;
        else F.buff[s] = at + S.dur;
        break;
      }
    }
  };

  const finish = (skipped: boolean) => {
    const R = run.current;
    if (R.over) return;
    R.over = true;
    R.t = f.ms;
    setT(f.ms);
    setFls([]);
    setKo(true);
    play(f.win ? 'win' : 'lose');
    if (skipped) setDone(true);
    else later(() => setDone(true), 1000);
  };

  useEffect(() => {
    const R = run.current;
    let raf = 0;
    R.last = performance.now();
    const tick = (now: number) => {
      if (R.over) return;
      const dt = Math.max(0, Math.min(100, now - R.last));
      R.last = now;
      const slow = f.ms - R.t < SLOW_MS && ev.length ? 0.3 : 1;
      R.t = Math.min(f.ms, R.t + dt * BASE * (R.fast ? 2 : 1) * slow);
      while (R.i < ev.length && ev[R.i][0] <= R.t) fire(ev[R.i++]);
      setT(R.t);
      if (R.t >= f.ms) { finish(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); timers.current.forEach(clearTimeout); };
  }, []);

  const skip = () => { run.current.i = ev.length; finish(true); };
  const toggleFast = () => { setFast(x => { saveFast(!x); return !x; }); };

  const hp = (side: Side) => hpAt(f.frames, t, side, f.ms);
  const trail = (side: Side) => (ko ? hp(side) : Math.max(hp(side), hpAt(f.frames, t - TRAIL_MS, side, f.ms)));
  const F = fx.current;
  const st = (side: Side) => (ko ? 'dx-st' : `dx-st${F.shield[side] > t ? ' shield' : ''}${F.frozen[side] > t ? ' frozen' : ''}${F.buff[side] > t ? ' buff' : ''}`);
  const lost: Side = f.win ? 1 : 0;
  const who = [f.me, f.foe] as const;
  const actor = (side: Side) => (
    <div ref={refs[side]} class={`actor dx-a ${side ? 'dx-r' : 'dx-l'}${ko && lost === side ? ' dead' : ''}${ko && lost !== side ? ' won' : ''}${side && f.foe.ghost ? ' ghost' : ''}`}>
      <span class={side ? 'dx-flip' : 'dx-noflip'}><HeroSprite eq={who[side].look ?? {}} skin={who[side].sk} /></span>
      <span class={st(side)} aria-hidden="true" />
      {casts[side] && (
        <span key={casts[side]!.id} class={`dx-cast rb${SKILLS[casts[side]!.sk].r}`}>
          <Px src={skillUrl(casts[side]!.sk)} size={16} />{SKILLS[casts[side]!.sk].n}
        </span>
      )}
    </div>
  );
  const bar = (side: Side) => (
    <div class={`bar-side${side ? ' foe' : ''}`}>
      <div class="fname">{who[side].name}</div>
      <div class={`hp dx-hp${side ? ' foe' : ''}`}><s style={{ width: trail(side) + '%' }} /><i style={{ width: hp(side) + '%' }} /></div>
      <div class="hpnum">Moc {fmtShort(who[side].power)}</div>
    </div>
  );
  return (
    <>
      <div class="eyebrow">{title}</div>
      <div class="duel-box dx" style={{ '--bg': `url(${dungeonBgUrl('arena')})` } as Record<string, string>}>
        <div class="bars dx-bars">
          {bar(0)}
          <span class="dx-vs" aria-hidden="true">{ko ? '' : `${Math.round(t / 1000)} s`}</span>
          {bar(1)}
        </div>
        <div class={`stage duel dx-stage${shake ? ` sh${shake % 2}` : ''}`}>
          {actor(0)}
          {actor(1)}
          <div class="floats">
            {fls.map(x => <span key={x.id} class={`fl dx-fl ${x.cls}`} style={{ left: x.x + '%', top: x.y + '%' }}>{x.c}</span>)}
          </div>
          {ko && <div class={`dx-ko ${f.win ? 'win' : 'lose'}`} role="status">{koText ?? (f.win ? 'Zwycięstwo!' : 'Porażka')}</div>}
        </div>
      </div>
      {!done ? (
        <div class="dx-ctl">
          {ev.length > 0 && <button class={`btn small dx-fast${fast ? ' on' : ''}`} aria-pressed={fast} onClick={toggleFast}>×2</button>}
          <button class="btn small" onClick={skip}>Pomiń</button>
        </div>
      ) : (
        <>
          <div class={`duel-result dx-res ${f.win ? 'win' : 'lose'}`} role="status">
            {outro ?? <span class="dx-sum">{summary}</span>}
            <small>Walka trwała {Math.round(f.ms / 1000)} s · trafienia krytyczne {f.crits[0]}:{f.crits[1]} · umiejętności {f.skills[0]}:{f.skills[1]}</small>
          </div>
          <button class="btn primary" onClick={onDone}>Dalej</button>
        </>
      )}
    </>
  );
}
