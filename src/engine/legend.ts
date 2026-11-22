// Legenda przedmiotu: założone przedmioty zbierają Sławę Czynów (1 za wroga, 50 za bossa, Pieczęcie Legendy).
// Progi: Zahartowany (1 000, +5% statystyki głównej), Sławny (5 000, +10%), Przebudzony (20 000, +15% i cecha).
// Cechę przebudzenia wybiera gracz: Zguba jednego rodzaju wrogów (+25% obrażeń wobec nich) albo Pogromca (+15% wobec bossów).
// Gra podpowiada (i ustawia na start) to, z czego przedmiot ma najwięcej Sławy. Pierwszy wybór jest darmowy (także dla
// przedmiotów przebudzonych, zanim dało się wybierać), każda kolejna zmiana kosztuje złoto (B.AW_CHANGE_WAVES fal).
import { B, LEGEND } from '../data';
import { toast, type Ctx } from './context';
import { AW_KEYS, awKey, awakeningFor, awakeningOf, baseName, goldWaveOf, legStage, type AwKey } from './formulas';
import { invalidate } from './stats';
import type { FoeType, GameState, Item, SlotId } from './types';

export { awakeningFor };

/** Dodaje Sławę Czynów każdemu założonemu przedmiotowi. */
export function addFame(ctx: Ctx, kills: number, type: FoeType, boss: boolean): void {
  for (const it of Object.values(ctx.s.eq)) {
    if (!it) continue;
    if (boss) { it.fame += B.FAME_BOSS; it.bosses = (it.bosses || 0) + 1; }
    else { it.fame += kills; it.kills[type] = (it.kills[type] ?? 0) + kills; }
    checkLegend(ctx, it, false);
  }
}

export function checkLegend(ctx: Ctx, it: Item, quiet: boolean): void {
  const st = legStage(it.fame);
  if (st <= (it.ls || 0)) return;
  it.ls = st;
  if (st === 3 && !it.aw) {
    // Na start podpowiedź; okno przebudzenia pozwala wybrać inną cechę za darmo.
    it.aw = awakeningFor(it);
    if (!quiet) ctx.emit({ t: 'modal', m: { kind: 'awaken', item: it } });
  } else if (!quiet && st < 3) {
    toast(ctx, `${baseName(it)} jest teraz ${LEGEND[st].n} (+${Math.round(LEGEND[st].b * 100)}% do statystyki)`, 'good');
  }
  invalidate(ctx);
}


/** Ile kosztuje zmiana cechy (0 — pierwszy wybór, darmowy). */
export function awChangeCost(s: Pick<GameState, 'bestG' | 'forge'>, it: Item): number {
  return (it.awc ?? 0) > 0 ? Math.round(goldWaveOf(s) * B.AW_CHANGE_WAVES) : 0;
}

/**
 * Wybór albo zmiana cechy przebudzonego przedmiotu założonego w `slot`. Wybranie tej samej cechy przy pierwszym
 * wyborze tylko go potwierdza (bez kosztu); później ta sama cecha nic nie zmienia.
 */
export function setAwakening(ctx: Ctx, slot: SlotId, key: AwKey): boolean {
  const s = ctx.s;
  const it = s.eq[slot];
  if (!it || !it.aw || !AW_KEYS.includes(key)) return false;
  const same = awKey(it.aw) === key;
  const first = (it.awc ?? 0) === 0;
  if (same && !first) return false;
  const cost = same ? 0 : awChangeCost(s, it);
  if (s.gold < cost) { toast(ctx, 'Za mało złota na zmianę cechy', 'bad'); return false; }
  s.gold -= cost;
  it.aw = awakeningOf(key);
  it.awc = (it.awc ?? 0) + 1;
  if (!same) toast(ctx, `${baseName(it)} — nowa cecha: ${it.aw.name}`, 'good');
  ctx.dirty = true;
  invalidate(ctx);
  return true;
}
