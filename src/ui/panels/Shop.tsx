// Sklep: prezent dnia, reklamy z nagrodą, towary za Klejnoty, Przepustka Kowala i pakiety Klejnotów.
// Z serwerem każdą akcję wykonuje serwer (Klejnoty w jego portfelu); bez serwera — silnik gry.
// Reklamy są na razie testowe (odliczanie); w aplikacji z Google Play zastąpi je prawdziwa reklama z nagrodą.
import { useEffect, useState } from 'preact/hooks';
import { AD, AD_BUFFS, GEM_ITEM_IDS, GEM_PACKS, GEM_SHOP, PASS, PASS_LEVELS, type BuffId, type GemItemId } from '../../data';
import { oreUrl, resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import {
  bestOre, gemItemBlock, gemItemLeft, gemItemOpen, gemItemReward, giftReward, passItemsReward, passLevel, passUnclaimed, packReward, passXp, seasonOf, speedupCost,
} from '../../engine/shop';
import { clanLife } from '../../save/clanlife';
import { flushSave, getLink, type ServerLink, type ShopResp } from '../../save/server';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { gemsText } from '../texts';
import { buffIcon } from '../buffs';
import { Note, errText, useAction } from './ClanLife';
import { Res, RewardIcons } from '../RewardIcons';

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

/* ---------- okno ikonki reklamy z pola walki ---------- */

export function AdOfferView({ game, what, close }: { game: Game; what: BuffId; close: () => void }) {
  const a = useShopAct(game);
  const [watch, setWatch] = useState(false);
  const B = AD_BUFFS[what];
  const used = game.shopNow.ads[what] ?? 0;
  const until = game.s.buffs[what] ?? 0;
  const now = game.ctx.now();
  const reward = () => {
    setWatch(false);
    game.dismissAdOffer();
    void a.act(() => game.adReward(what), l => l.adReward(what), `${B.n}: ${B.d}!`).then(() => setTimeout(close, 900));
  };
  if (watch) return <TestAd onDone={reward} onCancel={() => setWatch(false)} />;
  return (
    <>
      <div class="eyebrow">Nagroda za reklamę</div>
      <div class="adhero">
        <span class="adoffer big" aria-hidden="true"><Px src={buffIcon(game, what)} size={40} /><b>×{B.mult}</b></span>
        <div><div class="h">{B.n}</div><p class="sub">{B.d}. Działa też w nagrodach za nieobecność.</p></div>
      </div>
      {until > now && <p class="sub">Już trwa jeszcze {tfmt(until - now)} — kolejna reklama przedłuży je o godzinę (najwyżej do 3 h naprzód).</p>}
      <p class="tech-cost">Dziś: {used}/{B.day}</p>
      <Note msg={a.msg} />
      <button class="btn primary" disabled={a.busy || used >= B.day} onClick={() => setWatch(true)}>{used >= B.day ? 'Na dziś koniec' : 'Obejrzyj reklamę'}</button>
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

function ShopTabView({ game, goGems }: { game: Game; goGems: () => void }) {
  const a = useShopAct(game);
  const [watch, setWatch] = useState<BuffId | 'gems' | null>(null);
  const s = game.s;
  const sh = game.shopNow;
  const now = game.ctx.now();
  const giftDone = sh.gift === sh.day;
  const msUntilReset = Date.parse(sh.day + 'T00:00:00Z') + 86400000 - now;
  if (watch) {
    const k = watch;
    const done = () => {
      setWatch(null);
      void a.act(() => game.adReward(k), l => l.adReward(k), k === 'gems' ? `+${gemsText(AD.GEMS)}!` : `${AD_BUFFS[k].n}: ${AD_BUFFS[k].d}!`);
    };
    return <TestAd onDone={done} onCancel={() => setWatch(null)} />;
  }
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
        <button class="btn small" disabled={a.busy || used >= max} onClick={() => setWatch(k)}><Px src={resUrl('reklama')} size={16} /> Obejrzyj</button>
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
      <div class="eyebrow" style={{ marginTop: '6px' }}>Za Klejnoty</div>
      <ul class="gemgrid">
        {GEM_ITEM_IDS.filter(id => gemItemOpen(s, id)).map(id => {
          const it = GEM_SHOP[id];
          const block = gemItemBlock(s, sh, id, s.gems);
          const left = gemItemLeft(sh, id);
          const r = gemItemReward(s, id);
          return (
            <li key={id} class={left <= 0 ? 'out' : ''}>
              <Px src={id === 'ruda' ? oreUrl(bestOre(s)) : resUrl(ITEM_ICON[id])} size={28} />
              <b>{it.n}</b>
              <small>{id === 'klucze' ? it.d : <RewardIcons r={r} size={14} />}</small>
              <small class="muted">{left > 0 ? `zostało dziś: ${left}` : 'na dziś wyprzedane'}</small>
              <button class="btn small primary" disabled={a.busy || (!!block && block !== 'za mało Klejnotów')}
                onClick={() => (block === 'za mało Klejnotów' ? goGems() : void a.act(() => game.buyGemItem(id), l => l.shopBuy(id), `Kupiono: ${it.n}.`))}>
                <GemIco size={14} /> {it.cost}
              </button>
            </li>
          );
        })}
      </ul>
      <Note msg={a.msg} />
      {(s.forge.up > 0 || s.tech.cur) && (
        <>
          <div class="eyebrow" style={{ marginTop: '6px' }}>Przyspieszenia</div>
          {s.forge.up > 0 && <div class="row"><span class="sub">Ulepszenie kuźni do poziomu {s.forge.up} · {tfmt(s.forge.left)}</span><SpeedupButton game={game} what="forge" onShop={goGems} /></div>}
          {s.tech.cur && <div class="row"><span class="sub">Badanie · {tfmt(s.tech.cur.left)}</span><SpeedupButton game={game} what="tech" onShop={goGems} /></div>}
          <p class="sub">Kuźnia: 1 Klejnot za każdą minutę ulepszenia. Badania: 1 Klejnot za każde 4 minuty.</p>
        </>
      )}
      <p class="sub">Limity odnawiają się o północy czasu UTC.</p>
    </>
  );
}

function PassTabView({ game, goGems }: { game: Game; goGems: () => void }) {
  const a = useShopAct(game);
  const s = game.s;
  const now = game.ctx.now();
  const season = seasonOf(now);
  const p = s.pass;
  if (!p) return <p class="sub">Przepustka wczytuje się — zagraj chwilę albo zapisz grę.</p>;
  const lvl = passLevel(p);
  const xp = passXp(p);
  const inLvl = lvl >= PASS.LEVELS ? PASS.XP_PER_LVL : xp - lvl * PASS.XP_PER_LVL;
  const un = passUnclaimed(p, s);
  const canClaim = un.free + un.prem > 0;
  return (
    <>
      <section class="passhead">
        <div class="pass-lvl" aria-hidden="true"><Px src={resUrl('przepustka')} size={34} /><b>{lvl}</b></div>
        <div class="cmain">
          <div class="eyebrow">Sezon {season.n} · {season.name}</div>
          <div class="h">Poziom {lvl} / {PASS.LEVELS}</div>
          <div class="bar" style={{ marginTop: '6px' }}><i style={{ width: (inLvl / PASS.XP_PER_LVL) * 100 + '%' }} /></div>
          <div class="tech-cost">{lvl >= PASS.LEVELS ? 'Przepustka ukończona!' : `${fmt(inLvl)} / ${fmt(PASS.XP_PER_LVL)} pkt`} · dziś {fmt(p.dxp)} / {fmt(PASS.DAY_CAP)} · koniec sezonu za {tfmt(season.end - now)}</div>
        </div>
      </section>
      <div class="passbtns">
        <button class="btn primary" disabled={a.busy || !canClaim} onClick={() => void a.act(() => !!game.claimPass(), l => l.passClaim(), 'Nagrody przepustki odebrane!')}>
          {canClaim ? `Odbierz nagrody (${un.free + un.prem})` : 'Brak nagród do odebrania'}
        </button>
        {!p.prem && (
          <button class="btn gold" disabled={a.busy} onClick={() => (s.gems < PASS.PREM_COST ? goGems() : void a.act(() => game.buyPass(), l => l.passBuy(), 'Złota ścieżka odblokowana!'))}>
            Złota ścieżka · <GemIco size={14} /> {PASS.PREM_COST}
          </button>
        )}
      </div>
      <Note msg={a.msg} />
      <ol class="passlist">
        <li class="ph"><span>Poz.</span><span>Darmowa</span><span>Złota{!p.prem && ' · zablokowana'}</span></li>
        {PASS_LEVELS.map((L, i) => {
          const n = i + 1;
          const st = (claimed: number, open: boolean) => (n <= claimed && open ? 'got' : n <= lvl ? (open ? 'ready' : 'lock reached') : open ? '' : 'lock');
          const cell = (items: typeof L.free, state: string, prem: boolean) => (
            <span class={`pr${prem ? ' prem' : ''} ${state}`}>
              <RewardIcons r={passItemsReward(items, s)} size={18} />
              {state === 'got' ? <i class="pr-st ok" aria-label="odebrane">✓</i> : state.startsWith('lock') ? <i class="pr-st" aria-label="zablokowane">🔒</i> : null}
            </span>
          );
          return (
            <li key={n} class={`${n === lvl + 1 ? 'next' : ''}${n <= lvl ? ' done' : ''}`}>
              <span class="pl">{n}</span>
              {cell(L.free, st(p.cf, true), false)}
              {cell(L.prem, st(p.cp, p.prem), true)}
            </li>
          );
        })}
      </ol>
      <p class="sub">
        Punkty przepustki: wytop {dec(PASS.XP_SMELT)} pkt, pokonany wróg {dec(PASS.XP_KILL)} pkt (także za nieobecność), boss krainy {PASS.XP_BOSS}, klucz w lochu {PASS.XP_KEY},
        piętro Wieży {PASS.XP_TOWER}; najwyżej {fmt(PASS.DAY_CAP)} dziennie. Złota ścieżka zwraca część Klejnotów i daje jaja, Siodło, Pieczęcie i więcej zasobów.
        Nieodebrane nagrody po końcu sezonu trafią do ciebie same.
      </p>
    </>
  );
}

function GemsTabView({ game }: { game: Game }) {
  const a = useShopAct(game);
  const s = game.s;
  const l = getLink();
  const testServer = game.net && (l?.testSpeed ?? 1) > 1;
  const free = !game.net || testServer; // gra bez serwera albo serwer w trybie testowym: zakup bez płatności
  const bought = s.shop.once ?? [];
  return (
    <>
      <p class="sub">
        {free
          ? 'Wersja testowa: pakiety dostajesz bez płatności, żeby sprawdzić sklep.'
          : 'Płatności ruszą w aplikacji z Google Play. Do tego czasu Klejnoty zdobywasz w przepustce i za reklamy.'}
      </p>
      <ul class="clist shoplist">
        {GEM_PACKS.map(p => {
          const done = !!p.once && bought.includes(p.id);
          return (
            <li key={p.id} class={p.once ? 'starter' : ''}>
              <GemIco size={28} />
              <div class="cmain">
                <div class="cname">{p.n}{p.bonus > 0 && <span class="tag">+{fmt(p.bonus)} gratis</span>}</div>
                <div class="tech-cost">{packReward(p.id) ? <RewardIcons r={packReward(p.id)!} size={14} /> : <Res r={{ gems: p.gems + p.bonus }} />}</div>
              </div>
              <button class="btn small primary" disabled={a.busy || done || !free}
                onClick={() => void a.act(() => game.buyPack(p.id), lk => lk.iapTest(p.id), `${p.n}: +${gemsText(p.gems + p.bonus)}.`)}>
                {done ? 'Kupiony' : free ? `Test · ${pln(p.pln)}` : pln(p.pln)}
              </button>
            </li>
          );
        })}
      </ul>
      <Note msg={a.msg} />
      <p class="sub">Klejnoty kupione za pieniądze trzyma serwer — nie przepadają przy nowej grze ani zmianie telefonu (z kodem przeniesienia konta).</p>
    </>
  );
}

export { errText };
