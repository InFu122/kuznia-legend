// Dziedzictwo: karta w zakładce Bohater i okno nowego pokolenia (wybór Pamiątki Rodu).
import { useState } from 'preact/hooks';
import { B, LANDS, SLOTS, SLOT_ORDER } from '../../data';
import { itemUrl } from '../../art/render';
import { mainVal, itemName } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { legacyBlock, legacyStars } from '../../engine/legacy';
import type { Item, SlotId } from '../../engine/types';
import { getLink } from '../../save/server';
import { fmt, rarName } from '../format';
import { Px } from '../Px';
import { starsText } from '../texts';
import { Note, errText } from './ClanLife';

const heirLine = (it: Item) => {
  const k = B.LEGACY_HEIR_PCT / 100;
  return `${SLOTS[it.slot].stat === 'dmg' ? 'Obrażenia' : 'Zdrowie'} +${fmt(mainVal(it) * k)}${it.subs.length ? ` i ${B.LEGACY_HEIR_PCT}% statystyk dodatkowych` : ''}`;
};

/** Karta Dziedzictwa w zakładce Bohater. */
export function LegacyCard({ game, onOpen, onItem }: { game: Game; onOpen: () => void; onItem: (it: Item) => void }) {
  const s = game.s;
  const L = s.legacy;
  const block = legacyBlock(s);
  if (!L.gen && s.forge.lvl < 20) return null; // pokazujemy, gdy cel jest już widoczny
  return (
    <section class="card legacy">
      <div class="eyebrow">Dziedzictwo{L.gen ? ` · pokolenie ${L.gen + 1}` : ''}</div>
      {L.stars > 0 && <div class="h">{starsText(L.stars)}: +{L.stars * B.LEGACY_STAR_PCT}% obrażeń i złota</div>}
      {L.item && (
        <button class={`heir hr${L.item.r}`} onClick={() => onItem(L.item!)} aria-label={`Pamiątka Rodu: ${itemName(L.item)}`}>
          <Px src={itemUrl(L.item.kind, L.item.ore, L.item.r)} size={36} />
          <span><b>Pamiątka Rodu</b><br />{itemName(L.item)} · {heirLine(L.item)}</span>
        </button>
      )}
      <p class="sub" style={{ marginTop: '6px' }}>
        Od {B.LEGACY_FORGE}. poziomu kuźni bohater może przejść na emeryturę: kuźnia, kampania, ekwipunek, złoto i rudy zaczynają się od nowa,
        a ty dostajesz Gwiazdy Mistrza i wybierasz Pamiątkę Rodu.
      </p>
      <button class="btn primary" style={{ marginTop: '8px' }} disabled={!!block} onClick={onOpen}>{block ? `Nowe pokolenie — ${block}` : 'Nowe pokolenie…'}</button>
    </section>
  );
}

/** Okno nowego pokolenia. */
export function LegacyView({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const L = s.legacy;
  const [pick, setPick] = useState<SlotId | null>(() => {
    // domyślnie przedmiot z najwyższą rzadkością (przebudzony ma pierwszeństwo)
    const eq = SLOT_ORDER.map(sl => s.eq[sl]).filter((x): x is Item => !!x);
    eq.sort((a, b) => Number(!!b.aw) - Number(!!a.aw) || b.r - a.r || mainVal(b) - mainVal(a));
    return eq[0]?.slot ?? null;
  });
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const gain = legacyStars(s);
  const block = legacyBlock(s);
  const go = async () => {
    if (!sure) { setSure(true); return; }
    setBusy(true); setMsg('');
    try {
      if (game.net) {
        const l = getLink();
        if (!l?.online) { setMsg('Nowe pokolenie zaczyna serwer — połącz się z internetem.'); return; }
        game.legacyStart(await l.legacy(pick));
      } else if (!game.legacy(pick)) { setMsg('Nie udało się.'); return; }
      close();
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <div class="eyebrow">Dziedzictwo · pokolenie {L.gen + 2}</div>
      <div class="h">Bohater przechodzi na emeryturę</div>
      <ul class="list">
        <li><b>Dostajesz:</b> {starsText(gain)} (1 za kuźnię {B.LEGACY_FORGE}. poziomu i 1 za każde {B.LEGACY_LANDS_PER_STAR} pokonane krainy) — każda daje +{B.LEGACY_STAR_PCT}% obrażeń i złota na zawsze. Razem: {starsText(L.stars + gain)}.</li>
        <li><b>Od nowa:</b> kuźnia (1. poziom), kampania ({LANDS[0].n}), ekwipunek, złoto, rudy, domieszki i rudy unikalne.</li>
        <li><b>Zostaje:</b> Nauka, umiejętności, chowańce i wierzchowce, Księgi, Zwoje, Siodła, Kamienie, Pieczęcie, jaja, rekordy lochów, Klejnoty, przepustka i klan.</li>
      </ul>
      <div class="eyebrow" style={{ marginTop: '6px' }}>Pamiątka Rodu ({B.LEGACY_HEIR_PCT}% statystyk, dodatkowy slot)</div>
      <ul class="clist heirpick">
        {L.item && (
          <li class={pick === null ? 'on' : ''} onClick={() => setPick(null)}>
            <Px src={itemUrl(L.item.kind, L.item.ore, L.item.r)} size={32} />
            <div class="cmain"><div class="cname">Zostaw obecną: {itemName(L.item)}</div><div class="tech-cost">{heirLine(L.item)}</div></div>
          </li>
        )}
        {SLOT_ORDER.map(sl => {
          const it = s.eq[sl];
          if (!it) return null;
          return (
            <li key={sl} class={pick === sl ? 'on' : ''} onClick={() => setPick(sl)}>
              <Px src={itemUrl(it.kind, it.ore, it.r)} size={32} />
              <div class="cmain">
                <div class={`cname rc${it.r}`}>{itemName(it)}{it.aw && <span class="tag">przebudzony</span>}</div>
                <div class="tech-cost">{rarName(it.r)} · {heirLine(it)}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <Note msg={msg} />
      <button class={`btn ${sure ? 'danger' : 'primary'}`} disabled={busy || !!block} onClick={go}>
        {block ? `Jeszcze nie: ${block}` : sure ? 'Na pewno — zaczynam nowe pokolenie' : 'Zacznij nowe pokolenie'}
      </button>
      <button class="btn" onClick={close}>Anuluj</button>
    </>
  );
}
