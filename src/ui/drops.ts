// Animacja dropu rudy: kamień wyskakuje z wroga, podskakuje i leci do zakładki Kuźnia.
import { ORES } from '../data';
import { oreUrl } from '../art/render';

const MAX_FLYING = 8;
let flying = 0;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function pulse(el: Element): void {
  el.classList.remove('got');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('got');
  setTimeout(() => el.classList.remove('got'), 500);
}

export function flyOre(from: Element | null, ore: number, n: number, rare: boolean): void {
  if (!from || reducedMotion()) return;
  const to = document.querySelector('.tab[data-tab="kuznia"]');
  if (!to) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  if (a.bottom < 0 || a.top > window.innerHeight) { pulse(to); return; } // arena przewinięta poza ekran
  const x0 = a.left + a.width / 2, y0 = a.top + a.height * 0.55;
  const dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 3 - y0;
  for (let i = 0; i < Math.min(3, n) && flying < MAX_FLYING; i++) {
    const g = document.createElement('span');
    g.className = 'ore-fly' + (rare ? ' rare' : '');
    g.style.setProperty('--c', ORES[ore].col);
    g.style.left = x0 + 'px';
    g.style.top = y0 + 'px';
    const src = oreUrl(ore);
    if (src) { const img = document.createElement('img'); img.src = src; img.alt = ''; g.appendChild(img); }
    else g.appendChild(document.createElement('i'));
    document.body.appendChild(g);
    if (typeof g.animate !== 'function') { g.remove(); return; }
    flying++;
    const side = (Math.random() - 0.5) * 70;
    const anim = g.animate([
      { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
      { transform: `translate(calc(-50% + ${side}px), calc(-50% - 52px)) scale(1.3)`, opacity: 1, offset: 0.28 },
      { transform: `translate(calc(-50% + ${side * 1.15}px), calc(-50% - 26px)) scale(1)`, opacity: 1, offset: 0.46 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`, opacity: 0.85 },
    ], { duration: rare ? 1250 : 1000, delay: i * 90, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' });
    const done = () => { flying--; g.remove(); pulse(to); };
    anim.onfinish = done;
    anim.oncancel = done;
  }
}
