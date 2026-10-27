import { DUNGEONS, ELEM, KRYPTA_FLOORS, KRYPTA_RULES, LAB_ROOMS, LANDS, ORES, RAR, SETS, ZBROJOWNIA_CHESTS, KOPALNIA_WAVES, setOfLand } from '../data';
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
  if (r.scrolls) out.push(`${fmt(r.scrolls)} × Zwój zaklęć`);
  for (const [k, v] of Object.entries(r.eggs ?? {})) if (v) out.push(`${fmt(v)} × jajo (${RAR[Number(k)].n})`);
  if (r.saddles) out.push(`${fmt(r.saddles)} × Siodło`);
  if (r.stones) out.push(`${fmt(r.stones)} Kamieni`);
  if (r.seals) out.push(`${fmt(r.seals)} × Pieczęć Legendy`);
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
    case 'kopalnia': return `Fala ${d.floor}/${KOPALNIA_WAVES} · zebrane: ${rewardText(d.loot)}`;
    case 'labirynt': {
      const b = [d.bless.dmg && `+${d.bless.dmg}% obr.`, d.bless.hp && `+${d.bless.hp}% wytrz.`, d.bless.ls && `+${d.bless.ls}% kradz.`].filter(Boolean).join(', ');
      return `Komnata ${d.floor}/${LAB_ROOMS}${b ? ' · ' + b : ''} · zebrane: ${rewardText(d.loot)}`;
    }
    case 'zbrojownia': return `Skrzynia ${d.floor}/${ZBROJOWNIA_CHESTS} · zdobyte przedmioty: ${d.items.length}`;
    case 'krypta': return `Strażnik ${d.floor}/${KRYPTA_FLOORS} · ${d.rule ? KRYPTA_RULES[d.rule].n : ''}`;
  }
}
export function runLabel(d: DungRun): string {
  switch (d.id) {
    case 'skarbiec': return `${Math.max(0, Math.ceil(d.timeLeft / 1000))} s`;
    case 'leza': return 'Boss';
    case 'oltarze': case 'krypta': return `${d.floor}/5`;
    case 'kopalnia': return `Fala ${d.floor}`;
    case 'labirynt': return d.floor >= LAB_ROOMS ? 'Boss' : `Komnata ${d.floor}`;
    case 'zbrojownia': return `Skrzynia ${d.floor}`;
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
    case 'kopalnia': return 'Dziesięć fal golemów. Kamienie zostają, nawet jeśli bohater padnie.';
    case 'labirynt': return d.floor >= LAB_ROOMS ? 'Minotaur! Pokonaj go, żeby zabrać największy łup.' : 'Po każdej komnacie wybierasz kolejne drzwi.';
    case 'zbrojownia': return 'Pokonany duch oddaje przedmiot ze swoją historią.';
    case 'krypta': return d.rule ? `Walczą tylko przedmioty z legendą · ${KRYPTA_RULES[d.rule].d}.` : 'Walczą tylko przedmioty z legendą.';
  }
}
