// Kolejka okien: każde zdarzenie „modal” z gry trafia na koniec kolejki — z jednym wyjątkiem.
import type { ModalData } from '../engine/types';

/**
 * Dodaje okno do kolejki. Raport „Witaj z powrotem” jest jeden: gdy gra policzy nieobecność od nowa
 * (np. przy starcie przyszedł nowszy zapis z serwera i zastąpił ten z telefonu), nowy raport zastępuje
 * poprzedni w tym samym miejscu kolejki — stary dotyczył zapisu, którego już nie ma. Gdy gracz zdążył już
 * zamknąć pierwszy raport (np. wolne połączenie z serwerem), tej samej nieobecności nie pokazujemy drugi raz.
 */
export function queueModal(q: ModalData[], m: ModalData): void {
  if (m.kind === 'offline') {
    const i = q.findIndex(x => x.kind === 'offline');
    if (i >= 0) { q[i] = m; return; }
    if (m.again) return;
  }
  q.push(m);
}
