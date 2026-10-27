import { useRef, useState } from 'preact/hooks';
import { B, ELEM, ELEM_KEYS, FORGE_UNLOCKS, ORES, RAR, SETS, SET_FORGE_LVL, SET_IDS, SLOTS } from '../../data';
import { canSmelt, sellFor, uniqActive } from '../../engine/forge';
import { dist, itemName, mainVal, maxJump } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { techMods } from '../../engine/mods';
import type { ElemKey, Item, SetId } from '../../engine/types';
import { ServerError, getLink } from '../../save/server';
import { ItemCard } from '../ItemCard';
import { fmt, pct, tfmt } from '../format';

export const Dist = ({ d }: { d: [number, number][] }) => (
  <>{d.map(([r, p], i) => <span key={r}>{i > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n}&nbsp;{pct(p)}</span></span>)}</>
);

export const InfoBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button class="info" onClick={onClick} aria-label={label}>i</button>
);

function sparks(box: HTMLElement | null) {
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const a = -Math.PI * Math.random();
    const d = 40 + Math.random() * 70;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    box.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
}

export function ForgePanel({ game, onInfo, onFound }: { game: Game; onInfo: (k: 'forge' | 'level') => void; onFound: () => void }) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const mj = maxJump(o);
  const sparkRef = useRef<HTMLDivElement>(null);
  const ok = canSmelt(game.ctx, o) && !s.pending;
  const set = uniqActive(s);
  const btnLabel = s.pending ? 'Najpierw zdecyduj o przedmiocie' : f.lvl < ORES[o].lvl ? `Wytop od poz. ${ORES[o].lvl}` : s.ores[o] < 1 ? `Brak rudy: ${ORES[o].n}` : `Przetop · ${ORES[o].n}${set ? ' + ' + SETS[set].ore : ''}`;
  const elKeys = ELEM_KEYS.filter(k => (s.els[k] ?? 0) > 0);
  const uniqKeys = SET_IDS.filter(k => (s.uniq[k] ?? 0) > 0);
  const rel = techMods(s).jumpRel;
  const n = f.lvl + 1;
  const cost = game.upgradeCost();

  return (
    <>
      <section class="card" aria-label="Kowadło">
        <div class="row">
          <div class="eyebrow">Wybierz rudę do wytopu</div>
          <InfoBtn onClick={() => onInfo('forge')} label="Jak działa kuźnia i jakie są szanse" />
        </div>
        <div class="ores">
          {ORES.map((x, i) => {
            const locked = f.lvl < x.lvl;
            return (
              <button key={x.n} class={`ore${i === o ? ' on' : ''}${locked ? ' locked' : ''}`} aria-pressed={i === o} onClick={() => game.setOre(i)}>
                <span class="gem" style={{ '--c': x.col } as Record<string, string>} />
                <span class="on-n">{x.n}</span>
                <span class="cnt">{fmt(s.ores[i])}</span>
                <small>{locked ? `wytop od poz. ${x.lvl}` : <>min. <span class={`rt${x.floor}`}>{RAR[x.floor].n}</span></>}</small>
              </button>
            );
          })}
        </div>
        <div class="odds">
          Szanse wytopu: <Dist d={dist(o, f.lvl, rel)} />{mj === 0 ? ' · ta ruda nie przeskakuje' : ''} · <button class="linkbtn" onClick={() => onInfo('forge')}>wszystkie szanse</button>
        </div>
        {mj >= 1 && (
          <div class="pity">
            <span>Gwarancja przeskoku</span>
            <div class="bar"><i style={{ width: Math.min(100, (s.pity / B.PITY_MAX) * 100) + '%' }} /></div>
            <span class="num">{s.pity}/{B.PITY_MAX}</span>
          </div>
        )}
        {f.lvl >= B.ELEM_FORGE_LVL && (
          <div class="mix">
            <span class="eyebrow" style={{ alignSelf: 'center' }}>Domieszka</span>
            <button class={`chip${!s.elSel ? ' on' : ''}`} onClick={() => game.setElem(null)}>Bez domieszki</button>
            {elKeys.map((k: ElemKey) => (
              <button key={k} class={`chip${s.elSel === k ? ' on' : ''}`} onClick={() => game.setElem(k)}>{ELEM[k].n} · {s.els[k]}</button>
            ))}
            {elKeys.length === 0 && <span class="sub" style={{ alignSelf: 'center' }}>Domieszki wypadają w krainach z żywiołem (4% na falę).</span>}
          </div>
        )}
        {(f.lvl >= SET_FORGE_LVL || uniqKeys.length > 0) && (
          <div class="mix">
            <span class="eyebrow" style={{ alignSelf: 'center' }}>Ruda unikalna</span>
            {f.lvl >= SET_FORGE_LVL ? (
              <>
                <button class={`chip${!s.uniqSel ? ' on' : ''}`} onClick={() => game.setUniq(null)}>Bez zestawu</button>
                {uniqKeys.map((k: SetId) => (
                  <button key={k} class={`chip${s.uniqSel === k ? ' on' : ''}`} onClick={() => game.setUniq(k)}>
                    <span style={{ color: SETS[k].col }}>{SETS[k].ore}</span> · {s.uniq[k]}
                  </button>
                ))}
                {uniqKeys.length === 0 && <span class="sub" style={{ alignSelf: 'center' }}>Rudy unikalne dają bossowie i Leża Bossów.</span>}
              </>
            ) : (
              <span class="sub" style={{ alignSelf: 'center' }}>
                Masz {uniqKeys.map(k => `${s.uniq[k]} × ${SETS[k].ore}`).join(', ')}. Części zestawów wytopisz od {SET_FORGE_LVL}. poziomu kuźni.
              </span>
            )}
          </div>
        )}
        {set && <p class="sub">Następny wytop będzie częścią zestawu <b style={{ color: SETS[set].col }}>{SETS[set].n}</b> w miejscu, w którym jeszcze go nie nosisz{mj >= 1 ? ', z gwarantowanym przeskokiem o co najmniej 1 rzadkość' : ''}.</p>}
        <div class="anvil">
          <button class="btn primary btn-forge" disabled={!ok} onClick={() => { if (game.smeltManual()) sparks(sparkRef.current); }}>{btnLabel}</button>
          <div class="sparks" ref={sparkRef} />
        </div>
        {f.lvl >= B.AUTO_FORGE_LVL ? (
          <div class="auto">
            <span>{game.autoWaiting ? `Auto-wytop czeka na rudę: ${ORES[o].n}. Ruda wypada z części fal.` : 'Auto-wytop zakłada lepsze przedmioty, resztę sprzedaje.'}</span>
            <button class={`toggle${s.auto ? ' on' : ''}`} aria-pressed={s.auto} onClick={() => game.toggleAuto()}><span class="knob" />Auto-wytop</button>
          </div>
        ) : (
          <div class="auto"><span>Auto-wytop odblokujesz na {B.AUTO_FORGE_LVL}. poziomie kuźni.</span></div>
        )}
      </section>

      <section><Result game={game} /></section>

      {s.found.length > 0 && (
        <section class="card">
          <div class="row">
            <div><div class="eyebrow">Zapomniana Zbrojownia</div><div class="h">Znaleziska: {s.found.length}</div></div>
            <button class="btn primary small" onClick={onFound}>Przejrzyj</button>
          </div>
        </section>
      )}

      <section class="card">
        {f.lvl >= B.FORGE_MAX ? (
          <div class="row"><div><LevelEyebrow text="Kuźnia" onInfo={onInfo} /><div class="h">Poziom {B.FORGE_MAX}</div></div><span class="muted">Maksymalny poziom</span></div>
        ) : f.up ? (
          <>
            <div class="row"><div><LevelEyebrow text="Ulepszanie kuźni" onInfo={onInfo} /><div class="h">Poziom {f.lvl} → {f.up}</div></div><span class="num">{tfmt(f.left)}</span></div>
            <div class="bar" style={{ marginTop: '8px' }}><i style={{ width: Math.max(0, (1 - f.left / game.upgradeTotal()) * 100) + '%' }} /></div>
            <p class="sub" style={{ marginTop: '6px' }}>Kuźnia działa dalej w trakcie ulepszania. Po ulepszeniu: {FORGE_UNLOCKS[f.up] ?? 'większa szansa na przeskok'}.</p>
          </>
        ) : (
          <div class="row">
            <div>
              <LevelEyebrow text={`Kuźnia · poziom ${f.lvl}`} onInfo={onInfo} />
              <div class="h">Ulepsz do poziomu {n}</div>
              <p class="sub">{FORGE_UNLOCKS[n] ? 'Odblokowuje: ' + FORGE_UNLOCKS[n] : 'Większa szansa na przeskok'} · {fmt(cost)} złota · {tfmt(game.upgradeTime())}</p>
            </div>
            <button class="btn primary small upgrade-btn" disabled={s.gold < cost} onClick={() => game.upgrade()}>Ulepsz</button>
          </div>
        )}
      </section>
    </>
  );
}

const LevelEyebrow = ({ text, onInfo }: { text: string; onInfo: (k: 'level') => void }) => (
  <div class="row" style={{ justifyContent: 'flex-start', gap: '8px' }}>
    <span class="eyebrow">{text}</span>
    <InfoBtn onClick={() => onInfo('level')} label="Jak działa poziom kuźni" />
  </div>
);

/** „Pochwal się dropem”: karta przedmiotu Mitycznego lub Boskiego na czacie globalnym. */
function Brag({ game, it }: { game: Game; it: Item }) {
  const [msg, setMsg] = useState('');
  if (!game.net || it.r < 5 || typeof it.sx !== 'number') return null;
  const send = () => {
    const link = getLink();
    if (!link?.online) { setMsg('Brak połączenia z serwerem.'); return; }
    link.chatDrop(it, true).then(() => setMsg('Wysłano na czat globalny!')).catch(e => setMsg(e instanceof ServerError ? e.message : 'Nie udało się wysłać.'));
  };
  return (
    <div class="brag">
      {msg ? <span class="sub" role="status">{msg}</span> : <button class="btn small" onClick={send}>Pochwal się na czacie globalnym</button>}
    </div>
  );
}

function Result({ game }: { game: Game }) {
  const s = game.s;
  const it = s.pending;
  if (it) {
    const cur = s.eq[it.slot];
    const d = game.pendingDelta();
    return (
      <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {it.jump > 0 && <div class="jump" key={'j' + it.id}>Przeskok +{it.jump}!</div>}
        {!it.obieg && it.flvl > 0 && (
          <p class="sub">
            Szanse tego wytopu ({ORES[it.ore].n}, kuźnia poz. {it.flvl}): <Dist d={dist(it.ore, it.flvl, techMods(s).jumpRel)} />
            {it.forced === 'pity' ? ' · przeskok z gwarancji' : it.forced === 'tut' ? ' · pierwszy przeskok gwarantowany' : it.forced === 'set' ? ' · przeskok gwarantowany przez rudę unikalną' : ''}
          </p>
        )}
        {it.obieg && <p class="sub">Znalezisko z Wielkiego Obiegu: przedmiot wykuty przez gracza {it.smith}.</p>}
        <div key={it.id}><ItemCard it={it} delta={d} reveal history={it.obieg} /></div>
        <Brag key={'b' + it.id} game={game} it={it} />
        <p class="sub">
          {cur
            ? `Teraz założony: ${itemName(cur)} (${RAR[cur.r].n}, ${SLOTS[cur.slot].stat === 'dmg' ? 'obrażenia' : 'zdrowie'} ${fmt(mainVal(cur))})` +
              (cur.fame > 0 ? ' · po zmianie połowa jego Sławy Czynów przejdzie na nowy przedmiot.' : '')
            : `Slot ${SLOTS[it.slot].n} jest pusty.`}
        </p>
        <div class="result-actions">
          <button class={`btn${d >= 0 ? ' primary' : ''}`} onClick={() => game.equipPending()}>Załóż</button>
          <button class={`btn${d < 0 ? ' primary' : ''}`} onClick={() => game.sellPending()}>Sprzedaj · {fmt(sellFor(s, it))} zł.</button>
        </div>
      </div>
    );
  }
  if (game.lastAuto) {
    const { item, equipped } = game.lastAuto;
    return <div class="card"><div class="eyebrow">Ostatni wytop · {equipped ? 'założony' : 'sprzedany'}</div><ItemCard it={item} /><Brag key={'b' + item.id} game={game} it={item} /></div>;
  }
  return (
    <div class="card">
      <p class="sub">Każda ruda gwarantuje minimalną rzadkość. Kuźnia daje szansę, że przedmiot przeskoczy wyżej. Przetop pierwszą rudę, a nowy przedmiot porównasz z założonym.</p>
    </div>
  );
}
