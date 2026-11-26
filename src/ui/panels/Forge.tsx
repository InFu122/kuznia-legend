import { B, ELEM, ELEM_KEYS, FORGE_UNLOCKS, ORES, RAR, REFINE, SETS, SET_FORGE_LVL, SET_IDS, ORE_ORDER, rAt, rRank } from '../../data';
import { refineRatio, refineTo, sellFor, uniqActive } from '../../engine/forge';
import { AdUpButton, SpeedupButton } from './Shop';
import { JUMP_V, dist, itemLevelFor, itemName, maxJump, oreBase, oreNominal, pityAllowed } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { techMods } from '../../engine/mods';
import { Brag } from '../Decision';
import { ClanHelpLine } from './ClanLife';
import { Costs, Px } from '../Px';
import { dungeonBgUrl, elemUrl, itemUrl, oreUrl, resUrl, setOreUrl } from '../../art/render';
import { fmt, pct, pctS, tfmt } from '../format';

export const Dist = ({ d }: { d: [number, number][] }) => (
  <>{d.map(([r, p], i) => <span key={r}>{i > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n}&nbsp;{pct(p)}</span></span>)}</>
);

/** Przycisk „i”. `corner` — zawsze w prawym górnym rogu karty, kafelka albo baneru (jedno miejsce w całej grze). */
export const InfoBtn = ({ onClick, label, corner }: { onClick: () => void; label: string; corner?: boolean }) => (
  <button class={`info${corner ? ' corner' : ''}`} onClick={onClick} aria-label={label}>i</button>
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

/** Wybrana ruda w skrócie: co zwykle wychodzi, jak daleko przeskakuje, ile jej masz; niżej uwaga o niskiej kuźni. */
function OreFacts({ game }: { game: Game }) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const mj = maxJump(o);
  const at = Math.max(f.lvl, ORES[o].lvl);
  const nom = rAt(oreNominal(o, at)), goal = rAt(Math.ceil(ORES[o].v6[1] - 1e-9));
  const growing = oreBase(o, at) < ORES[o].v6[1] - 1e-9;
  return (
    <>
      <div class="ore-facts">
        <span><small>Zwykle</small><b class={`rt${nom}`}>{RAR[nom].n}</b></span>
        <span><small>Przeskok</small><b>{mj === 0 ? 'brak' : mj === 1 ? 'do +1' : 'do +2'}</b></span>
        <span><small>Masz</small><b>{fmt(s.ores[o])}</b></span>
      </div>
      {(ORES[o].d || growing) && (
        <p class="sub ore-note">
          {ORES[o].d}{ORES[o].d && growing ? ' · ' : ''}
          {growing && <>na niskiej kuźni czasem o rzadkość niżej — od {ORES[o].v6[2]}. poziomu zawsze co najmniej <span class={`rt${goal}`}>{RAR[goal].n}</span></>}
        </p>
      )}
    </>
  );
}

/** Rafinacja: skąd → dokąd, ile wyjdzie, „+1” i „Wszystko” (np. 600 Miedzi —8:1→ +75 Żelaza).
 *  Przed odblokowaniem karta też jest widoczna: pokazuje, od którego poziomu kuźni ruszy, i następną parę rud. */
function Refine({ game }: { game: Game }) {
  const s = game.s;
  const locked = s.forge.lvl < B.REFINE_FORGE_LVL;
  const rows = locked ? [] : ORE_ORDER.filter(i => refineRatio(s, i) > 0);
  // Następna para rud do rafinacji, której docelowa ruda jest jeszcze zamknięta (albo pierwsza, gdy całość zamknięta).
  const next = ORE_ORDER.find(i => REFINE[i] && (locked || s.forge.lvl < ORES[REFINE[i].to].lvl));
  const nextLvl = next === undefined ? 0 : Math.max(B.REFINE_FORGE_LVL, ORES[REFINE[next].to].lvl);
  return (
    <section class={`card refine${locked ? ' locked' : ''}`} aria-label="Rafinacja rud">
      <div class="eyebrow">Rafinacja rud</div>
      <div class="h">Zamień nadmiar na lepszą rudę</div>
      <p class="sub">Na zapasy, których już nie wytapiasz — wytop rudy wprost daje więcej. Słabsze rudy przydają się też do run.</p>
      <ul class="rlist2">
        {rows.map(i => {
          const k = refineRatio(s, i);
          const to = refineTo(i);
          const max = Math.floor(s.ores[i] / k);
          return (
            <li key={i} class={max ? '' : 'off'}>
              <span class="rf2-ore"><Px src={oreUrl(i)} size={26} /><span><b>{fmt(s.ores[i])}</b><small>{ORES[i].n}</small></span></span>
              <span class="rf2-ar" aria-label={`${k} za 1`}><small>{k} : 1</small><i aria-hidden="true">→</i></span>
              <span class="rf2-ore"><Px src={oreUrl(to)} size={26} /><span><b>{max ? `+${fmt(max)}` : '—'}</b><small>{ORES[to].n}</small></span></span>
              <span class="rf2-btns">
                <button class="btn small" disabled={max < 1} onClick={() => game.refine(i, 1)}>+1</button>
                <button class="btn small primary" disabled={max < 1} onClick={() => game.refine(i, max)}>Wszystko</button>
              </span>
            </li>
          );
        })}
        {next !== undefined && (
          <li class="rf2-next">
            <span class="rf2-ore"><Px src={oreUrl(next)} size={26} /><span><b>{fmt(s.ores[next] ?? 0)}</b><small>{ORES[next].n}</small></span></span>
            <span class="rf2-ar" aria-label={`${REFINE[next].k} za 1`}><small>{REFINE[next].k} : 1</small><i aria-hidden="true">→</i></span>
            <span class="rf2-ore"><Px src={oreUrl(REFINE[next].to)} size={26} /><span><b>—</b><small>{ORES[REFINE[next].to].n}</small></span></span>
            <span class="rf2-lock">od {nextLvl}. poz. kuźni</span>
          </li>
        )}
      </ul>
      {locked && <div class="lockline">Rafinację odblokujesz na <b>{B.REFINE_FORGE_LVL}. poziomie kuźni</b> — teraz masz {s.forge.lvl}.</div>}
    </section>
  );
}

/**
 * Co da ulepszenie kuźni: poziom nowych przedmiotów i szansa na każdą rzadkość z wybranej rudy (teraz → po ulepszeniu),
 * ta sama co w pasku szans wytopu. Bez wyniku poniżej zwykłego (spadku) — to nie cel, tylko ryzyko.
 */
function UpgradeGains({ o, from, to, rel }: { o: number; from: number; to: number; rel: number }) {
  const a0 = Math.max(from, ORES[o].lvl), a1 = Math.max(to, ORES[o].lvl);
  const d0 = dist(o, a0, rel), d1 = dist(o, a1, rel);
  const p = (d: [number, number][], r: number) => d.find(([x]) => x === r)?.[1] ?? 0;
  const base = rRank(rAt(oreNominal(o, a0)));
  const rows = [...new Set([...d0, ...d1].map(([r]) => r))].filter(r => rRank(r) >= base).sort((x, y) => rRank(x) - rRank(y))
    .map(r => ({ r, a: p(d0, r), b: p(d1, r) }));
  const lo0 = itemLevelFor(from, 0), hi0 = itemLevelFor(from, 2), lo1 = itemLevelFor(to, 0), hi1 = itemLevelFor(to, 2);
  const locked = from < ORES[o].lvl;
  /** Para procentów: gdy po zaokrągleniu wyszłyby takie same (2,7% → 2,7%), z dwoma miejscami po przecinku. */
  const two = (a: number, b: number): [string, string] => (pct(a) === pct(b) && a !== b
    ? [a.toFixed(2).replace('.', ',') + '%', b.toFixed(2).replace('.', ',') + '%'] : [pctS(a), pctS(b)]);
  const diff = (d: number) => {
    const v = Math.abs(d);
    return (d > 0 ? '+' : '−') + (v < 0.095 ? v.toFixed(2) : v.toFixed(1)).replace('.', ',');
  };
  return (
    <>
      <li class="fu-lvl"><Px src={resUrl('moc')} size={20} /><span>Nowe przedmioty</span><b>poz. {lo0}–{hi0} → <em>{lo1}–{hi1}</em></b></li>
      {rows.length > 0 && (
        <li class="fu-odds">
          <div class="fo-h"><Px src={oreUrl(o)} size={20} /><span>{ORES[o].n}: szansa na rzadkość{locked ? ` (od ${ORES[o].lvl}. poz.)` : ''}</span></div>
          <ul>
            {rows.map(x => {
              const d = x.b - x.a;
              const [ta, tb] = two(x.a, x.b);
              return (
                <li key={x.r}>
                  <span><span class={`rt${x.r}`}>{RAR[x.r].n}</span></span>
                  <b>{ta} → <em class={d < -0.005 ? 'down' : ''}>{tb}</em></b>
                  <small class={`fo-d${d > 0.005 ? ' up' : ''}`}>{Math.abs(d) > 0.005 ? diff(d) : '—'}</small>
                </li>
              );
            })}
          </ul>
        </li>
      )}
    </>
  );
}

export function ForgePanel({ game, onInfo, onFound, onMix, onDecide, onPick }: {
  game: Game; onInfo: (k: 'forge' | 'level') => void; onFound: () => void; onMix: (what: 'el' | 'set') => void; onDecide: () => void; onPick: () => void;
}) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const set = uniqActive(s);
  const rel = techMods(s).jumpRel;
  const n = f.lvl + 1;
  const cost = game.upgradeCost();
  const elOn = f.lvl >= B.ELEM_FORGE_LVL;
  const setOn = f.lvl >= SET_FORGE_LVL;
  const at = Math.max(f.lvl, ORES[o].lvl);
  const pityOk = pityAllowed(o, JUMP_V, f.lvl);

  return (
    <>
      <LastForge game={game} onDecide={onDecide} />
      {s.found.length > 0 && (
        <section class="card">
          <div class="row">
            <div><div class="eyebrow">Znaleziska czekają na decyzję</div><div class="h">Przedmioty: {s.found.length}</div></div>
            <button class="btn primary small" onClick={onFound}>Przejrzyj</button>
          </div>
        </section>
      )}
      {f.lvl < B.FORGE_MAX && !f.up ? (
        <section class="card forgeup fu2 has-info" style={{ '--bg': `url(${dungeonBgUrl('ulepszenie')})` } as Record<string, string>}>
          <InfoBtn corner onClick={() => onInfo('level')} label="Jak działa poziom kuźni" />
          <div class="fu-head">
            <div>
              <div class="eyebrow">Kuźnia</div>
              <div class="h">Ulepsz do poziomu {n}</div>
            </div>
            <span class="lvl-badge"><small>poziom</small><b>{f.lvl}</b></span>
          </div>
          <ul class="fu-gains">
            <UpgradeGains o={o} from={f.lvl} to={n} rel={rel} />
            {FORGE_UNLOCKS[n] && <li class="unl"><span class="fu-star" aria-hidden="true">✦</span><span>Odblokowuje: <b>{FORGE_UNLOCKS[n]}</b></span></li>}
          </ul>
          <div class="fu-buy">
            <Costs items={[[resUrl('zloto'), fmt(cost)], [resUrl('czas'), tfmt(game.upgradeTime())]]} cls={s.gold < cost ? 'lack-0' : ''} />
            <button class="btn primary upgrade-btn" disabled={s.gold < cost} onClick={() => game.upgrade()}>Ulepsz</button>
          </div>
          {s.gold < cost && <small class="fu-lack">Brakuje {fmt(cost - s.gold)} złota</small>}
        </section>
      ) : (
        <section class="card forgeup has-info" style={{ '--bg': `url(${dungeonBgUrl('ulepszenie')})` } as Record<string, string>}>
          <InfoBtn corner onClick={() => onInfo('level')} label="Jak działa poziom kuźni" />
          {f.lvl >= B.FORGE_MAX ? (
            <div class="row"><div><div class="eyebrow">Kuźnia</div><div class="h">Poziom {B.FORGE_MAX} — najwyższy</div><p class="sub">Kuźnia osiągnęła szczyt. Siłę bohatera rozwijaj teraz w Otchłani, Nauce, runach i legendach przedmiotów.</p></div></div>
          ) : (
            <>
              <div class="row fu-run"><div><div class="eyebrow">Ulepszanie kuźni</div><div class="h">Poziom {f.lvl} → {f.up}</div></div><span class="fu-left num"><Px src={resUrl('czas')} size={13} />{tfmt(f.left)}</span></div>
              <div class="bar" style={{ marginTop: '8px' }}><i style={{ width: Math.max(0, (1 - f.left / game.upgradeTotal()) * 100) + '%' }} /></div>
              <p class="sub" style={{ marginTop: '6px' }}>Kuźnia działa dalej w trakcie ulepszania. Po ulepszeniu:</p>
              <ul class="fu-gains fu-gains-sm">
                <UpgradeGains o={o} from={f.lvl} to={f.up} rel={rel} />
                {FORGE_UNLOCKS[f.up] && <li class="unl"><span class="fu-star" aria-hidden="true">✦</span><span>Odblokowuje: <b>{FORGE_UNLOCKS[f.up]}</b></span></li>}
              </ul>
              {game.net && <ClanHelpLine game={game} />}
              <SpeedupButton game={game} what="forge" />
              <AdUpButton game={game} what="forge" />
            </>
          )}
        </section>
      )}

      <section class="card forge" aria-label="Wytop">
        <div class="forge-banner fb-i" style={{ '--bg': `url(${dungeonBgUrl('kuznia')})` } as Record<string, string>}>
          <Px src={oreUrl(o)} size={32} />
          <div class="fb-txt">
            <div class="eyebrow">Wytop{f.up ? ' · trwa ulepszenie kuźni' : ''}</div>
            <div class="h">{ORES[o].n}</div>
          </div>
          <button class="btn small" onClick={onPick} aria-haspopup="dialog">Zmień rudę</button>
          <InfoBtn corner onClick={() => onInfo('forge')} label="Jak działa kuźnia i jakie są szanse" />
        </div>
        <OreFacts game={game} />
        <OddsBar d={dist(o, at, rel)} note={f.lvl < ORES[o].lvl ? `od ${ORES[o].lvl}. poziomu kuźni` : undefined} />
        {pityOk && (
          <div class="pity">
            <span>Gwarancja przeskoku</span>
            <div class="bar"><i style={{ width: Math.min(100, (s.pity / B.PITY_MAX) * 100) + '%' }} /></div>
            <span class="num">{s.pity}/{B.PITY_MAX}</span>
          </div>
        )}
        {(elOn || setOn || SET_IDS.some(k => (s.uniq[k] ?? 0) > 0)) && (
          <div class="mixrow">
            {elOn && (
              <button class={`mixbtn${s.elSel ? ' on' : ''}`} onClick={() => onMix('el')} aria-haspopup="dialog">
                <small>Domieszka</small>
                <span>{s.elSel ? <><Px src={elemUrl(s.elSel)} size={16} />{ELEM[s.elSel].n} · {s.els[s.elSel] ?? 0}</> : 'brak — wybierz'}</span>
                <i class="caret" aria-hidden="true">▾</i>
              </button>
            )}
            {setOn ? (
              <button class={`mixbtn${s.uniqSel ? ' on' : ''}`} onClick={() => onMix('set')} aria-haspopup="dialog">
                <small>Ruda unikalna</small>
                <span>{s.uniqSel ? <><Px src={setOreUrl(s.uniqSel)} size={16} /><b style={{ color: SETS[s.uniqSel].col }}>{SETS[s.uniqSel].ore}</b> · {s.uniq[s.uniqSel] ?? 0}</> : 'brak — wybierz'}</span>
                <i class="caret" aria-hidden="true">▾</i>
              </button>
            ) : SET_IDS.some(k => (s.uniq[k] ?? 0) > 0) && <span class="sub">Rudy unikalne wytopisz od {SET_FORGE_LVL}. poziomu kuźni.</span>}
          </div>
        )}
        {set && <p class="sub" style={{ marginTop: '8px' }}>Następny wytop z rudą unikalną <b style={{ color: SETS[set].col }}>{SETS[set].ore}</b>: pewna jakość IV albo V.</p>}
        {f.lvl < B.AUTO_FORGE_LVL && <div class="auto"><span>Auto-wytop odblokujesz na {B.AUTO_FORGE_LVL}. poziomie kuźni.</span></div>}
      </section>

      <Refine game={game} />
    </>
  );
}

/** Wybrana ruda: co z niej wychodzi bez przeskoku, pasek szans i gwarancja przeskoku. */
export function OreSummary({ game }: { game: Game }) {
  const s = game.s;
  const f = s.forge;
  const o = s.oreSel;
  const mj = maxJump(o);
  const rel = techMods(s).jumpRel;
  const at = Math.max(f.lvl, ORES[o].lvl);
  const nom = rAt(oreNominal(o, at)), goal = rAt(Math.ceil(ORES[o].v6[1] - 1e-9));
  const growing = oreBase(o, at) < ORES[o].v6[1] - 1e-9;
  const pityOk = pityAllowed(o, JUMP_V, f.lvl);
  return (
    <>
      <div class="o2-sel">
        <b>{ORES[o].n}</b> · zwykle <span class={`rt${nom}`}>{RAR[nom].n}</span>{mj === 0 ? ' · ta ruda nie przeskakuje' : mj === 1 ? ' · przeskok najwyżej o 1' : ''}{ORES[o].d ? ` · ${ORES[o].d}` : ''}
        {growing && <> · <span class="rampnote">na niskiej kuźni czasem o rzadkość niżej — od {ORES[o].v6[2]}. poziomu zawsze co najmniej <span class={`rt${goal}`}>{RAR[goal].n}</span></span></>}
      </div>
      <OddsBar d={dist(o, at, rel)} note={f.lvl < ORES[o].lvl ? `od ${ORES[o].lvl}. poziomu kuźni` : undefined} />
      {pityOk && (
        <div class="pity">
          <span>Gwarancja przeskoku</span>
          <div class="bar"><i style={{ width: Math.min(100, (s.pity / B.PITY_MAX) * 100) + '%' }} /></div>
          <span class="num">{s.pity}/{B.PITY_MAX}</span>
        </div>
      )}
    </>
  );
}

/**
 * Domieszka auto-wytopu: osobno od ręcznego wytopu, żeby auto nie zużyło przypadkiem domieszek wybranych
 * do pojedynczego wytopu. „Bez” — auto kuje bez domieszki; gdy wybranej zabraknie, kuje dalej bez niej.
 */
export function AutoElem({ game }: { game: Game }) {
  const s = game.s;
  if (s.forge.lvl < B.ELEM_FORGE_LVL) return null;
  const keys = ELEM_KEYS.filter(k => (s.els[k] ?? 0) > 0 || s.autoEl === k);
  return (
    <div class="autoel" role="radiogroup" aria-label="Domieszka w auto-wytopie">
      <span class="ae-l">Domieszka w auto-wytopie</span>
      <div class="ae-chips">
        <button role="radio" aria-checked={!s.autoEl} class={`chip${!s.autoEl ? ' on' : ''}`} onClick={() => game.setAutoEl(null)}>Bez</button>
        {keys.map(k => (
          <button key={k} role="radio" aria-checked={s.autoEl === k} class={`chip${s.autoEl === k ? ' on' : ''}`} onClick={() => game.setAutoEl(k)}
            aria-label={`${ELEM[k].n}, masz ${s.els[k] ?? 0}`}>
            <Px src={elemUrl(k)} size={16} />{ELEM[k].n}<small> · {fmt(s.els[k] ?? 0)}</small>
          </button>
        ))}
      </div>
      {keys.length === 0 && <small class="sub">Domieszki wypadają w krainach z żywiołem.</small>}
      {s.autoEl && (s.els[s.autoEl] ?? 0) === 0 && <small class="sub">Ta domieszka się skończyła — auto kuje bez niej.</small>}
    </div>
  );
}

/** Rzadkość, na której auto-wytop się zatrzymuje. `onPick` — po wyborze (np. zamknięcie okienka). */
export function AutoStop({ game, onPick }: { game: Game; onPick?: (r: number) => void }) {
  const targets = game.autoTargets();
  const target = game.autoTarget();
  return (
    <div class="autostop" role="radiogroup" aria-label="Zatrzymaj auto-wytop na rzadkości">
      <span>Zatrzymaj na:</span>
      {targets.map(r => (
        <button key={r} role="radio" aria-checked={r === target} class={`chip rchip r${r}${r === target ? ' on' : ''}`} onClick={() => { game.setAutoStop(r); onPick?.(r); }}>
          {RAR[r].n}{targets.length > 1 && rRank(r) < rRank(targets[targets.length - 1]) ? '+' : ''}
        </button>
      ))}
    </div>
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
