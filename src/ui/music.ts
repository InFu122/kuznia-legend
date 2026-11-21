// Muzyka w tle: playlisty zależne od miejsca (kraina, loch, walka z bossem) z płynnym przejściem między utworami.
// Utwory (public/audio/m-*.mp3) grają przez elementy <audio> — strumieniowo, bez wczytywania całości do pamięci —
// a głośność ustawia Web Audio (na iPhonie element <audio> nie pozwala zmieniać głośności).
// Dwa stałe „decki” odblokowuje pierwszy gest gracza; potem zmieniamy im tylko źródło.
import { audioCtx, audioUrl, setDuckHook } from './sound';

export type Mood = 'camp' | 'dung' | 'boss';

/** Spokojne (do zapętlenia) — jedyna muzyka w tle krain, także zaraz po włączeniu gry. */
const CALM = ['simple-magic', 'legend', 'celtic-morning', 'celtic-sun', 'helpless-land', 'medieval-kingdom', 'medieval-castle', 'knight-of-flowers'];
/** Dynamiczne — tylko w ważniejszych walkach: lochy i bossowie. */
const DYNAMIC = ['celtic-wild', 'mystical-fantasy', 'celtic-fantasy', 'naughty-princess'];
/** Chóry — tylko walka z bossem. */
const BOSS_ONLY = ['gregorian-choir', 'religious-choir'];

/** Playlisty: w krainach (i po włączeniu gry) tylko spokojne, w lochach dynamiczne, przy bossach chóry i dynamiczne. */
export const PLAYLISTS: Record<Mood, string[]> = {
  camp: [...CALM],
  dung: [...DYNAMIC],
  boss: [...BOSS_ONLY, ...DYNAMIC],
};
/** Utwory do wyboru (nutka obok Mocy): nazwa po polsku i rodzaj. */
export const TRACKS: { id: string; n: string; g: 'calm' | 'dyn' | 'choir' }[] = [
  { id: 'simple-magic', n: 'Prosta magia', g: 'calm' },
  { id: 'legend', n: 'Legenda', g: 'calm' },
  { id: 'celtic-morning', n: 'Celtycki poranek', g: 'calm' },
  { id: 'celtic-sun', n: 'Celtyckie słońce', g: 'calm' },
  { id: 'helpless-land', n: 'Bezradna kraina', g: 'calm' },
  { id: 'medieval-kingdom', n: 'Średniowieczne królestwo', g: 'calm' },
  { id: 'medieval-castle', n: 'Średniowieczny zamek', g: 'calm' },
  { id: 'knight-of-flowers', n: 'Rycerz kwiatów', g: 'calm' },
  { id: 'celtic-wild', n: 'Celtycki szał', g: 'dyn' },
  { id: 'mystical-fantasy', n: 'Mistyczna baśń', g: 'dyn' },
  { id: 'celtic-fantasy', n: 'Celtycka baśń', g: 'dyn' },
  { id: 'naughty-princess', n: 'Psotna księżniczka', g: 'dyn' },
  { id: 'gregorian-choir', n: 'Chór gregoriański', g: 'choir' },
  { id: 'religious-choir', n: 'Chór świątynny', g: 'choir' },
];
export const trackName = (id: string) => TRACKS.find(t => t.id === id)?.n ?? id;

/** Muzyka jest cichsza od efektów — ma być tłem. */
const LEVEL = 0.55;
const FADE = 2.5;        // s, przejście między utworami
const FADE_FAST = 1.2;   // s, wejście i zejście muzyki bossa
const LEAVE_BOSS_MS = 2500;
/** Muzyka lochu i bossa gra co najmniej tyle (ms), nawet gdy walka skończy się szybciej. */
export const MIN_INTENSE_MS = 15_000;
/** Kolejność „intensywności”: przejście w górę od razu, w dół po odczekaniu. */
const RANK: Record<Mood, number> = { camp: 0, dung: 1, boss: 2 };

interface Deck { el: HTMLAudioElement; g: GainNode; track: string; handoff: boolean; unlocked: boolean }
let decks: Deck[] = [];
let bus: GainNode | null = null;
let active = 0;
let on = true;
let vol = 0.5;
let mood: Mood = 'camp';
let playing: Mood | null = null;
let leaveTimer: ReturnType<typeof setTimeout> | 0 = 0;
/** Dokąd wrócić po odczekaniu (gracz mógł w międzyczasie zmienić miejsce). */
let want: Mood = 'camp';
/** Kiedy zaczęła się muzyka obecnego miejsca (Date.now). */
let since = 0;
let duckUntil = 0;
/** Przeglądarka odmówiła odtwarzania (brak gestu gracza) — spróbujemy przy następnym dotknięciu. */
let blocked = false;
const lastTrack: Partial<Record<Mood, string>> = {};
/** Utwór wybrany przez gracza (gra raz do końca, potem wraca automat) albo null — automatycznie według miejsca. */
let fixed: string | null = null;
const trackSubs = new Set<() => void>();
/** Zmiana utworu (okno wyboru muzyki pokazuje, co teraz gra). */
export function onTrack(f: () => void): () => void { trackSubs.add(f); return () => trackSubs.delete(f); }
/** Co teraz gra (null — cisza albo muzyka jeszcze nie ruszyła). */
export const nowPlaying = (): string | null => (on && playing && decks[active]?.track) || null;
const endSubs = new Set<() => void>();
/** Wybrany utwór się skończył i muzyka wróciła do automatycznej (gra zapisuje to w ustawieniach). */
export function onTrackEnd(f: () => void): () => void { endSubs.add(f); return () => endSubs.delete(f); }

const level = () => vol * LEVEL;

function pick(m: Mood): string {
  if (fixed) return fixed;
  const list = PLAYLISTS[m];
  // Bez powtórki: ani poprzedni utwór tej playlisty, ani ten, który właśnie gra (utwory dynamiczne są na kilku listach).
  const now = decks[active]?.track;
  const fresh = list.filter(x => x !== lastTrack[m] && x !== now);
  const options = fresh.length ? fresh : list;
  const t = options[Math.floor(Math.random() * options.length)];
  lastTrack[m] = t;
  return t;
}

function ramp(g: GainNode, to: number, sec: number) {
  const ac = audioCtx();
  if (!ac) return;
  const now = ac.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(to, now + sec);
}

/** Płynne przejście na nowy utwór na drugim decku. */
function crossTo(m: Mood, fade = FADE) {
  if (!decks.length || !bus) return;
  const from = decks[active];
  const to = decks[1 - active];
  const track = pick(m);
  to.track = track;
  to.handoff = false;
  to.el.loop = m === 'boss' && !fixed;  // walka z bossem trwa różnie długo; wybrany utwór gra raz (potem automat)
  to.el.src = audioUrl(`m-${track}.mp3`);
  to.g.gain.value = 0;
  to.el.play()
    .then(() => { to.unlocked = true; blocked = false; ramp(to.g, 1, fade); })
    .catch((e: unknown) => { if ((e as { name?: string })?.name === 'NotAllowedError') blocked = true; });
  ramp(from.g, 0, fade);
  const old = from.el;
  setTimeout(() => { if (decks[active].el !== old) old.pause(); }, fade * 1000 + 100);
  active = 1 - active;
  playing = m;
  trackSubs.forEach(f => f());
}

function stop(fade = FADE_FAST) {
  if (!decks.length) return;
  const d = decks[active];
  ramp(d.g, 0, fade);
  setTimeout(() => { if (!on) for (const x of decks) x.el.pause(); }, fade * 1000 + 100);
  playing = null;
  trackSubs.forEach(f => f());
}

/** Koniec utworu: następny z playlisty; po utworze wybranym przez gracza — powrót do automatycznego wyboru. */
function next() {
  if (fixed) {
    fixed = null;
    endSubs.forEach(f => f());
  }
  crossTo(mood);
}

function makeDeck(): Deck | null {
  const ac = audioCtx();
  if (!ac || !bus) return null;
  const el = new Audio();
  el.preload = 'auto';
  const g = ac.createGain();
  g.gain.value = 0;
  ac.createMediaElementSource(el).connect(g).connect(bus);
  const d: Deck = { el, g, track: '', handoff: false, unlocked: false };
  // Przed końcem utworu (nie zapętlonego) zaczynamy następny, żeby nie było ciszy.
  el.addEventListener('timeupdate', () => {
    if (decks[active] !== d || el.loop || d.handoff || !playing || !Number.isFinite(el.duration)) return;
    if (el.duration - el.currentTime < FADE) { d.handoff = true; next(); }
  });
  el.addEventListener('ended', () => { if (decks[active] === d && playing && !d.handoff) { d.handoff = true; next(); } });
  return d;
}

/** Wołane przy pierwszym geście gracza (po unlockAudio) — tylko wtedy przeglądarka pozwala zacząć odtwarzanie. */
export function initMusic(): void {
  const ac = audioCtx();
  if (!ac || decks.length) return;
  bus = ac.createGain();
  bus.gain.value = level();
  bus.connect(ac.destination);
  const a = makeDeck(), b = makeDeck();
  if (!a || !b) return;
  decks = [a, b];
  setDuckHook(duck);
  if (on) crossTo(mood, FADE_FAST);
  kickMusic();
  document.addEventListener('visibilitychange', () => {
    const d = decks[active];
    if (!d) return;
    if (document.hidden) d.el.pause();
    else if (on && playing) d.el.play().catch(() => {});
  });
}

/**
 * Wołane przy każdym geście gracza. Na telefonie pierwsze dotknięcie (pointerdown) nie wystarcza przeglądarce
 * do odtwarzania — dopiero puszczenie palca. Jeśli muzyka miała grać, a przeglądarka odmówiła, startuje teraz.
 * Każdy deck musi też raz zagrać w geście (wymóg Safari na iPhonie) — nieużywany gra po cichu i od razu staje.
 */
export function kickMusic(): void {
  if (!decks.length || document.hidden) return;
  for (const d of decks) {
    if (d === decks[active] && on && playing && (blocked || d.el.paused)) {
      d.el.play().then(() => { d.unlocked = true; blocked = false; ramp(d.g, 1, FADE_FAST); }).catch(() => {});
    } else if (!d.unlocked) {
      if (!d.el.src) d.el.src = audioUrl(`m-${PLAYLISTS.camp[0]}.mp3`);
      d.el.play().then(() => { d.unlocked = true; if (decks[active] !== d || !playing) d.el.pause(); }).catch(() => {});
    }
  }
}

/** Włączenie/wyłączenie i głośność (z ustawień gracza). */
export function setMusic(enabled: boolean, volume: number): void {
  vol = volume;
  if (bus && performance.now() > duckUntil) bus.gain.value = level();
  if (enabled === on) return;
  on = enabled;
  if (!decks.length) return;
  if (on) crossTo(mood, FADE_FAST);
  else stop();
}

/** Gdzie jest gracz: kraina, loch czy walka z bossem. Wołane często — zmienia utwór tylko przy zmianie nastroju. */
export function setMood(m: Mood): void {
  // Wybrany utwór gra wszędzie — miejsce go nie zmienia (pamiętamy tylko, gdzie gracz jest, na powrót do automatu).
  if (fixed) { mood = m; want = m; clearLeave(); return; }
  if (m === mood) { want = m; clearLeave(); return; }
  if (RANK[m] < RANK[mood]) {
    // Spokojniej (po bossie, po lochu): muzyka lochu i bossa gra co najmniej 15 s — szybko ubity boss nie urywa jej
    // po chwili — a po bossie i tak chwilę czekamy, bo między falami nie ma wroga, a boss może zaraz wrócić (Leże).
    want = m;
    if (leaveTimer) return;
    const wait = Math.max(mood === 'boss' ? LEAVE_BOSS_MS : 0, MIN_INTENSE_MS - (Date.now() - since));
    if (wait > 0) { leaveTimer = setTimeout(() => { leaveTimer = 0; go(want); }, wait); return; }
  }
  clearLeave();
  go(m);
}

function clearLeave() { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0; } }
function go(m: Mood) {
  mood = m;
  want = m;
  since = Date.now();
  if (on && decks.length) crossTo(m, m === 'boss' ? FADE_FAST : FADE);
}
/** Gdzie gra muzyka teraz (do testów). */
export const moodNow = (): Mood => mood;

/** Wybór utworu: id — ten jeden (raz, do końca; potem automat), null — automatycznie według miejsca. Nieznany = automatycznie. */
export function setTrack(id: string | null): void {
  const t = id && TRACKS.some(x => x.id === id) ? id : null;
  if (t === fixed) return;
  fixed = t;
  if (on && decks.length) crossTo(mood, FADE_FAST);
  else trackSubs.forEach(f => f());
}

/** „Następny utwór” w trybie automatycznym. */
export function skipTrack(): void {
  if (!fixed && on && decks.length) crossTo(mood, FADE_FAST);
}

/** Pauza muzyki na czas reklamy (reklama ma własny dźwięk); `false` — gra dalej. */
export function holdMusic(hold: boolean): void {
  const d = decks[active];
  if (!d) return;
  if (hold) d.el.pause();
  else if (on && playing && !document.hidden) d.el.play().catch(() => {});
}

/** Na chwilę ścisza muzykę (rzadki przedmiot, boss, nagroda), żeby efekt było dobrze słychać. */
export function duck(ms: number): void {
  if (!bus) return;
  duckUntil = performance.now() + ms + 1100;
  ramp(bus, level() * 0.35, 0.15);
  const ac = audioCtx();
  if (!ac) return;
  const back = ac.currentTime + 0.15 + ms / 1000;
  bus.gain.setValueAtTime(level() * 0.35, back);
  bus.gain.linearRampToValueAtTime(level(), back + 0.8);
}

/** Nastrój z bieżącej walki. */
export const moodOf = (mode: string, boss: boolean): Mood => (boss ? 'boss' : mode === 'dung' ? 'dung' : 'camp');
