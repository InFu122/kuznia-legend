import { B, SETS, SLOTS, SLOT_ORDER, landDef, R, rGe, type FeatureId } from '../../data';
import { itemName, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import type { FoeType, Item } from '../../engine/types';
import { useState } from 'preact/hooks';
import { f1, fmt, pct } from '../format';
import { LockIcon, SlotIcon } from '../icons';
import { itemUrl, landBgUrl, resUrl } from '../../art/render';
import { IconEyebrow, StatIcon } from '../Banner';
import { Px } from '../Px';
import { MountsView, PetsView, SkillsView } from './Companions';
import { showProfile } from '../profile';
import { HeroSprite, bestRarity } from '../Arena';
import { LegacyCard } from './Legacy';
import { RunesCard } from './Runes';

type Sub = 'eq' | 'skills' | 'pets' | 'mounts';
/** Funkcje odblokowywane w podzakładkach (kłódka i znaczek „nowe”). */
const SUB_FEATURE: Partial<Record<Sub, FeatureId>> = { skills: 'umiejetnosci', pets: 'chowance', mounts: 'wierzchowce' };
const SUBS: [Sub, string][] = [['eq', 'Ekwipunek'], ['skills', 'Umiejętności'], ['pets', 'Chowaniec'], ['mounts', 'Wierzchowiec']];

/** Ikonka podzakładki: broń bohatera (albo kowadło), zwój, łapa, siodło. */
function subIcon(game: Game, id: Sub): string {
  if (id === 'eq') { const w = game.s.eq.bron; return w ? itemUrl(w.kind, w.ore, w.r) : resUrl('kowadlo'); }
  return resUrl(id === 'skills' ? 'zwoj' : id === 'pets' ? 'lapa' : 'siodlo');
}

export function HeroPanel({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
  const [sub, setSub] = useState<Sub>('eq');
  return (
    <>
      <div class="seg seg-ic" role="tablist" aria-label="Bohater">
        {SUBS.map(([id, n]) => {
          const f = SUB_FEATURE[id];
          const locked = !!f && !game.unlocked(f);
          const fresh = !!f && game.s.unlNew.includes(f);
          return (
            <button key={id} role="tab" data-sub={id} aria-selected={sub === id} class={`${sub === id ? 'on' : ''}${locked ? ' locked' : ''}`}
              onClick={() => { setSub(id); if (f) game.seenFeatures([f]); }}>
              <span class="si-ic"><Px src={subIcon(game, id)} size={28} />{locked && <LockIcon />}</span>
              <span class="si-n">{n}</span>{fresh && <i class="tab-dot new" aria-label="nowe" />}
            </button>
          );
        })}
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
  const st: [string, string, string][] = [
    ['moc', 'Moc', fmt(c.power)], ['dmg', 'Obrażenia', fmt(c.dmg)], ['hp', 'Zdrowie', fmt(c.hp)], ['crit', 'Krytyk', pct(c.crit)], ['critd', 'Obr. krytyczne', pct(c.critd)],
    ['spd', 'Szybkość ataku', '+' + pct(c.spd)], ['ls', 'Kradzież życia', pct(c.ls)], ['dodge', 'Unik', pct(c.dodge)], ['regen', 'Regeneracja', f1(c.regen) + '%/s'],
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
        <div class="hero-head">
          <div class={`actor hero doll scene${rGe(bestRarity(s.eq), R.RZADKI) ? ' r' + bestRarity(s.eq) : ''}`} aria-hidden="true"
            style={{ '--bg': `url(${landBgUrl(s.cur.land)})` } as Record<string, string>}><HeroSprite eq={s.eq} skin={s.look.skin} /></div>
          <div>
            <div class="eyebrow">Bohater</div>
            <div class="h">{s.name}</div>
            <p class="sub">{smithTitle(s.smith.fame).n} · najdalej: {landDef(s.maxLand).n}</p>
            <button class="btn small" style={{ marginTop: '6px' }} onClick={() => showProfile(null)}>Podgląd bohatera</button>
          </div>
        </div>
        <div class="stats" style={{ marginTop: '10px' }}>
          {st.map(([ic, k, v]) => (
            <div class={`stat sti${ic === 'moc' ? ' moc' : ''}`} key={k}>
              {ic === 'moc' ? <Px src={resUrl('moc')} size={18} cls="stat-ic" /> : <StatIcon k={ic} />}
              <span><small>{k}</small><b>{v}</b></span>
            </div>
          ))}
        </div>
        {extra.length > 0 && <p class="sub" style={{ marginTop: '8px' }}>{extra.join(' · ')}</p>}
        {c.aura > 0 && (
          <div class="iaura" style={{ marginTop: '8px' }}>
            <span aria-hidden="true">✦</span>
            <span><b>Boska aura ×{c.aura}:</b> +{c.aura * B.DIVINE_AURA}% obrażeń i zdrowia (po {B.DIVINE_AURA}% za każdy założony Boski przedmiot).</span>
          </div>
        )}
      </section>
      {c.sets.length > 0 && (
        <section class="card">
          <IconEyebrow icon={<Px src={resUrl('pieczec')} size={16} />}>Zestawy</IconEyebrow>
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
        <div class="row"><IconEyebrow icon={<Px src={resUrl('kowadlo')} size={16} />}>Ekwipunek</IconEyebrow><span class="sub">Kropki = progi legendy{s.seals ? ` · Pieczęcie Legendy: ${s.seals}` : ''}</span></div>
        <div class="slots" style={{ marginTop: '10px' }}>
          {SLOT_ORDER.map(slot => {
            const it = s.eq[slot];
            if (!it) return <button key={slot} class="slot empty" disabled><SlotIcon slot={slot} /><span>{SLOTS[slot].n}</span><div class="pips" /></button>;
            return (
              <button key={slot} class={`slot r${it.r}`} aria-label={itemName(it)} onClick={() => onItem(it)}>
                <Px src={itemUrl(it.kind, it.ore, it.r)} size={36} />
                {/* Ucięta nazwa („Żelazna …”) nic nie mówi: zwykły przedmiot pokazuje poziom, przebudzony i Boski — imię. */}
                <span>{it.aw || it.r === R.BOSKI ? itemName(it) : `poz. ${it.lvl}`}</span>
                <div class="pips">{[1, 2, 3].map(i => <i key={i} class={(it.ls || 0) >= i ? 'on' : ''} />)}</div>
              </button>
            );
          })}
        </div>
      </section>
      <RunesCard game={game} />
      <LegacyCard game={game} onItem={onItem} />
    </>
  );
}
