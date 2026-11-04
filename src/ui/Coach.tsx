// Samouczek „pokaż palcem”: przyciemnia ekran wokół przycisku, który trzeba nacisnąć, a animowana dłoń
// stuka w niego. Dymek obok mówi, co zrobić. Przy krokach „popatrz” (np. postęp kampanii) — tylko obwódka.
// Nakładka nie blokuje dotyku: gracz naciska prawdziwy przycisk pod spodem.
import { useEffect, useRef, useState } from 'preact/hooks';

export interface CoachMark {
  /** Selektory celu, od najlepszego (pierwszy widoczny wygrywa). */
  target: string | string[];
  title: string;
  text: string;
  /** `tap` — dłoń i przyciemnienie; `look` — sama obwódka (czekanie, postęp). */
  act?: 'tap' | 'look';
  /** Przycisk w dymku (np. „Rozumiem”) — bez niego dymek ma tylko „Ukryj”. */
  ok?: string;
}

const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};

/** Pierwszy widoczny element pasujący do któregoś selektora. */
export function findTarget(target: string | string[]): HTMLElement | null {
  for (const sel of Array.isArray(target) ? target : [target]) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) if (visible(el)) return el;
  }
  return null;
}

interface Box { x: number; y: number; w: number; h: number; off: boolean; fixed: boolean }

export function Coach({ mark, onHide, onTap }: { mark: CoachMark; onHide: () => void; onTap?: () => void }) {
  const [box, setBox] = useState<Box | null>(null);
  const scrolled = useRef('');
  const key = Array.isArray(mark.target) ? mark.target.join('|') : mark.target;
  useEffect(() => {
    let raf = 0, last = 0;
    const loop = (t: number) => {
      if (t - last > 100) {
        last = t;
        const el = findTarget(mark.target);
        if (!el) setBox(b => (b ? null : b));
        else {
          if (scrolled.current !== key) {
            scrolled.current = key;
            const r0 = el.getBoundingClientRect();
            if (r0.top < 70 || r0.bottom > innerHeight - 90) el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          }
          const r = el.getBoundingClientRect();
          const off = (el as HTMLButtonElement).disabled === true;
          // Pasek zakładek na dole jest zawsze widoczny (nie przewija się).
          const fixed = !!el.closest('.tabs');
          setBox(b => (b && Math.abs(b.x - r.left) < 1 && Math.abs(b.y - r.top) < 1 && Math.abs(b.w - r.width) < 1 && Math.abs(b.h - r.height) < 1 && b.off === off && b.fixed === fixed ? b : { x: r.left, y: r.top, w: r.width, h: r.height, off, fixed }));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Dotknięcie wskazanego przycisku kończy wskazówkę (np. ogłoszenie nowej funkcji).
    const tap = (e: Event) => {
      const el = findTarget(mark.target);
      if (el && e.target instanceof Node && el.contains(e.target)) onTap?.();
    };
    document.addEventListener('click', tap, true);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('click', tap, true); };
  }, [key]);

  if (!box) return null;
  // Cel poza ekranem (gracz przewinął): bez przyciemnienia, tylko przycisk ze strzałką, który do niego przewija.
  // (element pod paskiem zakładek też jest niewidoczny)
  if (!box.fixed && (box.y + box.h < 8 || box.y > innerHeight - 80)) {
    const up = box.y + box.h < 8;
    return (
      <div class="coach">
        <button class={`coach-pill ${up ? 'up' : 'down'}`} onClick={() => findTarget(mark.target)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })}>
          <span aria-hidden="true">{up ? '↑' : '↓'}</span>{mark.title}
        </button>
      </div>
    );
  }
  const tapIt = (mark.act ?? 'tap') === 'tap' && !box.off;
  const pad = 6;
  const vw = innerWidth, vh = innerHeight;
  const below = box.y + box.h / 2 < vh * 0.45;
  const bw = Math.min(320, vw - 24);
  const bx = Math.max(12, Math.min(vw - bw - 12, box.x + box.w / 2 - bw / 2));
  const bubble = below ? { top: Math.min(vh - 140, box.y + box.h + pad + (tapIt ? 54 : 14)) } : { bottom: Math.max(10, vh - box.y + pad + 14) };
  return (
    <div class={`coach${tapIt ? ' dim' : ''}`} aria-live="polite">
      <div class={`coach-spot${tapIt ? '' : ' look'}`} style={{ left: box.x - pad + 'px', top: box.y - pad + 'px', width: box.w + pad * 2 + 'px', height: box.h + pad * 2 + 'px' }} />
      {tapIt && (
        <div class={`coach-hand${box.y + box.h / 2 > innerHeight * 0.78 ? ' flip' : ''}`} style={{ left: box.x + box.w / 2 + 'px', top: box.y + box.h / 2 + 'px' }} aria-hidden="true">
          <i class="coach-ripple" />
          <svg viewBox="0 0 40 48" width="40" height="48">
            <path d="M14 4a4 4 0 0 1 8 0v15l2-1a4 4 0 0 1 5 2l1-.5a4 4 0 0 1 5 2.5l.5-.2a4 4 0 0 1 4.5 3.5V36c0 6-5 10-11 10h-6c-4 0-7-2-9-5L4 31a4 4 0 0 1 6-5l4 4z"
              fill="#fff4e0" stroke="#2a1a0e" stroke-width="2.4" stroke-linejoin="round" />
            <path d="M22 19v8M29 21v6M35 24v4" stroke="#2a1a0e" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      )}
      <div class="coach-bubble" style={{ left: bx + 'px', width: bw + 'px', ...Object.fromEntries(Object.entries(bubble).map(([k, v]) => [k, v + 'px'])) }}>
        <b>{mark.title}</b>
        <p>{mark.text}</p>
        <div class="coach-btns">
          {mark.ok ? <button class="btn small primary" onClick={onHide}>{mark.ok}</button> : <button class="linkbtn" onClick={onHide}>Ukryj podpowiedź</button>}
        </div>
      </div>
    </div>
  );
}
