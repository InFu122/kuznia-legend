// Efekty wizualne interfejsu wspólne dla kilku ekranów.

/** Iskry spod młota w kolorze rzadkości wykutego przedmiotu — im rzadszy, tym więcej i dalej. */
export function sparks(box: HTMLElement | null, r = 0) {
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const n = 12 + r * 5;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = `spark r${r}`;
    if (r >= 6) s.style.setProperty('--h', String(Math.floor(Math.random() * 360)));
    const a = -Math.PI * Math.random();
    const d = 40 + Math.random() * (70 + r * 18);
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    box.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
}
