// Dźwięki w Web Audio: kucie i nagrody są syntezowane, a walka używa krótkich próbek (public/audio/s-*.mp3).
// Gdy próbka jeszcze się nie wczytała (albo nie ma pliku), gra syntezuje zastępczy dźwięk.
// Przeglądarki pozwalają włączyć dźwięk dopiero po geście gracza, więc kontekst powstaje przy pierwszym dotknięciu.
import type { SfxKind } from '../engine/types';

type Kind = SfxKind | 'drop' | 'dropRare' | 'strike' | 'bossIn';

let ac: AudioContext | null = null;
let master: GainNode | null = null;
/** Pogłos (krótka sala) — wysyłka z dźwięków walki dodaje im głębi. */
let verb: GainNode | null = null;
let enabled = true;
let volume = 0.6;
const last: Partial<Record<Kind, number>> = {};
/** Minimalny odstęp między powtórzeniami tego samego dźwięku (ms) — przy Tempie ×10 trafień jest bardzo dużo. */
const GAP: Partial<Record<Kind, number>> = { hit: 170, crit: 140, hurt: 140, skill: 120, drop: 80, smelt: 60, dodge: 160, block: 160, bossIn: 3000, kill: 140 };

/** Próbki dźwięków walki (pliki obok gry, w katalogu audio/). */
const SAMPLES = { slice: 's-slice.mp3', block: 's-block.mp3', whoosh: 's-whoosh.mp3', war: 's-war.mp3' } as const;
type SampleId = keyof typeof SAMPLES;
const buffers: Partial<Record<SampleId, AudioBuffer>> = {};

/** Adres pliku dźwiękowego — względem strony, więc działa i na serwerze, i w artefakcie. */
export const audioUrl = (file: string) => new URL('audio/' + file, document.baseURI).href;

function loadSamples(): void {
  for (const [id, file] of Object.entries(SAMPLES) as [SampleId, string][]) {
    fetch(audioUrl(file))
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(b => ac!.decodeAudioData(b))
      .then(buf => { buffers[id] = buf; })
      .catch(() => { /* zostaje dźwięk syntezowany */ });
  }
}

/**
 * Odtwarza próbkę; `false`, gdy jej jeszcze nie ma. Lekko losowa wysokość, żeby seria trafień nie brzmiała jak jedno.
 * `lp` — filtr dolnoprzepustowy (Hz): łagodzi ostre, wysokie tony.
 */
function sample(id: SampleId, t: number, gain: number, rate = 1, spread = 0.08, wet = 0, lp = 0): boolean {
  const b = buffers[id];
  if (!b || !ac || !master) return false;
  const s = ac.createBufferSource();
  s.buffer = b;
  s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * spread);
  const g = ac.createGain();
  g.gain.value = gain;
  if (lp > 0) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    s.connect(f).connect(g).connect(master);
  } else s.connect(g).connect(master);
  if (wet > 0 && verb) { const w = ac.createGain(); w.gain.value = gain * wet; g.connect(w).connect(verb); }
  s.start(t);
  return true;
}

/** Odpowiedź impulsowa krótkiej, kamiennej sali (szum z wygasaniem) — bez plików. */
function hall(c: AudioContext, sec = 1.3): AudioBuffer {
  const len = Math.floor(c.sampleRate * sec);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

/** Muzyka ścisza się na chwilę przy ważnych dźwiękach (ustawia ją music.ts). */
let duckHook: ((ms: number) => void) | null = null;
export const setDuckHook = (fn: (ms: number) => void) => { duckHook = fn; };
const DUCK: Partial<Record<Kind, number>> = { rare: 1800, alert: 2200, jump: 900, boss: 2200, win: 1500, lose: 1500, levelup: 1600, bossIn: 3200 };

/** Kontekst audio gry (muzyka gra przez ten sam). */
export const audioCtx = () => ac;

export function setSound(on: boolean, vol: number): void {
  enabled = on;
  volume = vol;
  if (master) master.gain.value = vol * 0.5;
}

/** Wołane przy pierwszym geście gracza. */
export function unlockAudio(): void {
  if (ac) { if (ac.state === 'suspended') void ac.resume(); return; }
  const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ac = new Ctor();
  master = ac.createGain();
  master.gain.value = volume * 0.5;
  // Kompresor skleja warstwy (cięcie + uderzenie + pogłos) i pozwala im brzmieć głośniej bez przesterowania.
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  master.connect(comp).connect(ac.destination);
  const conv = ac.createConvolver();
  conv.buffer = hall(ac);
  verb = ac.createGain();
  verb.gain.value = 0.9;
  verb.connect(conv).connect(comp);
  if (ac.state === 'suspended') void ac.resume();
  loadSamples();
}

function tone(freq: number, t0: number, dur: number, type: OscillatorType, peak: number, endFreq?: number): void {
  const o = ac!.createOscillator();
  const g = ac!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master!);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(t0: number, dur: number, freq: number, peak: number, q = 1): void {
  const len = Math.max(1, Math.floor(ac!.sampleRate * dur));
  const buf = ac!.createBuffer(1, len, ac!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac!.createBufferSource();
  src.buffer = buf;
  const f = ac!.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac!.createGain();
  g.gain.value = peak;
  src.connect(f).connect(g).connect(master!);
  src.start(t0);
}

/** Głuche uderzenie w ciało: opadający niski ton i stłumiony szum — daje „mięso” każdemu trafieniu. */
function thump(t0: number, f0: number, f1: number, dur: number, peak: number, wet = 0): void {
  const o = ac!.createOscillator();
  const g = ac!.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master!);
  if (wet > 0 && verb) { const w = ac!.createGain(); w.gain.value = wet; g.connect(w).connect(verb); }
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  // stłumiony szum uderzenia
  const len = Math.max(1, Math.floor(ac!.sampleRate * dur * 0.6));
  const buf = ac!.createBuffer(1, len, ac!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ac!.createBufferSource();
  src.buffer = buf;
  const f = ac!.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  const ng = ac!.createGain();
  ng.gain.value = peak * 0.7;
  src.connect(f).connect(ng).connect(master!);
  src.start(t0);
}

/** Brzęk monet po pokonaniu wroga — krótki, jasny, „nagradzający”. */
function coins(t0: number, n = 3, peak = 0.05): void {
  const notes = [2093, 2637, 3136, 2349];
  for (let i = 0; i < n; i++) {
    const tt = t0 + i * 0.045 + Math.random() * 0.015;
    tone(notes[i % notes.length] * (1 + (Math.random() - 0.5) * 0.02), tt, 0.16, 'triangle', peak);
    tone(notes[i % notes.length] * 2.76, tt, 0.07, 'sine', peak * 0.35);
  }
}

/** Uderzenie młota: krótki szum i nieharmoniczne alikwoty metalu. */
function clang(t: number, pitch = 1, peak = 0.22): void {
  noise(t, 0.06, 3200, peak * 1.6, 0.8);
  for (const [f, a, d] of [[620, 1, 0.55], [1583, 0.55, 0.35], [2470, 0.3, 0.25], [3910, 0.15, 0.15]] as const) tone(f * pitch, t, d, 'sine', peak * a);
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export function play(k: Kind, r = 0): void {
  if (!enabled || !ac || !master || ac.state !== 'running') return;
  const now = performance.now();
  if (GAP[k] && now - (last[k] ?? 0) < GAP[k]!) return;
  last[k] = now;
  const t = ac.currentTime + 0.005;
  if (DUCK[k]) duckHook?.(DUCK[k]!);
  switch (k) {
    case 'smelt': clang(t); break;
    case 'strike': // uderzenie w animacji wykuwania: przy każdej wyższej rzadkości wyższy ton
      clang(t, 1 + r * 0.06, 0.2);
      if (r > 0) { tone(PENTA[Math.min(7, r)], t + 0.05, 0.3, 'triangle', 0.1); tone(PENTA[Math.min(7, r)] * 2, t + 0.05, 0.2, 'sine', 0.04); }
      break;
    case 'jump': // młot + arpeggio: im wyższa rzadkość, tym dłuższe
      clang(t);
      for (let i = 0; i <= Math.min(6, r + 1); i++) tone(PENTA[i], t + 0.12 + i * 0.07, 0.35, 'triangle', 0.12);
      break;
    case 'rare':
      for (let i = 0; i <= Math.min(6, r + 1); i++) tone(PENTA[i] * 1.5, t + i * 0.06, 0.4, 'triangle', 0.09);
      break;
    case 'hit': // cichy zamach i miękkie, głuche uderzenie (bez ostrego zgrzytu stali — słychać go setki razy)
      sample('whoosh', t, 0.14, 1.05, 0.1, 0, 2600);
      if (!sample('slice', t + 0.045, 0.1, 0.78, 0.1, 0.05, 1500)) noise(t, 0.03, 700, 0.04);
      thump(t + 0.05, 150, 55, 0.11, 0.15);
      break;
    case 'crit': // trochę mocniej niż zwykłe trafienie, nadal stłumione
      sample('whoosh', t, 0.22, 0.9, 0.08, 0, 2400);
      if (!sample('slice', t + 0.04, 0.22, 0.7, 0.04, 0.15, 2000)) noise(t, 0.05, 1600, 0.08, 1.2);
      thump(t + 0.045, 130, 40, 0.24, 0.26, 0.15);
      tone(1975.5, t + 0.05, 0.18, 'sine', 0.025);
      break;
    case 'hurt': // wróg trafia bohatera: jego zamach i ciężkie uderzenie
      sample('whoosh', t, 0.2, 0.7);
      thump(t + 0.06, 120, 40, 0.18, 0.3, 0.1);
      break;
    case 'kill': // wróg pada: „pop” i brzęk złota
      thump(t, 240, 70, 0.12, 0.22, 0.15);
      coins(t + 0.06, 3, 0.045);
      break;
    case 'dodge': if (!sample('whoosh', t, 0.32, 1.35, 0.08, 0.1)) noise(t, 0.12, 2600, 0.06, 0.6); break;
    case 'block': if (!sample('block', t, 0.5, 1, 0.06, 0.3)) clang(t, 1.3, 0.12); thump(t, 200, 90, 0.08, 0.12); break;
    case 'bossIn': sample('war', t, 0.6, 1, 0, 0.2); thump(t, 90, 30, 0.6, 0.35, 0.3); break;
    case 'skill': noise(t, 0.22, 1400, 0.14, 0.6); tone(440, t, 0.22, 'sine', 0.06, 880); sample('whoosh', t, 0.25, 0.7); break;
    case 'drop': tone(1760, t, 0.18, 'sine', 0.08); tone(2637, t + 0.03, 0.2, 'sine', 0.05); break;
    case 'dropRare': tone(1568, t, 0.25, 'sine', 0.1); tone(2093, t + 0.08, 0.3, 'sine', 0.09); tone(3136, t + 0.16, 0.35, 'sine', 0.06); break;
    case 'boss': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.12, i === 3 ? 0.8 : 0.25, 'triangle', 0.16)); break;
    case 'win': [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.1, 0.3, 'triangle', 0.13)); break;
    case 'lose': tone(392, t, 0.3, 'triangle', 0.12, 330); tone(311, t + 0.25, 0.5, 'triangle', 0.12, 247); break;
    case 'levelup': tone(330, t, 0.4, 'sawtooth', 0.05, 990); clang(t + 0.35, 1.25, 0.18); break;
    case 'claim': tone(987.77, t, 0.12, 'square', 0.05); tone(1318.5, t + 0.08, 0.3, 'square', 0.05); break;
    case 'alert': // dzwon: auto-wytop zatrzymany na wybranej rzadkości
      clang(t, 1.5, 0.2);
      [783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => { tone(f, t + 0.1 + i * 0.11, 0.6, 'sine', 0.14); tone(f * 2.01, t + 0.1 + i * 0.11, 0.3, 'sine', 0.04); });
      for (let i = 0; i <= Math.min(6, r); i++) tone(PENTA[i] * 2, t + 0.6 + i * 0.05, 0.3, 'triangle', 0.06);
      break;
  }
}
