// Okno areny: ocena, walki na dziś, przeciwnicy, odtworzenie pojedynku (liczy go serwer) i dziennik obrony.
import { useEffect, useRef, useState } from 'preact/hooks';
import { DUEL_FRAME_MS } from '../../engine/duel';
import type { Game } from '../../engine/game';
import { getLink, ServerError, type ArenaFight, type ArenaState } from '../../save/server';
import { fmt } from '../format';

/** Odtworzenie walki jest 3× szybsze niż sama walka. */
const REPLAY_SPEED = 3;

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

function Replay({ f, onDone }: { f: ArenaFight; onDone: () => void }) {
  const [i, setI] = useState(0);
  const done = i >= f.frames.length - 1;
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setI(x => x + 1), DUEL_FRAME_MS / REPLAY_SPEED);
    return () => clearTimeout(t);
  }, [i, done]);
  const [a, b] = f.frames[Math.min(i, f.frames.length - 1)];
  return (
    <>
      <div class="eyebrow">Pojedynek</div>
      <div class="fighters duel">
        <div class="fighter hero">
          <div class="token">{(f.me.name[0] || 'K').toUpperCase()}</div>
          <div class="fname">{f.me.name}</div>
          <div class="hp"><i style={{ width: a + '%' }} /></div>
          <div class="hpnum">Moc {fmt(f.me.power)}</div>
        </div>
        <div class="vs">{done ? (f.win ? 'Wygrana' : 'Porażka') : `${Math.round((i * DUEL_FRAME_MS) / 1000)} s`}</div>
        <div class="fighter foe">
          <div class="token t-Demony">{(f.foe.name[0] || '?').toUpperCase()}</div>
          <div class="fname">{f.foe.name}</div>
          <div class="hp foe"><i style={{ width: b + '%' }} /></div>
          <div class="hpnum">Moc {fmt(f.foe.power)}</div>
        </div>
      </div>
      {done ? (
        <div class={`duel-result ${f.win ? 'win' : 'lose'}`} role="status">
          <b>{f.win ? 'Zwycięstwo!' : 'Porażka'}</b>
          <span>Ocena {signed(f.d)} (teraz {fmt(f.rating)}) · +{fmt(f.gold)} złota</span>
          <small>Walka trwała {Math.round(f.ms / 1000)} s · trafienia krytyczne {f.crits[0]}:{f.crits[1]} · umiejętności {f.skills[0]}:{f.skills[1]}</small>
        </div>
      ) : <button class="linkbtn" onClick={() => setI(f.frames.length - 1)}>Pomiń</button>}
      {done && <button class="btn primary" onClick={onDone}>Dalej</button>}
    </>
  );
}

export function ArenaView({ game, close }: { game: Game; close: () => void }) {
  const [st, setSt] = useState<ArenaState | null>(null);
  const [fight, setFight] = useState<ArenaFight | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const load = (refresh = false) => {
    const link = getLink();
    if (!link?.online) { setErr('Brak połączenia z serwerem.'); return; }
    setBusy(true);
    link.arenaList(refresh)
      .then(r => { if (live.current) { setSt(r); setErr(''); } })
      .catch(e => { if (live.current) setErr(errText(e)); })
      .finally(() => { if (live.current) setBusy(false); });
  };
  useEffect(() => load(), []);

  const attack = (i: number) => {
    const link = getLink();
    if (!link || !st) return;
    setBusy(true);
    link.arenaFight(i, st.opp[i].id)
      .then(r => {
        game.arenaReward(r.gold);
        if (live.current) { setFight(r); setSt(r); setErr(''); }
      })
      .catch(e => { if (live.current) setErr(errText(e)); })
      .finally(() => { if (live.current) setBusy(false); });
  };

  if (fight) return <Replay f={fight} onDone={() => setFight(null)} />;
  const gamePower = game.stats.power;
  return (
    <>
      <div class="eyebrow">Arena</div>
      {err && <p class="sub" role="alert">{err}</p>}
      {!st && !err && <p class="sub">Wczytywanie…</p>}
      {st && (
        <>
          <div class="h">Ocena {fmt(st.rating)}{st.rank ? <span class="muted"> · miejsce {st.rank}</span> : null}</div>
          <p class="sub">Walki na dziś: <b class="num">{st.left}/{st.max}</b> · zwycięstwa {st.wins}, porażki {st.losses}</p>
          <p class="sub">Twoja Moc na arenie: <b class="num">{fmt(st.power)}</b>. Walczy kopia bohatera z ostatniego zapisu.</p>
          {gamePower > st.power * 1.02 && (
            <div class="lockline">
              Część ekwipunku nie liczy się na arenie i w rankingu Mocy — to przedmioty wykute przed aktualizacją serwera albo bez połączenia.
              Nowe wytopy liczą się od razu.
            </div>
          )}
          <ul class="clist">
            {st.opp.map((o, i) => (
              <li key={o.id}>
                <div class="cmain">
                  <div class="cname">{o.name}{o.ghost && <span class="tag">Duch areny</span>}</div>
                  <div class="tech-cost">Moc {fmt(o.power)} · ocena {fmt(o.rating)}{o.land ? ` · ${o.land}` : ''}</div>
                </div>
                <button class="btn primary small" disabled={busy || st.left < 1} onClick={() => attack(i)}>Walcz</button>
              </li>
            ))}
          </ul>
          {st.opp.some(o => o.ghost) && <p class="sub">Duchy areny to kopie twojego bohatera (słabsza, równa i silniejsza). Zastępują graczy, gdy na serwerze jest ich mało.</p>}
          <div class="row">
            <button class="linkbtn" disabled={busy} onClick={() => load(true)}>Inni przeciwnicy</button>
            {st.left < 1 && <span class="sub">Nowe walki jutro.</span>}
          </div>
          <div class="eyebrow" style={{ marginTop: '4px' }}>Obrona</div>
          {st.log.length ? (
            <ul class="log">
              {st.log.map((l, i) => (
                <li key={i}>
                  <time>{new Date(l.t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</time>
                  {l.who} zaatakował(a) twojego bohatera: {l.won ? 'obrona udana' : 'obrona przegrana'} (ocena {signed(l.d)})
                </li>
              ))}
            </ul>
          ) : <p class="sub">Nikt jeszcze nie zaatakował twojego bohatera.</p>}
        </>
      )}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}
