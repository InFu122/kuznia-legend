import { ELEM, LANDS, ORES, ROMAN } from '../../data';
import { recPower } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { fmt, pctS } from '../format';

export function LandsPanel({ game }: { game: Game }) {
  const s = game.s;
  const pw = game.stats.power;
  return (
    <>
      <section class="card">
        <div class="eyebrow">Gdzie farmić</div>
        <p class="sub">Każda kraina ma własną główną rudę, rzadką rudę i domieszkę. Możesz wrócić do pokonanej krainy, żeby farmić jej rudy bez ryzyka.</p>
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
              <div key={L.n} class={`landrow${cur ? ' cur' : ''}${locked ? ' locked' : ''}`}>
                <div>
                  <span class="ln">{L.n}</span>
                  {s.cleared[i] ? <span class="lstat done">Pokonana</span> : i === s.maxLand ? <span class="lstat front">Front</span> : null}
                </div>
                {locked ? <span class="sub">Zablokowana</span> : cur ? <span class="sub">Tu walczysz</span> : <button class="btn small" onClick={() => game.goLand(i)}>Walcz tutaj</button>}
                <div class="lm">
                  Ruda: {ORES[L.main].n} · rzadka: {ORES[L.rare].n} {pctS(L.rc * 100)} na falę{L.el ? ' · domieszka: ' + ELEM[L.el].n : ''}
                  <br />Boss: {L.boss} · zalecana Moc: <span class={cls}>{fmt(rec)}</span>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
