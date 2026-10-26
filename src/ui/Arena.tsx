import { useEffect, useRef, useState } from 'preact/hooks';
import { LANDS, ORES, ROMAN } from '../data';
import { bossWaiting } from '../engine/combat';
import type { Game } from '../engine/game';
import { fmt } from './format';
import type { Tab } from './icons';

interface Float { id: number; text: string; cls: string; x: number; y: number }

export function Arena({ game, onTab }: { game: Game; onTab: (t: Tab) => void }) {
  const [, setFrame] = useState(0);
  const [floats, setFloats] = useState<Float[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const lastFloat = useRef(0);
  const nextId = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => { setFrame(f => (f + 1) % 1e6); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const off = game.on(e => {
      if (e.t === 'bump') {
        const el = e.who === 'hero' ? heroRef.current : foeRef.current;
        if (!el) return;
        el.classList.remove(e.cls);
        void el.offsetWidth;
        el.classList.add(e.cls);
        setTimeout(() => el.classList.remove(e.cls), 130);
      } else if (e.t === 'float') {
        const now = performance.now();
        if (!e.force && now - lastFloat.current < 110) return;
        lastFloat.current = now;
        const id = ++nextId.current;
        const f = { id, text: e.text, cls: e.cls, x: e.side === 'hero' ? 10 + Math.random() * 16 : 62 + Math.random() * 14, y: 38 + Math.random() * 14 };
        setFloats(fs => (fs.length > 14 ? fs : [...fs, f]));
        setTimeout(() => setFloats(fs => fs.filter(x => x.id !== id)), 900);
      }
    });
    return () => { cancelAnimationFrame(raf); off(); };
  }, [game]);

  const { s, b } = game;
  const L = LANDS[s.cur.land];
  const e = b.enemy;
  const dung = b.mode === 'dung' && b.dung;
  const waiting = bossWaiting(game.ctx);
  const st = game.stats;
  const hp = Math.max(0, b.heroHp);
  const label = e?.boss ? 'Boss' : dung ? `Piętro ${dung.floor}` : waiting ? 'Farma' : `Fala ${s.cur.wave}/5`;

  return (
    <section class="arena" aria-label="Arena walki">
      <div class="arena-head">
        <div>
          <div class="land">{dung ? 'Głęboka Sztolnia' : L.n}</div>
          <div class="ameta">{dung ? `Piętro ${dung.floor} · w worku ${dung.loot} × ${ORES[dung.tier].n}` : `Akt ${ROMAN[L.act]} · etap ${s.cur.stage}/10${waiting ? ' · boss czeka' : ''}`}</div>
        </div>
        <button class="ghost" onClick={() => onTab('krainy')}>Zmień krainę</button>
      </div>
      {!dung && (
        <div class="track">
          {Array.from({ length: 10 }, (_, i) => {
            const n = i + 1;
            return <i key={n} class={[n === 10 ? 'boss' : '', n < s.cur.stage ? 'done' : '', n === s.cur.stage ? 'now' : ''].join(' ')} />;
          })}
        </div>
      )}
      <div class="fighters">
        <div class="fighter hero">
          <div class="token" ref={heroRef}>{(s.name[0] || 'K').toUpperCase()}</div>
          <div class="fname">{s.name}</div>
          <div class="hp"><i style={{ width: (hp / b.heroMax) * 100 + '%' }} /></div>
          <div class="hpnum">{fmt(hp)} / {fmt(st.hp)}</div>
        </div>
        <div class={`vs${e?.boss ? ' boss' : ''}`}>{label}</div>
        <div class="fighter foe">
          <div class={`token t-${e?.type ?? 'Bestie'}${e?.boss ? ' boss' : ''}`} ref={foeRef}>{(e?.name[0] ?? '?').toUpperCase()}</div>
          <div class="fname">{e ? (e.count > 1 ? `${e.count}× ` : '') + e.name : '…'}</div>
          <div class="hp foe"><i style={{ width: e ? Math.max(0, (e.hp / e.max) * 100) + '%' : '0%' }} /></div>
          <div class="hpnum">{e ? `${fmt(Math.max(0, e.hp))} / ${fmt(e.max)}` : ''}</div>
        </div>
      </div>
      {(waiting && !e?.boss) && (
        <div class="arena-actions"><button class="btn primary" onClick={() => game.challengeBoss()}>Wyzwij bossa: {L.boss}</button></div>
      )}
      {dung && <div class="arena-actions"><span class="sub">Sztolnia: co 5 pięter zdecydujesz, czy wyjść z łupem.</span></div>}
      <div class="floats">
        {floats.map(f => <span key={f.id} class={`fl ${f.cls}`} style={{ left: f.x + '%', top: f.y + '%' }}>{f.text}</span>)}
      </div>
    </section>
  );
}
