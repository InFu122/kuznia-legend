import { describe, expect, it } from 'vitest';
import { DUPE_STONES, HATCH_MS, MOUNTS, PETS, SEAL_FAME, SKILLS, SKILL_IDS, STARS_MAX, levelCost } from '../src/data';
import { openSaddle, openScroll, skillNeed, startHatch, tickHatch } from '../src/engine/companions';
import { equip, smelt } from '../src/engine/forge';
import { allMods } from '../src/engine/mods';
import { applyOffline } from '../src/engine/offline';
import { SAVE_VERSION, migrate, newState } from '../src/engine/state';
import { computeStats, extraOf } from '../src/engine/stats';
import { constRng, makeGame, simulate, T0 } from './helpers';

function geared(seed = 3) {
  const h = makeGame(seed);
  const { ctx, s } = h;
  s.forge.lvl = 40; s.ores[4] = 200; s.stats.smelted = 10;
  for (let i = 0; i < 200 && Object.keys(s.eq).length < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true); // wszystkie 8 slotów
  return h;
}

describe('umiejętności', () => {
  it('Zwoje działają dopiero po odblokowaniu, nowa umiejętność trafia do wolnego slotu', () => {
    const { ctx, s } = makeGame();
    s.scrolls = 5;
    expect(openScroll(ctx)).toBeNull();
    s.bestG = 4;
    const r = openScroll(ctx)!;
    expect(r.dupe).toBe(false);
    expect(s.skills.lv[r.id]).toBe(1);
    expect(s.skills.eq[0]).toBe(r.id);
    expect(s.scrolls).toBe(4);
  });

  it('duplikaty podnoszą poziom: z poziomu n na n+1 potrzeba n kopii', () => {
    const { ctx, s } = makeGame(1, constRng(0.01)); // zawsze najczęstsza rzadkość i pierwsza umiejętność z listy
    s.bestG = 4;
    s.scrolls = 1 + 1 + 2 + 3;
    for (let i = 0; i < 7; i++) openScroll(ctx);
    const id = SKILL_IDS.find(k => SKILLS[k].r === 0)!;
    expect(s.skills.lv[id]).toBe(4);
    expect(s.skills.cards[id]).toBe(0);
    expect(skillNeed(4)).toBe(4);
  });

  it('Deszcz Strzał rani wroga, Tarcza Run pochłania ciosy, Lodowa Nova zamraża', () => {
    const { g, s, events } = geared();
    s.skills.lv = { deszcz: 1, tarcza: 1, nova: 1 };
    s.skills.eq = ['deszcz', 'tarcza', 'nova'];
    g.ctx.cache = null;
    simulate(g, 5000);
    const texts = events.filter(e => e.t === 'float').map(e => (e as { text: string }).text);
    expect(texts.some(t => t.startsWith('Deszcz Strzał!'))).toBe(true);
    expect(texts).toContain('Tarcza Run');
    expect(texts).toContain('Lodowa Nova');
  });

  it('umiejętności podnoszą Moc', () => {
    const { s } = makeGame();
    const before = computeStats(s.eq, allMods(s), extraOf(s)).power;
    s.skills.lv = { oddech: 5 }; s.skills.eq = ['oddech', null, null];
    expect(computeStats(s.eq, allMods(s), extraOf(s)).power).toBeGreaterThan(before);
  });
});

describe('chowańce', () => {
  it('jajo wykluwa się po czasie i chowaniec sam staje do walki', () => {
    const { ctx, s } = makeGame();
    s.eggs[2] = 1;
    expect(startHatch(ctx, 2)).toBe(false); // przed aktem II
    s.maxLand = 4;
    expect(startHatch(ctx, 2)).toBe(true);
    expect(startHatch(ctx, 2)).toBe(false); // jedno jajo naraz
    expect(tickHatch(ctx, HATCH_MS[2] - 1, true)).toBeNull();
    const id = tickHatch(ctx, 1, true)!;
    expect(PETS[id].r).toBe(2);
    expect(s.petSel).toBe(id);
    expect(s.pets[id]).toEqual({ lvl: 1, stars: 0 });
  });

  it('chowaniec atakuje obok bohatera, a jego cecha działa', () => {
    const { g, s, events } = geared();
    s.pets = { kruk: { lvl: 1, stars: 0 } };
    s.petSel = 'kruk';
    g.ctx.cache = null;
    expect(g.stats.petInt).toBe(PETS.kruk.int);
    expect(allMods(s).goldPct).toBeCloseTo(PETS.kruk.tv);
    simulate(g, 4000);
    expect(events.some(e => e.t === 'float' && e.cls === 'pet')).toBe(true);
  });

  it('jaja wykluwają się też poza grą', () => {
    const { ctx, s } = makeGame();
    s.maxLand = 4; s.eggs[0] = 1;
    startHatch(ctx, 0);
    const r = applyOffline(ctx, 2 * 3600 * 1000)!;
    expect(r.hatched).not.toBeNull();
    expect(s.hatch).toBeNull();
  });
});

describe('wierzchowce i Kamienie', () => {
  it('Siodło daje wierzchowca, duplikat gwiazdkę, a nadmiar Kamienie', () => {
    const { ctx, s } = makeGame(1, constRng(0.01));
    s.maxLand = 8;
    s.saddles = STARS_MAX + 2;
    const first = openSaddle(ctx)!;
    expect(first.dupe).toBe(false);
    expect(s.mountSel).toBe(first.id);
    for (let i = 0; i < STARS_MAX; i++) openSaddle(ctx);
    expect(s.mounts[first.id]!.stars).toBe(STARS_MAX);
    const stones = s.stones;
    openSaddle(ctx);
    expect(s.stones).toBe(stones + DUPE_STONES);
  });

  it('wierzchowiec podnosi obrażenia i zdrowie, ulepszenie kosztuje Kamienie', () => {
    const { g, s } = makeGame();
    s.maxLand = 8;
    s.mounts = { kon: { lvl: 1, stars: 0 } };
    const base = g.stats;
    g.selectMount('kon');
    expect(g.stats.dmg / base.dmg).toBeCloseTo(1 + MOUNTS.kon.dmg / 100, 5);
    s.stones = levelCost(1, 0);
    expect(g.levelUp('mount', 'kon')).toBe(true);
    expect(s.stones).toBe(0);
    expect(s.mounts.kon!.lvl).toBe(2);
    expect(g.levelUp('mount', 'kon')).toBe(false);
  });
});

describe('Pieczęcie Legendy i nagrody z bossów', () => {
  it('Pieczęć dodaje Sławę Czynów i może podnieść próg legendy', () => {
    const { g, ctx, s } = makeGame();
    equip(ctx, smelt(ctx, 1, null)!, true);
    s.seals = 1;
    expect(g.useSeal('bron')).toBe(true);
    expect(s.eq.bron!.fame).toBe(SEAL_FAME);
    expect(s.eq.bron!.ls).toBe(1);
    expect(g.useSeal('bron')).toBe(false);
  });

  it('pierwsze pokonanie bossa 4. krainy daje jajo, Kamienie i Zwoje; boss 8. krainy — Siodła', () => {
    const { g, s } = geared();
    s.cleared = s.cleared.map((_, i) => i < 3);
    s.maxLand = 3; s.cur = { land: 3, stage: 10, wave: 1 };
    g.challengeBoss();
    simulate(g, 60000);
    expect(s.cleared[3]).toBe(true);
    expect(s.eggs[0]).toBe(1);
    expect(s.stones).toBeGreaterThan(0);
    expect(s.scrolls).toBeGreaterThan(0);
    s.cleared = s.cleared.map((_, i) => i < 7);
    s.maxLand = 7; s.cur = { land: 7, stage: 10, wave: 1 };
    s.forge.lvl = 30;
    g.challengeBoss();
    simulate(g, 120000);
    expect(s.cleared[7]).toBe(true);
    expect(s.saddles).toBeGreaterThan(0);
  });
});

describe('zapis', () => {
  it('migracja z wersji 3 dodaje nowe pola', () => {
    const old: Record<string, unknown> = { ...newState(T0), v: 3 };
    for (const k of ['scrolls', 'skills', 'eggs', 'hatch', 'pets', 'petSel', 'saddles', 'mounts', 'mountSel', 'stones', 'seals', 'found']) delete old[k];
    const s = migrate(old, T0);
    expect(s.skills.eq).toEqual([null, null, null]);
    expect(s.eggs).toEqual([0, 0, 0, 0, 0]);
    expect(s.found).toEqual([]);
    expect(s.stones).toBe(0);
    expect(s.v).toBe(SAVE_VERSION);
  });
});
