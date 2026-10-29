import { render } from 'preact';
import { B } from './data';
import { Game } from './engine/game';
import { migrate, newState } from './engine/state';
import type { GameState } from './engine/types';
import { toast } from './engine/context';
import { ChatLink, setChat } from './save/chat';
import { CLAN_SYNC_MS, clanLife } from './save/clanlife';
import { ServerError, ServerLink, serverConfig, setLink } from './save/server';
import { connectArtifactCloud, loadLocal, saveCloud, saveLocal } from './save/storage';
import { App, type SaveInfo } from './ui/App';
import { initPwa } from './ui/pwa';
import { watchErrors } from './ui/report';
import './ui/fonts.css';
import './ui/styles.css';

const RETRY_MS = 60000;
/** Co ile gra łączy się z Wielkim Obiegiem (wysyłka, znaleziska, wieści). */
const OBIEG_MS = 120000;

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
  const game = new Game(state, { now: () => Date.now() + (link?.offset ?? 0), net: !!link });
  const save: SaveInfo = { mode: link ? 'connecting' : 'local' };
  let cloud: Awaited<ReturnType<typeof connectArtifactCloud>> = null;

  /** Przyjmuje nowszy zapis z innego urządzenia i nalicza czas nieobecności. `force` — bez porównywania dat. */
  const adopt = (remote: GameState, force = false) => {
    const s = migrate(remote, Date.now());
    if (!force && (s.savedAt || 0) <= (game.s.savedAt || 0)) return false;
    game.load(s);
    game.offline(Date.now() - (s.lastSeen || Date.now()));
    return true;
  };

  /** Nick nadaje serwer (unikalny); nowy gracz dowiaduje się, jak go zmienić. */
  const takeName = (r: { name?: string; newName?: boolean }) => {
    if (!r.name || r.name === game.s.name) return;
    const generated = r.newName;
    game.applyServerName(r.name);
    if (generated) toast(game.ctx, `Twój nick: ${r.name}. Zmienisz go w Kodeksie.`, 'good');
  };

  /** Czat i klan startują po pierwszym udanym połączeniu z serwerem. */
  let chat: ChatLink | null = null;
  const startChat = (l: ServerLink) => {
    if (chat) return;
    chat = new ChatLink(l);
    setChat(chat);
    void chat.start();
    l.clanInfo().then(i => chat?.setClan(i.clan?.id ?? null, i.clan?.name ?? '', i.clan?.ann ?? '')).catch(() => {});
  };
  // Przedmiot Mityczny albo Boski: wpis na czacie klanu (serwer sprawdza, czy naprawdę go wykuto).
  game.on(e => {
    if (e.t !== 'forged' || !link || !chat?.clanId || e.item.r < 5 || typeof e.item.sx !== 'number') return;
    link.chatDrop(e.item, false).catch(() => {});
  });

  const saveServer = async (l: ServerLink) => {
    try {
      let r = await l.save(game.s);
      if (r.conflict !== undefined) {
        if (r.conflict && r.force) adopt(r.conflict, true); // na serwerze są późniejsze wytopy — wygrywa serwer
        else if (!(r.conflict && adopt(r.conflict))) r = await l.save(game.s); // nasz zapis jest nowszy — nadpisz
      }
      takeName(r);
      if (typeof r.clanLvl === 'number') game.setClanLvl(r.clanLvl);
      game.setMaxSpeed(l.testSpeed);
      save.mode = 'server';
      save.error = undefined;
      startChat(l);
      void extras(l);
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

  /** Po zapisie: zapas ziaren wytopu i co jakiś czas Wielki Obieg. */
  let lastObieg = 0;
  let syncing = false;
  const extras = async (l: ServerLink) => {
    if (syncing) return;
    syncing = true;
    try {
      const need = game.seedNeed();
      if (need.n > 0) {
        const r = await l.seeds(need.from, need.n);
        game.addSeeds(r.from, r.seeds);
      }
      // Klan: nagrody do odebrania, pomoc w ulepszeniu kuźni, poziom klanu.
      if (Date.now() - clanLife.at >= CLAN_SYNC_MS) await clanLife.sync(game).catch(e => console.warn('Kuźnia Legend: klan —', e));
      if (Date.now() - lastObieg >= OBIEG_MS || game.s.obOut.length >= 5) {
        lastObieg = Date.now();
        const out = game.takeObOut();
        try {
          const r = await l.obiegSync(out, game.obNeed());
          game.obiegIn(r.items, r.events);
        } catch (e) {
          game.s.obOut.unshift(...out); // spróbujemy przy następnym połączeniu
          throw e;
        }
      }
    } catch (e) {
      console.warn('Kuźnia Legend: synchronizacja z serwerem nieudana —', e);
    } finally {
      syncing = false;
    }
  };

  let retry: ReturnType<typeof setTimeout> | undefined;
  const connect = async (l: ServerLink) => {
    clearTimeout(retry);
    try {
      const remote = await l.load();
      game.setMaxSpeed(l.testSpeed);
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
  if (link) {
    save.retry = () => { save.mode = 'connecting'; void connect(link); };
    // Przeniesienie konta: to urządzenie dołącza do konta z kodu i przejmuje jego zapis.
    save.redeem = async (code: string) => {
      const remote = await link.redeem(code);
      if (remote) adopt(remote, true);
      clanLife.reset();
      if (chat) {
        chat.restart();
        link.clanInfo().then(i => chat?.setClan(i.clan?.id ?? null, i.clan?.name ?? '', i.clan?.ann ?? '')).catch(() => {});
      }
      saveLocal(JSON.stringify(game.s));
      save.mode = 'server';
      save.reason = undefined;
      await saveServer(link);
    };
  }

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
  // Tempo testowe z serwerem: wytopy zużywają ziarna szybciej — gdy zapas maleje, zapis od razu (po nim gra dobiera ziarna).
  let refill = false;
  if (link) setInterval(() => {
    if (refill || !link.online || game.s.speed <= 1 || game.s.seeds.length >= B.SEEDS_REFILL) return;
    refill = true;
    game.takeDirty();
    void persist().finally(() => { refill = false; });
  }, 2000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) void persist(); });
  save.flush = persist;
  initPwa();
  watchErrors(game);
  window.claude?.hot?.snapshot?.(() => ({ s: JSON.stringify(game.s) }));
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(boot);
else boot(hot?.data);
