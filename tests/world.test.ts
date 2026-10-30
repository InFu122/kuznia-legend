import { describe, expect, it } from 'vitest';
import { B, LANDS, TECH } from '../src/data';
import { forgeExp, gAtForge, goldG, goldWave, goldWaveOf } from '../src/engine/formulas';
import { equip, smelt } from '../src/engine/forge';
import { applyOffline, offlineCapMs } from '../src/engine/offline';
import { techText } from '../src/engine/tech';
import { migrate, newState } from '../src/engine/state';
import { makeGame, simulate, T0 } from './helpers';

describe('walka i postęp', () => {
  it('bohater z auto-wytopem przechodzi pierwsze etapy bez błędów liczbowych', () => {
    const { g, s } = makeGame(3);
    s.forge.lvl = 5;
    s.ores[0] = 40; s.ores[1] = 40;
    s.auto = true;
    // Auto-wytop staje na przeskoku; gracz zakłada przedmiot i włącza auto ponownie.
    for (let i = 0; i < 600; i++) {
      simulate(g, 1000);
      if (s.pending) g.equipPending();
    }
    expect(s.cur.stage + s.cur.land * 10).toBeGreaterThan(3);
    expect(Number.isFinite(g.b.heroHp)).toBe(true);
    expect(Number.isFinite(s.gold)).toBe(true);
    expect(s.stats.kills).toBeGreaterThan(50);
  });

  it('pokonanie bossa odblokowuje następną krainę', () => {
    const { g, ctx, s, events } = makeGame(5);
    s.forge.lvl = 30; s.ores[4] = 8; s.stats.smelted = 10;
    for (let i = 0; i < 8; i++) equip(ctx, smelt(ctx, 4, null)!, true); // mocny ekwipunek
    s.cur.stage = 10;
    g.challengeBoss();
    expect(g.b.enemy?.boss).toBe(true);
    simulate(g, 60000);
    expect(s.cleared[0]).toBe(true);
    expect(s.maxLand).toBe(1);
    expect(s.cur.land).toBe(1);
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'boss')).toBe(true);
  });

  it('złoto wypada z każdej fali, ruda tylko z części fal', () => {
    const { g, s, events } = makeGame(9);
    s.forge.lvl = 30; s.ores[4] = 8; s.stats.smelted = 10;
    for (let i = 0; i < 8; i++) equip(g.ctx, smelt(g.ctx, 4, null)!, true);
    s.ores[0] = 0;
    let waves = 0, gold = 0;
    g.on(e => { if (e.t === 'float' && e.cls === 'loot' && e.text.includes('zł.')) waves++; });
    const before = s.gold;
    simulate(g, 20 * 60 * 1000);
    gold = s.gold - before;
    const drops = events.filter(e => e.t === 'drop' && !e.rare).length;
    expect(waves).toBeGreaterThan(200);
    expect(gold).toBeGreaterThan(0);
    expect(drops / waves).toBeGreaterThan(B.ORE_DROP - 0.08);
    expect(drops / waves).toBeLessThan(B.ORE_DROP + 0.08);
  });

  it('auto-wytop bez rudy czeka zamiast się wyłączać', () => {
    const { g, s } = makeGame();
    s.forge.lvl = 5; s.auto = true; s.ores[1] = 0; s.oreSel = 1;
    simulate(g, 3000);
    expect(s.auto).toBe(true);
    expect(g.autoWaiting).toBe(true);
    s.ores[1] = 2;
    simulate(g, 3000);
    expect(s.ores[1]).toBe(0);
  });

  it('każda kraina ma poprawne rudy i domieszki', () => {
    expect(LANDS.length).toBe(16);
    for (const L of LANDS) {
      expect(L.rare).toBe(L.main + 1);
      const sum = L.drops.reduce((a, [, p]) => a + p, 0);
      expect(sum).toBeCloseTo(100);
      // główna ruda to najczęstsza; rzadsze pojawiają się stopniowo, bez skoku do 100%
      expect(Math.max(...L.drops.map(([, p]) => p))).toBe(L.drops.find(([o]) => o === L.main)![1]);
      expect(L.drops.every(([, p]) => p < 100)).toBe(true);
      expect(L.foes.length).toBeGreaterThan(0);
    }
    // Ruda, której nie było w poprzedniej krainie, pojawia się z małą szansą (najwyżej kilka procent).
    for (let i = 1; i < LANDS.length; i++) {
      const prev = new Set(LANDS[i - 1].drops.map(([o]) => o));
      for (const [o, p] of LANDS[i].drops) if (!prev.has(o)) expect(p, `${LANDS[i].n}: ${o}`).toBeLessThanOrEqual(6);
    }
  });
});


describe('nagrody offline', () => {
  it('ignorują krótkie przerwy i mają limit 1 godziny', () => {
    const { ctx } = makeGame();
    expect(applyOffline(ctx, 30000)).toBeNull();
    const r = applyOffline(ctx, 24 * 3600 * 1000)!;
    expect(B.OFFLINE_CAP_MS).toBe(3600 * 1000);
    expect(r.capped).toBe(true);
    expect(r.ms).toBe(B.OFFLINE_CAP_MS);
    expect(r.away).toBe(24 * 3600 * 1000);
    expect(r.gold).toBeGreaterThan(0);
    expect(r.ores.reduce((a, n) => a + n, 0)).toBeGreaterThan(0);
  });

  it('kończą ulepszenie kuźni i otwierają Skrzynię nocnej zmiany', () => {
    const { ctx, s } = makeGame();
    s.forge.lvl = 5; s.forge.up = 6; s.forge.left = 60000;
    s.auto = true; s.ores[1] = 1000;
    s.autoStop = 3; // Epicki z Żelaza: tylko przeskok o 2
    const r = applyOffline(ctx, 2 * 3600 * 1000)!;
    expect(s.forge.lvl).toBe(6);
    expect(r.forgeUp).toBe(6);
    expect(r.chestCount).toBeGreaterThan(0);
    // Skrzynia kończy się na przedmiocie o wybranej rzadkości (czeka na decyzję) albo na limicie wytopów.
    if (s.pending) {
      expect(s.pending.r).toBeGreaterThanOrEqual(3);
      expect(s.auto).toBe(true);
      expect(r.chest[0].stop).toBe(true);
    } else expect(r.chestCount).toBe(B.OFFLINE_CHEST_MAX);
  });
});

describe('nagrody offline i technologie', () => {
  it('Nocna zmiana wydłuża limit, a badanie kończy się poza grą', () => {
    const { ctx, s } = makeGame();
    s.tech.lv.e_noc = 2;
    s.tech.cur = { id: 'w_ostrze', left: 3600000, total: 3600000 };
    const r = applyOffline(ctx, 24 * 3600 * 1000)!;
    expect(r.ms).toBe(B.OFFLINE_CAP_MS + 60 * 60000);
    expect(r.tech).toBe('w_ostrze');
    expect(s.tech.lv.w_ostrze).toBe(1);
    expect(s.tech.cur).toBeNull();
  });

  it('limit dotyczy tylko łupów: kuźnia i badanie liczą cały czas nieobecności', () => {
    const { ctx, s } = makeGame();
    s.forge.lvl = 10; s.forge.up = 11; s.forge.left = 10 * 3600000;
    s.tech.cur = { id: 'w_ostrze', left: 11 * 3600000, total: 11 * 3600000 };
    const short = applyOffline(ctx, 9 * 3600000)!;
    expect(short.ms).toBe(B.OFFLINE_CAP_MS);
    expect(s.forge.left).toBe(3600000);
    expect(s.tech.cur!.left).toBe(2 * 3600000);
    const r = applyOffline(ctx, 3 * 3600000)!;
    expect(r.forgeUp).toBe(11);
    expect(r.tech).toBe('w_ostrze');
  });

  it('Nocna zmiana na najwyższym poziomie daje 8 h łupów', () => {
    const { ctx, s } = makeGame();
    s.tech.lv.e_noc = TECH.e_noc.max;
    const r = applyOffline(ctx, 24 * 3600 * 1000)!;
    expect(r.ms).toBe(8 * 3600 * 1000);
    expect(offlineCapMs(s)).toBe(8 * 3600 * 1000);
    expect(techText('e_noc', 3)).toBe('+1 h 30 min limitu nagród offline (bazowo 1 h)');
    expect(techText('e_noc', TECH.e_noc.max)).toMatch(/^\+7 h limitu/);
  });
});

describe('złoto według kuźni gracza', () => {
  it('etap złota: najdalszy etap, ale najwyżej 2 poziomy kuźni ponad gracza', () => {
    const s = newState(T0);
    s.bestG = 150;
    s.forge.lvl = 5;
    expect(goldG(s)).toBe(gAtForge(5 + B.GOLD_FORGE_AHEAD));
    expect(Math.ceil(forgeExp(goldG(s)))).toBeLessThanOrEqual(5 + B.GOLD_FORGE_AHEAD);
    expect(goldWaveOf(s)).toBeLessThan(goldWave(150) / 10);
    // gracz z kuźnią na miarę etapu: bez zmian
    s.forge.lvl = 200;
    expect(goldG(s)).toBe(150);
    expect(goldWaveOf(s)).toBe(goldWave(150));
    // wcześniejszy etap (np. loch) też nie przekracza granicy
    s.forge.lvl = 5;
    expect(goldG(s, 3)).toBe(Math.min(3, gAtForge(7)));
    expect(goldG({ bestG: 40 } as never)).toBe(Math.min(40, gAtForge(1 + B.GOLD_FORGE_AHEAD)));
  });
});

describe('zapis gry', () => {
  it('migracja uzupełnia brakujące pola starego zapisu', () => {
    const old: Record<string, unknown> = { ...newState(T0), v: 1 };
    delete old.dungeons;
    delete old.stats;
    delete old.tech;
    delete old.books;
    old.dung = { day: '2026-1-1', keys: 1, best: 7 };
    old.cleared = [true, false];
    const s = migrate(old, T0);
    expect(s.dungeons.sztolnia.best).toBe(7);
    expect(s.dungeons.skarbiec.keys).toBe(B.DUNGEON_KEYS);
    expect('dung' in s).toBe(false);
    expect(s.tech.lv).toEqual({});
    expect(s.books).toBe(0);
    expect(s.stats.smelted).toBe(0);
    expect(s.cleared.length).toBe(LANDS.length);
    expect(s.cleared[0]).toBe(true);
  });
  it('śmieciowe dane dają nową grę', () => {
    expect(migrate('zepsute', T0).gold).toBe(0);
    expect(migrate(null, T0).ores[0]).toBe(10);
  });
});
