// Zakładka Lochy: osobno Lochy (zwarte kafelki z tłem i ikoną nagrody) i Arena (z serwerem).
import { useState } from 'preact/hooks';
import { B, DUNGEONS, DUNG_ORDER, DUNG_SOON, ELEM, KRYPTA_RULES, LANDS, ORES, SETS, setOfLand } from '../../data';
import { dungeonBgUrl, elemUrl, itemUrl, oreUrl, resUrl, setOreUrl } from '../../art/render';
import { elementOfDay, kryptaRule, lezaBosses } from '../../engine/dungeon';
import type { Game } from '../../engine/game';
import type { DungId } from '../../engine/types';
import { fmt } from '../format';
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

/** Nagroda lochu dziś: nazwa i ikona. */
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
  }
}

function DungTile({ game, id, open, setOpen }: { game: Game; id: DungId; open: boolean; setOpen: (id: DungId | null) => void }) {
  const D = DUNGEONS[id];
  const unlocked = game.dungUnlocked(id);
  const keys = game.dungKeys(id);
  const unlimited = !Number.isFinite(keys);
  const run = game.b.mode === 'dung' ? game.b.dung : null;
  const here = run?.id === id;
  const blocked = run && !here ? 'Trwa inny loch' : !unlimited && keys < 1 ? 'Jutro' : '';
  const [rn, ric] = reward(game, id);
  const enter = (land?: number) => { if (game.startDung(id, land)) window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  return (
    <section class={`card dung tile${unlocked ? '' : ' locked'}${open ? ' wide' : ''}${here ? ' here' : ''}`} aria-label={D.n} style={{ '--bg': `url(${dungeonBgUrl(id)})` } as Record<string, string>}>
      <div class="dt-top">
        <span class="dt-reward"><Px src={ric} size={20} />{rn}</span>
        <button class="info" aria-expanded={open} onClick={() => setOpen(open ? null : id)} aria-label={`Opis: ${D.n}`}>i</button>
      </div>
      <div class="dt-name">{D.n}</div>
      {unlocked ? (
        <div class="dt-meta">{unlimited ? 'bez limitu' : `klucze ${keys}/${D.keys}`} · {id === 'leza' ? '' : 'rekord: '}{best(game, id)}</div>
      ) : <div class="dt-meta">Odblokujesz {D.unlock}</div>}
      {open && (
        <div class="dt-more">
          <p class="sub">{D.how}{id === 'krypta' && unlocked ? ` W tym tygodniu: ${KRYPTA_RULES[kryptaRule(game.ctx.now())].d}.` : ''}</p>
          <p class="sub"><b>Nagroda:</b> {D.reward}.</p>
        </div>
      )}
      {unlocked && (
        here ? <div class="dt-here">Trwa — walka u góry</div>
          : id === 'leza' && !blocked ? (
            open ? (
              <div class="mix">
                {lezaBosses(game.ctx).map(land => {
                  const set = setOfLand(land)!;
                  return (
                    <button key={land} class="chip" onClick={() => enter(land)}>
                      <Px src={setOreUrl(set)} size={16} />{LANDS[land].boss} → <span style={{ color: SETS[set].col }}>{SETS[set].ore}</span>
                    </button>
                  );
                })}
              </div>
            ) : <button class="btn primary small" onClick={() => setOpen(id)}>Wybierz bossa</button>
          ) : (
            <button class="btn primary small" disabled={!!blocked} onClick={() => enter()}>
              {blocked || (unlimited ? `Piętro ${game.s.dungeons.wieza.best + 1}` : 'Wejdź')}
            </button>
          )
      )}
    </section>
  );
}

/** Arena z innymi graczami — tylko z serwerem gry. */
function ArenaTab({ game, online, onArena }: { game: Game; online: boolean; onArena: () => void }) {
  const open = game.s.maxLand >= B.ARENA_UNLOCK_LAND;
  return (
    <section class={`card dung tile wide arena-tile${open ? '' : ' locked'}`} aria-label="Arena" style={{ '--bg': `url(${dungeonBgUrl('arena')})` } as Record<string, string>}>
      <div class="dt-top"><span class="dt-reward"><Px src={resUrl('zloto')} size={20} />Ocena i złoto</span>{open && <span class="keys">{B.ARENA_FIGHTS} walk dziennie</span>}</div>
      <div class="dt-name">Arena</div>
      <p class="sub">Walczysz z kopiami bohaterów innych graczy — ekwipunek, umiejętności i chowaniec z ich ostatniego zapisu. Walkę liczy serwer; za wygraną rośnie ocena i dostajesz złoto. Ranking areny jest w Kodeksie.</p>
      {!open ? <div class="lockline">Odblokujesz po pokonaniu bossa krainy {LANDS[0].n}</div> : (
        <div>
          <button class="btn primary" disabled={!online} onClick={onArena}>Wejdź na arenę</button>
          {!online && <span class="sub" style={{ marginLeft: '10px' }}>Potrzebne połączenie z serwerem.</span>}
        </div>
      )}
    </section>
  );
}

export function DungeonPanel({ game, online = false, onArena }: { game: Game; online?: boolean; onArena?: () => void }) {
  const [tab, setTab] = useState<'lochy' | 'arena'>('lochy');
  const [open, setOpen] = useState<DungId | null>(null);
  const arena = game.net && !!onArena;
  return (
    <>
      {arena && (
        <div class="seg seg2" role="tablist" aria-label="Lochy i arena">
          <button role="tab" aria-selected={tab === 'lochy'} class={tab === 'lochy' ? 'on' : ''} onClick={() => setTab('lochy')}>Lochy</button>
          <button role="tab" aria-selected={tab === 'arena'} class={tab === 'arena' ? 'on' : ''} onClick={() => setTab('arena')}>Arena</button>
        </div>
      )}
      {tab === 'arena' && arena ? <ArenaTab game={game} online={online} onArena={onArena!} /> : (
        <>
          <div class="dgrid">
            {DUNG_ORDER.map(id => <DungTile key={id} game={game} id={id} open={open === id} setOpen={setOpen} />)}
          </div>
          <section class="card">
            <p class="sub">Klucze odnawiają się codziennie o północy. Wkrótce: {DUNG_SOON.join(', ')}.</p>
          </section>
        </>
      )}
    </>
  );
}
