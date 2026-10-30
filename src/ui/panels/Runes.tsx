// Runy slotów (zakładka Bohater) i przekuwanie statystyk dodatkowych (okno założonego przedmiotu).
import { useState } from 'preact/hooks';
import { B, ORES, SLOTS, SLOT_ORDER } from '../../data';
import { itemUrl, oreUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { reforgeBlock, reforgeCost, runeBlock, runeCost, runeLvl, runePay, subText } from '../../engine/runes';
import type { Item, SlotId } from '../../engine/types';
import { getLink } from '../../save/server';
import { fmt } from '../format';
import { SlotIcon } from '../icons';
import { Px } from '../Px';
import { Note, errText } from './ClanLife';
import { InfoBtn } from './Forge';

const CostLine = ({ ore, n, gold, lack }: { ore: number; n: number; gold: number; lack?: boolean }) => (
  <span class={`rcost${lack ? ' lack' : ''}`}><Px src={oreUrl(ore)} size={14} />{fmt(n)} <Px src={resUrl('zloto')} size={14} />{fmt(gold)}</span>
);

/** Pasek runy: 6 odcinków po 5 poziomów, każdy w kolorze rudy, którą się za nie płaci. */
function RuneBar({ s, lvl }: { s: Game['s']; lvl: number }) {
  return (
    <span class="rbar" aria-hidden="true">
      {Array.from({ length: B.RUNE_MAX / 5 }, (_, t) => {
        const fill = Math.max(0, Math.min(5, lvl - t * 5)) / 5;
        return <i key={t} style={{ '--c': ORES[runeCost(s, t * 5 + 1).ore].col, '--f': fill } as Record<string, string | number>} />;
      })}
    </span>
  );
}

/** Karta run slotów. */
export function RunesCard({ game }: { game: Game }) {
  const s = game.s;
  const any = SLOT_ORDER.some(sl => runeLvl(s, sl) > 0);
  if (s.forge.lvl < B.RUNE_FORGE_LVL && !any) return null;
  const locked = s.forge.lvl < B.RUNE_FORGE_LVL;
  const total = SLOT_ORDER.reduce((a, sl) => a + runeLvl(s, sl), 0);
  return (
    <section class="card runes">
      <div class="row">
        <div class="rhead"><Px src={resUrl('runa')} size={28} /><div><div class="eyebrow">Runy slotów</div><div class="h">+{B.RUNE_PCT}% za poziom</div></div></div>
        <InfoBtn onClick={() => game.openModal({ kind: 'info', k: 'runes' })} label="Jak działają runy" />
      </div>
      <p class="sub">Runa wzmacnia główną statystykę przedmiotu w swoim slocie i zostaje w nim na zawsze. Razem: <b>{total}</b>/{B.RUNE_MAX * SLOT_ORDER.length} poziomów.{locked ? ` Ulepszanie od ${B.RUNE_FORGE_LVL}. poziomu kuźni.` : ''}</p>
      <ul class="runelist">
        {SLOT_ORDER.map(sl => {
          const L = runeLvl(s, sl);
          const it = s.eq[sl];
          const block = runeBlock(s, sl);
          const c = L < B.RUNE_MAX ? runePay(s, L + 1) : null;
          const base = L < B.RUNE_MAX ? runeCost(s, L + 1) : null;
          const lackOre = !!c && (s.ores[c.ore] ?? 0) < c.n;
          const lackGold = !!c && s.gold < c.gold;
          return (
            <li key={sl} class={L >= B.RUNE_MAX ? 'max' : ''}>
              <span class="rslot">{it ? <Px src={itemUrl(it.kind, it.ore, it.r)} size={28} /> : <SlotIcon slot={sl} />}<b class="rnum">{L}</b></span>
              <div class="cmain">
                <div class="rtop">
                  <b>{SLOTS[sl].n}</b>
                  <span class="rbonus">{L ? `+${L * B.RUNE_PCT}%` : 'bez runy'}{c && <> → <b>+{(L + 1) * B.RUNE_PCT}%</b></>}</span>
                </div>
                <RuneBar s={s} lvl={L} />
                {c ? (
                  <div class="rneed">
                    <span class={lackOre ? 'lack' : ''}><Px src={oreUrl(c.ore)} size={14} />{fmt(c.n)} × {ORES[c.ore].n} <small>(masz {fmt(s.ores[c.ore] ?? 0)})</small></span>
                    <span class={lackGold ? 'lack' : ''}><Px src={resUrl('zloto')} size={14} />{fmt(c.gold)} złota</span>
                    {base && base.ore !== c.ore && <small class="muted">zamiast: {ORES[base.ore].n} (brakuje)</small>}
                  </div>
                ) : <div class="rneed"><small class="muted">Maksymalny poziom</small></div>}
              </div>
              <button class="btn small primary" disabled={!!block} title={block ?? undefined} onClick={() => game.upgradeRune(sl)}>{L >= B.RUNE_MAX ? 'maks.' : '+1'}</button>
            </li>
          );
        })}
      </ul>
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
