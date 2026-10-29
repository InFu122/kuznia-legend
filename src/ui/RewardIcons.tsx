// Nagrody i zasoby jako ikonki z liczbą i nazwą — wszędzie, gdzie gra wymienia złoto, rudy, Księgi, Klejnoty itd.
import type { ComponentChildren } from 'preact';
import { DIVINE_ORE, ELEM, FRAMES, ORES, RAR, SETS, SKINS, type FrameId } from '../data';
import { avatarUrl, elemUrl, oreUrl, resUrl, setOreUrl } from '../art/render';
import type { ElemKey, Reward, SetId } from '../engine/types';
import { Avatar } from './Avatar';
import { Px } from './Px';
import { pl } from './texts';

/** Krótka liczba na ikonkę: 950, 12 tys., 1,2 mln. */
export function short(n: number): string {
  const v = Math.round(n);
  const d = (x: number) => (x >= 100 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString().replace('.', ','));
  if (v >= 1e9) return d(v / 1e9) + ' mld';
  if (v >= 1e6) return d(v / 1e6) + ' mln';
  if (v >= 1e4) return d(v / 1e3) + ' tys.';
  return v.toLocaleString('pl-PL');
}

/** Pozycja nagrody: ikona, liczba, słowo po liczbie (`w`), nazwa na kafelek (`nm`) i pełny opis (`t`). */
export interface RewardChip { key: string; ic?: string; n: string; w: string; nm: string; t: string; frame?: FrameId; cls?: string }

export function rewardChips(r: Reward): RewardChip[] {
  const out: RewardChip[] = [];
  const add = (key: string, ic: string, v: number, w: string, nm: string, cls?: string) => out.push({ key, ic, n: short(v), w, nm, t: `${short(v)} ${w}`, cls });
  if (r.gold) add('gold', resUrl('zloto'), r.gold, 'złota', 'złoto', 'gold');
  for (const [k, v] of Object.entries(r.ores ?? {})) if (v) add('o' + k, oreUrl(Number(k)), v, '× ' + ORES[Number(k)].n, ORES[Number(k)].n, Number(k) === DIVINE_ORE ? 'rt6' : undefined);
  for (const [k, v] of Object.entries(r.els ?? {})) if (v) add('e' + k, elemUrl(k), v, '× ' + ELEM[k as ElemKey].n, ELEM[k as ElemKey].n);
  for (const [k, v] of Object.entries(r.uniq ?? {})) if (v) add('u' + k, setOreUrl(k), v, '× ' + SETS[k as SetId].ore, SETS[k as SetId].ore);
  if (r.books) add('books', resUrl('ksiega'), r.books, pl(r.books, 'Księga', 'Księgi', 'Ksiąg') + ' Wiedzy', 'Księgi Wiedzy');
  if (r.scrolls) add('scrolls', resUrl('zwoj'), r.scrolls, pl(r.scrolls, 'Zwój', 'Zwoje', 'Zwojów') + ' zaklęć', 'Zwoje zaklęć');
  for (const [k, v] of Object.entries(r.eggs ?? {})) if (v) add('egg' + k, resUrl('jajo' + k), v, `× jajo (${RAR[Number(k)].n})`, `jajo (${RAR[Number(k)].n})`, 'rt' + k);
  if (r.saddles) add('saddles', resUrl('siodlo'), r.saddles, pl(r.saddles, 'Siodło', 'Siodła', 'Siodeł'), 'Siodła');
  if (r.stones) add('stones', resUrl('kamien'), r.stones, pl(r.stones, 'Kamień', 'Kamienie', 'Kamieni'), 'Kamienie');
  if (r.seals) add('seals', resUrl('pieczec'), r.seals, pl(r.seals, 'Pieczęć', 'Pieczęcie', 'Pieczęci') + ' Legendy', 'Pieczęcie Legendy');
  if (r.coins) add('coins', resUrl('moneta'), r.coins, pl(r.coins, 'Moneta klanowa', 'Monety klanowe', 'Monet klanowych'), 'Monety klanowe');
  if (r.gems) add('gems', resUrl('klejnot'), r.gems, pl(r.gems, 'Klejnot', 'Klejnoty', 'Klejnotów'), 'Klejnoty', 'gem');
  for (const k of r.skins ?? []) out.push({ key: 'skin' + k, ic: avatarUrl(k), n: '', w: `strój „${SKINS[k].n}”`, nm: `strój „${SKINS[k].n}”`, t: `Strój „${SKINS[k].n}”`, cls: 'look' });
  for (const k of r.frames ?? []) out.push({ key: 'frame' + k, frame: k, n: '', w: `ramka „${FRAMES[k].n}”`, nm: `ramka „${FRAMES[k].n}”`, t: `Ramka „${FRAMES[k].n}”`, cls: 'look' });
  return out;
}

/** Nagroda jako ikonki z liczbą i nazwą (np. [złoto] 525 złota · [księga] 5 Ksiąg Wiedzy). */
export function RewardIcons({ r, size = 18, cls = '', empty = '—' }: { r: Reward; size?: number; cls?: string; empty?: ComponentChildren }) {
  const chips = rewardChips(r);
  if (!chips.length) return <span class="rwi empty">{empty}</span>;
  return (
    <span class={`rwi${cls ? ' ' + cls : ''}`}>
      {chips.map(c => (
        <span key={c.key} class={`rwc${c.cls ? ' ' + c.cls : ''}`} title={c.t}>
          {c.frame ? <Avatar frame={c.frame} size={size + 4} /> : <Px src={c.ic!} size={size} />}
          <span>{c.n && <b>{c.n}</b>}{c.n ? ' ' : ''}{c.w}</span>
        </span>
      ))}
    </span>
  );
}

/** Jeden zasób w tekście: ikonka i liczba z nazwą (np. „masz [księga] 40 Ksiąg Wiedzy”). */
export const Res = ({ r, size = 16 }: { r: Reward; size?: number }) => <RewardIcons r={r} size={size} cls="inline" />;

/** Żetony Areny (poza nagrodami gry — żyją w portfelu serwera). */
export const Tokens = ({ n, size = 16 }: { n: number; size?: number }) => (
  <span class="rwi inline"><span class="rwc" title={`${n} Żetonów Areny`}><Px src={resUrl('zeton')} size={size} /><span><b>{short(n)}</b> {pl(n, 'Żeton', 'Żetony', 'Żetonów')} Areny</span></span></span>
);

/** Kafelki nagród (ekran powrotu do gry): duża ikona, liczba i nazwa, pojawiają się po kolei. */
export function RewardTiles({ r }: { r: Reward }) {
  const chips = rewardChips(r);
  return (
    <ul class="rwtiles">
      {chips.map((c, i) => (
        <li key={c.key} class={c.cls ?? ''} style={{ '--i': i } as Record<string, number>}>
          {c.frame ? <Avatar frame={c.frame} size={36} /> : <Px src={c.ic!} size={32} />}
          {c.n && <b>{c.n}</b>}
          <small>{c.nm}</small>
        </li>
      ))}
    </ul>
  );
}
