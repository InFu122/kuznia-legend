import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';

interface Toast { id: number; msg: string; kind?: 'good' | 'bad'; n: number }

export function Toasts({ game }: { game: Game }) {
  const [list, setList] = useState<Toast[]>([]);
  const nextId = useRef(0);
  useEffect(() => game.on(e => {
    if (e.t !== 'toast') return;
    const id = ++nextId.current;
    // Ten sam komunikat (np. w szybkim tempie testowym) nie zasypuje ekranu — licznik ×N zamiast kopii.
    setList(l => {
      const same = l.find(t => t.msg === e.msg);
      const n = same ? same.n + 1 : 1;
      return [{ id, msg: e.msg, kind: e.kind, n }, ...l.filter(t => t !== same)].slice(0, 3);
    });
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3200);
  }), [game]);
  return (
    <div class="toasts" aria-live="polite">
      {list.map(t => <div key={t.id} class={`toast${t.kind ? ' ' + t.kind : ''}`}>{t.msg}{t.n > 1 && <b class="toast-n"> ×{t.n}</b>}</div>)}
    </div>
  );
}
