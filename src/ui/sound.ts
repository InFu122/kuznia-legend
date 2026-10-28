// Dźwięki syntezowane w Web Audio — bez plików, więc gra zostaje jednym lekkim plikiem.
// Przeglądarki pozwalają włączyć dźwięk dopiero po geście gracza, więc kontekst powstaje przy pierwszym dotknięciu.
import type { SfxKind } from '../engine/types';

type Kind = SfxKind | 'drop' | 'dropRare';

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;
const last: Partial<Record<Kind, number>> = {};
/** Minimalny odstęp między powtórzeniami tego samego dźwięku (ms) — przy Tempie ×10 trafień jest bardzo dużo. */
const GAP: Partial<Record<Kind, number>> = { hit: 110, crit: 90, hurt: 140, skill: 120, drop: 80, smelt: 60 };

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
  master.connect(ac.destination);
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
  switch (k) {
    case 'smelt': clang(t); break;
    case 'jump': // młot + arpeggio: im wyższa rzadkość, tym dłuższe
      clang(t);
      for (let i = 0; i <= Math.min(6, r + 1); i++) tone(PENTA[i], t + 0.12 + i * 0.07, 0.35, 'triangle', 0.12);
      break;
    case 'rare':
      for (let i = 0; i <= Math.min(6, r + 1); i++) tone(PENTA[i] * 1.5, t + i * 0.06, 0.4, 'triangle', 0.09);
      break;
    case 'hit': tone(150, t, 0.08, 'sine', 0.12, 60); noise(t, 0.03, 900, 0.08); break;
    case 'crit': tone(220, t, 0.1, 'triangle', 0.14, 80); noise(t, 0.05, 2400, 0.16, 1.5); break;
    case 'hurt': tone(110, t, 0.12, 'sine', 0.1, 50); break;
    case 'skill': noise(t, 0.22, 1400, 0.14, 0.6); tone(440, t, 0.22, 'sine', 0.06, 880); break;
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
