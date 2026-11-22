// Wybór cechy przebudzenia (okno przebudzenia i okno założonego przedmiotu): pięć cech z podpowiedzią,
// z kim gracz walczy teraz i kogo spotka dalej w kampanii. Pierwszy wybór darmowy, potem zmiana za złoto.
import { useState } from 'preact/hooks';
import { landDef } from '../data';
import type { Game } from '../engine/game';
import { AW_KEYS, awKey, awText, awakeningOf, type AwKey } from '../engine/formulas';
import { awChangeCost } from '../engine/legend';
import type { FoeType, SlotId } from '../engine/types';
import { fmt } from './format';

/** Rodzaje wrogów w najbliższych krainach za najdalszą zdobytą (dokąd gracz zmierza). */
function aheadTypes(game: Game): FoeType[] {
  const s = game.s;
  const out = new Set<FoeType>();
  for (let i = s.maxLand + 1; i <= s.maxLand + 3; i++) out.add(landDef(i).type);
  return [...out];
}

export function AwakenChoice({ game, slot, onDone }: { game: Game; slot: SlotId; onDone?: () => void }) {
  const s = game.s;
  const it = s.eq[slot];
  const cur = it?.aw ? awKey(it.aw) : null;
  const [pick, setPick] = useState<AwKey | null>(cur);
  if (!it || !it.aw || !cur || !pick) return null;
  const first = (it.awc ?? 0) === 0;
  const later = awChangeCost(s, { ...it, awc: 1 });
  const cost = pick === cur ? 0 : awChangeCost(s, it);
  const here = landDef(s.cur.land).type;
  const ahead = aheadTypes(game);
  const lack = s.gold < cost;
  const a = awakeningOf(pick);
  const label = pick === cur
    ? (first ? `Zostawiam: ${a.name}` : 'To obecna cecha')
    : first ? `Wybieram: ${a.name}` : lack ? `Za mało złota (${fmt(cost)})` : `Zmień na: ${a.name} · ${fmt(cost)} złota`;
  return (
    <div class="awc">
      <p class="sub awc-note">
        {first
          ? <>Pierwszy wybór jest <b>darmowy</b>. Później każda zmiana kosztuje {fmt(later)} złota.</>
          : <>Zmiana cechy kosztuje {fmt(later)} złota.</>}
      </p>
      <div class="awc-list" role="radiogroup" aria-label="Cecha przebudzenia">
        {AW_KEYS.map(k => {
          const o = awakeningOf(k);
          return (
            <button key={k} role="radio" aria-checked={pick === k} class={`awc-o${pick === k ? ' on' : ''}`} onClick={() => setPick(k)}>
              <span class="awc-n"><b>{o.name}</b><small>{awText(o)}</small></span>
              <span class="awc-tags">
                {cur === k && <i class="cur">{first ? 'podpowiedź' : 'obecna'}</i>}
                {k === here && <i class="here">tu walczysz</i>}
                {k !== 'boss' && k !== here && ahead.includes(k) && <i>dalej w kampanii</i>}
                {k === 'boss' && <i>bossowie są wszędzie</i>}
              </span>
            </button>
          );
        })}
      </div>
      <button class="btn primary wide" disabled={(!first && pick === cur) || lack}
        onClick={() => { if (game.setAwakening(slot, pick) || pick === cur) onDone?.(); }}>{label}</button>
    </div>
  );
}

/** Okno założonego przedmiotu: obecna cecha i „Zmień cechę” (rozwija wybór). */
export function AwakenBox({ game, slot }: { game: Game; slot: SlotId }) {
  const [open, setOpen] = useState(false);
  const it = game.s.eq[slot];
  if (!it?.aw) return null;
  const first = (it.awc ?? 0) === 0;
  return (
    <div class="awbox">
      <div class="row">
        <span>Cecha: <b>{it.aw.name}</b> <small>({awText(it.aw)})</small></span>
        {!open && <button class="btn small" onClick={() => setOpen(true)}>{first ? 'Wybierz cechę · za darmo' : 'Zmień cechę'}</button>}
      </div>
      {open && <AwakenChoice game={game} slot={slot} onDone={() => setOpen(false)} />}
    </div>
  );
}
