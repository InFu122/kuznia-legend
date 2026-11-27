import { B, RAR, SLOTS, SLOT_ORDER, landDef, R, rGe, type FeatureId } from '../../data';
import { itemName, mainVal, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import type { FoeType, Item } from '../../engine/types';
import { useState } from 'preact/hooks';
import { f1, fmt, pct } from '../format';
import { LockIcon, SlotIcon } from '../icons';
import { elemUrl, foeUrl, itemUrl, landBgUrl, resUrl, techUrl } from '../../art/render';
import { IconEyebrow, StatIcon } from '../Banner';
import { Px } from '../Px';
import { MountsView, PetsView, SkillsView } from './Companions';
import { showProfile } from '../profile';
import { HeroSprite, bestRarity } from '../Arena';
import { LegacyCard } from './Legacy';
import { RuneBadge, RunesTab } from './Runes';
import { QBadge, qText } from '../ItemCard';
import { runeLvl } from '../../engine/runes';
import { heroTodo } from '../todo';

type Sub = 'eq' | 'runes' | 'skills' | 'pets' | 'mounts';
/** Funkcje odblokowywane w podzakładkach (kłódka i znaczek „nowe”). */
const SUB_FEATURE: Partial<Record<Sub, FeatureId>> = { skills: 'umiejetnosci', pets: 'chowance', mounts: 'wierzchowce' };
// Runy mają własną zakładkę (Ekwipunek zostaje krótki); nazwy wszystkich pięciu mieszczą się w równych częściach.
const SUBS: [Sub, string][] = [['eq', 'Ekwipunek'], ['runes', 'Runy'], ['skills', 'Umiejętności'], ['pets', 'Chowaniec'], ['mounts', 'Wierzchowiec']];

/** Ikonka podzakładki: broń bohatera (albo kowadło), runa, zwój, łapa, siodło. */
function subIcon(game: Game, id: Sub): string {
  if (id === 'eq') { const w = game.s.eq.bron; return w ? itemUrl(w.kind, w.ore, w.r) : resUrl('kowadlo'); }
  return resUrl(id === 'runes' ? 'runa' : id === 'skills' ? 'zwoj' : id === 'pets' ? 'lapa' : 'siodlo');
}

export function HeroPanel({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
  const [sub, setSub] = useState<Sub>('eq');
  const todo = heroTodo(game);
  return (
    <>
      <div class="seg seg-ic seg5" role="tablist" aria-label="Bohater">
        {SUBS.map(([id, n]) => {
          const f = SUB_FEATURE[id];
          const locked = (!!f && !game.unlocked(f)) || (id === 'runes' && game.s.forge.lvl < B.RUNE_FORGE_LVL && !SLOT_ORDER.some(sl => runeLvl(game.s, sl) > 0));
          return (
            <button key={id} role="tab" data-sub={id} aria-selected={sub === id} class={`${sub === id ? 'on' : ''}${locked ? ' locked' : ''}`}
              onClick={() => { setSub(id); if (f) game.seenFeatures([f]); }}>
              <span class="si-ic"><Px src={subIcon(game, id)} size={28} />{locked && <LockIcon />}</span>
              <span class="si-n">{n}</span>{sub !== id && todo[id] && <i class="tab-dot" aria-label="coś do otwarcia" />}
            </button>
          );
        })}
      </div>
      {sub === 'eq' && <Equipment game={game} onItem={onItem} />}
      {sub === 'runes' && <RunesTab game={game} />}
      {sub === 'skills' && <SkillsView game={game} />}
      {sub === 'pets' && <PetsView game={game} />}
      {sub === 'mounts' && <MountsView game={game} />}
    </>
  );
}

/** Rodzaje wrogów — ikonka to typowy wróg danego rodzaju. */
const FOE_ICON: Record<FoeType, [string, string]> = {
  Bestie: ['Leśny wilk', 'Bestii'], Nieumarli: ['Szkielet', 'Nieumarłych'], Demony: ['Chochlik', 'Demonów'], Smoki: ['Młody smok', 'Smoków'],
};

/**
 * Premie bojowe pod statystykami: zwinięte — rząd ikonek z wartościami; po dotknięciu — lista z opisami.
 * Nie zajmują pół strony, a każda ma ikonkę zamiast samego tekstu.
 */
function Bonuses({ c }: { c: Game['stats'] }) {
  const [open, setOpen] = useState(false);
  const rows: { ic: string; v: string; n: string; d?: string; px?: boolean }[] = [];
  for (const [t, v] of Object.entries(c.vs) as [FoeType, number][]) {
    if (v) rows.push({ ic: foeUrl(FOE_ICON[t][0], t), v: `+${f1(v)}%`, n: `Obrażenia wobec ${FOE_ICON[t][1]}`, d: 'cechy przebudzenia (Zguba …)', px: true });
  }
  if (c.boss + c.pog) rows.push({ ic: techUrl('w_pogromca'), v: `+${f1(c.boss + c.pog)}%`, n: 'Obrażenia wobec bossów', d: c.pog ? `w tym +${f1(c.pog)}% z cechy Pogromca` : undefined });
  if (c.eldmg) rows.push({ ic: elemUrl('zar'), v: `+${f1(c.eldmg)}%`, n: 'Obrażenia z żywiołów', d: 'żywioły przedmiotów i badania' });
  if (c.holy) rows.push({ ic: elemUrl('jasn'), v: `+${f1(c.holy)}%`, n: 'Światło: wobec Nieumarłych i Demonów' });
  if (c.slow) rows.push({ ic: elemUrl('szron'), v: `−${f1(c.slow)}%`, n: 'Spowolnienie wrogów', d: 'wrogowie atakują wolniej' });
  if (c.abyss) rows.push({ ic: techUrl('w_otchlan'), v: `+${f1(c.abyss)}%`, n: 'Obrażenia wobec wrogów Otchłani' });
  if (c.aura > 0) rows.push({ ic: resUrl('klejnot'), v: `+${c.aura * B.DIVINE_AURA}%`, n: `Boska aura ×${c.aura}`, d: `obrażenia i zdrowie, po ${B.DIVINE_AURA}% za każdy założony Boski przedmiot` });
  if (!rows.length) return null;
  return (
    <div class={`bonus${open ? ' open' : ''}`}>
      <button class="bonus-sum" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span class="bonus-t">Premie</span>
        <span class="bonus-chips">
          {rows.map((r, i) => <span key={i} class="bchip" title={r.n}><Px src={r.ic} size={16} cls={r.px ? 'flip smooth' : ''} />{r.v}</span>)}
        </span>
        <i class="bonus-chev" aria-hidden="true">▾</i>
      </button>
      {open && (
        <ul class="bonus-list">
          {rows.map((r, i) => (
            <li key={i}>
              <span class="bl-ic"><Px src={r.ic} size={24} cls={r.px ? 'flip smooth' : ''} /></span>
              <span class="bl-t"><b>{r.n}</b>{r.d && <small>{r.d}</small>}</span>
              <b class="bl-v">{r.v}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Equipment({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
  const s = game.s;
  const c = game.stats;
  const st: [string, string, string][] = [
    ['moc', 'Moc', fmt(c.power)], ['dmg', 'Obrażenia', fmt(c.dmg)], ['hp', 'Zdrowie', fmt(c.hp)], ['crit', 'Krytyk', pct(c.crit)], ['critd', 'Obr. krytyczne', pct(c.critd)],
    ['spd', 'Szybkość ataku', '+' + pct(c.spd)], ['ls', 'Kradzież życia', pct(c.ls)], ['dodge', 'Unik', pct(c.dodge)], ['regen', 'Regeneracja', f1(c.regen) + '%/s'],
  ];
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
        <Bonuses c={c} />
      </section>
      <section class="card">
        <div class="row"><IconEyebrow icon={<Px src={resUrl('kowadlo')} size={16} />}>Ekwipunek</IconEyebrow>{s.seals > 0 && <span class="sub">Pieczęcie Legendy: {s.seals}</span>}</div>
        {/* Karta każdej części: nazwa miejsca, przedmiot w kolorze rzadkości, poziom i główna statystyka; kropki — progi legendy. */}
        <div class="eqcards" style={{ marginTop: '10px' }}>
          {SLOT_ORDER.map(slot => {
            const it = s.eq[slot];
            const rl = runeLvl(s, slot);
            if (!it) return (
              <button key={slot} class="eqc empty" disabled>
                <span class="eqc-ic"><SlotIcon slot={slot} /><RuneBadge lvl={rl} cls="on-slot" /></span>
                <span class="eqc-t"><small>{SLOTS[slot].n}</small><b>puste miejsce</b><span>wykuj przedmiot w Kuźni</span></span>
              </button>
            );
            const dmg = SLOTS[slot].stat === 'dmg';
            return (
              <button key={slot} class={`eqc r${it.r}`} onClick={() => onItem(it)}
                aria-label={`${SLOTS[slot].n}: ${itemName(it)}, ${RAR[it.r].n}, ${qText(it.q)}${rl ? `, runa +${rl * B.RUNE_PCT}%` : ''}${it.aw && !it.awc ? ', możesz wybrać cechę' : ''}`}>
                <span class="eqc-ic"><Px src={itemUrl(it.kind, it.ore, it.r)} size={36} /><QBadge q={it.q} size="sm" /><RuneBadge lvl={rl} cls="on-slot" />{it.aw && !it.awc && <i class="slot-aw" title="Wybierz cechę przebudzenia, za darmo" />}</span>
                <span class="eqc-t">
                  <small>{SLOTS[slot].n}</small>
                  <b class={`rt${it.r}`}>{itemName(it)}</b>
                  <span>{RAR[it.r].n} · poz. {it.lvl}</span>
                  <span class="eqc-st">{dmg ? '⚔' : '♥'} {fmt(mainVal(it))} {dmg ? 'obr.' : 'zdr.'}</span>
                </span>
                <span class="pips">{[1, 2, 3].map(i => <i key={i} class={(it.ls || 0) >= i ? 'on' : ''} />)}</span>
              </button>
            );
          })}
        </div>
      </section>
      <LegacyCard game={game} onItem={onItem} />
    </>
  );
}
