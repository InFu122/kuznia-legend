// Kowadło pod kciukiem: na zakładce Kuźnia ruda, przycisk Wytop i Auto są przypięte nad dolnym paskiem,
// więc zawsze widać je bez przewijania. Rudę i auto-wytop (z rzadkością, na której ma się zatrzymać)
// ustawia się w okienkach wysuwanych z dołu.
import { useRef } from 'preact/hooks';
import { B, ORES, ORE_ORDER, RAR, rAt } from '../data';
import { canSmelt } from '../engine/forge';
import { oreNominal } from '../engine/formulas';
import type { Game } from '../engine/game';
import { dungeonBgUrl, oreUrl, resUrl } from '../art/render';
import { AutoStop, InfoBtn, OreSummary } from './panels/Forge';
import { sparks } from './fx';
import { Px } from './Px';
import { fmt } from './format';

export function ForgeDock({ game, onPick, onDecide, onAuto }: { game: Game; onPick: () => void; onDecide: () => void; onAuto: () => void }) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const sparkRef = useRef<HTMLDivElement>(null);
  const batch = game.batchActive();
  const ok = canSmelt(game.ctx, o) && !s.pending;
  const sub = f.lvl < ORES[o].lvl ? `${ORES[o].n} od poz. ${ORES[o].lvl}` : s.ores[o] < 1 ? `brak rudy: ${ORES[o].n}`
    : batch > 1 ? `×${Math.min(batch, s.ores[o])} · ${ORES[o].n}` : ORES[o].n;
  return (
    <div class="dock">
      <button class="dock-ore" onClick={onPick} aria-haspopup="dialog" aria-label={`Ruda: ${ORES[o].n}, ${s.ores[o]} sztuk. Zmień rudę`}>
        <Px src={oreUrl(o)} size={30} />
        <span><b>{fmt(s.ores[o])}</b><i aria-hidden="true">▾</i></span>
      </button>
      {s.pending ? (
        <button class="btn primary dock-go decide" onClick={onDecide}>
          <span class="dg-t"><b>Zdecyduj</b><small>nowy przedmiot czeka</small></span>
        </button>
      ) : (
        <button class="btn primary btn-forge dock-go" disabled={!ok} onClick={() => { const it = game.smeltManual(); if (it) sparks(sparkRef.current, it.r); }}>
          <Px src={resUrl('kowadlo')} size={28} />
          <span class="dg-t"><b>Wytop</b><small>{sub}</small></span>
        </button>
      )}
      {f.lvl >= B.AUTO_FORGE_LVL && (
        <button class={`dock-auto${s.auto ? ' on' : ''}`} aria-haspopup="dialog" onClick={onAuto}
          aria-label={`Auto-wytop: ${s.auto ? `włączony, zatrzyma się na: ${RAR[game.autoTarget()].n}` : 'wyłączony'}. Ustaw`}>
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
            <span class="o2-n">{locked ? `poz. ${x.lvl}` : x.n}</span>
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

/** Auto-wytop: wybór rzadkości od razu włącza kucie; gdy już kuje — zmiana rzadkości albo wyłączenie. */
export function AutoSheet({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const o = s.oreSel;
  const on = s.auto;
  return (
    <>
      <div class="eyebrow">Kuźnia · poziom {s.forge.lvl}</div>
      <div class="h">Auto-wytop</div>
      <p class="sub">{on ? 'Kuźnia kuje sama.' : 'Wybierz rzadkość — kuźnia od razu zacznie kuć sama.'} Słabsze przedmioty sprzedaje, do pustego miejsca zakłada. Gdy wykuje wybraną rzadkość (albo rzadszą) lub część zestawu, zatrzymuje się i czeka na twoją decyzję.</p>
      {on && game.autoWaiting && <p class="tech-cost warn">{s.forge.lvl < ORES[o].lvl ? `${ORES[o].n} od ${ORES[o].lvl}. poziomu kuźni` : `Czeka na rudę: ${ORES[o].n}`}</p>}
      {on && game.autoPaused && <p class="tech-cost warn">Czeka na twoją decyzję o przedmiocie.</p>}
      <AutoStop game={game} onPick={() => { if (!game.s.auto) game.toggleAuto(); close(); }} />
      {on
        ? <button class="btn wide" onClick={() => { game.toggleAuto(); close(); }}>Wyłącz auto-wytop</button>
        : <button class="btn primary wide" onClick={() => { game.toggleAuto(); close(); }}>Włącz · zatrzymaj na: {RAR[game.autoTarget()].n}</button>}
    </>
  );
}
