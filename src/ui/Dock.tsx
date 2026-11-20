// Kowadło pod kciukiem: na zakładce Kuźnia ruda, przycisk Wytop i Auto są przypięte nad dolnym paskiem,
// więc zawsze widać je bez przewijania. Rudę i auto-wytop (z rzadkością, na której ma się zatrzymać)
// ustawia się w okienkach wysuwanych z dołu; włączony auto-wytop wyłącza jedno dotknięcie Auto.
import { useRef } from 'preact/hooks';
import { B, ELEM, ORES, ORE_ORDER, RAR, rAt } from '../data';
import { canSmelt } from '../engine/forge';
import { oreNominal } from '../engine/formulas';
import type { Game } from '../engine/game';
import { dungeonBgUrl, elemUrl, oreUrl, resUrl } from '../art/render';
import { AutoElem, AutoStop, InfoBtn, OreSummary } from './panels/Forge';
import { sparks } from './fx';
import { Px } from './Px';
import { fmt } from './format';

export function ForgeDock({ game, onPick, onDecide, onAuto, onElem }: { game: Game; onPick: () => void; onDecide: () => void; onAuto: () => void; onElem: () => void }) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const sparkRef = useRef<HTMLDivElement>(null);
  const ok = canSmelt(game.ctx, o) && !s.pending;
  const el = s.elSel && (s.els[s.elSel] ?? 0) > 0 ? s.elSel : null;
  const sub = f.lvl < ORES[o].lvl ? `${ORES[o].n} od poz. ${ORES[o].lvl}` : s.ores[o] < 1 ? `brak rudy: ${ORES[o].n}`
    : ORES[o].n; // domieszka ma własny przycisk obok
  /** Domieszka na pasku: od poziomu kuźni, na którym się otwiera (wcześniej była tylko w karcie kuźni). */
  const elOn = f.lvl >= B.ELEM_FORGE_LVL;
  // Wybrana ruda się skończyła, a w magazynie jest inna — przycisk otwiera wybór rudy zamiast stać wyszarzony.
  const other = !ok && !s.pending ? ORE_ORDER.find(i => i !== o && s.ores[i] > 0 && f.lvl >= ORES[i].lvl) : undefined;
  return (
    <div class={`dock${elOn ? ' with-el' : ''}`}>
      <button class="dock-ore" onClick={onPick} aria-haspopup="dialog" aria-label={`Ruda: ${ORES[o].n}, ${s.ores[o]} sztuk. Zmień rudę`}>
        <Px src={oreUrl(o)} size={30} />
        <span><b>{fmt(s.ores[o])}</b><i aria-hidden="true">▾</i></span>
      </button>
      {elOn && (
        <button class={`dock-el${el ? ' on' : ''}`} onClick={onElem} aria-haspopup="dialog"
          aria-label={el ? `Domieszka: ${ELEM[el].n}, ${s.els[el]} sztuk. Zmień` : 'Bez domieszki. Wybierz domieszkę'}>
          {el ? <Px src={elemUrl(el)} size={24} /> : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <path d="M11 3c3 4 6 7 6 10.5A6 6 0 0 1 5 13.5C5 10 8 7 11 3z" /><path d="M5 19 17 5" />
            </svg>
          )}
          <span>{el ? fmt(s.els[el] ?? 0) : 'brak'}</span>
        </button>
      )}
      {s.pending ? (
        <button class="btn primary dock-go decide" onClick={onDecide}>
          <span class="dg-t"><b>Zdecyduj</b><small>nowy przedmiot czeka</small></span>
        </button>
      ) : other !== undefined ? (
        <button class="btn primary btn-forge dock-go swap" onClick={onPick}>
          <Px src={oreUrl(other)} size={28} />
          <span class="dg-t"><b>Zmień rudę</b><small>brak: {ORES[o].n} · masz {ORES[other].n}</small></span>
        </button>
      ) : (
        <button class="btn primary btn-forge dock-go" disabled={!ok} onClick={() => { const it = game.smeltManual(); if (it) sparks(sparkRef.current, it.r); }}>
          <Px src={resUrl('kowadlo')} size={28} />
          <span class="dg-t"><b>Wytop</b><small>{sub}</small></span>
        </button>
      )}
      {f.lvl >= B.AUTO_FORGE_LVL && (
        <button class={`dock-auto${s.auto ? ' on' : ''}`} aria-haspopup={s.auto ? undefined : 'dialog'} onClick={() => (s.auto ? game.toggleAuto() : onAuto())}
          aria-label={s.auto ? `Auto-wytop włączony, zatrzyma się na: ${RAR[game.autoTarget()].n}. Wyłącz` : 'Auto-wytop wyłączony. Ustaw i włącz'}>
          <b>Auto</b>{s.auto && !game.autoPaused ? <small class={`rt${game.autoTarget()}`}>{RAR[game.autoTarget()].n}+</small> : <small class={s.auto ? 'wait' : ''}>{s.auto ? 'czeka' : 'wył.'}</small>}
        </button>
      )}
      <div class="sparks" ref={sparkRef} />
    </div>
  );
}

/** Siatka rud (wybór). `onPicked` — po wyborze. */
export function OreGrid({ game, onPicked }: { game: Game; onPicked?: () => void }) {
  const s = game.s;
  const f = s.forge;
  return (
    <div class="ores2" role="radiogroup" aria-label="Ruda">
      {ORE_ORDER.map(i => {
        const x = ORES[i];
        const locked = f.lvl < x.lvl;
        const r = rAt(oreNominal(i, Math.max(f.lvl, x.lvl)));
        return (
          <button key={x.n} role="radio" aria-checked={i === s.oreSel} class={`ore2 rb${r}${i === s.oreSel ? ' on' : ''}${locked ? ' locked' : ''}`}
            aria-label={`${x.n}: ${s.ores[i]} sztuk, zwykle ${RAR[r].n}${locked ? `, wytop od ${x.lvl}. poziomu kuźni` : ''}`}
            onClick={() => { game.setOre(i); onPicked?.(); }}>
            <Px src={oreUrl(i)} size={32} />
            <b class="cnt">{fmt(s.ores[i])}</b>
            <span class="o2-n">{x.n}</span>
            {locked && <span class="o2-l">kuźnia {x.lvl}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function OrePicker({ game, close }: { game: Game; close: () => void }) {
  const f = game.s.forge;
  return (
    <>
      <div class="forge-banner" style={{ '--bg': `url(${dungeonBgUrl('kuznia')})` } as Record<string, string>}>
        <Px src={resUrl('kowadlo')} size={30} />
        <div class="fb-txt">
          <div class="eyebrow">Kuźnia · poziom {f.lvl}{f.up ? ' · trwa ulepszenie' : ''}</div>
          <div class="h">Ruda do wytopu</div>
        </div>
        <InfoBtn onClick={() => { close(); game.openModal({ kind: 'info', k: 'forge' }); }} label="Jak działa kuźnia i jakie są szanse" />
      </div>
      <OreGrid game={game} />
      <OreSummary game={game} />
      <button class="btn primary" onClick={close}>Gotowe</button>
    </>
  );
}

/** Auto-wytop: wybór rzadkości, na której kuźnia się zatrzyma, i „Włącz”. (Wyłącza się jednym dotknięciem Auto na pasku.) */
export function AutoSheet({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const o = s.oreSel;
  const on = s.auto;
  return (
    <>
      <div class="eyebrow">Kuźnia · poziom {s.forge.lvl}</div>
      <div class="h">Auto-wytop</div>
      <p class="sub">{on ? 'Kuźnia kuje sama.' : 'Wybierz rzadkość i naciśnij „Włącz” — kuźnia zacznie kuć sama.'} Słabsze przedmioty sprzedaje, do pustego miejsca zakłada. Gdy wykuje wybraną rzadkość (albo rzadszą) lub część zestawu, zatrzymuje się i czeka na twoją decyzję.</p>
      {on && game.autoWaiting && <p class="tech-cost warn">{s.forge.lvl < ORES[o].lvl ? `${ORES[o].n} od ${ORES[o].lvl}. poziomu kuźni` : `Czeka na rudę: ${ORES[o].n}`}</p>}
      {on && game.autoPaused && <p class="tech-cost warn">Czeka na twoją decyzję o przedmiocie.</p>}
      <AutoStop game={game} />
      <AutoElem game={game} />
      {on
        ? <button class="btn wide" onClick={() => { game.toggleAuto(); close(); }}>Wyłącz auto-wytop</button>
        : <button class="btn primary wide" onClick={() => { game.toggleAuto(); close(); }}>Włącz · zatrzymaj na: {RAR[game.autoTarget()].n}</button>}
    </>
  );
}
