// Kowadło pod kciukiem: na zakładce Kuźnia ruda i przycisk Wytop są przypięte nad dolnym paskiem,
// więc zawsze widać je bez przewijania. Rudę zmienia się w małym okienku.
import { useRef } from 'preact/hooks';
import { B, ORES, ORE_ORDER, RAR, rAt } from '../data';
import { canSmelt } from '../engine/forge';
import { oreNominal } from '../engine/formulas';
import type { Game } from '../engine/game';
import { oreUrl, resUrl } from '../art/render';
import { sparks } from './fx';
import { Px } from './Px';
import { fmt } from './format';

export function ForgeDock({ game, onPick, onDecide }: { game: Game; onPick: () => void; onDecide: () => void }) {
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
        <button class={`dock-auto${s.auto ? ' on' : ''}`} aria-pressed={s.auto} onClick={() => game.toggleAuto()}
          aria-label={`Auto-wytop: ${s.auto ? 'włączony' : 'wyłączony'}`}>
          <b>Auto</b><small>{s.auto ? (game.autoPaused ? 'czeka' : 'wł.') : 'wył.'}</small>
        </button>
      )}
      <div class="sparks" ref={sparkRef} />
    </div>
  );
}

/** Siatka rud (wybór). `onPicked` — po wyborze (okienko się zamyka). */
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
  return (
    <>
      <div class="eyebrow">Kuźnia · poziom {game.s.forge.lvl}</div>
      <div class="h">Ruda do wytopu</div>
      <p class="sub">Kolor ramki to rzadkość, która zwykle wychodzi z tej rudy. Szanse na przeskok i ustawienia wytopu znajdziesz w zakładce Kuźnia.</p>
      <OreGrid game={game} onPicked={close} />
    </>
  );
}
