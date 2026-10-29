// Rankingi: Moc (aktualna), Wieża Wyzwań (tygodniowy), postęp w kampanii i ocena na arenie.
import { LANDS } from '../../src/data';
import type { GameState } from '../../src/engine/types';
import { parse, userOf } from './common';
import { frameOr, skinOr } from '../../src/engine/cosmetics';
import { readHeroes } from './arena';
import { cleanName } from './validate';

export const BOARDS = {
  moc: { op: 'set', reset: null as string | null, title: 'Moc' },
  wieza: { op: 'best', reset: '0 0 * * 1', title: 'Wieża Wyzwań (tydzień)' },
  postep: { op: 'best', reset: null as string | null, title: 'Postęp w kampanii' },
  arena: { op: 'set', reset: null as string | null, title: 'Arena' },
} as const;
export type BoardId = keyof typeof BOARDS;

export function createBoards(nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
  for (const id of Object.keys(BOARDS) as BoardId[]) {
    const b = BOARDS[id];
    try {
      nk.leaderboardCreate(id, true, 'descending' as nkruntime.SortOrder, b.op as nkruntime.Operator, b.reset, { title: b.title }, true);
    } catch (e) {
      logger.warn('Ranking %s już istnieje albo nie powstał: %s', id, String(e));
    }
  }
}

export const boardMeta = (s: GameState, power: number) => ({ name: cleanName(s.name), land: LANDS[s.maxLand].n, forge: s.forge.lvl, power });

/** Wyniki liczone z zapisu (arena zmienia się tylko po walkach). */
export function submitBoards(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, username: string, s: GameState, power: number): void {
  const meta = boardMeta(s, power);
  const scores: Record<'moc' | 'wieza' | 'postep', [number, number]> = {
    moc: [power, s.forge.lvl],
    wieza: [s.dungeons.wieza.best, power],
    postep: [s.bestG, s.forge.lvl],
  };
  for (const id of Object.keys(scores) as (keyof typeof scores)[]) {
    const [score, sub] = scores[id];
    if (score <= 0) continue;
    try {
      nk.leaderboardRecordWrite(id, userId, username, Math.floor(score), Math.floor(sub), meta);
    } catch (e) {
      logger.warn('Ranking %s: nie zapisano wyniku: %s', id, String(e));
    }
  }
}

/** Wynik gracza w rankingu albo null. */
export function ownRecord(nk: nkruntime.Nakama, board: BoardId, userId: string): nkruntime.LeaderboardRecord | null {
  const r = nk.leaderboardRecordsList(board, [userId], 1);
  return r.ownerRecords && r.ownerRecords.length ? r.ownerRecords[0] : null;
}

/** Ranking: najlepsi gracze i miejsce pytającego. */
export function rpcRanking(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const id = (typeof req.board === 'string' && req.board in BOARDS ? req.board : 'moc') as BoardId;
  const limit = Math.max(1, Math.min(50, Number(req.limit) || 20));
  const top = nk.leaderboardRecordsList(id, [], limit);
  const own = ownRecord(nk, id, userId);
  // Strój i ramka z bohatera areny (zapisywany przy każdym zapisie gry) — metadanych rankingu Nakama nie zmienia bez zmiany wyniku.
  const heroes = readHeroes(nk, [...new Set([...(top.records || []).map(r => r.ownerId), userId])]);
  const row = (r: nkruntime.LeaderboardRecord) => ({
    id: r.ownerId, rank: r.rank, name: (r.metadata && r.metadata.name) || r.username, score: r.score, sub: r.subscore,
    land: r.metadata ? r.metadata.land : '', me: r.ownerId === userId,
    sk: skinOr(heroes[r.ownerId]?.sk), fr: frameOr(heroes[r.ownerId]?.fr),
  });
  return JSON.stringify({
    board: id, title: BOARDS[id].title,
    records: (top.records || []).map(row),
    mine: own ? row(own) : null,
  });
}
