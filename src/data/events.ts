// Wydarzenia co 2 tygodnie z lochem sezonowym. Kolejność się powtarza: Festiwal Kuźni, Wielkie Łowy, Noc Upiorów.
import type { FoeType } from '../engine/types';
import type { FrameId, SkinId } from './cosmetics';
import { PASS, type PassItem } from './shop';

export type EventKind = 'kuznia' | 'lowy' | 'upiory';
export interface EventDef {
  n: string;            // nazwa wydarzenia
  cur1: string;         // punkt wydarzenia („Iskra”)
  cur: string;          // punkty wydarzenia (liczba mnoga, np. „Iskry”)
  curGen: string;       // dopełniacz („Iskier”)
  d: string;            // za co są punkty
  dung: string;         // loch sezonowy
  foes: string[];       // wrogowie lochu
  boss: string;         // boss ostatniego piętra
  type: FoeType;
  skin: SkinId;         // strój za ostatni próg
  frame: FrameId;       // ramka za ostatni próg
  /** Punkty za: wytop, wroga, bossa krainy, klucz w lochu, piętro Wieży. */
  w: { sm: number; k: number; b: number; keys: number; tw: number };
}

export const EVENTS: Record<EventKind, EventDef> = {
  kuznia: {
    n: 'Festiwal Kuźni', cur1: 'Iskra', cur: 'Iskry', curGen: 'Iskier', d: 'Każdy wytop to Iskra (także auto-wytop i seryjny). Bossowie krain i klucze w lochach też sypią Iskrami.',
    dung: 'Ognista Otchłań', foes: ['Ognisty chochlik', 'Lawowy golem', 'Salamandra', 'Żarzący się szkielet'], boss: 'Władca Płomieni', type: 'Demony', skin: 'ognisty', frame: 'iskra',
    w: { sm: 1, k: 0.02, b: 10, keys: 10, tw: 1 },
  },
  lowy: {
    n: 'Wielkie Łowy', cur1: 'Trofeum', cur: 'Trofea', curGen: 'Trofeów', d: 'Co 10 pokonanych wrogów to Trofeum, boss krainy — 30. Liczą się też nagrody za nieobecność.',
    dung: 'Lodowa Grota', foes: ['Lodowy wilk', 'Śnieżny troll', 'Mroźny niedźwiedź', 'Szronowy gryf'], boss: 'Pradawny Mamut', type: 'Bestie', skin: 'lowca', frame: 'szron',
    w: { sm: 0.2, k: 0.1, b: 30, keys: 10, tw: 1 },
  },
  upiory: {
    n: 'Noc Upiorów', cur1: 'Świeca', cur: 'Świece', curGen: 'Świec', d: 'Każdy klucz zużyty w lochu to 40 Świec, piętro Wieży Wyzwań — 5.',
    dung: 'Nawiedzone Katakumby', foes: ['Błędny ognik', 'Upiór', 'Kościany rycerz', 'Banshee'], boss: 'Królowa Upiorów', type: 'Nieumarli', skin: 'upiorny', frame: 'widmo',
    w: { sm: 0.2, k: 0.02, b: 10, keys: 40, tw: 5 },
  },
};
export const EVENT_ORDER: EventKind[] = ['kuznia', 'lowy', 'upiory'];

export const EVENT = {
  DAYS: 14,
  EPOCH: PASS.EPOCH,     // pierwsze wydarzenie zaczyna się razem z 1. sezonem przepustki
  DAY_CAP: 400,          // punkty z codziennej gry (bez lochu sezonowego) — najwyżej tyle dziennie
  KEYS: 2,               // klucze do lochu sezonowego dziennie
  FLOORS: 10,
  FLOOR_PTS: 10,         // punkty za piętro: 10 + 5 × piętro
  FLOOR_STEP: 5,
  STRENGTH_STEP: 0.05,   // piętro 1 = 5 etapów przed najdalszym etapem kampanii, każde następne o etap dalej i +5% siły
} as const;
/** Najwięcej punktów za jedno przejście lochu sezonowego. */
export const EVENT_RUN_MAX = Array.from({ length: EVENT.FLOORS }, (_, i) => EVENT.FLOOR_PTS + EVENT.FLOOR_STEP * (i + 1)).reduce((a, b) => a + b, 0);

/** Progi nagród wydarzenia (rosnąco). Ostatni daje też strój i ramkę wydarzenia (Kodeks → Wygląd). */
export const EVENT_MILESTONES: { pts: number; r: PassItem[] }[] = [
  { pts: 100, r: [{ k: 'gold', n: 100 }] },
  { pts: 250, r: [{ k: 'ore', n: 60 }] },
  { pts: 500, r: [{ k: 'books', n: 3 }] },
  { pts: 800, r: [{ k: 'stones', n: 30 }] },
  { pts: 1200, r: [{ k: 'gold', n: 250 }] },
  { pts: 1700, r: [{ k: 'scrolls', n: 1 }] },
  { pts: 2300, r: [{ k: 'ore', n: 150 }] },
  { pts: 3000, r: [{ k: 'egg', n: 2 }] },
  { pts: 3800, r: [{ k: 'books', n: 6 }] },
  { pts: 4700, r: [{ k: 'saddles', n: 1 }] },
  { pts: 5700, r: [{ k: 'seals', n: 2 }] },
  { pts: 7000, r: [{ k: 'egg', n: 3 }, { k: 'scrolls', n: 2 }] },
];
