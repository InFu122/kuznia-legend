// Powiadomienia (toasty). Nie zasłaniają liczników u góry (złoto, klejnoty, muzyka, Moc) — pojawiają się pod paskiem.
// Przy otwartym oknie (np. decyzja o wykutym przedmiocie) powiadomienia „z tła” (boss pokonany, bohater padł, rzadka
// ruda) czekają i pokazują się po zamknięciu okna; od razu widać tylko te, które są skutkiem dotknięcia w oknie.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';

interface Toast { id: number; msg: string; kind?: 'good' | 'bad'; n: number }
interface Held { msg: string; kind?: 'good' | 'bad'; at: number }

/** Powiadomienie w tym czasie po dotknięciu (ms) to skutek dotknięcia — pokazujemy je od razu, także nad oknem. */
const ACTION_MS = 700;
/** Odłożone powiadomienie starsze niż tyle (ms) po zamknięciu okna już nie ma sensu. */
const STALE_MS = 20_000;
const SHOW_MS = 3200;

export function Toasts({ game, modal }: { game: Game; modal: boolean }) {
  const [list, setList] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const lastInput = useRef(0);
  const held = useRef<Held[]>([]);
  const modalRef = useRef(modal);
  modalRef.current = modal;

  const show = (msg: string, kind?: 'good' | 'bad') => {
    const id = ++nextId.current;
    // Ten sam komunikat (np. w szybkim tempie testowym) nie zasypuje ekranu — licznik ×N zamiast kopii.
    setList(l => {
      const same = l.find(t => t.msg === msg);
      const n = same ? same.n + 1 : 1;
      return [{ id, msg, kind, n }, ...l.filter(t => t !== same)].slice(0, 3);
    });
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), SHOW_MS);
  };

  useEffect(() => {
    const mark = () => { lastInput.current = performance.now(); };
    document.addEventListener('pointerdown', mark, true);
    document.addEventListener('keydown', mark, true);
    const off = game.on(e => {
      if (e.t !== 'toast') return;
      const action = performance.now() - lastInput.current < ACTION_MS;
      if (modalRef.current && !action) {
        held.current = [...held.current.filter(h => h.msg !== e.msg), { msg: e.msg, kind: e.kind, at: Date.now() }].slice(-3);
        return;
      }
      show(e.msg, e.kind);
    });
    return () => { off(); document.removeEventListener('pointerdown', mark, true); document.removeEventListener('keydown', mark, true); };
  }, [game]);

  // Okno zamknięte: odłożone powiadomienia (świeże) wychodzą teraz.
  useEffect(() => {
    if (modal || !held.current.length) return;
    const now = Date.now();
    const out = held.current.filter(h => now - h.at < STALE_MS);
    held.current = [];
    for (const h of out) show(h.msg, h.kind);
  }, [modal]);

  return (
    <div class={`toasts${modal ? ' over-modal' : ''}`} aria-live="polite">
      {list.map(t => <div key={t.id} class={`toast${t.kind ? ' ' + t.kind : ''}`}>{t.msg}{t.n > 1 && <b class="toast-n"> ×{t.n}</b>}</div>)}
    </div>
  );
}
