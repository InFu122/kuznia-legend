// Okno decyzji o nowym przedmiocie (wytop, zatrzymany auto-wytop, skrzynia bossa, Zbrojownia):
// animacja dropu, nowy przedmiot obok założonego, różnice statystyk i przyciski Załóż / Sprzedaj.
import { useEffect, useRef, useState } from 'preact/hooks';
import { B, ELEM, ORES, QUAL, R, RAR, RAR_ORDER, SLOTS, SLOT_ORDER, SUBS, qOf, rAt, rGe, rRank, rTier } from '../data';
import { itemUrl, resUrl } from '../art/render';
import { coinsToGold, flyToSlot, sparks } from './fx';
import { buzz } from './haptics';
import { runeLvl } from '../engine/runes';
import { play } from './sound';
import { sellFor } from '../engine/forge';
import { dist, itemName, mainVal, maxJump, oreFloor, oreNominal } from '../engine/formulas';
import type { Game } from '../engine/game';
import { techMods } from '../engine/mods';
import { toast } from '../engine/context';
import type { Item, SubId } from '../engine/types';
import { ServerError, getLink } from '../save/server';
import { f1, fmt, pct } from './format';
import { ItemCard, QBadge } from './ItemCard';
import { Px } from './Px';

/** „Pochwal się dropem”: karta przedmiotu Mitycznego lub Boskiego na czacie globalnym. */
export function Brag({ game, it }: { game: Game; it: Item }) {
  const [msg, setMsg] = useState('');
  if (!game.net || !rGe(it.r, R.MITYCZNY) || typeof it.sx !== 'number') return null;
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

/** Liczba nabijana od zera (werdykt Mocy); bez animacji przy „ogranicz ruch”. */
function useCountUp(target: number, key: number, ms = 750, delay = 150): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / ms));
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, key]);
  return v;
}

/** Trójkąt ▲/▼ rysowany (znak z czcionki zastępczej wychodził dużo większy od cyfr). */
const Tri = ({ up }: { up: boolean }) => (
  <svg class="tri" viewBox="0 0 10 10" aria-hidden="true"><path d={up ? 'M5 1 9.6 9H.4z' : 'M5 9 9.6 1H.4z'} fill="currentColor" /></svg>
);

/** Werdykt na górze okna: o ile zmieni się Moc bohatera. */
function Verdict({ d, empty, id }: { d: number; empty: boolean; id: number }) {
  const n = useCountUp(Math.abs(d), id);
  const up = empty || d > 0;
  if (!up && d === 0) return <div class="dv eq"><b>± 0 <small>Mocy</small></b><span>Tak samo mocny jak założony</span></div>;
  return (
    <div class={`dv ${up ? 'up' : 'down'}`} role="status">
      {empty && <span class="dv-new">Nowe miejsce!</span>}
      <b><Tri up={up} />{up ? '+' : '−'}{fmt(n)} <small>Mocy</small></b>
      {!empty && <span>{up ? 'Lepszy od założonego' : 'Słabszy od założonego — najlepiej sprzedać'}</span>}
    </div>
  );
}

/** Karta przedmiotu w „starciu”: założony (stary) albo nowy. */
function DCard({ it, tag, win, first, cls = '', iconRef }: { it: Item; tag: string; win: boolean; first?: boolean; cls?: string; iconRef?: { current: HTMLImageElement | null } }) {
  return (
    <div class={`dcard r${it.r}${win ? ' win' : ''} ${cls}`}>
      {first ? <span class="dc-first"><Px src={resUrl('puchar')} size={16} />Pierwszy {RAR[it.r].n}!</span> : <span class="dc-tag">{tag}</span>}
      <img ref={iconRef} class="px dc-ico" src={itemUrl(it.kind, it.ore, it.r)} width={win ? 72 : 52} height={win ? 72 : 52} alt="" draggable={false} />
      <b class="dc-name">{itemName(it)}</b>
      <small class={`rt${it.r}`}>{RAR[it.r].n} · poz. {it.lvl}</small>
      <span class={`dc-q${cls === 'new' && qOf(it) >= 4 ? ' hi' : ''}`}>
        <small>jakość</small><QBadge q={it.q} size={win ? 'big' : ''} />{QUAL[qOf(it) - 1].b > 0 && <small>+{QUAL[qOf(it) - 1].b}%</small>}
      </span>
      {it.jump > 0 && <span class="dc-jump">Przeskok +{it.jump}!</span>}
    </div>
  );
}

/** Drabinka 10 rzadkości: zapalona aż do nowej, dawna zaznaczona obwódką. */
function Ladder({ it, cur }: { it: Item; cur: Item | undefined }) {
  const nr = rRank(it.r), or = cur ? rRank(cur.r) : -1;
  const jv = it.jv ?? 1;
  const nominal = jv >= 6 ? oreNominal(it.ore, it.flvl || 1) : rRank(oreFloor(it.ore, jv));
  return (
    <div class="dlad">
      <div class="dlad-h">
        <span>Rzadkość</span>
        <span>
          {cur && <><span class={`rt${cur.r}`}>{RAR[cur.r].n}</span> → </>}
          <span class={`rt${it.r}`}>{RAR[it.r].n}</span>
          {cur && nr > or && <span class="dl-tag up">▲ awans</span>}
          {cur && nr < or && <span class="dl-tag down">▼ niżej</span>}
        </span>
      </div>
      <div class="dlad-bar" aria-hidden="true">
        {RAR_ORDER.map((r, k) => (
          <i key={r} class={`${k <= nr ? 'on' : ''}${k === nr ? ' now' : ''}${k === or ? ' was' : ''}${k > nominal && k <= nr ? ' jumped' : ''}`}
            style={{ '--c': `var(--r${r})`, '--d': `${Math.max(0, k - nominal) * 0.12}s` } as Record<string, string>} />
        ))}
      </div>
      {it.jump > 0 && it.flvl > 0 && (
        <div class="dlad-f">{ORES[it.ore].n} zwykle daje <b class={`rt${rAt(nominal)}`}>{RAR[rAt(nominal)].n}</b> — wyszło <b class={`rt${it.r}`}>{RAR[it.r].n}</b>, {it.jump} {it.jump === 1 ? 'szczebel' : 'szczeble'} wyżej</div>
      )}
    </div>
  );
}

interface StatRow { k: string; n: string; a: number; b: number; f: (n: number) => string; txt?: [string, string] }

/** Jakość w porównaniu: „I → V” z premią do statystyk i różnicą premii (np. +20%). */
function QualRow({ cur, it }: { cur: Item | undefined; it: Item }) {
  const a = qOf(cur ?? { q: 1 }), b = qOf(it);
  const ba = QUAL[a - 1].b, bb = QUAL[b - 1].b;
  const d = bb - (cur ? ba : 0);
  return (
    <div class="ds dq">
      <span class="ds-n">Jakość</span>
      <span class="ds-v">
        {cur && a !== b && <span class="ds-old"><span class={`qb sm q${a}`}>{QUAL[a - 1].n}</span> +{ba}% → </span>}
        <span class={`qb sm q${b}`}>{QUAL[b - 1].n}</span> +{bb}%
      </span>
      {d === 0 ? <span class="ds-chip eq">=</span> : <span class={`ds-chip ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '+' : '−'}{Math.abs(d)}%</span>}
    </div>
  );
}

/** Zmiany statystyk: „21 → 32” i znaczek różnicy; nowa cecha — NOWE, utracona — przekreślona. */
function Stats({ cur, it }: { cur: Item | undefined; it: Item }) {
  const subOf = (x: Item | undefined, id: SubId) => x?.subs.find(q => q.id === id)?.v ?? 0;
  const rows: StatRow[] = [{ k: 'main', n: SLOTS[it.slot].stat === 'dmg' ? 'Obrażenia' : 'Zdrowie', a: cur ? mainVal(cur) : 0, b: mainVal(it), f: fmt }];
  const ids = [...new Set([...it.subs.map(x => x.id), ...(cur?.subs ?? []).map(x => x.id)])] as SubId[];
  for (const id of ids) rows.push({ k: id, n: SUBS[id].n, a: subOf(cur, id), b: subOf(it, id), f: v => '+' + f1(v) + SUBS[id].u });
  if (cur?.el || it.el) rows.push({ k: 'el', n: 'Żywioł', a: cur?.el ? 1 : 0, b: it.el ? 1 : 0, f: () => '', txt: [cur?.el ? ELEM[cur.el].el : '', it.el ? ELEM[it.el].el : ''] });
  return (
    <div class="dstats">
      <QualRow cur={cur} it={it} />
      {rows.map((r, i) => {
        const fresh = r.b > 0 && r.a === 0, lost = r.a > 0 && r.b === 0;
        const same = r.txt ? r.txt[0] === r.txt[1] : Math.abs(r.b - r.a) < 0.05;
        const val = r.txt ? r.txt[1] || r.txt[0] : r.f(lost ? r.a : r.b);
        const max = Math.max(r.a, r.b);
        const delay = { animationDelay: `${0.35 + i * 0.08}s` };
        return (
          <div key={r.k} class={`ds${lost ? ' lost' : ''}`}>
            <span class="ds-n">{r.n}</span>
            <span class="ds-v">{!fresh && !lost && !same && <span class="ds-old">{r.txt ? r.txt[0] : r.f(r.a)} → </span>}{val}</span>
            {fresh ? <span class="ds-chip new" style={delay}>NOWE</span>
              : lost ? <span class="ds-chip down" style={delay}>{r.txt ? 'brak' : sign(-r.a, n => r.f(n).replace('+', ''))}</span>
              : same ? <span class="ds-chip eq">=</span>
              : r.txt ? <span class="ds-chip up" style={delay}>zmiana</span>
              : <span class={`ds-chip ${r.b > r.a ? 'up' : 'down'}`} style={delay}>{sign(r.b - r.a, n => r.f(n).replace('+', ''))}</span>}
            {!r.txt && r.a > 0 && r.b > 0 && !same && (
              <span class="ds-bar" aria-hidden="true">
                <i style={{ width: (Math.min(r.a, r.b) / max) * 100 + '%' }} />
                <i class={r.b > r.a ? 'gain' : 'loss'} style={{ width: (Math.abs(r.b - r.a) / max) * 100 + '%', ...delay }} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Puste miejsce: pasek ośmiu miejsc ekwipunku z nowym zapalonym („3/8 → 4/8”). */
function GearFill({ s, it }: { s: Game['s']; it: Item }) {
  const worn = SLOT_ORDER.filter(k => !!s.eq[k]).length;
  return (
    <div class="dfill">
      <div class="dlad-h"><span>Ekwipunek bohatera</span><b>{worn}/8 → <span class="good">{worn + 1}/8</span></b></div>
      <div class="dfill-g">
        {SLOT_ORDER.map(k => {
          const x = k === it.slot ? it : s.eq[k];
          return <span key={k} class={`gi${x ? ' r' + x.r : ' empty'}${k === it.slot ? ' now' : ''}`}>{x && <Px src={itemUrl(x.kind, x.ore, x.r)} size={22} />}</span>;
        })}
      </div>
    </div>
  );
}

/** Przedmioty, dla których telefon już zawibrował. */
const buzzed = new Set<number>();

/** Przedmioty, których animację wykuwania już pokazano (żeby nie powtarzać jej po ponownym otwarciu okna). */
const animated = new Set<number>();
const STEP_MS = 420;

/**
 * Animacja wykuwania: młot uderza w rozżarzoną sztabę, a poświata wspina się przez kolejne rzadkości
 * (od minimum rudy aż do wyniku). Im wyższy przeskok, tym dłuższa wspinaczka. Dotknięcie pomija animację.
 */
function ForgeAnim({ it, onDone }: { it: Item; onDone: () => void }) {
  // Rachunek na rangach (RAR_ORDER): wynik bez przeskoku — ranga nominalna (v6) albo dawne minimum rudy.
  const jv = it.jv ?? 1;
  const floor = jv >= 6 ? oreNominal(it.ore, it.flvl || 1) : rRank(oreFloor(it.ore, jv));
  const mj = maxJump(it.ore, jv);
  const top = rRank(it.r);
  const start = Math.min(floor, top); // wynik może być o rangę niżej niż bez przeskoku
  const steps: (number | 'hot')[] = ['hot', 'hot', ...Array.from({ length: top - start + 1 }, (_, i) => start + i)];
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
        if (rGe(it.r, R.WYJATKOWY)) play('rare', rTier(it.r));
        timer = setTimeout(finish, 260);
        return;
      }
      setI(k);
      const st = steps[k];
      play('strike', st === 'hot' ? 0 : st > floor ? rTier(rAt(st)) : 0);
      sparks(box.current, st === 'hot' ? 0 : rAt(st));
      timer = setTimeout(tick, STEP_MS);
    };
    let timer = setTimeout(tick, STEP_MS);
    // Dotknięcie w dowolnym miejscu ekranu pomija animację. Kliknięcie, które z niego wynika, jest „zjadane”,
    // żeby nie trafiło w przycisk Załóż/Sprzedaj, który pojawi się w tym samym miejscu.
    let eat: ((ev: Event) => void) | null = null;
    const skip = () => {
      if (done.current) return;
      eat = ev => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener('click', eat, true);
      setTimeout(() => { if (eat) document.removeEventListener('click', eat, true); }, 450);
      clearTimeout(timer);
      finish();
    };
    const key = (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape') { ev.preventDefault(); skip(); } };
    document.addEventListener('pointerdown', skip, true);
    document.addEventListener('keydown', key, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', skip, true);
      document.removeEventListener('keydown', key, true);
    };
  }, []);
  const st = steps[i];
  const climbed = st !== 'hot' && st > floor;
  return (
    <div class={`fanim ${st === 'hot' ? 'hot' : 'r' + rAt(st)}${climbed ? ' climb' : ''}`} ref={box} onClick={finish} role="button" aria-label="Pomiń animację wykuwania">
      <span class="fa-glow" />
      <span class="fa-ingot" key={'i' + i} />
      <span class="fa-anvil"><Px src={resUrl('kowadlo')} size={80} /></span>
      <span class="fa-hammer" key={'h' + i}><Px src={itemUrl('Młot', 1)} size={56} /></span>
      <div class="fa-label" key={'l' + i}>
        {st === 'hot' ? 'Kucie…' : <b class={`rt${rAt(st)}`}>{RAR[rAt(st)].n}</b>}
      </div>
      {climbed && <div class="fa-up" key={'u' + i}>Przeskok +{(st as number) - floor}!</div>}
      <div class="fa-ladder" aria-hidden="true">
        {RAR_ORDER.map((r, k) => (
          <i key={r} class={`rb-${r}${k < start || k > floor + mj ? ' out' : ''}${st !== 'hot' && k >= start && k <= st ? ' lit' : ''}`} />
        ))}
      </div>
      <small class="fa-skip">dotknij gdziekolwiek, żeby pominąć</small>
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
  /** Potwierdzenie decyzji wbrew podpowiedzi: założenie słabszego albo sprzedaż lepszego przedmiotu. */
  const [ask, setAsk] = useState<'wear' | 'sell' | null>(null);
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
  const d = Math.round(src === 'pending' ? game.pendingDelta() : game.foundDelta(0));
  const better = d >= 0;
  const empty = !cur;
  const first = game.firsts.has(it.id) && rGe(it.r, R.RZADKI);
  // Wielka chwila: przeskok o 2+, Legendarny i wyżej albo pierwszy w historii Epicki+ — scena z promieniami.
  const big = it.jump >= 2 || rGe(it.r, R.LEGENDARNY) || (first && rGe(it.r, R.EPICKI));
  const price = sellFor(s, it);
  const icon = useRef<HTMLImageElement>(null);
  const sellBtn = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (buzzed.has(it.id)) return;
    buzzed.add(it.id);
    void buzz(it.r, s.opts.vibe !== false);
    if (big) sparks(stage.current, it.r);
  }, [it.id]);
  const wear = () => {
    flyToSlot(icon.current, itemUrl(it.kind, it.ore, it.r), SLOT_ORDER.indexOf(it.slot), d > 0 || empty ? `▲ +${fmt(Math.abs(d))}` : `▼ −${fmt(Math.abs(d))}`);
    if (src === 'pending') game.equipPending(); else game.takeFound(0, true);
    setMore(false);
  };
  const sellIt = () => {
    if (!coinsToGold(sellBtn.current, resUrl('zloto'), `+${fmt(price)}`)) toast(game.ctx, `Sprzedano za ${fmt(price)} złota`);
    if (src === 'pending') game.sellPending(); else game.takeFound(0, false);
    setMore(false);
  };
  useEffect(() => setAsk(null), [it.id]);
  const tryWear = () => (!empty && d < 0 ? setAsk('wear') : wear());
  const trySell = () => (empty || d > 0 ? setAsk('sell') : sellIt());
  const head = src === 'found' ? (it.obieg ? 'Skrzynia · przedmiot dawnego kowala' : 'Znalezisko') : it.forced === 'set' ? 'Wykuto z rudy unikalnej' : 'Wykuto';
  const left = src === 'found' ? s.found.length - 1 : 0;
  const gainTxt = `${empty || d > 0 ? '▲ +' : d < 0 ? '▼ −' : '± '}${fmt(Math.abs(d))} Mocy`;
  const gain = <span class="pill">{gainTxt}</span>;
  return (
    <div class={`dec r${it.r}${big ? ' big' : ''}`} key={it.id}>
      <div class="row">
        <div class="eyebrow">{head}{src === 'pending' ? ` · ${ORES[it.ore].n}` : ''}{left > 0 ? ` · jeszcze ${left}` : ''}</div>
        <span class="eyebrow">{SLOTS[it.slot].n}</span>
      </div>
      {big ? (
        <>
          <div class="dec-drop" ref={stage}>
            <span class="dec-burst" />
            <img ref={icon} class="px dec-ico" src={itemUrl(it.kind, it.ore, it.r)} width={104} height={104} alt="" draggable={false} />
            {first && <span class="dc-first big"><Px src={resUrl('puchar')} size={18} />Pierwszy {RAR[it.r].n}!</span>}
          </div>
          <div class="dec-title">
            {it.jump > 0 && <div class="jump">Przeskok +{it.jump}!</div>}
            <div class="dec-name">{itemName(it)}</div>
            <div class="irar">{RAR[it.r].n} · poz. {it.lvl}{it.obieg ? ` · kowal: ${it.smith}` : ''}</div>
          </div>
          <Ladder it={it} cur={undefined} />
          <div class={`dv-row ${better || empty ? 'up' : 'down'}`}>
            <span>{cur ? <><Px src={itemUrl(cur.kind, cur.ore, cur.r)} size={26} />zamiast: {itemName(cur)}</> : 'Nowe miejsce!'}</span>
            <Verdict d={d} empty={empty} id={it.id} />
          </div>
        </>
      ) : (
        <>
          <Verdict d={d} empty={empty} id={it.id} />
          <div class="dcards">
            {cur ? <DCard it={cur} tag={better ? 'Założony' : 'Założony · zostaje'} win={!better} cls="old" />
              : <div class="dcard empty"><img class="px dc-ico" src={itemUrl(it.kind, it.ore, it.r)} width={52} height={52} alt="" /><small>Puste miejsce</small></div>}
            <span class={`dc-arrow${better ? '' : ' back'}`} aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></span>
            <DCard it={it} tag="Nowy" win={better} first={first} cls="new" iconRef={icon} />
          </div>
          {it.jump < 0 && <div class="jump low">Kuźnia jeszcze nie opanowała tej rudy — tym razem o rzadkość niżej. Od {ORES[it.ore].v6[2]}. poziomu kuźni to się nie zdarza.</div>}
          <Ladder it={it} cur={cur} />
        </>
      )}
      <Stats cur={cur} it={it} />
      {runeLvl(s, it.slot) > 0 && (
        <p class="dec-rune"><Px src={resUrl('runa')} size={18} />Runa {SLOTS[it.slot].n} (+{runeLvl(s, it.slot) * B.RUNE_PCT}%) działa na każdy przedmiot w tym miejscu, więc i na ten — po wymianie nic nie tracisz.</p>
      )}
      {empty && !big && <GearFill s={s} it={it} />}
      {!better && s.forge.lvl < B.AUTO_FORGE_LVL && <p class="sub dec-tip">Takie przedmioty od {B.AUTO_FORGE_LVL}. poziomu kuźni sprzedaje sam auto-wytop.</p>}
      <Brag game={game} it={it} />
      {ask ? (
        <div class="result-actions dec-acts dec-ask" role="alertdialog" aria-labelledby="dec-ask-q">
          <p id="dec-ask-q" class="ask-q">
            {ask === 'sell'
              ? <>Ten przedmiot jest <b class="good">lepszy</b>{empty ? ' i trafiłby na puste miejsce' : ''} — dałby <b>+{fmt(Math.abs(d))} Mocy</b>. Na pewno sprzedać?</>
              : <>Ten przedmiot jest <b class="bad">słabszy</b> — Moc bohatera spadnie o <b>{fmt(Math.abs(d))}</b>. Na pewno założyć?</>}
          </p>
          <button class="btn primary" onClick={() => setAsk(null)}>{ask === 'sell' ? 'Nie, zostaw go' : 'Nie, nie zakładaj'}</button>
          {ask === 'sell'
            ? <button class="btn danger" ref={sellBtn} onClick={sellIt}>Tak, sprzedaj <Px src={resUrl('zloto')} size={16} /> {fmt(price)} zł</button>
            : <button class="btn danger" onClick={wear}>Tak, załóż słabszy</button>}
        </div>
      ) : (
        <div class="result-actions dec-acts">
          {better ? (
            <>
              <button class="btn primary dec-go" onClick={wear}>Załóż {gain}</button>
              <button class="btn dec-alt" ref={sellBtn} onClick={trySell}>Sprzedaj <Px src={resUrl('zloto')} size={16} /> {fmt(price)} zł</button>
            </>
          ) : (
            <>
              <button class="btn primary dec-go" ref={sellBtn} onClick={sellIt}>Sprzedaj <Px src={resUrl('zloto')} size={20} /> {fmt(price)} zł</button>
              <button class="btn dec-alt" onClick={tryWear}>Załóż mimo to ({gainTxt})</button>
            </>
          )}
        </div>
      )}
      <div class="dec-more">
        <button class="linkbtn" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Ukryj szczegóły' : 'Szczegóły, szanse wytopu i historia ›'}</button>
        {src === 'found' && <button class="linkbtn" onClick={close}>Zdecyduję później</button>}
      </div>
      {more && cur && cur.fame > 0 && <p class="sub">Po zmianie połowa Sławy Czynów założonego przedmiotu ({fmt(cur.fame)}) przejdzie na nowy.</p>}
      {more && src === 'pending' && !it.obieg && it.flvl > 0 && (
        <p class="sub dec-odds">
          Szanse tego wytopu ({ORES[it.ore].n}, kuźnia {it.flvl}): {dist(it.ore, it.flvl, techMods(s).jumpRel, it.jv ?? 1).map(([r, p], i) => <span key={r}>{i > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n} {pct(p)}</span></span>)}
          {it.forced === 'pity' ? ' · przeskok z gwarancji' : it.forced === 'tut' ? ' · pierwszy przeskok gwarantowany' : it.forced === 'set' ? ' · przeskok gwarantowany przez rudę unikalną' : ''}
        </p>
      )}
      {more && <ItemCard it={it} history={it.obieg} />}
    </div>
  );
}
