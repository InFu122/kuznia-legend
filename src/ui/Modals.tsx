import type { ComponentChildren, JSX } from 'preact';
import {
  B, DIVINE_JUMP, DIVINE_ORE, ELEM, ELEM_KEYS, EVENT, SET_IDS, LAB_BLESSINGS, LAB_DOORS, LAB_ROOMS, MOUNTS, ORES, PETS, RAR, SEAL_FAME, SETS, SET_FORGE_LVL,
  MOUNTS_UNLOCK_LAND, PETS_UNLOCK_LAND, SKILLS, SKILL_MAX, STARS_MAX, TECH, TECH_UNLOCK_FORGE, FORGE_UNLOCKS, FEATURES, ORE_ORDER, rAt, rRank, type FeatureId, isRareOre, oreShares, setOfLand, landDef, LEGEND, ABYSS_FROM, actName, isAbyss, abyssCircle, QUAL, QUAL_UNIQ_IV } from '../data';
import type { MountId, PetId, SkillId } from '../engine/types';
import { ForgeLevelInfo, MountsInfo, PetsInfo, RuneInfo } from './panels/InfoSheets';
import { useEffect, useRef, useState } from 'preact/hooks';
import { LockIcon } from './icons';
import { toast } from '../engine/context';
import { canOpenNotifySettings, enableNotify, notifyState, onComeBack, openNotifySettings, type NotifyState } from './native';
import { unlockProgress, unlockWhen } from '../engine/unlocks';
import { tutStep } from '../engine/tutorial';
import { DEFAULT_NAME, NAME_MAX, nickFormatProblem, suggestNick, tidyName } from '../engine/nick';
import { ServerError, getLink } from '../save/server';
import { onBack } from './back';
import { JUMP_TO_MULT_RANK, baseName, dist, gOf, goldWaveOf, itemName, oreNominal, recPower } from '../engine/formulas';
import { allMods } from '../engine/mods';
import type { Game } from '../engine/game';
import { techLvl, techMods } from '../engine/mods';
import type { ModalData, Reward } from '../engine/types';
import { dungName, eventOf, evText } from '../engine/events';
import { ItemCard } from './ItemCard';
import { DecisionView } from './Decision';
import { Px } from './Px';
import { companionUrl, elemUrl, itemUrl, landBgUrl, oreUrl, resUrl, setOreUrl, skillUrl, techUrl } from '../art/render';
import { HeroSprite } from './Arena';
import { RewardIcons, RewardTiles } from './RewardIcons';
import { hasProof } from '../engine/verify';
import { f1, fmt, pct, pctS, tfmt } from './format';
import { pl } from './texts';
import { OddsBar } from './panels/Forge';
import { CompUpgrade } from './panels/Companions';
import { MissionsView } from './panels/Missions';
import { AdOfferView, ShopView } from './panels/Shop';
import { Reforge } from './Reforge';
import { RankingView } from './panels/Ranking';
import { ArenaView } from './panels/Pvp';
import { EventView } from './panels/Event';
import { LookView } from './panels/Look';
import { DungInfoView } from './panels/Dungeon';
import { FeedbackView } from './panels/Feedback';
import { ChatView } from './panels/Chat';
import { openClanTab } from './panels/ClanUi';
import { MenuView } from './Menu';
import { AutoSheet, OrePicker } from './Dock';
import { MusicSheet } from './MusicSheet';
import { ChangelogView } from './Changelog';
import { AwakenBox, AwakenChoice } from './Awaken';
import { skillFx } from './skillText';
import { GoogleAskView, GoogleRestore } from './GoogleLink';
import { googleAvailable } from '../save/google';
import { buzz } from './haptics';
import { play } from './sound';
import type { Tab } from './icons';

/**
 * Ramka okna: przycisk „Wróć” u góry (zostaje widoczny przy przewijaniu), zamknięcie dotknięciem obok okna
 * i przyciskiem „wstecz” telefonu. Okna z decyzją (`locked`) nie zamykają się same — „wstecz” nic w nich nie robi.
 */
export function ModalShell({ locked, onClose, children, cls = '' }: { locked: boolean; onClose: () => void; children: ComponentChildren; cls?: string }) {
  const close = useRef(onClose);
  close.current = onClose;
  const lock = useRef(locked);
  lock.current = locked;
  useEffect(() => onBack(() => { if (!lock.current) close.current(); return true; }), []);
  return (
    <div class={`modal ${cls}`} onClick={e => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div class="modal-box" role="dialog" aria-modal="true">
        {!locked && (
          <div class="modal-top">
            <button class="modal-back" onClick={onClose} aria-label="Wróć — zamknij okno"><span aria-hidden="true">‹</span> Wróć</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

const Close = ({ onClose, label }: { onClose: () => void; label: string }) => <button class="btn primary" onClick={onClose}>{label}</button>;

/** Ikona funkcji w oknie z kłódką i w ogłoszeniu. */
const FEATURE_ICON: Record<FeatureId, string> = {
  bohater: 'moc', zadania: 'trofeum', nauka: 'ksiega', sklep: 'klejnot', auto: 'kowadlo', umiejetnosci: 'zwoj', krainy: 'swieca',
  lochy: 'klucz', klan: 'moneta', czat: 'pieczec', runy: 'runa', arena: 'puchar', chowance: 'jajo2', wierzchowce: 'siodlo',
};
const featureIcon = (id: FeatureId) => resUrl(FEATURE_ICON[id]);

export function ModalView({ m, game, close, goTab, onFeature }: { m: ModalData; game: Game; close: () => void; goTab?: (t: Tab) => void; onFeature?: (id: FeatureId) => void }): JSX.Element {
  const s = game.s;
  switch (m.kind) {
    case 'unlocked': {
      // „Pokaż” prowadzi tam, dokąd i tak prowadzi samouczek (np. Lochy, nie Krainy), żeby wskazówki się nie kłóciły.
      const st = tutStep(s);
      const first = m.ids.find(id => !!st && (FEATURES[id].at.tab === st.tab || FEATURES[id].at.inTab === st.tab)) ?? m.ids[0];
      return (
        <>
          <div class="unl-burst" aria-hidden="true">{m.ids.slice(0, 5).map(id => <span key={id} class="unl-ic"><Px src={featureIcon(id)} size={40} /></span>)}</div>
          <div class="eyebrow">{m.ids.length > 1 ? 'Nowe funkcje' : 'Nowa funkcja'}</div>
          <div class="h">{m.ids.map(id => FEATURES[id].n).join(', ')}</div>
          {m.ids.length > 1 ? (
            <ul class="unl-list">
              {m.ids.map(id => (
                <li key={id}><Px src={featureIcon(id)} size={28} /><div><b>{FEATURES[id].n}</b><p>{FEATURES[id].d}</p></div></li>
              ))}
            </ul>
          ) : <p class="sub unl-one">{FEATURES[first].d}</p>}
          <div class="result-actions">
            <button class="btn primary" onClick={() => { close(); onFeature?.(first); }}>Pokaż{m.ids.length > 1 ? `: ${FEATURES[first].n}` : ''}</button>
            <button class="btn" onClick={close}>Później</button>
          </div>
        </>
      );
    }
    case 'locked': {
      const F = FEATURES[m.id];
      const [now, goal, unit] = unlockProgress(s, m.id);
      return (
        <>
          <div class="lock-head"><span class="lock-big"><Px src={featureIcon(m.id)} size={44} /><LockIcon /></span></div>
          <div class="eyebrow">Zablokowane</div>
          <div class="h">{F.n}</div>
          <p class="sub">{F.d}</p>
          <div class="lock-when">Odblokujesz {unlockWhen(m.id)}.</div>
          <div class="lock-prog">
            <div class="bar"><i style={{ width: Math.min(100, (now / Math.max(1, goal)) * 100) + '%' }} /></div>
            <small>{unit}: {fmt(Math.min(now, goal))}/{fmt(goal)}</small>
          </div>
          {F.net && !game.net && <p class="sub">Ta funkcja działa tylko z połączeniem z serwerem.</p>}
          <Close onClose={close} label="Rozumiem" />
        </>
      );
    }
    case 'intro':
      return <IntroView game={game} close={close} />;
    case 'boss': {
      const L = landDef(m.land);
      const next = landDef(m.land + 1);
      const set = setOfLand(m.land);
      return (
        <>
          <div class="eyebrow">Boss pokonany</div>
          <div class="h">{L.boss}</div>
          <RewardTiles r={{ ...m.extra, gold: m.gold, ores: { [L.rare]: m.n, ...m.extra?.ores }, books: m.books, uniq: set && m.uniq ? { [set]: m.uniq } : undefined }} />
          {set && m.uniq > 0 && (
            <p class="sub">{SETS[set].ore} to ruda unikalna: od {SET_FORGE_LVL}. poziomu kuźni wytopisz z niej przedmiot o pewnej jakości IV albo V. Więcej dają Leża Bossów.</p>
          )}
          {m.land + 1 === ABYSS_FROM && <p class="sub"><b>Kampania ukończona!</b> Dalej Otchłań — kręgi bez dna z coraz silniejszymi wrogami i rudami z końca gry.</p>}
          <p>Odblokowana kraina: <b>{next.n}</b> ({actName(next.act)}). Rudy: {next.drops.map(([o, p]) => `${ORES[o].n} ${pctS(p)}`).join(' · ')}.</p>
          <Close onClose={close} label="Dalej" />
        </>
      );
    }
    case 'awaken':
      return (
        <>
          <div class="eyebrow">Przebudzenie · {fmt(LEGEND[3].at)} Sławy Czynów</div>
          <div class="h">{baseName(m.item)}</div>
          <p class="sub">Przedmiot się przebudził: +{Math.round(LEGEND[3].b * 100)}% do statystyki głównej i <b>cecha do wyboru</b> — przeciw komu ma być silniejszy. Cecha da mu też nowe imię.</p>
          {s.eq[m.item.slot]?.id === m.item.id
            ? <AwakenChoice game={game} slot={m.item.slot} onDone={close} />
            : <><ItemCard it={m.item} /><Close onClose={close} label="Dalej" /></>}
        </>
      );
    case 'dungChoice':
      return (
        <>
          <div class="eyebrow">Głęboka Sztolnia · piętro {m.floor}</div>
          <div class="h">Wyjść czy kopać dalej?</div>
          <p class="sub">W worku: <RewardIcons r={m.loot} size={16} />. Jeśli zginiesz niżej, stracisz połowę łupu.</p>
          <div class="result-actions">
            <button class="btn" onClick={() => { close(); game.dungExit(); }}>Wyjdź z łupem</button>
            <button class="btn primary" onClick={() => { close(); game.dungGo(); }}>Schodź dalej</button>
          </div>
        </>
      );
    case 'dungEnd': {
      const halves = m.id === 'sztolnia' || m.id === 'oltarze';
      const head = m.id === 'skarbiec' ? 'Łup zebrany' : m.id === 'wieza' ? (m.lost ? 'Strażnik cię zatrzymał' : 'Zejście z wieży') : m.lost ? 'Bohater padł' : 'Zwycięstwo';
      const where: Partial<Record<typeof m.id, string>> = {
        skarbiec: `pokonane gobliny: ${m.floor}`, wieza: `najwyżej: piętro ${m.floor}`, oltarze: `strażnicy: ${m.floor}/5`,
        sztolnia: `piętro ${m.floor}`, kopalnia: `fale: ${m.floor}/10`, labirynt: `komnaty: ${m.floor}/${LAB_ROOMS}`,
        zbrojownia: `skrzynie: ${m.floor}/3`, krypta: `strażnicy: ${m.floor}/5`, sezon: `piętra: ${m.floor}/${EVENT.FLOORS}`,
      };
      const ev = eventOf(game.ctx.now()).def;
      const w = where[m.id];
      return (
        <>
          <div class="eyebrow">{dungName(m.id, game.ctx.now())}{w ? ' · ' + w : ''}</div>
          <div class="h">{head}</div>
          <p class="sub">
            {m.lost && halves ? 'Uciekasz z połową łupu. ' : ''}
            {m.id === 'leza' && m.lost ? 'Boss był za silny. Klucz przepadł — spróbuj jutro albo wzmocnij ekwipunek.' : null}
            {m.items > 0 ? ` Przedmioty ze skrzyń: ${m.items} — zdecyduj, które założyć.` : ''}
            {m.id === 'sezon' ? <> Wydarzenie {ev.n}: <b>+{evText(m.evp ?? 0, ev)}</b>.</> : null}
          </p>
          {!(m.id === 'leza' && m.lost) && (Object.keys(m.reward).some(k => { const v = (m.reward as Record<string, unknown>)[k]; return typeof v === 'number' ? v > 0 : !!v && Object.values(v as object).some(x => x); })
            ? <RewardTiles r={m.reward} /> : <p class="sub">Tym razem bez łupu.</p>)}
          <Close onClose={close} label="Wróć do krainy" />
        </>
      );
    }
    case 'offline': {
      const r = m.report;
      const L = landDef(r.land);
      const ores: Record<number, number> = {};
      (r.ores ?? []).forEach((n, o) => { if (n > 0) ores[o] = n; });
      const got: Reward = { gold: r.gold, ores, books: r.books, els: r.el && L.el ? { [L.el]: r.el } : undefined };
      return (
        <>
          <div class="wb-head" style={{ '--bg': `url(${landBgUrl(r.land)})` } as Record<string, string>}>
            <div class="wb-hero" aria-hidden="true"><HeroSprite eq={s.eq} skin={s.look.skin} /></div>
            <div class="wb-txt">
              <div class="eyebrow"><Px src={resUrl('czas')} size={14} /> Poza grą {tfmt(r.away ?? r.ms)}{r.capped ? ` · łupy za ${tfmt(r.ms)}` : ''}</div>
              <div class="h">Witaj z powrotem!</div>
              <p class="sub">Bohater walczył w krainie <b>{L.n}</b> (wydajność {Math.round(B.OFFLINE_EFFICIENCY * 100)}%, ruda {Math.round(B.OFFLINE_EFFICIENCY * B.OFFLINE_ORE * 100)}% zwykłego dropu).</p>
            </div>
          </div>
          <div class="eyebrow">Łup z nocnej zmiany</div>
          <RewardTiles r={got} />
          <ul class="wb-extra">
            <li><Px src={resUrl('moc')} size={22} /><span><b>+{fmt(r.fame)}</b> Sławy Czynów dla każdego założonego przedmiotu</span></li>
            {r.forgeUp > 0 && <li class="hl"><Px src={resUrl('kowadlo')} size={22} /><span>Kuźnia osiągnęła <b>poziom {r.forgeUp}</b>!</span></li>}
            {r.tech && <li class="hl"><Px src={techUrl(r.tech)} size={22} /><span>Zbadano: <b>{TECH[r.tech].n}</b> (poziom {s.tech.lv[r.tech] ?? 1})</span></li>}
            {r.hatched && <li class="hl"><Px src={resUrl('jajo2')} size={22} /><span>Z jaja wykluł się chowaniec: <b>{PETS[r.hatched].n}</b></span></li>}
            {r.capped && (
              <li><Px src={resUrl('czas')} size={22} /><span>Łupy liczą się najwyżej za <b>{tfmt(r.ms)}</b> nieobecności (kuźnia i badania biegną cały czas).
                {techLvl(s, 'e_noc') < TECH.e_noc.max ? <> Wydłużysz limit badaniem <b>{TECH.e_noc.n}</b> w Akademii — do {tfmt(B.OFFLINE_CAP_MS + TECH.e_noc.per * TECH.e_noc.max * 60000)}.</> : null}</span></li>
            )}
          </ul>
          {r.chestCount > 0 && (
            <>
              <div class="eyebrow">Skrzynia nocnej zmiany · {r.chestCount} wytopów</div>
              <ul class="wb-chest">
                {r.chest.map(x => (
                  <li key={x.item.id} class={`rt${x.item.r}`}>
                    <span class={`gi r${x.item.r}`}><Px src={itemUrl(x.item.kind, x.item.ore, x.item.r)} size={22} /></span>
                    <span>{itemName(x.item)} · {RAR[x.item.r].n}</span>
                    <small>{x.stop ? 'czeka na decyzję' : x.equipped ? 'założony' : 'sprzedany'}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Close onClose={close} label="Do kuźni" />
        </>
      );
    }
    case 'item': {
      const curIt = s.eq[m.item.slot];
      const worn = !!curIt && (curIt === m.item || (curIt.id > 0 && curIt.id === m.item.id));
      return (
        <>
          <ItemCard it={worn ? s.eq[m.item.slot]! : m.item} history proof={game.net && worn ? hasProof(s.eq[m.item.slot]!) : undefined} />
          {worn && <AwakenBox game={game} slot={m.item.slot} />}
          {worn && <Reforge game={game} it={m.item} />}
          {worn && s.seals > 0 && (
            <button class="btn" onClick={() => game.useSeal(m.item.slot)}>Użyj Pieczęci Legendy (+{SEAL_FAME} Sławy) · masz {s.seals}</button>
          )}
          <Close onClose={close} label="Zamknij" />
        </>
      );
    }
    case 'labChoice':
      return (
        <>
          <div class="eyebrow">Labirynt Minotaura · komnata {m.room}/{LAB_ROOMS}</div>
          <div class="h">Które drzwi?</div>
          {Object.keys(m.loot).length > 0 && <p class="sub">Zebrane: <RewardIcons r={m.loot} size={16} /></p>}
          <div class="doors">
            {m.doors.map((d, i) => (
              <button key={i} class={`door d-${d.kind}`} onClick={() => { close(); game.labChoose(i); }}>
                <b>{LAB_DOORS[d.kind].n}</b>
                <small>{d.kind === 'oltarz' ? LAB_BLESSINGS[d.bless ?? 0].n : LAB_DOORS[d.kind].d}</small>
              </button>
            ))}
          </div>
        </>
      );
    case 'found':
      return <DecisionView game={game} src="found" close={close} />;
    case 'decide':
      return <DecisionView game={game} src="pending" close={close} />;
    case 'mix':
      return <MixView game={game} what={m.what} close={close} />;
    case 'landinfo':
      return <LandInfoView game={game} land={m.land} close={close} />;
    case 'dunginfo':
      return <DungInfoView game={game} id={m.id} close={close} />;
    case 'feedback':
      return <FeedbackView game={game} close={close} />;
    case 'missions':
      return <MissionsView game={game} initial={m.tab} close={close} />;
    case 'ranking':
      return <RankingView initial={m.board} close={close} />;
    case 'arena':
      return <ArenaView game={game} close={close} />;
    case 'look':
      return <LookView game={game} close={close} />;
    case 'notifyAsk':
      return <NotifyAskView game={game} close={close} />;
    case 'event':
      return <EventView game={game} close={close} onDung={() => { close(); goTab?.('lochy'); }} />;
    case 'shop':
      return <ShopView game={game} initial={m.tab} close={close} />;
    case 'adOffer':
      return <AdOfferView game={game} what={m.what} close={close} />;
    case 'chat':
      return <ChatView game={game} initial={m.ch} close={close} goClan={t => { close(); if (t) openClanTab(t); goTab?.('klan'); }} />;
    case 'draw':
      return <DrawView game={game} m={m} close={close} />;
    case 'menu':
      return <MenuView game={game} close={close} goTab={goTab} />;
    case 'ores':
      return <OrePicker game={game} close={close} />;
    case 'auto':
      return <AutoSheet game={game} close={close} />;
    case 'music':
      return <MusicSheet game={game} />;
    case 'compUp':
      return <CompUpgrade game={game} what={m.what} id={m.id} close={close} />;
    case 'changelog':
      return <ChangelogView game={game} all={m.all} close={close} />;
    case 'google':
      return <GoogleAskView game={game} close={close} />;
    case 'reset':
      return (
        <>
          <div class="h">Zacząć od nowa?</div>
          <p class="sub">Stracisz cały postęp: przedmioty, rudy, kuźnię i krainy.</p>
          <div class="result-actions">
            <button class="btn" onClick={close}>Anuluj</button>
            <button class="btn danger" onClick={() => { close(); game.reset(); }}>Usuń postęp</button>
          </div>
        </>
      );
    case 'info':
      if (m.k === 'runes') return <RuneInfo game={game} close={close} />;
      if (m.k === 'pets') return <PetsInfo close={close} />;
      if (m.k === 'mounts') return <MountsInfo close={close} />;
      return m.k === 'level' ? <ForgeLevelInfo game={game} close={close} /> : <ForgeInfo game={game} close={close} />;
  }
}

/** Liczba z przecinkiem dziesiętnym (0,55). */
const f2 = (v: number) => String(v).replace('.', ',');

/** Mnożniki przeskoku na Boski według rudy (np. „zwykle ×0,04, Eteryt ×0,07, …”). */
const divMults = 'zwykle ×' + f2(DIVINE_JUMP) + ', ' + ORE_ORDER.filter(i => ORES[i].div).map(i => `${ORES[i].n} ×${f2(ORES[i].div!)}`).join(', ');

/** Okno „Jak działa wytop”: trzy kroki, szanse każdej rudy na pasku i krótkie karty z zasadami. */
function ForgeInfo({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const rel = techMods(s).jumpRel;
  const sel = s.oreSel;
  const cur = s.forge.lvl;
  const [lv, setLv] = useState(cur);
  const unlock = FORGE_UNLOCKS[lv];
  /** Szanse (%) na rzadkość wyższą niż wynik bez przeskoku na poziomie `lvl` (przeskok) i niższą (ruda jeszcze nie opanowana). */
  const split = (ore: number, lvl: number, d: [number, number][]) => {
    const n = oreNominal(ore, Math.max(lvl, ORES[ore].lvl));
    return {
      up: d.reduce((a, [r, p]) => a + (rRank(r) > n ? p : 0), 0),
      down: d.reduce((a, [r, p]) => a + (rRank(r) < n ? p : 0), 0),
    };
  };
  const moved = (a: number, b: number) => Math.abs(a - b) >= 0.05;
  const tips: [string, string, JSX.Element][] = [
    [resUrl('czas'), 'Gwarancja przeskoku', <>Po {B.PITY_MAX} wytopach bez przeskoku następny przeskakuje na pewno o 1 (ale nie na Boski). Twój licznik: <b>{s.pity}/{B.PITY_MAX}</b>.</>],
    [resUrl('kowadlo'), 'Rzadsze — trudniej', <>Przeskok na Heroiczny ma ×{f2(JUMP_TO_MULT_RANK[5])} szansy bazowej, na Legendarny ×{f2(JUMP_TO_MULT_RANK[6])}, Pradawny ×{f2(JUMP_TO_MULT_RANK[7])}, Mityczny ×{f2(JUMP_TO_MULT_RANK[8])}, a na Boski {divMults}. Paski wyżej już to uwzględniają.</>],
    [oreUrl(4), 'Ruda dojrzewa z kuźnią', <>Ruda nie ma sztywnego minimum: tuż po odblokowaniu daje mieszankę dwóch sąsiednich rzadkości, a z każdym poziomem kuźni wyniki przesuwają się w górę — aż do jakości docelowej rudy (wyżej przełącz poziom, żeby to zobaczyć).</>],
    [oreUrl(DIVINE_ORE), 'Boski przedmiot', <>Żadna ruda nie daje go na pewno. Ma własne imię, złotą ramkę i Boską aurę (+{B.DIVINE_AURA}% obrażeń i zdrowia za każdy założony), a serwer ogłasza go na czacie. {ORES[DIVINE_ORE].n}: bossowie aktu IV, loch sezonowy, wydarzenia i Przepustka.</>],
    [resUrl('iskra'), 'Jakość I–V', <>Każdy wytop losuje też jakość: {QUAL.map(q => `${q.n} ${q.p}%`).join(' · ')}. Wyższa jakość to więcej głównej i dodatkowych statystyk — od +{QUAL[1].b}% (II) do +{QUAL[4].b}% (V).</>],
    [elemUrl('zar'), `Domieszki · od ${B.ELEM_FORGE_LVL}. poziomu`, <>Nadają przedmiotowi żywioł i mały efekt (np. +{ELEM.burz.v.toLocaleString('pl-PL')}% obrażeń). Każda założona część z domieszką dodaje swój. Nie zmieniają szans.</>],
    [setOreUrl('lowca'), `Rudy unikalne · od ${SET_FORGE_LVL}. poziomu`, <>Dają wytopowi pewną jakość IV albo V. Wypadają z bossów i Leży Bossów.</>],
    [techUrl('k_hart'), `Hartowanie · od ${TECH_UNLOCK_FORGE}. poziomu`, <>Badanie w Nauce mnoży szanse na przeskok.{rel ? <> Twoja premia: <b>+{pct(rel)}</b>, już w paskach.</> : ''}</>],
    [resUrl('zloto'), 'Sprzedaż', <>Niepotrzebny przedmiot sprzedajesz za złoto.</>],
  ];
  return (
    <>
      <div class="eyebrow">Kuźnia · poziom {s.forge.lvl}</div>
      <div class="h">Jak działa wytop</div>
      <div class="fi-steps">
        <div class="fi-step"><Px src={oreUrl(sel)} size={32} /><b>1. Ruda</b><small>wyznacza najniższą rzadkość</small></div>
        <div class="fi-step"><Px src={resUrl('kowadlo')} size={32} /><b>2. Kuźnia</b><small>szansa na przeskok o 1–2 wyżej</small></div>
        <div class="fi-step"><Px src={resUrl('zloto')} size={32} /><b>3. Decyzja</b><small>załóż albo sprzedaj</small></div>
      </div>
      <div class="fi-sec">Szanse według poziomu kuźni</div>
      <div class="fi-lv" role="group" aria-label="Poziom kuźni do podglądu szans">
        <button class="fi-lv-b" disabled={lv <= cur} onClick={() => setLv(lv - 1)} aria-label="Poziom niżej">‹</button>
        <div class="fi-lv-t" aria-live="polite">
          <b>{lv}. poziom</b>
          <small>{lv === cur ? 'twój poziom' : lv === cur + 1 ? 'następny poziom' : `${lv - cur} ${pl(lv - cur, 'poziom', 'poziomy', 'poziomów')} ponad twój`}</small>
        </div>
        <button class="fi-lv-b" disabled={lv >= B.FORGE_MAX} onClick={() => setLv(lv + 1)} aria-label="Poziom wyżej">›</button>
      </div>
      <div class="fi-lv-q">
        <button class={lv === cur ? 'on' : ''} onClick={() => setLv(cur)}>Twój ({cur})</button>
        {cur < B.FORGE_MAX && <button class={lv === cur + 1 ? 'on' : ''} onClick={() => setLv(cur + 1)}>Następny ({cur + 1})</button>}
        {cur + 5 <= B.FORGE_MAX && <button class={lv === cur + 5 ? 'on' : ''} onClick={() => setLv(cur + 5)}>+5 ({cur + 5})</button>}
      </div>
      {lv > cur && unlock && <p class="fi-lv-u"><Px src={resUrl('kowadlo')} size={16} /> Na {lv}. poziomie: {unlock}</p>}
      <ul class="fi-odds">
        {ORE_ORDER.map(i => {
          const o = ORES[i];
          const off = lv < o.lvl;
          const fresh = !off && cur < o.lvl;
          const d = dist(i, Math.max(lv, o.lvl), rel);
          // porównanie z twoim poziomem względem tego samego wyniku bez przeskoku (z oglądanego poziomu)
          const now = !off && !fresh && lv !== cur ? split(i, lv, dist(i, Math.max(cur, o.lvl), rel)) : null;
          const then = split(i, lv, d);
          return (
            <li key={o.n} class={`${i === sel ? 'sel' : ''}${off ? ' off' : ''}`}>
              <Px src={oreUrl(i)} size={28} />
              <div class="fi-o">
                <div class="fi-on">
                  <b>{o.n}{fresh && <em class="fi-new">nowa</em>}</b>
                  <small>bez przeskoku <span class={`rt${rAt(oreNominal(i, Math.max(lv, o.lvl)))}`}>{RAR[rAt(oreNominal(i, Math.max(lv, o.lvl)))].n}</span>{off ? ` · od ${o.lvl}. poziomu` : ''}</small>
                </div>
                <OddsBar d={d} cls="compact" />
                {now && (moved(now.up, then.up) || moved(now.down, then.down)) && (
                  <div class="fi-delta">
                    {moved(now.up, then.up) && <span>przeskok {pct(now.up)} → <b>{pct(then.up)}</b></span>}
                    {moved(now.down, then.down) && <span>niżej {pct(now.down)} → <b>{pct(then.down)}</b></span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {lv !== cur && <p class="fi-lv-n">Strzałki: zmiana względem twojego poziomu. Przeskok — szansa na rzadkość wyższą niż wynik bez przeskoku; niżej — szansa na rzadkość poniżej niego, gdy ruda jeszcze dojrzewa.</p>}
      <div class="fi-sec">Warto wiedzieć</div>
      <div class="fi-tips">
        {tips.map(([ic, h, d]) => (
          <div class="fi-tip" key={h}><Px src={ic} size={24} /><div><b>{h}</b><p>{d}</p></div></div>
        ))}
      </div>
      <Close onClose={close} label="Rozumiem" />
    </>
  );
}

/** Wynik Zwoju, Jaja albo Siodła: ikona, rzadkość i co się zmieniło (nowość, poziom, gwiazdki). */
/**
 * Wynik zwoju, siodła albo jaja. Najpierw chwila napięcia: zwój/siodło drży, a poświata przechodzi przez kolejne
 * rzadkości aż do wylosowanej (z dźwiękiem coraz wyższym); jajo pęka. Dotknięcie odsłania od razu.
 */
function DrawView({ game, m, close }: { game: Game; m: Extract<ModalData, { kind: 'draw' }>; close: () => void }) {
  const skill = m.what === 'skill' ? SKILLS[m.id as SkillId] : null;
  const def = skill ?? (m.what === 'pet' ? PETS[m.id as PetId] : MOUNTS[m.id as MountId]);
  const r = def.r;
  const calmFx = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [phase, setPhase] = useState<'open' | 'reveal'>(calmFx ? 'reveal' : 'open');
  const [step, setStep] = useState(m.what === 'pet' ? r : 0);
  useEffect(() => {
    if (phase !== 'open') return;
    let k = m.what === 'pet' ? r : 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setStep(k);
      play('strike', k);
      if (k >= r) { t = setTimeout(() => setPhase('reveal'), m.what === 'pet' ? 700 : 480); return; }
      k++;
      t = setTimeout(tick, 400);
    };
    t = setTimeout(tick, 380);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => { if (phase === 'reveal') { play('jump', r); void buzz(r, game.s.opts.vibe !== false); } }, [phase]);
  if (phase === 'open') {
    const openIc = m.what === 'skill' ? resUrl('zwoj') : m.what === 'mount' ? resUrl('siodlo') : resUrl('jajo' + Math.min(4, r));
    return (
      <div class={`dec draw opening rs${Math.min(4, step)}`} onClick={() => setPhase('reveal')}>
        <div class="eyebrow">{m.what === 'skill' ? 'Zwój zaklęć' : m.what === 'mount' ? 'Siodło' : 'Jajo się wykluwa'}</div>
        <div class="draw-open" aria-hidden="true"><span class="do-rays" /><span class="do-glow" /><Px src={openIc} size={96} cls="do-ic" /></div>
        <div class={`do-r rt${Math.min(4, step)}`}>{m.what === 'pet' ? 'Coś się rusza…' : `${RAR[step].n}${step >= r ? '!' : '…'}`}</div>
        <small class="do-hint">dotknij, aby odsłonić</small>
      </div>
    );
  }
  const icon = m.what === 'skill' ? skillUrl(m.id) : companionUrl(m.id); // nowy towarzysz: jego portret
  const from = m.from ?? 0, to = m.to ?? 0;
  const head = m.what === 'pet' ? 'Jajo się wykluło' : m.what === 'skill' ? 'Zwój zaklęć' : 'Siodło';
  const what = m.what === 'skill' ? 'Umiejętność' : m.what === 'pet' ? 'Chowaniec' : 'Wierzchowiec';
  const stars = (n: number, hl = -1) => Array.from({ length: STARS_MAX }, (_, i) => <i key={i} class={`${i < n ? 'on' : ''}${i === hl ? ' new' : ''}`}>★</i>);
  let change: JSX.Element;
  if (!m.dupe) change = <div class="draw-tag new">Nowość w kolekcji!</div>;
  else if (skill) {
    change = to > from ? (
      <div class="draw-tag up">Poziom {from} → <b>{to}</b>{to - from > 1 ? ` (+${to - from})` : ''}</div>
    ) : to >= SKILL_MAX ? <div class="draw-tag">Maksymalny poziom {SKILL_MAX}</div> : (
      <div class="draw-prog">
        <div class="row"><span>Kopia · poziom {to}</span><b>{m.cards ?? 0}/{m.need ?? 1} do poziomu {to + 1}</b></div>
        <div class="bar"><i style={{ width: Math.min(100, ((m.cards ?? 0) / Math.max(1, m.need ?? 1)) * 100) + '%' }} /></div>
      </div>
    );
  } else {
    change = m.stones ? <div class="draw-tag">Komplet gwiazdek — dostajesz {m.stones} Kamieni</div>
      : <div class="draw-tag up"><span class="stars">{stars(to, to - 1)}</span> {from} → <b>{to}</b> gwiazdek</div>;
  }
  return (
    <div class={`dec draw revealed r${r}`}>
      <div class="eyebrow">{head}</div>
      <div class="dec-drop" aria-hidden="true">
        <span class="dec-burst" />
        <Px src={icon} size={m.what === 'skill' ? 72 : 96} cls={`dec-ico${m.what === 'skill' ? '' : ' flip'}`} />
      </div>
      <div class="dec-title">
        <div class="dec-name">{def.n}</div>
        <div class="irar">{what} · {RAR[r].n}</div>
      </div>
      {change}
      {skill && (() => {
        const fx = skillFx(m.id as SkillId, Math.max(1, to));
        const up = to > from && from > 0 ? skillFx(m.id as SkillId, from) : null;
        return (
          <div class="draw-sk">
            <span class={`sk-tag k-${fx.kind}`}>{fx.tag}</span>
            <div class="sk-main"><b>{up ? <>{up.main} → {fx.main}</> : fx.main}</b><small>{fx.label}</small><span class="sk-cd">⏱ co {f1(skill.cd / 1000)} s</span></div>
            <small class="sk-d">{fx.text}</small>
          </div>
        );
      })()}
      {m.what === 'pet' && <p class="sub draw-eff">{PETS[m.id as PetId].d.replace('{v}', String(PETS[m.id as PetId].tv))}</p>}
      {m.what === 'mount' && <p class="sub draw-eff">Bazowo: +{MOUNTS[m.id as MountId].dmg}% obrażeń, +{MOUNTS[m.id as MountId].hp}% zdrowia</p>}
      <Close onClose={close} label="Dalej" />
    </div>
  );
}

/** Co wypada w krainie: z fal i z bossa (przycisk „i” na polu walki). */
/**
 * Co wypada w krainie. Strzałki (albo przesunięcie palcem) przełączają na sąsiednie krainy — tak jak na liście krain:
 * cała kampania i Otchłań do najdalszego osiągniętego kręgu — żeby porównać rudy i nagrody bez zamykania okna.
 */
function LandInfoView({ game, land: start, close }: { game: Game; land: number; close: () => void }) {
  const s = game.s;
  const last = Math.max(ABYSS_FROM, s.maxLand);
  const [land, setLand] = useState(() => Math.max(0, Math.min(last, start)));
  const go = (d: number) => setLand(l => Math.max(0, Math.min(last, l + d)));
  const touch = useRef<{ x: number; y: number } | null>(null);
  const L = landDef(land);
  const mods = techMods(s);
  const shares = oreShares(L, allMods(s).rarePct);
  const set = setOfLand(land);
  const wave = goldWaveOf(game.s, gOf(land, 5));
  const first = !s.cleared[land];
  const act = L.act;
  const here = land === s.cur.land && game.b.mode === 'camp';
  return (
    <div class="li-swipe" onTouchStart={e => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={e => {
        const a = touch.current; touch.current = null;
        if (!a) return;
        const t = e.changedTouches[0], dx = t.clientX - a.x, dy = t.clientY - a.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}>
      <div class="li-head" key={land} style={{ '--bg': `url(${landBgUrl(land)})` } as Record<string, string>}>
        <div class="eyebrow">{isAbyss(land) ? `Otchłań · krąg ${abyssCircle(land)}` : `${actName(act)} · kraina ${land + 1}`}</div>
        <div class="h">{L.n}</div>
        <div class="li-st">
          {here ? <span class="lstat front">Tu walczysz</span> : land > s.maxLand ? <span class="lstat lock"><LockIcon />Zablokowana</span>
            : s.cleared[land] ? <span class="lstat done">Pokonana</span> : land === s.maxLand ? <span class="lstat front">Front</span> : null}
        </div>
      </div>
      <div class="li-nav" role="group" aria-label="Inne krainy">
        <button class="btn small" disabled={land <= 0} onClick={() => go(-1)} aria-label="Poprzednia kraina">‹ {land > 0 ? landDef(land - 1).n : ''}</button>
        {land !== start && <button class="btn small li-back" onClick={() => setLand(start)} aria-label="Wróć do pierwszej krainy">↺</button>}
        <button class="btn small" disabled={land >= last} onClick={() => go(1)} aria-label="Następna kraina">{land < last ? landDef(land + 1).n : ''} ›</button>
      </div>
      <div class="eyebrow">Z każdej fali</div>
      <ul class="droplist">
        <li><Px src={resUrl('zloto')} size={24} /><span>Złoto</span><b>ok. {fmt(wave)} na falę</b></li>
        <li class="dl-sub"><span>Ruda — z {pct(B.ORE_DROP * 100)} fal (główna 1–{B.ORE_MAIN_MAX} sztuki, rzadsze po 1):</span></li>
        {shares.map(([o, p]) => (
          <li key={o} class={isRareOre(L, o) ? 'rare' : ''}>
            <Px src={oreUrl(o)} size={24} /><span>{ORES[o].n}{o === L.main ? ' · główna' : isRareOre(L, o) ? ' · rzadka' : ''}</span><b>{pctS(p)} dropów</b>
          </li>
        ))}
        {L.el && <li><Px src={elemUrl(L.el)} size={24} /><span>Domieszka: {ELEM[L.el].n}</span><b>{pct(B.ELEM_DROP * 100)} fal</b></li>}
        <li><Px src={resUrl('ksiega')} size={24} /><span>Księga Wiedzy</span><b>{pctS(B.BOOK_DROP * 100)} fal</b></li>
        <li><Px src={resUrl('zwoj')} size={24} /><span>Zwój zaklęć</span><b>{pctS(B.SCROLL_DROP * 100)} fal</b></li>
      </ul>
      <div class="eyebrow">Boss: {L.boss}{first ? ' · pierwsze pokonanie' : ''}</div>
      <ul class="droplist">
        <li><Px src={resUrl('zloto')} size={24} /><span>Złoto</span><b>ok. {fmt(goldWaveOf(game.s, gOf(land, B.STAGES_PER_LAND)) * 10)}</b></li>
        <li><Px src={oreUrl(L.rare)} size={24} /><span>{ORES[L.rare].n}</span><b>2–4 sztuki</b></li>
        <li><Px src={resUrl('ksiega')} size={24} /><span>Księgi Wiedzy</span><b>{first ? `${B.BOOKS_BOSS_FIRST + land} (pierwsze)` : `1 · ${pct(B.BOOKS_BOSS_CHANCE * 100)}`}</b></li>
        <li><Px src={resUrl('zwoj')} size={24} /><span>Zwoje zaklęć</span><b>{first ? `${B.SCROLLS_BOSS_FIRST + act} (pierwsze)` : `1 · ${pct(B.SCROLL_BOSS_CHANCE * 100)}`}</b></li>
        {set && <li><Px src={setOreUrl(set)} size={24} /><span style={{ color: SETS[set].col }}>{SETS[set].ore}</span><b>{first ? `${B.UNIQ_BOSS_FIRST} (pierwsze)` : `1 · ${pct(B.UNIQ_BOSS_CHANCE * 100)}`}</b></li>}
        {land >= PETS_UNLOCK_LAND - 1 && <li><Px src={resUrl('jajo' + Math.max(0, Math.min(4, Math.floor((land - 3) / 3))))} size={24} /><span>Jajo chowańca</span><b>{first ? 'pewne' : pct(B.EGG_BOSS_CHANCE * 100)}</b></li>}
        {land >= MOUNTS_UNLOCK_LAND - 1 && <li><Px src={resUrl('siodlo')} size={24} /><span>Siodło</span><b>{first ? `${B.SADDLES_BOSS_FIRST} (pierwsze)` : pct(B.SADDLE_BOSS_CHANCE * 100)}</b></li>}
      </ul>
      <p class="sub">Zalecana Moc krainy: <b>{fmt(recPower(land))}</b> (twoja: {fmt(game.stats.power)}).{mods.rarePct ? ` Premia do rzadkich rud (+${pct(mods.rarePct)}) jest już wliczona.` : ''}</p>
      {!here && land <= s.maxLand
        ? <div class="li-act"><button class="btn" onClick={close}>Zamknij</button><button class="btn primary" onClick={() => { game.goLand(land); close(); }}>Walcz tutaj</button></div>
        : <Close onClose={close} label="Zamknij" />}
    </div>
  );
}

/**
 * Przypomnienie o powiadomieniach (raz, po pierwszej krainie, gdy nie działają): co gracz zyska. „Włącz” — telefon
 * pyta o zgodę; gdy już nie pyta (dwie odmowy), przycisk prowadzi do ustawień powiadomień gry w telefonie.
 */
function NotifyAskView({ game, close }: { game: Game; close: () => void }) {
  const [st, setSt] = useState<NotifyState | null>(null);
  const [busy, setBusy] = useState(false);
  const done = () => { toast(game.ctx, 'Powiadomienia włączone — telefon da znać, gdy coś będzie gotowe.', 'good'); close(); };
  // Powrót z ustawień telefonu: zgoda włączona — gotowe.
  useEffect(() => onComeBack(() => {
    void notifyState().then(x => { if (x === 'granted') { game.setNotify(true); done(); } else setSt(x); }).catch(() => {});
  }), []);
  const on = async () => {
    setBusy(true);
    try {
      const x = await enableNotify(game);
      if (x === 'granted') done(); else setSt(x);
    } catch { setSt('denied'); } finally { setBusy(false); }
  };
  const rows: [string, string, string][] = [
    [resUrl('kowadlo'), 'Kuźnia gotowa', 'ulepszenie skończone — od razu kujesz lepsze przedmioty'],
    [resUrl('ksiega'), 'Badanie zakończone', 'wybierasz następne, zamiast tracić godziny Akademii'],
    [resUrl('zloto'), 'Pełne łupy', 'bohater walczy bez ciebie tylko do limitu — wiesz, kiedy wrócić'],
    [resUrl('jajo0'), 'Jajo się wykluło', 'nowy chowaniec czeka na odbiór'],
  ];
  return (
    <>
      <div class="na-head" aria-hidden="true"><span class="na-bell"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span></div>
      <div class="eyebrow">Pierwsza kraina zdobyta!</div>
      <div class="h">Nie przegap gotowej kuźni</div>
      <p class="sub">Kuźnia, Akademia i bohater pracują także wtedy, gdy nie grasz. Telefon da znać tylko w tych chwilach — bez reklam i bez zasypywania wiadomościami:</p>
      <ul class="na-list">
        {rows.map(([ic, t, d]) => <li key={t}><Px src={ic} size={28} /><span><b>{t}</b><small>{d}</small></span></li>)}
      </ul>
      {st === 'denied' && (
        <div class="lockline na-blocked">
          Telefon nie pozwala grze wysyłać powiadomień.{' '}
          {canOpenNotifySettings()
            ? <>Włącz je w ustawieniach telefonu i wróć do gry.<div style={{ marginTop: '8px' }}><button class="btn small primary" onClick={() => void openNotifySettings()}>Otwórz ustawienia telefonu</button></div></>
            : <>Włącz je w telefonie: <b>Ustawienia → Aplikacje → Kuźnia Legend → Powiadomienia</b>.</>}
        </div>
      )}
      {st !== 'denied' && <button class="btn primary big" disabled={busy} onClick={() => void on()}>Włącz powiadomienia</button>}
      <button class="btn" onClick={close}>Nie teraz</button>
      <small class="na-foot">Zawsze możesz to zmienić w Kodeksie → Ustawienia.</small>
    </>
  );
}

/** Wybór domieszki żywiołu albo rudy unikalnej do wytopu — osobno od wyboru rudy, żeby nie zaznaczyć jej przypadkiem. */
function MixView({ game, what, close }: { game: Game; what: 'el' | 'set'; close: () => void }) {
  const s = game.s;
  const pick = (fn: () => void) => { fn(); close(); };
  if (what === 'el') {
    const keys = ELEM_KEYS.filter(k => (s.els[k] ?? 0) > 0);
    return (
      <>
        <div class="eyebrow">Domieszka żywiołu</div>
        <div class="h">Co dodać do wytopu?</div>
        <p class="sub">Domieszka nadaje przedmiotowi żywioł i mały efekt — każda założona część z domieszką dodaje swój. Każdy wytop zużywa jedną sztukę. Nie zmienia szans na rzadkość ani jakość.</p>
        <div class="mixlist">
          <button class={`mixopt${!s.elSel ? ' on' : ''}`} onClick={() => pick(() => game.setElem(null))}><span class="mx-n">Bez domieszki</span></button>
          {keys.map(k => (
            <button key={k} class={`mixopt${s.elSel === k ? ' on' : ''}`} onClick={() => pick(() => game.setElem(k))}>
              <Px src={elemUrl(k)} size={32} />
              <span class="mx-n">{ELEM[k].n} <small>· masz {fmt(s.els[k] ?? 0)}</small></span>
              <small class="mx-d">{ELEM[k].el}: {ELEM[k].d}</small>
            </button>
          ))}
        </div>
        {keys.length === 0 && <p class="sub">Nie masz jeszcze domieszek. Wypadają w krainach z żywiołem (część fal).</p>}
        <button class="btn" onClick={close}>Anuluj</button>
      </>
    );
  }
  const keys = SET_IDS.filter(k => (s.uniq[k] ?? 0) > 0);
  return (
    <>
      <div class="eyebrow">Ruda unikalna</div>
      <div class="h">Pewna jakość?</div>
      <p class="sub">Wytop z rudą unikalną ma na pewno jakość <b>IV</b> (+{QUAL[3].b}% statystyk) albo <b>V</b> (+{QUAL[4].b}%) — V w {100 - QUAL_UNIQ_IV}% wytopów. Rzadkość losuje się zwyczajnie. Każdy wytop zużywa jedną sztukę.</p>
      <div class="mixlist">
        <button class={`mixopt${!s.uniqSel ? ' on' : ''}`} onClick={() => pick(() => game.setUniq(null))}><span class="mx-n">Bez rudy unikalnej</span></button>
        {keys.map(k => (
          <button key={k} class={`mixopt${s.uniqSel === k ? ' on' : ''}`} onClick={() => pick(() => game.setUniq(k))}>
            <Px src={setOreUrl(k)} size={32} />
            <span class="mx-n" style={{ color: SETS[k].col }}>{SETS[k].ore} <small>· masz {fmt(s.uniq[k] ?? 0)}</small></span>
          </button>
        ))}
      </div>
      {keys.length === 0 && <p class="sub">Rudy unikalne dają niektórzy bossowie krain i Leża Bossów.</p>}
      <button class="btn" onClick={close}>Anuluj</button>
    </>
  );
}


/**
 * Powitanie nowego gracza: historia, zasady w czterech zdaniach i imię kowala, które jest też nickiem
 * (podpis na przedmiotach, nazwa nad bohaterem, ranking i czat). Z serwerem nick od razu trafia do rejestru;
 * zajęty albo niedozwolony — komunikat w oknie. Bez serwera (albo zanim powstało konto) imię zostaje w grze,
 * a pierwszy zapis na serwerze zajmie je, jeśli jest wolne.
 */
function IntroView({ game, close }: { game: Game; close: () => void }) {
  const [v, setV] = useState(() => (game.s.name !== DEFAULT_NAME ? game.s.name : suggestNick()));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e: Event) => {
    e.preventDefault();
    const n = tidyName(v);
    const bad = nickFormatProblem(n);
    if (bad) { setMsg(bad); return; }
    const link = getLink();
    if (!link || !game.net || n === game.s.name) { if (n !== game.s.name) game.setName(n); close(); return; }
    setBusy(true);
    try {
      game.applyServerName((await link.nameSet(n)).name);
    } catch (x) {
      // Nick zajęty, zastrzeżony albo z niedozwolonym słowem — gracz wybiera inny.
      if (x instanceof ServerError && !/Najpierw zapisz/.test(x.message)) { setMsg(x.message); setBusy(false); return; }
      game.setName(n); // konto jeszcze bez zapisu albo brak sieci: nick zajmie pierwszy zapis
    }
    setBusy(false);
    close();
  };
  return (
    <>
      <div class="eyebrow">Spalona Wioska</div>
      <div class="h">Kuźnia Legend</div>
      <p class="sub">Z kuźni zostały zgliszcza. Stary mistrz wciska ci w dłonie swój młot i worek rudy: „Teraz ty jesteś kowalem. Bohater wyrusza o świcie — nie pozwól mu iść z gołymi rękami”.</p>
      <ul class="list">
        <li>Bohater walczy sam. Ty przetapiasz rudy, które wypadają z wrogów, na ekwipunek.</li>
        <li>Lepsza ruda to rzadsze przedmioty, a kuźnia daje szansę na przeskok o rzadkość wyżej. Z każdym poziomem kuźni wyniki są coraz lepsze.</li>
        <li>Na początku masz tylko kuźnię i walkę — reszta odblokowuje się po kolei. Przy zablokowanych funkcjach zobaczysz kłódkę.</li>
        <li>Założone przedmioty zbierają Sławę Czynów i w końcu budzą się z własnym imieniem.</li>
      </ul>
      <form class="field intro-name" onSubmit={go}>
        <label for="intro-nick">Jak się nazywasz, kowalu?</label>
        <div class="chat-in">
          <input id="intro-nick" maxLength={NAME_MAX} value={v} autoComplete="off" autoCapitalize="words" spellcheck={false}
            onInput={e => { setV(e.currentTarget.value); setMsg(''); }} />
          <button type="button" class="btn small" disabled={busy} onClick={() => { setV(suggestNick()); setMsg(''); }} aria-label="Wylosuj inne imię">Losuj</button>
        </div>
        <small class={msg ? 'bad' : 'muted'}>{msg || 'To twój nick: podpis na wykutych przedmiotach, imię w rankingach i na czacie. Zmienisz go później w Kodeksie → Konto.'}</small>
        <button class="btn primary" disabled={busy}>{busy ? 'Chwila…' : 'Rozpal kuźnię'}</button>
      </form>
      {googleAvailable() && <GoogleRestore />}
    </>
  );
}
