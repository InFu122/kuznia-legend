// Runy bohatera (zakładka Bohater) i przekuwanie statystyk dodatkowych (okno założonego przedmiotu).
import { useState } from 'preact/hooks';
import { B, DIVINE_ORE, LANDS, ORES, SLOTS, SLOT_ORDER } from '../../data';
import { oreUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { farmLandFor, runeForAll, reforgeBlock, reforgeCost, runeBlock, runeCost, runeGain, runeLvl, runePay, runeStat, subText } from '../../engine/runes';
import type { Item, SlotId } from '../../engine/types';
import { getLink } from '../../save/server';
import { fmt, pctS } from '../format';
import { SlotIcon } from '../icons';
import { Px } from '../Px';
import { Note, errText } from './ClanLife';
import { InfoBtn } from './Forge';

const CostLine = ({ ore, n, gold, lack }: { ore: number; n: number; gold: number; lack?: boolean }) => (
  <span class={`rcost${lack ? ' lack' : ''}`}><Px src={oreUrl(ore)} size={14} />{fmt(n)} <Px src={resUrl('zloto')} size={14} />{fmt(gold)}</span>
);

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


/**
 * Karta run bohatera. Runa to stała premia miejsca w ekwipunku (Broń, Hełm…), nie przedmiotu: działa na każdy
 * przedmiot założony w tym miejscu i zostaje przy każdej wymianie — gracz ma to zobaczyć od razu.
 */
export function RunesCard({ game }: { game: Game }) {
  const s = game.s;
  const any = SLOT_ORDER.some(sl => runeLvl(s, sl) > 0);
  if (s.forge.lvl < B.RUNE_FORGE_LVL && !any) return null;
  const locked = s.forge.lvl < B.RUNE_FORGE_LVL;
  const total = SLOT_ORDER.reduce((a, sl) => a + runeLvl(s, sl), 0);
  const all = any ? runeGain(s) : null;
  return (
    <section class="card runes">
      <div class="row">
        <div class="rhead"><Px src={resUrl('runa')} size={30} /><div><div class="eyebrow">Runy bohatera · na zawsze</div><div class="h">Wzmocnienie miejsc ekwipunku</div></div></div>
        <InfoBtn onClick={() => game.openModal({ kind: 'info', k: 'runes' })} label="Jak działają runy" />
      </div>
      <div class="rhow" aria-label="Jak działa runa">
        <div><span class="rh-ic"><Px src={resUrl('runa')} size={22} /></span><small>Runa siedzi w <b>miejscu</b>, nie w przedmiocie</small></div>
        <div><span class="rh-ic"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h12l-3-3M18 14H6l3 3" /></svg></span><small>Zmieniasz przedmiot — <b>premia zostaje</b></small></div>
        <div><span class="rh-ic"><Px src={resUrl('moc')} size={22} /></span><small>Bohater silniejszy <b>do końca gry</b></small></div>
      </div>
      {all && all.power > 0 ? (
        <div class="rsum">
          <span>Runy dają teraz bohaterowi</span>
          <b>{all.dmg > 0 && <>+{fmt(all.dmg)} obrażeń</>}{all.dmg > 0 && all.hp > 0 && ' · '}{all.hp > 0 && <>+{fmt(all.hp)} zdrowia</>}</b>
          <small>= +{fmt(all.power)} Mocy · {total}/{B.RUNE_MAX * SLOT_ORDER.length} poziomów</small>
        </div>
      ) : (
        <p class="sub">Każdy poziom runy to +{B.RUNE_PCT}% głównej statystyki dla <b>każdego</b> przedmiotu, który założysz w tym miejscu — dziś i po każdej wymianie.{locked ? ` Ulepszanie od ${B.RUNE_FORGE_LVL}. poziomu kuźni.` : ''}</p>
      )}
      <ul class="runelist">
        {SLOT_ORDER.map(sl => {
          const L = runeLvl(s, sl);
          const it = s.eq[sl];
          const block = runeBlock(s, sl);
          const c = L < B.RUNE_MAX ? runePay(s, L + 1) : null;
          const lackOre = !!c && !c.enough;
          // Brakuje rudy — gdzie ją farmić (kraina z największym udziałem tej rudy).
          const farm = lackOre ? farmLandFor(s, c.ore) : null;
          const here = !!farm && farm.land === s.cur.land && game.b.mode === 'camp';
          const lackGold = !!c && s.gold < c.gold;
          const now = L && it ? runeGain(s, sl) : null;
          const nxt = c && it ? runeGain(s, sl, true) : null;
          return (
            <li key={sl} class={L >= B.RUNE_MAX ? 'max' : ''}>
              <span class={`rsock${L ? ' on' : ''}`} aria-hidden="true"><SlotIcon slot={sl} /><RuneBadge lvl={L} /></span>
              <div class="cmain">
                <div class="rtop">
                  <b>{SLOTS[sl].n}</b>
                  <span class="rbonus">{L ? `+${L * B.RUNE_PCT}%` : 'bez runy'}{c && <> → <b>+{(L + 1) * B.RUNE_PCT}%</b></>}</span>
                </div>
                <small class="reff">
                  {L ? <>+{L * B.RUNE_PCT}% {runeStat(sl)} dla {runeForAll(sl)}{now ? <> · teraz <b>+{fmt(SLOTS[sl].stat === 'dmg' ? now.dmg : now.hp)}</b></> : ' · działa, gdy coś założysz'}</>
                    : <>+{B.RUNE_PCT}% {runeStat(sl)} za poziom — dla {runeForAll(sl)}</>}
                </small>
                <RuneBar s={s} lvl={L} />
                {c ? (
                  <div class="rneed">
                    <span class={lackOre ? 'lack' : ''}><Px src={oreUrl(c.ore)} size={14} />{fmt(c.n)} × {ORES[c.ore].n} <small>(masz {fmt(c.avail)})</small></span>
                    <span class={lackGold ? 'lack' : ''}><Px src={resUrl('zloto')} size={14} />{fmt(c.gold)} złota</span>
                    {lackOre && (
                      <span class="rfarm">
                        {farm ? (
                          <>
                            <small>{ORES[c.ore].n} najczęściej: <b>{LANDS[farm.land].n}</b> ({pctS(farm.pct)})</small>
                            {here ? <small class="muted">· tu walczysz</small>
                              : <button class="btn small" onClick={() => game.goLand(farm.land)}>Farmuj tam</button>}
                          </>
                        ) : <small class="muted">{c.ore === DIVINE_ORE
                          ? 'Boska Ruda: bossowie krain IV aktu, skrzynie lochów sezonowych, nagrody wydarzeń i Przepustki'
                          : `${ORES[c.ore].n} wypada w dalszych krainach i w Otchłani`}</small>}
                      </span>
                    )}
                  </div>
                ) : <div class="rneed"><small class="muted">Maksymalny poziom</small></div>}
              </div>
              <button class="btn small primary rup" disabled={!!block} title={block ?? undefined} onClick={() => game.upgradeRune(sl)}
                aria-label={L >= B.RUNE_MAX ? 'Maksymalny poziom' : `Ulepsz runę: ${SLOTS[sl].n}${nxt ? `, +${fmt(nxt.power)} Mocy` : ''}`}>
                {L >= B.RUNE_MAX ? 'maks.' : <>+1{nxt && nxt.power > 0 && <small>+{fmt(nxt.power)} Mocy</small>}</>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Przekuwanie w oknie założonego przedmiotu. */
export function Reforge({ game, it }: { game: Game; it: Item }) {
  const [cand, setCand] = useState<{ item: Item; i: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const s = game.s;
  if (s.forge.lvl < B.REFORGE_FORGE_LVL) return <p class="sub">Przekuwanie statystyk dodatkowych od {B.REFORGE_FORGE_LVL}. poziomu kuźni.</p>;
  if (!it.subs.length) return null;
  const cur = s.eq[it.slot] ?? it;
  const block = reforgeBlock(s, cur);
  const c = reforgeCost(s, cur);
  const roll = async (i: number) => {
    setBusy(true); setMsg('');
    try {
      if (!game.net) {
        const x = game.reforge(cur.slot as SlotId, i);
        if (!x) { setMsg('Nie udało się.'); return; }
        setCand({ item: x, i });
        return;
      }
      const l = getLink();
      if (!l?.online) { setMsg('Przekuwanie działa po połączeniu z serwerem.'); return; }
      if (!game.payReforge(cur.slot)) { setMsg('Za mało rudy albo złota.'); return; }
      try { setCand({ item: (await l.reforge(cur, i)).item, i }); } catch (e) { game.refundReforge(cur.slot); throw e; }
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  if (cand) {
    const old = cur.subs[cand.i];
    const neu = cand.item.subs[cand.i];
    return (
      <div class="reforge">
        <div class="eyebrow">Przekuwanie — wybierz wersję</div>
        <div class="rf-pair">
          <button class="btn" onClick={() => setCand(null)}><small>Zostaw</small><b>{subText(old)}</b></button>
          <button class="btn primary" onClick={() => { game.acceptReforge(cand.item); setCand(null); setMsg('Przedmiot przekuty.'); }}><small>Zachowaj nową</small><b>{subText(neu)}</b></button>
        </div>
      </div>
    );
  }
  return (
    <div class="reforge">
      <div class="row"><div class="eyebrow">Przekuwanie</div><CostLine ore={c.ore} n={c.n} gold={c.gold} lack={!!block} /></div>
      <ul class="rf-list">
        {cur.subs.map((x, i) => (
          <li key={i}><span>{subText(x)}</span><button class="btn small" disabled={busy || !!block} onClick={() => roll(i)}>Przekuj</button></li>
        ))}
      </ul>
      <Note msg={msg || (block && block.startsWith('za mało') ? `Brakuje: ${block.replace('za mało: ', '').replace('za mało ', '')}.` : '')} />
    </div>
  );
}
