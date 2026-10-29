import { useEffect, useState } from 'preact/hooks';
import { FRAME_IDS, LANDS, SKIN_IDS } from '../../data';
import { Avatar } from '../Avatar';
import { nextSmithTitle, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import type { GameState } from '../../engine/types';
import { ServerError, getLink } from '../../save/server';
import { fmt } from '../format';
import type { SaveInfo } from '../App';
import { APP_VERSION, canInstall, install, isIOS, isNative, isStandalone, onPwa } from '../pwa';
import { CodexCard } from './Achievements';

/** Adres gry do zaproszeń: z ustawień builda (aplikacja) albo adres tej strony. */
const publicUrl = () => {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (env) return env;
  const local = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
  return local || isNative() || location.protocol === 'file:' ? '' : location.origin + location.pathname;
};

/** Aplikacja i test: wersja gry, instalacja na telefonie, zaproszenie znajomych i zgłaszanie uwag. */
function AppCard({ game, onFeedback }: { game: Game; onFeedback: () => void }) {
  const [, force] = useState(0);
  const [msg, setMsg] = useState('');
  useEffect(() => onPwa(() => force(x => x + 1)), []);
  const url = publicUrl();
  const invite = async () => {
    const text = `Zagraj ze mną w Kuźnię Legend — wykuwamy legendarny ekwipunek! Mój nick: ${game.s.name}.`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Kuźnia Legend', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setMsg('Skopiowano zaproszenie — wklej je znajomym.');
    } catch { /* anulowane */ }
  };
  return (
    <section class="card" aria-label="Aplikacja i test">
      <div class="eyebrow">Aplikacja · wersja {APP_VERSION}</div>
      <div class="h">Test gry</div>
      <div class="app-actions">
        {game.net && <button class="btn primary small" onClick={onFeedback}>Zgłoś uwagę lub błąd</button>}
        {url && <button class="btn small" onClick={invite}>Zaproś znajomych</button>}
        {canInstall() && <button class="btn small" onClick={() => void install()}>Zainstaluj grę</button>}
      </div>
      {!isNative() && !isStandalone() && !canInstall() && (
        <p class="sub" style={{ marginTop: '8px' }}>
          {isIOS() ? 'Na iPhonie: w Safari stuknij „Udostępnij”, potem „Do ekranu początkowego” — gra otworzy się jak aplikacja.' : 'Grę możesz dodać do ekranu głównego z menu przeglądarki („Zainstaluj aplikację” albo „Dodaj do ekranu głównego”).'}
        </p>
      )}
      {isStandalone() && <p class="sub" style={{ marginTop: '8px' }}>Gra jest zainstalowana na tym urządzeniu.</p>}
      {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
    </section>
  );
}

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');
const showCode = (c: string) => c.slice(0, 4) + '-' + c.slice(4);

/** Nick na serwerze: unikalny, zmiana przez serwer (raz na dobę). */
function NickField({ game, online }: { game: Game; online: boolean }) {
  const [v, setV] = useState(game.s.name);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(game.s.name), [game.s.name]); // nick nadany przez serwer
  const save = async (e: Event) => {
    e.preventDefault();
    const link = getLink();
    if (!link) return;
    setBusy(true); setMsg('');
    try {
      const r = await link.nameSet(v);
      game.applyServerName(r.name);
      setV(r.name);
      setMsg(`Twój nick: ${r.name}. Nowe przedmioty będą nosić to piętno.`);
    } catch (x) { setMsg(errText(x)); } finally { setBusy(false); }
  };
  return (
    <form class="field" onSubmit={save}>
      <label for="nick">Nick (unikalny na serwerze, podpis na nowych przedmiotach)</label>
      <div class="chat-in">
        <input id="nick" maxLength={16} value={v} autoComplete="off" onInput={e => { setV(e.currentTarget.value); setMsg(''); }} />
        <button class="btn small" disabled={!online || busy || v.trim() === game.s.name || v.trim().length < 3}>Zmień</button>
      </div>
      <small class="muted">{msg || '3–16 znaków: litery, cyfry, spacja, _ . -. Zmiana raz na dobę (pierwsza zmiana nadanego nicku — od razu).'}</small>
    </form>
  );
}

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

export function CodexPanel({ game, save, onReset, onRanking, onFeedback }: { game: Game; save: SaveInfo; onReset: () => void; onRanking: () => void; onFeedback: () => void }) {
  const saveMode = save.mode;
  const s = game.s;
  const sm = s.smith;
  const t = smithTitle(sm.fame);
  const next = nextSmithTitle(sm.fame);
  return (
    <>
      <section class="card">
        <div class="smith-head">
          <button class="avbtn" onClick={() => game.openModal({ kind: 'look' })} aria-label="Wygląd: stroje i ramki"><Avatar skin={s.look.skin} frame={s.look.frame} size={52} /></button>
          <div>
            <div class="eyebrow">Piętno Kowala</div>
            <div class="h">{t.n} {s.name}</div>
            <button class="linkbtn" onClick={() => game.openModal({ kind: 'look' })}>Wygląd · stroje {s.look.skins.length}/{SKIN_IDS.length}, ramki {s.look.frames.length}/{FRAME_IDS.length}</button>
          </div>
        </div>
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
      <CodexCard game={game} />
      <AppCard game={game} onFeedback={onFeedback} />
      {game.net && <AccountCard game={game} save={save} />}
      <ObiegNews log={sm.log} />
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
        {game.net ? <NickField game={game} online={saveMode === 'server'} /> : (
          <label class="field" for="nick">
            Imię kowala (podpis na nowych przedmiotach)
            <input id="nick" key={s.name} maxLength={16} defaultValue={s.name} autoComplete="off"
              onChange={e => { const el = e.currentTarget; el.value = game.setName(el.value); }} />
          </label>
        )}
        <div class="row">
          <span class="sub">Dźwięki kucia, walki i nagród.</span>
          <button class={`toggle${s.opts.sound ? ' on' : ''}`} aria-pressed={s.opts.sound} onClick={() => game.setSound(!s.opts.sound)}><span class="knob" />Dźwięki</button>
        </div>
        {s.opts.sound && (
          <label class="field" for="vol">
            Głośność dźwięków: {Math.round(s.opts.vol * 100)}%
            <input id="vol" type="range" min={0} max={100} step={5} value={Math.round(s.opts.vol * 100)}
              onInput={e => game.setSound(true, Number(e.currentTarget.value) / 100)} />
          </label>
        )}
        <div class="row">
          <span class="sub">Muzyka w tle: krainy, lochy, bossowie.</span>
          <button class={`toggle${s.opts.music ? ' on' : ''}`} aria-pressed={s.opts.music} onClick={() => game.setMusic(!s.opts.music)}><span class="knob" />Muzyka</button>
        </div>
        {s.opts.music && (
          <label class="field" for="mvol">
            Głośność muzyki: {Math.round(s.opts.mvol * 100)}%
            <input id="mvol" type="range" min={0} max={100} step={5} value={Math.round(s.opts.mvol * 100)}
              onInput={e => game.setMusic(true, Number(e.currentTarget.value) / 100)} />
          </label>
        )}
        {isNative() && (
          <div class="row">
            <span class="sub">Powiadomienia: kuźnia gotowa, koniec badania, wyklute jajo.</span>
            <button class={`toggle${s.opts.notify ? ' on' : ''}`} aria-pressed={s.opts.notify} onClick={() => game.setNotify(!s.opts.notify)}><span class="knob" />Powiadomienia</button>
          </div>
        )}
        <p class="sub credits">Muzyka: eBunny, Sonican · dźwięki walki: Floraphonic, Voicebosch, Magiaz (Pixabay).</p>
        {game.speeds.length > 1 && (
          <div class="speed-set">
            <span class="sub">Tempo testowe przyspiesza walkę, kuźnię, badania i inne timery, żeby szybciej sprawdzić progresję.{game.net ? ' Działa, bo serwer ma włączony tryb testowy.' : ''}</span>
            <div class="seg speed-seg" role="radiogroup" aria-label="Tempo testowe">
              {game.speeds.map(v => (
                <button key={v} role="radio" aria-checked={s.speed === v} class={s.speed === v ? 'on' : ''} onClick={() => game.setSpeed(v)}>×{v}</button>
              ))}
            </div>
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

/** Wieści z Obiegu: kilka ostatnich, zwięźle; wpisy „trafił do Obiegu” połączone w jeden z licznikiem. */
function ObiegNews({ log }: { log: GameState['smith']['log'] }) {
  const [all, setAll] = useState(false);
  const shown = all ? log : log.slice(0, 4);
  const text = (l: GameState['smith']['log'][number]) =>
    l.k === 'sent' ? ((l.n ?? 1) > 1 ? `Do Obiegu trafiło ${l.n} twoich przedmiotów (ostatni: ${l.m}).` : `${l.m} trafił do Wielkiego Obiegu.`) : l.m;
  return (
    <section class="card">
      <div class="row">
        <div class="eyebrow">Wieści z Obiegu</div>
        {log.length > 4 && <button class="linkbtn" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Mniej' : `Wszystkie (${log.length})`}</button>}
      </div>
      {log.length ? (
        <ul class="log compact">{shown.map((l, i) => <li key={i} class={l.k === 'sent' ? 'sent' : 'found'}><time>{l.t}</time><span>{text(l)}</span></li>)}</ul>
      ) : <p class="sub">Jeszcze nic. Sprzedaj kilka Rzadkich przedmiotów.</p>}
    </section>
  );
}
