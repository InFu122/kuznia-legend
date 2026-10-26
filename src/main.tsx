import { render } from 'preact';
import { Game } from './engine/game';
import { migrate, newState } from './engine/state';
import { connectArtifactCloud, loadLocal, saveCloud, saveLocal } from './save/storage';
import { App, type SaveInfo } from './ui/App';
import './ui/styles.css';

function boot(hotData?: { s?: string }) {
  const now = Date.now();
  let fromHot = false;
  let state = null;
  if (hotData?.s) { try { state = migrate(JSON.parse(hotData.s), now); fromHot = true; } catch { state = null; } }
  state ??= loadLocal(now) ?? newState(now);
  const game = new Game(state);
  const save: SaveInfo = { mode: 'local' };
  let cloud: Awaited<ReturnType<typeof connectArtifactCloud>> = null;

  const persist = async () => {
    game.s.savedAt = Date.now();
    game.s.lastSeen = Date.now();
    const json = JSON.stringify(game.s);
    saveLocal(json);
    if (cloud && !(await saveCloud(cloud.cloud, json))) { cloud = null; save.mode = 'local'; }
  };

  const onReady = () => {
    if (!fromHot) game.offline(Date.now() - (game.s.lastSeen || Date.now()));
    connectArtifactCloud().then(c => {
      if (!c) return;
      cloud = c;
      save.mode = 'cloud';
      if (c.remote && (c.remote.savedAt || 0) > (game.s.savedAt || 0)) {
        game.load(c.remote);
        game.offline(Date.now() - (c.remote.lastSeen || Date.now()));
      }
      void persist();
    });
  };

  render(<App game={game} save={save} onReady={onReady} />, document.getElementById('root')!);

  // Pętla gry: czas rzeczywisty → czas gry; dłuższa przerwa (np. telefon w kieszeni) = nagrody offline.
  let last = performance.now();
  let lastWall = Date.now();
  const frame = (t: number) => {
    const wall = Date.now();
    if (wall - lastWall > 60000) game.offline(wall - lastWall);
    lastWall = wall;
    game.tick(Math.min(t - last, 250));
    last = t;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  setInterval(() => { if (game.takeDirty()) void persist(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) void persist(); });
  window.claude?.hot?.snapshot?.(() => ({ s: JSON.stringify(game.s) }));
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(boot);
else boot(hot?.data);
