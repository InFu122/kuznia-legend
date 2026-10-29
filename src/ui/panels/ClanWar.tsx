// Wojna klanów (co tydzień: dobór, cztery dni aktywności, bitwa w sobotę, nagrody w niedzielę)
// i rajd klanowy Smocze Leże (smok o czterech fazach ze słabościami na żywioły). Wszystko liczy serwer.
import { useEffect, useRef, useState } from 'preact/hooks';
import { B, ELEM, RAID, RAID_PHASES, WAR, WAR_DAYS } from '../../data';
import { elemUrl, foeUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { clanLife } from '../../save/clanlife';
import { getLink, type RaidState, type WarState } from '../../save/server';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { coins } from '../texts';
import { Note, errText, useAction } from './ClanLife';
import { DuelReplay } from './Pvp';

const RES_N = { win: 'Zwycięstwo!', draw: 'Remis', loss: 'Porażka' } as const;
const hhmm = (t: number) => new Date(t).toLocaleString('pl-PL', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/** Stan z serwera wczytywany przy otwarciu zakładki i co minutę. */
function useServerState<T>(load: () => Promise<T> | undefined, take: (r: T) => void) {
  const [err, setErr] = useState('');
  const live = useRef(true);
  const run = () => {
    const p = load();
    if (!p) { setErr('Brak połączenia z serwerem.'); return; }
    p.then(r => { if (live.current) { take(r); setErr(''); } }).catch(e => { if (live.current) setErr(errText(e)); });
  };
  useEffect(() => {
    live.current = true;
    run();
    const t = setInterval(run, 60000);
    return () => { live.current = false; clearInterval(t); };
  }, []);
  return { err, live };
}

/* ---------- wojna klanów ---------- */

export function ClanWarTab({ game }: { game: Game }) {
  const [w, setW] = useState<WarState | null>(null);
  const [fight, setFight] = useState<WarState['fight'] | null>(null);
  const a = useAction();
  const take = (r: WarState) => {
    clanLife.rewards(game, r.rewards);
    clanLife.brief({ day: r.day, atk: r.me.atkLeft });
    setW(r);
  };
  const { err, live } = useServerState(() => getLink()?.warState(), take);

  if (fight) {
    return (
      <section class="card">
        <DuelReplay f={fight} title="Bitwa klanów" summary={fight.win ? `+${fight.pts} pkt dla klanu` : `+${fight.pts} pkt za walkę`} onDone={() => setFight(null)} />
      </section>
    );
  }
  if (!w) return <section class="card">{err ? <p class="sub" role="alert">{err}</p> : <p class="sub">Wczytywanie wojny…</p>}</section>;

  const D = WAR_DAYS[w.day];
  const left = w.ends - game.ctx.now();
  const myPower = Math.max(1, game.stats.power);
  const attack = (id: string) => a.run(async () => {
    const l = getLink();
    if (!l) throw new Error();
    const r = await l.warAttack(id);
    if (!live.current) return;
    take(r);
    if (r.fight) setFight(r.fight);
  });
  const { us, them } = w;

  return (
    <>
      <section class="card">
        <div class="eyebrow">Wojna klanów · {D.short === 'Nd' ? 'koniec tygodnia' : 'ten tydzień'}{w.test ? ' · zegar testowy' : ''}</div>
        <ol class="wdays" aria-label="Dni wojny">
          {WAR_DAYS.map((x, i) => (
            <li key={x.k} class={i < w.day ? 'past' : i === w.day ? 'on' : ''} title={x.n}>
              <b>{x.short}</b>
              <small>{i >= 1 && i <= 5 ? (i <= w.day ? fmt(us.days[i] || 0) : '·') : i === 0 ? 'dobór' : 'wynik'}</small>
            </li>
          ))}
        </ol>
        <div class="h">{D.n}</div>
        <p class="sub">{D.how}</p>
        {left > 0 && w.day < 6 && <p class="tech-cost" style={{ marginTop: '4px' }}>Następny dzień za {tfmt(left)} (o północy czasu UTC).</p>}
      </section>

      <section class="card">
        {them ? (
          <>
            <div class="wscore">
              <div class="side us"><span>{us.tag ? `[${us.tag}] ` : ''}{us.n}</span><b>{fmt(us.total)}</b></div>
              <div class="vs">:</div>
              <div class="side them"><span>{them.tag ? `[${them.tag}] ` : ''}{them.n}</span><b>{fmt(them.total)}</b></div>
            </div>
            <div class="wbar" aria-hidden="true"><i style={{ flexGrow: Math.max(1, us.total) }} /><u style={{ flexGrow: Math.max(1, them.total) }} /></div>
            <p class="tech-cost" style={{ marginTop: '6px' }}>Moc klanów: {fmt(us.power)} · {fmt(them.power)}</p>
            {them.ghost && (
              <p class="sub" style={{ marginTop: '6px' }}>
                {them.n} to klan-widmo: zastępuje przeciwnika, gdy na serwerze brakuje klanu o podobnej sile. Zdobywa punkty przez cały dzień, mniej więcej tyle, co aktywny klan twojej wielkości.
              </p>
            )}
          </>
        ) : (
          <>
            <div class="eyebrow">Przeciwnik</div>
            <p class="sub">Dobór trwa do końca poniedziałku: klany o podobnej Mocy dostają się nawzajem. Klan bez pary zmierzy się z klanem-widmem.</p>
          </>
        )}
        {w.res && (
          <div class={`duel-result ${w.res.r === 'loss' ? 'lose' : 'win'}`} role="status" style={{ marginTop: '10px' }}>
            <b>{RES_N[w.res.r]}</b>
            <span>{fmt(w.res.us)} : {fmt(w.res.them)} z klanem {w.res.vs}</span>
            <small>{w.res.us > 0 ? 'Skrzynie trafiły do każdego, kto zdobył punkty (zakładka Klan pokazuje je od razu).' : 'Klan nie zdobył punktów, więc skrzyń nie ma.'} Nowa wojna od poniedziałku.</small>
          </div>
        )}
      </section>

      <section class="card">
        <div class="eyebrow">Twój udział</div>
        {!w.me.in ? (
          <div class="lockline">Dołączyłeś do klanu po doborze przeciwnika — w wojnie walczysz od przyszłego poniedziałku.</div>
        ) : (
          <>
            <div class="stats">
              <div class="stat"><small>Twoje punkty</small><b>{fmt(w.me.pts)}</b></div>
              {w.day >= 1 && w.day <= 4 && <div class="stat"><small>Dziś (limit)</small><b>{fmt(w.me.today)} / {fmt(w.me.cap)}</b></div>}
              {w.day === 5 && <div class="stat"><small>Ataki</small><b>{w.me.atkLeft} / {WAR.ATTACKS}</b></div>}
            </div>
            {w.day >= 1 && w.day <= 4 && <div class="bar" style={{ marginTop: '8px' }}><i style={{ width: Math.min(100, (w.me.today / w.me.cap) * 100) + '%' }} /></div>}
            {w.day === 4 && <p class="sub" style={{ marginTop: '6px' }}>Atakuj bossa klanowego w zakładce Boss — każdy atak to {WAR.BOSS_PTS} punktów.</p>}
            {w.day === 0 && <p class="sub" style={{ marginTop: '6px' }}>Jutro zaczyna się zdobywanie punktów: dzień kucia. Przygotuj rudę — każdy wytop to punkt.</p>}
          </>
        )}
      </section>

      {w.day === 5 && w.def.length > 0 && (
        <section class="card">
          <div class="eyebrow">Obrońcy wroga</div>
          <p class="sub">Walczy kopia twojego bohatera z ostatniego zapisu. Silniejszy obrońca daje więcej punktów, pierwsza wygrana z obrońcą +{WAR.FIRST_BLOOD}.</p>
          <ul class="clist">
            {w.def.map(d => {
              const win = Math.round(WAR.WIN_PTS * Math.max(0.5, Math.min(2, d.power / myPower))) + (d.beaten ? 0 : WAR.FIRST_BLOOD);
              return (
                <li key={d.id}>
                  <div class="cmain">
                    <div class="cname">{d.n}{d.ghost && <span class="tag">Cień</span>}{d.beaten > 0 && <span class="tag">pokonany{d.beaten > 1 ? ` ×${d.beaten}` : ''}</span>}</div>
                    <div class="tech-cost">Moc {fmt(d.power)} · wygrana ≈ {win} pkt</div>
                  </div>
                  <button class="btn primary small" disabled={a.busy || w.me.atkLeft < 1} onClick={() => attack(d.id)}>Atakuj</button>
                </li>
              );
            })}
          </ul>
          <Note msg={a.msg} />
        </section>
      )}

      {w.members.length > 0 && (
        <section class="card">
          <div class="eyebrow">Punkty członków</div>
          <ol class="ctop">
            {w.members.map((m, i) => (
              <li key={i} class={m.me ? 'me' : ''}>
                <span>{i + 1}. {m.n}{w.day === 5 && <small class="muted"> · ataki {m.atk}/{WAR.ATTACKS}</small>}</span>
                <b class="num">{fmt(m.pts)}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      {w.log.length > 0 && (
        <section class="card">
          <div class="eyebrow">Przebieg bitwy</div>
          <ul class="clog">
            {w.log.map((l, i) => (
              <li key={i} class={l.us ? 'us' : 'them'}>
                <time>{hhmm(l.t)}</time>
                <span>{l.a} → {l.d}: {l.w ? 'wygrana' : 'porażka'} <b class="num">+{l.p}</b>{!l.us && <small class="muted"> (wróg)</small>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="card">
        <details class="wrules">
          <summary>Zasady wojny</summary>
          <ul>
            {WAR_DAYS.map(x => <li key={x.k}><b>{x.short} · {x.n}.</b> {x.how}</li>)}
            <li>W dni aktywności jedna osoba zdobywa najwyżej {WAR.DAY_CAP} punktów dziennie. Skład klanu ustala się w poniedziałek.</li>
            <li>Skrzynia (Monety, złoto, księgi, kamienie) rośnie z twoim udziałem; zwycięzcy dostają więcej i zwój, trzy najlepsze osoby w klanie — premię. Klan dostaje {WAR.WIN_XP} Doświadczenia za wygraną i {WAR.LOSS_XP} za porażkę.</li>
          </ul>
        </details>
      </section>
    </>
  );
}

/* ---------- Smocze Leże ---------- */

export function ClanRaidTab({ game }: { game: Game }) {
  const [r, setR] = useState<RaidState | null>(null);
  const [hit, setHit] = useState<{ dmg: number; key: number; big: boolean } | null>(null);
  const a = useAction();
  const take = (x: RaidState) => {
    clanLife.rewards(game, x.rewards);
    clanLife.brief(undefined, { left: x.left, done: x.done });
    setR(x);
  };
  const { err, live } = useServerState(() => getLink()?.raidState(), take);
  if (!r) return <section class="card">{err ? <p class="sub" role="alert">{err}</p> : <p class="sub">Wczytywanie Smoczego Leża…</p>}</section>;

  const ph = Math.min(r.ph, RAID_PHASES.length - 1);
  const P = RAID_PHASES[ph];
  const el = ELEM[r.weak.el];
  const hpPct = r.done ? 0 : Math.max(0, (r.hp / r.max) * 100);
  const attack = () => a.run(async () => {
    const l = getLink();
    if (!l) throw new Error();
    const x = await l.raidAttack();
    if (!live.current) return;
    take(x);
    if (!x.hit) return;
    setHit({ dmg: x.hit.dmg, key: Date.now(), big: x.hit.phase >= 0 });
    if (x.hit.killed) return 'Smok pokonany! Wielkie skrzynie trafiają do wszystkich, którzy walczyli.';
    if (x.hit.phase >= 0) return `Faza „${RAID_PHASES[x.hit.phase].n}” przełamana! Skrzynie dla wszystkich, którzy w niej walczyli.`;
    return `Zadajesz ${fmt(x.hit.dmg)} obrażeń${x.hit.bonus > 0 ? ` (premia żywiołu +${Math.round(x.hit.bonus * 100)}%)` : ''}.`;
  });

  return (
    <>
      <section class="card cboss">
        <div class="eyebrow">Smocze Leże · smok poziomu {r.lvl + 1}</div>
        <div class="h">{r.done ? 'Smok pokonany!' : P.foe}</div>
        <p class="sub">{r.done ? 'Następny, silniejszy smok przyleci w poniedziałek.' : `Faza ${ph + 1} z ${RAID_PHASES.length}: ${P.n}`}</p>
        <div class="rphases" aria-hidden="true">
          {RAID_PHASES.map((_, i) => <i key={i} class={i < r.ph ? 'done' : i === r.ph ? 'on' : ''} />)}
        </div>
        <div class={`boss-art${hit ? ' hit' : ''}${r.done ? ' gone' : ''}`} key={hit?.key}>
          <Px src={foeUrl(P.foe)} size={128} alt={P.foe} />
          {hit && <span class={`bhit${hit.big ? ' kill' : ''}`} aria-hidden="true">−{fmt(hit.dmg)}</span>}
        </div>
        {!r.done && (
          <>
            <div class="bar hpbar" role="progressbar" aria-label="Zdrowie fazy smoka" aria-valuenow={Math.round(hpPct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: hpPct + '%' }} /></div>
            <div class="row" style={{ marginTop: '4px' }}><span class="num">{fmt(r.hp)} / {fmt(r.max)}</span><span class="tech-cost">odlatuje za {tfmt(Math.max(0, r.ends - game.ctx.now()))}</span></div>
            <div class={`weak${r.weak.n ? ' on' : ''}`}>
              <Px src={elemUrl(r.weak.el)} size={28} />
              <div class="cmain">
                <b>Słabość: {el.el}</b>
                <div class="tech-cost">
                  {r.weak.n
                    ? `Masz ${r.weak.n} ${r.weak.n === 1 ? 'przedmiot' : 'przedmioty'} z domieszką ${el.n}: +${Math.round(r.weak.bonus * 100)}% obrażeń.`
                    : `Przedmioty z domieszką ${el.n} zadają +${Math.round(RAID.WEAK_PER_ITEM * 100)}% za każdy (najwyżej +${Math.round(RAID.WEAK_MAX * 100)}%). Domieszki w Kuźni od ${B.ELEM_FORGE_LVL}. poziomu.`}
                </div>
              </div>
            </div>
          </>
        )}
        <div class="stats" style={{ marginTop: '10px' }}>
          <div class="stat"><small>Twoje obrażenia</small><b>{fmt(r.mine)}</b></div>
          <div class="stat"><small>Miejsce</small><b>{r.rank ? `${r.rank} / ${r.fighters}` : '—'}</b></div>
          <div class="stat"><small>Ataki dziś</small><b>{r.left}/{RAID.ATTACKS}</b></div>
        </div>
        {!r.done && (
          <button class="btn primary" style={{ marginTop: '10px', width: '100%' }} disabled={a.busy || r.left <= 0} onClick={attack}>
            {r.left > 0 ? 'Atakuj smoka' : 'Ataki na dziś wykorzystane'}
          </button>
        )}
        <Note msg={a.msg} />
        <p class="sub" style={{ marginTop: '8px' }}>
          Atak zadaje obrażenia z twojej Mocy (×{RAID.DMG_MULT}, ±15%) i daje {coins(3)} oraz złoto. Przełamana faza daje skrzynię każdemu, kto w niej walczył —
          z rudą żywiołu na następną fazę. Pokonany smok: wielka skrzynia ze Smoczą Stalą (podium więcej, pierwsze miejsce także jajo),
          {' '}{RAID.KILL_XP} Doświadczenia klanu i silniejszy smok za tydzień.
        </p>
      </section>
      {r.top.length > 0 && (
        <section class="card">
          <div class="eyebrow">Najwięcej obrażeń</div>
          <ol class="ctop">{r.top.map((x, i) => <li key={i} class={x.me ? 'me' : ''}><span>{i + 1}. {x.n}</span><b class="num">{fmt(x.d)}</b></li>)}</ol>
        </section>
      )}
      {r.log.length > 0 && (
        <section class="card">
          <div class="eyebrow">Kronika smoka</div>
          <ul class="clog">{r.log.map((x, i) => <li key={i}><time>{hhmm(x.t)}</time><span>{x.m}</span></li>)}</ul>
        </section>
      )}
    </>
  );
}
