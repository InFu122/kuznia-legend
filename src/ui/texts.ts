import { DUNGEONS, ELEM, LANDS, ORES, SETS, setOfLand } from '../data';
import type { DungRun, ElemKey, Reward, SetId } from '../engine/types';
import { fmt } from './format';

/** Polska odmiana: 1 Księga, 2–4 Księgi, 5+ Ksiąg. */
export function booksShort(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  const w = n === 1 ? 'Księga' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'Księgi' : 'Ksiąg';
  return `${fmt(n)} ${w}`;
}
export const books = (n: number) => `${booksShort(n)} Wiedzy`;

/** Nagroda jako jedna linijka tekstu, np. „1 200 złota · 3 Księgi Wiedzy · 4 × Mithril”. */
export function rewardText(r: Reward): string {
  const out: string[] = [];
  if (r.gold) out.push(`${fmt(r.gold)} złota`);
  if (r.books) out.push(books(r.books));
  for (const [k, v] of Object.entries(r.ores ?? {})) if (v) out.push(`${fmt(v)} × ${ORES[Number(k)].n}`);
  for (const [k, v] of Object.entries(r.els ?? {})) if (v) out.push(`${fmt(v)} × ${ELEM[k as ElemKey].n}`);
  for (const [k, v] of Object.entries(r.uniq ?? {})) if (v) out.push(`${fmt(v)} × ${SETS[k as SetId].ore}`);
  return out.length ? out.join(' · ') : 'nic';
}

/** Nazwa i stan biegu lochu do nagłówka areny. */
export function runTitle(d: DungRun): string {
  return d.id === 'leza' ? `Leże: ${LANDS[d.bossLand].boss}` : DUNGEONS[d.id].n;
}
export function runMeta(d: DungRun): string {
  switch (d.id) {
    case 'sztolnia': return `Piętro ${d.floor} · w worku: ${rewardText(d.loot)}`;
    case 'skarbiec': return `Zostało ${Math.max(0, Math.ceil(d.timeLeft / 1000))} s · w worku: ${rewardText(d.loot)}`;
    case 'wieza': return `Piętro ${d.floor} · zdobyte: ${rewardText(d.loot)}`;
    case 'leza': { const set = setOfLand(d.bossLand); return `${LANDS[d.bossLand].n} · nagroda: ${set ? SETS[set].ore : '—'}`; }
    case 'oltarze': return `Strażnik ${d.floor}/5 · ${d.el ? ELEM[d.el].n : ''} · zebrane: ${rewardText(d.loot)}`;
  }
}
export function runLabel(d: DungRun): string {
  switch (d.id) {
    case 'skarbiec': return `${Math.max(0, Math.ceil(d.timeLeft / 1000))} s`;
    case 'leza': return 'Boss';
    case 'oltarze': return `${d.floor}/5`;
    default: return `Piętro ${d.floor}`;
  }
}
export function runHint(d: DungRun): string {
  switch (d.id) {
    case 'sztolnia': return 'Co 5 pięter zdecydujesz, czy wyjść z łupem.';
    case 'skarbiec': return 'Bij gobliny, zanim skończy się czas.';
    case 'wieza': return 'Walczysz, dopóki bohater stoi. Wyjście zatrzymuje wspinaczkę.';
    case 'leza': return 'Pokonaj bossa, żeby zabrać rudę unikalną.';
    case 'oltarze': return 'Pięciu strażników żywiołu. Porażka zabiera połowę domieszek.';
  }
}
