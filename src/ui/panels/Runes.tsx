// Runy slotów (zakładka Bohater) i przekuwanie statystyk dodatkowych (okno założonego przedmiotu).
import { useState } from 'preact/hooks';
import { B, ORES, SLOTS, SLOT_ORDER } from '../../data';
import { itemUrl, oreUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { reforgeBlock, reforgeCost, runeBlock, runeCost, runeLvl, subText } from '../../engine/runes';
import type { Item, SlotId } from '../../engine/types';
import { getLink } from '../../save/server';
import { fmt } from '../format';
import { SlotIcon } from '../icons';
import { Px } from '../Px';
import { Note, errText } from './ClanLife';

const CostLine = ({ ore, n, gold, lack }: { ore: number; n: number; gold: number; lack?: boolean }) => (
  <span class={`rcost${lack ? ' lack' : ''}`}><Px src={oreUrl(ore)} size={14} />{fmt(n)} <Px src={resUrl('zloto')} size={14} />{fmt(gold)}</span>
);

/** Karta run slotów. */
export function RunesCard({ game }: { game: Game }) {
  const s = game.s;
  const any = SLOT_ORDER.some(sl => runeLvl(s, sl) > 0);
  if (s.forge.lvl < B.RUNE_FORGE_LVL && !any) return null;
  return (
    <section class="card">
      <div class="row"><div class="eyebrow">Runy slotów</div><span class="sub">+{B.RUNE_PCT}% głównej statystyki za poziom</span></div>
      <ul class="runelist">
        {SLOT_ORDER.map(sl => {
          const L = runeLvl(s, sl);
          const it = s.eq[sl];
          const block = runeBlock(s, sl);
          const c = L < B.RUNE_MAX ? runeCost(s, L + 1) : null;
          return (
            <li key={sl}>
              <span class="rslot">{it ? <Px src={itemUrl(it.kind, it.ore, it.r)} size={24} /> : <SlotIcon slot={sl} />}</span>
              <div class="cmain">
                <b>{SLOTS[sl].n}</b> <span class="rlvl">{L ? `runa ${L} · +${L * B.RUNE_PCT}%` : 'bez runy'}</span>
                {c && <div><CostLine ore={c.ore} n={c.n} gold={c.gold} lack={!!block && block !== `od ${B.RUNE_FORGE_LVL}. poziomu kuźni`} /></div>}
              </div>
              <button class="btn small" disabled={!!block} title={block ?? undefined} onClick={() => game.upgradeRune(sl)}>{L >= B.RUNE_MAX ? 'maks.' : '+1'}</button>
            </li>
          );
        })}
      </ul>
      <p class="sub">Runa zostaje w slocie, gdy zmieniasz przedmiot, i przechodzi do nowego pokolenia. Na kolejne poziomy idą coraz lepsze rudy: 1–5 {ORES[0].n}, 6–10 {ORES[1].n}, 11–15 {ORES[2].n}…</p>
    </section>
  );
}

/** Przekuwanie w oknie założonego przedmiotu. */
export function Reforge({ game, it }: { game: Game; it: Item }) {
  const [cand, setCand] = useState<{ item: Item; i: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const s = game.s;
  if (s.forge.lvl < B.REFORGE_FORGE_LVL) return <p class="sub">Przekuwanie statystyk dodatkowych od {B.REFORGE_FORGE_LVL}. poziomu kuźni.</p>;
  if (!it.subs.length) return null;
  const cur = s.eq[it.slot] ?? it;
  const block = reforgeBlock(s, cur);
  const c = reforgeCost(s, cur);
  const roll = async (i: number) => {
    setBusy(true); setMsg('');
    try {
      if (!game.net) {
        const x = game.reforge(cur.slot as SlotId, i);
        if (!x) { setMsg('Nie udało się.'); return; }
        setCand({ item: x, i });
        return;
      }
      const l = getLink();
      if (!l?.online) { setMsg('Przekuwanie działa po połączeniu z serwerem.'); return; }
      if (!game.payReforge(cur.slot)) { setMsg('Za mało rudy albo złota.'); return; }
      try { setCand({ item: (await l.reforge(cur, i)).item, i }); } catch (e) { game.refundReforge(cur.slot); throw e; }
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  if (cand) {
    const old = cur.subs[cand.i];
    const neu = cand.item.subs[cand.i];
    return (
      <div class="reforge">
        <div class="eyebrow">Przekuwanie — wybierz wersję</div>
        <div class="rf-pair">
          <button class="btn" onClick={() => setCand(null)}><small>Zostaw</small><b>{subText(old)}</b></button>
          <button class="btn primary" onClick={() => { game.acceptReforge(cand.item); setCand(null); setMsg('Przedmiot przekuty.'); }}><small>Zachowaj nową</small><b>{subText(neu)}</b></button>
        </div>
      </div>
    );
  }
  return (
    <div class="reforge">
      <div class="row"><div class="eyebrow">Przekuwanie</div><CostLine ore={c.ore} n={c.n} gold={c.gold} lack={!!block} /></div>
      <ul class="rf-list">
        {cur.subs.map((x, i) => (
          <li key={i}><span>{subText(x)}</span><button class="btn small" disabled={busy || !!block} onClick={() => roll(i)}>Przekuj</button></li>
        ))}
      </ul>
      <Note msg={msg || (block && block.startsWith('za mało') ? `Brakuje: ${block.replace('za mało: ', '').replace('za mało ', '')}.` : '')} />
    </div>
  );
}
