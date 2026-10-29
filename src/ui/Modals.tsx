import type { ComponentChildren, JSX } from 'preact';
import {
  B, ELEM, ELEM_KEYS, EVENT, FORGE_UNLOCKS, SET_IDS, LAB_BLESSINGS, LAB_DOORS, LAB_ROOMS, LANDS, MOUNTS, ORES, PETS, RAR, ROMAN, SEAL_FAME, SETS, SET_FORGE_LVL,
  MOUNTS_UNLOCK_LAND, PETS_UNLOCK_LAND, SKILLS, SKILL_MAX, STARS_MAX, TECH, TECH_UNLOCK_FORGE, oreShares, setOfLand, skillValue,
} from '../data';
import type { MountId, PetId, SkillId } from '../engine/types';
import { JUMP_TO_MULT, baseName, dist, gOf, goldWave, itemName, jumpChances, recPower } from '../engine/formulas';
import { allMods } from '../engine/mods';
import { upgradeCost, upgradeTime } from '../engine/forge';
import type { Game } from '../engine/game';
import { techMods } from '../engine/mods';
import type { ModalData } from '../engine/types';
import { dungName, eventOf, evText } from '../engine/events';
import { ItemCard } from './ItemCard';
import { DecisionView } from './Decision';
import { Px } from './Px';
import { elemUrl, landBgUrl, oreUrl, resUrl, setOreUrl, skillUrl, techUrl } from '../art/render';
import { hasProof } from '../engine/verify';
import { f1, fmt, pct, pctS, tfmt } from './format';
import { OddsBar } from './panels/Forge';
import { books, rewardText } from './texts';
import { MissionsView } from './panels/Missions';
import { AdOfferView, ShopView } from './panels/Shop';
import { LegacyView } from './panels/Legacy';
import { Reforge } from './panels/Runes';
import { RankingView } from './panels/Ranking';
import { ArenaView } from './panels/Pvp';
import { EventView } from './panels/Event';
import { LookView } from './panels/Look';
import { DungInfoView } from './panels/Dungeon';
import { FeedbackView } from './panels/Feedback';
import { ChatView } from './panels/Chat';
import type { Tab } from './icons';

export function ModalShell({ locked, onClose, children }: { locked: boolean; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="modal" onClick={e => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div class="modal-box" role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

const Close = ({ onClose, label }: { onClose: () => void; label: string }) => <button class="btn primary" onClick={onClose}>{label}</button>;

export function ModalView({ m, game, close, goTab }: { m: ModalData; game: Game; close: () => void; goTab?: (t: Tab) => void }): JSX.Element {
  const s = game.s;
  switch (m.kind) {
    case 'intro':
      return (
        <>
          <div class="eyebrow">Spalona Wioska</div>
          <div class="h">Kuźnia Legend</div>
          <p class="sub">Z kuźni zostały zgliszcza. Stary mistrz wciska ci w dłonie swój młot i trzy sztaby żelaza: „Teraz ty jesteś kowalem. Bohater wyrusza o świcie — nie pozwól mu iść z gołymi rękami”.</p>
          <ul class="list">
            <li>Bohater walczy sam. Ty przetapiasz rudy, które wypadają z wrogów, na ekwipunek.</li>
            <li>Każda ruda gwarantuje minimalną rzadkość, a kuźnia daje szansę na przeskok wyżej.</li>
            <li>Założone przedmioty zbierają Sławę Czynów i w końcu budzą się z własnym imieniem.</li>
          </ul>
          <Close onClose={close} label="Rozpal kuźnię" />
        </>
      );
    case 'boss': {
      const L = LANDS[m.land];
      const next = m.land < LANDS.length - 1 ? LANDS[m.land + 1] : null;
      const set = setOfLand(m.land);
      return (
        <>
          <div class="eyebrow">Boss pokonany</div>
          <div class="h">{L.boss}</div>
          <p class="sub">
            Łup: {fmt(m.gold)} złota, {m.n} × {ORES[L.rare].n}, {books(m.books)}
            {set && m.uniq ? <>, {m.uniq} × <b style={{ color: SETS[set].col }}>{SETS[set].ore}</b></> : null}.
            {m.found ? ' Ze skrzyni bossa wypadł przedmiot z Wielkiego Obiegu — sprawdź go w Kuźni.' : ''}
          </p>
          {Object.keys(m.extra).length > 0 && <p class="sub">Do tego: <b>{rewardText(m.extra)}</b>.</p>}
          {set && m.uniq > 0 && (
            <p class="sub">{SETS[set].ore} to ruda unikalna: od {SET_FORGE_LVL}. poziomu kuźni wytopisz z niej część zestawu <b>{SETS[set].n}</b>. Więcej dają Leża Bossów.</p>
          )}
          {next
            ? <p>Odblokowana kraina: <b>{next.n}</b> (Akt {ROMAN[next.act]}). Rudy: {next.drops.map(([o, p]) => `${ORES[o].n} ${pctS(p)}`).join(' · ')}.</p>
            : <p>Pokonałeś ostatniego bossa. Gwiezdny Krater możesz farmić dalej.</p>}
          <Close onClose={close} label="Dalej" />
        </>
      );
    }
    case 'awaken':
      return (
        <>
          <div class="eyebrow">Przebudzenie</div>
          <div class="h">{m.item.aw?.name}</div>
          <p class="sub">{baseName(m.item)} zebrał 20 000 Sławy Czynów i przebudził się. Od teraz nosi własne imię.</p>
          <ItemCard it={m.item} />
          <Close onClose={close} label="Dalej" />
        </>
      );
    case 'dungChoice':
      return (
        <>
          <div class="eyebrow">Głęboka Sztolnia · piętro {m.floor}</div>
          <div class="h">Wyjść czy kopać dalej?</div>
          <p class="sub">W worku: <b>{rewardText(m.loot)}</b>. Jeśli zginiesz niżej, stracisz połowę łupu.</p>
          <div class="result-actions">
            <button class="btn" onClick={() => { close(); game.dungExit(); }}>Wyjdź z łupem</button>
            <button class="btn primary" onClick={() => { close(); game.dungGo(); }}>Schodź dalej</button>
          </div>
        </>
      );
    case 'dungEnd': {
      const halves = m.id === 'sztolnia' || m.id === 'oltarze';
      const head = m.id === 'skarbiec' ? 'Czas minął' : m.id === 'wieza' ? (m.lost ? 'Strażnik cię zatrzymał' : 'Zejście z wieży') : m.lost ? 'Bohater padł' : 'Zwycięstwo';
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
            {m.id === 'leza' && m.lost ? 'Boss był za silny. Klucz przepadł — spróbuj jutro albo wzmocnij ekwipunek.' : <>Zdobyto: <b>{rewardText(m.reward)}</b>.</>}
            {m.items > 0 ? ` Przedmioty ze skrzyń: ${m.items} — zdecyduj, które założyć.` : ''}
            {m.id === 'sezon' ? <> Wydarzenie {ev.n}: <b>+{evText(m.evp ?? 0, ev)}</b>.</> : null}
          </p>
          <Close onClose={close} label="Wróć do krainy" />
        </>
      );
    }
    case 'offline': {
      const r = m.report;
      const L = LANDS[r.land];
      return (
        <>
          <div class="eyebrow">Byłeś poza grą {tfmt(r.ms)}{r.capped ? ` (limit ${tfmt(B.OFFLINE_CAP_MS + techMods(s).offlineMin * 60000)})` : ''}</div>
          <div class="h">Witaj z powrotem</div>
          <p class="sub">Bohater walczył w krainie {L.n} z wydajnością {Math.round(B.OFFLINE_EFFICIENCY * 100)}% (ruda: {Math.round(B.OFFLINE_EFFICIENCY * B.OFFLINE_ORE * 100)}% zwykłego dropu).</p>
          <ul class="list">
            <li>{fmt(r.gold)} złota</li>
            <li>{(r.ores ?? []).map((n, o) => (n ? `${fmt(n)} × ${ORES[o].n}` : '')).filter(Boolean).join(', ') || 'bez rudy'}{r.el && L.el ? `, ${r.el} × ${ELEM[L.el].n}` : ''}</li>
            {r.books > 0 && <li>{books(r.books)}</li>}
            <li>+{fmt(r.fame)} Sławy Czynów dla każdego założonego przedmiotu</li>
            {r.forgeUp > 0 && <li>Kuźnia osiągnęła poziom {r.forgeUp}.</li>}
            {r.tech && <li>Zbadano: {TECH[r.tech].n} (poziom {s.tech.lv[r.tech] ?? 1}).</li>}
            {r.hatched && <li>Z jaja wykluł się chowaniec: {PETS[r.hatched].n}.</li>}
          </ul>
          {r.chestCount > 0 && (
            <>
              <div class="eyebrow">Skrzynia nocnej zmiany · {r.chestCount} wytopów</div>
              <ul class="list">{r.chest.map(x => <li key={x.item.id} class={`rt${x.item.r}`}>{itemName(x.item)} · {RAR[x.item.r].n} — {x.stop ? 'wybrana rzadkość! czeka na twoją decyzję' : x.equipped ? 'założony' : 'sprzedany'}</li>)}</ul>
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
          {Object.keys(m.loot).length > 0 && <p class="sub">Zebrane: {rewardText(m.loot)}</p>}
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
    case 'event':
      return <EventView game={game} close={close} onDung={() => { close(); goTab?.('lochy'); }} />;
    case 'shop':
      return <ShopView game={game} initial={m.tab} close={close} />;
    case 'adOffer':
      return <AdOfferView game={game} what={m.what} close={close} />;
    case 'legacy':
      return <LegacyView game={game} close={close} />;
    case 'chat':
      return <ChatView game={game} initial={m.ch} close={close} goClan={() => { close(); goTab?.('klan'); }} />;
    case 'draw':
      return <DrawView m={m} close={close} />;
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
      return m.k === 'level' ? <LevelInfo game={game} close={close} /> : <ForgeInfo game={game} close={close} />;
  }
}

/** Liczba z przecinkiem dziesiętnym (0,55). */
const f2 = (v: number) => String(v).replace('.', ',');

/** Okno „Jak działa wytop”: trzy kroki, szanse każdej rudy na pasku i krótkie karty z zasadami. */
function ForgeInfo({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const rel = techMods(s).jumpRel;
  const sel = s.oreSel;
  const tips: [string, string, JSX.Element][] = [
    [resUrl('czas'), 'Gwarancja przeskoku', <>Po {B.PITY_MAX} wytopach bez przeskoku następny przeskakuje na pewno o 1 (ale nie na Boski). Twój licznik: <b>{s.pity}/{B.PITY_MAX}</b>.</>],
    [resUrl('kowadlo'), 'Rzadsze — trudniej', <>Przeskok na Legendarny ma ×{f2(JUMP_TO_MULT[4])} szansy bazowej, na Mityczny ×{f2(JUMP_TO_MULT[5])}, a na Boski ×{f2(JUMP_TO_MULT[6])}. Paski wyżej już to uwzględniają.</>],
    [elemUrl('zar'), `Domieszki · od ${B.ELEM_FORGE_LVL}. poziomu`, <>Nadają przedmiotowi żywioł i dodatkowy efekt. Nie zmieniają szans.</>],
    [setOreUrl('lowca'), `Rudy unikalne · od ${SET_FORGE_LVL}. poziomu`, <>Robią z przedmiotu część zestawu (premie za 2 i 4 części) i dają pewny przeskok o co najmniej 1.</>],
    [techUrl('k_hart'), `Hartowanie · od ${TECH_UNLOCK_FORGE}. poziomu`, <>Badanie w Nauce mnoży szanse na przeskok.{rel ? <> Twoja premia: <b>+{pct(rel)}</b>, już w paskach.</> : ''}</>],
    [resUrl('zloto'), 'Sprzedaż', <>Niepotrzebny przedmiot sprzedajesz za złoto. Rzadkie i lepsze mogą trafić do Wielkiego Obiegu.</>],
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
      <div class="fi-sec">Szanse na twoim poziomie kuźni</div>
      <ul class="fi-odds">
        {ORES.map((o, i) => {
          const off = s.forge.lvl < o.lvl;
          return (
            <li key={o.n} class={`${i === sel ? 'sel' : ''}${off ? ' off' : ''}`}>
              <Px src={oreUrl(i)} size={28} />
              <div class="fi-o">
                <div class="fi-on"><b>{o.n}</b><small>min. <span class={`rt${o.floor}`}>{RAR[o.floor].n}</span>{off ? ` · od ${o.lvl}. poziomu` : ''}</small></div>
                <OddsBar d={dist(i, Math.max(s.forge.lvl, o.lvl), rel)} cls="compact" />
              </div>
            </li>
          );
        })}
      </ul>
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
function DrawView({ m, close }: { m: Extract<ModalData, { kind: 'draw' }>; close: () => void }) {
  const skill = m.what === 'skill' ? SKILLS[m.id as SkillId] : null;
  const def = skill ?? (m.what === 'pet' ? PETS[m.id as PetId] : MOUNTS[m.id as MountId]);
  const r = def.r;
  const icon = m.what === 'skill' ? skillUrl(m.id) : m.what === 'pet' ? resUrl('jajo' + Math.min(4, r)) : resUrl('siodlo');
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
    <div class={`dec draw r${r}`}>
      <div class="eyebrow">{head}</div>
      <div class="dec-drop" aria-hidden="true">
        <span class="dec-burst" />
        <Px src={icon} size={72} cls="dec-ico" />
      </div>
      <div class="dec-title">
        <div class="dec-name">{def.n}</div>
        <div class="irar">{what} · {RAR[r].n}</div>
      </div>
      {change}
      {skill && <p class="sub draw-eff">{skill.d.replace('{v}', to > from && from > 0 ? `${f1(skillValue(m.id as SkillId, from))} → ${f1(skillValue(m.id as SkillId, to))}` : f1(skillValue(m.id as SkillId, Math.max(1, to))))}</p>}
      {m.what === 'pet' && <p class="sub draw-eff">{PETS[m.id as PetId].d.replace('{v}', String(PETS[m.id as PetId].tv))}</p>}
      {m.what === 'mount' && <p class="sub draw-eff">Bazowo: +{MOUNTS[m.id as MountId].dmg}% obrażeń, +{MOUNTS[m.id as MountId].hp}% zdrowia</p>}
      <Close onClose={close} label="Dalej" />
    </div>
  );
}

/** Co wypada w krainie: z fal i z bossa (przycisk „i” na polu walki). */
function LandInfoView({ game, land, close }: { game: Game; land: number; close: () => void }) {
  const s = game.s;
  const L = LANDS[land];
  const mods = techMods(s);
  const shares = oreShares(L, allMods(s).rarePct);
  const set = setOfLand(land);
  const wave = goldWave(gOf(land, 5));
  const first = !s.cleared[land];
  const act = L.act;
  return (
    <>
      <div class="li-head" style={{ '--bg': `url(${landBgUrl(land)})` } as Record<string, string>}>
        <div class="eyebrow">Akt {ROMAN[act]} · kraina {land + 1}</div>
        <div class="h">{L.n}</div>
      </div>
      <div class="eyebrow">Z każdej fali</div>
      <ul class="droplist">
        <li><Px src={resUrl('zloto')} size={24} /><span>Złoto</span><b>ok. {fmt(wave)} na falę</b></li>
        <li class="dl-sub"><span>Ruda — z {pct(B.ORE_DROP * 100)} fal (główna 1–{B.ORE_MAIN_MAX} sztuki, rzadsze po 1):</span></li>
        {shares.map(([o, p]) => (
          <li key={o} class={o > L.main ? 'rare' : ''}>
            <Px src={oreUrl(o)} size={24} /><span>{ORES[o].n}{o === L.main ? ' · główna' : o > L.main ? ' · rzadka' : ''}</span><b>{pctS(p)} dropów</b>
          </li>
        ))}
        {L.el && <li><Px src={elemUrl(L.el)} size={24} /><span>Domieszka: {ELEM[L.el].n}</span><b>{pct(B.ELEM_DROP * 100)} fal</b></li>}
        <li><Px src={resUrl('ksiega')} size={24} /><span>Księga Wiedzy</span><b>{pctS(B.BOOK_DROP * 100)} fal</b></li>
        <li><Px src={resUrl('zwoj')} size={24} /><span>Zwój zaklęć</span><b>{pctS(B.SCROLL_DROP * 100)} fal</b></li>
      </ul>
      <div class="eyebrow">Boss: {L.boss}{first ? ' · pierwsze pokonanie' : ''}</div>
      <ul class="droplist">
        <li><Px src={resUrl('zloto')} size={24} /><span>Złoto</span><b>ok. {fmt(goldWave(gOf(land, B.STAGES_PER_LAND)) * 10)}</b></li>
        <li><Px src={oreUrl(L.rare)} size={24} /><span>{ORES[L.rare].n}</span><b>2–4 sztuki</b></li>
        <li><Px src={resUrl('ksiega')} size={24} /><span>Księgi Wiedzy</span><b>{first ? `${B.BOOKS_BOSS_FIRST + land} (pierwsze)` : `1 · ${pct(B.BOOKS_BOSS_CHANCE * 100)}`}</b></li>
        <li><Px src={resUrl('zwoj')} size={24} /><span>Zwoje zaklęć</span><b>{first ? `${B.SCROLLS_BOSS_FIRST + act} (pierwsze)` : `1 · ${pct(B.SCROLL_BOSS_CHANCE * 100)}`}</b></li>
        {set && <li><Px src={setOreUrl(set)} size={24} /><span style={{ color: SETS[set].col }}>{SETS[set].ore}</span><b>{first ? `${B.UNIQ_BOSS_FIRST} (pierwsze)` : `1 · ${pct(B.UNIQ_BOSS_CHANCE * 100)}`}</b></li>}
        {land >= PETS_UNLOCK_LAND - 1 && <li><Px src={resUrl('jajo' + Math.max(0, Math.min(4, Math.floor((land - 3) / 3))))} size={24} /><span>Jajo chowańca</span><b>{first ? 'pewne' : pct(B.EGG_BOSS_CHANCE * 100)}</b></li>}
        {land >= MOUNTS_UNLOCK_LAND - 1 && <li><Px src={resUrl('siodlo')} size={24} /><span>Siodło</span><b>{first ? `${B.SADDLES_BOSS_FIRST} (pierwsze)` : pct(B.SADDLE_BOSS_CHANCE * 100)}</b></li>}
        <li><span class="li-chest" aria-hidden="true">✦</span><span>Przedmiot z Wielkiego Obiegu (do decyzji)</span><b>{pct(B.OBIEG_FIND_FROM_BOSS * 100)}</b></li>
      </ul>
      <p class="sub">Zalecana Moc krainy: <b>{fmt(recPower(land))}</b> (twoja: {fmt(game.stats.power)}).{mods.rarePct ? ` Premia do rzadkich rud (+${pct(mods.rarePct)}) jest już wliczona.` : ''}</p>
      <Close onClose={close} label="Zamknij" />
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
        <p class="sub">Domieszka nadaje przedmiotowi żywioł i dodatkowy efekt. Każdy wytop zużywa jedną sztukę. Nie zmienia szans na rzadkość.</p>
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
      <div class="h">Część zestawu?</div>
      <p class="sub">Ruda unikalna robi z wytopu część zestawu w miejscu, w którym jeszcze go nie nosisz, z pewnym przeskokiem o co najmniej 1 rzadkość. Każdy wytop zużywa jedną sztukę.</p>
      <div class="mixlist">
        <button class={`mixopt${!s.uniqSel ? ' on' : ''}`} onClick={() => pick(() => game.setUniq(null))}><span class="mx-n">Bez zestawu</span></button>
        {keys.map(k => (
          <button key={k} class={`mixopt${s.uniqSel === k ? ' on' : ''}`} onClick={() => pick(() => game.setUniq(k))}>
            <Px src={setOreUrl(k)} size={32} />
            <span class="mx-n" style={{ color: SETS[k].col }}>{SETS[k].ore} <small>· masz {fmt(s.uniq[k] ?? 0)}</small></span>
            <small class="mx-d">{SETS[k].n}: 2 części — {SETS[k].d2}; 4 części — {SETS[k].d4}</small>
          </button>
        ))}
      </div>
      {keys.length === 0 && <p class="sub">Rudy unikalne dają bossowie krain z zestawem i Leża Bossów.</p>}
      <button class="btn" onClick={close}>Anuluj</button>
    </>
  );
}

function LevelInfo({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const lvl = s.forge.lvl;
  const rel = techMods(s).jumpRel;
  const rows = Array.from({ length: B.FORGE_MAX }, (_, i) => i + 1);
  return (
    <>
      <div class="eyebrow">Kuźnia · poziom {lvl}</div>
      <div class="h">Co daje poziom kuźni</div>
      <p class="sub">Każdy poziom podnosi szansę, że wytop przeskoczy ponad minimalną rzadkość rudy, i co kilka poziomów otwiera wytop szlachetniejszej rudy. Wyższa kuźnia to też wyższy poziom przedmiotów (2 poziomy przedmiotu na poziom kuźni, każdy +8% statystyki głównej). Kuźnia działa normalnie w trakcie ulepszania.</p>
      <div class="otable-wrap lvltable">
        <table class="otable">
          <thead><tr><th>Poz.</th><th>Przeskok</th><th>Zmiana</th><th>Ulepszenie</th></tr></thead>
          <tbody>
            {rows.map(l => {
              const [p1, p2] = jumpChances(l, rel);
              const [q1, q2] = l > 1 ? jumpChances(l - 1, rel) : [p1, p2];
              return (
                <tr key={l} class={l === lvl ? 'sel' : l < lvl ? 'done' : ''}>
                  <td class="oname">{l}{l === lvl ? ' ◀' : ''}{(l === 1 || FORGE_UNLOCKS[l]) && <small class="unl">{ORES.map((o, i) => (o.lvl === l ? <Px key={i} src={oreUrl(i)} size={16} /> : null))}{l === 1 ? 'Miedź, Żelazo' : FORGE_UNLOCKS[l]}</small>}</td>
                  <td>{pct(p1 + p2)}<small class="muted"> ({pct(p2)} o 2)</small></td>
                  <td class="up">{l > 1 ? '+' + pct(p1 + p2 - q1 - q2) : '—'}</td>
                  <td>{l === 1 ? '—' : <>{tfmt(upgradeTime(s, l))}<br /><small class="muted">{fmt(upgradeCost(s, l))} zł</small></>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="sub">„Przeskok” to bazowa szansa na rzadkość wyższą niż minimum rudy (w nawiasie: o dwie) — tyle ma przeskok do Epickiego. Przeskok na Legendarny ma ×{f2(JUMP_TO_MULT[4])} tej szansy, na Mityczny ×{f2(JUMP_TO_MULT[5])}, na Boski ×{f2(JUMP_TO_MULT[6])}. {rel ? `Wliczona premia Hartowania: +${pct(rel)} względnie.` : ''}</p>
      <Close onClose={close} label="Rozumiem" />
    </>
  );
}
