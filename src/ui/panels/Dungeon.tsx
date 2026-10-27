import { DUNGEONS, DUNG_ORDER, DUNG_SOON, ELEM, LANDS, ORES, SETS, setOfLand } from '../../data';
import { elementOfDay, lezaBosses } from '../../engine/dungeon';
import type { Game } from '../../engine/game';
import type { DungId } from '../../engine/types';
import { fmt } from '../format';

function best(game: Game, id: DungId): string {
  const b = game.s.dungeons[id].best;
  if (!b) return '—';
  switch (id) {
    case 'skarbiec': return `${fmt(b)} goblinów`;
    case 'oltarze': return `${b}/5`;
    case 'leza': return fmt(b);
    default: return `piętro ${b}`;
  }
}

function rewardNow(game: Game, id: DungId): string {
  switch (id) {
    case 'sztolnia': return ORES[game.dungTier()].n;
    case 'oltarze': return ELEM[elementOfDay(game.ctx.now())].n;
    default: return DUNGEONS[id].short;
  }
}

export function DungeonPanel({ game }: { game: Game }) {
  const run = game.b.mode === 'dung' ? game.b.dung : null;
  const enter = (id: DungId, land?: number) => {
    if (game.startDung(id, land)) window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  return (
    <>
      {DUNG_ORDER.map(id => {
        const D = DUNGEONS[id];
        const open = game.dungUnlocked(id);
        const keys = game.dungKeys(id);
        const unlimited = !Number.isFinite(keys);
        const here = run?.id === id;
        const blocked = run && !here ? 'Trwa inny loch' : !unlimited && keys < 1 ? 'Klucze wrócą jutro' : '';
        return (
          <section class={`card dung${open ? '' : ' locked'}`} key={id} aria-label={D.n}>
            <div class="eyebrow">Loch · {D.short}</div>
            <div class="row">
              <div class="h">{D.n}</div>
              {open && <span class="keys" aria-label="Klucze na dziś">{unlimited ? 'Bez limitu' : `Klucze: ${keys}/${D.keys}`}</span>}
            </div>
            <p class="sub">{D.how}</p>
            {open && (
              <div class="stats" style={{ marginTop: '8px' }}>
                <div class="stat"><small>{id === 'leza' ? 'Zwycięstwa' : 'Rekord'}</small><b>{best(game, id)}</b></div>
                <div class="stat"><small>{id === 'oltarze' ? 'Żywioł dnia' : 'Nagroda'}</small><b>{rewardNow(game, id)}</b></div>
              </div>
            )}
            {!open ? <div class="lockline">Odblokujesz {D.unlock}</div> : <div style={{ marginTop: '10px' }}>
              {here ? (
                <p class="sub">Trwa — walkę widzisz w arenie u góry.</p>
              ) : id === 'leza' && !blocked ? (
                <div class="mix">
                  {lezaBosses(game.ctx).map(land => {
                    const set = setOfLand(land)!;
                    return (
                      <button key={land} class="chip" onClick={() => enter('leza', land)}>
                        {LANDS[land].boss} → <span style={{ color: SETS[set].col }}>{SETS[set].ore}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button class="btn primary" disabled={!!blocked} onClick={() => enter(id)}>
                  {blocked || (unlimited ? `Wejdź na piętro ${game.s.dungeons.wieza.best + 1}` : 'Wejdź (1 klucz)')}
                </button>
              )}
            </div>}
          </section>
        );
      })}
      <section class="card">
        <div class="eyebrow">Wkrótce</div>
        <ul class="list">{DUNG_SOON.map(n => <li key={n}>{n}</li>)}</ul>
        <p class="sub" style={{ marginTop: '6px' }}>Klucze odnawiają się codziennie o północy.</p>
      </section>
    </>
  );
}
