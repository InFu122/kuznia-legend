// Okno areny: ocena, walki na dziś, przeciwnicy, odtworzenie pojedynku (liczy go serwer) i dziennik obrony.
import { useEffect, useRef, useState } from 'preact/hooks';
import { eloDelta } from '../../engine/duel';
import type { Game } from '../../engine/game';
import { AD, ARENA_REVENGE, ARENA_SHOP, ARENA_STREAK, B, LEAGUE, landDef, streakBonus, type ArenaShopId } from '../../data';
import { dungeonBgUrl, resUrl } from '../../art/render';
import { Px } from '../Px';
import { useAdWatch } from './Shop';
import { clanLife } from '../../save/clanlife';
import { getLink, ServerError, type ArenaFight, type ArenaState, type LeagueState } from '../../save/server';
import { fmt, fmtShort, tfmt } from '../format';
import type { ComponentChildren } from 'preact';
import { DuelReplay } from './DuelReplay';
import { Avatar } from '../Avatar';
import { showProfile } from '../profile';
import { ArenaShopTab, LeagueBadge, LeagueTab, TokenIco } from './League';
import { icUrl } from './ClanUi';

const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

export { DuelReplay } from './DuelReplay';

/** Płomyk serii wygranych (piksele). */
export const Flame = ({ size = 16 }: { size?: number }) => (
  <svg class="flame" width={size} height={Math.round(size * 1.25)} viewBox="0 0 8 10" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#e8542f" d="M3 0h1v1h1v1h1v1h1v4h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-3h1v-1h1v1h1v-2h1z" />
    <path fill="#ffb347" d="M3 3h1v1h1v1h1v2h-1v1h-1v1h-1v-1h-1v-1h-1v-2h1v1h1z" />
    <path fill="#fff1b8" d="M3 6h1v1h1v1h-2v-1h-1v-1z" />
  </svg>
);

/** „3 wygrane”, „5 wygranych”. */
const wins = (n: number) => `${n} ${n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'wygrane' : 'wygranych'}`;

/** „1 Żeton”, „3 Żetony”, „5 Żetonów”. */
const zet = (n: number) => `${n} ${n === 1 ? 'Żeton' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'Żetony' : 'Żetonów'}`;

/** Liczba, która przez `ms` dochodzi od `from` do `to`. */
function useCount(from: number, to: number, ms = 900): number {
  const [v, setV] = useState(from);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return v;
}

/** Podsumowanie walki na arenie: ocena nabijana licznikiem, nagrody z premiami, seria i rewanż. */
function ArenaOutro({ r, prevStreak }: { r: ArenaFight; prevStreak: number }) {
  const from = r.rating - r.d;
  const shown = useCount(from, r.rating);
  const b = r.bonus;
  const streak = r.streak ?? 0;
  const tk = r.tk + (b?.tk ?? 0);
  const next = streak < ARENA_STREAK.FROM ? ARENA_STREAK.FROM : streak < 5 ? 5 : null;
  const nb = next ? streakBonus(next) : null;
  return (
    <>
      <div class="ao-rate">
        <small>Ocena</small>
        <b class="num">{fmt(shown)}</b>
        <span class={`ao-d ${r.d > 0 ? 'good' : r.d < 0 ? 'bad' : ''}`}>{signed(r.d)}</span>
      </div>
      <div class="ao-gain">
        <span class="ao-chip"><Px src={resUrl('zloto')} size={18} />+{fmtShort(r.gold)}{b && b.gold > 0 && <em>+{Math.round(b.gold * 100)}%</em>}</span>
        {tk > 0 && <span class="ao-chip"><TokenIco size={16} />+{tk}{b && b.tk > 0 && <em>w tym +{b.tk}</em>}</span>}
        {r.lp > 0 && <span class="ao-chip"><Px src={resUrl('puchar')} size={18} />+{r.lp} pkt ligi</span>}
      </div>
      {r.win && streak >= 2 && (
        <div class={`ao-streak${b?.streak ? ' hot' : ''}`}>
          <Flame size={18} />
          <span>
            <b>Seria: {wins(streak)} z rzędu</b>
            <small>
              {b?.streak ? `+${Math.round(streakBonus(streak).gold * 100)}% złota za serię${streakBonus(streak).tk ? `, +${zet(streakBonus(streak).tk)}` : ''}. ` : ''}
              {next && nb ? `Wygraj jeszcze ${next - streak}: +${Math.round(nb.gold * 100)}% złota i +${zet(nb.tk)}.` : 'Każda kolejna wygrana: +100% złota.'}
            </small>
          </span>
        </div>
      )}
      {!r.win && prevStreak >= 2 && <div class="ao-streak off"><Flame size={18} /><span><b>Seria {prevStreak} wygranych przerwana</b><small>Nowa seria zaczyna się od następnej wygranej.</small></span></div>}
      {r.win && b?.rv && <div class="ao-rv">Rewanż: +{Math.round(ARENA_REVENGE.GOLD * 100)}% złota i +{zet(ARENA_REVENGE.TK)}.</div>}
    </>
  );
}

/** Rewanż na kimś, kto pokonał twoją obronę (najnowszy możliwy). */
function RevengeCard({ log, left, busy, go }: { log: ArenaState['log']; left: number; busy: boolean; go: (rv: string) => void }) {
  const now = Date.now();
  const l = log.find(x => x.rv && (x.until ?? 0) > now);
  if (!l) return null;
  return (
    <div class="ar-rv">
      <span class="ar-rv-ic"><Px src={icUrl('tarcza')} size={28} /></span>
      <div class="cmain">
        <span class="eyebrow">Rewanż · jeszcze {tfmt((l.until ?? now) - now)}</span>
        <b>{l.who}</b>
        <small>Twoja obrona przegrała {ago(l.t, now)}. Za wygraną +{Math.round(ARENA_REVENGE.GOLD * 100)}% złota i +{zet(ARENA_REVENGE.TK)}.</small>
      </div>
      <button class="btn primary ao-go" disabled={busy || left < 1} onClick={() => go(l.rv!)}>Rewanż</button>
    </div>
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
          <span>{st ? <b class="num"><span class="good">{st.wins}</span> – <span class="bad">{st.losses}</span></b> : <b>—</b>}{st && (st.streak ?? 0) >= 2 && <em class="ar-streak" title="wygrane z rzędu"><Flame size={12} />{st.streak}</em>}</span>
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
      : !online ? 'Brak połączenia z serwerem, arena wróci, gdy gra się połączy.' : '';
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
  const [prevStreak, setPrevStreak] = useState(0);
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

  const fought = (r: ArenaFight) => {
    game.arenaReward(r.gold);
    setPrevStreak(st?.streak ?? 0);
    setFight(r);
    setSt(r);
    setLg(null); // tabela ligi zmieniła się — wczytaj ją od nowa przy wejściu na kartę
  };
  const attack = (i: number) => {
    if (!st) return;
    call(l => l.arenaFight(i, st.opp[i].id), fought);
  };
  const revenge = (rv: string) => call(l => l.arenaRevenge(rv), fought);
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
    const replay = <DuelReplay f={fight} title={fight.bonus?.rv ? 'Rewanż' : 'Pojedynek'} ko={fight.bonus?.rv ? (fight.win ? 'Rewanż udany!' : 'Rewanż nieudany') : undefined} outro={<ArenaOutro r={fight} prevStreak={prevStreak} />} onDone={() => setFight(null)} />;
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
          {st && <Fights game={game} st={st} busy={busy} attack={attack} revenge={revenge} refresh={() => load(true)} toShop={() => setTab('sklep')} adBtn={adBtn} />}
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
          {st && <Defense log={st.log} left={st.left} busy={busy} revenge={revenge} />}
        </section>
      )}
      {!inline && <button class="btn" onClick={close}>Zamknij</button>}
    </>
  );
  return body;
}

/** Walki: lista rywali z trudnością i stawką oceny, a gdy walk zabrakło — skąd wziąć następne. */
function Fights({ game, st, busy, attack, revenge, refresh, toShop, adBtn }: {
  game: Game; st: ArenaState; busy: boolean; attack: (i: number) => void; revenge: (rv: string) => void; refresh: () => void; toShop: () => void; adBtn: ComponentChildren;
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
      <RevengeCard log={st.log} left={st.left} busy={busy} go={revenge} />
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
                <div class="ao-name"><span class="ao-nm">{o.name}</span>{o.ghost && <span class="tag">Duch</span>}</div>
                <div class="ao-pow"><span class={`ao-dif ${dif.cls}`}>{dif.n}</span><span class="ao-p">Moc <b class="num">{fmt(o.power)}</b> <small class="ao-pct" title="w porównaniu z twoją Mocą na arenie">({pctDiff(o.power, st.power)})</small></span></div>
                <div class="ao-stake"><span class="ao-lbl">Ocena: </span>wygrana <b class="good">+{win}</b> · porażka <b class="bad">−{Math.abs(lose)}</b></div>
              </div>
              <button class="btn primary ao-go" disabled={busy || st.left < 1} onClick={() => attack(i)}>Walcz</button>
            </li>
          );
        })}
      </ul>
      <div class="ar-prize">
        <span>Za wygraną: <TokenIco size={14} /> <b>+{LEAGUE.WIN_TOKENS}</b> · pkt ligi · złoto</span>
        <span>Za porażkę: <TokenIco size={14} /> <b>+{LEAGUE.LOSS_TOKENS}</b></span>
        <span><Flame size={12} /> Seria od {ARENA_STREAK.FROM} wygranych z rzędu: więcej złota i Żetonów</span>
      </div>
      {st.left > 0 && adBtn}
      {gamePower > st.power * 1.02 && (
        <div class="lockline">Na arenie walczysz Mocą <b>{fmt(st.power)}</b>, mniejszą niż w grze: część przedmiotów wykuto przed aktualizacją serwera albo bez połączenia. Nowe wytopy liczą się od razu.</div>
      )}
      <p class="sub ar-foot">Walczysz z kopią bohatera z ostatniego zapisu.{st.opp.some(o => o.ghost) ? ' Duchy to kopie twojego bohatera, zastępują graczy, gdy na serwerze jest ich mało.' : ''}</p>
    </>
  );
}

/** Obrona: kto zaatakował kopię twojego bohatera i jak poszło. */
function Defense({ log, left, busy, revenge }: { log: ArenaState['log']; left: number; busy: boolean; revenge: (rv: string) => void }) {
  const now = Date.now();
  return (
    <>
      <p class="sub">Twój bohater broni się sam, inni gracze walczą z kopią z twojego ostatniego zapisu. Obrona daje lub zabiera połowę tego, co atak.</p>
      {log.length ? (
        <ul class="ar-log">
          {log.map((l, i) => (
            <li key={i} class={l.won ? 'ok' : 'bad'}>
              <span class="al-ic" aria-hidden="true">{l.won ? '✓' : '✗'}</span>
              <span class="al-main"><b>{l.who}</b><small>{ago(l.t, now)}</small></span>
              <span class="al-res"><b>{l.won ? 'Obroniono' : 'Przegrana'}</b><small class="num">ocena {signed(l.d)}</small></span>
              {l.rv && (l.until ?? 0) > now && <button class="btn primary small al-rv" disabled={busy || left < 1} onClick={() => revenge(l.rv!)}>Rewanż</button>}
            </li>
          ))}
        </ul>
      ) : <p class="sub">Nikt jeszcze nie zaatakował twojego bohatera.</p>}
    </>
  );
}
