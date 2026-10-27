import { render } from 'preact';
import { Game } from './engine/game';
import { migrate, newState } from './engine/state';
import type { GameState } from './engine/types';
import { ServerError, ServerLink, serverConfig, setLink } from './save/server';
import { connectArtifactCloud, loadLocal, saveCloud, saveLocal } from './save/storage';
import { App, type SaveInfo } from './ui/App';
import './ui/styles.css';

const RETRY_MS = 60000;

/** Czytelny powód braku połączenia z serwerem (widać go w Kodeksie). */
function why(e: unknown): string {
  if (e instanceof ServerError) {
    if (e.status === 401) return 'serwer odrzucił klucz gry — klucz w grze różni się od NAKAMA_SERVER_KEY (przebuduj: docker compose up -d --build)';
    return `błąd serwera ${e.status}: ${e.message}`;
  }
  if (e instanceof DOMException && e.name === 'AbortError') return 'serwer nie odpowiedział w 10 sekund';
  return 'brak połączenia z serwerem (' + (e instanceof Error ? e.message : String(e)) + ')';
}

function boot(hotData?: { s?: string }) {
  const now = Date.now();
  let fromHot = false;
  let state = null;
  if (hotData?.s) { try { state = migrate(JSON.parse(hotData.s), now); fromHot = true; } catch { state = null; } }
  state ??= loadLocal(now) ?? newState(now);

  // Z serwerem gra liczy czas od zegara serwera (dzienne resety, klucze, misje).
  const cfg = serverConfig();
  const link = cfg ? new ServerLink(cfg) : null;
  setLink(link);
  const game = new Game(state, { now: () => Date.now() + (link?.offset ?? 0) });
  const save: SaveInfo = { mode: link ? 'connecting' : 'local' };
  let cloud: Awaited<ReturnType<typeof connectArtifactCloud>> = null;

  /** Przyjmuje nowszy zapis z innego urządzenia i nalicza czas nieobecności. */
  const adopt = (remote: GameState) => {
    const s = migrate(remote, Date.now());
    if ((s.savedAt || 0) <= (game.s.savedAt || 0)) return false;
    game.load(s);
    game.offline(Date.now() - (s.lastSeen || Date.now()));
    return true;
  };

  const saveServer = async (l: ServerLink) => {
    try {
      const r = await l.save(game.s);
      if (r.conflict !== undefined) {
        if (!(r.conflict && adopt(r.conflict))) await l.save(game.s); // nasz zapis jest nowszy — nadpisz
      }
      save.mode = 'server';
      save.error = undefined;
    } catch (e) {
      if (e instanceof ServerError && e.status === 400) { save.error = e.message; return; } // serwer odrzucił zapis
      l.online = false;
      save.mode = 'offline';
      save.reason = why(e);
      clearTimeout(retry);
      retry = setTimeout(() => void connect(l), RETRY_MS);
    }
  };

  const persist = async () => {
    game.s.savedAt = Date.now();
    game.s.lastSeen = Date.now();
    const json = JSON.stringify(game.s);
    saveLocal(json);
    if (link?.online) await saveServer(link);
    else if (cloud && !(await saveCloud(cloud.cloud, json))) { cloud = null; save.mode = 'local'; }
  };

  let retry: ReturnType<typeof setTimeout> | undefined;
  const connect = async (l: ServerLink) => {
    clearTimeout(retry);
    try {
      const remote = await l.load();
      save.reason = undefined;
      if (remote) adopt(remote);
      await saveServer(l);
    } catch (e) {
      save.mode = 'offline';
      save.reason = why(e);
      console.warn('Kuźnia Legend: serwer niedostępny —', save.reason);
      retry = setTimeout(() => void connect(l), RETRY_MS);
    }
  };
  if (link) save.retry = () => { save.mode = 'connecting'; void connect(link); };

  const onReady = () => {
    if (!fromHot) game.offline(Date.now() - (game.s.lastSeen || Date.now()));
    if (link) { void connect(link); return; }
    connectArtifactCloud().then(c => {
      if (!c) return;
      cloud = c;
      save.mode = 'cloud';
      if (c.remote) adopt(c.remote);
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

  setInterval(() => { if (game.takeDirty()) void persist(); }, link ? 30000 : 15000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) void persist(); });
  window.claude?.hot?.snapshot?.(() => ({ s: JSON.stringify(game.s) }));
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(boot);
else boot(hot?.data);
