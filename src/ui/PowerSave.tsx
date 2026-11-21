// Tryb oszczędzania: po minucie bez dotyku przyciemniona warstwa na całą grę (gra działa i widać ją pod spodem).
// Dotknięcie albo „wstecz” przywraca jasność; to dotknięcie nie trafia w przyciski pod spodem.
import { useEffect, useRef, useState } from 'preact/hooks';
import { resUrl } from '../art/render';
import { onBack } from './back';
import { Px } from './Px';
import { DIM_AFTER_MS, Idle, backlight, keepAwake, setIdle } from './powersave';
import { isNative } from './pwa';

/** Miejsca napisu — przesuwa się co pół minuty, żeby nie wypalał się na ekranach OLED. */
const SPOTS = ['50%', '38%', '62%', '44%', '56%'];

export function PowerSave({ awake, dim }: { awake: boolean; dim: boolean }) {
  const [dimmed, setDimmed] = useState(false);
  const [spot, setSpot] = useState(0);
  const idle = useRef<Idle | null>(null);

  useEffect(() => { void keepAwake(awake); }, [awake]);

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

  useEffect(() => {
    void backlight(dimmed);
    if (!dimmed) return;
    const wake = () => { setDimmed(false); idle.current?.poke(); };
    const key = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); wake(); };
    const off = onBack(() => { wake(); return true; });
    const move = setInterval(() => setSpot(n => (n + 1) % SPOTS.length), 30_000);
    document.addEventListener('keydown', key, true);
    return () => { off(); clearInterval(move); document.removeEventListener('keydown', key, true); };
  }, [dimmed]);

  useEffect(() => () => { void backlight(false); }, []);

  if (!dimmed) return null;
  return (
    <button class={`powersave${isNative() ? ' bl' : ''}`} aria-label="Tryb oszczędzania. Dotknij, aby wrócić do gry"
      onClick={e => { e.preventDefault(); e.stopPropagation(); setDimmed(false); idle.current?.poke(); }}>
      <span class="ps-in" style={{ top: SPOTS[spot] }}>
        <Px src={resUrl('kowadlo')} size={36} />
        <b>Oszczędzanie baterii</b>
        <small>Gra działa dalej · dotknij, aby wrócić</small>
      </span>
    </button>
  );
}
