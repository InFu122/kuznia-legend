/// <reference path="../server/types/nakama-runtime.d.ts" />
// Wygasanie czatu: gra pokazuje tylko świeże wiadomości, a serwer raz na dobę usuwa stare z bazy.
import { describe, expect, it } from 'vitest';
import { CHAT_KEEP_MS, freshMsgs, type ChatMsg } from '../src/save/chat';
import { CHAT_KEEP_DAYS, chatJanitor } from '../server/src/chat';

const H = 3600000;
const msg = (id: string, ageH: number, now: number): ChatMsg => ({ id, ch: 'global', uid: 'u', n: 'X', t: 'hej', k: 'msg', time: now - ageH * H, mine: false });

describe('Wygasanie wiadomości czatu', () => {
  it('globalny: doba, klan: 3 dni', () => {
    const now = Date.parse('2026-11-25T12:00:00Z');
    const list = [msg('a', 80, now), msg('b', 30, now), msg('c', 23, now), msg('d', 0, now)];
    expect(freshMsgs('global', list, now).map(m => m.id)).toEqual(['c', 'd']);
    expect(freshMsgs('clan', list, now).map(m => m.id)).toEqual(['b', 'c', 'd']);
    expect(CHAT_KEEP_MS.clan).toBe(72 * H);
  });

  it('serwer sprząta bazę najwyżej raz na dobę', () => {
    const store = new Map<string, { value: unknown; version: string }>();
    let ver = 0;
    const sql: string[] = [];
    const nk = {
      storageRead: (r: { collection: string; key: string }[]) => r.flatMap(x => {
        const o = store.get(x.collection + x.key);
        return o ? [{ ...x, value: o.value, version: o.version }] : [];
      }),
      storageWrite: (w: { collection: string; key: string; value: unknown; version?: string }[]) => w.map(x => {
        const cur = store.get(x.collection + x.key);
        if (x.version === '*' ? cur : cur?.version !== x.version) throw new Error('version');
        const v = String(++ver);
        store.set(x.collection + x.key, { value: x.value, version: v });
        return { version: v };
      }),
      sqlExec: (q: string) => { sql.push(q); return { rowsAffected: 0 }; },
    } as unknown as nkruntime.Nakama;
    const log = { warn: () => {} } as unknown as nkruntime.Logger;
    const t0 = Date.parse('2026-11-25T12:00:00Z');
    expect(chatJanitor(nk, log, t0)).toBe(true);
    expect(chatJanitor(nk, log, t0 + 5 * H)).toBe(false);
    expect(chatJanitor(nk, log, t0 + 25 * H)).toBe(true);
    expect(sql).toHaveLength(2);
    expect(sql[0]).toContain('DELETE FROM message');
    expect(sql[0]).toContain(`${CHAT_KEEP_DAYS} days`);
  });
});
