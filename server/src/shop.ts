// Sklep, Klejnoty, reklamy z nagrodą i Przepustka Kowala na serwerze.
//
// Klejnoty żyją w portfelu Nakamy (wallet, klucz `gems`) — zapis gry ich nie zmienia (save_put wpisuje do zapisu stan portfela).
// Towary, prezent dnia i nagrody przepustki idą przez kolejkę nagród (clan/rewards), jak nagrody klanu;
// Klejnoty z nagród trafiają wprost do portfela.
//
// Magazyn gracza (tylko serwer): shop/daily — dzienne limity (UTC), shop/iap — jednorazowe zakupy,
// shop/buffs — wzmocnienia z reklam, shop/boost — przyspieszenia ulepszeń kuźni (kontrola tempa kuźni je odejmuje),
// pass/state — Przepustka Kowala (punkty liczy save_put z różnicy liczników, jak punkty wojny klanów).
import { AD, AD_BUFFS, GEM_PACKS, GEM_SHOP, PASS, speedupGems, type BuffId, type GemItemId } from '../../src/data';
import {
  buffUntil, gemItemBlock, gemItemReward, giftReward, newShop, packReward, passUnclaimed, passUpdate, shopToday,
  type PassTrack, type ShopState,
} from '../../src/engine/shop';
import type { GameState, Reward } from '../../src/engine/types';
import { pushRewards, readPending } from './clanlife';
import { INVALID, NOT_FOUND, PRECONDITION, UNAUTH, err, parse, readSave, testSpeed, updateObject, userOf } from './common';

const GEMS = 'gems';
const perm = { read: 0 as nkruntime.ReadPermissionValues, write: 0 as nkruntime.WritePermissionValues };
type Buffs = Partial<Record<BuffId, number>>;
type Boost = Record<string, number>;
interface Iap { once: string[] }

/* ---------- portfel ---------- */

/** Stan waluty w portfelu Nakamy (`gems` — Klejnoty, `tokens` — Żetony Areny). */
export function walletGet(nk: nkruntime.Nakama, userId: string, key: string): number {
  const w = (nk.accountGetId(userId).wallet || {}) as Record<string, number>;
  return Math.max(0, Math.floor(Number(w[key]) || 0));
}
export function walletAdd(nk: nkruntime.Nakama, userId: string, key: string, n: number, why: string): number {
  if (!n) return walletGet(nk, userId, key);
  const r = nk.walletUpdate(userId, { [key]: Math.round(n) }, { why }, true);
  return Math.max(0, Math.floor(Number((r.updated || {})[key]) || 0));
}
/** Płatność z portfela. Portfel Nakamy nie zejdzie poniżej zera — wtedy zakup jest odrzucony. */
export function walletSpend(nk: nkruntime.Nakama, userId: string, key: string, n: number, why: string, msg: string): number {
  if (walletGet(nk, userId, key) < n) throw err(msg, PRECONDITION);
  try { return walletAdd(nk, userId, key, -n, why); } catch { throw err(msg, PRECONDITION); }
}

export const walletGems = (nk: nkruntime.Nakama, userId: string) => walletGet(nk, userId, GEMS);
const addGems = (nk: nkruntime.Nakama, userId: string, n: number, why: string) => walletAdd(nk, userId, GEMS, n, why);
const spendGems = (nk: nkruntime.Nakama, userId: string, n: number, why: string) => walletSpend(nk, userId, GEMS, n, why, 'Za mało Klejnotów.');

/** Nagroda: Klejnoty do portfela, reszta do kolejki nagród gry. */
export function giveReward(nk: nkruntime.Nakama, userId: string, why: string, r: Reward): void {
  const { gems, ...rest } = r;
  if (gems) addGems(nk, userId, gems, why);
  if (Object.keys(rest).some(k => { const v = (rest as Record<string, unknown>)[k]; return typeof v === 'number' ? v > 0 : !!v && Object.keys(v as object).length > 0; })) {
    pushRewards(nk, userId, [{ why, r: rest }]);
  }
}

/* ---------- magazyn ---------- */

function readObj<T>(nk: nkruntime.Nakama, coll: string, key: string, userId: string): T | null {
  const o = nk.storageRead([{ collection: coll, key, userId }]);
  return o.length ? (o[0].value as unknown as T) : null;
}
const readIap = (nk: nkruntime.Nakama, userId: string): Iap => readObj<Iap>(nk, 'shop', 'iap', userId) || { once: [] };
const readBuffs = (nk: nkruntime.Nakama, userId: string): Buffs => readObj<Buffs>(nk, 'shop', 'buffs', userId) || {};
export const readBoost = (nk: nkruntime.Nakama, userId: string): Boost => readObj<Boost>(nk, 'shop', 'boost', userId) || {};
const readPass = (nk: nkruntime.Nakama, userId: string): PassTrack | null => readObj<PassTrack>(nk, 'pass', 'state', userId);
function readShop(nk: nkruntime.Nakama, userId: string, now: number): ShopState {
  const sh = shopToday(readObj<ShopState>(nk, 'shop', 'daily', userId) || newShop(''), now);
  return { ...sh, once: readIap(nk, userId).once };
}

/** Zmienia dzienne limity sklepu atomowo; `fn` zwraca false, gdy limit jest wyczerpany. */
function bumpShop(nk: nkruntime.Nakama, userId: string, now: number, fn: (sh: ShopState) => boolean, msg: string): ShopState {
  let ok = true;
  const out = updateObject<ShopState>(nk, 'shop', 'daily', userId, cur => {
    const sh = shopToday(cur || newShop(''), now);
    const next: ShopState = { ...sh, n: { ...sh.n }, ads: { ...sh.ads } };
    ok = fn(next);
    return ok ? next : null;
  }, perm);
  if (!ok) throw err(msg, PRECONDITION);
  return { ...(out as ShopState), once: readIap(nk, userId).once };
}

/* ---------- przepustka ---------- */

/** Postęp przepustki po zapisie gry (punkty z różnicy liczników). Przy nowym sezonie wydaje nieodebrane nagrody poprzedniego. */
export function passOnSave(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, prev: GameState | null, s: GameState, now: number): PassTrack | null {
  try {
    let old: PassTrack | null = null;
    const p = updateObject<PassTrack>(nk, 'pass', 'state', userId, cur => {
      const r = passUpdate(cur, s, prev, now);
      old = r.old;
      return r.p;
    }, perm) as PassTrack;
    const o = old as PassTrack | null;
    if (o) {
      const u = passUnclaimed(o, s);
      if (u.free || u.prem) giveReward(nk, userId, `Przepustka Kowala (sezon ${o.season}): nieodebrane nagrody`, u.r);
    }
    return p;
  } catch (e) {
    logger.warn('Przepustka gracza %s: %s', userId, String(e));
    return readPass(nk, userId);
  }
}

/** Stan sklepu dla gry (także w odpowiedzi save_put). */
export function shopSync(nk: nkruntime.Nakama, userId: string, now: number, pass?: PassTrack | null) {
  return { gems: walletGems(nk, userId), shop: readShop(nk, userId, now), pass: pass === undefined ? readPass(nk, userId) : pass, buffs: readBuffs(nk, userId) };
}

/** Przed zapisem gry: Klejnoty, limity, przepustkę i wzmocnienia ustala serwer, nie gra. */
export function shopIntoSave(nk: nkruntime.Nakama, userId: string, s: GameState, now: number, pass: PassTrack | null): void {
  const x = shopSync(nk, userId, now, pass);
  s.gems = x.gems;
  s.shop = x.shop;
  s.pass = x.pass;
  s.buffs = x.buffs;
}

function view(nk: nkruntime.Nakama, userId: string, now: number, extra: Record<string, unknown> = {}) {
  return { ...shopSync(nk, userId, now), rewards: readPending(nk, userId), serverTime: now, ...extra };
}

function saveOf(nk: nkruntime.Nakama, userId: string): GameState {
  const save = readSave(nk, userId);
  if (!save) throw err('Najpierw zapisz grę.', PRECONDITION);
  return save.value.state;
}

/* ---------- RPC ---------- */

export function rpcShopState(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  return JSON.stringify(view(nk, userId, Date.now()));
}

/** Towar za Klejnoty (dzienny limit). Komplet kluczy odnawia gra (`keys`). */
export function rpcShopBuy(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const id = String(parse(payload).id || '') as GemItemId;
  if (!GEM_SHOP[id]) throw err('Nie ma takiego towaru.', INVALID);
  const now = Date.now();
  const s = saveOf(nk, userId);
  const block = gemItemBlock(s, readShop(nk, userId, now), id, walletGems(nk, userId));
  if (block) throw err(`Nie da się kupić: ${block}.`, PRECONDITION);
  spendGems(nk, userId, GEM_SHOP[id].cost, `sklep: ${id}`);
  try {
    bumpShop(nk, userId, now, sh => ((sh.n[id] ?? 0) < GEM_SHOP[id].day ? (sh.n[id] = (sh.n[id] ?? 0) + 1, true) : false), 'Na dziś wyprzedane.');
  } catch (e) {
    addGems(nk, userId, GEM_SHOP[id].cost, `zwrot: ${id}`);
    throw e;
  }
  if (id !== 'klucze') giveReward(nk, userId, `Sklep: ${GEM_SHOP[id].n}`, gemItemReward(s, id));
  return JSON.stringify(view(nk, userId, now, { keys: id === 'klucze' }));
}

/** Darmowy prezent dnia. */
export function rpcShopGift(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const now = Date.now();
  const s = saveOf(nk, userId);
  bumpShop(nk, userId, now, sh => (sh.gift === sh.day ? false : (sh.gift = sh.day, true)), 'Prezent na dziś już odebrany — wróć jutro.');
  giveReward(nk, userId, 'Prezent dnia', giftReward(s));
  return JSON.stringify(view(nk, userId, now));
}

/**
 * Nagroda za obejrzaną reklamę: wzmocnienie (×2 ruda / ×2 złoto przez godzinę) albo Klejnoty. Dzienne limity pilnuje serwer.
 * Gdy gra dostanie prawdziwe reklamy (AdMob), nagrodę potwierdzi weryfikacja po stronie serwera reklam.
 */
export function rpcAdReward(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const kind = String(parse(payload).kind || '') as BuffId | 'gems';
  if (kind !== 'gems' && !AD_BUFFS[kind]) throw err('Nieznana nagroda.', INVALID);
  const now = Date.now();
  const max = kind === 'gems' ? AD.GEMS_DAY : AD_BUFFS[kind].day;
  bumpShop(nk, userId, now, sh => ((sh.ads[kind] ?? 0) < max ? (sh.ads[kind] = (sh.ads[kind] ?? 0) + 1, true) : false), 'Na dziś koniec tych reklam — wróć jutro.');
  if (kind === 'gems') addGems(nk, userId, AD.GEMS, 'reklama');
  else updateObject<Buffs>(nk, 'shop', 'buffs', userId, cur => ({ ...(cur || {}), [kind]: buffUntil((cur || {})[kind], now, kind) }), perm);
  return JSON.stringify(view(nk, userId, now));
}

/** Złota ścieżka przepustki za Klejnoty. */
export function rpcPassBuy(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const now = Date.now();
  const s = saveOf(nk, userId);
  const p = passOnSave(nk, logger, userId, null, s, now);
  if (p && p.prem) throw err('Złota ścieżka jest już twoja.', PRECONDITION);
  spendGems(nk, userId, PASS.PREM_COST, 'przepustka');
  updateObject<PassTrack>(nk, 'pass', 'state', userId, cur => (cur ? { ...cur, prem: true } : null), perm);
  return JSON.stringify(view(nk, userId, now));
}

/** Odbiór wszystkich nagród przepustki do obecnego poziomu. */
export function rpcPassClaim(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const now = Date.now();
  const s = saveOf(nk, userId);
  passOnSave(nk, logger, userId, null, s, now);
  let got: { r: Reward; free: number; prem: number } | null = null;
  updateObject<PassTrack>(nk, 'pass', 'state', userId, cur => {
    got = null;
    if (!cur) return null;
    const u = passUnclaimed(cur, s);
    if (!u.free && !u.prem) return null;
    got = u;
    return u.next;
  }, perm);
  const g = got as { r: Reward; free: number; prem: number } | null;
  if (!g) throw err('Nie ma nagród do odebrania — zdobywaj punkty przepustki.', PRECONDITION);
  giveReward(nk, userId, `Przepustka Kowala: ${g.free + g.prem} ${g.free + g.prem === 1 ? 'nagroda' : 'nagród'}`, g.r);
  return JSON.stringify(view(nk, userId, now));
}

/** Pozostały czas ulepszenia kuźni albo badania według ostatniego zapisu (licznik biegnie z czasem, także w tempie testowym). */
function leftNow(save: { value: { state: GameState; savedAt: number } }, what: 'forge' | 'tech', now: number): number {
  const s = save.value.state;
  const run = Math.max(0, now - (save.value.savedAt || now)) * Math.max(1, s.speed || 1);
  const left = what === 'forge' ? (s.forge.up ? s.forge.left : 0) : (s.tech.cur ? s.tech.cur.left : 0);
  return Math.max(0, left - run);
}

/** Przyspieszenie Klejnotami: kończy ulepszenie kuźni (serwer zapamiętuje skrócony czas) albo badanie. */
export function rpcSpeedup(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const what = parse(payload).what === 'tech' ? 'tech' : 'forge';
  const now = Date.now();
  const save = readSave(nk, userId);
  if (!save) throw err('Najpierw zapisz grę.', PRECONDITION);
  const left = leftNow(save, what, now);
  if (left <= 0) throw err(what === 'forge' ? 'Kuźnia nie ma trwającego ulepszenia.' : 'Nie trwa żadne badanie.', PRECONDITION);
  const cost = speedupGems(left);
  spendGems(nk, userId, cost, `przyspieszenie: ${what}`);
  let boost: { lvl: number; ms: number } | null = null;
  if (what === 'forge') {
    const lvl = save.value.state.forge.up;
    const b = updateObject<Boost>(nk, 'shop', 'boost', userId, cur => {
      const m: Boost = {};
      for (const [k, v] of Object.entries(cur || {})) if (Number(k) >= lvl - 5) m[k] = v; // starsze poziomy nie są potrzebne
      m[String(lvl)] = (m[String(lvl)] || 0) + Math.ceil(left) + 5000; // zapas na różnicę zegarów gry i serwera
      return m;
    }, perm) as Boost;
    boost = { lvl, ms: b[String(lvl)] };
  }
  return JSON.stringify(view(nk, userId, now, { boost, techDone: what === 'tech', cost }));
}

function grantPack(nk: nkruntime.Nakama, userId: string, id: string, how: string): void {
  const p = GEM_PACKS.find(x => x.id === id);
  const r = packReward(id);
  if (!p || !r) throw err('Nie ma takiego pakietu.', NOT_FOUND);
  if (p.once) {
    let fresh = false;
    updateObject<Iap>(nk, 'shop', 'iap', userId, cur => {
      const once = (cur && cur.once) || [];
      fresh = !once.includes(p.id);
      return fresh ? { once: once.concat(p.id) } : null;
    }, perm);
    if (!fresh) throw err('Ten pakiet można kupić tylko raz.', PRECONDITION);
  }
  giveReward(nk, userId, `${p.n}${how}`, r);
}

/** Zakup testowy bez płatności — tylko w trybie testowym serwera (TEST_SPEED > 1). */
export function rpcIapTest(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  if (testSpeed(ctx) <= 1) throw err('Płatności testowe działają tylko w trybie testowym serwera.', UNAUTH);
  grantPack(nk, userId, String(parse(payload).id || ''), ' (zakup testowy)');
  return JSON.stringify(view(nk, userId, Date.now()));
}

/**
 * Zakup w Google Play: serwer sprawdza potwierdzenie zakupu u Google (Nakama: iap.google w konfiguracji)
 * i daje pakiet raz na transakcję (`seenBefore`).
 */
export function rpcIapGoogle(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const id = String(req.id || '');
  const receipt = typeof req.receipt === 'string' ? req.receipt : '';
  if (!receipt) throw err('Brak potwierdzenia zakupu.', INVALID);
  let res: nkruntime.ValidatePurchaseResponse;
  try {
    res = nk.purchaseValidateGoogle(userId, receipt, true);
  } catch (e) {
    logger.warn('Zakup Google gracza %s: %s', userId, String(e));
    throw err('Nie udało się potwierdzić zakupu w Google Play — spróbuj za chwilę.', PRECONDITION);
  }
  let given = 0;
  for (const p of res.validatedPurchases || []) {
    if (p.productId !== id || p.seenBefore || p.refundTime) continue;
    grantPack(nk, userId, id, '');
    given++;
  }
  return JSON.stringify(view(nk, userId, Date.now(), { given }));
}
