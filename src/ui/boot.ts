// Ekran ładowania (znaczniki w index.html): pasek postępu i podpis kolejnych kroków startu gry.
const START = performance.now();
/** Najkrócej tyle widać ekran ładowania — żeby nie mignął. */
const MIN_MS = 900;
let finished = false;

/** Krok startu: `p` — postęp w % (rośnie tylko do przodu), `text` — podpis pod paskiem. */
export function bootStep(p: number, text?: string): void {
  if (finished) return;
  const fill = document.getElementById('boot-fill');
  if (fill) {
    fill.style.animation = 'none';
    const cur = parseFloat(fill.style.width) || 0;
    fill.style.width = Math.max(cur, Math.min(100, p)) + '%';
  }
  const t = document.getElementById('boot-txt');
  if (t && text) t.textContent = text;
}

/** Koniec startu: pasek do pełna, ekran gaśnie i znika. Można wołać wiele razy. */
export function bootDone(): void {
  if (finished) return;
  bootStep(100, 'Gotowe!');
  finished = true;
  const el = document.getElementById('boot');
  if (!el) return;
  const wait = Math.max(250, MIN_MS - (performance.now() - START));
  setTimeout(() => {
    el.classList.add('done');
    setTimeout(() => el.remove(), 500);
  }, wait);
}
