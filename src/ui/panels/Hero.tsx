import { LANDS, SLOTS, SLOT_ORDER } from '../../data';
import { itemName, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import type { FoeType, Item } from '../../engine/types';
import { f1, fmt, pct } from '../format';
import { SlotIcon } from '../icons';

export function HeroPanel({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
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
      <section class="card">
        <div class="row"><div class="eyebrow">Ekwipunek</div><span class="sub">Kropki = progi legendy</span></div>
        <div class="slots" style={{ marginTop: '10px' }}>
          {SLOT_ORDER.map(slot => {
            const it = s.eq[slot];
            if (!it) return <button key={slot} class="slot empty" disabled><SlotIcon slot={slot} /><span>{SLOTS[slot].n}</span><div class="pips" /></button>;
            return (
              <button key={slot} class={`slot r${it.r}`} aria-label={itemName(it)} onClick={() => onItem(it)}>
                <SlotIcon slot={slot} />
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
