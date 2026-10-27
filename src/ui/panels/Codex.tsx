import { LANDS } from '../../data';
import { nextSmithTitle, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { fmt } from '../format';
import type { SaveInfo } from '../App';

export function CodexPanel({ game, saveMode, onReset, onRanking }: { game: Game; saveMode: SaveInfo['mode']; onReset: () => void; onRanking: () => void }) {
  const s = game.s;
  const sm = s.smith;
  const t = smithTitle(sm.fame);
  const next = nextSmithTitle(sm.fame);
  return (
    <>
      <section class="card">
        <div class="eyebrow">Piętno Kowala</div>
        <div class="h">{t.n} {s.name}</div>
        <p class="sub">Sława kowala: <b class="num">{fmt(sm.fame)}</b>{next ? ` · do tytułu ${next.n}: ${fmt(next.at - sm.fame)}` : ''}</p>
        {next && <div class="bar" style={{ marginTop: '8px' }}><i style={{ width: Math.min(100, ((sm.fame - t.at) / (next.at - t.at)) * 100) + '%' }} /></div>}
        <p class="sub" style={{ marginTop: '10px' }}>
          Rzadkie i lepsze przedmioty, które sprzedajesz, z szansą 30% trafiają do Wielkiego Obiegu. Gdy ktoś je znajdzie, dostajesz Sławę. Do czasu podłączenia serwera inni gracze są symulowani.
        </p>
      </section>
      {(saveMode === 'server' || saveMode === 'offline') && (
        <section class="card">
          <div class="row">
            <div><div class="eyebrow">Serwer gry</div><div class="h">Rankingi</div></div>
            <button class="btn primary small" disabled={saveMode !== 'server'} onClick={onRanking}>Pokaż</button>
          </div>
          <p class="sub">Moc, Wieża Wyzwań i postęp w kampanii. Serwer liczy Moc sam z twojego zapisu.</p>
        </section>
      )}
      <section class="card">
        <div class="eyebrow">Wieści z Obiegu</div>
        {sm.log.length ? (
          <ul class="log" style={{ marginTop: '8px' }}>{sm.log.map((l, i) => <li key={i}><time>{l.t}</time>{l.m}</li>)}</ul>
        ) : <p class="sub">Jeszcze nic. Sprzedaj kilka Rzadkich przedmiotów.</p>}
      </section>
      <section class="card">
        <div class="eyebrow">Statystyki</div>
        <div class="stats" style={{ marginTop: '8px' }}>
          <div class="stat"><small>Wytopy</small><b>{fmt(s.stats.smelted)}</b></div>
          <div class="stat"><small>Przeskoki</small><b>{fmt(s.stats.jumps)}</b></div>
          <div class="stat"><small>Wrogowie</small><b>{fmt(s.stats.kills)}</b></div>
          <div class="stat"><small>Bossowie</small><b>{fmt(s.stats.bosses)}</b></div>
          <div class="stat"><small>Krainy</small><b>{s.cleared.filter(Boolean).length}/{LANDS.length}</b></div>
          <div class="stat"><small>Sztolnia</small><b>{s.dungeons.sztolnia.best || '—'}</b></div>
          <div class="stat"><small>Wieża Wyzwań</small><b>{s.dungeons.wieza.best || '—'}</b></div>
          <div class="stat"><small>Technologie</small><b>{Object.values(s.tech.lv).reduce((a, b) => a + (b ?? 0), 0)}</b></div>
        </div>
      </section>
      <section class="card settings">
        <div class="eyebrow">Ustawienia</div>
        <label class="field" for="nick">
          Imię kowala (podpis na nowych przedmiotach)
          <input id="nick" maxLength={16} defaultValue={s.name} autoComplete="off"
            onChange={e => { const el = e.currentTarget; el.value = game.setName(el.value); }} />
        </label>
        <div class="row">
          <span class="sub">Dźwięki kucia, walki i nagród.</span>
          <button class={`toggle${s.opts.sound ? ' on' : ''}`} aria-pressed={s.opts.sound} onClick={() => game.setSound(!s.opts.sound)}><span class="knob" />Dźwięki</button>
        </div>
        {s.opts.sound && (
          <label class="field" for="vol">
            Głośność: {Math.round(s.opts.vol * 100)}%
            <input id="vol" type="range" min={0} max={100} step={5} value={Math.round(s.opts.vol * 100)}
              onInput={e => game.setSound(true, Number(e.currentTarget.value) / 100)} />
          </label>
        )}
        <div class="row">
          <span class="sub">Tempo testowe ×10 przyspiesza walkę i timery, żeby szybciej sprawdzić progresję.</span>
          <button class={`toggle${s.speed > 1 ? ' on' : ''}`} aria-pressed={s.speed > 1} onClick={() => game.toggleSpeed()}><span class="knob" />Tempo ×10</button>
        </div>
        <div class="row">
          <span class="sub">{saveMode === 'server' ? 'Postęp zapisuje się na serwerze gry.' : saveMode === 'cloud' ? 'Postęp zapisuje się w chmurze — zagrasz dalej na innym urządzeniu.' : 'Postęp zapisuje się w tej przeglądarce.'}</span>
          <button class="btn danger small" onClick={onReset}>Zacznij od nowa</button>
        </div>
      </section>
    </>
  );
}
