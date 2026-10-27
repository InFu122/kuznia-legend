// Zapis gry, ziarna wytopu i sprawdzanie przedmiotów.
import { B } from '../../src/data';
import { upgradeTime } from '../../src/engine/forge';
import { allMods, techMods } from '../../src/engine/mods';
import { SAVE_VERSION, migrate } from '../../src/engine/state';
import { computeStats, extraOf } from '../../src/engine/stats';
import type { GameState, Item, SlotId } from '../../src/engine/types';
import { verifySmelt } from '../../src/engine/verify';
import { updateArenaHero } from './arena';
import {
  INVALID, PRECONDITION, SAVE_COLLECTION, SAVE_KEY, err, parse, readSave, seedOf, signItem, signSecret, smeltSecret, userOf,
  type SaveMeta, type SaveValue,
} from './common';
import { ensureName } from './names';
import { submitBoards } from './ranking';
import { cleanName, validateSave } from './validate';

const MAX_SAVE_BYTES = 300_000;
/** Ile ziaren wytopu naprzód (od ostatniego zapisu) serwer wydaje. */
export const SEEDS_AHEAD = B.SEEDS_RESERVE + 100;
/** Zapas czasu w kontroli tempa kuźni (opóźnienia, zegar). */
const PACE_SLACK_MS = 10 * 60000;

/** Klucze, którymi serwer sprawdza przedmioty jednego gracza. */
export interface Proof { nk: nkruntime.Nakama; secret: string; sign: string; maxRel: number; forge: number }

export function proofFor(nk: nkruntime.Nakama, userId: string, s: GameState): Proof {
  return { nk, secret: smeltSecret(nk, userId), sign: signSecret(nk), maxRel: techMods(s).jumpRel, forge: s.forge.lvl };
}

/** Czy wytop przedmiotu zgadza się z ziarnem serwera. */
export function smeltOk(p: Proof, it: Item, sxNext: number): boolean {
  if (typeof it.sx !== 'number' || !Number.isInteger(it.sx) || it.sx < 0 || it.sx >= sxNext) return false;
  return verifySmelt(it, seedOf(p.nk, p.secret, it.sx), p.maxRel, p.forge) === null;
}

/**
 * Przedmioty ekwipunku, które serwer uznaje: wytopione z ziarna albo podpisane (z Obiegu).
 * Pozostałe (sprzed aktualizacji, wytopione bez połączenia albo zmienione) działają w grze, ale nie liczą się do rankingu i areny.
 */
export function verifiedEq(p: Proof, s: GameState, pity: number[]): { eq: GameState['eq']; bad: SlotId[]; pity: number[] } {
  const eq: GameState['eq'] = {};
  const bad: SlotId[] = [];
  const seen = new Set<number>();
  const accepted = pity.slice();
  for (const [slot, it] of Object.entries(s.eq) as [SlotId, Item | undefined][]) {
    if (!it) continue;
    let ok = false;
    if (typeof it.sx === 'number') {
      ok = !seen.has(it.sx) && smeltOk(p, it, s.sx);
      // Pewny przeskok zdarza się najwyżej raz na PITY_MAX wytopów.
      if (ok && it.forced === 'pity' && !accepted.includes(it.sx)) {
        if (accepted.some(x => Math.abs(x - (it.sx as number)) < B.PITY_MAX)) ok = false;
        else accepted.push(it.sx);
      }
      seen.add(it.sx);
    } else if (typeof it.sig === 'string') {
      ok = it.sig === signItem(p.nk, p.sign, it);
    }
    if (ok) eq[slot] = it; else bad.push(slot);
  }
  return { eq, bad, pity: accepted.sort((a, b) => a - b).slice(-30) };
}

/** Moc liczona przez serwer z tego samego silnika co w grze — z uznanych przedmiotów. */
export const powerOf = (s: GameState, eq: GameState['eq']) => computeStats(eq, allMods(s), extraOf(s)).power;

/** Kuźnia nie może rosnąć szybciej, niż pozwalają czasy ulepszeń (liczone od pierwszego zapisu na serwerze). */
export function paceProblem(s: GameState, meta: SaveMeta, now: number): string | null {
  const target = s.forge.up || s.forge.lvl;
  let need = 0;
  for (let n = meta.f0 + 1; n <= target; n++) need += upgradeTime(s, n);
  if (s.forge.up) need -= Math.max(0, s.forge.left);
  if (need > (now - meta.t0) * 1.02 + PACE_SLACK_MS) {
    return `kuźnia rośnie szybciej, niż pozwalają czasy ulepszeń (poziom ${s.forge.lvl})`;
  }
  return null;
}

/* ---------- RPC ---------- */

/** Zwraca zapis gracza i czas serwera. */
export function rpcSaveGet(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const obj = readSave(nk, userId);
  return JSON.stringify({
    state: obj ? obj.value.state : null,
    version: obj ? obj.version : null,
    serverTime: Date.now(),
  });
}

function conflict(cur: ReturnType<typeof readSave>, now: number, force = false): string {
  return JSON.stringify({ conflict: true, force, state: cur ? cur.value.state : null, version: cur ? cur.version : null, serverTime: now });
}

/**
 * Zapisuje stan gry. `version` to wersja ostatnio wczytanego zapisu — jeśli na serwerze jest nowsza
 * (np. z drugiego urządzenia), serwer zwraca konflikt razem ze swoim zapisem i klient wybiera nowszy.
 * Zapis, w którym numer wytopu się cofnął, przegrywa zawsze (`force`): wytopu nie da się powtórzyć.
 */
export function rpcSavePut(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  if (payload.length > MAX_SAVE_BYTES) throw err('Zapis jest za duży.', INVALID);
  const req = parse(payload);
  const raw = req.state as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') throw err('Brak stanu gry.', INVALID);
  if (typeof raw.v === 'number' && raw.v > SAVE_VERSION) throw err('Zapis z nowszej wersji gry — zaktualizuj serwer.', PRECONDITION);
  const now = Date.now();
  const s = migrate(raw, now);
  s.name = cleanName(s.name);
  s.speed = 1;
  const problems = validateSave(s);
  if (problems.length) {
    logger.warn('Odrzucony zapis gracza %s: %s', userId, problems.slice(0, 5).join('; '));
    throw err('Zapis odrzucony: ' + problems.slice(0, 3).join('; '), INVALID);
  }

  const cur = readSave(nk, userId);
  if (cur) {
    if (req.version === null || (typeof req.version === 'string' && req.version !== cur.version)) return conflict(cur, now);
    if (s.sx < (cur.value.state.sx || 0)) return conflict(cur, now, true);
  }
  const target = s.forge.up || s.forge.lvl;
  let meta: SaveMeta = cur && cur.value.meta ? cur.value.meta : { t0: now, f0: target, pity: [] };
  if (target < meta.f0) meta = { t0: now, f0: target, pity: meta.pity }; // nowa gra od zera
  const pace = paceProblem(s, meta, now);
  if (pace) {
    logger.warn('Odrzucony zapis gracza %s: %s', userId, pace);
    throw err('Zapis odrzucony: ' + pace, INVALID);
  }

  // Nick nadaje i zmienia serwer (unikalny); zapis zawsze dostaje nick z rejestru.
  const nick = ensureName(nk, userId, s.name);
  s.name = nick.name;

  const proof = proofFor(nk, userId, s);
  const ver = verifiedEq(proof, s, meta.pity || []);
  meta.pity = ver.pity;
  const power = powerOf(s, ver.eq);
  const value: SaveValue = { state: s, power, savedAt: now, meta };
  const write: nkruntime.StorageWriteRequest = {
    collection: SAVE_COLLECTION, key: SAVE_KEY, userId,
    value: value as unknown as { [k: string]: unknown },
    permissionRead: 1, permissionWrite: 0,
  };
  if (cur) write.version = cur.version;
  else if (req.version === null) write.version = '*'; // pierwszy zapis: tylko jeśli na serwerze nic nie ma
  let version: string;
  try {
    version = nk.storageWrite([write])[0].version;
  } catch (_e) {
    return conflict(readSave(nk, userId), now);
  }
  submitBoards(nk, logger, userId, ctx.username ?? '', s, power);
  updateArenaHero(nk, logger, userId, ctx.username ?? '', s, ver.eq, power);
  return JSON.stringify({ version, power, unverified: ver.bad, name: s.name, newName: nick.fresh, serverTime: now });
}

/**
 * Ziarna wytopu od numeru `from`. Serwer wydaje je najwyżej SEEDS_AHEAD naprzód od ostatniego zapisu,
 * więc nie da się poznać wyników wielu przyszłych wytopów.
 */
export function rpcSeeds(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const from = Math.floor(Number(req.from));
  const n = Math.max(0, Math.min(SEEDS_AHEAD, Math.floor(Number(req.n)) || 0));
  if (!Number.isFinite(from) || from < 0) throw err('Zły numer wytopu.', INVALID);
  const cur = readSave(nk, userId);
  const base = cur ? cur.value.state.sx || 0 : 0;
  const to = Math.min(from + n, base + SEEDS_AHEAD);
  const secret = smeltSecret(nk, userId);
  const seeds: number[] = [];
  for (let i = from; i < to; i++) seeds.push(seedOf(nk, secret, i));
  return JSON.stringify({ from, seeds, serverTime: Date.now() });
}

/** Czas serwera — gra liczy od niego dzienne resety. */
export function rpcTime(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, _payload: string): string {
  return JSON.stringify({ serverTime: Date.now() });
}
