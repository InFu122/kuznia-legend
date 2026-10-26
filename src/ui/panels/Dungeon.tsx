import { B, ORES } from '../../data';
import type { Game } from '../../engine/game';

export function DungeonPanel({ game }: { game: Game }) {
  const k = game.dungKeys();
  const t = game.dungTier();
  const run = game.b.mode === 'dung' ? game.b.dung : null;
  return (
    <>
      <section class="card">
        <div class="eyebrow">Loch</div>
        <div class="h">Głęboka Sztolnia</div>
        <p class="sub">
          Schodzisz piętro po piętrze i zbierasz rudę o poziom lepszą niż w twojej najdalszej krainie: <b class={`rt${ORES[t].floor}`}>{ORES[t].n}</b>.
          Co {B.DUNGEON_CHECKPOINT} pięter decydujesz: wyjść z łupem albo ryzykować dalej. Porażka zabiera połowę worka.
        </p>
        <div class="stats" style={{ marginTop: '10px' }}>
          <div class="stat"><small>Klucze na dziś</small><b>{k}/{B.DUNGEON_KEYS}</b></div>
          <div class="stat"><small>Najgłębiej</small><b>{game.s.dung.best ? `piętro ${game.s.dung.best}` : '—'}</b></div>
          <div class="stat"><small>Nagroda</small><b>{ORES[t].n}</b></div>
        </div>
        <div style={{ marginTop: '12px' }}>
          {run ? (
            <p class="sub">Trwa zejście: piętro {run.floor}, w worku {run.loot} × {ORES[run.tier].n}. Walkę widzisz w arenie u góry.</p>
          ) : (
            <button class="btn primary" disabled={k < 1} onClick={() => { if (game.startDung()) window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {k < 1 ? 'Klucze wrócą jutro' : 'Zejdź do Sztolni (1 klucz)'}
            </button>
          )}
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">Kolejne lochy z projektu</div>
        <ul class="list">
          <li>Skarbiec Złota — złoto</li>
          <li>Ołtarze Żywiołów — domieszki</li>
          <li>Leża Bossów — rudy unikalne do zestawów</li>
          <li>Wieża Wyzwań, Labirynt Minotaura, Krypta Bohaterów, Zapomniana Zbrojownia</li>
          <li>Smocze Leże — rajd klanowy</li>
        </ul>
        <p class="sub" style={{ marginTop: '6px' }}>Na razie działa Sztolnia; pozostałe lochy dochodzą w etapie 2.</p>
      </section>
    </>
  );
}
