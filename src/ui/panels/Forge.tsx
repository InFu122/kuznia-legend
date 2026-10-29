import { useRef } from 'preact/hooks';
import { B, BATCH_OPTIONS, ELEM, FORGE_UNLOCKS, ORES, RAR, SETS, SET_FORGE_LVL, SET_IDS } from '../../data';
import { canSmelt, refineRatio, sellFor, uniqActive } from '../../engine/forge';
import { dist, itemName, jumpChances, maxJump } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { techMods } from '../../engine/mods';
import { Brag } from '../Decision';
import { sparks } from '../fx';
import { ClanHelpLine } from './ClanLife';
import { Costs, Px } from '../Px';
import { elemUrl, itemUrl, oreUrl, resUrl, setOreUrl } from '../../art/render';
import { fmt, pct, tfmt } from '../format';

export const Dist = ({ d }: { d: [number, number][] }) => (
  <>{d.map(([r, p], i) => <span key={r}>{i > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n}&nbsp;{pct(p)}</span></span>)}</>
);

export const InfoBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button class="info" onClick={onClick} aria-label={label}>i</button>
);

/** Pasek szans wytopu: segmenty w kolorach rzadkości, z procentami pod spodem. */
export function OddsBar({ d, note, cls = '' }: { d: [number, number][]; note?: string; cls?: string }) {
  return (
    <div class={`oddsbar ${cls}`} aria-label="Szanse wytopu">
      <div class="ob-bar">{d.map(([r, p]) => <i key={r} class={`rb-${r}`} style={{ flexGrow: Math.max(p, 0.6) }} />)}</div>
      <div class="ob-lab">
        {d.map(([r, p]) => <span key={r} class={`rt${r}`}><b>{pct(p)}</b> {RAR[r].n}</span>)}
        {note && <span class="ob-note">{note}</span>}
      </div>
    </div>
  );
}

export function ForgePanel({ game, onInfo, onFound, onMix, onDecide }: {
  game: Game; onInfo: (k: 'forge' | 'level') => void; onFound: () => void; onMix: (what: 'el' | 'set') => void; onDecide: () => void;
}) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const mj = maxJump(o);
  const sparkRef = useRef<HTMLDivElement>(null);
  const ok = canSmelt(game.ctx, o) && !s.pending;
  const set = uniqActive(s);
  const batch = game.batchActive();
  const btnLabel = s.pending ? 'Najpierw zdecyduj o przedmiocie' : f.lvl < ORES[o].lvl ? `Wytop od poz. ${ORES[o].lvl}` : s.ores[o] < 1 ? `Brak rudy: ${ORES[o].n}`
    : batch > 1 ? `Przetop ×${Math.min(batch, s.ores[o])} · ${ORES[o].n}` : `Przetop · ${ORES[o].n}`;
  const rel = techMods(s).jumpRel;
  const n = f.lvl + 1;
  const cost = game.upgradeCost();
  const elOn = f.lvl >= B.ELEM_FORGE_LVL;
  const setOn = f.lvl >= SET_FORGE_LVL;
  const targets = game.autoTargets();
  const target = game.autoTarget();
  // Szansa na przeskok dla wybranej rudy (rzadsze wyniki są trudniejsze); Gwiezdny Kruszec nie przeskakuje — wtedy bazowa.
  const jo = mj >= 1 ? o : -1;
  const jn = jo >= 0 ? ` (${ORES[jo].n})` : '';
  const [j1, j2] = jumpChances(f.lvl, rel, jo);
  const [k1, k2] = jumpChances(n, rel, jo);

  return (
    <>
      <section class="card forge" aria-label="Kowadło">
        <div class="row">
          <div class="eyebrow">Ruda do wytopu</div>
          <InfoBtn onClick={() => onInfo('forge')} label="Jak działa kuźnia i jakie są szanse" />
        </div>
        <div class="ores2" role="radiogroup" aria-label="Ruda">
          {ORES.map((x, i) => {
            const locked = f.lvl < x.lvl;
            return (
              <button key={x.n} role="radio" aria-checked={i === o} class={`ore2 rb${x.floor}${i === o ? ' on' : ''}${locked ? ' locked' : ''}`}
                aria-label={`${x.n}: ${s.ores[i]} sztuk, minimum ${RAR[x.floor].n}${locked ? `, wytop od ${x.lvl}. poziomu kuźni` : ''}`} onClick={() => game.setOre(i)}>
                <Px src={oreUrl(i)} size={32} />
                <b class="cnt">{fmt(s.ores[i])}</b>
                <span class="o2-n">{locked ? `poz. ${x.lvl}` : x.n}</span>
              </button>
            );
          })}
        </div>
        <div class="o2-sel">
          <b>{ORES[o].n}</b> · minimum <span class={`rt${ORES[o].floor}`}>{RAR[ORES[o].floor].n}</span>{mj === 0 ? ' · ta ruda nie przeskakuje' : mj === 1 ? ' · przeskok najwyżej o 1' : ''}
        </div>
        {(elOn || setOn || SET_IDS.some(k => (s.uniq[k] ?? 0) > 0)) && (
          <div class="mixrow">
            {elOn && (
              <button class={`mixbtn${s.elSel ? ' on' : ''}`} onClick={() => onMix('el')} aria-haspopup="dialog">
                <small>Domieszka</small>
                <span>{s.elSel ? <><Px src={elemUrl(s.elSel)} size={16} />{ELEM[s.elSel].n} · {s.els[s.elSel] ?? 0}</> : 'brak'}</span>
                <i class="caret" aria-hidden="true">▾</i>
              </button>
            )}
            {setOn ? (
              <button class={`mixbtn${s.uniqSel ? ' on' : ''}`} onClick={() => onMix('set')} aria-haspopup="dialog">
                <small>Ruda unikalna</small>
                <span>{s.uniqSel ? <><Px src={setOreUrl(s.uniqSel)} size={16} /><b style={{ color: SETS[s.uniqSel].col }}>{SETS[s.uniqSel].ore}</b> · {s.uniq[s.uniqSel] ?? 0}</> : 'brak'}</span>
                <i class="caret" aria-hidden="true">▾</i>
              </button>
            ) : SET_IDS.some(k => (s.uniq[k] ?? 0) > 0) && <span class="sub">Rudy unikalne wytopisz od {SET_FORGE_LVL}. poziomu kuźni.</span>}
          </div>
        )}
        {set && <p class="sub">Następny wytop: część zestawu <b style={{ color: SETS[set].col }}>{SETS[set].n}</b>{mj >= 1 ? ' z pewnym przeskokiem o co najmniej 1 rzadkość' : ''}.</p>}
        <OddsBar d={dist(o, Math.max(f.lvl, ORES[o].lvl), rel)} note={f.lvl < ORES[o].lvl ? `od ${ORES[o].lvl}. poziomu kuźni` : set && mj >= 1 ? 'z zestawem bez najniższej' : undefined} />
        {mj >= 1 && (
          <div class="pity">
            <span>Gwarancja przeskoku</span>
            <div class="bar"><i style={{ width: Math.min(100, (s.pity / B.PITY_MAX) * 100) + '%' }} /></div>
            <span class="num">{s.pity}/{B.PITY_MAX}</span>
          </div>
        )}
        {f.lvl >= BATCH_OPTIONS[1][1] && (
          <div class="batch" role="radiogroup" aria-label="Wytop seryjny">
            <span>Wytop seryjny</span>
            {BATCH_OPTIONS.map(([k, lvl]) => (
              <button key={k} role="radio" aria-checked={s.batch === k} disabled={f.lvl < lvl} class={`chip${s.batch === k ? ' on' : ''}`}
                title={f.lvl < lvl ? `Od ${lvl}. poziomu kuźni` : undefined} onClick={() => game.setBatch(k)}>
                ×{k}{f.lvl < lvl ? <small> · {lvl}</small> : ''}
              </button>
            ))}
          </div>
        )}
        {s.batch > 1 && batch === 1 && (s.elSel || set) && <p class="sub">Wytop seryjny działa bez domieszki i rudy unikalnej — teraz kujesz pojedynczo.</p>}
        <div class="anvil">
          <button class="btn primary btn-forge" disabled={!ok} onClick={() => { const it = game.smeltManual(); if (it) sparks(sparkRef.current, it.r); }}>{btnLabel}</button>
          <div class="sparks" ref={sparkRef} />
        </div>
        {f.lvl >= B.AUTO_FORGE_LVL ? (
          <div class="auto2">
            <div class="row">
              <div><b>Auto-wytop</b>{game.autoWaiting && <div class="tech-cost warn">{f.lvl < ORES[o].lvl ? `${ORES[o].n} od ${ORES[o].lvl}. poziomu kuźni` : `czeka na rudę: ${ORES[o].n}`}</div>}{game.autoPaused && <div class="tech-cost warn">czeka na twoją decyzję</div>}</div>
              <button class={`toggle${s.auto ? ' on' : ''}`} aria-pressed={s.auto} onClick={() => game.toggleAuto()}><span class="knob" />{s.auto ? 'Włączony' : 'Wyłączony'}</button>
            </div>
            <div class="autostop" role="radiogroup" aria-label="Zatrzymaj auto-wytop na rzadkości">
              <span>Zatrzymaj na:</span>
              {targets.map(r => (
                <button key={r} role="radio" aria-checked={r === target} class={`chip rchip r${r}${r === target ? ' on' : ''}`} onClick={() => game.setAutoStop(r)}>
                  {RAR[r].n}{targets.length > 1 && r < targets[targets.length - 1] ? '+' : ''}
                </button>
              ))}
            </div>
            <p class="sub">Słabsze przedmioty sprzedaje (do pustego miejsca zakłada). Gdy wykuje wybraną rzadkość albo część zestawu — gra i pokazuje przedmiot; po twojej decyzji kuje dalej.</p>
          </div>
        ) : (
          <div class="auto"><span>Auto-wytop odblokujesz na {B.AUTO_FORGE_LVL}. poziomie kuźni.</span></div>
        )}
      </section>

      <LastForge game={game} onDecide={onDecide} />

      <Refine game={game} />

      {s.found.length > 0 && (
        <section class="card">
          <div class="row">
            <div><div class="eyebrow">Znaleziska czekają na decyzję</div><div class="h">Przedmioty: {s.found.length}</div></div>
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
            <p class="sub" style={{ marginTop: '6px' }}>Kuźnia działa dalej w trakcie ulepszania. Po ulepszeniu: szansa na przeskok{jn} {pct(j1 + j2)} → <b>{pct(k1 + k2)}</b>{FORGE_UNLOCKS[f.up] ? `, ${FORGE_UNLOCKS[f.up]}` : ''}.</p>
            {game.net && <ClanHelpLine game={game} />}
          </>
        ) : (
          <div class="row">
            <div>
              <LevelEyebrow text={`Kuźnia · poziom ${f.lvl}`} onInfo={onInfo} />
              <div class="h">Ulepsz do poziomu {n}</div>
              <p class="sub">Szansa na przeskok{jn} {pct(j1 + j2)} → <b>{pct(k1 + k2)}</b> (+{pct(k1 + k2 - j1 - j2)}){FORGE_UNLOCKS[n] ? ` · odblokowuje: ${FORGE_UNLOCKS[n]}` : ''}</p>
              <p class="sub upcost"><Costs items={[[resUrl('zloto'), `${fmt(cost)} złota`], [resUrl('czas'), tfmt(game.upgradeTime())]]} cls={s.gold < cost ? 'lack-0' : ''} /></p>
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

/** Rafinacja: nadmiar słabszej rudy zamieniany na następną (np. 10 Żelaza → 1 Srebro). */
function Refine({ game }: { game: Game }) {
  const s = game.s;
  if (s.forge.lvl < B.REFINE_FORGE_LVL) return null;
  const rows = ORES.map((_, i) => i).filter(i => refineRatio(s, i) > 0);
  if (!rows.length) return null;
  return (
    <section class="card refine" aria-label="Rafinacja rud">
      <div class="eyebrow">Rafinacja rud</div>
      <p class="sub">Nadmiar słabszej rudy zamienisz na następną. Wytapianie rudy wprost zawsze daje więcej — rafinacja jest na zapasy, których już nie wytapiasz.</p>
      <ul class="rlist">
        {rows.map(i => {
          const k = refineRatio(s, i);
          const max = Math.floor(s.ores[i] / k);
          return (
            <li key={i} class={max ? '' : 'off'}>
              <span class="rf-from"><Px src={oreUrl(i)} size={24} /><b>{fmt(s.ores[i])}</b></span>
              <span class="rf-ratio">{k} → 1</span>
              <span class="rf-to"><Px src={oreUrl(i + 1)} size={24} />{ORES[i + 1].n}</span>
              <span class="rf-btns">
                <button class="btn small" disabled={max < 1} onClick={() => game.refine(i, 1)}>+1</button>
                <button class="btn small primary" disabled={max < 1} onClick={() => game.refine(i, max)}>+{fmt(max)}</button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Pod kowadłem: przedmiot czekający na decyzję albo ostatni wynik auto-wytopu. */
function LastForge({ game, onDecide }: { game: Game; onDecide: () => void }) {
  const s = game.s;
  const it = s.pending;
  if (it) {
    return (
      <section class="card last r-card">
        <div class="lastrow">
          <Px src={itemUrl(it.kind, it.ore, it.r)} size={36} />
          <div class="cmain"><div class={`cname rt${it.r}`}>{itemName(it)}</div><div class="tech-cost">{RAR[it.r].n} · poz. {it.lvl} · czeka na decyzję</div></div>
          <button class="btn primary small" onClick={onDecide}>Zdecyduj</button>
        </div>
      </section>
    );
  }
  if (!game.lastAuto) return null;
  const { item, res } = game.lastAuto;
  return (
    <section class="card last">
      <div class="lastrow">
        <Px src={itemUrl(item.kind, item.ore, item.r)} size={36} />
        <div class="cmain">
          <div class={`cname rt${item.r}`}>{itemName(item)}</div>
          <div class="tech-cost">Ostatni auto-wytop · {RAR[item.r].n} · {res === 'equip' ? 'założony (puste miejsce)' : res === 'stop' ? 'zatrzymał auto-wytop' : `sprzedany za ${fmt(sellFor(s, item))} zł.`}</div>
        </div>
      </div>
      <Brag key={'b' + item.id} game={game} it={item} />
    </section>
  );
}
