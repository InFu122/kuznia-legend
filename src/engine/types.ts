// Typy stanu gry. Silnik nie używa DOM ani zegara przeglądarki, więc da się go
// później uruchomić także na serwerze (Nakama, środowisko TypeScript).

export type SlotId = 'bron' | 'helm' | 'zbroja' | 'rekawice' | 'buty' | 'pas' | 'pierscien' | 'amulet';
export type ElemKey = 'zar' | 'szron' | 'burz' | 'jad' | 'cien' | 'jasn';
export type FoeType = 'Bestie' | 'Nieumarli' | 'Demony' | 'Smoki';
export type SubId = 'crit' | 'critd' | 'spd' | 'ls' | 'dodge' | 'regen' | 'boss';
export type Gender = 'm' | 'f' | 'p';

export interface Sub { id: SubId; v: number }

export interface Awakening { kind: 'boss' | 'type'; t?: FoeType; v: number; name: string }

export interface Item {
  id: number;
  slot: SlotId;
  kind: string;
  g: Gender;
  ore: number;          // indeks rudy, z której powstał
  r: number;            // rzadkość 0–6
  lvl: number;          // poziom przedmiotu
  subs: Sub[];
  el: ElemKey | null;   // domieszka żywiołu
  jump: number;         // o ile rzadkości przeskoczył ponad minimum rudy
  flvl: number;         // poziom kuźni w chwili wytopu (0 = nieznany, np. z Obiegu)
  forced: '' | 'tut' | 'pity';
  smith: string;        // Piętno Kowala
  land: string;         // kraina wykucia
  fame: number;         // Sława Czynów
  kills: Partial<Record<FoeType, number>>;
  bosses: number;
  ls: number;           // osiągnięty próg legendy 0–3
  aw: Awakening | null;
  owners: string[];
  obieg: boolean;       // znaleziony w Wielkim Obiegu
}

export interface GameState {
  v: number;
  name: string;
  gold: number;
  ores: number[];
  els: Partial<Record<ElemKey, number>>;
  forge: { lvl: number; up: number; left: number };
  pity: number;
  eq: Partial<Record<SlotId, Item>>;
  pending: Item | null;
  cur: { land: number; stage: number; wave: number };
  maxLand: number;
  frontStage: number;
  cleared: boolean[];
  bestG: number;
  auto: boolean;
  oreSel: number;
  elSel: ElemKey | null;
  smith: { fame: number; sent: { n: string; r: number }[]; log: { t: string; m: string }[] };
  dung: { day: string; keys: number; best: number };
  stats: { smelted: number; jumps: number; kills: number; bosses: number };
  speed: number;
  savedAt: number;
  lastSeen: number;
  nid: number;
}

export interface Enemy {
  name: string;
  count: number;
  type: FoeType;
  max: number;
  hp: number;
  atk: number;
  boss: boolean;
  int: number;          // odstęp między atakami w ms
}

export interface Battle {
  mode: 'camp' | 'dung';
  enemy: Enemy | null;
  heroHp: number;
  heroMax: number;
  ht: number;
  et: number;
  pause: number;
  dung: { floor: number; loot: number; tier: number } | null;
  autoT: number;
  obiegT: number;
}

export interface Stats {
  dmg: number; hp: number; crit: number; critd: number; spd: number; ls: number; dodge: number; regen: number;
  boss: number; eldmg: number; slow: number; holy: number; pog: number;
  vs: Partial<Record<FoeType, number>>;
  power: number;
}

export interface OfflineReport {
  ms: number; capped: boolean; land: number; gold: number; main: number; rare: number; el: number;
  fame: number; forgeUp: number; chest: { item: Item; equipped: boolean }[]; chestCount: number;
}

export type ModalData =
  | { kind: 'intro' }
  | { kind: 'boss'; land: number; gold: number; n: number; found: boolean }
  | { kind: 'awaken'; item: Item }
  | { kind: 'dungChoice'; floor: number; loot: number; tier: number }
  | { kind: 'dungEnd'; lost: boolean; keep: number; tier: number; floor: number }
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'item'; item: Item }
  | { kind: 'info'; k: 'forge' | 'level' }
  | { kind: 'reset' };

export type GameEvent =
  | { t: 'toast'; msg: string; kind?: 'good' | 'bad' }
  | { t: 'float'; side: 'hero' | 'foe'; text: string; cls: 'crit' | 'dmg' | 'hurt' | 'loot' | 'miss'; force?: boolean }
  | { t: 'bump'; who: 'hero' | 'foe'; cls: 'lunge' | 'hit' }
  | { t: 'modal'; m: ModalData }
  | { t: 'change' };
