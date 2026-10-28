// Muzyka w tle: playlisty zależne od miejsca (kraina, loch, walka z bossem) z płynnym przejściem między utworami.
// Utwory (public/audio/m-*.mp3) grają przez elementy <audio> — strumieniowo, bez wczytywania całości do pamięci —
// a głośność ustawia Web Audio (na iPhonie element <audio> nie pozwala zmieniać głośności).
// Dwa stałe „decki” odblokowuje pierwszy gest gracza; potem zmieniamy im tylko źródło.
import { audioCtx, audioUrl, setDuckHook } from './sound';

export type Mood = 'camp' | 'dung' | 'boss';

/** Playlisty: spokojne w krainach, tajemnicze w lochach, podniosłe przy bossach. */
export const PLAYLISTS: Record<Mood, string[]> = {
  camp: ['celtic-fantasy', 'celtic-morning', 'celtic-sun', 'medieval-castle', 'naughty-princess', 'simple-magic', 'knight-of-flowers'],
  dung: ['mystical-fantasy', 'religious-choir'],
  boss: ['legend', 'medieval-kingdom'],
};
/** Muzyka jest cichsza od efektów — ma być tłem. */
const LEVEL = 0.55;
const FADE = 2.5;        // s, przejście między utworami
const FADE_FAST = 1.2;   // s, wejście i zejście muzyki bossa
const LEAVE_BOSS_MS = 2500;

interface Deck { el: HTMLAudioElement; g: GainNode; track: string; handoff: boolean }
let decks: Deck[] = [];
let bus: GainNode | null = null;
let active = 0;
let on = true;
let vol = 0.5;
let mood: Mood = 'camp';
let playing: Mood | null = null;
let leaveTimer = 0;
let duckUntil = 0;
const lastTrack: Partial<Record<Mood, string>> = {};

const level = () => vol * LEVEL;

function pick(m: Mood): string {
  const list = PLAYLISTS[m];
  const options = list.length > 1 ? list.filter(x => x !== lastTrack[m]) : list;
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
  to.el.loop = m === 'boss';  // walka z bossem trwa różnie długo — jego utwór się zapętla
  to.el.src = audioUrl(`m-${track}.mp3`);
  to.g.gain.value = 0;
  to.el.play().then(() => ramp(to.g, 1, fade)).catch(() => { /* np. brak pliku — spróbujemy przy następnej zmianie */ });
  ramp(from.g, 0, fade);
  const old = from.el;
  setTimeout(() => { if (decks[active].el !== old) old.pause(); }, fade * 1000 + 100);
  active = 1 - active;
  playing = m;
}

function stop(fade = FADE_FAST) {
  if (!decks.length) return;
  const d = decks[active];
  ramp(d.g, 0, fade);
  setTimeout(() => { if (!on) for (const x of decks) x.el.pause(); }, fade * 1000 + 100);
  playing = null;
}

function makeDeck(): Deck | null {
  const ac = audioCtx();
  if (!ac || !bus) return null;
  const el = new Audio();
  el.preload = 'auto';
  const g = ac.createGain();
  g.gain.value = 0;
  ac.createMediaElementSource(el).connect(g).connect(bus);
  const d: Deck = { el, g, track: '', handoff: false };
  // Przed końcem utworu (nie zapętlonego) zaczynamy następny, żeby nie było ciszy.
  el.addEventListener('timeupdate', () => {
    if (decks[active] !== d || el.loop || d.handoff || !playing || !Number.isFinite(el.duration)) return;
    if (el.duration - el.currentTime < FADE) { d.handoff = true; crossTo(mood); }
  });
  el.addEventListener('ended', () => { if (decks[active] === d && playing && !d.handoff) { d.handoff = true; crossTo(mood); } });
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
  // Każdy deck musi raz zagrać w geście gracza (wymóg Safari na iPhonie) — po cichu; nieużywany od razu staje.
  for (const d of decks) {
    d.el.src = audioUrl(`m-${PLAYLISTS.camp[0]}.mp3`);
    d.el.play().then(() => { if (decks[active] !== d || !playing) d.el.pause(); }).catch(() => {});
  }
  if (on) crossTo(mood, FADE_FAST);
  document.addEventListener('visibilitychange', () => {
    const d = decks[active];
    if (!d) return;
    if (document.hidden) d.el.pause();
    else if (on && playing) d.el.play().catch(() => {});
  });
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
  if (m === mood) { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0; } return; }
  if (mood === 'boss' && m !== 'boss') {
    // Po bossie chwilę czekamy — między falami nie ma wroga, a boss może zaraz wrócić (np. w Leżu).
    if (leaveTimer) return;
    leaveTimer = window.setTimeout(() => { leaveTimer = 0; mood = m; if (on && decks.length) crossTo(m); }, LEAVE_BOSS_MS);
    return;
  }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0; }
  mood = m;
  if (on && decks.length) crossTo(m, m === 'boss' ? FADE_FAST : FADE);
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
