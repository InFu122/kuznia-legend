import { describe, expect, it, vi } from 'vitest';
import type { ModalData, OfflineReport } from '../src/engine/types';
import { queueModal } from '../src/ui/modalQueue';
import { makeGame } from './helpers';

const rep = (gold: number) => ({ gold } as unknown as OfflineReport);

describe('kolejka okien', () => {
  it('drugi raport „Witaj z powrotem” zastępuje pierwszy w tym samym miejscu', () => {
    const q: ModalData[] = [];
    queueModal(q, { kind: 'offline', report: rep(10) });
    queueModal(q, { kind: 'changelog' });
    queueModal(q, { kind: 'offline', report: rep(99) });
    expect(q.map(m => m.kind)).toEqual(['offline', 'changelog']);
    expect((q[0] as { report: OfflineReport }).report.gold).toBe(99);
  });
  it('tej samej nieobecności po zamknięciu pierwszego raportu nie pokazuje drugi raz', () => {
    const q: ModalData[] = [{ kind: 'missions', tab: 'login' }];
    queueModal(q, { kind: 'offline', report: rep(99), again: true });
    expect(q.map(m => m.kind)).toEqual(['missions']);
    queueModal(q, { kind: 'offline', report: rep(5) }); // nowa przerwa (telefon w kieszeni) — okno jest
    expect(q.map(m => m.kind)).toEqual(['missions', 'offline']);
  });
  it('inne okna dokłada na koniec', () => {
    const q: ModalData[] = [{ kind: 'changelog' }];
    queueModal(q, { kind: 'decide' });
    queueModal(q, { kind: 'decide' });
    expect(q.map(m => m.kind)).toEqual(['changelog', 'decide', 'decide']);
  });
});

describe('raport „Witaj z powrotem” w silniku', () => {
  it('ta sama nieobecność policzona drugi raz (nowszy zapis z serwera) jest oznaczona `again`, nowa przerwa — nie', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
      const { g, s } = makeGame(7);
      s.maxLand = 2; s.cleared = s.cleared.map((_, i) => i < 2);
      const seen: ModalData[] = [];
      g.on(e => { if (e.t === 'modal') seen.push(e.m); });
      g.offline(3 * 3600000); // start gry: 3 h nieobecności
      vi.advanceTimersByTime(4000);
      g.offline(3 * 3600000 + 4000); // nowszy zapis z serwera: ta sama przerwa od nowa
      vi.advanceTimersByTime(10 * 60000);
      g.offline(5 * 60000); // telefon w kieszeni przez 5 min — nowa przerwa
      const off = seen.filter((m): m is Extract<ModalData, { kind: 'offline' }> => m.kind === 'offline');
      expect(off.map(m => !!m.again)).toEqual([false, true, false]);
    } finally {
      vi.useRealTimers();
    }
  });
});
