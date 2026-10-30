// Typy stanu gry. Silnik nie używa DOM ani zegara przeglądarki, więc da się go
// później uruchomić także na serwerze (Nakama, środowisko TypeScript).
import type { ClanShopId } from '../data/clan';
import type { AdKind, BuffId, GemItemId } from '../data/shop';
import type { AchId } from '../data/achievements';
import type { FrameId, SkinId } from '../data/cosmetics';

export type SlotId = 'bron' | 'helm' | 'zbroja' | 'rekawice' | 'buty' | 'pas' | 'pierscien' | 'amulet';
export type ElemKey = 'zar' | 'szron' | 'burz' | 'jad' | 'cien' | 'jasn';
export type FoeType = 'Bestie' | 'Nieumarli' | 'Demony' | 'Smoki';
export type SubId = 'crit' | 'critd' | 'spd' | 'ls' | 'dodge' | 'regen' | 'boss';
export type Gender = 'm' | 'f' | 'p';
export type TechId =
  | 'k_hart' | 'k_miech' | 'k_auto' | 'k_oszcz' | 'k_tanie'
  | 'w_ostrze' | 'w_pancerz' | 'w_precyzja' | 'w_pogromca'
  | 'e_kupiec' | 'e_gornik' | 'e_noc' | 'e_poszuk'
  | 't_hodowca' | 't_wylegarnia' | 't_wiez' | 't_stajnia';
export type DungId = 'skarbiec' | 'sztolnia' | 'wieza' | 'leza' | 'oltarze' | 'kopalnia' | 'labirynt' | 'zbrojownia' | 'krypta' | 'sezon';
export type SetId = 'lowca' | 'straz' | 'wicher' | 'nekro' | 'smok' | 'gwiazda';
export type SkillId = 'deszcz' | 'tarcza' | 'okrzyk' | 'eliksir' | 'kula' | 'nova' | 'krwawe' | 'burza' | 'oddech';
export type PetId = 'wilczek' | 'kruk' | 'zolw' | 'salamandra' | 'sowa' | 'gryfiatko' | 'wilkor' | 'feniks' | 'smoczek';
export type MountId = 'kon' | 'dzik' | 'wilk' | 'niedzwiedz' | 'jaszczur' | 'jednorozec' | 'gryf' | 'smok';
export type LabDoorKind = 'walka' | 'elita' | 'skarb' | 'zrodlo' | 'oltarz';
export type KryptaRuleId = 'zywioly' | 'szybkosc' | 'krew' | 'giganci';
export type MissionKind = 'smelt' | 'wave' | 'boss' | 'jump' | 'sell' | 'equip' | 'dung' | 'research' | 'scroll';
export interface Mission { kind: MissionKind; goal: number; n: number; claimed: boolean }
export type SfxKind = 'smelt' | 'jump' | 'hit' | 'crit' | 'hurt' | 'dodge' | 'block' | 'kill' | 'skill' | 'boss' | 'win' | 'lose' | 'levelup' | 'claim' | 'rare' | 'alert';

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
  coins?: number;                           // Monety klanowe
  gems?: number;                            // Klejnoty (z serwerem — tylko przez portfel serwera)
  skins?: SkinId[];                         // stroje bohatera do odblokowania
  frames?: FrameId[];                       // ramki awatara do odblokowania
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
  evp?: number;                                     // loch sezonowy: zdobyte punkty wydarzenia
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
  jv?: number;          // wersja zasad przeskoku (brak = 1, przedmioty sprzed października 2026)
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
  sx?: number;          // numer wytopu z ziarnem serwera (serwer może odtworzyć losowanie)
  sig?: string;         // podpis serwera (przedmiot z Wielkiego Obiegu)
  npc?: boolean;        // wykuł go kowal-widmo (serwer uzupełnia Obieg, gdy brakuje przedmiotów graczy)
}

/** Wieść z serwera: inny gracz znalazł twój przedmiot w Wielkim Obiegu. */
export interface FoundEvent { who: string; n: string; r: number }

export interface Companion { lvl: number; stars: number }

/** Liczniki, od których liczą się punkty Przepustki Kowala w danym dniu. */
export interface PassBase { sm: number; k: number; b: number; keys: number; tw: number }
/** Przepustka Kowala: sezon, punkty sprzed dzisiaj (`xp`) i z dzisiaj (`dxp`), złota ścieżka, odebrane poziomy. */
export interface PassTrack { season: number; xp: number; d: string; base: PassBase; dxp: number; prem: boolean; cf: number; cp: number }
/** Wydarzenie: numer, punkty sprzed dzisiaj i z lochu (`pts`), z dzisiejszej gry (`dpts`), odebrane progi, rekord lochu sezonowego. */
export interface EventTrack { ev: number; pts: number; d: string; base: PassBase; dpts: number; got: number; best: number }

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
  autoStop: number;                                    // auto-wytop zatrzymuje się na tej rzadkości (albo wyższej)
  oreSel: number;
  batch: number;                                       // wytop seryjny: ile wytopów jednym przyciskiem
  elSel: ElemKey | null;
  smith: { fame: number; sent: { n: string; r: number }[]; log: { t: string; m: string; k?: 'sent'; n?: number }[] };
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
  opts: { sound: boolean; vol: number; music: boolean; mvol: number; notify: boolean };
  stats: { smelted: number; jumps: number; kills: number; bosses: number; keys: number; bestR: number }; // keys: klucze zużyte w lochach (dzień lochów w wojnie klanów)
  sx: number;                                          // numer następnego wytopu z ziarnem serwera (nie cofa się przy resecie)
  seeds: number[];                                     // ziarna serwera dla wytopów sx, sx+1, …
  obIn: Item[];                                        // przedmioty z Obiegu od serwera, czekające na skrzynię bossa lub Zbrojownię
  obOut: Item[];                                       // twoje przedmioty do wysłania do Obiegu
  clanLvl: number;                                     // poziom klanu (ustawia serwer przy zapisie; 0 = bez klanu)
  clanCoins: number;                                   // Monety klanowe
  clanShop: { week: string; n: Partial<Record<ClanShopId, number>> }; // zakupy w sklepie klanowym w tym tygodniu
  clanHelp: { lvl: number; n: number };                // pomoc klanu już wliczona do ulepszenia kuźni na poziom `lvl`
  clanGot: string[];                                   // numery odebranych nagród od serwera (żeby żadnej nie wziąć dwa razy)
  gems: number;                                        // Klejnoty (z serwerem: kopia portfela serwera)
  shop: { day: string; n: Partial<Record<GemItemId, number>>; ads: Partial<Record<AdKind, number>>; gift: string; once: string[] }; // dzienne limity sklepu (UTC)
  buffs: Partial<Record<BuffId, number>>;              // wzmocnienia z reklam: do kiedy działają (ms)
  pass: PassTrack | null;                              // Przepustka Kowala (z serwerem: kopia stanu serwera)
  event: EventTrack | null;                            // wydarzenie co 2 tygodnie (liczy gra)
  look: { skin: SkinId; frame: FrameId; skins: SkinId[]; frames: FrameId[] }; // wygląd: wybrany strój i ramka, zdobyte
  boost: { lvl: number; ms: number };                  // przyspieszenie Klejnotami już wliczone do ulepszenia kuźni na poziom `lvl`
  runes: Partial<Record<SlotId, number>>;              // poziomy run slotów (0–30)
  codex: string[];                                     // Kolekcja Kowala: odkryte modele „rodzaj|ruda”
  ach: Partial<Record<AchId, number>>;                 // osiągnięcia: odebrane progi
  legacy: { gen: number; stars: number; item: Item | null }; // Dziedzictwo: pokolenie, Gwiazdy Mistrza, Pamiątka Rodu (z serwerem — kopia serwera)
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
  aura: number;        // Boska aura: ile założonych przedmiotów Boskich (każdy daje B.DIVINE_AURA % obrażeń i zdrowia)
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
  eggPct: number; hatchTime: number; compPct: number; compCost: number;
}

export interface OfflineReport {
  ms: number; capped: boolean; land: number; gold: number; ores: number[]; el: number; books: number;
  fame: number; forgeUp: number; tech: TechId | null; hatched: PetId | null; chest: { item: Item; equipped: boolean; stop?: boolean }[]; chestCount: number;
}

export type ModalData =
  | { kind: 'intro' }
  | { kind: 'boss'; land: number; gold: number; n: number; found: boolean; books: number; uniq: number; extra: Reward }
  | { kind: 'awaken'; item: Item }
  | { kind: 'dungChoice'; floor: number; loot: Reward }
  | { kind: 'dungEnd'; id: DungId; lost: boolean; floor: number; reward: Reward; items: number; evp?: number }
  | { kind: 'labChoice'; room: number; doors: LabDoorOpt[]; loot: Reward }
  | { kind: 'found' }
  | { kind: 'decide' }
  | { kind: 'mix'; what: 'el' | 'set' }
  | { kind: 'landinfo'; land: number }
  | { kind: 'dunginfo'; id: DungId }
  | { kind: 'feedback' }
  | { kind: 'missions'; tab?: 'daily' | 'weekly' | 'login' | 'ach' }
  | { kind: 'event' }
  | { kind: 'look' }
  | { kind: 'ranking'; board?: 'moc' | 'wieza' | 'postep' | 'arena' | 'klany' }
  | { kind: 'arena' }
  | { kind: 'chat'; ch?: 'global' | 'clan' }
  | { kind: 'draw'; what: 'skill' | 'mount' | 'pet'; id: string; dupe: boolean; from?: number; to?: number; cards?: number; need?: number; stones?: number }
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'item'; item: Item }
  | { kind: 'info'; k: 'forge' | 'level' | 'runes' | 'pets' | 'mounts' }
  | { kind: 'reset' }
  | { kind: 'shop'; tab?: 'sklep' | 'przepustka' | 'klejnoty' }
  | { kind: 'adOffer'; what: BuffId }
  | { kind: 'legacy' };

export type GameEvent =
  | { t: 'toast'; msg: string; kind?: 'good' | 'bad' }
  | { t: 'float'; side: 'hero' | 'foe'; text: string; cls: 'crit' | 'dmg' | 'hurt' | 'loot' | 'miss' | 'pet'; force?: boolean }
  | { t: 'bump'; who: 'hero' | 'foe'; cls: 'lunge' | 'hit' }
  | { t: 'modal'; m: ModalData }
  | { t: 'drop'; ore: number; n: number; rare: boolean }
  | { t: 'sfx'; k: SfxKind; r?: number }
  | { t: 'forged'; item: Item }                       // wykuty przedmiot (do wpisu na czacie klanu)
  | { t: 'change' };
