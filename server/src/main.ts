// Moduł serwera Nakama dla Kuźni Legend (JavaScript runtime).
// Nakama szuka globalnej funkcji InitModule, a funkcje RPC muszą być globalnymi deklaracjami,
// rejestrowanymi wprost w InitModule — serwer odczytuje ich nazwy z kodu.
import { LANDS } from '../../src/data';
import { allMods } from '../../src/engine/mods';
import { SAVE_VERSION, migrate } from '../../src/engine/state';
import { computeStats, extraOf } from '../../src/engine/stats';
import type { GameState } from '../../src/engine/types';
import { cleanName, validateSave } from './validate';

const SAVE_COLLECTION = 'save';
const SAVE_KEY = 'state';
const MAX_SAVE_BYTES = 200_000;

/** Rankingi: Moc (aktualna), Wieża Wyzwań (tygodniowy), postęp w kampanii. */
const BOARDS = {
  moc: { op: 'set', reset: null as string | null, title: 'Moc' },
  wieza: { op: 'best', reset: '0 0 * * 1', title: 'Wieża Wyzwań (tydzień)' },
  postep: { op: 'best', reset: null as string | null, title: 'Postęp w kampanii' },
} as const;
type BoardId = keyof typeof BOARDS;

function err(message: string, code: nkruntime.Codes): nkruntime.Error {
  return { message, code } as nkruntime.Error;
}
const INVALID = 3 as nkruntime.Codes;          // INVALID_ARGUMENT
const PRECONDITION = 9 as nkruntime.Codes;     // FAILED_PRECONDITION
const UNAUTH = 16 as nkruntime.Codes;          // UNAUTHENTICATED

function userOf(ctx: nkruntime.Context): string {
  if (!ctx.userId) throw err('Wymagane logowanie.', UNAUTH);
  return ctx.userId;
}

function parse(payload: string): Record<string, unknown> {
  if (!payload) return {};
  try {
    const v = JSON.parse(payload);
    return v && typeof v === 'object' ? v : {};
  } catch {
    throw err('Niepoprawny JSON.', INVALID);
  }
}

function readSave(nk: nkruntime.Nakama, userId: string): nkruntime.StorageObject | null {
  const objs = nk.storageRead([{ collection: SAVE_COLLECTION, key: SAVE_KEY, userId }]);
  return objs.length ? objs[0] : null;
}

/** Moc liczona przez serwer z tego samego silnika co w grze — do rankingu. */
function powerOf(s: GameState): number {
  return computeStats(s.eq, allMods(s), extraOf(s)).power;
}

function submitBoards(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, username: string, s: GameState, power: number): void {
  const meta = { name: cleanName(s.name), land: LANDS[s.maxLand].n, forge: s.forge.lvl };
  const scores: Record<BoardId, [number, number]> = {
    moc: [power, s.forge.lvl],
    wieza: [s.dungeons.wieza.best, power],
    postep: [s.bestG, s.forge.lvl],
  };
  for (const id of Object.keys(BOARDS) as BoardId[]) {
    const [score, sub] = scores[id];
    if (score <= 0) continue;
    try {
      nk.leaderboardRecordWrite(id, userId, username, Math.floor(score), Math.floor(sub), meta);
    } catch (e) {
      logger.warn('Ranking %s: nie zapisano wyniku: %s', id, String(e));
    }
  }
}

/* ---------- RPC ---------- */

/** Zwraca zapis gracza i czas serwera. */
function rpcSaveGet(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const obj = readSave(nk, userId);
  return JSON.stringify({
    state: obj ? obj.value.state : null,
    version: obj ? obj.version : null,
    serverTime: Date.now(),
  });
}

/**
 * Zapisuje stan gry. `version` to wersja ostatnio wczytanego zapisu — jeśli na serwerze jest nowsza
 * (np. z drugiego urządzenia), serwer zwraca konflikt razem ze swoim zapisem i klient wybiera nowszy.
 */
function rpcSavePut(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  if (payload.length > MAX_SAVE_BYTES) throw err('Zapis jest za duży.', INVALID);
  const req = parse(payload);
  const raw = req.state as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') throw err('Brak stanu gry.', INVALID);
  if (typeof raw.v === 'number' && raw.v > SAVE_VERSION) throw err('Zapis z nowszej wersji gry — zaktualizuj serwer.', PRECONDITION);
  const now = Date.now();
  const s = migrate(raw, now);
  s.name = cleanName(s.name);
  const problems = validateSave(s);
  if (problems.length) {
    logger.warn('Odrzucony zapis gracza %s: %s', userId, problems.slice(0, 5).join('; '));
    throw err('Zapis odrzucony: ' + problems.slice(0, 3).join('; '), INVALID);
  }
  const power = powerOf(s);
  const write: nkruntime.StorageWriteRequest = {
    collection: SAVE_COLLECTION, key: SAVE_KEY, userId,
    value: { state: s, power, savedAt: now },
    permissionRead: 1, permissionWrite: 0,
  };
  if (typeof req.version === 'string' && req.version) write.version = req.version;
  else if (req.version === null) write.version = '*'; // pierwszy zapis: tylko jeśli na serwerze nic nie ma
  let version: string;
  try {
    version = nk.storageWrite([write])[0].version;
  } catch (_e) {
    const cur = readSave(nk, userId);
    return JSON.stringify({ conflict: true, state: cur ? cur.value.state : null, version: cur ? cur.version : null, serverTime: now });
  }
  const account = nk.accountGetId(userId);
  if (account.user.displayName !== s.name) nk.accountUpdateId(userId, null, s.name);
  submitBoards(nk, logger, userId, ctx.username ?? '', s, power);
  return JSON.stringify({ version, power, serverTime: now });
}

/** Czas serwera — gra liczy od niego dzienne resety. */
function rpcTime(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, _payload: string): string {
  return JSON.stringify({ serverTime: Date.now() });
}

/** Ranking: najlepsi gracze i miejsce pytającego. */
function rpcRanking(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const id = (typeof req.board === 'string' && req.board in BOARDS ? req.board : 'moc') as BoardId;
  const limit = Math.max(1, Math.min(50, Number(req.limit) || 20));
  const top = nk.leaderboardRecordsList(id, [], limit);
  const mine = nk.leaderboardRecordsList(id, [userId], 1);
  const row = (r: nkruntime.LeaderboardRecord) => ({
    rank: r.rank, name: (r.metadata && r.metadata.name) || r.username, score: r.score, sub: r.subscore,
    land: r.metadata ? r.metadata.land : '', me: r.ownerId === userId,
  });
  const own = mine.ownerRecords && mine.ownerRecords.length ? mine.ownerRecords[0] : null;
  return JSON.stringify({
    board: id, title: BOARDS[id].title,
    records: (top.records || []).map(row),
    mine: own ? row(own) : null,
  });
}

/* ---------- start ---------- */

function InitModule(_ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer): void {
  for (const id of Object.keys(BOARDS) as BoardId[]) {
    const b = BOARDS[id];
    try {
      nk.leaderboardCreate(id, true, 'descending' as nkruntime.SortOrder, b.op as nkruntime.Operator, b.reset, { title: b.title }, true);
    } catch (e) {
      logger.warn('Ranking %s już istnieje albo nie powstał: %s', id, String(e));
    }
  }
  initializer.registerRpc('save_get', rpcSaveGet);
  initializer.registerRpc('save_put', rpcSavePut);
  initializer.registerRpc('time', rpcTime);
  initializer.registerRpc('ranking', rpcRanking);
  logger.info('Kuźnia Legend: moduł serwera gotowy (zapis v%d)', SAVE_VERSION);
}

// Odwołanie, żeby bundler nie usunął nieeksportowanej funkcji startowej.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
!InitModule && InitModule.bind(null);
