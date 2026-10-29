// Krainy: karty z pixel-artowym tłem krainy, rudami (ikony i szanse), bossem i zalecaną Mocą.
import { ELEM, LANDS, ORES, ROMAN, isRareOre } from '../../data';
import { elemUrl, landBgUrl, oreUrl } from '../../art/render';
import { recPower } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { fmt, pctS } from '../format';
import { Px } from '../Px';

export function LandsPanel({ game, onInfo }: { game: Game; onInfo: (land: number) => void }) {
  const s = game.s;
  const pw = game.stats.power;
  return (
    <>
      <section class="card">
        <div class="eyebrow">Gdzie farmić</div>
        <p class="sub">Każda kraina ma własny rozkład rud i domieszkę. Rzadsze rudy pojawiają się z małą szansą i rosną kraina po krainie. Do pokonanej krainy możesz wrócić, żeby farmić jej rudy bez ryzyka.</p>
      </section>
      {[1, 2, 3, 4].map(a => (
        <section class="act" key={a}>
          <div class="act-h">Akt {ROMAN[a]}</div>
          {LANDS.map((L, i) => {
            if (L.act !== a) return null;
            const locked = i > s.maxLand;
            const cur = i === s.cur.land && game.b.mode === 'camp';
            const rec = recPower(i);
            const cls = pw >= rec ? 'pw-ok' : pw >= rec * 0.7 ? 'pw-mid' : 'pw-low';
            return (
              <div key={L.n} class={`landcard${cur ? ' cur' : ''}${locked ? ' locked' : ''}`} style={{ '--bg': `url(${landBgUrl(i)})` } as Record<string, string>}>
                <div class="lc-top">
                  <div class="lc-name">
                    <span class="ln">{L.n}</span>
                    {s.cleared[i] ? <span class="lstat done">Pokonana</span> : i === s.maxLand ? <span class="lstat front">Front</span> : null}
                  </div>
                  <button class="info" onClick={() => onInfo(i)} aria-label={`Co wypada: ${L.n}`}>i</button>
                </div>
                <div class="lc-bot">
                  <div class="lc-info">
                    <div class="lc-ores">
                      {L.drops.map(([o, p]) => <span key={o} class={`lo${isRareOre(L, o) ? ' rare' : ''}`} title={ORES[o].n}><Px src={oreUrl(o)} size={16} />{pctS(p)}</span>)}
                      {L.el && <span class="lo" title={`Domieszka: ${ELEM[L.el].n}`}><Px src={elemUrl(L.el)} size={16} />4%</span>}
                    </div>
                    <div class="lc-boss">Boss: {L.boss} · Moc <span class={cls}>{fmt(rec)}</span></div>
                  </div>
                  {locked ? <span class="lc-lock">Zablokowana</span> : cur ? <span class="lc-here">Tu walczysz</span> : <button class="btn small primary" onClick={() => game.goLand(i)}>Walcz tutaj</button>}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
