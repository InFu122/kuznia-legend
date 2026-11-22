import { useEffect, useState } from 'preact/hooks';
import { FRAME_IDS, LANDS, SKIN_IDS } from '../../data';
import { Avatar } from '../Avatar';
import { showProfile } from '../profile';
import { nextSmithTitle, smithTitle } from '../../engine/formulas';
import { abyssCleared } from '../../engine/achievements';
import { pl } from '../texts';
import type { Game } from '../../engine/game';
import { ServerError, getLink } from '../../save/server';
import { fmt } from '../format';
import type { SaveInfo } from '../App';
import { APP_VERSION, canInstall, install, isIOS, isNative, isStandalone, onPwa } from '../pwa';
import { checkStoreUpdate, nativeVersion, onStoreUpdate, storeUpdateReady, updateFromStore } from '../storeupdate';
import { CodexCard } from './Achievements';
import { adsNative, privacyOptionsNeeded, showPrivacyOptions } from '../ads';
import { GoogleLinkBox } from '../GoogleLink';
import { googleAvailable } from '../../save/google';

/** Adres gry do zaproszeń: z ustawień builda (aplikacja) albo adres tej strony. */
const publicUrl = () => {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (env) return env;
  const local = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
  return local || isNative() || location.protocol === 'file:' ? '' : location.origin + location.pathname;
};

/** Strona na serwerze gry (polityka prywatności, usuwanie konta) albo pusto, gdy gra nie zna swojego adresu. */
const pageUrl = (file: string) => {
  const base = publicUrl();
  return base ? new URL(file, base.endsWith('/') ? base : base + '/').href : '';
};

/** Aplikacja i test: wersja gry, instalacja na telefonie, zaproszenie znajomych i zgłaszanie uwag. */
function AppCard({ game, onFeedback }: { game: Game; onFeedback: () => void }) {
  const [, force] = useState(0);
  const [msg, setMsg] = useState('');
  const [nv, setNv] = useState<{ name: string; code: string } | null>(null);
  useEffect(() => onPwa(() => force(x => x + 1)), []);
  useEffect(() => onStoreUpdate(() => force(x => x + 1)), []);
  useEffect(() => { void nativeVersion().then(setNv); }, []);
  const url = publicUrl();
  const link = game.net ? getLink() : null;
  // Narzędzia dewelopera: bez serwera 7 dotknięć wersji gry je włącza (jak na Androidzie); z serwerem — konto z sekrety/dev.txt.
  const [taps, setTaps] = useState(0);
  const [devLocal, setDevLocal] = useState(() => { try { return localStorage.getItem('kl-dev') === '1'; } catch { return false; } });
  const devOn = game.net ? !!link?.dev : devLocal;
  const tapVersion = () => {
    const n = taps + 1;
    setTaps(n);
    if (n < 7) return;
    setTaps(0);
    if (game.net) { setMsg(link?.dev ? 'Narzędzia dewelopera są włączone (niżej).' : 'To konto nie jest kontem dewelopera: dopisz jego „ID konta” do pliku sekrety/dev.txt na serwerze.'); return; }
    const on = !devLocal;
    try { localStorage.setItem('kl-dev', on ? '1' : '0'); } catch { /* bez pamięci */ }
    setDevLocal(on);
    setMsg(on ? 'Narzędzia dewelopera włączone.' : 'Narzędzia dewelopera wyłączone.');
  };
  /** „Sprawdź aktualizację” (aplikacja): pyta Google Play. */
  const check = async () => {
    setMsg('Sprawdzam w Google Play…');
    const r = await checkStoreUpdate();
    setMsg(r === true ? 'Jest nowa wersja — naciśnij „Aktualizuj”.' : r === false ? 'Masz najnowszą wersję gry.'
      : 'Nie udało się sprawdzić (gra nie jest zainstalowana ze Sklepu Play albo brak internetu).');
  };
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
      <div class="eyebrow" onClick={tapVersion}>Aplikacja · wersja {nv ? `${nv.name} (${nv.code})` : APP_VERSION}</div>
      <div class="h">Test gry</div>
      <div class="app-actions">
        {game.net && <button class="btn primary small" onClick={onFeedback}>Zgłoś uwagę lub błąd</button>}
        <button class="btn small" onClick={() => game.openModal({ kind: 'changelog', all: true })}>Co nowego</button>
        {url && <button class="btn small" onClick={invite}>Zaproś znajomych</button>}
        {canInstall() && <button class="btn small" onClick={() => void install()}>Zainstaluj grę</button>}
        {isNative() && (storeUpdateReady()
          ? <button class="btn small primary" onClick={() => void updateFromStore()}>Aktualizuj</button>
          : <button class="btn small" onClick={() => void check()}>Sprawdź aktualizację</button>)}
      </div>
      {nv && <p class="sub" style={{ marginTop: '8px' }}>Kompilacja gry: {APP_VERSION}</p>}
      {!isNative() && !isStandalone() && !canInstall() && (
        <p class="sub" style={{ marginTop: '8px' }}>
          {isIOS() ? 'Na iPhonie: w Safari stuknij „Udostępnij”, potem „Do ekranu początkowego” — gra otworzy się jak aplikacja.' : 'Grę możesz dodać do ekranu głównego z menu przeglądarki („Zainstaluj aplikację” albo „Dodaj do ekranu głównego”).'}
        </p>
      )}
      {isStandalone() && <p class="sub" style={{ marginTop: '8px' }}>Gra jest zainstalowana na tym urządzeniu.</p>}
      {link?.uid && (
        <p class="sub acc-id" style={{ marginTop: '8px' }}>
          ID konta: <code>{link.uid}</code>
          <button class="linkbtn" onClick={() => { void navigator.clipboard?.writeText(link.uid ?? '').then(() => setMsg('Skopiowano ID konta.')).catch(() => {}); }}>Kopiuj</button>
        </p>
      )}
      {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
      {devOn && <DevTools game={game} />}
      <PrivacyLinks />
    </section>
  );
}

/**
 * Narzędzia dewelopera: przeskakiwanie etapów gry do testów. Z serwerem tylko dla kont z pliku sekrety/dev.txt
 * (serwer przyjmuje wtedy zapis bez sprawdzania i trzyma konto poza rankingami, areną i wojną klanów).
 */
function DevTools({ game }: { game: Game }) {
  const [ask, setAsk] = useState(false);
  const [note, setNote] = useState('');
  const run = (what: Parameters<Game['dev']>[0], text: string) => { game.dev(what); setNote(text); };
  const max = async () => {
    setAsk(false);
    game.dev('max');
    setNote('Wszystko na maksimum.');
    const l = game.net ? getLink() : null;
    if (l?.dev) {
      try { const r = await l.devGems(100000); game.s.gems = r.gems; game.dev('finish'); setNote(`Wszystko na maksimum · Klejnoty: ${r.gems.toLocaleString('pl-PL')}.`); }
      catch { setNote('Wszystko na maksimum (Klejnotów serwer nie dopisał).'); }
    }
  };
  return (
    <div class="devtools">
      <div class="eyebrow">Narzędzia dewelopera</div>
      <p class="sub">Do testów: przeskakują etapy gry. {game.net ? 'To konto nie trafia do rankingów, na arenę ani do wojny klanów.' : 'Działają tylko w tej przeglądarce.'}</p>
      {ask ? (
        <div class="dev-ask">
          <p class="sub">Wszystko na maksimum: kuźnia 200, ostatnia kraina kampanii, Boski ekwipunek z legendą, runy, badania, umiejętności, chowańce i wierzchowce na maks., dużo zasobów. Tego nie da się cofnąć.</p>
          <div class="result-actions">
            <button class="btn" onClick={() => setAsk(false)}>Anuluj</button>
            <button class="btn danger" onClick={() => void max()}>Tak, wszystko na maks.</button>
          </div>
        </div>
      ) : (
        <div class="dev-grid">
          <button class="btn danger small" onClick={() => setAsk(true)}>Wszystko na maks.</button>
          <button class="btn small" onClick={() => run('land', `Kraina ${game.s.maxLand + 2} otwarta.`)}>Następna kraina</button>
          <button class="btn small" onClick={() => run('lastLand', 'Ostatnia kraina kampanii otwarta.')}>Koniec kampanii</button>
          <button class="btn small" onClick={() => run('forge10', `Kuźnia: poziom ${Math.min(200, game.s.forge.lvl + 10)}.`)}>Kuźnia +10</button>
          <button class="btn small" onClick={() => run('finish', 'Ukończono ulepszenie, badanie i jajo.')}>Ukończ czekanie</button>
          <button class="btn small" onClick={() => run('res', 'Dorzucono zasoby.')}>Dorzuć zasoby</button>
        </div>
      )}
      {note && <p class="sub" role="status">{note}</p>}
    </div>
  );
}

/** Polityka prywatności i (w aplikacji) zmiana zgody na reklamy — formularz Google dla graczy z UE. */
function PrivacyLinks() {
  const [ads, setAds] = useState(false);
  useEffect(() => { if (adsNative()) void privacyOptionsNeeded().then(setAds); }, []);
  const url = pageUrl('polityka-prywatnosci.html');
  if (!url && !ads) return null;
  return (
    <div class="pf-links" style={{ marginTop: '8px' }}>
      {url && <a class="linkbtn" href={url} target="_blank" rel="noopener">Polityka prywatności</a>}
      {ads && <button class="linkbtn" onClick={() => void showPrivacyOptions().catch(() => {})}>Prywatność reklam</button>}
    </div>
  );
}

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');

/** Usunięcie konta na serwerze (wymóg Google Play). Potwierdzenie słowem „USUŃ”, potem gra startuje od zera. */
function DeleteAccount({ save, online }: { save: SaveInfo; online: boolean }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const ok = ['USUŃ', 'USUN'].includes(word.trim().toUpperCase());
  const go = async () => {
    if (!save.deleteAccount || !ok) return;
    setBusy(true); setMsg('');
    try {
      await save.deleteAccount(word.trim().toUpperCase());
      setMsg('Konto usunięte. Gra za chwilę uruchomi się od nowa.');
    } catch (e) {
      setMsg(errText(e));
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <div style={{ marginTop: '14px' }}>
        <button class="linkbtn danger-link" disabled={!online} onClick={() => setOpen(true)}>Usuń konto…</button>
      </div>
    );
  }
  return (
    <div class="confirm" role="alertdialog" aria-label="Usunięcie konta" style={{ marginTop: '14px' }}>
      <span>
        Usuniemy z serwera wszystko, co dotyczy tego kowala: postęp, przedmioty, Klejnoty (także kupione), przepustkę,
        nick, miejsce w klanie i rankingach oraz twoje wiadomości na czacie. Tego nie da się cofnąć. Konto znika też na
        innych urządzeniach połączonych kodem.
      </span>
      <label class="field" for="delword" style={{ marginTop: '8px' }}>
        Wpisz USUŃ, żeby potwierdzić
        <input id="delword" maxLength={8} autoComplete="off" autoCapitalize="characters" spellcheck={false} value={word}
          onInput={e => { setWord(e.currentTarget.value); setMsg(''); }} />
      </label>
      <div class="btnrow">
        <button class="btn danger small" disabled={!ok || busy || !online} onClick={() => void go()}>Usuń konto na zawsze</button>
        <button class="btn small" disabled={busy} onClick={() => { setOpen(false); setWord(''); setMsg(''); }}>Anuluj</button>
      </div>
      {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
    </div>
  );
}
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
      {googleAvailable() && link && (
        <>
          <div class="h">Konto Google</div>
          <p class="sub">Postęp połączony z kontem Google wczytasz na nowym telefonie albo po ponownej instalacji gry — bez kodu.</p>
          <GoogleLinkBox game={game} online={online} />
          <div class="h" style={{ marginTop: '14px' }}>Kod przeniesienia</div>
        </>
      )}
      {!(googleAvailable() && link) && <div class="h">Gra na kilku urządzeniach</div>}
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
      {save.deleteAccount && <DeleteAccount save={save} online={online} />}
    </section>
  );
}

export function CodexPanel({ game, save, onReset, onRanking, onFeedback }: { game: Game; save: SaveInfo; onReset: () => void; onRanking: () => void; onFeedback: () => void }) {
  const saveMode = save.mode;
  const s = game.s;
  const t = smithTitle(s.smith.fame);
  const next = nextSmithTitle(s.smith.fame);
  return (
    <>
      <section class="card">
        <div class="smith-head">
          <button class="avbtn" onClick={() => game.openModal({ kind: 'look' })} aria-label="Wygląd: stroje i ramki"><Avatar skin={s.look.skin} frame={s.look.frame} size={52} /></button>
          <div>
            <div class="eyebrow">Piętno Kowala</div>
            <div class="h">{t.n} {s.name}</div>
            <div class="pf-links">
              <button class="linkbtn" onClick={() => game.openModal({ kind: 'look' })}>Wygląd · stroje {s.look.skins.length}/{SKIN_IDS.length}, ramki {s.look.frames.length}/{FRAME_IDS.length}</button>
              <button class="linkbtn" onClick={() => showProfile(null)}>Mój profil</button>
            </div>
          </div>
        </div>
        <p class="sub" style={{ marginTop: '8px' }}>
          Sława kowala: <b class="num">{fmt(s.smith.fame)}</b>{next ? ` · do tytułu ${next.n}: ${fmt(next.at - s.smith.fame)}` : ''}. Sławę dają progi osiągnięć (Menu → Zadania → Osiągnięcia).
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
      <section class="card">
        <div class="eyebrow">Statystyki</div>
        <div class="stats" style={{ marginTop: '8px' }}>
          <div class="stat"><small>Wytopy</small><b>{fmt(s.stats.smelted)}</b></div>
          <div class="stat"><small>Przeskoki</small><b>{fmt(s.stats.jumps)}</b></div>
          <div class="stat"><small>Wrogowie</small><b>{fmt(s.stats.kills)}</b></div>
          <div class="stat"><small>Bossowie</small><b>{fmt(s.stats.bosses)}</b></div>
          <div class="stat"><small>Krainy</small><b>{s.cleared.slice(0, LANDS.length).filter(Boolean).length}/{LANDS.length}</b></div>
          {abyssCleared(s) > 0 && <div class="stat"><small>Otchłań</small><b>{abyssCleared(s)} {pl(abyssCleared(s), 'krąg', 'kręgi', 'kręgów')}</b></div>}
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
        <div class="row">
          <span class="sub">Wibracje przy rzadkich wytopach (od Rzadkiego wzwyż).</span>
          <button class={`toggle${s.opts.vibe !== false ? ' on' : ''}`} aria-pressed={s.opts.vibe !== false} onClick={() => game.setVibe(s.opts.vibe === false)}><span class="knob" />Wibracje</button>
        </div>
        <div class="row">
          <span class="sub">Ekran nie gaśnie i telefon się nie blokuje, dopóki gra jest włączona.</span>
          <button class={`toggle${s.opts.awake !== false ? ' on' : ''}`} aria-pressed={s.opts.awake !== false} onClick={() => game.setAwake(s.opts.awake === false)}><span class="knob" />Ekran nie gaśnie</button>
        </div>
        {s.opts.awake !== false && (
          <div class="row">
            <span class="sub">Po minucie bez dotyku gra się przyciemnia, ale dalej widać walkę. Dotknij, aby wrócić.</span>
            <button class={`toggle${s.opts.dim !== false ? ' on' : ''}`} aria-pressed={s.opts.dim !== false} onClick={() => game.setDim(s.opts.dim === false)}><span class="knob" />Oszczędzanie</button>
          </div>
        )}
        <p class="sub credits">Muzyka: eBunny, Sonican, Dummy Daniel · dźwięki walki: Floraphonic, Voicebosch, Magiaz (Pixabay).</p>
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

