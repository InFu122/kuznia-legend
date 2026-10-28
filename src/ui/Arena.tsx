import { useEffect, useRef, useState } from 'preact/hooks';
import { LANDS, ROMAN, SKILLS, SLOT_ORDER } from '../data';
import { dungeonBgUrl, foeUrl, heroUrl, itemUrl, landBgUrl, skillUrl } from '../art/render';
import { foeTemplate } from '../art/actors';
import { Px } from './Px';
import { bossWaiting } from '../engine/combat';
import type { Game } from '../engine/game';
import type { Enemy, Item } from '../engine/types';
import { fmt } from './format';
import type { Tab } from './icons';
import { runHint, runLabel, runMeta, runTitle } from './texts';
import { flyOre } from './drops';

interface Float { id: number; text: string; cls: string; x: number; y: number }

/** Najwyższa rzadkość założonego ekwipunku — od niej zależy poświata bohatera. */
export const bestRarity = (eq: Record<string, Item | null>) => Object.values(eq).reduce((m, it) => (it ? Math.max(m, it.r) : m), -1);

/** Bohater w pixel arcie, ubrany w to, co ma założone. */
export function HeroSprite({ eq, flip = false }: { eq: Record<string, Item | null | { kind: string; ore: number }>; flip?: boolean }) {
  return <img class={`sprite${flip ? ' flip' : ''}`} src={heroUrl(eq as Record<string, Item | null>)} alt="" draggable={false} />;
}

/** Wróg (albo kilku — wtedy dalsi stoją z tyłu). */
export function FoeSprite({ e }: { e: Enemy }) {
  const url = foeUrl(e.name, e.type);
  const back = Math.min(2, Math.max(0, e.count - 1));
  return (
    <>
      {Array.from({ length: back }, (_, i) => <img key={i} class={`sprite back b${i + 1}`} src={url} alt="" draggable={false} />)}
      <img class="sprite" src={url} alt="" draggable={false} />
    </>
  );
}

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
        setTimeout(() => el.classList.remove(e.cls), e.cls === 'lunge' ? 260 : 220);
      } else if (e.t === 'drop') {
        flyOre(foeRef.current, e.ore, e.n, e.rare);
      } else if (e.t === 'float') {
        const now = performance.now();
        if (!e.force && now - lastFloat.current < 110) return;
        lastFloat.current = now;
        const id = ++nextId.current;
        const f = { id, text: e.text, cls: e.cls, x: e.side === 'hero' ? 8 + Math.random() * 18 : 58 + Math.random() * 16, y: 18 + Math.random() * 22 };
        setFloats(fs => (fs.length > 14 ? fs : [...fs, f]));
        setTimeout(() => setFloats(fs => fs.filter(x => x.id !== id)), 900);
      }
    });
    return () => { cancelAnimationFrame(raf); off(); };
  }, [game]);

  const lastFoe = useRef<{ e: Enemy; id: number } | null>(null);
  const { s, b } = game;
  const L = LANDS[s.cur.land];
  const e = b.enemy;
  const dung = b.mode === 'dung' && b.dung;
  const waiting = bossWaiting(game.ctx);
  const st = game.stats;
  const hp = Math.max(0, b.heroHp);
  const label = dung ? runLabel(dung) : e?.boss ? 'Boss' : waiting ? 'Farma' : `Fala ${s.cur.wave}/5`;

  const bg = dung ? dungeonBgUrl(dung.id) : landBgUrl(s.cur.land);
  // Po śmierci wroga przez chwilę nie ma nowego — wtedy ostatni pada i znika.
  if (e && lastFoe.current?.e !== e) lastFoe.current = { e, id: (lastFoe.current?.id ?? 0) + 1 };
  const shown = e ?? lastFoe.current?.e ?? null;
  const dead = !e || e.hp <= 0;
  const best = bestRarity(s.eq);
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
      <div class={`stage${e?.boss ? ' boss' : ''}`}>
        <div class={`st-tag${e?.boss ? ' boss' : ''}`}>{label}</div>
        <div class={`actor hero${best >= 2 ? ' r' + best : ''}${hp <= 0 ? ' dead' : ''}`} ref={heroRef}>
          <HeroSprite eq={s.eq} />
        </div>
        {shown && (
          <div key={lastFoe.current?.id} class={`actor foe tp-${foeTemplate(shown.name, shown.type)}${shown.boss ? ' boss' : ''}${dead ? ' dead' : ''}`} ref={foeRef}>
            <div class="enter"><FoeSprite e={shown} /></div>
          </div>
        )}
        <div class="floats">
          {floats.map(f => <span key={f.id} class={`fl ${f.cls}`} style={{ left: f.x + '%', top: f.y + '%' }}>{f.text}</span>)}
        </div>
      </div>
      <div class="bars">
        <div class="bar-side">
          <div class="fname">{s.name}</div>
          <div class="hp"><i style={{ width: (hp / b.heroMax) * 100 + '%' }} /></div>
          <div class="hpnum">{fmt(hp)} / {fmt(st.hp)}{b.fx.shield > 0 ? ` · tarcza ${fmt(b.fx.shield)}` : ''}</div>
        </div>
        <div class="bar-side foe">
          <div class={`fname${e?.boss ? ' boss' : ''}`}>{e ? (e.count > 1 ? `${e.count}× ` : '') + e.name : '…'}</div>
          <div class="hp foe"><i style={{ width: e ? Math.max(0, (e.hp / e.max) * 100) + '%' : '0%' }} /></div>
          <div class="hpnum">{e ? `${fmt(Math.max(0, e.hp))} / ${fmt(e.max)}` : '\u00a0'}</div>
        </div>
      </div>
      <div class="kit">
        <div class="skicons" aria-label="Umiejętności">
          {s.skills.eq.some(Boolean) && s.skills.eq.map((id, i) => {
            if (!id) return <span key={i} class="skic empty" />;
            const left = Math.max(0, b.fx.cd[i] / SKILLS[id].cd);
            return (
              <span key={i} class={`skic rb${SKILLS[id].r}${left <= 0 ? ' ready' : ''}`} title={SKILLS[id].n} style={{ '--cd': `${Math.round(left * 360)}deg` } as Record<string, string>}>
                <Px src={skillUrl(id)} size={24} alt={SKILLS[id].n} />
                {left > 0 && <b>{Math.ceil(b.fx.cd[i] / 1000)}</b>}
              </span>
            );
          })}
        </div>
        <div class="geargrid" aria-label="Ekwipunek bohatera">
          {SLOT_ORDER.map(sl => {
            const it = s.eq[sl];
            return <span key={sl} class={`gi${it ? ' r' + it.r : ' empty'}`}>{it && <Px src={itemUrl(it.kind, it.ore, it.r)} size={18} />}</span>;
          })}
        </div>
      </div>
      {(waiting && !e?.boss) && (
        <div class="arena-actions"><button class="btn primary" onClick={() => game.challengeBoss()}>Wyzwij bossa: {L.boss}</button></div>
      )}
      {dung && <div class="arena-actions"><span class="sub">{runHint(dung)}</span></div>}
    </section>
  );
}
