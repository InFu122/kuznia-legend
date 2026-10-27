import { ELEM, LEGEND, ORES, RAR, SETS, SLOTS } from '../data';
import { baseName, itemName, mainVal } from '../engine/formulas';
import type { FoeType, Item } from '../engine/types';
import { SUBS } from '../data';
import { f1, fmt } from './format';
import { SlotIcon } from './icons';

/** `proof` (tylko z serwerem): czy serwer może potwierdzić pochodzenie przedmiotu. */
interface Props { it: Item; delta?: number; reveal?: boolean; history?: boolean; proof?: boolean }

export function ItemCard({ it, delta, reveal, history, proof }: Props) {
  const S = SLOTS[it.slot];
  const st = it.ls || 0;
  const next = LEGEND[Math.min(3, st + 1)];
  const legPct = st >= 3 ? 100 : Math.min(100, (it.fame / next.at) * 100);
  const kills = (Object.entries(it.kills) as [FoeType, number][]).filter(([, v]) => v > 0).map(([k, v]) => `${fmt(v)} ${k.toLowerCase()}`);
  return (
    <div class={`icard r${it.r}${reveal ? ' reveal' : ''}`}>
      <div class="ihead">
        <div class="ico"><SlotIcon slot={it.slot} /></div>
        <div>
          <div class={`iname${it.aw ? ' aw' : ''}`}>{itemName(it)}{it.obieg && <span class="tag">Z Obiegu</span>}{it.set && <span class="tag">Zestaw</span>}</div>
          <div class="irar">{it.aw ? baseName(it) + ' · ' : ''}{RAR[it.r].n} · poz. {it.lvl}</div>
        </div>
        {delta !== undefined && <div class={`delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '+' : '−'}{fmt(Math.abs(delta))}</div>}
      </div>
      <div class="imain">{S.stat === 'dmg' ? 'Obrażenia' : 'Zdrowie'} {fmt(mainVal(it))}</div>
      {it.subs.length > 0 && <ul class="isubs">{it.subs.map(s => <li key={s.id}>{SUBS[s.id].n} +{f1(s.v)}{SUBS[s.id].u}</li>)}</ul>}
      {it.el && <div class="iel">Żywioł: {ELEM[it.el].el} — {ELEM[it.el].d}</div>}
      {it.set && (
        <div class="iset" style={{ '--set': SETS[it.set].col } as Record<string, string>}>
          Zestaw <b>{SETS[it.set].n}</b>: 2 części — {SETS[it.set].d2}; 4 części — {SETS[it.set].d4}
        </div>
      )}
      {it.aw && <div class="itrait">Cecha: +{it.aw.v}% obrażeń wobec {it.aw.kind === 'boss' ? 'bossów' : it.aw.t?.toLowerCase()}</div>}
      <div class="ileg">
        <span>Legenda: <b>{st >= 3 ? 'Przebudzony' : st ? LEGEND[st].n : 'brak'}</b> · {fmt(it.fame)}{st < 3 ? ' / ' + fmt(next.at) : ''} Sławy Czynów</span>
        <div class="bar"><i style={{ width: legPct + '%' }} /></div>
        {history && (kills.length > 0 || it.bosses > 0) && <span>Czyny: {kills.join(' · ')}{it.bosses ? ' · bossowie: ' + it.bosses : ''}</span>}
      </div>
      <div class="isign">
        Kowal: <b>{it.smith}</b>{it.npc ? ' (kowal-widmo)' : ''} · {ORES[it.ore].n} · {it.land}
        {history && it.owners.length > 1 && <><br />Właściciele: {it.owners.join(' → ')}</>}
      </div>
      {proof === false && <div class="inote">Serwer nie zna pochodzenia tego przedmiotu (wykuty przed aktualizacją albo bez połączenia) — nie liczy się do rankingu Mocy i na arenie.</div>}
    </div>
  );
}
