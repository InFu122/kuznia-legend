// Sklep: prezent dnia, reklamy z nagrodą, towary za Klejnoty, Przepustka Kowala i pakiety Klejnotów.
// Z serwerem każdą akcję wykonuje serwer (Klejnoty w jego portfelu); bez serwera — silnik gry.
// Reklamy: w aplikacji na Androida — prawdziwa reklama z nagrodą (AdMob, ads.ts); w przeglądarce — reklama testowa (odliczanie).
// Pakiety Klejnotów: w aplikacji z Google Play — płatność Google (billing.ts); serwer w trybie testowym — bez płatności.
import { useEffect, useState } from 'preact/hooks';
import { AD, AD_BUFFS, GEM_ITEM_IDS, GEM_PACKS, GEM_SHOP, PASS, PASS_LEVELS, type BuffId, type GemItemId } from '../../data';
import { dungeonBgUrl, oreUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import type { Reward } from '../../engine/types';
import {
  addReward, bestOre, gemItemBlock, gemItemLeft, gemItemOpen, gemItemReward, giftReward, passItemsReward, passLevel, passUnclaimed, packReward, passXp, seasonOf, speedupCost,
} from '../../engine/shop';
import { clanLife } from '../../save/clanlife';
import { flushSave, getLink, type ServerLink, type ShopResp } from '../../save/server';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { gemsText } from '../texts';
import { buffIcon } from '../buffs';
import { Note, errText, useAction } from './ClanLife';
import { Res, RewardIcons, rewardChips } from '../RewardIcons';
import { Avatar } from '../Avatar';
import { LockIcon } from '../icons';
import { ClaimReveal, RewardCard, Track, rewardTier, seasonScene, type CardState } from './Track';
import { adsNative, showRewarded } from '../ads';
import { billingNative, buyPack, recoverPurchases, storePrices } from '../billing';
import { OddsTable, type OddsWhat } from '../Odds';
import { pageUrl } from '../pages';

export type ShopTab = 'sklep' | 'przepustka' | 'klejnoty';
const TABS: [ShopTab, string][] = [['sklep', 'Sklep'], ['przepustka', 'Przepustka'], ['klejnoty', 'Klejnoty']];

const GemIco = ({ size = 16 }: { size?: number }) => <Px src={resUrl('klejnot')} size={size} />;
const pln = (v: number) => v.toFixed(2).replace('.', ',') + ' zł';
const dec = (v: number) => String(v).replace('.', ',');
const ITEM_ICON: Record<GemItemId, string> = { zloto: 'zloto', ruda: '', ksiegi: 'ksiega', kamienie: 'kamien', zwoj: 'zwoj', siodlo: 'siodlo', jajo: 'jajo2', klucze: 'klucz' };

/** Odpowiedź serwera sklepu: stan do gry, nagrody z kolejki, odnowienie kluczy. */
function applyResp(game: Game, r: ShopResp): void {
  game.applyShop(r);
  clanLife.rewards(game, r.rewards);
  if (r.keys) game.refillKeys();
}

/** Akcja sklepu: bez serwera — silnik gry, z serwerem — RPC. Zwraca komunikat dla gracza. */
function useShopAct(game: Game) {
  const a = useAction();
  const run = (local: () => boolean, remote: (l: ServerLink) => Promise<ShopResp>, done: string, fail = 'Nie udało się.') => a.run(async () => {
    if (!game.net) return local() ? done : fail;
    const l = getLink();
    if (!l?.online) return 'Sklep działa po połączeniu z serwerem.';
    applyResp(game, await remote(l));
    return done;
  });
  return { ...a, act: run };
}

/** Czy w sklepie coś czeka (kropka na przycisku): prezent dnia albo nagrody przepustki. */
export function shopTodo(game: Game): boolean {
  const s = game.s;
  const sh = game.shopNow;
  const pass = s.pass ? passUnclaimed(s.pass, s) : null;
  return sh.gift !== sh.day || !!(pass && (pass.free || pass.prem));
}

/* ---------- reklama testowa ---------- */

export function TestAd({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const x = Date.now() - t0;
      setT(x);
      if (x >= AD.TEST_AD_MS) { clearInterval(id); onDone(); }
    }, 100);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((AD.TEST_AD_MS - t) / 1000));
  return (
    <div class="testad" role="status">
      <Px src={resUrl('reklama')} size={48} />
      <b>Reklama testowa</b>
      <p class="sub">W aplikacji z Google Play będzie tu krótka reklama. Nagroda za {left} s.</p>
      <div class="bar"><i style={{ width: Math.min(100, (t / AD.TEST_AD_MS) * 100) + '%' }} /></div>
      <button class="linkbtn" onClick={onCancel}>Przerwij (bez nagrody)</button>
    </div>
  );
}

/**
 * Oglądanie reklamy z nagrodą: w aplikacji — prawdziwa reklama (AdMob), gdzie indziej — reklama testowa.
 * `view` — ekran reklamy testowej do pokazania zamiast okna (null, gdy nie trwa).
 */
export function useAdWatch() {
  const [test, setTest] = useState<(() => void) | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const watch = (reward: () => void) => {
    setMsg('');
    if (!adsNative()) { setTest(() => reward); return; }
    if (loading) return;
    setLoading(true);
    void showRewarded().then(r => {
      setLoading(false);
      if (r === 'ok') reward();
      else if (r === 'cancel') setMsg('Reklama przerwana — nagroda tylko za obejrzenie do końca.');
      else setMsg('Reklama nie jest teraz dostępna — spróbuj za chwilę.');
    });
  };
  const view = test ? <TestAd onDone={() => { setTest(null); test(); }} onCancel={() => setTest(null)} /> : null;
  return { watch, view, loading, msg };
}

/* ---------- okno ikonki reklamy z pola walki ---------- */

export function AdOfferView({ game, what, close }: { game: Game; what: BuffId; close: () => void }) {
  const a = useShopAct(game);
  const ad = useAdWatch();
  const B = AD_BUFFS[what];
  const used = game.shopNow.ads[what] ?? 0;
  const until = game.s.buffs[what] ?? 0;
  const now = game.ctx.now();
  const reward = () => {
    game.dismissAdOffer();
    void a.act(() => game.adReward(what), l => l.adReward(what), `${B.n}: ${B.d}!`).then(() => setTimeout(close, 900));
  };
  if (ad.view) return ad.view;
  return (
    <>
      <div class="eyebrow">Nagroda za reklamę</div>
      <div class="adhero">
        <span class="adoffer big" aria-hidden="true"><Px src={buffIcon(game, what)} size={40} /><b>×{B.mult}</b></span>
        <div><div class="h">{B.n}</div><p class="sub">{B.d}. Działa też w nagrodach za nieobecność.</p></div>
      </div>
      {until > now && <p class="sub">Już trwa jeszcze {tfmt(until - now)} — kolejna reklama przedłuży je o godzinę (najwyżej do 3 h naprzód).</p>}
      <p class="tech-cost">Dziś: {used}/{B.day}</p>
      <Note msg={a.msg || ad.msg} />
      <button class="btn primary" disabled={a.busy || ad.loading || used >= B.day} onClick={() => ad.watch(reward)}>
        {used >= B.day ? 'Na dziś koniec' : ad.loading ? 'Wczytywanie reklamy…' : 'Obejrzyj reklamę'}
      </button>
      <button class="btn" onClick={() => { game.dismissAdOffer(); close(); }}>Nie teraz</button>
    </>
  );
}

/* ---------- przyspieszenie (kuźnia, badania) ---------- */

export function SpeedupButton({ game, what, onShop }: { game: Game; what: 'forge' | 'tech'; onShop?: () => void }) {
  const a = useShopAct(game);
  const [sure, setSure] = useState(false);
  const cost = speedupCost(game.s, what);
  if (!cost) return null;
  const lack = game.s.gems < cost;
  const go = () => {
    if (lack) { (onShop ?? (() => game.openModal({ kind: 'shop', tab: 'klejnoty' })))(); return; }
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 4000); return; }
    setSure(false);
    // Najpierw zapis: serwer liczy cenę i czas z zapisanego stanu, więc musi znać to samo ulepszenie co gra.
    const key = what === 'forge' ? game.s.forge.up : game.s.tech.cur?.id;
    void a.act(() => game.speedup(what), async l => { await flushSave(); return l.speedup(what, key); }, what === 'forge' ? 'Ulepszenie kuźni gotowe!' : 'Badanie gotowe!');
  };
  return (
    <div class="speedup">
      <button class={`btn small${sure ? ' primary' : ''}`} disabled={a.busy} onClick={go}>
        {lack ? <>Dokończ za <GemIco size={14} /> {fmt(cost)} — kup Klejnoty</> : sure ? <>Na pewno? <GemIco size={14} /> {fmt(cost)}</> : <>Dokończ teraz · <GemIco size={14} /> {fmt(cost)}</>}
      </button>
      <Note msg={a.msg} />
    </div>
  );
}

/* ---------- okno sklepu ---------- */

export function ShopView({ game, initial, close }: { game: Game; initial?: ShopTab; close: () => void }) {
  const [tab, setTab] = useState<ShopTab>(initial ?? 'sklep');
  const [, force] = useState(0);
  useEffect(() => {
    // Z serwerem: świeży stan sklepu przy otwarciu.
    const l = getLink();
    if (game.net && l?.online) l.shopState().then(r => { applyResp(game, r); force(x => x + 1); }).catch(() => {});
    return game.on(e => { if (e.t === 'change') force(x => x + 1); });
  }, []);
  const s = game.s;
  const sh = game.shopNow;
  const dots: Partial<Record<ShopTab, boolean>> = {
    sklep: sh.gift !== sh.day,
    przepustka: !!(s.pass && (passUnclaimed(s.pass, s).free || passUnclaimed(s.pass, s).prem)),
  };
  return (
    <>
      <div class="row">
        <div class="eyebrow">Sklep</div>
        <span class="gembal"><GemIco size={18} /><b>{fmt(s.gems)}</b></span>
      </div>
      <div class="seg seg3" role="tablist">
        {TABS.map(([id, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {n}{dots[id] && <span class="dot" aria-label="coś czeka" />}
          </button>
        ))}
      </div>
      {tab === 'sklep' && <ShopTabView game={game} goGems={() => setTab('klejnoty')} />}
      {tab === 'przepustka' && <PassTabView game={game} goGems={() => setTab('klejnoty')} />}
      {tab === 'klejnoty' && <GemsTabView game={game} />}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}

/** Przedmioty z losową zawartością — przy nich przycisk „Szanse”. */
const RANDOM: OddsWhat[] = ['zwoj', 'siodlo', 'jajo'];

function ShopTabView({ game, goGems }: { game: Game; goGems: () => void }) {
  const a = useShopAct(game);
  const ad = useAdWatch();
  /** Otwarta tabela szans (losowe przedmioty — Google Play wymaga ich pokazania przed zakupem). */
  const [odds, setOdds] = useState<OddsWhat | null>(null);
  const s = game.s;
  const sh = game.shopNow;
  const now = game.ctx.now();
  const giftDone = sh.gift === sh.day;
  const msUntilReset = Date.parse(sh.day + 'T00:00:00Z') + 86400000 - now;
  if (ad.view) return ad.view;
  const watch = (k: BuffId | 'gems') => ad.watch(() => {
    void a.act(() => game.adReward(k), l => l.adReward(k), k === 'gems' ? `+${gemsText(AD.GEMS)}!` : `${AD_BUFFS[k].n}: ${AD_BUFFS[k].d}!`);
  });
  const adRow = (k: BuffId | 'gems') => {
    const max = k === 'gems' ? AD.GEMS_DAY : AD_BUFFS[k].day;
    const used = sh.ads[k] ?? 0;
    const until = k === 'gems' ? 0 : s.buffs[k] ?? 0;
    return (
      <li key={k}>
        <span class="adoffer small" aria-hidden="true">{k === 'gems' ? <GemIco size={22} /> : <><Px src={buffIcon(game, k)} size={22} /><b>×{AD_BUFFS[k].mult}</b></>}</span>
        <div class="cmain">
          <div class="cname">{k === 'gems' ? <Res r={{ gems: AD.GEMS }} /> : AD_BUFFS[k].n}</div>
          <div class="tech-cost">{k === 'gems' ? 'raz dziennie' : AD_BUFFS[k].d}{until > now ? ` · trwa jeszcze ${tfmt(until - now)}` : ''} · dziś {used}/{max}</div>
        </div>
        <button class="btn small" disabled={a.busy || ad.loading || used >= max} onClick={() => watch(k)}><Px src={resUrl('reklama')} size={16} /> {ad.loading ? '…' : 'Obejrzyj'}</button>
      </li>
    );
  };
  return (
    <>
      <section class={`chest${giftDone ? '' : ' ready'}`}>
        <div>
          <b>Prezent dnia</b>
          <div class="sub"><RewardIcons r={giftReward(s)} size={16} /></div>
        </div>
        {giftDone ? <span class="tech-busy">za {tfmt(msUntilReset)}</span>
          : <button class="btn small primary" disabled={a.busy} onClick={() => void a.act(() => !!game.claimGift(), l => l.shopGift(), 'Prezent odebrany!')}>Odbierz</button>}
      </section>
      <div class="eyebrow" style={{ marginTop: '6px' }}>Nagrody za reklamy</div>
      <ul class="clist shoplist">{(['ruda', 'zloto', 'gems'] as const).map(adRow)}</ul>
      <Note msg={ad.msg} />
      <div class="eyebrow" style={{ marginTop: '6px' }}>Za Klejnoty</div>
      <ul class="gemgrid">
        {GEM_ITEM_IDS.filter(id => gemItemOpen(s, id)).map(id => {
          const it = GEM_SHOP[id];
          const block = gemItemBlock(s, sh, id, s.gems);
          const left = gemItemLeft(sh, id);
          const r = gemItemReward(s, id);
          const rnd = RANDOM.includes(id as OddsWhat) ? (id as OddsWhat) : null;
          return (
            <li key={id} class={left <= 0 ? 'out' : ''}>
              <Px src={id === 'ruda' ? oreUrl(bestOre(s)) : resUrl(ITEM_ICON[id])} size={28} />
              <b>{it.n}</b>
              <small>{id === 'klucze' ? it.d : <RewardIcons r={r} size={14} />}</small>
              {rnd && <button class={`linkbtn odds-btn${odds === rnd ? ' on' : ''}`} aria-expanded={odds === rnd} onClick={() => setOdds(odds === rnd ? null : rnd)}>Szanse</button>}
              <small class="muted">{left > 0 ? `zostało dziś: ${left}` : 'na dziś wyprzedane'}</small>
              <button class="btn small primary" disabled={a.busy || (!!block && block !== 'za mało Klejnotów')}
                onClick={() => (block === 'za mało Klejnotów' ? goGems() : void a.act(() => game.buyGemItem(id), l => l.shopBuy(id), `Kupiono: ${it.n}.`))}>
                <GemIco size={14} /> {it.cost}
              </button>
            </li>
          );
        })}
      </ul>
      {odds && <OddsTable what={odds} />}
      <Note msg={a.msg} />
      {(s.forge.up > 0 || s.tech.cur) && (
        <>
          <div class="eyebrow" style={{ marginTop: '6px' }}>Przyspieszenia</div>
          {s.forge.up > 0 && <div class="row"><span class="sub">Ulepszenie kuźni do poziomu {s.forge.up} · {tfmt(s.forge.left)}</span><SpeedupButton game={game} what="forge" onShop={goGems} /></div>}
          {s.tech.cur && <div class="row"><span class="sub">Badanie · {tfmt(s.tech.cur.left)}</span><SpeedupButton game={game} what="tech" onShop={goGems} /></div>}
          <p class="sub">Kuźnia i badania: 1 Klejnot za każdą minutę, która została.</p>
        </>
      )}
      <p class="sub">Limity odnawiają się o północy czasu UTC.</p>
    </>
  );
}

/** Wszystkie nagrody złotej ścieżki razem (na wizytówkę „co dostaniesz”). */
function premTotal(s: Game['s']): Reward {
  return PASS_LEVELS.reduce<Reward>((r, L) => addReward(r, passItemsReward(L.prem, s)), {});
}
/** Na wizytówce: tylko to, co najbardziej kusi (wygląd, jaja, Boska Ruda, Pieczęcie, Siodło, Zwoje, Klejnoty). */
const SHOW_KEYS = (c: { key: string; cls?: string }) => c.cls === 'rt6' || ['skin', 'frame', 'egg', 'seals', 'saddles', 'scrolls', 'gems'].some(k => c.key.startsWith(k));

function PassTabView({ game, goGems }: { game: Game; goGems: () => void }) {
  const a = useShopAct(game);
  const [reveal, setReveal] = useState<Reward | null>(null);
  const s = game.s;
  const now = game.ctx.now();
  const season = seasonOf(now);
  const p = s.pass!;
  const lvl = passLevel(p);
  const xp = passXp(p);
  const max = lvl >= PASS.LEVELS;
  const inLvl = max ? PASS.XP_PER_LVL : xp - lvl * PASS.XP_PER_LVL;
  const un = passUnclaimed(p, s);
  const todo = un.free + un.prem;
  const waiting = p.prem ? 0 : lvl - p.cp; // złote nagrody z osiągniętych poziomów, które odbierzesz od razu po odblokowaniu
  const total = premTotal(s);
  const show = rewardChips(total).filter(SHOW_KEYS).sort((x, y) => (x.cls === 'look' ? -1 : 0) - (y.cls === 'look' ? -1 : 0));
  const claim = async () => {
    const r = un.r;
    await a.act(() => !!game.claimPass(), l => l.passClaim(), '');
    if ((game.s.pass?.cf ?? 0) >= lvl) setReveal(r);
  };
  const buy = () => (s.gems < PASS.PREM_COST ? goGems() : void a.act(() => game.buyPass(), l => l.passBuy(), 'Złota ścieżka odblokowana! Odbierz nagrody na torze.'));
  const focus = Math.min(PASS.LEVELS - 1, Math.min(p.cf, p.prem ? p.cp : p.cf, lvl));
  const st = (n: number, claimed: number, open: boolean): CardState =>
    !open ? 'locked' : n <= claimed ? 'got' : n <= lvl ? 'ready' : 'lock';
  return (
    <>
      <section class="ps-hero" style={{ '--bg': `url(${dungeonBgUrl(seasonScene(season.name))})` } as Record<string, string>}>
        <div class="psh-top">
          <span class="eyebrow">Przepustka Kowala · sezon {season.n}</span>
          <span class="ps-time"><Px src={resUrl('czas')} size={14} />{tfmt(season.end - now)}</span>
        </div>
        <div class="psh-title">{season.name}</div>
        <div class="psh-lvl">
          <div class="ps-badge" aria-hidden="true"><Px src={resUrl('przepustka')} size={30} /><b>{lvl}</b></div>
          <div class="psh-xp">
            <div class="psh-xt"><b>Poziom {lvl}<span> / {PASS.LEVELS}</span></b><span class="num">{max ? 'ukończona!' : `${fmt(inLvl)} / ${fmt(PASS.XP_PER_LVL)}`}</span></div>
            <div class="bar big"><i style={{ width: (inLvl / PASS.XP_PER_LVL) * 100 + '%' }} /></div>
            <small>{max ? 'Wszystkie poziomy zdobyte.' : <>następny poziom za <b>{fmt(PASS.XP_PER_LVL - inLvl)} pkt</b></>} · dziś {fmt(p.dxp)}/{fmt(PASS.DAY_CAP)}</small>
          </div>
        </div>
        {p.prem && <span class="psh-gold">Złota ścieżka aktywna</span>}
      </section>

      {!p.prem && (
        <section class="ps-offer">
          <div class="pso-main">
            <div class="pso-t">Złota ścieżka</div>
            <ul class="pso-pts">
              {waiting > 0 && <li class="hot">Od razu odbierzesz <b>{waiting}</b> {waiting === 1 ? 'złotą nagrodę' : waiting < 5 ? 'złote nagrody' : 'złotych nagród'}</li>}
              <li>Druga, bogatsza nagroda na każdym z {PASS.LEVELS} poziomów</li>
              <li>Zwraca <Res r={{ gems: total.gems ?? 0 }} size={14} /></li>
            </ul>
          </div>
          <div class="pso-hero" aria-hidden="true"><Avatar skin="szkarlat" frame="przepustka" size={66} /></div>
          <ul class="pso-show">
            {show.map(c => (
              <li key={c.key} class={`t-${rewardTier([c])}`} title={c.t}>
                {c.frame ? <Avatar frame={c.frame} size={28} /> : c.key.startsWith('skin') ? <Avatar skin={c.key.slice(4)} size={28} /> : <Px src={c.ic!} size={24} />}
                {c.n && c.n !== '1' && <b>{c.n}</b>}
              </li>
            ))}
          </ul>
          <button class="btn gold big pso-buy" disabled={a.busy} onClick={buy}>Odblokuj złotą ścieżkę · <GemIco size={16} /> {PASS.PREM_COST}</button>
        </section>
      )}

      <div class="trk-head"><span class="eyebrow">Nagrody sezonu</span>{todo > 0 && <span class="trk-todo">do odebrania: {todo}</span>}</div>
      <div class="trk-wrap">
        <div class="trk-lab" aria-hidden="true">
          <span class="tl-prem">{!p.prem && <LockIcon />}<i>Złota</i></span>
          <span class="tl-node" />
          <span class="tl-free"><i>Darmowa</i></span>
        </div>
        <Track focus={focus}>
          {PASS_LEVELS.map((L, i) => {
            const n = i + 1;
            const fill = n <= lvl ? 1 : n === lvl + 1 ? inLvl / PASS.XP_PER_LVL : 0;
            return (
              <li key={n} class={`tcol${n <= lvl ? ' done' : ''}${n === lvl + 1 ? ' cur' : ''}${n % 5 === 0 ? ' big' : ''}`} style={{ '--fill': fill } as Record<string, number>}>
                <RewardCard r={passItemsReward(L.prem, s)} prem state={st(n, p.cp, p.prem)} onClaim={() => void claim()} />
                <span class="tk-node"><b>{n}</b></span>
                <RewardCard r={passItemsReward(L.free, s)} state={st(n, p.cf, true)} onClaim={() => void claim()} />
              </li>
            );
          })}
        </Track>
      </div>
      <Note msg={a.msg} />
      <div class="ps-how">
        <span class="eyebrow">Punkty przepustki</span>
        <ul>
          <li>Wytop <b>{dec(PASS.XP_SMELT)}</b></li><li>Wróg <b>{dec(PASS.XP_KILL)}</b></li><li>Boss krainy <b>{PASS.XP_BOSS}</b></li>
          <li>Klucz w lochu <b>{PASS.XP_KEY}</b></li><li>Piętro Wieży <b>{PASS.XP_TOWER}</b></li>
        </ul>
        <small>Najwyżej {fmt(PASS.DAY_CAP)} pkt dziennie (liczy się też nieobecność). Nieodebrane nagrody po końcu sezonu trafią do ciebie same.</small>
      </div>
      {todo > 0 && (
        <div class="claimbar">
          <button class="btn primary big" disabled={a.busy} onClick={() => void claim()}>Odbierz nagrody ({todo})</button>
        </div>
      )}
      {reveal && <ClaimReveal r={reveal} onClose={() => setReveal(null)} />}
    </>
  );
}

function GemsTabView({ game }: { game: Game }) {
  const a = useShopAct(game);
  const s = game.s;
  const l = getLink();
  const testServer = game.net && (l?.testSpeed ?? 1) > 1;
  const free = !game.net || testServer; // gra bez serwera albo serwer w trybie testowym: zakup bez płatności
  const play = game.net && !testServer && billingNative(); // aplikacja z Google Play: prawdziwa płatność
  const [prices, setPrices] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!play) return;
    void storePrices().then(setPrices);
    // Zapłacone, a niewydane zakupy (np. przerwane połączenie) — dokończ przy wejściu do sklepu.
    const lk = getLink();
    if (lk?.online) void recoverPurchases(lk).then(rs => rs.forEach(r => applyResp(game, r)));
  }, []);
  const bought = s.shop.once ?? [];
  const buyPlay = (id: string) => a.run(async () => {
    const lk = getLink();
    if (!lk?.online) return 'Zakupy działają po połączeniu z serwerem gry.';
    const p = GEM_PACKS.find(x => x.id === id)!;
    const r = await buyPack(lk, id);
    if (r.k === 'cancel') return '';
    if (r.k === 'pending') return 'Płatność czeka na potwierdzenie w Google Play. Klejnoty dostaniesz, gdy płatność dojdzie — gra sprawdzi to sama.';
    applyResp(game, r.r);
    return r.r.given ? `${p.n}: +${gemsText(p.gems + p.bonus)}. Dziękujemy za wsparcie Kuźni!` : 'Ten zakup był już wydany wcześniej.';
  });
  return (
    <>
      <p class="sub">
        {free
          ? 'Wersja testowa: pakiety dostajesz bez płatności, żeby sprawdzić sklep.'
          : play
            ? 'Płatność obsługuje Google Play. Klejnoty trafiają na twoje konto na serwerze gry.'
            : 'Pakiety Klejnotów kupisz w aplikacji z Google Play. Tutaj Klejnoty zdobywasz w przepustce i za reklamy.'}
      </p>
      {play && !free && (
        // Treść cyfrowa dostarczana od razu: informacja o utracie prawa odstąpienia przed zakupem (ustawa o prawach konsumenta, art. 38).
        <p class="sub buy-note">
          Klejnoty i Pakiet Nowicjusza dostajesz od razu po zakupie. Kupując, zgadzasz się na natychmiastowe dostarczenie
          i przyjmujesz do wiadomości, że tracisz wtedy prawo odstąpienia od umowy.
          {pageUrl('regulamin.html') && <> <a class="linkbtn" href={pageUrl('regulamin.html')} target="_blank" rel="noopener">Regulamin</a></>}
        </p>
      )}
      <ul class="clist shoplist">
        {GEM_PACKS.map(p => {
          const done = !!p.once && bought.includes(p.id);
          const price = prices[p.id] ?? pln(p.pln);
          return (
            <li key={p.id} class={p.once ? 'starter' : ''}>
              <GemIco size={28} />
              <div class="cmain">
                <div class="cname">{p.n}{p.bonus > 0 && <span class="tag">+{fmt(p.bonus)} gratis</span>}</div>
                <div class="tech-cost">{packReward(p.id) ? <RewardIcons r={packReward(p.id)!} size={14} /> : <Res r={{ gems: p.gems + p.bonus }} />}</div>
              </div>
              <button class="btn small primary" disabled={a.busy || done || (!free && !play)}
                onClick={() => (play ? void buyPlay(p.id) : void a.act(() => game.buyPack(p.id), lk => lk.iapTest(p.id), `${p.n}: +${gemsText(p.gems + p.bonus)}.`))}>
                {done ? 'Kupiony' : free ? `Test · ${pln(p.pln)}` : price}
              </button>
            </li>
          );
        })}
      </ul>
      <Note msg={a.msg} />
      <details class="odds-all">
        <summary>Szanse losowań (Zwój zaklęć, Siodło, Rzadkie jajo)</summary>
        <p class="sub">Dotyczy też Zwojów i jaj z pakietów i przepustki.</p>
        {RANDOM.map(w => <OddsTable key={w} what={w} />)}
      </details>
      <p class="sub">Klejnoty kupione za pieniądze trzyma serwer — nie przepadają przy nowej grze ani zmianie telefonu (z kontem Google albo kodem przeniesienia).</p>
    </>
  );
}

export { errText };
