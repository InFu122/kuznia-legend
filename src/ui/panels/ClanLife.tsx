// Życie klanu w zakładce Klan: Wspólna Kuźnia, boss klanowy, pomoc (ulepszenia i ruda) oraz sklep klanowy.
// Stan przychodzi z serwera (clan_sync i akcje klanu); nagrody i pomoc klanu od razu trafiają do gry.
import { useEffect, useState } from 'preact/hooks';
import { CLAN, CLAN_LEVELS, CLAN_SHOP, CLAN_SHOP_IDS, ORES, ORE_WANT, type ClanShopId } from '../../data';
import { bossUrl, oreUrl, resUrl } from '../../art/render';
import { donateCost, shopBlock, shopLeft, shopReward } from '../../engine/clan';
import type { Game } from '../../engine/game';
import { clanLife } from '../../save/clanlife';
import { ServerError, type ClanLife, type ClanOreReq } from '../../save/server';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { coins, rewardText } from '../texts';

export type ClanTab = 'klan' | 'wojna' | 'smok' | 'boss' | 'kuznia' | 'pomoc' | 'sklep';
export const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');

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
  return (
    <>
      <section class="card">
        <div class="eyebrow">Wspólna Kuźnia Klanu</div>
        <div class="row"><div class="h">Poziom {lvl}{lvl >= CLAN_LEVELS.length ? ' (maks.)' : ''}</div>{next !== null && <span class="num">{fmt(d.xp!)} / {fmt(next)}</span>}</div>
        <div class="bar" style={{ marginTop: '8px' }}><i style={{ width: pctNext + '%' }} /></div>
        <p class="sub" style={{ marginTop: '6px' }}>Datki i pokonane bossy klanowe dają Doświadczenie. Każdy poziom daje premię wszystkim członkom klanu.</p>
        <div class="row" style={{ marginTop: '10px' }}>
          <div class="cmain">
            <b class="inl">Datek: <Px src={resUrl('zloto')} size={16} />{fmt(cost)} złota</b>
            <div class="tech-cost">+{CLAN.DONATE_XP} Doświadczenia klanu · +{coins(CLAN.DONATE_COINS)} · dziś zostało {d.left.don}/{CLAN.DONATE_PER_DAY}</div>
          </div>
          <button class="btn primary small" disabled={a.busy || d.left.don <= 0 || s.gold < cost} onClick={donate}>Wpłać</button>
        </div>
        <Note msg={a.msg} />
      </section>
      <section class="card">
        <div class="eyebrow">Premie poziomów klanu</div>
        <ol class="clevels">
          {CLAN_LEVELS.map((L, i) => (
            <li key={i} class={i < lvl ? 'on' : i === lvl ? 'next' : ''}>
              <b>{i + 1}</b><span>{L.d}</span><small>{i < lvl ? 'aktywna' : `${fmt(L.xp)} Dośw.`}</small>
            </li>
          ))}
        </ol>
      </section>
      {d.log && d.log.length > 0 && (
        <section class="card">
          <div class="eyebrow">Kronika klanu</div>
          <ul class="clog">
            {d.log.map((x, i) => (
              <li key={i}>
                <time>{new Date(x.t).toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                <span>{x.m}{(x.n ?? 1) > 1 && <span class="times">×{x.n}</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* ---------- boss klanowy ---------- */

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
  return (
    <>
      <section class="card cboss">
        <div class="eyebrow">Boss klanowy · poziom {b.lvl + 1}</div>
        <div class="h">{b.n}</div>
        <div class={`boss-art${hit ? ' hit' : ''}`} key={hit?.key}>
          <Px src={bossUrl(b.pal)} size={128} alt={b.n} />
          {hit && <span class={`bhit${hit.killed ? ' kill' : ''}`} aria-hidden="true">−{fmt(hit.dmg)}</span>}
        </div>
        <div class="bar hpbar" role="progressbar" aria-label="Zdrowie bossa" aria-valuenow={Math.round(hpPct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: hpPct + '%' }} /></div>
        <div class="row" style={{ marginTop: '4px' }}><span class="num">{fmt(b.hp)} / {fmt(b.max)}</span><span class="tech-cost">pokonane: {b.kills}</span></div>
        <div class="stats" style={{ marginTop: '10px' }}>
          <div class="stat"><small>Twoje obrażenia</small><b>{fmt(b.mine)}</b></div>
          <div class="stat"><small>Miejsce</small><b>{b.rank ? `${b.rank} / ${b.fighters}` : '—'}</b></div>
          <div class="stat"><small>Ataki dziś</small><b>{d.left.atk}/{CLAN.BOSS_ATTACKS}</b></div>
        </div>
        <button class="btn primary" style={{ marginTop: '10px', width: '100%' }} disabled={a.busy || d.left.atk <= 0} onClick={attack}>
          {d.left.atk > 0 ? 'Atakuj' : 'Ataki na dziś wykorzystane'}
        </button>
        <Note msg={a.msg} />
        <p class="sub" style={{ marginTop: '8px' }}>
          Atak zadaje obrażenia równe twojej Mocy w rankingu (±15%) i daje {coins(CLAN.BOSS_ATTACK_COINS)} oraz złoto.
          Pokonany boss zostawia skrzynię każdemu, kto go atakował — pierwsze miejsce dostaje więcej i jajo. Potem przychodzi silniejszy.
        </p>
      </section>
      {b.top.length > 0 && (
        <section class="card">
          <div class="eyebrow">Najwięcej obrażeń</div>
          <ol class="ctop">{b.top.map((x, i) => <li key={i} class={x.me ? 'me' : ''}><span>{i + 1}. {x.n}</span><b class="num">{fmt(x.d)}</b></li>)}</ol>
        </section>
      )}
    </>
  );
}

/* ---------- pomoc w ulepszeniach i prośby o rudę ---------- */

function OreAsk({ game, d }: { game: Game; d: ClanLife }) {
  const a = useAction();
  const s = game.s;
  const open = ORES.map((_, i) => i).filter(i => ORES[i].lvl <= s.forge.lvl);
  const [ore, setOre] = useState(open.includes(s.oreSel) ? s.oreSel : open[open.length - 1] ?? 0);
  const wait = d.oreNext ? d.oreNext - game.ctx.now() : 0;
  if (d.myOre) {
    const m = d.myOre;
    return (
      <div class="ore-req mine">
        <Px src={oreUrl(m.ore)} size={32} />
        <div class="cmain">
          <b>Prosisz o: {ORES[m.ore].n}</b>
          <div class="bar" style={{ marginTop: '6px' }}><i style={{ width: (m.got / m.want) * 100 + '%' }} /></div>
          <div class="tech-cost">{m.got} / {m.want} · ruda trafia do ciebie od razu</div>
        </div>
      </div>
    );
  }
  if (wait > 0) return <p class="sub">Następna prośba o rudę za {tfmt(wait)}.</p>;
  const ask = () => a.run(async () => {
    await clanLife.act(game, (l, up) => l.clanOreAsk(up, ore));
    return `Prośba wysłana: ${ORE_WANT[ore]} × ${ORES[ore].n}.`;
  });
  return (
    <>
      <div class="ore-pick" role="radiogroup" aria-label="Ruda do prośby">
        {open.map(i => (
          <button key={i} role="radio" aria-checked={ore === i} class={ore === i ? 'on' : ''} onClick={() => setOre(i)} title={ORES[i].n}>
            <Px src={oreUrl(i)} size={32} alt={ORES[i].n} />
          </button>
        ))}
      </div>
      <div class="row" style={{ marginTop: '8px' }}>
        <span class="tech-cost">{ORE_WANT[ore]} × {ORES[ore].n} · raz na 8 godzin</span>
        <button class="btn small primary" disabled={a.busy} onClick={ask}>Poproś</button>
      </div>
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
    <li class="ore-req">
      <Px src={oreUrl(o.ore)} size={32} />
      <div class="cmain">
        <div class="cname">{o.n}</div>
        <div class="tech-cost">{ORES[o.ore].n}: {o.got} / {o.want} · masz {fmt(have)}</div>
        {a.msg && <div class="tech-cost" role="status">{a.msg}</div>}
      </div>
      <button class="btn small" disabled={a.busy || k <= 0} onClick={give}>{k > 0 ? `Daj ×${k}` : 'Brak rudy'}</button>
    </li>
  );
}

export function ClanHelpTab({ game }: { game: Game }) {
  const d = useClanLife();
  const a = useAction();
  const h2 = useAction();
  if (!d?.clan || !d.left) return <Loading d={d} />;
  const f = game.s.forge;
  const got = f.up && game.s.clanHelp.lvl === f.up ? game.s.clanHelp.n : 0;
  const asked = !!(d.myHelp && d.myHelp.lvl === f.up);
  const toHelp = (d.helps ?? []).filter(h => !h.done);
  const ask = () => a.run(async () => { await clanLife.act(game, (l, up) => l.clanHelpAsk(up)); return 'Prośba o pomoc wysłana do klanu.'; });
  const help = (uid?: string) => h2.run(async () => {
    const r = await clanLife.act(game, (l, up) => l.clanHelp(up, uid));
    const n = r.helpedNow ?? 0;
    return `Pomoc dla ${n} ${n === 1 ? 'osoby' : 'osób'}${r.paid ? ` · +${coins(r.paid * CLAN.DEED_COINS)}` : ''}.`;
  });
  return (
    <>
      <section class="card">
        <div class="eyebrow">Twoja kuźnia</div>
        {f.up ? (
          <div class="row" style={{ marginTop: '4px' }}>
            <div class="cmain">
              <b>Ulepszanie do poziomu {f.up} · {tfmt(f.left)}</b>
              <div class="tech-cost">Pomoc klanu: {got}/{CLAN.HELP_MAX} · −{got * CLAN.HELP_PCT}% czasu ulepszenia</div>
            </div>
            {got >= CLAN.HELP_MAX ? <span class="muted">Pełna pomoc</span>
              : asked ? <span class="muted">Prośba wysłana</span>
                : <button class="btn small primary" disabled={a.busy} onClick={ask}>Poproś o pomoc</button>}
          </div>
        ) : (
          <p class="sub">Gdy ulepszasz kuźnię, poproś klan o pomoc: każda pomoc skraca ulepszenie o {CLAN.HELP_PCT}% (do {CLAN.HELP_MAX} pomocy, −{CLAN.HELP_MAX * CLAN.HELP_PCT}%).</p>
        )}
        <Note msg={a.msg} />
      </section>
      <section class="card">
        <div class="row">
          <div class="eyebrow">Prośby o pomoc · {d.helps?.length ?? 0}</div>
          {toHelp.length > 1 && <button class="btn small primary" disabled={h2.busy} onClick={() => help()}>Pomóż wszystkim</button>}
        </div>
        <p class="sub">Za pomoc: {coins(CLAN.DEED_COINS)} (nagradzane dziś jeszcze: {d.left.deed}/{CLAN.DEEDS_PER_DAY}).</p>
        {(d.helps ?? []).length === 0 ? <p class="sub" style={{ marginTop: '6px' }}>Nikt teraz nie prosi o pomoc.</p> : (
          <ul class="clist">
            {(d.helps ?? []).map(h => (
              <li key={h.uid}>
                <div class="cmain"><div class="cname">{h.n}</div><div class="tech-cost">Kuźnia → poziom {h.lvl} · pomoc {h.got}/{CLAN.HELP_MAX}</div></div>
                {h.done ? <span class="muted">Pomoc wysłana</span> : <button class="btn small" disabled={h2.busy} onClick={() => help(h.uid)}>Pomóż</button>}
              </li>
            ))}
          </ul>
        )}
        <Note msg={h2.msg} />
      </section>
      <section class="card">
        <div class="eyebrow">Prośby o rudę</div>
        <OreAsk game={game} d={d} />
        {(d.ores ?? []).length > 0 && (
          <>
            <div class="eyebrow" style={{ marginTop: '12px' }}>Klan prosi</div>
            <ul class="clist">{(d.ores ?? []).map(o => <OreGive key={o.id} game={game} o={o} />)}</ul>
          </>
        )}
        <p class="sub" style={{ marginTop: '8px' }}>Dar to najwyżej {CLAN.ORE_GIVE_MAX} sztuk naraz. Za dar: {coins(CLAN.DEED_COINS)} (w puli dziennych pomocy).</p>
      </section>
    </>
  );
}

/* ---------- sklep klanowy ---------- */

const shopIcon = (id: ClanShopId) => { const k = CLAN_SHOP[id].icon; return k.startsWith('ore') ? oreUrl(Number(k.slice(3))) : resUrl(k); };

export function ClanShopTab({ game }: { game: Game }) {
  const d = useClanLife();
  const [msg, setMsg] = useState('');
  const s = game.s;
  const now = game.ctx.now();
  return (
    <section class="card">
      <div class="row">
        <div><div class="eyebrow">Sklep klanowy</div><div class="h">Monety klanowe</div></div>
        <b class="coinbal"><CoinIco size={24} />{fmt(s.clanCoins)}</b>
      </div>
      <p class="sub">Monety dostajesz za datki, ataki na bossa, pomoc i dary rudy. Limity odnawiają się w poniedziałek, a lepsze towary odblokowuje poziom klanu{d?.lvl !== undefined ? ` (teraz: ${d.lvl})` : ''}.</p>
      <ul class="shop">
        {CLAN_SHOP_IDS.map(id => {
          const it = CLAN_SHOP[id];
          const block = shopBlock(s, id, now);
          const locked = s.clanLvl < it.lvl;
          return (
            <li key={id} class={locked ? 'locked' : ''}>
              <Px src={shopIcon(id)} size={32} />
              <div class="cmain">
                <div class="cname">{it.n}</div>
                <div class="tech-cost">{locked ? `Od ${it.lvl}. poziomu klanu` : `${rewardText(shopReward(s, id))} · w tym tygodniu ${shopLeft(s, id, now)}/${it.week}`}</div>
              </div>
              <button class="btn small primary price" disabled={!!block} title={block ?? ''} onClick={() => { if (game.buyClan(id)) setMsg(`Kupiono: ${it.n}.`); }}>
                <CoinIco />{it.cost}
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
    </section>
  );
}

/** Wskaźnik pomocy klanu przy ulepszaniu kuźni (zakładka Kuźnia). */
export function ClanHelpLine({ game }: { game: Game }) {
  const d = useClanLife();
  const a = useAction();
  const f = game.s.forge;
  if (!d?.clan || !f.up) return null;
  const got = game.s.clanHelp.lvl === f.up ? game.s.clanHelp.n : 0;
  const asked = !!(d.myHelp && d.myHelp.lvl === f.up);
  const ask = () => a.run(async () => { await clanLife.act(game, (l, up) => l.clanHelpAsk(up)); });
  return (
    <div class="row clanhelp" style={{ marginTop: '8px' }}>
      <span class="tech-cost">Pomoc klanu: {got}/{CLAN.HELP_MAX}{got ? ` (−${got * CLAN.HELP_PCT}%)` : ''}{a.msg ? ` · ${a.msg}` : ''}</span>
      {got < CLAN.HELP_MAX && !asked && <button class="btn small" disabled={a.busy} onClick={ask}>Poproś klan o pomoc</button>}
      {asked && got < CLAN.HELP_MAX && <span class="muted">prośba wysłana</span>}
    </div>
  );
}
