// Odblokowywanie funkcji: kłódki, ogłoszenia nowych funkcji i znaczki „nowe”.
import { describe, expect, it } from 'vitest';
import { FEATURES, FEATURE_IDS, TECH_UNLOCK_FORGE } from '../src/data';
import { migrate, newState } from '../src/engine/state';
import { checkUnlocks, isUnlocked, seenFeature, unlockProgress, unlockWhen } from '../src/engine/unlocks';
import type { ModalData } from '../src/engine/types';
import { T0, makeGame, simulate } from './helpers';

describe('odblokowywanie funkcji', () => {
  it('nowy gracz ma tylko kuźnię i walkę; reszta otwiera się z postępem', () => {
    const s = newState(T0);
    expect(FEATURE_IDS.filter(id => isUnlocked(s, id))).toEqual([]);
    s.forge.lvl = TECH_UNLOCK_FORGE;
    expect(isUnlocked(s, 'nauka')).toBe(true);
    expect(isUnlocked(s, 'lochy')).toBe(false);
    s.maxLand = 1;
    expect(isUnlocked(s, 'lochy')).toBe(true);
    expect(isUnlocked(s, 'krainy')).toBe(true);
    expect(isUnlocked(s, 'chowance')).toBe(false);
  });

  it('warunek słowami i postęp do paska', () => {
    expect(unlockWhen('nauka')).toBe(`na ${TECH_UNLOCK_FORGE}. poziomie kuźni`);
    expect(unlockWhen('lochy')).toMatch(/^po pokonaniu bossa krainy Spalona Wioska \(.+\)$/);
    expect(unlockWhen('bohater')).toBe('na 3. etapie krainy Spalona Wioska');
    const s = newState(T0);
    expect(unlockProgress(s, 'nauka')).toEqual([1, TECH_UNLOCK_FORGE, 'poziom kuźni']);
    expect(unlockProgress(s, 'bohater')).toEqual([1, 3, 'etap']);
  });

  it('gra ogłasza nową funkcję raz (oknem), a znaczek „nowe” znika po otwarciu', () => {
    const { g, s, events } = makeGame(3);
    s.forge.lvl = TECH_UNLOCK_FORGE;
    simulate(g, 1000);
    const shown = events.filter((e): e is { t: 'modal'; m: Extract<ModalData, { kind: 'unlocked' }> } => e.t === 'modal' && e.m.kind === 'unlocked');
    expect(shown.length).toBe(1);
    expect(shown[0].m.ids).toEqual(expect.arrayContaining(['nauka', 'sklep', 'zadania']));
    expect(s.unl).toEqual(expect.arrayContaining(['nauka', 'sklep', 'zadania']));
    simulate(g, 3000);
    expect(events.filter(e => e.t === 'modal' && e.m.kind === 'unlocked').length).toBe(1);
    expect(s.unlNew).toContain('nauka');
    expect(seenFeature(s, ['nauka'])).toBe(true);
    expect(s.unlNew).not.toContain('nauka');
    expect(g.unlocked('nauka')).toBe(true);
  });

  it('funkcje tylko z serwerem (klan, czat, arena) bez połączenia nie są ogłaszane ani dostępne', () => {
    const { g, s, ctx } = makeGame(4);
    s.maxLand = 1; s.cleared[0] = true;
    const fresh = checkUnlocks(ctx);
    expect(fresh).toEqual(expect.arrayContaining(['krainy', 'lochy']));
    expect(fresh.some(id => FEATURES[id].net)).toBe(false);
    expect(g.unlocked('klan')).toBe(false);
  });

  it('stary zapis zna już wszystko, co jest dostępne — bez ogłoszeń', () => {
    const raw = JSON.parse(JSON.stringify(newState(T0)));
    delete raw.unl; delete raw.unlNew;
    raw.forge.lvl = 20; raw.maxLand = 5; raw.bestG = 50; raw.stats.smelted = 100;
    const s = migrate(raw, T0);
    expect(s.unl).toEqual(expect.arrayContaining(['bohater', 'nauka', 'lochy', 'chowance', 'runy']));
    expect(s.unlNew).toEqual([]);
    const { ctx } = makeGame(5);
    ctx.s = s;
    expect(checkUnlocks(ctx)).toEqual([]);
  });
});
