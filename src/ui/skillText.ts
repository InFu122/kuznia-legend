// Opisy umiejętności dla gracza: rodzaj (Atak, Obrona…), główna wartość dużą czcionką i jedno pełne zdanie.
import { SKILLS, skillValue } from '../data';
import type { SkillId } from '../engine/types';
import { f1 } from './format';

export interface SkillFx { tag: string; kind: string; main: string; label: string; text: string }

/** Jak wygląda umiejętność `id` na poziomie `lvl`. */
export function skillFx(id: SkillId, lvl: number): SkillFx {
  const S = SKILLS[id];
  const v = f1(skillValue(id, Math.max(1, lvl)));
  const dur = `${f1(S.dur / 1000)} s`;
  switch (S.kind) {
    case 'dmg': return { tag: 'Atak', kind: 'atk', main: `${v}%`, label: 'obrażeń', text: `Potężny cios za ${v}% twoich obrażeń.` };
    case 'shield': return { tag: 'Obrona', kind: 'def', main: `${v}%`, label: 'zdrowia jako tarcza', text: `Tarcza pochłania obrażenia do ${v}% twojego zdrowia przez ${dur}.` };
    case 'heal': return { tag: 'Leczenie', kind: 'heal', main: `${v}%`, label: 'zdrowia', text: `Gdy zdrowie spadnie poniżej 60%, leczy ${v}% zdrowia.` };
    case 'buffDmg': return { tag: 'Wzmocnienie', kind: 'buff', main: `+${v}%`, label: 'obrażeń', text: `Przez ${dur} zadajesz o ${v}% większe obrażenia.` };
    case 'buffSpd': return { tag: 'Wzmocnienie', kind: 'buff', main: `+${v}%`, label: 'szybkości ataku', text: `Przez ${dur} atakujesz o ${v}% szybciej.` };
    case 'buffLs': return { tag: 'Wzmocnienie', kind: 'buff', main: `+${v}%`, label: 'kradzieży życia', text: `Przez ${dur} każdy cios leczy cię o dodatkowe ${v}% zadanych obrażeń.` };
    case 'stun': return { tag: 'Kontrola', kind: 'ctl', main: `${v} s`, label: 'zamrożenia', text: `Zamraża wroga na ${v} s — w tym czasie nie atakuje.` };
  }
}
