// Okno decyzji o nowym przedmiocie (wytop, zatrzymany auto-wytop, skrzynia bossa, Zbrojownia):
// animacja dropu, nowy przedmiot obok założonego, różnice statystyk i przyciski Załóż / Sprzedaj.
import { useEffect, useRef, useState } from 'preact/hooks';
import { ELEM, ORES, RAR, SETS, SLOTS, SUBS } from '../data';
import { itemUrl, resUrl } from '../art/render';
import { sparks } from './fx';
import { play } from './sound';
import { sellFor } from '../engine/forge';
import { dist, itemName, mainVal, maxJump } from '../engine/formulas';
import type { Game } from '../engine/game';
import { techMods } from '../engine/mods';
import type { Item, SubId } from '../engine/types';
import { ServerError, getLink } from '../save/server';
import { f1, fmt, pct } from './format';
import { ItemCard } from './ItemCard';
import { Px } from './Px';

/** „Pochwal się dropem”: karta przedmiotu Mitycznego lub Boskiego na czacie globalnym. */
export function Brag({ game, it }: { game: Game; it: Item }) {
  const [msg, setMsg] = useState('');
  if (!game.net || it.r < 5 || typeof it.sx !== 'number') return null;
  const send = () => {
    const link = getLink();
    if (!link?.online) { setMsg('Brak połączenia z serwerem.'); return; }
    link.chatDrop(it, true).then(() => setMsg('Wysłano na czat globalny!')).catch(e => setMsg(e instanceof ServerError ? e.message : 'Nie udało się wysłać.'));
  };
  return (
    <div class="brag">
      {msg ? <span class="sub" role="status">{msg}</span> : <button class="btn small" onClick={send}>Pochwal się na czacie globalnym</button>}
    </div>
  );
}

const sign = (v: number, f: (n: number) => string = fmt) => (v > 0 ? '+' : v < 0 ? '−' : '±') + f(Math.abs(v));
const Diff = ({ v, f, on = true }: { v: number; f?: (n: number) => string; on?: boolean }) => (!on || Math.abs(v) < 0.05 ? null : <small class={v > 0 ? 'up' : 'down'}>{sign(v, f)}</small>);

/** Tabela: założony przedmiot obok nowego. */
function Compare({ cur, it }: { cur: Item | undefined; it: Item }) {
  const stat = SLOTS[it.slot].stat === 'dmg' ? 'Obrażenia' : 'Zdrowie';
  const subIds = [...new Set([...(cur?.subs ?? []).map(x => x.id), ...it.subs.map(x => x.id)])] as SubId[];
  const subOf = (x: Item | undefined, id: SubId) => x?.subs.find(s => s.id === id)?.v ?? 0;
  const mv = mainVal(it), cv = cur ? mainVal(cur) : 0;
  return (
    <table class="cmp">
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">{cur ? <><Px src={itemUrl(cur.kind, cur.ore, cur.r)} size={18} />Założony</> : 'Puste miejsce'}</th>
          <th scope="col"><Px src={itemUrl(it.kind, it.ore, it.r)} size={18} />Nowy</th>
        </tr>
      </thead>
      <tbody>
        <tr><th scope="row">Rzadkość</th><td class={cur ? `rt${cur.r}` : ''}>{cur ? RAR[cur.r].n : '—'}</td><td class={`rt${it.r}`}>{RAR[it.r].n}</td></tr>
        <tr><th scope="row">Poziom</th><td>{cur ? cur.lvl : '—'}</td><td>{it.lvl} <Diff v={it.lvl - (cur?.lvl ?? 0)} on={!!cur} /></td></tr>
        <tr class="main"><th scope="row">{stat}</th><td>{cur ? fmt(cv) : '—'}</td><td>{fmt(mv)} <Diff v={mv - cv} on={!!cur} /></td></tr>
        {subIds.map(id => {
          const a = subOf(cur, id), b = subOf(it, id);
          return (
            <tr key={id}>
              <th scope="row">{SUBS[id].n}</th>
              <td>{a ? `+${f1(a)}${SUBS[id].u}` : '—'}</td>
              <td>{b ? `+${f1(b)}${SUBS[id].u}` : '—'} <Diff v={b - a} f={n => f1(n) + SUBS[id].u} on={!!cur} /></td>
            </tr>
          );
        })}
        {(cur?.el || it.el) && <tr><th scope="row">Żywioł</th><td>{cur?.el ? ELEM[cur.el].el : '—'}</td><td>{it.el ? ELEM[it.el].el : '—'}</td></tr>}
        {(cur?.set || it.set) && (
          <tr><th scope="row">Zestaw</th><td>{cur?.set ? SETS[cur.set].n : '—'}</td><td style={it.set ? { color: SETS[it.set].col } : undefined}>{it.set ? SETS[it.set].n : '—'}</td></tr>
        )}
      </tbody>
    </table>
  );
}

/** Przedmioty, których animację wykuwania już pokazano (żeby nie powtarzać jej po ponownym otwarciu okna). */
const animated = new Set<number>();
const STEP_MS = 420;

/**
 * Animacja wykuwania: młot uderza w rozżarzoną sztabę, a poświata wspina się przez kolejne rzadkości
 * (od minimum rudy aż do wyniku). Im wyższy przeskok, tym dłuższa wspinaczka. Dotknięcie pomija animację.
 */
function ForgeAnim({ it, onDone }: { it: Item; onDone: () => void }) {
  const floor = ORES[it.ore].floor;
  const mj = maxJump(it.ore);
  const steps: (number | 'hot')[] = ['hot', 'hot', ...Array.from({ length: it.r - floor + 1 }, (_, i) => floor + i)];
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    let k = 0;
    play('smelt');
    sparks(box.current, 0);
    const tick = () => {
      k++;
      if (k >= steps.length) {
        if (it.r >= 3) play('rare', it.r);
        timer = setTimeout(finish, 260);
        return;
      }
      setI(k);
      const st = steps[k];
      play('strike', st === 'hot' ? 0 : st > floor ? st : 0);
      sparks(box.current, st === 'hot' ? 0 : st);
      timer = setTimeout(tick, STEP_MS);
    };
    let timer = setTimeout(tick, STEP_MS);
    return () => clearTimeout(timer);
  }, []);
  const st = steps[i];
  const climbed = st !== 'hot' && st > floor;
  return (
    <div class={`fanim ${st === 'hot' ? 'hot' : 'r' + st}${climbed ? ' climb' : ''}`} ref={box} onClick={finish} role="button" aria-label="Pomiń animację wykuwania">
      <span class="fa-glow" />
      <span class="fa-ingot" key={'i' + i} />
      <span class="fa-anvil"><Px src={resUrl('kowadlo')} size={80} /></span>
      <span class="fa-hammer" key={'h' + i}><Px src={itemUrl('Młot', 1)} size={56} /></span>
      <div class="fa-label" key={'l' + i}>
        {st === 'hot' ? 'Kucie…' : <b class={`rt${st}`}>{RAR[st].n}</b>}
      </div>
      {climbed && <div class="fa-up" key={'u' + i}>Przeskok +{(st as number) - floor}!</div>}
      <div class="fa-ladder" aria-hidden="true">
        {RAR.map((_, r) => (
          <i key={r} class={`rb-${r}${r < floor || r > floor + mj ? ' out' : ''}${st !== 'hot' && r >= floor && r <= st ? ' lit' : ''}`} />
        ))}
      </div>
      <small class="fa-skip">dotknij, żeby pominąć</small>
    </div>
  );
}

/**
 * `src`: 'pending' — przedmiot z kowadła (wytop ręczny albo zatrzymany auto-wytop), 'found' — znaleziska
 * ze skrzyni bossa i Zbrojowni (kolejno, po jednym).
 */
export function DecisionView({ game, src, close }: { game: Game; src: 'pending' | 'found'; close: () => void }) {
  const s = game.s;
  const [more, setMore] = useState(false);
  const it = src === 'pending' ? s.pending : s.found[0];
  const [anim, setAnim] = useState(() => !!it && src === 'pending' && !it.obieg && !animated.has(it.id));
  useEffect(() => { if (!it) close(); }, [it]);
  if (!it) return <></>;
  if (anim) {
    animated.add(it.id);
    return (
      <div class="dec forging">
        <div class="eyebrow">{ORES[it.ore].n} · {SLOTS[it.slot].n}</div>
        <ForgeAnim it={it} onDone={() => setAnim(false)} />
      </div>
    );
  }
  const cur = s.eq[it.slot];
  const d = src === 'pending' ? game.pendingDelta() : game.foundDelta(0);
  const better = d >= 0;
  const price = sellFor(s, it);
  const wear = () => { if (src === 'pending') game.equipPending(); else game.takeFound(0, true); setMore(false); };
  const sellIt = () => { if (src === 'pending') game.sellPending(); else game.takeFound(0, false); setMore(false); };
  const head = src === 'found' ? (it.obieg ? 'Skrzynia · przedmiot z Wielkiego Obiegu' : 'Znalezisko') : it.forced === 'set' ? 'Wykuto część zestawu' : 'Wykuto';
  const left = src === 'found' ? s.found.length - 1 : 0;
  return (
    <div class={`dec r${it.r}`} key={it.id}>
      <div class="row">
        <div class="eyebrow">{head}{left > 0 ? ` · jeszcze ${left}` : ''}</div>
        <span class="eyebrow">{SLOTS[it.slot].n}</span>
      </div>
      <div class="dec-drop" aria-hidden="true">
        <span class="dec-burst" />
        <Px src={itemUrl(it.kind, it.ore, it.r)} size={72} cls="dec-ico" />
      </div>
      <div class="dec-title">
        <div class="dec-name">{itemName(it)}</div>
        <div class="irar">{RAR[it.r].n} · poz. {it.lvl}{it.obieg ? ` · kowal: ${it.smith}` : ''}</div>
        {it.jump > 0 && <div class="jump">Przeskok +{it.jump}!</div>}
      </div>
      <div class={`dec-power ${better ? 'up' : 'down'}`}>
        Moc bohatera: <b>{sign(Math.round(d))}</b>{better ? ' — lepszy od założonego' : ' — słabszy od założonego'}
      </div>
      <Compare cur={cur} it={it} />
      {cur && cur.fame > 0 && <p class="sub">Po zmianie połowa Sławy Czynów założonego przedmiotu ({fmt(cur.fame)}) przejdzie na nowy.</p>}
      {src === 'pending' && !it.obieg && it.flvl > 0 && (
        <p class="sub dec-odds">
          Szanse tego wytopu ({ORES[it.ore].n}, kuźnia {it.flvl}): {dist(it.ore, it.flvl, techMods(s).jumpRel, it.jv ?? 1).map(([r, p], i) => <span key={r}>{i > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n} {pct(p)}</span></span>)}
          {it.forced === 'pity' ? ' · przeskok z gwarancji' : it.forced === 'tut' ? ' · pierwszy przeskok gwarantowany' : it.forced === 'set' ? ' · przeskok gwarantowany przez rudę unikalną' : ''}
        </p>
      )}
      <Brag game={game} it={it} />
      <div class="result-actions">
        <button class={`btn${better ? ' primary' : ''}`} onClick={wear}>Załóż</button>
        <button class={`btn${better ? '' : ' primary'}`} onClick={sellIt}>Sprzedaj · {fmt(price)} zł.</button>
      </div>
      <div class="dec-more">
        <button class="linkbtn" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Ukryj szczegóły' : 'Szczegóły i historia przedmiotu'}</button>
        {src === 'found' && <button class="linkbtn" onClick={close}>Zdecyduję później</button>}
      </div>
      {more && <ItemCard it={it} history={it.obieg} />}
    </div>
  );
}
