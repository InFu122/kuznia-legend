import { describe, expect, it } from 'vitest';
import { addFound, autoTarget, autoTargets, smelt } from '../src/engine/forge';
import { makeGame, simulate } from './helpers';

describe('auto-wytop do wybranej rzadkości', () => {
  it('cele: rzadkości powyżej minimum rudy (Gwiezdny Kruszec — tylko Boski)', () => {
    expect(autoTargets(0)).toEqual([1, 2]);
    expect(autoTargets(4)).toEqual([5, 6]);
    expect(autoTargets(5)).toEqual([6]);
    expect(autoTargets(6)).toEqual([6]);
  });

  it('wybór spoza zakresu rudy zamienia się na najniższy cel', () => {
    const { g, s } = makeGame(2);
    s.oreSel = 1; s.autoStop = 6;
    expect(autoTarget(s)).toBe(2);
    g.setAutoStop(3);
    expect(s.autoStop).toBe(3);
    g.setAutoStop(5); // Żelazo nie da Mitycznego
    expect(s.autoStop).toBe(3);
  });

  it('słabsze sprzedaje, pusty slot zakłada, na celu staje z dźwiękiem i oknem decyzji', () => {
    const { g, s, events } = makeGame(4);
    s.forge.lvl = 8; s.ores[1] = 500; s.oreSel = 1; s.stats.smelted = 10;
    s.autoStop = 3; // Epicki z Żelaza = przeskok o 2 (rzadki)
    g.toggleAuto();
    const gold0 = s.gold;
    for (let i = 0; i < 400 && !s.pending; i++) simulate(g, 1000);
    expect(s.pending).not.toBeNull();
    expect(s.pending!.r).toBeGreaterThanOrEqual(3);
    expect(s.auto).toBe(true);        // auto zostaje włączony, tylko czeka na decyzję
    expect(g.autoPaused).toBe(true);
    expect(events.some(e => e.t === 'sfx' && e.k === 'alert')).toBe(true);
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'decide')).toBe(true);
    expect(Object.keys(s.eq).length).toBeGreaterThan(0);   // puste miejsca dostały przedmioty
    expect(s.gold).toBeGreaterThan(gold0);                  // reszta sprzedana
    // po decyzji auto-wytop jedzie dalej sam
    const n = s.stats.smelted;
    g.equipPending();
    simulate(g, 5000);
    expect(s.stats.smelted).toBeGreaterThan(n);
    expect(s.auto).toBe(true);
  });

  it('ręczny wytop otwiera okno decyzji', () => {
    const { g, events } = makeGame(1);
    g.s.ores[1] = 3;
    g.smeltManual();
    expect(events.some(e => e.t === 'modal' && e.m.kind === 'decide')).toBe(true);
  });

  it('znaleziska (skrzynia bossa, Zbrojownia) czekają na gracza — auto-wytop ich nie rusza', () => {
    const { g, ctx, s } = makeGame(6);
    s.forge.lvl = 8; s.ores[1] = 200; s.ores[2] = 1; s.oreSel = 1; s.stats.smelted = 10; s.autoStop = 3;
    const it = smelt(ctx, 2, null)!;
    addFound(ctx, [it]);
    g.toggleAuto();
    simulate(g, 20000);
    expect(s.found).toContain(it);
    g.takeFound(0, true);
    expect(s.eq[it.slot]).toBe(it);
    expect(s.found).toHaveLength(0);
  });

  it('nadmiar znalezisk idzie na sprzedaż (najstarsze)', () => {
    const { ctx, s } = makeGame(7);
    s.ores[0] = 30; s.stats.smelted = 10;
    const items = Array.from({ length: 25 }, () => smelt(ctx, 0, null)!);
    const gold = s.gold;
    addFound(ctx, items);
    expect(s.found).toHaveLength(20);
    expect(s.found[0]).toBe(items[5]);
    expect(s.gold).toBeGreaterThan(gold);
  });
});

import { equipBestSkills, selectBestMount, selectBestPet } from '../src/engine/companions';
import { fullStats } from '../src/engine/stats';

describe('Załóż najlepsze', () => {
  it('umiejętności, chowaniec i wierzchowiec z największą Mocą', () => {
    const { ctx, s } = makeGame(3);
    s.skills.lv = { deszcz: 5, tarcza: 1, okrzyk: 8, eliksir: 1, kula: 6 };
    s.skills.eq = ['tarcza', null, null];
    s.pets = { wilczek: { lvl: 1, stars: 0 }, feniks: { lvl: 10, stars: 2 } };
    s.petSel = 'wilczek';
    s.mounts = { kon: { lvl: 1, stars: 0 }, smok: { lvl: 5, stars: 1 } };
    s.mountSel = 'kon';
    const p0 = fullStats(ctx).power;
    expect(equipBestSkills(ctx)).toBe(true);
    expect(s.skills.eq.filter(Boolean)).toHaveLength(3);
    expect(selectBestPet(ctx)).toBe(true);
    expect(s.petSel).toBe('feniks');
    expect(selectBestMount(ctx)).toBe(true);
    expect(s.mountSel).toBe('smok');
    expect(fullStats(ctx).power).toBeGreaterThan(p0);
    // drugi raz nic się nie zmienia
    expect(equipBestSkills(ctx)).toBe(false);
    expect(selectBestPet(ctx)).toBe(false);
  });
});

import { migrate } from '../src/engine/state';
import { maybeObieg } from '../src/engine/obieg';
import { constRng } from './helpers';

describe('Wieści z Obiegu', () => {
  it('dawne wpisy „trafił do Obiegu” łączą się w jeden z licznikiem', () => {
    const log = [
      { t: '20:38', m: 'Topór_8537 znalazł(a) twój przedmiot: Żelazny Napierśnik. +30 Sławy kowala' },
      ...Array.from({ length: 12 }, (_, i) => ({ t: '15:1' + (i % 10), m: `Żelazny Medalion ${i} trafił do Wielkiego Obiegu.` })),
    ];
    const s = migrate({ v: 7, smith: { fame: 0, sent: [], log } }, 0);
    expect(s.smith.log).toHaveLength(2);
    expect(s.smith.log[1]).toMatchObject({ k: 'sent', n: 12 });
  });

  it('kolejne wysyłki do Obiegu zwiększają licznik zamiast dopisywać wiersze', () => {
    const { ctx, s } = makeGame(2);
    s.ores[1] = 20; s.stats.smelted = 10;
    ctx.rng = constRng(0);
    for (let i = 0; i < 5; i++) {
      const it = smelt({ ...ctx, rng: makeGame(10 + i).ctx.rng }, 1, null)!;
      it.r = 3;
      maybeObieg(ctx, it, true);
    }
    expect(s.smith.log).toHaveLength(1);
    expect(s.smith.log[0].n).toBe(5);
  });
});

describe('wynik Zwoju', () => {
  it('pokazuje poziom przed i po kopii', async () => {
    const { drawSkill } = await import('../src/engine/companions');
    const { makeGame: mk } = await import('./helpers');
    const { ctx, s } = mk(4);
    const a = drawSkill(ctx, 0);
    expect(a.dupe).toBe(false);
    expect(a.from).toBe(0);
    expect(a.to).toBe(1);
    // kopie tej samej umiejętności: poziom rośnie albo rosną kopie do następnego poziomu
    let up = 0;
    for (let i = 0; i < 200; i++) {
      const r = drawSkill(ctx, 0);
      if (r.dupe) { expect(r.to).toBeGreaterThanOrEqual(r.from); if (r.to > r.from) up++; else expect(r.cards).toBeGreaterThan(0); }
    }
    expect(up).toBeGreaterThan(0);
    expect(Object.keys(s.skills.lv).length).toBeGreaterThan(1);
  });
});

describe('wytop seryjny i rafinacja', () => {
  it('×3 od 20. poziomu kuźni: trzy wytopy, najlepszy czeka na decyzję, reszta założona albo sprzedana', async () => {
    const { smeltBatch, batchSizes, batchOf } = await import('../src/engine/forge');
    const { migrate } = await import('../src/engine/state');
    const { makeGame: mk } = await import('./helpers');
    const { ctx, s } = mk(9);
    s.forge.lvl = 11; s.stats.smelted = 10; s.ores[2] = 25;
    expect(batchSizes(s)).toEqual([1]);
    s.forge.lvl = 12;
    expect(batchSizes(s)).toEqual([1, 2]);
    s.batch = 3;
    expect(batchOf(s)).toBe(2);                  // wybrane ×3 działa jak ×2, dopóki kuźnia nie ma 20. poziomu
    s.forge.lvl = 20;
    expect(batchSizes(s)).toEqual([1, 2, 3]);
    expect(batchOf(s)).toBe(3);
    const gold = s.gold;
    const r = smeltBatch(ctx, 2, 3)!;
    expect(r.count).toBe(3);
    expect(s.ores[2]).toBe(22);                  // bez Oszczędnego wytopu zużywa 3
    expect(r.sold + r.equipped).toBe(2);
    expect(Math.max(...r.all.map(x => x.r))).toBe(r.best.r);
    expect(s.gold - gold).toBe(r.gold);
    // gdy rudy brakuje — tyle, ile jest
    s.ores[2] = 2;
    expect(smeltBatch(ctx, 2, 3)!.count).toBe(2);
    // dawny zapis z ×10 → ×3
    expect(migrate({ ...JSON.parse(JSON.stringify(s)), batch: 10 }, Date.now()).batch).toBe(3);
  });

  it('rafinacja zamienia nadmiar słabszej rudy na następną, tylko na rudy, które kuźnia wytapia', async () => {
    const { refine, refineRatio } = await import('../src/engine/forge');
    const { makeGame: mk } = await import('./helpers');
    const { ctx, s } = mk(1);
    s.forge.lvl = 4; s.ores[0] = 100; s.ores[1] = 0;
    expect(refineRatio(s, 0)).toBe(0);           // rafinacja od 5. poziomu kuźni
    s.forge.lvl = 5;
    expect(refineRatio(s, 0)).toBe(8);
    expect(refineRatio(s, 2)).toBe(0);           // Mithril wytapia się od 10. poziomu
    expect(refine(ctx, 0, 1000)).toBe(12);       // 100 Miedzi → 12 Żelaza (zostają 4)
    expect(s.ores[0]).toBe(4);
    expect(s.ores[1]).toBe(12);
    expect(refine(ctx, 0, 1)).toBe(0);
  });
});
