import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';

interface Toast { id: number; msg: string; kind?: 'good' | 'bad' }

export function Toasts({ game }: { game: Game }) {
  const [list, setList] = useState<Toast[]>([]);
  const nextId = useRef(0);
  useEffect(() => game.on(e => {
    if (e.t !== 'toast') return;
    const id = ++nextId.current;
    setList(l => [{ id, msg: e.msg, kind: e.kind }, ...l].slice(0, 3));
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3200);
  }), [game]);
  return (
    <div class="toasts" aria-live="polite">
      {list.map(t => <div key={t.id} class={`toast${t.kind ? ' ' + t.kind : ''}`}>{t.msg}</div>)}
    </div>
  );
}
