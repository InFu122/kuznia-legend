// Kolejka okien: każde zdarzenie „modal” z gry trafia na koniec kolejki — z jednym wyjątkiem.
import type { ModalData } from '../engine/types';

/**
 * Dodaje okno do kolejki. Raport „Witaj z powrotem” jest jeden: gdy gra policzy nieobecność od nowa
 * (np. przy starcie przyszedł nowszy zapis z serwera i zastąpił ten z telefonu), nowy raport zastępuje
 * poprzedni w tym samym miejscu kolejki — stary dotyczył zapisu, którego już nie ma.
 */
export function queueModal(q: ModalData[], m: ModalData): void {
  const i = m.kind === 'offline' ? q.findIndex(x => x.kind === 'offline') : -1;
  if (i >= 0) q[i] = m;
  else q.push(m);
}
