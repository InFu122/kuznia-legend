// Typy stanu gry. Silnik nie używa DOM ani zegara przeglądarki, więc da się go
// później uruchomić także na serwerze (Nakama, środowisko TypeScript).

export type SlotId = 'bron' | 'helm' | 'zbroja' | 'rekawice' | 'buty' | 'pas' | 'pierscien' | 'amulet';
export type ElemKey = 'zar' | 'szron' | 'burz' | 'jad' | 'cien' | 'jasn';
export type FoeType = 'Bestie' | 'Nieumarli' | 'Demony' | 'Smoki';
export type SubId = 'crit' | 'critd' | 'spd' | 'ls' | 'dodge' | 'regen' | 'boss';
export type Gender = 'm' | 'f' | 'p';
export type TechId =
  | 'k_hart' | 'k_miech' | 'k_auto' | 'k_oszcz' | 'k_tanie'
  | 'w_ostrze' | 'w_pancerz' | 'w_precyzja' | 'w_pogromca'
  | 'e_kupiec' | 'e_gornik' | 'e_noc' | 'e_poszuk';
export type DungId = 'skarbiec' | 'sztolnia' | 'wieza' | 'leza' | 'oltarze' | 'kopalnia' | 'labirynt' | 'zbrojownia' | 'krypta';
export type SetId = 'lowca' | 'straz' | 'wicher' | 'nekro' | 'smok' | 'gwiazda';
export type SkillId = 'deszcz' | 'tarcza' | 'okrzyk' | 'eliksir' | 'kula' | 'nova' | 'krwawe' | 'burza' | 'oddech';
export type PetId = 'wilczek' | 'kruk' | 'zolw' | 'salamandra' | 'sowa' | 'gryfiatko' | 'wilkor' | 'feniks' | 'smoczek';
export type MountId = 'kon' | 'dzik' | 'wilk' | 'niedzwiedz' | 'jaszczur' | 'jednorozec' | 'gryf' | 'smok';
export type LabDoorKind = 'walka' | 'elita' | 'skarb' | 'zrodlo' | 'oltarz';
export type KryptaRuleId = 'zywioly' | 'szybkosc' | 'krew' | 'giganci';
export type MissionKind = 'smelt' | 'wave' | 'boss' | 'jump' | 'sell' | 'equip' | 'dung' | 'research' | 'scroll';
export interface Mission { kind: MissionKind; goal: number; n: number; claimed: boolean }
export type SfxKind = 'smelt' | 'jump' | 'hit' | 'crit' | 'hurt' | 'skill' | 'boss' | 'win' | 'lose' | 'levelup' | 'claim' | 'rare';

/** Nagroda do przyznania i pokazania w podsumowaniu. */
export interface Reward {
  gold?: number;
  books?: number;
  ores?: Partial<Record<number, number>>;
  els?: Partial<Record<ElemKey, number>>;
  uniq?: Partial<Record<SetId, number>>;
  scrolls?: number;
  eggs?: Partial<Record<number, number>>;   // jaja według rzadkości
  saddles?: number;
  stones?: number;
  seals?: number;
}

export interface LabDoorOpt { kind: LabDoorKind; bless?: number }

export interface DungRun {
  id: DungId;
  floor: number;
  loot: Reward;        // zebrane w trakcie (przyznawane na końcu)
  tier: number;        // Sztolnia: indeks rudy
  timeLeft: number;    // Skarbiec: pozostały czas w ms
  kills: number;
  el: ElemKey | null;  // Ołtarze: żywioł dnia
  bossLand: number;    // Leża Bossów
  bless: { dmg: number; hp: number; ls: number };  // Labirynt: błogosławieństwa biegu
  doors: LabDoorOpt[] | null;                       // Labirynt: drzwi do wyboru
  elite: boolean;                                   // Labirynt: trwa walka z elitą
  items: Item[];                                    // Zbrojownia: zdobyte przedmioty
  rule: KryptaRuleId | null;                        // Krypta: zasada tygodnia
  ghost?: string;                                   // Zbrojownia: duch, który strzeże skrzyni
}

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
  forced: '' | 'tut' | 'pity' | 'set';
  smith: string;        // Piętno Kowala
  land: string;         // kraina wykucia
  fame: number;         // Sława Czynów
  kills: Partial<Record<FoeType, number>>;
  bosses: number;
  ls: number;           // osiągnięty próg legendy 0–3
  aw: Awakening | null;
  owners: string[];
  obieg: boolean;       // znaleziony w Wielkim Obiegu
  set: SetId | null;    // część zestawu (z rudy unikalnej)
}

export interface Companion { lvl: number; stars: number }

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
  dungeons: Record<DungId, { day: string; keys: number; best: number }>;
  books: number;                              // Księgi Wiedzy
  uniq: Partial<Record<SetId, number>>;       // rudy unikalne
  uniqSel: SetId | null;
  tech: { lv: Partial<Record<TechId, number>>; cur: { id: TechId; left: number; total: number } | null };
  scrolls: number;                                     // Zwoje zaklęć
  skills: { lv: Partial<Record<SkillId, number>>; cards: Partial<Record<SkillId, number>>; eq: (SkillId | null)[] };
  eggs: number[];                                      // jaja według rzadkości 0–4
  hatch: { r: number; left: number; total: number } | null;
  pets: Partial<Record<PetId, Companion>>;
  petSel: PetId | null;
  saddles: number;                                     // Siodła
  mounts: Partial<Record<MountId, Companion>>;
  mountSel: MountId | null;
  stones: number;                                      // Kamienie
  seals: number;                                       // Pieczęcie Legendy
  found: Item[];                                       // znaleziska ze Zbrojowni czekające na decyzję
  missions: { day: string; daily: Mission[]; chest: boolean; week: string; weekly: Mission[] };
  login: { last: string; idx: number };                // kalendarz logowania: ostatni odbiór, następny dzień 0–6
  tut: number;                                         // krok samouczka (TUTORIAL.length = ukończony)
  opts: { sound: boolean; vol: number };
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

/** Stan umiejętności i efektów w trakcie walki (nie trafia do zapisu). */
export interface Fx {
  cd: number[];        // pozostałe odnowienie każdego slotu umiejętności (ms)
  dmgT: number; dmgV: number;
  spdT: number; spdV: number;
  lsT: number; lsV: number;
  shield: number; shieldT: number;
  stunT: number;
}

export interface Battle {
  mode: 'camp' | 'dung';
  enemy: Enemy | null;
  heroHp: number;
  heroMax: number;
  ht: number;
  et: number;
  pt: number;          // licznik ataku chowańca
  pause: number;
  dung: DungRun | null;
  autoT: number;
  obiegT: number;
  fx: Fx;
}

export interface Stats {
  dmg: number; hp: number; crit: number; critd: number; spd: number; ls: number; dodge: number; regen: number;
  boss: number; eldmg: number; slow: number; holy: number; pog: number;
  vs: Partial<Record<FoeType, number>>;
  sets: { id: SetId; count: number }[];
  petAtk: number;      // obrażenia chowańca na trafienie (wartość)
  petInt: number;      // odstęp ataków chowańca (ms), 0 = brak
  power: number;
}

/** Zsumowane efekty technologii, chowańca i wierzchowca. */
export interface Mods {
  jumpRel: number; saveOre: number; forgeTime: number; forgeCost: number; autoSpeed: number;
  dmgPct: number; hpPct: number; crit: number; bossPct: number;
  goldPct: number; extraOre: number; offlineMin: number; rarePct: number;
  spd: number; ls: number; regen: number; eldmg: number;
}

export interface OfflineReport {
  ms: number; capped: boolean; land: number; gold: number; main: number; rare: number; el: number; books: number;
  fame: number; forgeUp: number; tech: TechId | null; hatched: PetId | null; chest: { item: Item; equipped: boolean }[]; chestCount: number;
}

export type ModalData =
  | { kind: 'intro' }
  | { kind: 'boss'; land: number; gold: number; n: number; found: boolean; books: number; uniq: number; extra: Reward }
  | { kind: 'awaken'; item: Item }
  | { kind: 'dungChoice'; floor: number; loot: Reward }
  | { kind: 'dungEnd'; id: DungId; lost: boolean; floor: number; reward: Reward; items: number }
  | { kind: 'labChoice'; room: number; doors: LabDoorOpt[]; loot: Reward }
  | { kind: 'found' }
  | { kind: 'missions'; tab?: 'daily' | 'weekly' | 'login' }
  | { kind: 'draw'; what: 'skill' | 'mount' | 'pet'; id: string; dupe: boolean }
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'item'; item: Item }
  | { kind: 'info'; k: 'forge' | 'level' }
  | { kind: 'reset' };

export type GameEvent =
  | { t: 'toast'; msg: string; kind?: 'good' | 'bad' }
  | { t: 'float'; side: 'hero' | 'foe'; text: string; cls: 'crit' | 'dmg' | 'hurt' | 'loot' | 'miss' | 'pet'; force?: boolean }
  | { t: 'bump'; who: 'hero' | 'foe'; cls: 'lunge' | 'hit' }
  | { t: 'modal'; m: ModalData }
  | { t: 'drop'; ore: number; n: number; rare: boolean }
  | { t: 'sfx'; k: SfxKind; r?: number }
  | { t: 'change' };
