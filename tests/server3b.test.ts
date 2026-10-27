import { describe, expect, it } from 'vitest';
import { B, KIND_POOL_SIZES, ORES, SET_FORGE_LVL, SLOTS } from '../src/data';
import { duel, eloDelta, scaleFighter, type Fighter } from '../src/engine/duel';
import { equip, sell, smelt, smeltDraws } from '../src/engine/forge';
import { techMods } from '../src/engine/mods';
import { mulberry32 } from '../src/engine/rng';
import { migrate } from '../src/engine/state';
import type { Item } from '../src/engine/types';
import { hasProof, verifySmelt } from '../src/engine/verify';
import { constRng, makeGame } from './helpers';

/** Ziarna „serwera” do testów: numer wytopu → ziarno. */
const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;
const seedsFrom = (from: number, n: number) => Array.from({ length: n }, (_, i) => seedFor(from + i));

function seededGame(rngSeed = 3) {
  const h = makeGame(rngSeed);
  h.s.seeds = seedsFrom(0, 5000);
  return h;
}

describe('wytop z ziarnem serwera', () => {
  it('serwer odtwarza każdy wytop: rudy, poziomy kuźni, domieszki, zestawy i pewne przeskoki', () => {
    const { ctx, s } = seededGame();
    s.ores = s.ores.map(() => 1000);
    s.els = { zar: 500 };
    s.uniq = { lowca: 300 };
    let pity = 0, sets = 0, n = 0;
    for (const lvl of [1, 3, 8, 12, 16, 22, 30]) {
      s.forge.lvl = lvl;
      s.uniqSel = lvl >= SET_FORGE_LVL ? 'lowca' : null;
      for (let o = 0; o < ORES.length; o++) {
        if (ORES[o].lvl > lvl) continue;
        for (let i = 0; i < 40; i++) {
          const it = smelt(ctx, o, 'zar')!;
          expect(it.sx).toBe(n++);
          expect(verifySmelt(it, seedFor(it.sx!), techMods(s).jumpRel, s.forge.lvl)).toBeNull();
          if (it.forced === 'pity') pity++;
          if (it.set) sets++;
          if (i % 3 === 0) equip(ctx, it, true); // zestawy trafiają w różne miejsca
        }
      }
    }
    expect(s.sx).toBe(n);
    expect(sets).toBeGreaterThan(0);
    expect(pity + sets).toBeGreaterThan(0);
  });

  it('ten sam numer wytopu daje ten sam przedmiot — nie da się go powtórzyć z innym wynikiem', () => {
    const a = seededGame(1), b = seededGame(999);
    for (const h of [a, b]) { h.s.forge.lvl = 20; h.s.ores[3] = 50; h.s.stats.smelted = 5; }
    for (let i = 0; i < 30; i++) {
      const x = smelt(a.ctx, 3, null)!, y = smelt(b.ctx, 3, null)!;
      expect({ ...x, id: 0 }).toEqual({ ...y, id: 0 });
    }
  });

  it('serwer wykrywa zmieniony przedmiot', () => {
    const { ctx, s } = seededGame();
    s.forge.lvl = 25; s.ores[2] = 200; s.stats.smelted = 5;
    const items: Item[] = Array.from({ length: 60 }, () => smelt(ctx, 2, null)!);
    const check = (it: Item) => verifySmelt(it, seedFor(it.sx!), 0, s.forge.lvl);
    const plain = items.find(it => it.jump === 0 && it.forced === '')!;
    expect(check({ ...plain, r: plain.r + 1, jump: 1 })).not.toBeNull();                       // przeskok bez wylosowania
    expect(check({ ...plain, subs: plain.subs.map(x => ({ ...x, v: x.v + 1 })) })).not.toBeNull(); // lepsze statystyki
    expect(check({ ...plain, lvl: plain.lvl + 2 })).not.toBeNull();                             // wyższy poziom
    expect(check({ ...plain, flvl: 30 })).not.toBeNull();                                        // kuźnia z przyszłości
    expect(check({ ...plain, forced: 'pity', r: plain.r + 1, jump: 1, subs: plain.subs })).not.toBeNull();
    expect(verifySmelt(plain, seedFor(plain.sx! + 1), 0, s.forge.lvl)).not.toBeNull();          // cudze ziarno
  });

  it('przedmiot wykuty przy dawnej, krótszej liście rodzajów nadal przechodzi kontrolę', () => {
    const { ctx, s } = seededGame(8);
    s.forge.lvl = 20; s.ores[2] = 500; s.stats.smelted = 5;
    let checked = 0;
    for (let i = 0; i < 300 && checked < 10; i++) {
      const it = smelt(ctx, 2, null)!;
      if (it.set) continue;
      const kinds = SLOTS[it.slot].kinds;
      const u = smeltDraws(mulberry32(seedFor(it.sx!))).kind;
      const old = kinds[Math.floor(u * KIND_POOL_SIZES[it.slot][0])];
      const legacy = { ...it, kind: old[0], g: old[1] };
      expect(verifySmelt(legacy, seedFor(it.sx!), 0, s.forge.lvl)).toBeNull();
      const wrong = kinds.find(k => k[0] !== old[0] && k[0] !== it.kind);
      if (wrong) expect(verifySmelt({ ...it, kind: wrong[0], g: wrong[1] }, seedFor(it.sx!), 0, s.forge.lvl)).not.toBeNull();
      checked++;
    }
    expect(checked).toBe(10);
  });

  it('bez ziaren gra wytapia jak dawniej, a przedmiot nie ma dowodu pochodzenia', () => {
    const { ctx, s } = makeGame(5);
    const it = smelt(ctx, 0, null)!;
    expect(it.sx).toBeUndefined();
    expect(hasProof(it)).toBe(false);
    expect(s.sx).toBe(0);
  });

  it('nowa gra od zera zachowuje numer wytopu i ziarna', () => {
    const { g, ctx, s } = seededGame();
    for (let i = 0; i < 5; i++) smelt(ctx, 0, null);
    const left = s.seeds.length;
    g.reset();
    expect(g.s.sx).toBe(5);
    expect(g.s.seeds.length).toBe(left);
  });

  it('dobieranie ziaren pasuje tylko do końca kolejki', () => {
    const { g } = makeGame(1);
    expect(g.seedNeed()).toEqual({ from: 0, n: B.SEEDS_RESERVE });
    expect(g.addSeeds(5, [1, 2])).toBe(false);
    expect(g.addSeeds(0, [1, 2, 3])).toBe(true);
    expect(g.seedNeed()).toEqual({ from: 3, n: B.SEEDS_RESERVE - 3 });
  });

  it('stary zapis (v5) dostaje puste ziarna i kolejki Obiegu', () => {
    const s = migrate({ v: 5, name: 'Stary', stats: { smelted: 40 } }, 0);
    expect(s.sx).toBe(0);
    expect(s.seeds).toEqual([]);
    expect(s.obIn).toEqual([]);
    expect(s.obOut).toEqual([]);
  });
});

describe('Wielki Obieg z serwerem', () => {
  const netGame = () => {
    const h = makeGame(2);
    h.ctx.net = true;
    return h;
  };

  it('sprzedany przedmiot z ziarnem czeka w kolejce do wysłania', () => {
    const { ctx, s } = netGame();
    s.seeds = seedsFrom(0, 50);
    s.forge.lvl = 20; s.ores[3] = 50; s.stats.smelted = 5;
    ctx.rng = constRng(0); // pewna szansa Obiegu
    const it = smelt({ ...ctx, rng: mulberry32(1) }, 3, null)!;
    sell(ctx, it, true);
    expect(s.obOut).toHaveLength(1);
    expect(s.smith.sent).toHaveLength(0);
  });

  it('skrzynia bossa i Zbrojownia biorą prawdziwe znaleziska z zapasu, bez zmian w podpisanych polach', async () => {
    const { g, s } = netGame();
    const real: Item = {
      id: 0, slot: 'helm', kind: 'Hełm', g: 'm', ore: 1, r: 2, lvl: 9, subs: [{ id: 'crit', v: 3 }], el: null, jump: 1, flvl: 4, forced: '',
      smith: 'Ola', land: 'Las', fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: ['Ola'], obieg: true, set: null, sig: 'abc',
    };
    g.obiegIn([real], [{ who: 'Marek', n: 'Miecz', r: 3 }]);
    expect(s.obIn).toHaveLength(1);
    expect(s.smith.fame).toBe(40);
    const { takeObieg } = await import('../src/engine/obieg');
    const got = takeObieg(g.ctx)!;
    expect(got.sig).toBe('abc');
    expect(got.id).toBeGreaterThan(0);
    expect(takeObieg(g.ctx)).toBeNull(); // pusty zapas: z serwerem nie ma symulowanych znalezisk
  });

  it('z serwerem nie ma symulowanych wieści, a tempo testowe tylko gdy pozwala serwer', async () => {
    const { g, ctx, s } = netGame();
    const { obiegEvent } = await import('../src/engine/obieg');
    s.smith.sent.push({ n: 'Miecz', r: 3 });
    s.smith.fame = 100;
    obiegEvent(ctx);
    expect(s.smith.fame).toBe(100);
    g.setMaxSpeed(1);                // serwer bez trybu testowego
    g.toggleSpeed();
    expect(s.speed).toBe(1);
    expect(g.speeds).toEqual([1]);
    g.setMaxSpeed(100);              // tryb testowy serwera
    g.setSpeed(50);
    expect(s.speed).toBe(50);
    g.setMaxSpeed(10);               // serwer obniżył limit — najszybsze dozwolone
    expect(s.speed).toBe(10);
    g.setMaxSpeed(100);              // wybór gracza wraca, gdy znów wolno
    expect(s.speed).toBe(50);
    g.setMaxSpeed(1);
    expect(s.speed).toBe(1);
  });

  it('bez serwera tempo testowe: ×1, ×10, ×50, ×100', () => {
    const { g, s } = makeGame(1);
    expect(g.speeds).toEqual([1, 10, 50, 100]);
    g.toggleSpeed(); expect(s.speed).toBe(10);
    g.toggleSpeed(); expect(s.speed).toBe(50);
    g.toggleSpeed(); expect(s.speed).toBe(100);
    g.toggleSpeed(); expect(s.speed).toBe(1);
    g.setSpeed(7); expect(s.speed).toBe(1);
  });
});

describe('arena', () => {
  const hero = (k: number, name = 'A'): Fighter => ({
    name, skills: [{ id: 'deszcz', lvl: 3 }, { id: 'tarcza', lvl: 2 }],
    st: { dmg: 100 * k, hp: 1500 * k, crit: 15, critd: 60, spd: 10, ls: 2, dodge: 5, regen: 1, eldmg: 0, slow: 0, petAtk: 10 * k, petInt: 1500 },
  });

  it('pojedynek zależy tylko od bohaterów i ziarna', () => {
    expect(duel(hero(1), hero(1, 'B'), 42)).toEqual(duel(hero(1), hero(1, 'B'), 42));
  });

  it('silniejszy bohater wygrywa zdecydowaną większość walk, a walka zawsze się kończy', () => {
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const r = duel(hero(1.3), hero(1, 'B'), i);
      expect(r.ms).toBeLessThanOrEqual(60000);
      expect(r.frames.every(([a, b]) => a >= 0 && a <= 100 && b >= 0 && b <= 100)).toBe(true);
      if (r.win) wins++;
    }
    expect(wins).toBeGreaterThan(85);
  });

  it('równi bohaterowie wygrywają mniej więcej po równo', () => {
    let wins = 0;
    for (let i = 0; i < 200; i++) if (duel(hero(1), hero(1, 'B'), 1000 + i).win) wins++;
    expect(wins).toBeGreaterThan(60);
    expect(wins).toBeLessThan(140);
  });

  it('duch areny to przeskalowana kopia bohatera', () => {
    const d = scaleFighter(hero(1), 1.15, 'Duch');
    expect(d.st.hp).toBeCloseTo(1725);
    expect(d.st.crit).toBe(15);
  });

  it('ocena: wygrana z silniejszym daje więcej niż z słabszym', () => {
    expect(eloDelta(1000, 1200, true)).toBeGreaterThan(eloDelta(1000, 800, true));
    expect(eloDelta(1000, 1000, false)).toBe(-16);
  });
});
