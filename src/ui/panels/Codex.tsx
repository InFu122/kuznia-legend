import { useState } from 'preact/hooks';
import { LANDS } from '../../data';
import { nextSmithTitle, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import { ServerError, getLink } from '../../save/server';
import { fmt } from '../format';
import type { SaveInfo } from '../App';

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');
const showCode = (c: string) => c.slice(0, 4) + '-' + c.slice(4);

/** Przeniesienie konta: kod z jednego urządzenia wpisany na drugim — oba grają tym samym kowalem. */
function AccountCard({ game, save }: { game: Game; save: SaveInfo }) {
  const [code, setCode] = useState<{ code: string; exp: number } | null>(null);
  const [input, setInput] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const online = save.mode === 'server';
  const link = getLink();
  const left = code && link ? Math.max(0, code.exp - (Date.now() + link.offset)) : 0;
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const make = async () => {
    if (!link) return;
    setBusy(true); setMsg('');
    try { setCode(await link.transferCode()); } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  const use = async () => {
    if (!save.redeem) return;
    setBusy(true); setMsg('');
    try {
      await save.redeem(clean);
      setMsg(`Gotowe — grasz kowalem ${game.s.name} z drugiego urządzenia.`);
      setInput(''); setConfirm(false); setCode(null);
    } catch (e) { setMsg(errText(e)); setConfirm(false); } finally { setBusy(false); }
  };

  return (
    <section class="card" aria-label="Konto">
      <div class="eyebrow">Konto</div>
      <div class="h">Gra na kilku urządzeniach</div>
      <p class="sub">Na urządzeniu, na którym masz postęp, pokaż kod. Na drugim urządzeniu wpisz go poniżej — od tej chwili oba grają tym samym kowalem.</p>
      {code && left > 0 ? (
        <>
          <div class="tcode" aria-label="Kod przeniesienia">{showCode(code.code)}</div>
          <p class="sub" style={{ textAlign: 'center' }}>Ważny jeszcze {Math.floor(left / 60000)}:{String(Math.floor(left / 1000) % 60).padStart(2, '0')} · działa jeden raz</p>
        </>
      ) : (
        <div style={{ marginTop: '10px' }}>
          <button class="btn primary small" disabled={!online || busy} onClick={make}>{code ? 'Kod wygasł — pokaż nowy' : 'Pokaż kod'}</button>
        </div>
      )}
      <label class="field" for="tcode" style={{ marginTop: '12px' }}>
        Masz kod z innego urządzenia?
        <input id="tcode" class="tcode-in" maxLength={9} placeholder="XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellcheck={false}
          value={input} onInput={e => { setInput(e.currentTarget.value); setConfirm(false); }} />
      </label>
      {!confirm ? (
        <div style={{ marginTop: '8px' }}>
          <button class="btn small" disabled={!online || busy || clean.length !== 8} onClick={() => setConfirm(true)}>Połącz z kontem z kodu</button>
        </div>
      ) : (
        <div class="confirm" role="alertdialog" style={{ marginTop: '8px' }}>
          <span>Postęp na tym urządzeniu ({game.s.name}, kuźnia {game.s.forge.lvl}) zostanie zastąpiony kowalem z kodu. Połączyć?</span>
          <div class="btnrow">
            <button class="btn danger small" disabled={busy} onClick={use}>Tak, połącz</button>
            <button class="btn small" disabled={busy} onClick={() => setConfirm(false)}>Anuluj</button>
          </div>
        </div>
      )}
      {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
      {!online && <div class="lockline">Potrzebne połączenie z serwerem.</div>}
    </section>
  );
}

export function CodexPanel({ game, save, onReset, onRanking }: { game: Game; save: SaveInfo; onReset: () => void; onRanking: () => void }) {
  const saveMode = save.mode;
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
          {game.net
            ? 'Rzadkie i lepsze przedmioty, które sprzedajesz, z szansą 30% trafiają do Wielkiego Obiegu — do skrzyń bossów i Zbrojowni innych graczy na tym serwerze. Gdy ktoś znajdzie twój przedmiot, dostajesz Sławę. Gdy w Obiegu brakuje przedmiotów graczy, skrzynie uzupełniają kowale-widma.'
            : 'Rzadkie i lepsze przedmioty, które sprzedajesz, z szansą 30% trafiają do Wielkiego Obiegu. Gdy ktoś je znajdzie, dostajesz Sławę. Bez serwera gry inni gracze są symulowani.'}
        </p>
      </section>
      {(saveMode === 'server' || saveMode === 'offline' || saveMode === 'connecting') && (
        <section class="card">
          <div class="row">
            <div><div class="eyebrow">Serwer gry</div><div class="h">Rankingi</div></div>
            <button class="btn primary small" disabled={saveMode !== 'server'} onClick={onRanking}>Pokaż</button>
          </div>
          <p class="sub">Moc, Wieża Wyzwań, postęp w kampanii i arena. Serwer liczy Moc sam z twojego zapisu.</p>
          {saveMode === 'server' && getLink()?.power != null && (
            <p class="sub" style={{ marginTop: '6px' }}>
              Moc w rankingu: <b class="num">{fmt(getLink()!.power!)}</b>
              {getLink()!.unverified.length > 0 && ` · ${getLink()!.unverified.length} z założonych przedmiotów się nie liczy (serwer nie zna ich pochodzenia)`}
            </p>
          )}
          {saveMode !== 'server' && save.reason && (
            <div class="lockline">
              Brak połączenia: {save.reason}
              {save.retry && <div style={{ marginTop: '8px' }}><button class="btn small" onClick={save.retry}>Połącz ponownie</button></div>}
            </div>
          )}
          {save.error && <div class="lockline">Serwer odrzucił zapis: {save.error}</div>}
        </section>
      )}
      {game.net && <AccountCard game={game} save={save} />}
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
          <input id="nick" key={s.name} maxLength={16} defaultValue={s.name} autoComplete="off"
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
        {!game.net && (
          <div class="row">
            <span class="sub">Tempo testowe ×10 przyspiesza walkę i timery, żeby szybciej sprawdzić progresję.</span>
            <button class={`toggle${s.speed > 1 ? ' on' : ''}`} aria-pressed={s.speed > 1} onClick={() => game.toggleSpeed()}><span class="knob" />Tempo ×10</button>
          </div>
        )}
        <div class="row">
          <span class="sub">{saveMode === 'server' ? 'Postęp zapisuje się na serwerze gry.' : saveMode === 'cloud' ? 'Postęp zapisuje się w chmurze — zagrasz dalej na innym urządzeniu.' : 'Postęp zapisuje się w tej przeglądarce.'}</span>
          <button class="btn danger small" onClick={onReset}>Zacznij od nowa</button>
        </div>
      </section>
    </>
  );
}
