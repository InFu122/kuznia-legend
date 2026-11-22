import { describe, expect, it } from 'vitest';
import type { ModalData, OfflineReport } from '../src/engine/types';
import { queueModal } from '../src/ui/modalQueue';

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
  it('inne okna dokłada na koniec', () => {
    const q: ModalData[] = [{ kind: 'changelog' }];
    queueModal(q, { kind: 'decide' });
    queueModal(q, { kind: 'decide' });
    expect(q.map(m => m.kind)).toEqual(['changelog', 'decide', 'decide']);
  });
});
