// Tryb oszczędzania i blokada ekranu: przyciemniona warstwa na całą grę (gra działa i widać ją pod spodem).
// Oszczędzanie (po minucie bez dotyku): dotknięcie albo „wstecz” przywraca jasność i nie trafia w przyciski pod spodem.
// Blokada (Menu → Zablokuj ekran): dotyk i „wstecz” nic nie robią — odblokowuje tylko przesunięcie suwaka.
import { useEffect, useRef, useState } from 'preact/hooks';
import { resUrl } from '../art/render';
import { onBack } from './back';
import { Px } from './Px';
import { DIM_AFTER_MS, Idle, UNLOCK_AT, backlight, keepAwake, lockScreen, onLock, screenLocked, setIdle } from './powersave';
import { isNative } from './pwa';

/** Miejsca napisu — przesuwa się co pół minuty, żeby nie wypalał się na ekranach OLED. */
const SPOTS = ['50%', '38%', '62%', '44%', '56%'];

const Padlock = ({ open = false }: { open?: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
    <rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor" fill-opacity=".2" />
    <path d={open ? 'M8 10.5V7.5a4 4 0 0 1 7.6-1.7' : 'M8 10.5V7.5a4 4 0 0 1 8 0v3'} />
    <path d="M12 14.5v2.5" />
  </svg>
);

/** Suwak „przesuń, aby odblokować”. */
function Slider({ onUnlock }: { onUnlock: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const start = useRef(0);
  const max = () => { const t = track.current; return t ? t.clientWidth - 56 : 1; };
  const done = x >= max() * UNLOCK_AT;
  return (
    <div class={`ps-slide${drag ? ' drag' : ''}`} ref={track}>
      <span class="ps-hint" style={{ opacity: Math.max(0, 1 - x / Math.max(1, max() * 0.6)) }}>Przesuń, aby odblokować</span>
      <button class="ps-knob" style={{ transform: `translateX(${x}px)` }} aria-label="Odblokuj ekran (przesuń w prawo)"
        onPointerDown={e => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); start.current = e.clientX - x; setDrag(true); }}
        onPointerMove={e => { if (drag) setX(Math.max(0, Math.min(max(), e.clientX - start.current))); }}
        onPointerUp={() => { setDrag(false); if (done) onUnlock(); else setX(0); }}
        onPointerCancel={() => { setDrag(false); setX(0); }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'End') { e.preventDefault(); e.stopPropagation(); onUnlock(); } }}>
        <Padlock open={done} />
      </button>
    </div>
  );
}

export function PowerSave({ awake, dim }: { awake: boolean; dim: boolean }) {
  const [dimmed, setDimmed] = useState(false);
  const [locked, setLocked] = useState(screenLocked());
  const [spot, setSpot] = useState(0);
  const idle = useRef<Idle | null>(null);

  useEffect(() => onLock(() => setLocked(screenLocked())), []);
  // W blokadzie ekran nie gaśnie nawet przy wyłączonym „Ekran nie gaśnie” — po to się ją włącza.
  useEffect(() => { void keepAwake(awake || locked); }, [awake, locked]);

  useEffect(() => {
    if (!awake || !dim) { setDimmed(false); return; }
    const i = new Idle(DIM_AFTER_MS, () => { if (document.visibilityState === 'visible') setDimmed(true); });
    idle.current = i;
    setIdle(i);
    const poke = () => i.poke();
    const vis = () => { if (document.visibilityState === 'visible') { setDimmed(false); i.start(); } else i.stop(); };
    const evs = ['pointerdown', 'keydown', 'wheel'] as const;
    for (const e of evs) document.addEventListener(e, poke, { capture: true, passive: true });
    document.addEventListener('visibilitychange', vis);
    i.start();
    return () => {
      i.stop();
      setIdle(null);
      idle.current = null;
      for (const e of evs) document.removeEventListener(e, poke, true);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [awake, dim]);

  const dark = dimmed || locked;
  useEffect(() => {
    void backlight(dark);
    if (!dark) return;
    const wake = () => { if (screenLocked()) return; setDimmed(false); idle.current?.poke(); };
    // Klawiatura: w oszczędzaniu budzi, w blokadzie nie robi nic (oprócz suwaka, który ma fokus).
    const key = (e: KeyboardEvent) => {
      if (screenLocked() && (e.target as HTMLElement | null)?.classList?.contains('ps-knob')) return;
      e.preventDefault(); e.stopPropagation(); wake();
    };
    const off = onBack(() => { wake(); return true; });
    const move = setInterval(() => setSpot(n => (n + 1) % SPOTS.length), 30_000);
    document.addEventListener('keydown', key, true);
    if (locked) setTimeout(() => document.querySelector<HTMLButtonElement>('.ps-knob')?.focus(), 50);
    return () => { off(); clearInterval(move); document.removeEventListener('keydown', key, true); };
  }, [dark, locked]);

  useEffect(() => () => { void backlight(false); }, []);

  if (!dark) return null;
  const cls = `powersave${isNative() ? ' bl' : ''}${locked ? ' lock' : ''}`;
  const eat = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
  if (locked) {
    return (
      <div class={cls} role="dialog" aria-modal="true" aria-label="Ekran zablokowany" onClick={eat}>
        <div class="ps-in" style={{ top: SPOTS[spot] }}>
          <span class="ps-lock"><Padlock /></span>
          <b>Ekran zablokowany</b>
          <small>Gra działa dalej · dotyk jest wyłączony</small>
          <Slider onUnlock={() => { lockScreen(false); setDimmed(false); idle.current?.poke(); }} />
        </div>
      </div>
    );
  }
  return (
    <button class={cls} aria-label="Tryb oszczędzania. Dotknij, aby wrócić do gry"
      onClick={e => { eat(e); setDimmed(false); idle.current?.poke(); }}>
      <span class="ps-in" style={{ top: SPOTS[spot] }}>
        <Px src={resUrl('kowadlo')} size={36} />
        <b>Oszczędzanie baterii</b>
        <small>Gra działa dalej · dotknij, aby wrócić</small>
      </span>
    </button>
  );
}
