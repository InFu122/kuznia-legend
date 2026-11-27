// Wojna klanów (co tydzień: dobór, cztery dni aktywności, bitwa w sobotę, nagrody w niedzielę)
// i rajd klanowy Smocze Leże (smok o czterech fazach ze słabościami na żywioły). Wszystko liczy serwer.
import { useEffect, useRef, useState } from 'preact/hooks';
import { B, CLAN, CLAN_WEEK, ELEM, RAID, RAID_PHASES, WAR, WAR_DAYS, type WarDayKind } from '../../data';
import type { ElemKey } from '../../engine/types';
import { dungeonBgUrl, elemUrl, foeSize, foeUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { clanLife } from '../../save/clanlife';
import { getLink, type RaidState, type WarState } from '../../save/server';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { DmgPodium, Note, STRIKE_QUIET, errText, useAction } from './ClanLife';
import { StrikeResult, StrikeStage, bumpRecord, overtaken, useStrike, type StrikeFoe } from './Strike';
import { ChestIcon, ClanEmblem, icUrl } from './ClanUi';
import { DuelReplay } from './Pvp';

const RES_N = { win: 'Zwycięstwo!', draw: 'Remis', loss: 'Porażka' } as const;
/** Ikona dnia wojny. */
const DAY_IC: Record<WarDayKind, string> = { dobor: 'tarcza', kucie: 'kowadlo', fale: 'burza', lochy: 'klucz', boss: 'moc', bitwa: 'okrzyk', nagrody: 'puchar' };
/** Kolor żywiołu (słabość smoka). */
const EL_COL: Record<ElemKey, string> = { zar: '#ff7a45', szron: '#7fd6ff', burz: '#ffe066', jad: '#8ee05a', cien: '#b38cff', jasn: '#fff0a0' };
const Pips = ({ n, max }: { n: number; max: number }) => (
  <span class="cb-pips" aria-label={`zostało ${n} z ${max}`}>{Array.from({ length: max }, (_, i) => <i key={i} class={i < n ? 'on' : ''} />)}</span>
);
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

/**
 * Ostatni stan wojny i Smoczego Leża (z klanem, którego dotyczy): po powrocie na zakładkę widać go od razu, a świeży
 * dochodzi w tle. Bez tego zakładka na chwilę kurczyła się do „Wczytywanie…”, a strona podskakiwała do góry.
 */
const cache: { war: { clan: string; v: WarState } | null; raid: { clan: string; v: RaidState } | null } = { war: null, raid: null };
const clanId = () => clanLife.data?.clan?.id ?? '';
/** Pierwsze wczytanie: karta tak wysoka jak ekran, żeby strona nie skróciła się i nie przewinęła do góry. */
const Waiting = ({ err, text }: { err: string; text: string }) => (
  <section class="card clan-wait">{err ? <p class="sub" role="alert">{err}</p> : <p class="sub">{text}</p>}</section>
);

export function ClanWarTab({ game }: { game: Game }) {
  const [w, setW] = useState<WarState | null>(() => (cache.war && cache.war.clan === clanId() ? cache.war.v : null));
  const [fight, setFight] = useState<WarState['fight'] | null>(null);
  const a = useAction();
  const take = (r: WarState) => {
    clanLife.rewards(game, r.rewards);
    clanLife.brief({ day: r.day, atk: r.me.atkLeft });
    cache.war = { clan: clanId(), v: r };
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
  if (!w) return <Waiting err={err} text="Wczytywanie wojny…" />;

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
  const mine = clanLife.data?.clan;
  const diff = them ? us.total - them.total : 0;
  const nextDay = WAR_DAYS[w.day + 1];
  const best = Math.max(1, ...w.members.map(m => m.pts));

  return (
    <>
      <section class="wr-hero" style={{ '--bg': `url(${dungeonBgUrl('arena')})` } as Record<string, string>}>
        <div class="psh-top">
          <span class="eyebrow">Wojna klanów{w.test ? ' · zegar testowy' : ''}</span>
          {left > 0 && nextDay && <span class="ps-time">{nextDay.short} za {tfmt(left)}</span>}
        </div>
        {them ? (
          <>
            <div class="wr-vs">
              <div class="wr-side us">
                <ClanEmblem id={mine?.id ?? us.n} tag={us.tag} emb={mine?.emb} size={52} />
                <span class="wr-n">{us.tag ? `[${us.tag}] ` : ''}{us.n}</span>
                <b class="wr-pts num">{fmt(us.total)}</b>
                <small>Moc {fmt(us.power)}</small>
              </div>
              <span class="wr-x">VS</span>
              <div class="wr-side them">
                <ClanEmblem id={'wr:' + them.n} tag={them.tag} size={52} />
                <span class="wr-n">{them.tag ? `[${them.tag}] ` : ''}{them.n}{them.ghost && <i class="wr-ghost">widmo</i>}</span>
                <b class="wr-pts num">{fmt(them.total)}</b>
                <small>Moc {fmt(them.power)}</small>
              </div>
            </div>
            <div class="wr-tug" aria-hidden="true"><i style={{ flexGrow: Math.max(1, us.total) }} /><u style={{ flexGrow: Math.max(1, them.total) }} /></div>
            <div class={`wr-lead${diff > 0 ? ' up' : diff < 0 ? ' down' : ''}`}>
              {diff > 0 ? `Prowadzicie o ${fmt(diff)} pkt` : diff < 0 ? `Przeciwnik prowadzi o ${fmt(-diff)} pkt` : 'Remis, każdy punkt się liczy'}
            </div>
          </>
        ) : (
          <div class="wr-wait">
            <span class="wr-wait-ic"><Px src={icUrl('okrzyk')} size={34} /></span>
            <b>Szukamy przeciwnika…</b>
            <small>Dobór trwa do końca poniedziałku: klany o podobnej Mocy dostają się nawzajem. Klan bez pary zmierzy się z klanem-widmem.</small>
          </div>
        )}
        {w.season && (
          <button class="wr-season" onClick={() => game.openModal({ kind: 'ranking', board: 'klany' })}>
            <Px src={resUrl('puchar')} size={16} /> Sezon {w.season.n}: <b>{fmt(w.season.trophies)}</b> Pucharów{w.season.rank ? ` · ${w.season.rank}. miejsce` : ''}
            <small>koniec za {tfmt(Math.max(0, w.season.end - Date.now()))} · ranking ›</small>
          </button>
        )}
      </section>

      <ol class="wr-days" aria-label="Dni wojny">
        {WAR_DAYS.map((x, i) => (
          <li key={x.k} class={i < w.day ? 'past' : i === w.day ? 'on' : ''} title={x.n}>
            <span class="wr-d-ic"><Px src={icUrl(DAY_IC[x.k])} size={18} />{i < w.day && <i class="ct-ok">✓</i>}</span>
            <b>{x.short}</b>
            <small class="num">{i >= 1 && i <= 5 ? (i <= w.day ? fmt(us.days[i] || 0) : '·') : i === 0 ? 'dobór' : 'wynik'}</small>
          </li>
        ))}
      </ol>

      <section class="card wr-today">
        <div class="wr-t-top">
          <span class="wr-t-ic"><Px src={icUrl(DAY_IC[D.k])} size={30} /></span>
          <div class="cmain"><span class="eyebrow">Dziś · {D.short}</span><b class="wr-t-n">{D.n}</b></div>
          {w.me.in && <span class="wr-mine"><small>twoje pkt</small><b class="num">{fmt(w.me.pts)}</b></span>}
        </div>
        <p class="wr-how">{D.how}</p>
        {!w.me.in ? (
          <div class="lockline">Dołączyłeś do klanu po doborze przeciwnika, w wojnie walczysz od przyszłego poniedziałku.</div>
        ) : (
          <>
            {w.day >= 1 && w.day <= 4 && (
              <div class="wr-cap">
                <div class="bar big"><i style={{ width: Math.min(100, (w.me.today / w.me.cap) * 100) + '%' }} /></div>
                <small>Dziś <b class="num">{fmt(w.me.today)} / {fmt(w.me.cap)}</b> pkt (dzienny limit)</small>
              </div>
            )}
            {w.day === 4 && <p class="hnote">Atakuj bossa klanowego w zakładce Boss, każdy atak to {WAR.BOSS_PTS} punktów.</p>}
            {w.day === 0 && <p class="hnote">Jutro dzień kucia: przygotuj rudę, każdy wytop to punkt.</p>}
            {w.day === 5 && <div class="wr-atk"><span>Ataki na obrońców</span><Pips n={w.me.atkLeft} max={WAR.ATTACKS} /></div>}
          </>
        )}
        {w.res && (
          <div class={`duel-result ${w.res.r === 'loss' ? 'lose' : 'win'}`} role="status" style={{ marginTop: '10px' }}>
            <b>{RES_N[w.res.r]}</b>
            <span>{fmt(w.res.us)} : {fmt(w.res.them)} z klanem {w.res.vs}</span>
            <small>{w.res.us > 0 ? 'Skrzynie trafiły do każdego, kto zdobył punkty.' : 'Klan nie zdobył punktów, więc skrzyń nie ma.'} Nowa wojna od poniedziałku.</small>
          </div>
        )}
      </section>

      {w.day === 5 && w.def.length > 0 && (
        <section class="card">
          <span class="eyebrow">Obrońcy wroga</span>
          <p class="hnote">Walczy kopia twojego bohatera. Silniejszy obrońca daje więcej punktów, pierwsza wygrana z obrońcą +{WAR.FIRST_BLOOD}.</p>
          <ul class="hlist">
            {w.def.map(d => {
              const win = Math.round(WAR.WIN_PTS * Math.max(0.5, Math.min(2, d.power / myPower))) + (d.beaten ? 0 : WAR.FIRST_BLOOD);
              const r = d.power / myPower;
              return (
                <li key={d.id} class={`hrow${d.beaten ? ' done' : ''}`}>
                  <span class="mbr-av r-prosba">{d.n.slice(0, 1)}</span>
                  <div class="cmain">
                    <b class="hname">{d.n}{d.ghost && <span class="tag">Cień</span>}{d.beaten > 0 && <span class="tag">pokonany{d.beaten > 1 ? ` ×${d.beaten}` : ''}</span>}</b>
                    <small><span class={`wr-pw${r > 1.15 ? ' hard' : r < 0.85 ? ' easy' : ''}`}>Moc {fmt(d.power)}</span> · wygrana ≈ <b>{win} pkt</b></small>
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
          <span class="eyebrow">Punkty członków</span>
          <ol class="wr-mem">
            {w.members.map((m, i) => (
              <li key={i} class={`${m.me ? 'me' : ''}${i < 3 ? ' top' : ''}`}>
                <span class="wr-rk">{i + 1}</span>
                <div class="cmain">
                  <span class="wr-mn">{m.n}{m.me ? ' (ty)' : ''}{w.day === 5 && <small> · ataki {m.atk}/{WAR.ATTACKS}</small>}</span>
                  <div class="wr-mb"><i style={{ width: (m.pts / best) * 100 + '%' }} /></div>
                </div>
                <b class="num">{fmt(m.pts)}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      {w.log.length > 0 && (
        <section class="card">
          <span class="eyebrow">Przebieg bitwy</span>
          <ul class="ctime">
            {w.log.map((l, i) => (
              <li key={i} class={l.us ? 'us' : 'them'}>
                <i aria-hidden="true" />
                <span>{l.a} → {l.d}: {l.w ? 'wygrana' : 'porażka'} <b class="num">+{l.p}</b>{!l.us && <small class="muted"> (wróg)</small>}</span>
                <time>{hhmm(l.t)}</time>
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
            <li>Skrzynia (Monety, złoto, księgi, kamienie) rośnie z twoim udziałem; zwycięzcy dostają więcej i zwój, a trzy najlepsze osoby w klanie premię. Klan dostaje {WAR.WIN_XP} Doświadczenia za wygraną i {WAR.LOSS_XP} za porażkę.</li>
            <li>Każdy atak w bitwie to też +{CLAN_WEEK.PTS.war} punktów Skrzyni tygodnia klanu.</li>
          </ul>
        </details>
      </section>
    </>
  );
}

/* ---------- Smocze Leże ---------- */

export function ClanRaidTab({ game }: { game: Game }) {
  const [r, setR] = useState<RaidState | null>(() => (cache.raid && cache.raid.clan === clanId() ? cache.raid.v : null));
  const [prev, setPrev] = useState<RaidState | null>(null);
  const sk = useStrike();
  const a = useAction();
  const take = (x: RaidState, quiet?: (why: string) => boolean) => {
    clanLife.rewards(game, x.rewards, quiet);
    clanLife.brief(undefined, { left: x.left, done: x.done });
    cache.raid = { clan: clanId(), v: x };
    setR(x);
  };
  const { err, live } = useServerState(() => getLink()?.raidState(), take);
  if (!r) return <Waiting err={err} text="Wczytywanie Smoczego Leża…" />;

  const foeOf = (x: RaidState): StrikeFoe => {
    const F = RAID_PHASES[Math.min(x.ph, RAID_PHASES.length - 1)].foe;
    return { name: F, img: foeUrl(F), size: Math.min(150, foeSize(F) * 3), hp: x.done ? 0 : x.hp, max: x.max };
  };
  const attack = () => a.run(async () => {
    const l = getLink();
    if (!l) throw new Error();
    const was = r;
    const x = await l.raidAttack();
    if (!live.current) return;
    take(x, STRIKE_QUIET);
    const h = x.hit;
    if (!h) return;
    setPrev(was);
    sk.start({
      id: Date.now(), kind: 'raid', foe: foeOf(was), dmg: h.dmg, q: h.q, bonus: h.bonus, broke: h.phase >= 0 && !h.killed, killed: h.killed,
      base: x.rewards.find(z => z.why.startsWith('Atak na'))?.r ?? {}, loot: h.loot ?? null, last: h.last ?? null,
      rank: [was.rank, x.rank], passed: overtaken(was.top, was.mine, was.mine + h.dmg), record: bumpRecord('raid', h.dmg),
    });
  });
  // W czasie sceny ataku karta pokazuje smoka sprzed ataku (faza, nazwa), potem aktualnego.
  const v = sk.active && prev ? prev : r;
  const ph = Math.min(v.ph, RAID_PHASES.length - 1);
  const P = RAID_PHASES[ph];
  const el = ELEM[r.weak.el];
  const run = sk.run;
  const downText = run?.killed ? 'Smok pokonany!' : run?.broke ? `Faza „${P.n}” przełamana!` : '';

  const col = EL_COL[r.weak.el];
  return (
    <>
      <section class="cb-arena rd-arena" style={{ '--bg': `url(${dungeonBgUrl('leza')})`, '--ec': col } as Record<string, string>}>
        <div class="psh-top">
          <span class="eyebrow">Smocze Leże · smok poziomu {r.lvl + 1}</span>
          {!r.done && <span class="ps-time">odlatuje za {tfmt(Math.max(0, r.ends - game.ctx.now()))}</span>}
        </div>
        <div class="cb-name">{v.done ? 'Smok pokonany!' : P.foe}</div>
        <ol class="rd-ph" aria-label="Fazy smoka">
          {RAID_PHASES.map((x, i) => (
            <li key={i} class={i < v.ph || v.done ? 'done' : i === v.ph ? 'on' : ''} style={{ '--pc': EL_COL[x.weak as ElemKey] } as Record<string, string>}>
              <span class="rd-ph-ic"><Px src={elemUrl(x.weak as ElemKey)} size={18} />{(i < v.ph || v.done) && <i class="ct-ok">✓</i>}</span>
              <small>{x.n}</small>
            </li>
          ))}
        </ol>
        {!v.done || sk.active ? (
          <StrikeStage game={game} foe={foeOf(r)} run={run} active={sk.active} busy={a.busy} downText={downText}
            label={(hp, max) => `Faza ${ph + 1}/${RAID_PHASES.length} · ${fmt(hp)} / ${fmt(max)} · ${Math.round((hp / Math.max(1, max)) * 100)}%`} />
        ) : (
          <>
            <div class="cb-art gone"><Px src={foeUrl(P.foe)} size={Math.min(150, foeSize(P.foe) * 3)} alt={P.foe} /></div>
            <p class="rd-done">Następny, silniejszy smok przyleci w poniedziałek.</p>
          </>
        )}
      </section>
      {!r.done && (
        <div class={`rd-weak${r.weak.n ? ' on' : ''}`} style={{ '--ec': col } as Record<string, string>}>
          <span class="rd-weak-ic"><Px src={elemUrl(r.weak.el)} size={30} /></span>
          <div class="cmain">
            <span class="eyebrow">Słabość: {el.el}</span>
            <b>{r.weak.n ? `+${Math.round(r.weak.bonus * 100)}% obrażeń` : `do +${Math.round(RAID.WEAK_MAX * 100)}% obrażeń`}</b>
            <small>
              {r.weak.n
                ? `Masz ${r.weak.n} ${r.weak.n === 1 ? 'przedmiot' : 'przedmioty'} z domieszką ${el.n}.`
                : `+${Math.round(RAID.WEAK_PER_ITEM * 100)}% za każdy przedmiot z domieszką ${el.n}. Domieszki w Kuźni od ${B.ELEM_FORGE_LVL}. poziomu.`}
            </small>
          </div>
        </div>
      )}
      {!r.done && (
        <button class="btn primary big cb-go" disabled={a.busy || r.left <= 0} onClick={attack}>
          <span class="cb-go-t">{r.left > 0 ? 'Atakuj smoka' : 'Ataki na dziś zużyte'}</span>
          <Pips n={r.left} max={RAID.ATTACKS} />
        </button>
      )}
      <Note msg={a.msg} />
      {run && <StrikeResult run={run} what={run.killed ? 'smoka' : 'fazy smoka'} />}
      <DmgPodium top={r.top} rank={r.rank} fighters={r.fighters} mine={r.mine} />
      <section class="card cb-rew">
        <span class="eyebrow">Nagrody</span>
        <ul>
          <li><Px src={resUrl('moneta')} size={22} /><span><b>Za każdy atak</b><small>+3 Monety klanowe i złoto · obrażenia: Moc ×{RAID.DMG_MULT} (±15%)</small></span></li>
          <li><Px src={elemUrl(RAID_PHASES[Math.min(ph + 1, RAID_PHASES.length - 1)].weak as ElemKey)} size={22} /><span><b>Przełamana faza</b><small>skrzynia z rudą żywiołu na następną fazę</small></span></li>
          <li><Px src={resUrl('jajo3')} size={22} /><span><b>Pokonany smok</b><small>wielka skrzynia ze Smoczą Stalą · podium więcej, 1. miejsce jajo · {RAID.KILL_XP} Dośw. klanu</small></span></li>
          <li><ChestIcon tier={2} state="open" size={22} /><span><b>Łup z ataku</b><small>{Math.round(CLAN.LOOT_CHANCE * 100)}% szansy przy każdym ataku: księgi, kamienie, zwój, ruda żywiołu albo jajo</small></span></li>
          <li><ChestIcon tier={4} state="open" size={22} /><span><b>Cios ostateczny</b><small>skrzynia za przełamanie fazy, podwójna za dobicie smoka</small></span></li>
        </ul>
      </section>
      {r.log.length > 0 && (
        <section class="card">
          <span class="eyebrow">Kronika smoka</span>
          <ul class="ctime">{r.log.map((x, i) => <li key={i}><i aria-hidden="true" /><span>{x.m}</span><time>{hhmm(x.t)}</time></li>)}</ul>
        </section>
      )}
    </>
  );
}
