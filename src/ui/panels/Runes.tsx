// Runy bohatera (zakładka Bohater) i przekuwanie statystyk dodatkowych (okno założonego przedmiotu).
import { B, DIVINE_ORE, LANDS, ORES, SLOTS, SLOT_ORDER } from '../../data';
import { itemUrl, oreUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import type { SlotId } from '../../engine/types';
import { farmLandFor, runeBlock, runeCost, runeGain, runeLvl, runePay } from '../../engine/runes';
import { fmt, pctS } from '../format';
import { LockIcon } from '../icons';
import { Px } from '../Px';
import { InfoBtn } from './Forge';


/** Pasek runy: 10 odcinków po 5 poziomów, każdy w kolorze rudy, którą się za nie płaci. */
function RuneBar({ s, lvl }: { s: Game['s']; lvl: number }) {
  return (
    <span class="rbar" aria-hidden="true">
      {Array.from({ length: B.RUNE_MAX / 5 }, (_, t) => {
        const fill = Math.max(0, Math.min(5, lvl - t * 5)) / 5;
        return <i key={t} style={{ '--c': ORES[runeCost(s, t * 5 + 1).ore].col, '--f': fill } as Record<string, string | number>} />;
      })}
    </span>
  );
}

/** Odznaka runy na miejscu ekwipunku (karta run, siatka ekwipunku): ikona runy i poziom. */
export const RuneBadge = ({ lvl, cls = '' }: { lvl: number; cls?: string }) =>
  lvl > 0 ? <span class={`rune-badge ${cls}`} title={`Runa: +${lvl * B.RUNE_PCT}%`}><Px src={resUrl('runa')} size={12} />{lvl}</span> : null;


/** Przycisk „+1” z przyrostem Mocy. */
function RuneUp({ game, sl }: { game: Game; sl: SlotId }) {
  const s = game.s;
  const L = runeLvl(s, sl);
  const block = runeBlock(s, sl);
  const nxt = L < B.RUNE_MAX && s.eq[sl] ? runeGain(s, sl, true) : null;
  return (
    <button class="btn small primary rup" disabled={!!block} title={block ?? undefined} onClick={() => game.upgradeRune(sl)}
      aria-label={L >= B.RUNE_MAX ? 'Maksymalny poziom' : `Ulepsz runę: ${SLOTS[sl].n}${nxt ? `, +${fmt(nxt.power)} Mocy` : ''}`}>
      {L >= B.RUNE_MAX ? 'maks.' : s.forge.lvl < B.RUNE_FORGE_LVL ? <><LockIcon /><small>Kuźnia {B.RUNE_FORGE_LVL}</small></>
        : <>+1{nxt && nxt.power > 0 && <small>+{fmt(nxt.power)} Mocy</small>}</>}
    </button>
  );
}

/**
 * Ikona miejsca w ekwipunku: zawsze ten sam kształt dla danego miejsca (np. miecz dla Broni), jednolity, w kolorze run
 * — nie obrazek założonego przedmiotu, bo runa wzmacnia miejsce, a nie przedmiot. Bez runy kształt jest szary.
 */
function SlotGlyph({ sl, on }: { sl: SlotId; on: boolean }) {
  const [kind] = SLOTS[sl].kinds[0];
  return <span class={`rglyph${on ? ' on' : ''}`}><Px src={itemUrl(kind, 0, 0)} size={34} /></span>;
}

/** Brakująca ruda do następnych poziomów run — raz nad listą, a nie przy każdym miejscu. */
function RuneFarm({ game }: { game: Game }) {
  const s = game.s;
  const lack = new Map<number, number>();
  for (const sl of SLOT_ORDER) {
    const L = runeLvl(s, sl);
    const c = L < B.RUNE_MAX ? runePay(s, L + 1) : null;
    if (c && !c.enough && !lack.has(c.ore)) lack.set(c.ore, c.n);
  }
  if (!lack.size || s.forge.lvl < B.RUNE_FORGE_LVL) return null;
  return (
    <>
      {[...lack.keys()].slice(0, 2).map(ore => {
        const farm = farmLandFor(s, ore);
        const here = !!farm && farm.land === s.cur.land && game.b.mode === 'camp';
        return (
          <div key={ore} class="rfarm2">
            <Px src={oreUrl(ore)} size={22} />
            <span>Do run brakuje: <b>{ORES[ore].n}</b>
              <small>{farm ? <>najczęściej w krainie <b>{LANDS[farm.land].n}</b> ({pctS(farm.pct)})</> : ore === DIVINE_ORE
                ? 'bossowie IV aktu, lochy sezonowe, wydarzenia i Przepustka' : 'dalsze krainy i Otchłań'}</small>
            </span>
            {farm && (here ? <small class="muted">tu walczysz</small> : <button class="btn small" onClick={() => game.goLand(farm.land)}>Farmuj tam</button>)}
          </div>
        );
      })}
    </>
  );
}

/**
 * Zakładka „Runy” w Bohaterze. Runa to stała premia miejsca w ekwipunku (Broń, Hełm…), nie przedmiotu: działa na każdy
 * przedmiot założony w tym miejscu i zostaje przy każdej wymianie. Na górze podsumowanie i (raz) brakująca ruda,
 * niżej zwarte wiersze: ikona miejsca, premia teraz → po ulepszeniu, pasek, koszt i „+1”.
 */
export function RunesTab({ game }: { game: Game }) {
  const s = game.s;
  const any = SLOT_ORDER.some(sl => runeLvl(s, sl) > 0);
  const total = SLOT_ORDER.reduce((a, sl) => a + runeLvl(s, sl), 0);
  const all = any ? runeGain(s) : null;
  return (
    <section class="card runes has-info">
      <InfoBtn corner onClick={() => game.openModal({ kind: 'info', k: 'runes' })} label="Jak działają runy" />
      <div class="row">
        <div class="rhead"><Px src={resUrl('runa')} size={30} /><div><div class="eyebrow">Runy bohatera · na zawsze</div><div class="h">Wzmocnienie miejsc ekwipunku</div></div></div>
      </div>
      {s.forge.lvl < B.RUNE_FORGE_LVL && (
        <div class="lockline rlock"><LockIcon /><span>Runy odblokujesz na <b>{B.RUNE_FORGE_LVL}. poziomie kuźni</b> — teraz masz {s.forge.lvl}. Ulepszaj kuźnię w zakładce Kuźnia.</span></div>
      )}
      {all && all.power > 0 ? (
        <div class="rsum rsum2">
          <b>{all.dmg > 0 && <>+{fmt(all.dmg)} obrażeń</>}{all.dmg > 0 && all.hp > 0 && ' · '}{all.hp > 0 && <>+{fmt(all.hp)} zdrowia</>}</b>
          <small>z run · +{fmt(all.power)} Mocy · {total}/{B.RUNE_MAX * SLOT_ORDER.length} poziomów</small>
        </div>
      ) : (
        <p class="sub">Runa siedzi w <b>miejscu</b>, nie w przedmiocie: każdy poziom to +{B.RUNE_PCT}% głównej statystyki dla <b>każdego</b> przedmiotu założonego w tym miejscu, na zawsze.</p>
      )}
      <RuneFarm game={game} />
      <ul class="runelist rl2">
        {SLOT_ORDER.map(sl => {
          const L = runeLvl(s, sl);
          const now = L && s.eq[sl] ? runeGain(s, sl) : null;
          const dmg = SLOTS[sl].stat === 'dmg';
          const c = L < B.RUNE_MAX ? runePay(s, L + 1) : null;
          return (
            <li key={sl} class={L >= B.RUNE_MAX ? 'max' : ''}>
              <span class="rsock2" aria-hidden="true"><SlotGlyph sl={sl} on={L > 0} /><RuneBadge lvl={L} /></span>
              <div class="rmain">
                <div class="rtop2">
                  <b>{SLOTS[sl].n}</b>
                  {now && <small class="rnow2">+{fmt(dmg ? now.dmg : now.hp)} {dmg ? 'obr.' : 'zdr.'}</small>}
                  <span class="rbonus">{L ? `+${L * B.RUNE_PCT}%` : '0%'}{L < B.RUNE_MAX && <> → <b>+{(L + 1) * B.RUNE_PCT}%</b></>}</span>
                </div>
                <RuneBar s={s} lvl={L} />
                {c ? (
                  <div class="rcost">
                    <span class={c.enough ? '' : 'lack'}><Px src={oreUrl(c.ore)} size={13} />{fmt(c.n)}{!c.enough && <small> masz {fmt(c.avail)}</small>}</span>
                    <span class={s.gold < c.gold ? 'lack' : ''}><Px src={resUrl('zloto')} size={13} />{fmt(c.gold)}</span>
                  </div>
                ) : <div class="rcost"><small class="muted">Maksymalny poziom</small></div>}
              </div>
              <RuneUp game={game} sl={sl} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
