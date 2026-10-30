// Połączenie z serwerem gry (Nakama) przez REST. Gra potrzebuje tylko logowania urządzeniem i wywołań RPC,
// więc obywa się bez biblioteki klienta. Bez skonfigurowanego serwera (np. w artefakcie) gra działa lokalnie.
import type { AdKind, ArenaShopId, GemItemId } from '../data';
import type { ServerReward } from '../engine/clan';
import type { ShopSync } from '../engine/game';
import type { ElemKey, FoundEvent, GameState, Item, MountId, PetId, SkillId, SlotId } from '../engine/types';
import type { FighterStats } from '../engine/duel';

const DEVICE_KEY = 'kuznia-legend-device';
const TIMEOUT_MS = 10000;

export interface ServerConfig { base: string; key: string }

/** Adres serwera z konfiguracji builda: VITE_SERVER_URL ("/" = ten sam adres co gra) i VITE_SERVER_KEY. */
export function serverConfig(): ServerConfig | null {
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (!url) return null;
  const base = url === '/' ? location.origin : url.replace(/\/$/, '');
  return { base, key: (import.meta.env.VITE_SERVER_KEY as string | undefined) || 'defaultkey' };
}

export class ServerError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export interface RankRow { id?: string; rank: number; name: string; score: number; sub: number; land: string; me: boolean; sk?: string; fr?: string }
export interface Ranking { board: string; title: string; records: RankRow[]; mine: RankRow | null }
export type BoardId = 'moc' | 'wieza' | 'postep' | 'arena';
/** Ranking klanów: Moc klanów albo Puchary w sezonie wojen. */
export interface ClanRankRow { rank: number; n: string; tag: string; score: number; sub: number; m: number; me: boolean }
export interface WarSeason { n: number; name: string; end: number; trophies: number; wins: number; rank: number }
export interface ClanRanking {
  board: 'moc' | 'sezon'; records: ClanRankRow[]; mine: ClanRankRow | null; clan: { n: string; tag: string } | null;
  season: WarSeason & { rewards: { top: number; gems: number; coins: number }[] }; serverTime: number;
}

export interface ArenaOpp { id: string; name: string; rating: number; power: number; land: string; ghost: boolean; sk?: string; fr?: string }
export interface ArenaState {
  rating: number; rank: number; left: number; max: number; wins: number; losses: number; power: number;
  opp: ArenaOpp[]; log: { who: string; won: boolean; d: number; t: number }[];
  league?: LeagueBrief | null;
}
/** Pojedynek rozegrany przez serwer (arena, bitwa wojny klanów) — do odtworzenia w grze. */
export interface DuelShow {
  win: boolean; ms: number; frames: [number, number][]; crits: [number, number]; skills: [number, number];
  me: { name: string; power: number; look?: Record<string, { kind: string; ore: number }>; sk?: string; fr?: string };
  foe: { name: string; power: number; ghost: boolean; look?: Record<string, { kind: string; ore: number }>; sk?: string; fr?: string };
}
export interface ArenaFight extends ArenaState, DuelShow { d: number; gold: number; lp: number; tk: number }
/** Profil gracza (okno profilu): wygląd, Moc, ekwipunek, statystyki, klan, liga i arena. */
export interface Profile {
  id: string; me: boolean; name: string; title: string; sk?: string; fr?: string;
  power: number; forge: number; land: string; maxLand: number;
  eq: GameState['eq']; st: FighterStats; skills: SkillId[]; pet: PetId | null; mount: MountId | null;
  clan: { n: string; tag: string } | null; arena: { rating: number; rank: number } | null; league: number | null;
  legacy: { gen: number; stars: number } | null; codex: number; ach: number; savedAt?: number;
}
/** Skrót ligi w odpowiedziach areny. */
export interface LeagueBrief { tier: number; rank: number; pts: number; tokens: number }
/** Liga areny: grupa tygodnia, sezon, wynik zeszłego tygodnia, Żetony i dzisiejsze zakupy w sklepie areny. */
export interface LeagueState {
  tier: number; week: string; ends: number; rank: number;
  rows: { id?: string; n: string; pts: number; ghost: boolean; me: boolean }[] | null;
  season: { n: number; name: string; end: number; best: number; gems: number };
  last: { week: string; tier: number; rank: number; move: number; tokens: number } | null;
  lastSeason: { n: number; best: number; gems: number } | null;
  tokens: number; gems: number; shop: Partial<Record<ArenaShopId, number>>; serverTime: number;
  rewards?: ServerReward[]; left?: number;
}

/** Odpowiedź RPC sklepu: stan sklepu, nagrody do odebrania i wynik akcji. */
export interface ShopResp extends ShopSync { rewards: ServerReward[]; serverTime: number; keys?: boolean; cost?: number; given?: number }

export interface WarSide { n: string; tag: string; power: number; total: number; days: number[]; ghost?: boolean }
export interface WarState {
  week: string; day: number; ends: number; test: boolean;
  us: WarSide; them: WarSide | null;
  me: { in: boolean; pts: number; today: number; cap: number; atkLeft: number };
  members: { n: string; pts: number; atk: number; me: boolean }[];
  def: { id: string; n: string; power: number; ghost: boolean; beaten: number }[];
  log: { t: number; a: string; d: string; w: boolean; p: number; us: boolean }[];
  res: { r: 'win' | 'draw' | 'loss'; us: number; them: number; vs: string } | null;
  rewards: ServerReward[]; serverTime: number;
  fight?: DuelShow & { pts: number };
  season?: WarSeason | null;
}
export interface RaidState {
  week: string; ends: number; lvl: number; ph: number; hp: number; max: number; done: boolean;
  mine: number; phase: number; rank: number; fighters: number; top: { n: string; d: number; me: boolean }[];
  left: number; weak: { el: ElemKey; n: number; bonus: number }; log: { t: number; m: string }[];
  rewards: ServerReward[]; serverTime: number;
  hit?: { dmg: number; bonus: number; phase: number; killed: boolean };
}

const newDeviceId = () => 'kl-' + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

export type ClanMode = 'open' | 'request' | 'closed';
export type ClanRole = 'lider' | 'zastepca' | 'starszy' | 'czlonek' | 'prosba';
export interface ClanSummary { id: string; name: string; tag: string; desc: string; members: number; max: number; minPower: number; mode: ClanMode; lang: string; pending?: boolean }
export interface ClanMember { id: string; name: string; role: ClanRole; power: number; online: boolean; me: boolean }
export interface ClanInfo {
  clan: (ClanSummary & { ann: string; annBy: string; annT: number }) | null;
  role?: ClanRole; members?: ClanMember[]; requests?: ClanMember[]; pending?: ClanSummary[]; unlocked: boolean;
}

/** Życie klanu: Wspólna Kuźnia, boss, prośby o pomoc i rudę, nagrody do odebrania (clan_sync i akcje klanu). */
export interface ClanBoss { n: string; pal: string; lvl: number; hp: number; max: number; kills: number; mine: number; rank: number; fighters: number; top: { n: string; d: number; me: boolean }[] }
export interface ClanHelpReq { uid: string; n: string; lvl: number; got: number; done: boolean }
export interface ClanOreReq { id: string; n: string; ore: number; want: number; got: number }
export interface ClanLife {
  clan: { id: string; name: string; tag: string } | null;
  lvl?: number; xp?: number; cur?: number; next?: number | null;
  boss?: ClanBoss;
  left?: { don: number; atk: number; deed: number };
  oreNext?: number;
  helps?: ClanHelpReq[];
  myHelp?: { lvl: number; got: number } | null;
  helped: { lvl: number; n: number } | null;
  ores?: ClanOreReq[];
  myOre?: { id: string; ore: number; want: number; got: number } | null;
  log?: { t: number; m: string; n?: number }[];
  rewards: ServerReward[];
  war?: { day: number; atk: number }; raid?: { left: number; done: boolean };
  hit?: { dmg: number; killed: boolean }; levelUp?: number; helpedNow?: number; paid?: number; given?: number;
}

export class ServerLink {
  private token: string | null = null;
  private tokenAt = 0;
  /** Wersja zapisu na serwerze (do wykrywania zapisu z innego urządzenia). */
  private version: string | null = null;
  online = false;
  /** Różnica: czas serwera − czas urządzenia (ms). */
  offset = 0;
  /** Najwyższe tempo testowe, na które pozwala serwer (1 = tryb testowy wyłączony). */
  testSpeed = 1;

  constructor(private readonly cfg: ServerConfig) {}

  /** Moc bohatera policzona przez serwer (tylko z przedmiotów, które serwer uznał) i miejsca z pozostałymi. */
  power: number | null = null;
  unverified: SlotId[] = [];
  private tmpDevice: string | null = null;

  private deviceId(): string {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = newDeviceId();
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch {
      this.tmpDevice ??= newDeviceId();
      return this.tmpDevice;
    }
  }

  private async req(path: string, init: RequestInit): Promise<Response> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      return await fetch(this.cfg.base + path, { ...init, signal: ac.signal });
    } finally {
      clearTimeout(t);
    }
  }

  /** Konto zakłada się samo przy pierwszym uruchomieniu na urządzeniu. */
  async auth(): Promise<void> {
    const res = await this.req('/v2/account/authenticate/device?create=true', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(this.cfg.key + ':'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.deviceId() }),
    });
    if (!res.ok) throw new ServerError(res.status, 'Logowanie nieudane');
    this.token = ((await res.json()) as { token: string }).token;
    this.tokenAt = Date.now();
  }

  /** Adres serwera (np. dla połączenia czatu). */
  get base(): string { return this.cfg.base; }

  /** Ważny token sesji (odnawiany przed upływem doby). */
  async session(): Promise<string> {
    if (!this.token || Date.now() - this.tokenAt > 20 * 3600000) await this.auth();
    return this.token as string;
  }

  /** Zapytanie REST do Nakamy (np. historia czatu). */
  async get<T>(path: string): Promise<T> {
    const token = await this.session();
    const res = await this.req(path, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new ServerError(res.status, 'Błąd serwera');
    return (await res.json()) as T;
  }

  async rpc<T>(id: string, body: unknown, retry = true): Promise<T> {
    if (!this.token) await this.auth();
    const res = await this.req(`/v2/rpc/${id}?unwrap`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401 && retry) { this.token = null; return this.rpc<T>(id, body, false); }
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try { msg = (JSON.parse(text) as { message?: string }).message ?? text; } catch { /* zostaje surowy tekst */ }
      throw new ServerError(res.status, msg);
    }
    const data = JSON.parse(text) as T & { serverTime?: number; testSpeed?: number };
    if (typeof data.serverTime === 'number') this.offset = data.serverTime - Date.now();
    if (typeof data.testSpeed === 'number') this.testSpeed = data.testSpeed;
    return data;
  }

  /** Wczytuje zapis z serwera. */
  async load(): Promise<GameState | null> {
    const r = await this.rpc<{ state: GameState | null; version: string | null }>('save_get', {});
    this.version = r.version;
    this.online = true;
    return r.state;
  }

  /**
   * Zapisuje stan. Gdy serwer ma nowszy zapis z innego urządzenia, zwraca go jako `conflict`
   * (gra wybiera nowszy po `savedAt`).
   */
  async save(state: GameState): Promise<{ conflict?: GameState | null; force?: boolean; power?: number; name?: string; newName?: boolean; clanLvl?: number; shop?: ShopSync }> {
    const r = await this.rpc<{ version?: string; power?: number; unverified?: SlotId[]; conflict?: boolean; force?: boolean; state?: GameState | null; name?: string; newName?: boolean; clanLvl?: number } & ShopSync>(
      'save_put', { state, version: this.version });
    this.version = r.version ?? this.version;
    if (r.conflict) return { conflict: r.state ?? null, force: !!r.force };
    this.power = r.power ?? null;
    this.unverified = r.unverified ?? [];
    return { power: r.power, name: r.name, newName: r.newName, clanLvl: r.clanLvl, shop: { gems: r.gems, shop: r.shop, pass: r.pass, buffs: r.buffs } };
  }

  /** Zmiana nicku (unikalny na serwerze, raz na dobę). */
  nameSet(name: string): Promise<{ name: string }> { return this.rpc('name_set', { name }); }

  clanInfo(): Promise<ClanInfo> { return this.rpc('clan_info', {}); }
  clanList(q = ''): Promise<{ clans: ClanSummary[]; power: number }> { return this.rpc('clan_list', { q }); }
  clanCreate(c: { name: string; tag: string; desc: string; mode: ClanMode; minPower: number; lang: string }): Promise<{ id: string }> { return this.rpc('clan_create', c); }
  clanJoin(id: string): Promise<{ joined?: boolean; requested?: boolean }> { return this.rpc('clan_join', { id }); }
  clanLeave(cancel?: string): Promise<{ ok: boolean }> { return this.rpc('clan_leave', cancel ? { cancel } : {}); }
  clanManage(action: 'accept' | 'reject' | 'kick' | 'promote' | 'demote' | 'transfer', user: string): Promise<{ ok: boolean }> { return this.rpc('clan_manage', { action, user }); }
  clanSettings(s: { desc?: string; mode?: ClanMode; minPower?: number; lang?: string; ann?: string }): Promise<{ ok: boolean }> { return this.rpc('clan_settings', s); }
  /** Życie klanu. `up` = trwające ulepszenie kuźni (poziom docelowy, 0 bez ulepszenia) — do pomocy klanu. */
  clanSync(up: number): Promise<ClanLife> { return this.rpc('clan_sync', { up }); }
  clanDonate(up: number): Promise<ClanLife> { return this.rpc('clan_donate', { up }); }
  clanBossAttack(up: number): Promise<ClanLife> { return this.rpc('clan_boss_attack', { up }); }
  clanHelpAsk(up: number): Promise<ClanLife> { return this.rpc('clan_help_ask', { up }); }
  clanHelp(up: number, uid?: string): Promise<ClanLife> { return this.rpc('clan_help', uid ? { up, uid } : { up }); }
  clanOreAsk(up: number, ore: number): Promise<ClanLife> { return this.rpc('clan_ore_ask', { up, ore }); }
  clanOreGive(up: number, id: string, n: number): Promise<ClanLife> { return this.rpc('clan_ore_give', { up, id, n }); }
  /** Przekuwanie: serwer losuje nową statystykę i podpisuje przedmiot. */
  reforge(item: Item, i: number): Promise<{ item: Item }> { return this.rpc('reforge', { item, i }); }
  shopState(): Promise<ShopResp> { return this.rpc('shop_state', {}); }
  shopBuy(id: GemItemId): Promise<ShopResp> { return this.rpc('shop_buy', { id }); }
  shopGift(): Promise<ShopResp> { return this.rpc('shop_gift', {}); }
  adReward(kind: AdKind): Promise<ShopResp & { left?: number }> { return this.rpc('ad_reward', { kind }); }
  passBuy(): Promise<ShopResp> { return this.rpc('pass_buy', {}); }
  passClaim(): Promise<ShopResp> { return this.rpc('pass_claim', {}); }
  /** `key` — poziom trwającego ulepszenia kuźni albo trwające badanie (serwer sprawdza, że zna ten sam stan). */
  speedup(what: 'forge' | 'tech', key?: number | string): Promise<ShopResp> { return this.rpc('speedup', { what, key }); }
  iapTest(id: string): Promise<ShopResp> { return this.rpc('iap_test', { id }); }
  iapGoogle(id: string, receipt: string): Promise<ShopResp> { return this.rpc('iap_google', { id, receipt }); }
  warState(): Promise<WarState> { return this.rpc('war_state', {}); }
  warAttack(id: string): Promise<WarState> { return this.rpc('war_attack', { id }); }
  raidState(): Promise<RaidState> { return this.rpc('raid_state', {}); }
  raidAttack(): Promise<RaidState> { return this.rpc('raid_attack', {}); }
  /** Karta przedmiotu Mitycznego lub Boskiego na czacie klanu albo globalnym. */
  chatDrop(item: Item, global: boolean): Promise<{ ok: boolean }> { return this.rpc('chat_drop', { item, global }); }
  chatReport(r: { channel: string; message: string; sender: string; name: string; text: string }): Promise<{ ok: boolean }> { return this.rpc('chat_report', r); }
  /** Uwaga albo błąd od testera (kind: uwaga, blad) lub automatyczny raport błędu skryptu (auto). */
  feedback(kind: 'uwaga' | 'blad' | 'auto', text: string, meta: Record<string, string | number>): Promise<{ ok: boolean }> { return this.rpc('feedback', { kind, text, meta }); }

  clanRanking(board: 'moc' | 'sezon'): Promise<ClanRanking> { return this.rpc('clan_ranking', { board }); }
  ranking(board: BoardId): Promise<Ranking> {
    return this.rpc<Ranking>('ranking', { board, limit: 30 });
  }

  /** Ziarna wytopu od numeru `from`. */
  seeds(from: number, n: number): Promise<{ from: number; seeds: number[] }> {
    return this.rpc('seeds', { from, n });
  }

  /** Wysyła sprzedane przedmioty do Obiegu, bierze znaleziska i wieści. */
  obiegSync(out: Item[], want: number): Promise<{ accepted: number; items: Item[]; events: FoundEvent[]; real: number }> {
    return this.rpc('obieg_sync', { out, want });
  }

  arenaList(refresh = false): Promise<ArenaState> { return this.rpc('arena_list', { refresh }); }
  arenaFight(i: number, id: string): Promise<ArenaFight> { return this.rpc('arena_fight', { i, id }); }
  arenaLeague(): Promise<LeagueState> { return this.rpc('arena_league', {}); }
  playerProfile(id: string): Promise<Profile> { return this.rpc('player_profile', { id }); }
  arenaShopBuy(id: ArenaShopId): Promise<LeagueState> { return this.rpc('arena_shop_buy', { id }); }

  /** Kod do przeniesienia tego konta na inne urządzenie (ważny 10 minut). */
  transferCode(): Promise<{ code: string; exp: number }> { return this.rpc('transfer_code', {}); }

  /**
   * Przejmuje konto z kodu: serwer dołącza nowy identyfikator tego urządzenia do konta z kodu,
   * a gra loguje się na nie od nowa i zwraca jego zapis.
   */
  async redeem(code: string): Promise<GameState | null> {
    const device = newDeviceId();
    await this.rpc('transfer_redeem', { code, device });
    try { localStorage.setItem(DEVICE_KEY, device); } catch { this.tmpDevice = device; }
    this.token = null;
    this.version = null;
    this.power = null;
    this.unverified = [];
    return this.load();
  }
}

let current: ServerLink | null = null;
export const setLink = (l: ServerLink | null) => { current = l; };
export const getLink = () => current;

/** Zapis gry „teraz” (ustawia go main.tsx) — np. przed przyspieszeniem, żeby serwer znał bieżące ulepszenie. */
let flusher: (() => Promise<void>) | null = null;
export const setFlush = (f: (() => Promise<void>) | null) => { flusher = f; };
export const flushSave = () => (flusher ? flusher() : Promise.resolve());
