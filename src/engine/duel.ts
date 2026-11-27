// Pojedynek na arenie: bohater przeciw kopii bohatera innego gracza. Liczy go serwer (z ziarnem),
// a gra tylko odtwarza przebieg. Zasady jak w zwykłej walce: ataki, krytyki, uniki, kradzież życia,
// regeneracja, chowaniec i umiejętności. Po 20 s narasta zmęczenie, więc walka zawsze się kończy.
import { SKILLS, skillValue } from '../data';
import { mulberry32, rnd, type Rng } from './rng';
import type { SkillId, Stats } from './types';

export interface FighterStats {
  dmg: number; hp: number; crit: number; critd: number; spd: number; ls: number; dodge: number; regen: number;
  eldmg: number; slow: number; petAtk: number; petInt: number;
}
export interface Fighter { name: string; st: FighterStats; skills: { id: SkillId; lvl: number }[] }

/** Zdarzenie walki do odtworzenia: [czas ms, strona (0 atakujący, 1 obrońca), rodzaj, wartość, umiejętność].
 *  Rodzaje: 'h' cios, 'c' trafienie krytyczne, 'd' unik przeciwnika, 'p' cios chowańca,
 *  's' umiejętność (wartość: obrażenia, leczenie, tarcza albo czas zamrożenia w ms; 0 przy wzmocnieniach). */
export type DuelEv = [number, 0 | 1, 'h' | 'c' | 'd' | 'p' | 's', number] | [number, 0 | 1, 's', number, SkillId];

export interface DuelResult {
  win: boolean;                 // wygrał atakujący (a)
  ms: number;                   // czas walki
  frames: [number, number][];   // zdrowie obu stron w % co FRAME_MS
  crits: [number, number];
  skills: [number, number];
  ev: DuelEv[];                 // przebieg walki (najwyżej EV_MAX zdarzeń)
}

export const DUEL_STEP_MS = 50;
export const DUEL_FRAME_MS = 250;
export const DUEL_MAX_MS = 60000;
/** Najwięcej zapisanych zdarzeń (dalszy przebieg widać już tylko na paskach życia). */
export const EV_MAX = 700;
const FATIGUE_FROM = 20000;
const STUN_PVP = 0.5;           // na arenie zamrożenie trwa o połowę krócej

export function fighterStats(st: Stats): FighterStats {
  return {
    dmg: st.dmg, hp: st.hp, crit: st.crit, critd: st.critd, spd: st.spd, ls: st.ls, dodge: st.dodge, regen: st.regen,
    eldmg: st.eldmg, slow: st.slow, petAtk: st.petAtk, petInt: st.petInt,
  };
}

/** Kopia bohatera osłabiona albo wzmocniona (duchy areny). */
export function scaleFighter(f: Fighter, k: number, name: string): Fighter {
  return { name, skills: f.skills, st: { ...f.st, dmg: f.st.dmg * k, hp: f.st.hp * k, petAtk: f.st.petAtk * k } };
}

interface Side {
  i: 0 | 1; f: Fighter; hp: number; max: number; ht: number; pt: number; cd: number[];
  dmgT: number; dmgV: number; spdT: number; spdV: number; lsT: number; lsV: number;
  shield: number; shieldT: number; stunT: number; crits: number; casts: number;
}

const side = (f: Fighter, i: 0 | 1): Side => ({
  i, f, hp: f.st.hp, max: f.st.hp, ht: 0, pt: 0, cd: f.skills.map(() => 1500),
  dmgT: 0, dmgV: 0, spdT: 0, spdV: 0, lsT: 0, lsV: 0, shield: 0, shieldT: 0, stunT: 0, crits: 0, casts: 0,
});

function hurt(x: Side, d: number): void {
  if (x.shield > 0) { const a = Math.min(x.shield, d); x.shield -= a; d -= a; }
  x.hp -= d;
}

type Rec = (s: 0 | 1, k: DuelEv[2], v: number, id?: SkillId) => void;

function act(rng: Rng, me: Side, foe: Side, ms: number, fatigue: number, rec: Rec): void {
  const st = me.f.st;
  for (let i = 0; i < me.cd.length; i++) me.cd[i] = Math.max(0, me.cd[i] - ms);
  me.dmgT -= ms; me.spdT -= ms; me.lsT -= ms; me.stunT -= ms; me.shieldT -= ms;
  if (me.shieldT <= 0) me.shield = 0;
  const bonus = 1 + (st.eldmg + (me.dmgT > 0 ? me.dmgV : 0)) / 100;

  me.f.skills.forEach(({ id, lvl }, i) => {
    if (me.cd[i] > 0 || foe.hp <= 0) return;
    const S = SKILLS[id];
    const v = skillValue(id, lvl);
    let shown = 0;
    switch (S.kind) {
      case 'dmg': shown = st.dmg * (v / 100) * bonus * fatigue; hurt(foe, shown); break;
      case 'heal': { if (me.hp > 0.6 * me.max) return; const was = me.hp; me.hp = Math.min(me.max, me.hp + me.max * v / 100); shown = me.hp - was; break; }
      case 'shield': me.shield = me.max * v / 100; me.shieldT = S.dur; shown = me.shield; break;
      case 'buffDmg': me.dmgT = S.dur; me.dmgV = v; break;
      case 'buffSpd': me.spdT = S.dur; me.spdV = v; break;
      case 'buffLs': me.lsT = S.dur; me.lsV = v; break;
      case 'stun': shown = v * 1000 * STUN_PVP; foe.stunT = Math.max(foe.stunT, shown); break;
    }
    me.cd[i] = S.cd;
    me.casts++;
    rec(me.i, 's', shown, id);
  });

  if (me.stunT <= 0) {
    const int = (1000 / (1 + (st.spd + (me.spdT > 0 ? me.spdV : 0)) / 100)) * (1 + foe.f.st.slow / 100);
    me.ht += ms;
    let guard = 0;
    while (me.ht >= int && foe.hp > 0 && guard++ < 50) {
      me.ht -= int;
      if (rng.next() < foe.f.st.dodge / 100) { rec(me.i, 'd', 0); continue; }
      let d = st.dmg * rnd(rng, 0.92, 1.08) * bonus * fatigue;
      let crit = false;
      if (rng.next() < st.crit / 100) { d *= 1 + st.critd / 100; me.crits++; crit = true; }
      hurt(foe, d);
      rec(me.i, crit ? 'c' : 'h', d);
      const ls = st.ls + (me.lsT > 0 ? me.lsV : 0);
      me.hp = Math.min(me.max, me.hp + d * ls / 100);
    }
    if (st.petInt > 0) {
      me.pt += ms;
      guard = 0;
      while (me.pt >= st.petInt && foe.hp > 0 && guard++ < 20) {
        me.pt -= st.petInt;
        const d = st.petAtk * rnd(rng, 0.9, 1.1) * fatigue;
        hurt(foe, d);
        rec(me.i, 'p', d);
      }
    }
  }
  if (me.hp > 0) me.hp = Math.min(me.max, me.hp + (me.max * st.regen / 100) * ms / 1000);
}

const pct = (x: Side) => Math.max(0, Math.round((x.hp / x.max) * 100));

/** Rozgrywa pojedynek a (atakujący) przeciw b (obrońca). Wynik zależy tylko od bohaterów i ziarna. */
export function duel(a: Fighter, b: Fighter, seed: number): DuelResult {
  const rng = mulberry32(seed);
  const A = side(a, 0), Bs = side(b, 1);
  const frames: [number, number][] = [[100, 100]];
  const ev: DuelEv[] = [];
  let t = 0;
  const rec: Rec = (s, k, v, id) => {
    if (ev.length >= EV_MAX) return;
    const x = Math.round(v);
    ev.push(id ? [t, s, 's', x, id] : [t, s, k, x]);
  };
  while (t < DUEL_MAX_MS && A.hp > 0 && Bs.hp > 0) {
    t += DUEL_STEP_MS;
    const fatigue = t > FATIGUE_FROM ? 1 + (t - FATIGUE_FROM) / 5000 : 1;
    act(rng, A, Bs, DUEL_STEP_MS, fatigue, rec);
    if (Bs.hp > 0) act(rng, Bs, A, DUEL_STEP_MS, fatigue, rec);
    if (t % DUEL_FRAME_MS === 0) frames.push([pct(A), pct(Bs)]);
  }
  const last: [number, number] = [pct(A), pct(Bs)];
  if (frames[frames.length - 1][0] !== last[0] || frames[frames.length - 1][1] !== last[1]) frames.push(last);
  // Remis albo koniec czasu: wygrywa ten, komu zostało więcej zdrowia (przy równym — obrońca).
  const win = Bs.hp <= 0 ? true : A.hp <= 0 ? false : A.hp / A.max > Bs.hp / Bs.max;
  return { win, ms: t, frames, crits: [A.crits, Bs.crits], skills: [A.casts, Bs.casts], ev };
}

/** Zmiana oceny (Elo). */
export function eloDelta(mine: number, theirs: number, win: boolean, k = 32): number {
  const exp = 1 / (1 + Math.pow(10, (theirs - mine) / 400));
  return Math.round(k * ((win ? 1 : 0) - exp));
}
