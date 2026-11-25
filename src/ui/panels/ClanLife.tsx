// Życie klanu w zakładce Klan: Wspólna Kuźnia, boss klanowy, pomoc (ulepszenia i ruda) oraz sklep klanowy.
// Stan przychodzi z serwera (clan_sync i akcje klanu); nagrody i pomoc klanu od razu trafiają do gry.
import { useEffect, useState } from 'preact/hooks';
import { CLAN, CLAN_LEVELS, CLAN_SHOP, CLAN_SHOP_IDS, CLAN_WEEK, ORES, ORE_ORDER, ORE_WANT, TECH, TECH_UNLOCK_FORGE, type ClanEff, type ClanShopId } from '../../data';
import { techKey, techLvl } from '../../engine/mods';
import { bossUrl, dungeonBgUrl, oreUrl, resUrl } from '../../art/render';
import { icUrl } from './ClanUi';

/** Ikona premii poziomu klanu. */
const PERK_IC: Partial<Record<ClanEff, string>> = { goldPct: 'zloto', dmgPct: 'moc', hpPct: 'eliksir', extraOre: 'kamien', forgeTime: 'czas', offlineMin: 'swieca' };
import { donateCost, shopBlock, shopLeft, shopReward } from '../../engine/clan';
import type { Game } from '../../engine/game';
import { clanLife } from '../../save/clanlife';
import { ServerError, type ClanLife, type ClanOreReq } from '../../save/server';
import { PlayError } from '../billing';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { coins } from '../texts';
import { Res, RewardIcons } from '../RewardIcons';

export type ClanTab = 'klan' | 'wojna' | 'smok' | 'boss' | 'kuznia' | 'pomoc' | 'sklep';
export const errText = (e: unknown) => (e instanceof ServerError || e instanceof PlayError ? e.message : 'Brak połączenia z serwerem.');

/** Aktualny stan klanu z serwera (odświeża widok po każdej zmianie). */
export function useClanLife(): ClanLife | null {
  const [, force] = useState(0);
  useEffect(() => clanLife.on(() => force(x => x + 1)), []);
  return clanLife.data;
}

/** Akcja na serwerze z blokadą przycisków i komunikatem. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async (fn: () => Promise<string | void>) => {
    if (busy) return;
    setBusy(true); setMsg('');
    try { const m = await fn(); if (m) setMsg(m); } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  return { busy, msg, setMsg, run };
}

export const Note = ({ msg }: { msg: string }) => (msg ? <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p> : null);
const CoinIco = ({ size = 16 }: { size?: number }) => <Px src={resUrl('moneta')} size={size} />;

function Loading({ d }: { d: ClanLife | null }) {
  return <section class="card"><p class="sub">{d === null ? 'Wczytywanie klanu…' : 'Brak danych klanu.'}</p></section>;
}

/* ---------- Wspólna Kuźnia Klanu ---------- */

export function ClanForgeTab({ game }: { game: Game }) {
  const d = useClanLife();
  const a = useAction();
  if (!d?.clan || d.lvl === undefined || !d.left) return <Loading d={d} />;
  const s = game.s;
  const cost = donateCost(s);
  const lvl = d.lvl;
  const next = d.next ?? null;
  const cur = d.cur ?? 0;
  const pctNext = next ? Math.min(100, ((d.xp! - cur) / (next - cur)) * 100) : 100;
  const donate = () => a.run(async () => {
    if (!game.clanPay(cost)) return 'Za mało złota na datek.';
    try {
      const r = await clanLife.act(game, (l, up) => l.clanDonate(up));
      return r.levelUp ? `Wspólna Kuźnia osiąga ${r.levelUp}. poziom!` : `Dziękujemy! +${CLAN.DONATE_XP} Doświadczenia klanu.`;
    } catch (e) { game.clanRefund(cost); throw e; }
  });
  const left = d.left;
  const pips = Array.from({ length: CLAN.DONATE_PER_DAY }, (_, i) => i < CLAN.DONATE_PER_DAY - left.don);
  return (
    <>
      <section class="ch-hero cfg-hero" style={{ '--bg': `url(${dungeonBgUrl('ulepszenie')})` } as Record<string, string>}>
        <div class="ch-top">
          <div class="cfg-badge" aria-hidden="true"><small>poz.</small><b>{lvl}</b></div>
          <div class="ch-main">
            <span class="eyebrow">Wspólna Kuźnia Klanu</span>
            <div class="ch-name">{lvl >= CLAN_LEVELS.length ? 'Poziom maksymalny' : `Poziom ${lvl}`}</div>
            {next !== null && <small class="cfg-next">Następny: <b>{CLAN_LEVELS[lvl].d}</b></small>}
          </div>
        </div>
        {next !== null && (
          <div class="ch-xp">
            <div class="bar big"><i style={{ width: pctNext + '%' }} /></div>
            <small><b>{fmt(d.xp!)} / {fmt(next)}</b> Doświadczenia · datki i pokonane bossy klanowe</small>
          </div>
        )}
      </section>
      <section class="card cfg-don">
        <div class="cfg-don-top">
          <span class="cfg-gold"><Px src={resUrl('zloto')} size={34} /></span>
          <div class="cmain">
            <span class="eyebrow">Datek dzienny</span>
            <b class="cfg-cost">{fmt(cost)} złota</b>
            <div class="cfg-gets">
              <span>+{CLAN.DONATE_XP} Dośw. klanu</span><span><Res r={{ coins: CLAN.DONATE_COINS }} size={13} /></span><span>+{CLAN_WEEK.PTS.don} pkt tygodnia</span>
            </div>
          </div>
        </div>
        <button class="btn primary big cb-go" disabled={a.busy || d.left.don <= 0 || s.gold < cost} onClick={donate}>
          <span class="cb-go-t">{d.left.don > 0 ? (s.gold < cost ? 'Za mało złota' : 'Wpłać') : 'Na dziś wpłacone'}</span>
          <span class="cb-pips" aria-label={`wpłacono ${CLAN.DONATE_PER_DAY - d.left.don} z ${CLAN.DONATE_PER_DAY}`}>{pips.map((x, i) => <i key={i} class={x ? '' : 'on'} />)}</span>
        </button>
        <Note msg={a.msg} />
      </section>
      <section class="card">
        <div class="eyebrow">Premie poziomów klanu</div>
        <p class="sub">Działają u każdego członka klanu, także po zmianie krainy.</p>
        <ol class="cperks">
          {CLAN_LEVELS.map((L, i) => (
            <li key={i} class={i < lvl ? 'on' : i === lvl ? 'next' : ''}>
              <span class="cp-n">{i + 1}</span>
              <Px src={icUrl(PERK_IC[L.eff[0][0]] ?? 'moc')} size={22} />
              <span class="cp-d">{L.d}</span>
              <small>{i < lvl ? '✓ aktywna' : i === lvl ? `${fmt(L.xp - (d.xp ?? 0))} do zdobycia` : `${fmt(L.xp)} Dośw.`}</small>
            </li>
          ))}
        </ol>
      </section>
      {d.log && d.log.length > 0 && (
        <section class="card">
          <div class="eyebrow">Kronika klanu</div>
          <ul class="ctime">
            {d.log.map((x, i) => (
              <li key={i}>
                <i aria-hidden="true" />
                <span>{x.m}{(x.n ?? 1) > 1 && <span class="times">×{x.n}</span>}</span>
                <time>{new Date(x.t).toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* ---------- boss klanowy ---------- */

/** Podium trzech najlepszych i dalsze miejsca w rankingu obrażeń (boss klanowy i smok). */
export function DmgPodium({ top, rank, fighters, mine }: { top: { n: string; d: number; me: boolean }[]; rank: number; fighters: number; mine: number }) {
  if (!top.length) return null;
  const podium = [top[1], top[0], top[2]];
  return (
    <section class="card">
      <div class="row"><span class="eyebrow">Ranking obrażeń</span><span class="tech-cost">ty: {rank ? `${rank}. z ${fighters}` : '—'} · {fmt(mine)}</span></div>
      <div class="cb-podium">
        {podium.map((x, k) => x && (
          <div key={k} class={`cb-pod p${k === 1 ? 1 : k === 0 ? 2 : 3}${x.me ? ' me' : ''}`}>
            <span class="cb-medal">{k === 1 ? 1 : k === 0 ? 2 : 3}</span>
            <span class="mbr-av">{x.n.slice(0, 1)}</span>
            <b>{x.n}</b>
            <small class="num">{fmt(x.d)}</small>
            <i class="cb-step" />
          </div>
        ))}
      </div>
      {top.length > 3 && <ol class="ctop" start={4}>{top.slice(3).map((x, i) => <li key={i} class={x.me ? 'me' : ''}><span>{i + 4}. {x.n}</span><b class="num">{fmt(x.d)}</b></li>)}</ol>}
    </section>
  );
}

export function ClanBossTab({ game }: { game: Game }) {
  const d = useClanLife();
  const a = useAction();
  const [hit, setHit] = useState<{ dmg: number; key: number; killed: boolean } | null>(null);
  if (!d?.clan || !d.boss || !d.left) return <Loading d={d} />;
  const b = d.boss;
  const attack = () => a.run(async () => {
    const r = await clanLife.act(game, (l, up) => l.clanBossAttack(up));
    if (r.hit) setHit({ dmg: r.hit.dmg, key: Date.now(), killed: r.hit.killed });
    return r.hit?.killed ? 'Boss pokonany! Skrzynie trafiają do wszystkich, którzy go atakowali.' : `Zadajesz ${fmt(r.hit?.dmg ?? 0)} obrażeń.`;
  });
  const hpPct = Math.max(0, (b.hp / b.max) * 100);
  const left = d.left.atk;
  return (
    <>
      <section class="cb-arena" style={{ '--bg': `url(${dungeonBgUrl('leza')})` } as Record<string, string>}>
        <div class="psh-top"><span class="eyebrow">Boss klanowy · poziom {b.lvl + 1}</span><span class="ps-time">pokonano: {b.kills}</span></div>
        <div class="cb-name">{b.n}</div>
        <div class={`cb-art${hit ? ' hit' : ''}`} key={hit?.key}>
          <Px src={bossUrl(b.pal)} size={150} alt={b.n} />
          {hit && <span class={`bhit${hit.killed ? ' kill' : ''}`} aria-hidden="true">−{fmt(hit.dmg)}</span>}
        </div>
        <div class="cb-hp">
          <div class="bar big cb-hpbar" role="progressbar" aria-label="Zdrowie bossa" aria-valuenow={Math.round(hpPct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: hpPct + '%' }} /></div>
          <span class="num">{fmt(b.hp)} / {fmt(b.max)} · {Math.round(hpPct)}%</span>
        </div>
      </section>
      <button class="btn primary big cb-go" disabled={a.busy || left <= 0} onClick={attack}>
        <span class="cb-go-t">{left > 0 ? 'Atakuj' : 'Ataki na dziś zużyte'}</span>
        <span class="cb-pips" aria-label={`zostało ${left} z ${CLAN.BOSS_ATTACKS}`}>{Array.from({ length: CLAN.BOSS_ATTACKS }, (_, i) => <i key={i} class={i < left ? 'on' : ''} />)}</span>
      </button>
      <Note msg={a.msg} />
      <DmgPodium top={b.top} rank={b.rank} fighters={b.fighters} mine={b.mine} />
      <section class="card cb-rew">
        <span class="eyebrow">Nagrody</span>
        <ul>
          <li><Px src={resUrl('moneta')} size={22} /><span><b>Za każdy atak</b><small>+{CLAN.BOSS_ATTACK_COINS} Monety klanowe i złoto</small></span></li>
          <li><Px src={resUrl('puchar')} size={22} /><span><b>Boss pokonany</b><small>skrzynia dla każdego, kto atakował</small></span></li>
          <li><Px src={resUrl('jajo3')} size={22} /><span><b>1. miejsce</b><small>większa skrzynia i jajo</small></span></li>
        </ul>
        <small class="sub">Atak zadaje obrażenia równe twojej Mocy (±15%). Po pokonaniu przychodzi silniejszy boss.</small>
      </section>
    </>
  );
}

/* ---------- pomoc w ulepszeniach i prośby o rudę ---------- */

/** Kropki postępu (np. pomocy 4/10). */
const Pips = ({ n, max, cls = '' }: { n: number; max: number; cls?: string }) => (
  <span class={`hpips ${cls}`} aria-hidden="true">{Array.from({ length: max }, (_, i) => <i key={i} class={i < n ? 'on' : ''} />)}</span>
);
/** Nagroda za dobry uczynek (pomoc, dar rudy) z dziennym limitem. */
const DeedChip = ({ left }: { left: number }) => (
  <span class={`hdeed${left > 0 ? '' : ' off'}`}>
    <CoinIco size={14} />+{CLAN.DEED_COINS} za pomoc · {left > 0 ? `nagradzane jeszcze ${left}/${CLAN.DEEDS_PER_DAY}` : 'limit nagród na dziś'}
  </span>
);

function OreAsk({ game, d }: { game: Game; d: ClanLife }) {
  const a = useAction();
  const s = game.s;
  const open = ORE_ORDER.filter(i => ORES[i].lvl <= s.forge.lvl && ORE_WANT[i] > 0);
  const [ore, setOre] = useState(open.includes(s.oreSel) ? s.oreSel : open[open.length - 1] ?? 0);
  const wait = d.oreNext ? d.oreNext - game.ctx.now() : 0;
  if (d.myOre) {
    const m = d.myOre;
    return (
      <div class="hore-mine">
        <span class="hore-ic"><Px src={oreUrl(m.ore)} size={36} /></span>
        <div class="cmain">
          <span class="eyebrow">Twoja prośba</span>
          <b>{ORES[m.ore].n}</b>
          <div class="bar"><i style={{ width: (m.got / m.want) * 100 + '%' }} /></div>
          <small class="num">{m.got} / {m.want} · ruda trafia do ciebie od razu</small>
        </div>
      </div>
    );
  }
  if (wait > 0) return <p class="hwait"><Px src={icUrl('czas')} size={18} />Następna prośba o rudę za <b>{tfmt(wait)}</b></p>;
  const ask = () => a.run(async () => {
    await clanLife.act(game, (l, up) => l.clanOreAsk(up, ore));
    return `Prośba wysłana: ${ORE_WANT[ore]} × ${ORES[ore].n}.`;
  });
  return (
    <>
      <div class="hore-pick" role="radiogroup" aria-label="Ruda do prośby">
        {open.map(i => (
          <button key={i} role="radio" aria-checked={ore === i} class={ore === i ? 'on' : ''} onClick={() => setOre(i)} title={ORES[i].n}>
            <Px src={oreUrl(i)} size={30} alt={ORES[i].n} />
            <small class="num">×{ORE_WANT[i]}</small>
          </button>
        ))}
      </div>
      <button class="btn primary hbig" disabled={a.busy} onClick={ask}>Poproś o {ORE_WANT[ore]} × {ORES[ore].n}</button>
      <small class="hnote">Jedna prośba na 8 godzin.</small>
      <Note msg={a.msg} />
    </>
  );
}
function OreGive({ game, o }: { game: Game; o: ClanOreReq }) {
  const a = useAction();
  const have = game.s.ores[o.ore] ?? 0;
  const k = Math.max(0, Math.min(CLAN.ORE_GIVE_MAX, o.want - o.got, have));
  const give = () => a.run(async () => {
    if (!game.clanPay(0, { i: o.ore, n: k })) return `Brakuje rudy: ${ORES[o.ore].n}.`;
    try {
      const r = await clanLife.act(game, (l, up) => l.clanOreGive(up, o.id, k));
      const given = r.given ?? 0;
      if (given < k) game.clanRefund(0, { i: o.ore, n: k - given });
      return `Przekazano ${given} × ${ORES[o.ore].n} dla: ${o.n}.${r.paid ? ` +${coins(r.paid * CLAN.DEED_COINS)}.` : ''}`;
    } catch (e) { game.clanRefund(0, { i: o.ore, n: k }); throw e; }
  });
  return (
    <li class="hrow">
      <span class="hore-ic sm"><Px src={oreUrl(o.ore)} size={28} /></span>
      <div class="cmain">
        <b class="hname">{o.n}</b>
        <small>{ORES[o.ore].n} · masz <b class="num">{fmt(have)}</b></small>
        <div class="hbar"><div class="bar"><i style={{ width: (o.got / o.want) * 100 + '%' }} /></div><small class="num">{o.got}/{o.want}</small></div>
        {a.msg && <small class="hmsg" role="status">{a.msg}</small>}
      </div>
      <button class={`btn small${k > 0 ? ' primary' : ''}`} disabled={a.busy || k <= 0} onClick={give}>{k > 0 ? `Daj ×${k}` : 'Brak rudy'}</button>
    </li>
  );
}

/** Twoje ulepszenie kuźni albo badanie: ile pomocy klanu, o ile krócej, prośba do klanu. */
function MyHelp({ game, d, what }: { game: Game; d: ClanLife; what: 'forge' | 'tech' }) {
  const a = useAction();
  const s = game.s;
  const forge = what === 'forge';
  const tk = techKey(s);
  const on = forge ? !!s.forge.up : !!s.tech.cur;
  const got = forge ? (s.forge.up && s.clanHelp.lvl === s.forge.up ? s.clanHelp.n : 0) : (tk && s.clanHelpT.tk === tk ? s.clanHelpT.n : 0);
  const asked = forge ? !!(d.myHelp && d.myHelp.lvl === s.forge.up) : !!(d.myHelpT && d.myHelpT.tk === tk);
  const title = forge
    ? (s.forge.up ? `Ulepszanie do poz. ${s.forge.up}` : 'Kuźnia czeka na ulepszenie')
    : (s.tech.cur ? `${TECH[s.tech.cur.id].n} → poz. ${techLvl(s, s.tech.cur.id) + 1}` : 'Akademia czeka na badanie');
  const left = forge ? s.forge.left : s.tech.cur?.left ?? 0;
  const ask = () => a.run(async () => { await clanLife.act(game, (l, up) => l.clanHelpAsk(up, what)); return 'Prośba o pomoc wysłana do klanu.'; });
  return (
    <section class={`ch-hero hlp-hero${forge ? '' : ' hlp-tech'}`} style={{ '--bg': `url(${dungeonBgUrl(forge ? 'kuznia' : 'wieza')})` } as Record<string, string>}>
      <div class="ch-top">
        <span class="hlp-ic"><Px src={icUrl(forge ? 'kowadlo' : 'ksiega')} size={34} /></span>
        <div class="ch-main">
          <span class="eyebrow">{forge ? 'Twoja kuźnia' : 'Twoje badanie'}</span>
          <div class="hlp-t">{title}</div>
          {on ? <small class="hlp-s">zostało <b class="num">{tfmt(left)}</b></small>
            : <small class="hlp-s">Poproś klan o pomoc, gdy zaczniesz {forge ? 'ulepszenie' : 'badanie w Akademii'}.</small>}
        </div>
        <span class={`hlp-cut${got ? ' on' : ''}`}><b>−{got * CLAN.HELP_PCT}%</b><small>czasu</small></span>
      </div>
      <div class="hlp-prog">
        <Pips n={got} max={CLAN.HELP_MAX} cls="big" />
        <small>Pomoc klanu <b class="num">{got}/{CLAN.HELP_MAX}</b> · każda skraca {forge ? 'ulepszenie' : 'badanie'} o {CLAN.HELP_PCT}%</small>
      </div>
      {on ? (
        got >= CLAN.HELP_MAX ? <div class="hlp-state ok">✓ Pełna pomoc klanu</div>
          : asked ? <div class="hlp-state">Prośba wysłana · klan widzi ją w zakładce Pomoc i na czacie</div>
            : <button class="btn primary big hbig" disabled={a.busy} onClick={ask}>Poproś klan o pomoc</button>
      ) : null}
      <Note msg={a.msg} />
    </section>
  );
}

export function ClanHelpTab({ game }: { game: Game }) {
  const d = useClanLife();
  const h2 = useAction();
  if (!d?.clan || !d.left) return <Loading d={d} />;
  const helps = d.helps ?? [];
  const toHelp = helps.filter(h => !h.done);
  const help = (uid?: string, k?: 'f' | 't') => h2.run(async () => {
    const r = await clanLife.act(game, (l, up) => l.clanHelp(up, uid, k));
    const n = r.helpedNow ?? 0;
    return `Pomoc dla ${n} ${n === 1 ? 'prośby' : 'próśb'}${r.paid ? ` · +${coins(r.paid * CLAN.DEED_COINS)}` : ''}.`;
  });
  return (
    <>
      <MyHelp game={game} d={d} what="forge" />
      {game.s.forge.lvl >= TECH_UNLOCK_FORGE && <MyHelp game={game} d={d} what="tech" />}
      <section class="card">
        <div class="row">
          <div><span class="eyebrow">Kowale proszą o pomoc · {helps.length}</span></div>
          {toHelp.length > 1 && <button class="btn small primary" disabled={h2.busy} onClick={() => help()}>Pomóż wszystkim ({toHelp.length})</button>}
        </div>
        <DeedChip left={d.left.deed} />
        {helps.length === 0 ? <p class="hempty"><Px src={icUrl('czas')} size={22} />Nikt teraz nie prosi o pomoc.</p> : (
          <ul class="hlist">
            {helps.map(h => (
              <li key={h.uid + (h.k ?? 'f')} class={`hrow${h.done ? ' done' : ''}`}>
                <span class="mbr-av">{h.n.slice(0, 1)}</span>
                <div class="cmain">
                  <b class="hname">{h.n}</b>
                  <small class="hwhat"><Px src={icUrl(h.k === 't' ? 'ksiega' : 'kowadlo')} size={14} />{h.k === 't' ? `Badanie: ${h.tn ?? ''}` : `Kuźnia → poziom ${h.lvl}`}</small>
                  <div class="hbar"><Pips n={h.got} max={CLAN.HELP_MAX} /><small class="num">{h.got}/{CLAN.HELP_MAX}</small></div>
                </div>
                {h.done ? <span class="hdone">✓ Pomogłeś</span> : <button class="btn small primary" disabled={h2.busy} onClick={() => help(h.uid, h.k ?? 'f')}>Pomóż</button>}
              </li>
            ))}
          </ul>
        )}
        <Note msg={h2.msg} />
      </section>
      <section class="card">
        <span class="eyebrow">Ruda dla klanu</span>
        <OreAsk game={game} d={d} />
        {(d.ores ?? []).length > 0 && (
          <>
            <div class="eyebrow" style={{ marginTop: '12px' }}>Klan prosi o rudę</div>
            <ul class="hlist">{(d.ores ?? []).map(o => <OreGive key={o.id} game={game} o={o} />)}</ul>
          </>
        )}
        <small class="hnote">Jeden dar to najwyżej {CLAN.ORE_GIVE_MAX} sztuk. Dar rudy też daje Monety i punkty tygodnia.</small>
      </section>
    </>
  );
}

/* ---------- sklep klanowy ---------- */

const shopIcon = (id: ClanShopId) => { const k = CLAN_SHOP[id].icon; return k.startsWith('ore') ? oreUrl(Number(k.slice(3))) : resUrl(k); };
/** Czas do najbliższego poniedziałku (wtedy odnawiają się limity sklepu). */
const toMonday = (now: number) => {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return next.getTime() - now;
};

export function ClanShopTab({ game }: { game: Game }) {
  const d = useClanLife();
  const [msg, setMsg] = useState('');
  const [got, setGot] = useState<{ id: ClanShopId; key: number } | null>(null);
  const s = game.s;
  const now = game.ctx.now();
  const ways: [string, string, number][] = [
    ['zloto', 'Datek', CLAN.DONATE_COINS], ['moc', 'Atak na bossa', CLAN.BOSS_ATTACK_COINS], ['czas', 'Pomoc i dar rudy', CLAN.DEED_COINS],
  ];
  return (
    <>
      <section class="cs-head">
        <div class="cs-bal">
          <span class="cs-coin"><Px src={resUrl('moneta')} size={40} /></span>
          <div>
            <span class="eyebrow">Monety klanowe</span>
            <b class="num">{fmt(s.clanCoins)}</b>
          </div>
          <span class="ps-time">nowe limity za {tfmt(toMonday(now))}</span>
        </div>
        <ul class="cs-ways">
          {ways.map(([ic, n, c]) => <li key={n}><Px src={icUrl(ic)} size={16} />{n}<b>+{c}</b></li>)}
        </ul>
      </section>
      <ul class="cs-grid">
        {CLAN_SHOP_IDS.map(id => {
          const it = CLAN_SHOP[id];
          const block = shopBlock(s, id, now);
          const locked = s.clanLvl < it.lvl;
          const left = shopLeft(s, id, now);
          const sold = !locked && left <= 0;
          const poor = !locked && !sold && s.clanCoins < it.cost;
          const top = id === 'pieczec' || id === 'jajo';
          return (
            <li key={id} class={`cs-it${locked ? ' locked' : ''}${sold ? ' sold' : ''}${top ? ' top' : ''}`}>
              <span class={`cs-ic${got?.id === id ? ' pop' : ''}`} key={got?.id === id ? got.key : id}><Px src={shopIcon(id)} size={40} /></span>
              <b class="cs-n">{it.n}</b>
              {locked ? <small class="cs-r">od <b>{it.lvl}.</b> poziomu klanu</small> : id === 'zloto' ? <small class="cs-r"><RewardIcons r={shopReward(s, id)} size={13} /></small> : null}
              {!locked && <span class="cs-left"><Pips n={left} max={Math.min(it.week, 10)} /><small class="num">{left}/{it.week} w tyg.</small></span>}
              {locked ? <span class="cs-lock">🔒 Poziom {it.lvl}</span> : (
                <button class={`btn small price${!block ? ' primary' : ''}${poor ? ' poor' : ''}`} disabled={!!block} title={block ?? ''}
                  onClick={() => { if (game.buyClan(id)) { setMsg(`Kupiono: ${it.n}.`); setGot({ id, key: Date.now() }); } }}>
                  {sold ? 'Wyprzedane' : <><CoinIco />{it.cost}</>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {msg && <p class="sub" role="status">{msg}</p>}
      <p class="sub">Lepsze towary odblokowuje poziom Wspólnej Kuźni klanu{d?.lvl !== undefined ? ` (teraz: ${d.lvl})` : ''}.</p>
    </>
  );
}

/** Wskaźnik pomocy klanu przy ulepszaniu kuźni (zakładka Kuźnia) albo przy badaniu (Akademia). */
export function ClanHelpLine({ game, what = 'forge' }: { game: Game; what?: 'forge' | 'tech' }) {
  const d = useClanLife();
  const a = useAction();
  const s = game.s;
  const forge = what === 'forge';
  const tk = techKey(s);
  if (!d?.clan || (forge ? !s.forge.up : !tk)) return null;
  const got = forge ? (s.clanHelp.lvl === s.forge.up ? s.clanHelp.n : 0) : (s.clanHelpT.tk === tk ? s.clanHelpT.n : 0);
  const asked = forge ? !!(d.myHelp && d.myHelp.lvl === s.forge.up) : !!(d.myHelpT && d.myHelpT.tk === tk);
  const ask = () => a.run(async () => { await clanLife.act(game, (l, up) => l.clanHelpAsk(up, what)); });
  return (
    <div class="row clanhelp" style={{ marginTop: '8px' }}>
      <span class="tech-cost">Pomoc klanu: {got}/{CLAN.HELP_MAX}{got ? ` (−${got * CLAN.HELP_PCT}%)` : ''}{a.msg ? ` · ${a.msg}` : ''}</span>
      {got < CLAN.HELP_MAX && !asked && <button class="btn small" disabled={a.busy} onClick={ask}>Poproś klan o pomoc</button>}
      {asked && got < CLAN.HELP_MAX && <span class="muted">prośba wysłana</span>}
    </div>
  );
}
