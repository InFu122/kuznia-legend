// Okno areny: ocena, walki na dziś, przeciwnicy, odtworzenie pojedynku (liczy go serwer) i dziennik obrony.
import { useEffect, useRef, useState } from 'preact/hooks';
import { DUEL_FRAME_MS, eloDelta } from '../../engine/duel';
import type { Game } from '../../engine/game';
import { AD, ARENA_SHOP, B, LEAGUE, landDef, type ArenaShopId } from '../../data';
import { dungeonBgUrl, resUrl } from '../../art/render';
import { Px } from '../Px';
import { useAdWatch } from './Shop';
import { clanLife } from '../../save/clanlife';
import { getLink, ServerError, type ArenaFight, type ArenaState, type DuelShow, type LeagueState } from '../../save/server';
import { fmt } from '../format';
import { HeroSprite } from '../Arena';
import { Res, Tokens } from '../RewardIcons';
import type { ComponentChildren } from 'preact';
import { Avatar } from '../Avatar';
import { showProfile } from '../profile';
import { ArenaShopTab, LeagueBadge, LeagueTab, TokenIco } from './League';
import { icUrl } from './ClanUi';

/** Odtworzenie walki jest 3× szybsze niż sama walka. */
const REPLAY_SPEED = 3;

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

/** Odtworzenie pojedynku rozegranego przez serwer (arena, bitwa wojny klanów). */
export function DuelReplay({ f, summary, title = 'Pojedynek', onDone }: { f: DuelShow; summary: ComponentChildren; title?: string; onDone: () => void }) {
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
          <div class={`actor hero${!done ? ' fighting' : ''}${done && !f.win ? ' dead' : ''}`}><HeroSprite eq={f.me.look ?? {}} skin={f.me.sk} /></div>
          <div class={`actor foe pvp${!done ? ' fighting' : ''}${done && f.win ? ' dead' : ''}${f.foe.ghost ? ' ghost' : ''}`}><HeroSprite eq={f.foe.look ?? {}} skin={f.foe.sk} flip /></div>
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

type ArenaTab = 'walki' | 'liga' | 'sklep' | 'obrona';
const TABS: [ArenaTab, string, string][] = [['walki', 'Walki', 'moc'], ['liga', 'Liga', 'puchar'], ['sklep', 'Sklep', 'zeton'], ['obrona', 'Obrona', 'tarcza']];

/** Trudność rywala według Mocy na arenie (kopia z ostatniego zapisu). */
function difficulty(foe: number, mine: number): { cls: 'easy' | 'even' | 'hard'; n: string } {
  const k = foe / Math.max(1, mine);
  return k < 0.92 ? { cls: 'easy', n: 'Łatwy' } : k <= 1.08 ? { cls: 'even', n: 'Równy' } : { cls: 'hard', n: 'Trudny' };
}
const pctDiff = (foe: number, mine: number) => {
  const d = Math.round((foe / Math.max(1, mine) - 1) * 100);
  return d === 0 ? 'jak ty' : `${d > 0 ? '+' : '−'}${Math.abs(d)}%`;
};
/** „2 h temu”, „15 min temu”, starsze — data. */
function ago(t: number, now: number): string {
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 60) return `${Math.max(1, m)} min temu`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h temu`;
  return new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}
const Pips = ({ n, max }: { n: number; max: number }) => (
  <span class="hpips" aria-hidden="true">{Array.from({ length: max }, (_, i) => <i key={i} class={i < n ? 'on' : ''} />)}</span>
);

/** Nagłówek areny: ocena, liga, walki na dziś, bilans i Żetony — najważniejsze na pierwszy rzut oka. */
function ArenaHero({ game, st, brief }: { game: Game; st: ArenaState | null; brief: { tier: number; rank: number; tokens: number } | null }) {
  return (
    <section class="ch-hero ar-hero" style={{ '--bg': `url(${dungeonBgUrl('arena')})` } as Record<string, string>}>
      <div class="ch-top">
        <Avatar skin={game.s.look.skin} frame={game.s.look.frame} size={52} />
        <div class="ch-main">
          <span class="eyebrow">Arena · twoja ocena</span>
          <div class="ar-rating"><b class="num">{st ? fmt(st.rating) : '—'}</b>{st && st.rank > 0 && <small>{st.rank}. miejsce w rankingu</small>}</div>
        </div>
        {brief && (
          <div class="ar-lg">
            <LeagueBadge tier={brief.tier} />
            <small>{brief.rank > 0 ? `${brief.rank}. w grupie` : 'liga tygodnia'}</small>
          </div>
        )}
      </div>
      <div class="ar-stats">
        <div class="ar-st">
          <small>Walki na dziś</small>
          <span>{st ? <><Pips n={st.left} max={Math.max(st.max, st.left)} /><b class="num">{st.left}/{st.max}</b></> : <b>—</b>}</span>
        </div>
        <div class="ar-st">
          <small>Bilans</small>
          <span>{st ? <b class="num"><span class="good">{st.wins}</span> – <span class="bad">{st.losses}</span></b> : <b>—</b>}</span>
        </div>
        <div class="ar-st">
          <small>Żetony</small>
          <span><TokenIco size={16} /><b class="num">{brief ? fmt(brief.tokens) : '—'}</b></span>
        </div>
      </div>
    </section>
  );
}

/** Zakładka Arena w Przygodzie: nagłówek i pojedynki na miejscu (bez osobnego okna). */
export function ArenaPanel({ game, online }: { game: Game; online: boolean }) {
  const open = game.s.maxLand >= B.ARENA_UNLOCK_LAND;
  const blocked = !game.net ? 'Arena działa w aplikacji połączonej z serwerem gry.'
    : !open ? `Arenę odblokujesz po pokonaniu bossa krainy ${landDef(B.ARENA_UNLOCK_LAND - 1)?.n ?? landDef(0).n}.`
      : !online ? 'Brak połączenia z serwerem — arena wróci, gdy gra się połączy.' : '';
  if (!blocked) return <ArenaView game={game} close={() => {}} inline />;
  return (
    <>
      <section class="ch-hero ar-hero" style={{ '--bg': `url(${dungeonBgUrl('arena')})` } as Record<string, string>}>
        <div class="ch-top">
          <span class="hlp-ic"><Px src={resUrl('moc')} size={34} /></span>
          <div class="ch-main">
            <span class="eyebrow">Gracz kontra gracz</span>
            <div class="hlp-t">Arena</div>
            <small class="hlp-s">{B.ARENA_FIGHTS} walk dziennie z kopiami bohaterów innych graczy, ligi tygodniowe i sklep za Żetony.</small>
          </div>
        </div>
      </section>
      <section class="card"><div class="lockline">{blocked}</div></section>
    </>
  );
}

export function ArenaView({ game, close, inline = false }: { game: Game; close: () => void; inline?: boolean }) {
  const [st, setSt] = useState<ArenaState | null>(null);
  const [lg, setLg] = useState<LeagueState | null>(null);
  const [tab, setTab] = useState<ArenaTab>('walki');
  const [fight, setFight] = useState<ArenaFight | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const ad = useAdWatch();
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
  useEffect(() => { if ((tab === 'liga' || tab === 'sklep') && !lg) loadLeague(); }, [tab]);

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

  const adLeft = Math.max(0, AD.ARENA_DAY - (game.shopNow.ads.arena ?? 0));
  const adFight = () => {
    call(l => l.adReward('arena'), r => {
      game.applyShop(r);
      setSt(x => (x ? { ...x, left: typeof r.left === 'number' ? r.left : x.left + 1, max: x.max + 1 } : x));
      setNote('+1 walka na arenie.');
    });
  };
  if (ad.view) return ad.view;
  if (fight) {
    const summary = (
      <>
        Ocena {signed(fight.d)} (teraz {fmt(fight.rating)}) · +<Res r={{ gold: fight.gold }} />
        {fight.tk ? <> · +{fight.lp} pkt ligi · +<Tokens n={fight.tk} /></> : null}
      </>
    );
    const replay = <DuelReplay f={fight} summary={summary} onDone={() => setFight(null)} />;
    return inline ? <section class="card arena-inline">{replay}</section> : replay;
  }
  const brief = lg ? { tier: lg.tier, rank: lg.rank, tokens: lg.tokens } : st?.league ?? null;
  const adBtn = adLeft > 0 && (
    <button class="btn small adbtn" disabled={busy || ad.loading} onClick={() => ad.watch(adFight)}>
      <Px src={resUrl('reklama')} size={16} /> {ad.loading ? 'Wczytywanie reklamy…' : <>+1 walka za reklamę <small>(dziś jeszcze {adLeft})</small></>}
    </button>
  );
  const body = (
    <>
      <ArenaHero game={game} st={st} brief={brief} />
      <div class="ctabs ar-tabs" role="tablist" aria-label="Arena">
        {TABS.map(([id, n, ic]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => { setTab(id); setNote(''); }}>
            <Px src={icUrl(ic)} size={22} />
            <span>{n}</span>
          </button>
        ))}
      </div>
      {err && <p class="sub" role="alert">{err}</p>}
      {tab === 'walki' && (
        <section class="card ar-card">
          {!st && !err && <p class="sub">Wczytywanie…</p>}
          {st && <Fights game={game} st={st} busy={busy} attack={attack} refresh={() => load(true)} toShop={() => setTab('sklep')} adBtn={adBtn} />}
          {ad.msg && <p class="sub" role="status">{ad.msg}</p>}
          {note && <p class="sub" role="status">{note}</p>}
        </section>
      )}
      {(tab === 'liga' || tab === 'sklep') && (
        <section class="card ar-card">
          {!lg && !err && <p class="sub">Wczytywanie…</p>}
          {tab === 'liga' && lg && <LeagueTab lg={lg} now={Date.now()} />}
          {tab === 'sklep' && lg && <ArenaShopTab game={game} lg={lg} busy={busy} buy={buy} />}
          {note && tab === 'sklep' && <p class="sub" role="status">{note}</p>}
        </section>
      )}
      {tab === 'obrona' && (
        <section class="card ar-card">
          {!st && !err && <p class="sub">Wczytywanie…</p>}
          {st && <Defense log={st.log} />}
        </section>
      )}
      {!inline && <button class="btn" onClick={close}>Zamknij</button>}
    </>
  );
  return body;
}

/** Walki: lista rywali z trudnością i stawką oceny, a gdy walk zabrakło — skąd wziąć następne. */
function Fights({ game, st, busy, attack, refresh, toShop, adBtn }: {
  game: Game; st: ArenaState; busy: boolean; attack: (i: number) => void; refresh: () => void; toShop: () => void; adBtn: ComponentChildren;
}) {
  const gamePower = game.stats.power;
  return (
    <>
      {st.left < 1 && (
        <div class="ar-out">
          <b>Na dziś koniec walk</b>
          <small>Nowe walki o północy. Możesz dobrać walkę teraz:</small>
          <div class="ar-out-btns">{adBtn}<button class="btn small" onClick={toShop}><TokenIco size={14} /> Bilet w sklepie</button></div>
        </div>
      )}
      <div class="row">
        <div class="eyebrow">Wybierz rywala</div>
        <button class="btn small" disabled={busy} onClick={refresh}>↻ Inni rywale</button>
      </div>
      <ul class="ar-opps">
        {st.opp.map((o, i) => {
          const dif = difficulty(o.power, st.power);
          const win = eloDelta(st.rating, o.rating, true);
          const lose = eloDelta(st.rating, o.rating, false);
          return (
            <li key={o.id} class={`ar-opp ${dif.cls}`}>
              <button class="avbtn" disabled={o.ghost} onClick={() => showProfile(o.id)} aria-label={`Profil: ${o.name}`}>
                <Avatar skin={o.ghost ? game.s.look.skin : o.sk} frame={o.ghost ? 'prosta' : o.fr} size={44} />
              </button>
              <div class="ao-main">
                <div class="ao-name">{o.name}{o.ghost && <span class="tag">Duch</span>}</div>
                <div class="ao-pow"><span class={`ao-dif ${dif.cls}`}>{dif.n}</span><span>Moc <b class="num">{fmt(o.power)}</b> <small title="w porównaniu z twoją Mocą na arenie">({pctDiff(o.power, st.power)})</small></span></div>
                <div class="ao-stake">Ocena: wygrana <b class="good">+{win}</b> · porażka <b class="bad">−{Math.abs(lose)}</b></div>
              </div>
              <button class="btn primary ao-go" disabled={busy || st.left < 1} onClick={() => attack(i)}>Walcz</button>
            </li>
          );
        })}
      </ul>
      <div class="ar-prize">
        <span>Za wygraną: <TokenIco size={14} /> <b>+{LEAGUE.WIN_TOKENS}</b> · pkt ligi · złoto</span>
        <span>Za porażkę: <TokenIco size={14} /> <b>+{LEAGUE.LOSS_TOKENS}</b></span>
      </div>
      {st.left > 0 && adBtn}
      {gamePower > st.power * 1.02 && (
        <div class="lockline">Na arenie walczysz Mocą <b>{fmt(st.power)}</b>, mniejszą niż w grze — część przedmiotów wykuto przed aktualizacją serwera albo bez połączenia. Nowe wytopy liczą się od razu.</div>
      )}
      <p class="sub ar-foot">Walczysz z kopią bohatera z ostatniego zapisu.{st.opp.some(o => o.ghost) ? ' Duchy to kopie twojego bohatera — zastępują graczy, gdy na serwerze jest ich mało.' : ''}</p>
    </>
  );
}

/** Obrona: kto zaatakował kopię twojego bohatera i jak poszło. */
function Defense({ log }: { log: ArenaState['log'] }) {
  const now = Date.now();
  return (
    <>
      <p class="sub">Twój bohater broni się sam — inni gracze walczą z kopią z twojego ostatniego zapisu. Obrona daje lub zabiera połowę tego, co atak.</p>
      {log.length ? (
        <ul class="ar-log">
          {log.map((l, i) => (
            <li key={i} class={l.won ? 'ok' : 'bad'}>
              <span class="al-ic" aria-hidden="true">{l.won ? '✓' : '✗'}</span>
              <span class="al-main"><b>{l.who}</b><small>{ago(l.t, now)}</small></span>
              <span class="al-res"><b>{l.won ? 'Obroniono' : 'Przegrana'}</b><small class="num">ocena {signed(l.d)}</small></span>
            </li>
          ))}
        </ul>
      ) : <p class="sub">Nikt jeszcze nie zaatakował twojego bohatera.</p>}
    </>
  );
}
