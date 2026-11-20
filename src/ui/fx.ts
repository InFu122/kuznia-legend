// Efekty wizualne interfejsu wspólne dla kilku ekranów.
import { R, rTier } from '../data';

/** Iskry spod młota w kolorze rzadkości wykutego przedmiotu — im rzadszy, tym więcej i dalej. */
export function sparks(box: HTMLElement | null, r = 0) {
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t = rTier(r);
  const n = 12 + t * 5;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = `spark r${r}`;
    if (r === R.BOSKI) s.style.setProperty('--h', String(Math.floor(Math.random() * 360)));
    const a = -Math.PI * Math.random();
    const d = 40 + Math.random() * (70 + t * 18);
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    box.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
}

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const visibleRect = (el: Element | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Cel musi być cały na ekranie — lot do licznika schowanego nad krawędzią wygląda jak rozsypane monety.
  return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight ? r : null;
};

/**
 * Obrazek leci łukiem z `from` do `to` (prostokąty ekranu) i znika. Zwraca obietnicę końca lotu.
 * `size` — rozmiar na starcie, na końcu kurczy się do rozmiaru celu.
 */
export function flyImg(src: string, from: DOMRect, to: DOMRect, size: number, ms = 650, delay = 0): Promise<void> {
  if (calm() || typeof document === 'undefined') return Promise.resolve();
  const img = document.createElement('img');
  img.src = src;
  img.className = 'px fly-img';
  img.width = size; img.height = size;
  img.style.left = from.left + from.width / 2 - size / 2 + 'px';
  img.style.top = from.top + from.height / 2 - size / 2 + 'px';
  document.body.appendChild(img);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const end = Math.max(0.25, Math.min(1, to.width / size));
  // Łuk: w połowie drogi wyżej niż prosta (jak rzucony przedmiot).
  const lift = Math.min(160, 60 + Math.abs(dx) * 0.3);
  const anim = img.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(${(1 + end) / 2})`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: 0.9 },
  ], { duration: ms, delay, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'both' });
  return anim.finished.then(() => img.remove(), () => img.remove());
}

/** Krótki błysk elementu (np. miejsca w ekwipunku, licznika w nagłówku). */
export function flash(el: Element | null, cls = 'fx-flash', ms = 700) {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth; // restart animacji
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/** Dymek „▲ +53” nad licznikiem w nagłówku. */
export function chipPop(chip: Element | null, text: string, kind: 'up' | 'gold' = 'up') {
  if (!chip || calm()) return;
  const b = document.createElement('span');
  b.className = `chip-pop ${kind}`;
  b.textContent = text;
  chip.appendChild(b);
  setTimeout(() => b.remove(), 1300);
}

/**
 * Po „Załóż”: przedmiot leci z okna na swoje miejsce na pasku ekwipunku w arenie (gdy go widać),
 * miejsce błyska, a licznik Mocy podskakuje z dymkiem przyrostu.
 */
export function flyToSlot(icon: Element | null, src: string, slotIdx: number, delta: string) {
  const from = visibleRect(icon);
  const slot = document.querySelectorAll('.geargrid .gi')[slotIdx] ?? null;
  const chip = document.querySelector('.hud-chip.moc');
  const to = visibleRect(slot) ?? visibleRect(chip);
  const land = () => {
    flash(slot, 'fx-land', 900);
    flash(chip, 'fx-bump', 600);
    chipPop(chip, delta);
  };
  if (!from || !to) { land(); return; }
  void flyImg(src, from, to, from.width, 650).then(land);
}

/** Po „Sprzedaj”: kilka monet leci do licznika złota, który podskakuje. */
export function coinsToGold(btn: Element | null, coin: string, text: string) {
  const from = visibleRect(btn);
  const chip = document.querySelector('.hud-chip.gold');
  const to = visibleRect(chip);
  if (!from || !to) return;
  const n = 6;
  const done = Array.from({ length: n }, (_, i) => {
    const r = new DOMRect(from.left + from.width / 2 - 20 + Math.random() * 40, from.top + from.height / 2 - 8 + Math.random() * 16, 1, 1);
    return flyImg(coin, r, to, 22, 520, i * 55);
  });
  void Promise.all(done).then(() => { flash(chip, 'fx-bump', 600); chipPop(chip, text, 'gold'); });
}
