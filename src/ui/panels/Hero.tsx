import { LANDS, SETS, SLOTS, SLOT_ORDER } from '../../data';
import { itemName, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import type { FoeType, Item } from '../../engine/types';
import { useState } from 'preact/hooks';
import { f1, fmt, pct } from '../format';
import { SlotIcon } from '../icons';
import { itemUrl } from '../../art/render';
import { Px } from '../Px';
import { MountsView, PetsView, SkillsView } from './Companions';

type Sub = 'eq' | 'skills' | 'pets' | 'mounts';
const SUBS: [Sub, string][] = [['eq', 'Ekwipunek'], ['skills', 'Umiejętności'], ['pets', 'Chowaniec'], ['mounts', 'Wierzchowiec']];

export function HeroPanel({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
  const [sub, setSub] = useState<Sub>('eq');
  return (
    <>
      <div class="seg" role="tablist" aria-label="Bohater">
        {SUBS.map(([id, n]) => <button key={id} role="tab" aria-selected={sub === id} class={sub === id ? 'on' : ''} onClick={() => setSub(id)}>{n}</button>)}
      </div>
      {sub === 'eq' && <Equipment game={game} onItem={onItem} />}
      {sub === 'skills' && <SkillsView game={game} />}
      {sub === 'pets' && <PetsView game={game} />}
      {sub === 'mounts' && <MountsView game={game} />}
    </>
  );
}

function Equipment({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
  const s = game.s;
  const c = game.stats;
  const st: [string, string][] = [
    ['Moc', fmt(c.power)], ['Obrażenia', fmt(c.dmg)], ['Zdrowie', fmt(c.hp)], ['Krytyk', pct(c.crit)], ['Obr. krytyczne', pct(c.critd)],
    ['Szybkość ataku', '+' + pct(c.spd)], ['Kradzież życia', pct(c.ls)], ['Unik', pct(c.dodge)], ['Regeneracja', f1(c.regen) + '%/s'],
  ];
  const extra: string[] = [];
  if (c.boss + c.pog) extra.push(`+${f1(c.boss + c.pog)}% wobec bossów`);
  if (c.eldmg) extra.push(`+${f1(c.eldmg)}% obrażeń z żywiołów`);
  if (c.holy) extra.push(`+${f1(c.holy)}% wobec nieumarłych i demonów`);
  if (c.slow) extra.push(`wrogowie wolniejsi o ${f1(c.slow)}%`);
  for (const [t, v] of Object.entries(c.vs) as [FoeType, number][]) extra.push(`+${v}% wobec: ${t.toLowerCase()}`);
  return (
    <>
      <section class="card">
        <div class="eyebrow">Bohater</div>
        <div class="h">{s.name}</div>
        <p class="sub">{smithTitle(s.smith.fame).n} · najdalej: {LANDS[s.maxLand].n}</p>
        <div class="stats" style={{ marginTop: '10px' }}>
          {st.map(([k, v]) => <div class="stat" key={k}><small>{k}</small><b>{v}</b></div>)}
        </div>
        {extra.length > 0 && <p class="sub" style={{ marginTop: '8px' }}>{extra.join(' · ')}</p>}
      </section>
      {c.sets.length > 0 && (
        <section class="card">
          <div class="eyebrow">Zestawy</div>
          <ul class="sets">
            {c.sets.map(({ id, count }) => (
              <li key={id}>
                <b style={{ color: SETS[id].col }}>{SETS[id].n}</b> · {count}/4 części
                <div class={count >= 2 ? 'on' : 'off'}>2 części: {SETS[id].d2}</div>
                <div class={count >= 4 ? 'on' : 'off'}>4 części: {SETS[id].d4}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section class="card">
        <div class="row"><div class="eyebrow">Ekwipunek</div><span class="sub">Kropki = progi legendy{s.seals ? ` · Pieczęcie Legendy: ${s.seals}` : ''}</span></div>
        <div class="slots" style={{ marginTop: '10px' }}>
          {SLOT_ORDER.map(slot => {
            const it = s.eq[slot];
            if (!it) return <button key={slot} class="slot empty" disabled><SlotIcon slot={slot} /><span>{SLOTS[slot].n}</span><div class="pips" /></button>;
            return (
              <button key={slot} class={`slot r${it.r}`} aria-label={itemName(it)} onClick={() => onItem(it)}>
                <Px src={itemUrl(it.kind, it.ore, it.r)} size={36} />
                <span>{itemName(it)}</span>
                <div class="pips">{[1, 2, 3].map(i => <i key={i} class={(it.ls || 0) >= i ? 'on' : ''} />)}</div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
