// Zakładka Lochy: na górze Arena (z serwerem), potem dostępne lochy jako kafelki z kluczami
// i nagrodą, a na końcu te, które dopiero się odblokują. Szczegóły lochu — w oknie „i” (DungInfoView).
import { B, DUNGEONS, DUNGEON_FOES, DUNG_ORDER, ELEM, EVENT, EVENT_MILESTONES, KRYPTA_RULES, ORES, SETS, setOfLand, landDef } from '../../data';
import { dungeonBgUrl, elemUrl, foeUrl, frameAt, itemUrl, oreUrl, resUrl, setOreUrl } from '../../art/render';
import { LockIcon } from '../icons';
import { Banner } from '../Banner';
import { dungUnlockText, elementOfDay, kryptaRule, lezaBosses } from '../../engine/dungeon';
import { dungName, dungScene, eventFloorPts, eventIcon, eventOf, eventPts, eventReached, evText } from '../../engine/events';
import type { Game } from '../../engine/game';
import type { DungId } from '../../engine/types';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';

function best(game: Game, id: DungId): string {
  const b = game.s.dungeons[id].best;
  if (!b) return '—';
  switch (id) {
    case 'skarbiec': return `${fmt(b)} goblinów`;
    case 'oltarze': return `${b}/5`;
    case 'leza': return `${fmt(b)} zwycięstw`;
    case 'kopalnia': return `fala ${b}`;
    case 'labirynt': return `komnata ${b}`;
    case 'zbrojownia': return `skrzynie: ${b}`;
    case 'krypta': return `${b}/5`;
    default: return `piętro ${b}`;
  }
}

/** Główna nagroda lochu dziś: nazwa i ikona. */
function reward(game: Game, id: DungId): [string, string] {
  const now = game.ctx.now();
  switch (id) {
    case 'skarbiec': return ['Złoto', resUrl('zloto')];
    case 'sztolnia': return [ORES[game.dungTier()].n, oreUrl(game.dungTier())];
    case 'wieza': return ['Księgi Wiedzy', resUrl('ksiega')];
    case 'leza': { const l = lezaBosses(game.ctx); const set = l.length ? setOfLand(l[l.length - 1]) : null; return ['Rudy unikalne', set ? setOreUrl(set) : resUrl('pieczec')]; }
    case 'oltarze': { const el = elementOfDay(now); return [ELEM[el].n, elemUrl(el)]; }
    case 'kopalnia': return ['Kamienie', resUrl('kamien')];
    case 'labirynt': return ['Rudy i Księgi', resUrl('zwoj')];
    case 'zbrojownia': return ['Przedmioty', itemUrl('Miecz', 3, 3)];
    case 'krypta': return ['Pieczęcie', resUrl('pieczec')];
    case 'sezon': { const ev = eventOf(now); return [ev.def.cur, resUrl(eventIcon(ev.kind))]; }
  }
}

/** Wszystkie nagrody lochu z ikonami (okno „i”). */
export function rewardList(game: Game, id: DungId): [string, string][] {
  const now = game.ctx.now();
  switch (id) {
    case 'skarbiec': return [[resUrl('zloto'), 'Złoto — każdy kolejny goblin daje więcej']];
    case 'sztolnia': return [[oreUrl(game.dungTier()), `${ORES[game.dungTier()].n} — ruda o poziom lepsza niż w twojej krainie`]];
    case 'wieza': return [[resUrl('ksiega'), 'Księgi Wiedzy co 5 pięter'], [resUrl('zloto'), 'Złoto z każdego piętra']];
    case 'leza': return lezaBosses(game.ctx).map(land => { const set = setOfLand(land)!; return [setOreUrl(set), `${SETS[set].ore} — ${landDef(land).boss}`] as [string, string]; });
    case 'oltarze': { const el = elementOfDay(now); return [[elemUrl(el), `${ELEM[el].n} — żywioł dnia (${ELEM[el].el})`]]; }
    case 'kopalnia': return [[resUrl('kamien'), 'Kamienie z każdej fali'], [resUrl('siodlo'), 'Siodło za 10. falę (od aktu III)']];
    case 'labirynt': return [[oreUrl(Math.min(6, game.dungTier())), 'Rzadkie rudy'], [resUrl('ksiega'), 'Księgi Wiedzy'], [resUrl('zwoj'), 'Zwoje zaklęć']];
    case 'zbrojownia': return [[itemUrl('Miecz', 3, 3), 'Przedmioty z historią dawnych kowali (do decyzji)']];
    case 'krypta': return [[resUrl('pieczec'), 'Pieczęcie Legendy (+1000 Sławy Czynów)']];
    case 'sezon': {
      const ev = eventOf(now);
      return [
        [resUrl(eventIcon(ev.kind)), `${ev.def.cur} za każde piętro (od ${eventFloorPts(1)} do ${eventFloorPts(EVENT.FLOORS)}) — od razu, także gdy bohater padnie`],
        [resUrl('ksiega'), `Skrzynia za ${ev.def.boss}: Księgi, Kamienie, złoto i Zwój`],
      ];
    }
  }
}

/** Klucze jako ikonki: pełne — dostępne, przygaszone — zużyte dziś. */
export function Keys({ game, id }: { game: Game; id: DungId }) {
  const D = DUNGEONS[id];
  const keys = game.dungKeys(id);
  if (!Number.isFinite(keys)) return <span class="dkeys inf" aria-label="Bez limitu wejść">∞ bez limitu</span>;
  return (
    <span class="dkeys" aria-label={`Klucze: ${keys} z ${D.keys}`}>
      {Array.from({ length: D.keys }, (_, i) => <Px key={i} src={resUrl('klucz')} size={18} cls={i < keys ? '' : 'used'} />)}
    </span>
  );
}

/** Do północy (klucze odnawiają się o północy). */
export const untilMidnight = (now: number) => { const d = new Date(now); d.setHours(24, 0, 0, 0); return d.getTime() - now; };

/** Strażnik lochu na kafelku: kto tam czeka (w Leżu — boss ostatnio pokonanej krainy, w lochu sezonowym — boss wydarzenia). */
function guardian(game: Game, id: DungId): [string, string] {
  const s = game.s;
  switch (id) {
    case 'skarbiec': return ['Goblin z workiem', 'Bestie'];
    case 'sztolnia': return [DUNGEON_FOES[1], 'Bestie'];
    case 'wieza': return ['Strażnik piętra', 'Demony'];
    case 'leza': { const L = landDef(Math.max(0, Math.min(s.maxLand, 15) - 1)); return [L.boss, L.type]; }
    case 'oltarze': return [`Strażnik: ${ELEM[elementOfDay(game.ctx.now())].el}`, 'Demony'];
    case 'kopalnia': return ['Kryształowy golem', 'Bestie'];
    case 'labirynt': return ['Minotaur', 'Bestie'];
    case 'zbrojownia': return ['Duch dawnego kowala', 'Nieumarli'];
    case 'krypta': return ['Strażnik Krypty', 'Nieumarli'];
    case 'sezon': { const ev = eventOf(game.ctx.now()).def; return [ev.boss, ev.type]; }
  }
}

/** Ruszający się strażnik (dwie klatki), przy zablokowanym lochu — sama sylwetka. */
function Guardian({ game, id, locked = false }: { game: Game; id: DungId; locked?: boolean }) {
  const [name, type] = guardian(game, id);
  return <img class={`dt-foe${locked ? ' shadow' : ''}`} src={foeUrl(name, type, locked ? 0 : frameAt(game.ctx.now(), 520))} alt="" aria-hidden="true" />;
}

/** Zablokowany loch w siatce: wyblakły kafelek z sylwetką strażnika, kłódką i warunkiem. */
function LockedTile({ game, id, onInfo }: { game: Game; id: DungId; onInfo: (id: DungId) => void }) {
  const n = dungName(id, game.ctx.now());
  const [rn, ric] = reward(game, id);
  return (
    <button class="card dung tile locked" onClick={() => onInfo(id)} aria-label={`${n}: zablokowany — ${dungUnlockText(id)}`}
      style={{ '--bg': `url(${dungeonBgUrl(dungScene(id, game.ctx.now()))})` } as Record<string, string>}>
      <Guardian game={game} id={id} locked />
      <div class="dt-top"><span class="dt-reward"><Px src={ric} size={20} />{rn}</span><span class="dt-lock"><LockIcon /></span></div>
      <div class="dt-name">{n}</div>
      <div class="dt-meta dt-when">{dungUnlockText(id)}</div>
    </button>
  );
}

function DungTile({ game, id, onInfo }: { game: Game; id: DungId; onInfo: (id: DungId) => void }) {
  const D = { ...DUNGEONS[id], n: dungName(id, game.ctx.now()) };
  const keys = game.dungKeys(id);
  const unlimited = !Number.isFinite(keys);
  const run = game.b.mode === 'dung' ? game.b.dung : null;
  const here = run?.id === id;
  const blocked = run && !here ? 'Trwa inny loch' : !unlimited && keys < 1 ? 'Jutro' : '';
  const [rn, ric] = reward(game, id);
  const enter = () => { if (game.startDung(id)) window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  return (
    <section class={`card dung tile${here ? ' here' : ''}${blocked ? ' spent' : ''}${id === 'sezon' ? ' event' : ''}`} aria-label={D.n} style={{ '--bg': `url(${dungeonBgUrl(dungScene(id, game.ctx.now()))})` } as Record<string, string>}>
      <Guardian game={game} id={id} />
      <div class="dt-top">
        <span class="dt-reward"><Px src={ric} size={20} />{rn}</span>
        <button class="info" onClick={() => onInfo(id)} aria-label={`Szczegóły: ${D.n}`}>i</button>
      </div>
      <div class="dt-name">{D.n}</div>
      <div class="dt-row"><Keys game={game} id={id} /><span class="dt-meta">{id === 'leza' ? '' : 'rekord: '}{best(game, id)}</span></div>
      {here ? <div class="dt-here">Trwa — walka u góry</div>
        : id === 'leza' && !blocked ? <button class="btn primary small" onClick={() => onInfo(id)}>Wybierz bossa</button>
          : (
            <button class="btn primary small" disabled={!!blocked} onClick={enter}>
              {blocked || (unlimited ? `Piętro ${game.s.dungeons.wieza.best + 1}` : 'Wejdź')}
            </button>
          )}
    </section>
  );
}

/** Arena z innymi graczami — na samej górze zakładki, żeby była łatwa do znalezienia. */
function ArenaBanner({ game, online, onArena }: { game: Game; online: boolean; onArena: () => void }) {
  const open = game.s.maxLand >= B.ARENA_UNLOCK_LAND;
  return (
    <section class={`card arena-banner${open ? '' : ' locked'}`} aria-label="Arena" style={{ '--bg': `url(${dungeonBgUrl('arena')})` } as Record<string, string>}>
      <div class="ab-ic"><Px src={resUrl('moc')} size={36} /></div>
      <div class="ab-main">
        <div class="eyebrow">Gracz kontra gracz</div>
        <div class="ab-name">Arena</div>
        <div class="ab-sub">{open ? `${B.ARENA_FIGHTS} walk dziennie z kopiami bohaterów innych graczy · ligi tygodniowe, Żetony Areny i sklep` : `Odblokujesz po pokonaniu bossa krainy ${landDef(B.ARENA_UNLOCK_LAND - 1)?.n ?? landDef(0).n}`}</div>
      </div>
      {open && <button class="btn primary" disabled={!online} onClick={onArena} title={online ? undefined : 'Potrzebne połączenie z serwerem'}>{online ? 'Walcz' : 'Offline'}</button>}
    </section>
  );
}

export function DungeonPanel({ game, online = false, onArena, onInfo, onEvent }: { game: Game; online?: boolean; onArena?: () => void; onInfo: (id: DungId) => void; onEvent: () => void }) {
  const arena = game.net && !!onArena;
  const open = DUNG_ORDER.filter(id => game.dungUnlocked(id));
  const locked = DUNG_ORDER.filter(id => !game.dungUnlocked(id));
  return (
    <>
      {arena && <ArenaBanner game={game} online={online} onArena={onArena!} />}
      <EventBanner game={game} onOpen={onEvent} />
      <section class="card dung-headc">
        <Banner bg={dungeonBgUrl('sztolnia')} icon={<Px src={resUrl('klucz')} size={32} />} eyebrow={`Lochy · otwarte ${open.length}/${DUNG_ORDER.length}`} title="Wyprawy po łupy" />
        <p class="sub dh-line">
          {open.length === 0 ? 'Pierwszy loch otworzy się po pokonaniu bossa pierwszej krainy.'
            : <><Px src={resUrl('klucz')} size={16} />Nowe klucze za {tfmt(untilMidnight(game.ctx.now()))} · rekordy i nagrody pod „i”</>}
        </p>
      </section>
      <div class="dgrid">
        {open.map(id => <DungTile key={id} game={game} id={id} onInfo={onInfo} />)}
        {locked.map(id => <LockedTile key={id} game={game} id={id} onInfo={onInfo} />)}
      </div>
    </>
  );
}

/** Okno „i” lochu: opis, nagrody z ikonami, klucze, rekord i wejście (w Leżu — wybór bossa). */
export function DungInfoView({ game, id, close }: { game: Game; id: DungId; close: () => void }) {
  const D = { ...DUNGEONS[id], n: dungName(id, game.ctx.now()) };
  const unlocked = game.dungUnlocked(id);
  const keys = game.dungKeys(id);
  const unlimited = !Number.isFinite(keys);
  const run = game.b.mode === 'dung' ? game.b.dung : null;
  const blocked = run ? (run.id === id ? 'Trwa — walka u góry' : 'Trwa inny loch') : !unlimited && keys < 1 ? 'Klucze wrócą o północy' : '';
  const enter = (land?: number) => { if (game.startDung(id, land)) { close(); window.scrollTo?.({ top: 0, behavior: 'smooth' }); } };
  return (
    <>
      <div class="li-head" style={{ '--bg': `url(${dungeonBgUrl(dungScene(id, game.ctx.now()))})` } as Record<string, string>}>
        <div class="eyebrow">Loch{unlocked ? '' : ' · zablokowany'}</div>
        <div class="h">{D.n}</div>
      </div>
      <p class="sub">{D.how}</p>
      {id === 'sezon' && <p class="sub"><b>{eventOf(game.ctx.now()).def.n}:</b> wrogowie to {eventOf(game.ctx.now()).def.foes.join(', ')}; na 10. piętrze — {eventOf(game.ctx.now()).def.boss}.</p>}
      {id === 'krypta' && unlocked && <p class="sub"><b>W tym tygodniu:</b> {KRYPTA_RULES[kryptaRule(game.ctx.now())].d}.</p>}
      <div class="eyebrow">Nagrody</div>
      <ul class="droplist">
        {rewardList(game, id).map(([ic, t]) => <li key={t}><Px src={ic} size={24} /><span>{t}</span></li>)}
      </ul>
      <div class="di-stats">
        <div class="stat"><small>Klucze</small><b>{unlocked ? <Keys game={game} id={id} /> : `${D.keys || '∞'} dziennie`}</b></div>
        <div class="stat"><small>{id === 'leza' ? 'Zwycięstwa' : 'Rekord'}</small><b>{best(game, id)}</b></div>
      </div>
      {!unlocked ? <div class="lockline">Odblokujesz {dungUnlockText(id)}.</div>
        : blocked ? <div class="lockline">{blocked}</div>
          : id === 'leza' ? (
            <>
              <div class="eyebrow">Wybierz bossa</div>
              <div class="mix">
                {lezaBosses(game.ctx).map(land => {
                  const set = setOfLand(land)!;
                  return (
                    <button key={land} class="chip" onClick={() => enter(land)}>
                      <Px src={setOreUrl(set)} size={16} />{landDef(land).boss} → <span style={{ color: SETS[set].col }}>{SETS[set].ore}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <button class="btn primary" onClick={() => enter()}>{unlimited ? `Wejdź na piętro ${game.s.dungeons.wieza.best + 1}` : 'Wejdź'}</button>}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}

/** Wydarzenie na górze zakładki Lochy: nazwa, czas do końca, punkty i postęp do następnej nagrody. */
function EventBanner({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const now = game.ctx.now();
  const ev = eventOf(now);
  const e = game.event();
  const pts = eventPts(e);
  const reached = eventReached(e);
  const todo = game.eventTodo();
  const next = EVENT_MILESTONES[reached];
  const prev = reached ? EVENT_MILESTONES[reached - 1].pts : 0;
  const pct = next ? Math.min(100, ((pts - prev) / (next.pts - prev)) * 100) : 100;
  return (
    <section class={`card arena-banner ev-banner ev-${ev.kind}${todo ? ' ready' : ''}`} aria-label={`Wydarzenie: ${ev.def.n}`} style={{ '--bg': `url(${dungeonBgUrl('ev_' + ev.kind)})` } as Record<string, string>}>
      <div class="ab-ic"><Px src={resUrl(eventIcon(ev.kind))} size={36} /></div>
      <div class="ab-main">
        <div class="eyebrow">Wydarzenie · jeszcze <span class="nw">{tfmt(ev.end - now)}</span></div>
        <div class="ab-name">{ev.def.n}</div>
        <div class="ab-sub"><b class="num">{evText(pts, ev.def)}</b>{next ? ` · następna nagroda: ${fmt(next.pts)}` : ' · wszystkie nagrody zdobyte'}</div>
        <div class="bar ev-bar"><i style={{ width: pct + '%' }} /></div>
      </div>
      <button class={`btn${todo ? ' primary' : ''}`} onClick={onOpen}>{todo ? `Odbierz (${todo})` : 'Nagrody'}</button>
    </section>
  );
}
