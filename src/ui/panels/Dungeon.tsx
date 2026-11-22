// Zakładka Lochy: pasek kluczy, dostępne lochy jako szerokie karty (jak Krainy) z nagrodą, kluczami i rekordem,
// a na końcu krótka lista tych, które dopiero się odblokują. Szczegóły lochu — w oknie „i” (DungInfoView).
// Wydarzenie i sezon są nad zakładkami Przygody (Adventure.tsx), Arena — w osobnej zakładce (Pvp.tsx).
import { DUNGEONS, DUNGEON_FOES, DUNG_ORDER, ELEM, EVENT, KRYPTA_RULES, ORES, SETS, setOfLand, landDef } from '../../data';
import { dungeonBgUrl, elemUrl, foeUrl, frameAt, itemUrl, oreUrl, resUrl, setOreUrl } from '../../art/render';
import { LockIcon } from '../icons';
import { dungUnlockText, elementOfDay, kryptaRule, lezaBosses } from '../../engine/dungeon';
import { dungName, dungScene, eventFloorPts, eventIcon, eventOf } from '../../engine/events';
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

/** Loch jako szeroka karta z tłem (jak kraina): nazwa, nagroda, klucze, rekord i wejście; strażnik po prawej. */
function DungCard({ game, id, onInfo }: { game: Game; id: DungId; onInfo: (id: DungId) => void }) {
  const D = { ...DUNGEONS[id], n: dungName(id, game.ctx.now()) };
  const keys = game.dungKeys(id);
  const unlimited = !Number.isFinite(keys);
  const run = game.b.mode === 'dung' ? game.b.dung : null;
  const here = run?.id === id;
  const blocked = run && !here ? 'Trwa inny loch' : !unlimited && keys < 1 ? 'Klucze jutro' : '';
  const [rn, ric] = reward(game, id);
  const enter = () => { if (game.startDung(id)) window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  return (
    <div class={`landcard dungcard${here ? ' cur' : ''}${blocked ? ' spent' : ''}${id === 'sezon' ? ' event' : ''}`} style={{ '--bg': `url(${dungeonBgUrl(dungScene(id, game.ctx.now()))})` } as Record<string, string>}>
      <Guardian game={game} id={id} />
      <button class="info corner" onClick={() => onInfo(id)} aria-label={`Szczegóły: ${D.n}`}>i</button>
      <div class="lc-top">
        <div class="lc-name"><span class="ln">{D.n}</span>{here && <span class="lstat front">Trwa</span>}</div>
      </div>
      <div class="dc-reward"><Px src={ric} size={22} /><span><small>Nagroda</small><b>{rn}</b></span></div>
      <div class="lc-bot">
        <div class="lc-info dc-info">
          <Keys game={game} id={id} />
          <span class="dc-best">{id === 'leza' ? 'zwycięstwa' : 'rekord'}: <b>{best(game, id)}</b></span>
        </div>
        {here ? <span class="lc-here">Walka u góry</span>
          : id === 'leza' && !blocked ? <button class="btn small primary" onClick={() => onInfo(id)}>Wybierz bossa</button>
            : blocked ? <span class="lc-lock">{blocked}</span>
              : <button class="btn small primary" onClick={enter}>{unlimited ? `Piętro ${game.s.dungeons.wieza.best + 1}` : 'Wejdź'}</button>}
      </div>
    </div>
  );
}

/** Lochy jeszcze zamknięte: krótkie wiersze z warunkiem (dotknięcie — szczegóły). */
function LockedList({ game, ids, onInfo }: { game: Game; ids: DungId[]; onInfo: (id: DungId) => void }) {
  if (!ids.length) return null;
  return (
    <section class="card dlock2">
      <div class="eyebrow">Jeszcze zamknięte · {ids.length}</div>
      <ul>
        {ids.map(id => {
          const [rn, ric] = reward(game, id);
          return (
            <li key={id}>
              <button onClick={() => onInfo(id)}>
                <span class="dl-ic"><LockIcon /></span>
                <span class="dl-t"><b>{dungName(id, game.ctx.now())}</b><small>{dungUnlockText(id)}</small></span>
                <span class="dl-r"><Px src={ric} size={16} />{rn}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DungeonPanel({ game, onInfo }: { game: Game; onInfo: (id: DungId) => void }) {
  const openIds = DUNG_ORDER.filter(id => game.dungUnlocked(id));
  const lockedIds = DUNG_ORDER.filter(id => !game.dungUnlocked(id));
  return (
    <>
      <section class="card dstrip">
        <Px src={resUrl('klucz')} size={22} />
        <span>{openIds.length === 0 ? 'Pierwszy loch otworzy się po pokonaniu bossa pierwszej krainy.'
          : <>Nowe klucze za <b>{tfmt(untilMidnight(game.ctx.now()))}</b> · otwarte {openIds.length}/{DUNG_ORDER.length}</>}</span>
      </section>
      {openIds.map(id => <DungCard key={id} game={game} id={id} onInfo={onInfo} />)}
      <LockedList game={game} ids={lockedIds} onInfo={onInfo} />
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
