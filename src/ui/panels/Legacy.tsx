// Premie z dawnego Dziedzictwa (nowe pokolenie zostało wycofane — kuźnia rośnie do 200. poziomu).
// Karta w zakładce Bohater widać tylko u graczy, którzy je przeszli: Gwiazdy Mistrza i Pamiątka Rodu działają dalej.
import { B, SLOTS } from '../../data';
import { itemUrl } from '../../art/render';
import { mainVal, itemName } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { hasLegacy, legacyPct } from '../../engine/legacy';
import type { Item } from '../../engine/types';
import { fmt } from '../format';
import { Px } from '../Px';
import { starsText } from '../texts';

const heirLine = (it: Item) => {
  const k = B.LEGACY_HEIR_PCT / 100;
  return `${SLOTS[it.slot].stat === 'dmg' ? 'Obrażenia' : 'Zdrowie'} +${fmt(mainVal(it) * k)}${it.subs.length ? ` i ${B.LEGACY_HEIR_PCT}% statystyk dodatkowych` : ''}`;
};

/** Karta premii z Dziedzictwa w zakładce Bohater (tylko gdy gracz je ma). */
export function LegacyCard({ game, onItem }: { game: Game; onItem: (it: Item) => void }) {
  const s = game.s;
  const L = s.legacy;
  if (!hasLegacy(s)) return null;
  return (
    <section class="card legacy">
      <div class="eyebrow">Dziedzictwo · premie na zawsze</div>
      {L.stars > 0 && <div class="h">{starsText(L.stars)}: +{legacyPct(s)}% obrażeń i złota</div>}
      {L.item && (
        <button class={`heir hr${L.item.r}`} onClick={() => onItem(L.item!)} aria-label={`Pamiątka Rodu: ${itemName(L.item)}`}>
          <Px src={itemUrl(L.item.kind, L.item.ore, L.item.r)} size={36} />
          <span><b>Pamiątka Rodu</b><br />{itemName(L.item)} · {heirLine(L.item)}</span>
        </button>
      )}
      <p class="sub" style={{ marginTop: '6px' }}>
        Nowych pokoleń już nie ma — kuźnia rośnie do {B.FORGE_MAX}. poziomu. Premie z twojego Dziedzictwa zostają na zawsze.
      </p>
    </section>
  );
}
