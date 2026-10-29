// Okno areny: ocena, walki na dziś, przeciwnicy, odtworzenie pojedynku (liczy go serwer) i dziennik obrony.
import { useEffect, useRef, useState } from 'preact/hooks';
import { DUEL_FRAME_MS } from '../../engine/duel';
import type { Game } from '../../engine/game';
import { ARENA_SHOP, LEAGUES, type ArenaShopId } from '../../data';
import { clanLife } from '../../save/clanlife';
import { getLink, ServerError, type ArenaFight, type ArenaState, type DuelShow, type LeagueState } from '../../save/server';
import { fmt } from '../format';
import { HeroSprite } from '../Arena';
import { tokensText } from '../texts';
import { ArenaShopTab, LeagueBadge, LeagueTab, TokenIco } from './League';

/** Odtworzenie walki jest 3× szybsze niż sama walka. */
const REPLAY_SPEED = 3;

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

/** Odtworzenie pojedynku rozegranego przez serwer (arena, bitwa wojny klanów). */
export function DuelReplay({ f, summary, title = 'Pojedynek', onDone }: { f: DuelShow; summary: string; title?: string; onDone: () => void }) {
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
      <div class="eyebrow">{title}</div>
      <div class="duel-box">
        <div class="stage duel">
          <div class="st-tag">{done ? (f.win ? 'Wygrana' : 'Porażka') : `${Math.round((i * DUEL_FRAME_MS) / 1000)} s`}</div>
          <div class={`actor hero${!done ? ' fighting' : ''}${done && !f.win ? ' dead' : ''}`}><HeroSprite eq={f.me.look ?? {}} /></div>
          <div class={`actor foe pvp${!done ? ' fighting' : ''}${done && f.win ? ' dead' : ''}${f.foe.ghost ? ' ghost' : ''}`}><HeroSprite eq={f.foe.look ?? {}} flip /></div>
        </div>
        <div class="bars">
          <div class="bar-side">
            <div class="fname">{f.me.name}</div>
            <div class="hp"><i style={{ width: a + '%' }} /></div>
            <div class="hpnum">Moc {fmt(f.me.power)}</div>
          </div>
          <div class="bar-side foe">
            <div class="fname">{f.foe.name}</div>
            <div class="hp foe"><i style={{ width: b + '%' }} /></div>
            <div class="hpnum">Moc {fmt(f.foe.power)}</div>
          </div>
        </div>
      </div>
      {done ? (
        <div class={`duel-result ${f.win ? 'win' : 'lose'}`} role="status">
          <b>{f.win ? 'Zwycięstwo!' : 'Porażka'}</b>
          <span>{summary}</span>
          <small>Walka trwała {Math.round(f.ms / 1000)} s · trafienia krytyczne {f.crits[0]}:{f.crits[1]} · umiejętności {f.skills[0]}:{f.skills[1]}</small>
        </div>
      ) : <button class="linkbtn" onClick={() => setI(f.frames.length - 1)}>Pomiń</button>}
      {done && <button class="btn primary" onClick={onDone}>Dalej</button>}
    </>
  );
}

type ArenaTab = 'walki' | 'liga' | 'sklep';
const TABS: [ArenaTab, string][] = [['walki', 'Walki'], ['liga', 'Liga'], ['sklep', 'Sklep areny']];

export function ArenaView({ game, close }: { game: Game; close: () => void }) {
  const [st, setSt] = useState<ArenaState | null>(null);
  const [lg, setLg] = useState<LeagueState | null>(null);
  const [tab, setTab] = useState<ArenaTab>('walki');
  const [fight, setFight] = useState<ArenaFight | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const call = <T,>(fn: (l: NonNullable<ReturnType<typeof getLink>>) => Promise<T>, done: (r: T) => void) => {
    const link = getLink();
    if (!link?.online) { setErr('Brak połączenia z serwerem.'); return; }
    setBusy(true);
    fn(link)
      .then(r => { if (live.current) { done(r); setErr(''); } })
      .catch(e => { if (live.current) setErr(errText(e)); })
      .finally(() => { if (live.current) setBusy(false); });
  };
  const takeLeague = (r: LeagueState) => {
    game.applyShop({ gems: r.gems });
    setLg(r);
  };
  const load = (refresh = false) => call(l => l.arenaList(refresh), setSt);
  const loadLeague = () => call(l => l.arenaLeague(), takeLeague);
  useEffect(() => load(), []);
  useEffect(() => { if (tab !== 'walki' && !lg) loadLeague(); }, [tab]);

  const attack = (i: number) => {
    if (!st) return;
    call(l => l.arenaFight(i, st.opp[i].id), r => {
      game.arenaReward(r.gold);
      setFight(r);
      setSt(r);
      setLg(null); // tabela ligi zmieniła się — wczytaj ją od nowa przy wejściu na kartę
    });
  };
  const buy = (id: ArenaShopId) => call(l => l.arenaShopBuy(id), r => {
    takeLeague(r);
    clanLife.rewards(game, r.rewards);
    if (typeof r.left === 'number') setSt(x => (x ? { ...x, left: r.left!, max: x.max + 1 } : x));
    setNote(`Kupiono: ${ARENA_SHOP[id].n}.`);
  });

  if (fight) {
    const extra = fight.tk ? ` · +${fight.lp} pkt ligi · +${tokensText(fight.tk)}` : '';
    return <DuelReplay f={fight} summary={`Ocena ${signed(fight.d)} (teraz ${fmt(fight.rating)}) · +${fmt(fight.gold)} złota${extra}`} onDone={() => setFight(null)} />;
  }
  const gamePower = game.stats.power;
  const brief = lg ? { tier: lg.tier, rank: lg.rank, tokens: lg.tokens } : st?.league ?? null;
  return (
    <>
      <div class="row">
        <div class="eyebrow">Arena</div>
        {brief && (
          <span class="lgtop">
            <LeagueBadge tier={brief.tier} small />
            <span class="gembal"><TokenIco size={16} /><b>{fmt(brief.tokens)}</b></span>
          </span>
        )}
      </div>
      <div class="seg seg3" role="tablist">
        {TABS.map(([id, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => { setTab(id); setNote(''); }}>{n}</button>
        ))}
      </div>
      {err && <p class="sub" role="alert">{err}</p>}
      {tab === 'walki' && !st && !err && <p class="sub">Wczytywanie…</p>}
      {tab === 'walki' && st && (
        <>
          <div class="h">Ocena {fmt(st.rating)}{st.rank ? <span class="muted"> · miejsce {st.rank}</span> : null}</div>
          <p class="sub">Walki na dziś: <b class="num">{st.left}/{st.max}</b> · zwycięstwa {st.wins}, porażki {st.losses}</p>
          {st.league && st.league.rank > 0 && (
            <p class="sub">Liga {LEAGUES[st.league.tier].n}: <b class="num">{st.league.rank}.</b> miejsce w grupie · {fmt(st.league.pts)} pkt</p>
          )}
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
            {st.left < 1 && <button class="linkbtn" onClick={() => setTab('sklep')}>Bilet na arenę</button>}
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
      {tab !== 'walki' && !lg && !err && <p class="sub">Wczytywanie…</p>}
      {tab === 'liga' && lg && <LeagueTab lg={lg} now={Date.now()} />}
      {tab === 'sklep' && lg && <ArenaShopTab game={game} lg={lg} busy={busy} buy={buy} />}
      {note && tab === 'sklep' && <p class="sub" role="status">{note}</p>}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}
