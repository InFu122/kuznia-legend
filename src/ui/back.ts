// Przycisk „wstecz” (Android, aplikacja i zainstalowana gra): najpierw zamyka najwyższe okno, potem wraca do Kuźni,
// a wyjście z gry wymaga dwóch naciśnięć pod rząd. Okna rejestrują się tu, gdy się otwierają (ModalShell).
type Handler = () => boolean;
const stack: Handler[] = [];

/** Dodaje obsługę „wstecz” (najnowsza ma pierwszeństwo). Zwraca funkcję, która ją usuwa. */
export function onBack(h: Handler): () => void {
  stack.push(h);
  return () => { const i = stack.lastIndexOf(h); if (i >= 0) stack.splice(i, 1); };
}

/** Wywołuje obsługę od najnowszej; true — „wstecz” zostało obsłużone (np. zamknięte okno). */
export function runBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i]()) return true;
  return false;
}

/** Ile czasu na drugie naciśnięcie, które zamyka grę. */
export const EXIT_WINDOW_MS = 2000;
