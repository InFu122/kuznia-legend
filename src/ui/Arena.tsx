import { useEffect, useRef, useState } from 'preact/hooks';
import { LANDS, ROMAN, SKILLS, SLOT_ORDER } from '../data';
import { dungeonBgUrl, itemUrl, landBgUrl, skillUrl } from '../art/render';
import { Px } from './Px';
import { bossWaiting } from '../engine/combat';
import type { Game } from '../engine/game';
import { fmt } from './format';
import type { Tab } from './icons';
import { runHint, runLabel, runMeta, runTitle } from './texts';
import { flyOre } from './drops';

interface Float { id: number; text: string; cls: string; x: number; y: number }

export function Arena({ game, onTab, onInfo }: { game: Game; onTab: (t: Tab) => void; onInfo: (land: number) => void }) {
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
      } else if (e.t === 'drop') {
        flyOre(foeRef.current, e.ore, e.n, e.rare);
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
  const label = dung ? runLabel(dung) : e?.boss ? 'Boss' : waiting ? 'Farma' : `Fala ${s.cur.wave}/5`;

  const bg = dung ? dungeonBgUrl(dung.id) : landBgUrl(s.cur.land);
  return (
    <section class="arena" aria-label="Arena walki" style={{ '--bg': `url(${bg})` } as Record<string, string>}>
      <div class="arena-head">
        <div>
          <div class="land">{dung ? runTitle(dung) : L.n}</div>
          <div class="ameta">{dung ? runMeta(dung) : `Akt ${ROMAN[L.act]} · etap ${s.cur.stage}/10${waiting ? ' · boss czeka' : ''}`}</div>
        </div>
        <div class="arena-btns">
          {!dung && <button class="info" onClick={() => onInfo(s.cur.land)} aria-label={`Co wypada w krainie ${L.n} i z bossa`}>i</button>}
          {dung
            ? <button class="ghost" onClick={() => game.dungExit()}>Wyjdź z lochu</button>
            : <button class="ghost" onClick={() => onTab('krainy')}>Zmień krainę</button>}
        </div>
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
          <div class="hpnum">{fmt(hp)} / {fmt(st.hp)}{b.fx.shield > 0 ? ` · tarcza ${fmt(b.fx.shield)}` : ''}</div>
          {s.skills.eq.some(Boolean) && (
            <div class="skicons" aria-label="Umiejętności">
              {s.skills.eq.map((id, i) => {
                if (!id) return null;
                const left = Math.max(0, b.fx.cd[i] / SKILLS[id].cd);
                return (
                  <span key={i} class={`skic rb${SKILLS[id].r}${left <= 0 ? ' ready' : ''}`} title={SKILLS[id].n} style={{ '--cd': `${Math.round(left * 360)}deg` } as Record<string, string>}>
                    <Px src={skillUrl(id)} size={24} alt={SKILLS[id].n} />
                    {left > 0 && <b>{Math.ceil(b.fx.cd[i] / 1000)}</b>}
                  </span>
                );
              })}
            </div>
          )}
          <div class="geargrid" aria-label="Ekwipunek bohatera">
            {SLOT_ORDER.map(sl => {
              const it = s.eq[sl];
              return <span key={sl} class={`gi${it ? ' r' + it.r : ' empty'}`}>{it && <Px src={itemUrl(it.kind, it.ore, it.r)} size={18} />}</span>;
            })}
          </div>
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
      {dung && <div class="arena-actions"><span class="sub">{runHint(dung)}</span></div>}
      <div class="floats">
        {floats.map(f => <span key={f.id} class={`fl ${f.cls}`} style={{ left: f.x + '%', top: f.y + '%' }}>{f.text}</span>)}
      </div>
    </section>
  );
}
