// Przekuwanie w oknie założonego przedmiotu: wybór statystyki → potwierdzenie (co i za ile) → losowanie jak w automacie
// (nazwy i wartości migają coraz wolniej), wynik „nabija się” od dołu zakresu do wylosowanej wartości, pasek jakości
// rzutu zapala się kolorem (słaby / dobry / bardzo dobry / wspaniały) → wybór: zostaw starą albo zachowaj nową.
import { useEffect, useRef, useState } from 'preact/hooks';
import { B, ORES, SUBS, SUB_IDS, subMult } from '../data';
import { oreUrl, resUrl } from '../art/render';
import type { Game } from '../engine/game';
import { reforgeBlock, reforgeCost, subText } from '../engine/runes';
import type { Item, SlotId, SubId } from '../engine/types';
import { getLink } from '../save/server';
import { buzzRank } from './haptics';
import { fmt } from './format';
import { Px } from './Px';
import { play } from './sound';
import { Note, errText } from './panels/ClanLife';

type Sub = Item['subs'][number];
type Phase = { k: 'list' } | { k: 'ask'; i: number } | { k: 'spin'; i: number; item: Item | null } | { k: 'pick'; i: number; item: Item };

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const num = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

/** Zakres statystyki dla rzadkości przedmiotu. */
function range(it: Item, id: SubId): [number, number] {
  const m = subMult(it.r);
  return [Math.round(SUBS[id].lo * m * 10) / 10, Math.round(SUBS[id].hi * m * 10) / 10];
}
/** Jakość rzutu 0–1: gdzie w zakresie wypadła wartość. */
export function rollQuality(it: Item, x: Sub): number {
  const [lo, hi] = range(it, x.id);
  return hi > lo ? Math.max(0, Math.min(1, (x.v - lo) / (hi - lo))) : 1;
}
const TIERS = [
  { at: 0.9, k: 'top', n: 'Wspaniały rzut!', rank: 8 },
  { at: 0.7, k: 'good', n: 'Bardzo dobry rzut', rank: 6 },
  { at: 0.4, k: 'ok', n: 'Dobry rzut', rank: 3 },
  { at: 0, k: 'low', n: 'Słaby rzut', rank: 0 },
] as const;
const tierOf = (q: number) => TIERS.find(t => q >= t.at)!;
const TIER_COL: Record<string, string> = { low: '#8a8178', ok: '#4aa3ff', good: '#a77bff', top: '#ffd35a' };

const AnvilIcon = () => <Px src={resUrl('kowadlo')} size={18} />;

/** Losowanie: migające statystyki (dopóki nie ma wyniku), potem zwalnianie, lądowanie i nabijanie wartości. */
function Reel({ it, i, result, vibe, onDone }: { it: Item; i: number; result: Sub | null; vibe: boolean; onDone: () => void }) {
  const others = new Set(it.subs.filter((_, j) => j !== i).map(x => x.id));
  const pool = SUB_IDS.filter(id => !others.has(id));
  const rand = (): Sub => { const id = pool[Math.floor(Math.random() * pool.length)]; const [lo, hi] = range(it, id); return { id, v: Math.round((lo + Math.random() * (hi - lo)) * 10) / 10 }; };
  const [shown, setShown] = useState<Sub>(rand);
  const [stage, setStage] = useState<'spin' | 'count' | 'done'>('spin');
  const [val, setVal] = useState(0);
  const res = useRef(result);
  res.current = result;
  const skip = useRef(false);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    const SLOW = [70, 85, 100, 120, 145, 175, 210, 250, 300, 360];
    // Koniec: wynik, ocena rzutu, wibracja i dźwięk tym mocniejsze, im lepszy rzut.
    const finish = (r: Sub) => {
      if (!alive) return;
      const T = tierOf(rollQuality(it, r));
      setShown(r); setVal(r.v); setStage('done');
      void buzzRank(T.rank, vibe);
      play(T.rank >= 6 ? 'dropRare' : 'drop');
    };
    // Lądowanie: wartość nabija się od dołu zakresu do wyniku (jak procenty w Albionie); lepszy rzut nabija się dłużej.
    const count = (r: Sub) => {
      if (calm() || skip.current) { finish(r); return; }
      const [lo] = range(it, r.id);
      const D = 650 + rollQuality(it, r) * 650;
      setShown(r); setVal(lo); setStage('count');
      const t0 = performance.now();
      const tick = (now: number) => {
        if (!alive) return;
        const p = Math.min(1, (now - t0) / D);
        setVal(lo + (r.v - lo) * (1 - Math.pow(1 - p, 3)));
        if (p < 1 && !skip.current) raf = requestAnimationFrame(tick); else finish(r);
      };
      raf = requestAnimationFrame(tick);
    };
    // Kręcenie: szybko, dopóki nie ma wyniku (serwer); potem coraz wolniej (10 kroków) i stop.
    let k = 0;
    const step = () => {
      if (!alive) return;
      const r = res.current;
      if (r && (skip.current || k >= SLOW.length || calm())) { count(r); return; }
      setShown(rand());
      if (r) { play('drop'); k++; }
      t = setTimeout(step, r ? SLOW[Math.min(k, SLOW.length - 1)] : 55);
    };
    step();
    return () => { alive = false; if (t) clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => { if (stage === 'done') { const t = setTimeout(onDone, 350); return () => clearTimeout(t); } }, [stage]);

  const x = shown;
  const q = stage !== 'spin' ? rollQuality(it, x) : 0;
  const T = tierOf(q);
  const live = stage === 'count' || stage === 'done' ? rollQuality(it, { id: x.id, v: val }) : 0;
  return (
    <div class={`rf-reel ${stage}${stage === 'done' ? ' t-' + T.k : ''}`} onClick={() => { skip.current = true; }}>
      <div class="rf-slot" aria-live="polite">
        <span class="rf-name">{SUBS[x.id].n}</span>
        <b class="rf-val">+{num(stage === 'count' || stage === 'done' ? val : x.v)}{SUBS[x.id].u}</b>
      </div>
      <div class="rf-q" aria-hidden={stage === 'spin'}>
        <div class="rf-qbar"><i style={{ width: (stage === 'spin' ? 0 : live * 100) + '%', background: TIER_COL[tierOf(live).k] }} /></div>
        <small>{stage === 'done' ? <><b>{T.n}</b> · {Math.round(q * 100)}% zakresu ({num(range(it, x.id)[0])}–{num(range(it, x.id)[1])}{SUBS[x.id].u})</> : stage === 'spin' ? 'Losowanie… (dotknij, by przyspieszyć)' : ' '}</small>
      </div>
    </div>
  );
}

/** Przekuwanie w oknie założonego przedmiotu. */
export function Reforge({ game, it }: { game: Game; it: Item }) {
  const [ph, setPh] = useState<Phase>({ k: 'list' });
  const [msg, setMsg] = useState('');
  const s = game.s;
  if (s.forge.lvl < B.REFORGE_FORGE_LVL) return <p class="sub">Przekuwanie statystyk dodatkowych od {B.REFORGE_FORGE_LVL}. poziomu kuźni.</p>;
  if (!it.subs.length) return null;
  const cur = s.eq[it.slot] ?? it;
  const block = reforgeBlock(s, cur);
  const c = reforgeCost(s, cur);
  const cost = (
    <span class="rf-cost"><Px src={oreUrl(c.ore)} size={16} />{fmt(c.n)} {ORES[c.ore].n} <Px src={resUrl('zloto')} size={16} />{fmt(c.gold)}</span>
  );

  const roll = async (i: number) => {
    setMsg('');
    setPh({ k: 'spin', i, item: null });
    try {
      if (!game.net) {
        const x = game.reforge(cur.slot as SlotId, i);
        if (!x) { setMsg('Nie udało się.'); setPh({ k: 'list' }); return; }
        setPh({ k: 'spin', i, item: x });
        return;
      }
      const l = getLink();
      if (!l?.online) { setMsg('Przekuwanie działa po połączeniu z serwerem.'); setPh({ k: 'list' }); return; }
      if (!game.payReforge(cur.slot)) { setMsg('Za mało rudy albo złota.'); setPh({ k: 'list' }); return; }
      try { setPh({ k: 'spin', i, item: (await l.reforge(cur, i)).item }); } catch (e) { game.refundReforge(cur.slot); throw e; }
    } catch (e) { setMsg(errText(e)); setPh({ k: 'list' }); }
  };

  if (ph.k === 'spin' || ph.k === 'pick') {
    const old = cur.subs[ph.i];
    const neu = ph.item ? ph.item.subs[ph.i] : null;
    const same = neu && neu.id === old.id;
    const d = same ? neu.v - old.v : 0;
    return (
      <div class="reforge rf-live">
        <div class="eyebrow">Przekuwanie · {SUBS[old.id].n}</div>
        <Reel it={cur} i={ph.i} result={neu} vibe={s.opts.vibe !== false} onDone={() => ph.item && setPh({ k: 'pick', i: ph.i, item: ph.item })} />
        {ph.k === 'pick' && neu && (
          <>
            <p class="sub rf-cmp">
              {same ? (d === 0 ? 'Tyle samo co wcześniej.' : <>Wobec obecnej: <b class={d > 0 ? 'up' : 'down'}>{d > 0 ? '▲ +' : '▼ −'}{num(Math.abs(d))}{SUBS[neu.id].u}</b></>)
                : <>Inna statystyka niż obecna ({subText(old)}).</>}
            </p>
            <div class="rf-pair">
              <button class="btn" onClick={() => setPh({ k: 'list' })}><small>Zostaw starą</small><b>{subText(old)}</b></button>
              <button class="btn primary" onClick={() => { game.acceptReforge(ph.item); setPh({ k: 'list' }); setMsg('Przedmiot przekuty.'); }}><small>Zachowaj nową</small><b>{subText(neu)}</b></button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div class="reforge">
      <div class="row"><div class="eyebrow">Przekuwanie</div>{cost}</div>
      <p class="sub rf-how">Losujesz od nowa jedną statystykę. Po losowaniu wybierasz, którą wersję zostawić.</p>
      <ul class="rf-list">
        {cur.subs.map((x, i) => (
          <li key={i} class={ph.k === 'ask' && ph.i === i ? 'ask' : ''}>
            <span>{subText(x)} <small class="rf-qs" title="Jakość rzutu: gdzie w zakresie wypadła wartość">{Math.round(rollQuality(cur, x) * 100)}%</small></span>
            {ph.k === 'ask' && ph.i === i ? null
              : <button class="btn small rf-go" disabled={!!block} onClick={() => setPh({ k: 'ask', i })}><AnvilIcon />Przekuj</button>}
            {ph.k === 'ask' && ph.i === i && (
              <div class="rf-ask" role="alertdialog" aria-label="Potwierdź przekucie">
                <p>Przekuć <b>{subText(x)}</b>? Zapłacisz {cost}. Starą wersję możesz po losowaniu zachować.</p>
                <div class="rf-ask-btns">
                  <button class="btn small" onClick={() => setPh({ k: 'list' })}>Nie</button>
                  <button class="btn small rf-go" onClick={() => void roll(i)}><AnvilIcon />Tak, przekuj</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Note msg={msg || (block && block.startsWith('za mało') ? `Brakuje: ${block.replace('za mało: ', '').replace('za mało ', '')}.` : '')} />
    </div>
  );
}
