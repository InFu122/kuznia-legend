// Sklep i Przepustka Kowala po stronie gry. Liczenie nagród, cen i postępu przepustki jest wspólne z serwerem
// (server/src/shop.ts) — z serwerem Klejnoty, limity, przepustkę i wzmocnienia prowadzi serwer, a gra tylko je pokazuje.
// Bez serwera (artefakt, gra w przeglądarce) wszystko dzieje się tutaj.
import {
  AD, AD_BUFFS, DAILY_GIFT, DUNGEONS, DUNG_ORDER, GEM_PACKS, GEM_SHOP, DIVINE_ORE, PASS, oreCap, PASS_LEVELS, SEASON_NAMES, STARTER_EXTRA, speedupGems,
  adMax, type AdKind, type FrameId, type SkinId,
  type BuffId, type GemItemId, type PassItem,
} from '../data';
import { mountsUnlocked, petsUnlocked, skillsUnlocked } from './companions';
import { toast, type Ctx } from './context';
import { goldWave, todayStr } from './formulas';
import { grant } from './reward';
import type { GameState, PassBase, PassTrack, Reward } from './types';

export type { PassBase, PassTrack };

export const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);

/* ---------- nagrody ---------- */

/** Najlepsza ruda, którą kuźnia wytapia (do nagród „ruda”). */
export function bestOre(s: GameState): number {
  return oreCap(DIVINE_ORE, s.forge.lvl);
}

/** Suma nagród. */
export function addReward(a: Reward, b: Reward): Reward {
  const out: Reward = { ...a };
  for (const k of ['gold', 'books', 'scrolls', 'saddles', 'stones', 'seals', 'coins', 'gems'] as const) if (b[k]) out[k] = (out[k] ?? 0) + b[k]!;
  for (const k of ['ores', 'eggs', 'els', 'uniq'] as const) {
    const m = b[k] as Record<string, number> | undefined;
    if (!m) continue;
    const t = { ...((out[k] as Record<string, number> | undefined) ?? {}) };
    for (const [kk, v] of Object.entries(m)) t[kk] = (t[kk] ?? 0) + v;
    (out as Record<string, unknown>)[k] = t;
  }
  if (b.skins?.length) out.skins = [...new Set([...(out.skins ?? []), ...b.skins])];
  if (b.frames?.length) out.frames = [...new Set([...(out.frames ?? []), ...b.frames])];
  return out;
}

/** Nagroda z listy pozycji przepustki (złoto i ruda według postępu gracza). */
export function passItemsReward(items: PassItem[], s: GameState): Reward {
  let r: Reward = {};
  for (const it of items) {
    switch (it.k) {
      case 'gold': r = addReward(r, { gold: goldWave(s.bestG) * it.n }); break;
      case 'ore': r = addReward(r, { ores: { [bestOre(s)]: it.n } }); break;
      case 'divine': r = addReward(r, { ores: { [DIVINE_ORE]: it.n } }); break;
      case 'egg': r = addReward(r, { eggs: { [it.n]: 1 } }); break;
      case 'skin': if (it.id) r = addReward(r, { skins: [it.id as SkinId] }); break;
      case 'frame': if (it.id) r = addReward(r, { frames: [it.id as FrameId] }); break;
      default: r = addReward(r, { [it.k]: it.n } as Reward);
    }
  }
  return r;
}

/* ---------- Przepustka Kowala ---------- */

/** Sezon: numer, początek, koniec i nazwa. */
export function seasonOf(now: number) {
  const len = PASS.SEASON_DAYS * 86400000;
  const i = Math.floor((now - PASS.EPOCH) / len);
  const start = PASS.EPOCH + i * len;
  return { n: i + 1, start, end: start + len, name: SEASON_NAMES[((i % SEASON_NAMES.length) + SEASON_NAMES.length) % SEASON_NAMES.length] };
}

/** Liczniki, z których rosną punkty przepustki (wytopy: numer ziarna serwera, bez serwera — licznik wytopów). */
export const passBaseOf = (s: GameState): PassBase => ({
  sm: s.sx > 0 ? s.sx : s.stats.smelted, k: s.stats.kills, b: s.stats.bosses, keys: s.stats.keys || 0, tw: s.dungeons.wieza.best,
});

/** Punkty przepustki zdobyte od liczników `b` (bez dziennego limitu). */
export function passXpSince(s: GameState, b: PassBase): number {
  const n = passBaseOf(s);
  const d = (x: number, y: number) => Math.max(0, x - y);
  return Math.floor(d(n.sm, b.sm) * PASS.XP_SMELT + d(n.k, b.k) * PASS.XP_KILL + d(n.b, b.b) * PASS.XP_BOSS + d(n.keys, b.keys) * PASS.XP_KEY + d(n.tw, b.tw) * PASS.XP_TOWER);
}

export const newPass = (season: number, base: PassBase, day: string): PassTrack => ({ season, xp: 0, d: day, base, dxp: 0, prem: false, cf: 0, cp: 0 });
export const passXp = (p: PassTrack) => p.xp + p.dxp;
export const passLevel = (p: PassTrack) => Math.min(PASS.LEVELS, Math.floor(passXp(p) / PASS.XP_PER_LVL));

/**
 * Postęp przepustki po zmianie stanu gry. `prev` — stan z poprzedniego zapisu (serwer) albo null (gra liczy na bieżąco).
 * Nowy dzień zaczyna liczenie od liczników z chwili przełomu (najwyżej DAY_CAP punktów dziennie).
 * Przy zmianie sezonu zwraca też poprzedni stan (`old`) — jego nieodebrane nagrody trafiają do gracza.
 */
export function passUpdate(p: PassTrack | null | undefined, s: GameState, prev: GameState | null, now: number): { p: PassTrack; old: PassTrack | null } {
  const season = seasonOf(now).n;
  const day = utcDay(now);
  const from = passBaseOf(prev ?? s);
  let old: PassTrack | null = null;
  let cur: PassTrack | null = p && typeof p.season === 'number' && p.base ? { ...p, base: { ...p.base } } : null;
  if (!cur || cur.season !== season) { old = cur; cur = newPass(season, from, day); }
  if (cur.d !== day) { cur.xp += cur.dxp; cur.dxp = 0; cur.d = day; cur.base = from; }
  cur.dxp = Math.min(PASS.DAY_CAP, passXpSince(s, cur.base));
  return { p: cur, old };
}

/** Nieodebrane nagrody przepustki do jej obecnego poziomu (darmowe i — gdy kupiona — złote). */
export function passUnclaimed(p: PassTrack, s: GameState): { r: Reward; free: number; prem: number; next: PassTrack } {
  const lvl = passLevel(p);
  let r: Reward = {};
  let free = 0;
  let prem = 0;
  for (let L = p.cf + 1; L <= lvl; L++) { r = addReward(r, passItemsReward(PASS_LEVELS[L - 1].free, s)); free++; }
  if (p.prem) for (let L = p.cp + 1; L <= lvl; L++) { r = addReward(r, passItemsReward(PASS_LEVELS[L - 1].prem, s)); prem++; }
  return { r, free, prem, next: { ...p, cf: Math.max(p.cf, lvl), cp: p.prem ? Math.max(p.cp, lvl) : p.cp } };
}

/* ---------- sklep (dzienne limity) ---------- */

export type ShopState = GameState['shop'];
export const newShop = (day: string): ShopState => ({ day, n: {}, ads: {}, gift: '', once: [] });
/** Dzienne liczniki sklepu na dziś (stare — od zera; jednorazowe zakupy zostają). */
export function shopToday(sh: ShopState | undefined, now: number): ShopState {
  const day = utcDay(now);
  if (!sh || sh.day !== day) return { ...newShop(day), once: sh?.once ?? [] };
  return sh;
}

/** Czy towar jest dostępny dla tego postępu gry. */
export function gemItemOpen(s: GameState, id: GemItemId): boolean {
  switch (GEM_SHOP[id].need) {
    case 'skills': return skillsUnlocked(s);
    case 'pets': return petsUnlocked(s);
    case 'mounts': return mountsUnlocked(s);
    case 'dungeons': return s.maxLand >= 1;
    default: return true;
  }
}

/** Ile sztuk towaru można dziś jeszcze kupić. */
export const gemItemLeft = (sh: ShopState, id: GemItemId) => Math.max(0, GEM_SHOP[id].day - (sh.n[id] ?? 0));

/** Dlaczego nie da się kupić towaru (albo null). `gems` — Klejnoty gracza. */
export function gemItemBlock(s: GameState, sh: ShopState, id: GemItemId, gems: number): string | null {
  if (!GEM_SHOP[id]) return 'nieznany towar';
  if (!gemItemOpen(s, id)) return 'jeszcze niedostępne';
  if (gemItemLeft(sh, id) <= 0) return 'na dziś wyprzedane';
  if (gems < GEM_SHOP[id].cost) return 'za mało Klejnotów';
  return null;
}

/** Co daje towar (komplet kluczy nie ma nagrody — odnawia klucze: `refillKeys`). */
export function gemItemReward(s: GameState, id: GemItemId): Reward {
  switch (id) {
    case 'zloto': return { gold: goldWave(s.bestG) * 300 };
    case 'ruda': return { ores: { [bestOre(s)]: 200 } };
    case 'ksiegi': return { books: 5 };
    case 'kamienie': return { stones: 30 };
    case 'zwoj': return { scrolls: 1 };
    case 'siodlo': return { saddles: 1 };
    case 'jajo': return { eggs: { 2: 1 } };
    case 'klucze': return {};
  }
}

/** Odnawia dzisiejsze klucze do lochów (Komplet kluczy). */
export function refillKeys(s: GameState, now: number): void {
  const today = todayStr(now);
  for (const id of DUNG_ORDER) if (DUNGEONS[id].keys > 0) s.dungeons[id] = { ...s.dungeons[id], day: today, keys: DUNGEONS[id].keys };
}

/** Prezent dnia w sklepie. */
export const giftReward = (s: GameState): Reward => ({ gold: goldWave(s.bestG) * DAILY_GIFT.goldWaves, ores: { [bestOre(s)]: DAILY_GIFT.ore } });

/** Nagroda pakietu Klejnotów (Pakiet Nowicjusza ma dodatki). */
export function packReward(id: string): Reward | null {
  const p = GEM_PACKS.find(x => x.id === id);
  if (!p) return null;
  return p.id === 'starter' ? { gems: p.gems + p.bonus, ...STARTER_EXTRA } : { gems: p.gems + p.bonus };
}

/* ---------- wzmocnienia z reklam ---------- */

/** Nowy koniec wzmocnienia po obejrzanej reklamie: godzina od teraz albo od końca trwającego, najwyżej 3 h naprzód. */
export const buffUntil = (cur: number | undefined, now: number, kind: BuffId) =>
  Math.min(now + AD.BUFF_MAX_MS, Math.max(now, cur ?? 0) + AD_BUFFS[kind].ms);

/** Mnożnik wzmocnienia teraz (1 = brak). */
export const buffMult = (s: GameState, kind: BuffId, now: number) => ((s.buffs?.[kind] ?? 0) > now ? AD_BUFFS[kind].mult : 1);

/** Mnożnik dla nagród za nieobecność od `from` do `to`: część czasu ze wzmocnieniem liczy się podwójnie. */
export function buffMultSpan(s: GameState, kind: BuffId, from: number, to: number): number {
  const until = s.buffs?.[kind] ?? 0;
  if (until <= from || to <= from) return 1;
  const part = (Math.min(until, to) - from) / (to - from);
  return 1 + (AD_BUFFS[kind].mult - 1) * part;
}

/* ---------- działania bez serwera ---------- */

export function buyGemItemLocal(ctx: Ctx, id: GemItemId): boolean {
  const s = ctx.s;
  const now = ctx.now();
  s.shop = shopToday(s.shop, now);
  if (gemItemBlock(s, s.shop, id, s.gems)) return false;
  s.gems -= GEM_SHOP[id].cost;
  s.shop.n[id] = (s.shop.n[id] ?? 0) + 1;
  if (id === 'klucze') refillKeys(s, now);
  else grant(ctx, gemItemReward(s, id));
  ctx.dirty = true;
  toast(ctx, `Kupiono: ${GEM_SHOP[id].n}.`, 'good');
  return true;
}

export function claimGiftLocal(ctx: Ctx): Reward | null {
  const s = ctx.s;
  s.shop = shopToday(s.shop, ctx.now());
  if (s.shop.gift === s.shop.day) return null;
  const r = giftReward(s);
  s.shop.gift = s.shop.day;
  grant(ctx, r);
  return r;
}

/** Nagroda za reklamę: wzmocnienie albo Klejnoty (dzienne limity). */
/** Reklamy danego rodzaju, które zostały na dziś. */
export const adsLeft = (sh: ShopState, kind: AdKind) => Math.max(0, adMax(kind) - (sh.ads[kind] ?? 0));

/** Liczy obejrzaną reklamę w dziennym limicie (bez serwera). */
export function adCountLocal(ctx: Ctx, kind: AdKind): boolean {
  const s = ctx.s;
  s.shop = shopToday(s.shop, ctx.now());
  if (adsLeft(s.shop, kind) <= 0) return false;
  s.shop.ads[kind] = (s.shop.ads[kind] ?? 0) + 1;
  ctx.dirty = true;
  return true;
}

export function adRewardLocal(ctx: Ctx, kind: BuffId | 'gems'): boolean {
  const s = ctx.s;
  const now = ctx.now();
  if (!adCountLocal(ctx, kind)) return false;
  if (kind === 'gems') s.gems += AD.GEMS;
  else s.buffs = { ...s.buffs, [kind]: buffUntil(s.buffs?.[kind], now, kind) };
  ctx.dirty = true;
  return true;
}

/** Zakup bez płatności (gra bez serwera — wersja do testów). */
export function buyPackLocal(ctx: Ctx, id: string): boolean {
  const s = ctx.s;
  const p = GEM_PACKS.find(x => x.id === id);
  const r = packReward(id);
  if (!p || !r) return false;
  s.shop = shopToday(s.shop, ctx.now());
  if (p.once && s.shop.once.includes(p.id)) return false;
  if (p.once) s.shop.once = [...s.shop.once, p.id];
  s.gems += r.gems ?? 0;
  grant(ctx, { ...r, gems: 0 });
  return true;
}

export function buyPassLocal(ctx: Ctx): boolean {
  const s = ctx.s;
  s.pass = passUpdate(s.pass, s, null, ctx.now()).p;
  if (s.pass.prem || s.gems < PASS.PREM_COST) return false;
  s.gems -= PASS.PREM_COST;
  s.pass = { ...s.pass, prem: true };
  ctx.dirty = true;
  return true;
}

export function claimPassLocal(ctx: Ctx): Reward | null {
  const s = ctx.s;
  s.pass = passUpdate(s.pass, s, null, ctx.now()).p;
  const u = passUnclaimed(s.pass, s);
  if (!u.free && !u.prem) return null;
  s.pass = u.next;
  s.gems += u.r.gems ?? 0;
  grant(ctx, { ...u.r, gems: 0 });
  return u.r;
}

/** Postęp przepustki bez serwera (co kilka sekund); przy nowym sezonie daje nieodebrane nagrody poprzedniego. */
export function tickPassLocal(ctx: Ctx): Reward | null {
  const s = ctx.s;
  const { p, old } = passUpdate(s.pass, s, null, ctx.now());
  s.pass = p;
  if (!old) return null;
  const u = passUnclaimed(old, s);
  if (!u.free && !u.prem) return null;
  s.gems += u.r.gems ?? 0;
  grant(ctx, { ...u.r, gems: 0 });
  return u.r;
}

/** Cena przyspieszenia w Klejnotach: kuźnia (trwające ulepszenie) albo badanie. */
export function speedupCost(s: GameState, what: 'forge' | 'tech'): number {
  if (what === 'forge') return s.forge.up ? speedupGems(s.forge.left) : 0;
  return s.tech.cur ? speedupGems(s.tech.cur.left, 'tech') : 0;
}

/** Przyspieszenie bez serwera: kończy ulepszenie kuźni albo badanie (dokończy je następny krok gry). */
export function speedupLocal(ctx: Ctx, what: 'forge' | 'tech'): boolean {
  const s = ctx.s;
  const cost = speedupCost(s, what);
  if (!cost || s.gems < cost) return false;
  s.gems -= cost;
  if (what === 'forge') s.forge.left = 0;
  else if (s.tech.cur) s.tech.cur = { ...s.tech.cur, left: 0 };
  ctx.dirty = true;
  return true;
}

/**
 * Przyspieszenie kuźni od serwera: łącznie `ms` przy ulepszeniu na poziom `lvl`. Gra skraca trwające ulepszenie
 * o to, czego jeszcze nie odjęła (jak przy pomocy klanu). Zwraca odjęty czas.
 */
export function applyBoost(ctx: Ctx, lvl: number, ms: number): number {
  const s = ctx.s;
  if (!(lvl > 1) || !(ms > 0)) return 0;
  if (s.boost.lvl !== lvl) s.boost = { lvl, ms: 0 };
  const add = ms - s.boost.ms;
  if (add <= 0) return 0;
  s.boost = { lvl, ms };
  if (s.forge.up === lvl) {
    s.forge.left = Math.max(0, s.forge.left - add);
    if (s.forge.left < 60000) s.forge.left = 0; // resztka po różnicy zegarów gry i serwera
  }
  ctx.dirty = true;
  return add;
}
