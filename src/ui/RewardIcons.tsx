// Nagroda jako rząd ikon z liczbami (przepustka, powrót do gry, wydarzenia) — czytelniej niż sam tekst.
import { ELEM, FRAMES, ORES, RAR, SETS, SKINS, type FrameId } from '../data';
import { avatarUrl, elemUrl, oreUrl, resUrl, setOreUrl } from '../art/render';
import type { ElemKey, Reward, SetId } from '../engine/types';
import { Avatar } from './Avatar';
import { Px } from './Px';

/** Krótka liczba na ikonkę: 950, 12 tys., 1,2 mln. */
export function short(n: number): string {
  const v = Math.round(n);
  const d = (x: number) => (x >= 100 ? Math.round(x).toString() : x.toFixed(1).replace('.0', '').replace('.', ','));
  if (v >= 1e9) return d(v / 1e9) + ' mld';
  if (v >= 1e6) return d(v / 1e6) + ' mln';
  if (v >= 1e4) return d(v / 1e3) + ' tys.';
  return v.toLocaleString('pl-PL');
}

export interface RewardChip { key: string; ic?: string; n: string; nm: string; t: string; frame?: FrameId; cls?: string }

/** Pozycje nagrody z ikoną, liczbą i nazwą (pełny opis do podpowiedzi i czytników ekranu). */
export function rewardChips(r: Reward): RewardChip[] {
  const out: RewardChip[] = [];
  const add = (key: string, ic: string | undefined, v: number, nm: string, cls?: string, frame?: FrameId) =>
    out.push({ key, ic, n: short(v), nm, t: `${short(v)} × ${nm}`, cls, frame });
  if (r.gold) add('gold', resUrl('zloto'), r.gold, 'złoto', 'gold');
  for (const [k, v] of Object.entries(r.ores ?? {})) if (v) add('o' + k, oreUrl(Number(k)), v, ORES[Number(k)].n);
  for (const [k, v] of Object.entries(r.els ?? {})) if (v) add('e' + k, elemUrl(k), v, ELEM[k as ElemKey].n);
  for (const [k, v] of Object.entries(r.uniq ?? {})) if (v) add('u' + k, setOreUrl(k), v, SETS[k as SetId].ore);
  if (r.books) add('books', resUrl('ksiega'), r.books, 'Księgi Wiedzy');
  if (r.scrolls) add('scrolls', resUrl('zwoj'), r.scrolls, 'Zwój zaklęć');
  for (const [k, v] of Object.entries(r.eggs ?? {})) if (v) add('egg' + k, resUrl('jajo' + k), v, `jajo (${RAR[Number(k)].n})`, 'rt' + k);
  if (r.saddles) add('saddles', resUrl('siodlo'), r.saddles, 'Siodło');
  if (r.stones) add('stones', resUrl('kamien'), r.stones, 'Kamienie');
  if (r.seals) add('seals', resUrl('pieczec'), r.seals, 'Pieczęć Legendy');
  if (r.coins) add('coins', resUrl('moneta'), r.coins, 'Monety klanowe');
  if (r.gems) add('gems', resUrl('klejnot'), r.gems, 'Klejnoty', 'gem');
  for (const k of r.skins ?? []) out.push({ key: 'skin' + k, ic: avatarUrl(k), n: 'strój', nm: `strój „${SKINS[k].n}”`, t: `Strój „${SKINS[k].n}”`, cls: 'look' });
  for (const k of r.frames ?? []) out.push({ key: 'frame' + k, frame: k, n: 'ramka', nm: `ramka „${FRAMES[k].n}”`, t: `Ramka „${FRAMES[k].n}”`, cls: 'look' });
  return out;
}

/** Nagroda jako ikonki z liczbami. */
export function RewardIcons({ r, size = 20, cls = '' }: { r: Reward; size?: number; cls?: string }) {
  const chips = rewardChips(r);
  if (!chips.length) return <span class="rwi empty">—</span>;
  return (
    <span class={`rwi${cls ? ' ' + cls : ''}`}>
      {chips.map(c => (
        <span key={c.key} class={`rwc${c.cls ? ' ' + c.cls : ''}`} title={c.t} aria-label={c.t}>
          {c.frame ? <Avatar frame={c.frame} size={size + 4} /> : <Px src={c.ic!} size={size} />}
          <b>{c.n}</b>
        </span>
      ))}
    </span>
  );
}

/** Kafelki nagród (ekran powrotu do gry): duża ikona, liczba i nazwa, pojawiają się po kolei. */
export function RewardTiles({ r }: { r: Reward }) {
  const chips = rewardChips(r);
  return (
    <ul class="rwtiles">
      {chips.map((c, i) => (
        <li key={c.key} class={c.cls ?? ''} style={{ '--i': i } as Record<string, number>}>
          {c.frame ? <Avatar frame={c.frame} size={36} /> : <Px src={c.ic!} size={32} />}
          <b>{c.n}</b>
          <small>{c.nm}</small>
        </li>
      ))}
    </ul>
  );
}
