import { describe, expect, it } from 'vitest';
import { CHANGELOG, LATEST_LOG } from '../src/data';
import { migrate, newState } from '../src/engine/state';
import { T0, makeGame } from './helpers';

describe('Co nowego (dziennik zmian)', () => {
  it('wpisy mają niepowtarzalne id, datę i treść; najnowszy jest pierwszy', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
    expect(new Set(CHANGELOG.map(e => e.id)).size).toBe(CHANGELOG.length);
    expect(LATEST_LOG).toBe(CHANGELOG[0].id);
    for (const e of CHANGELOG) {
      expect(e.date).toBeTruthy();
      const n = (e.add?.length ?? 0) + (e.change?.length ?? 0) + (e.fix?.length ?? 0) + (e.remove?.length ?? 0);
      expect(n).toBeGreaterThan(0);
    }
  });

  it('nowy gracz go nie ogląda; stary zapis (sprzed dziennika) dostaje najnowszy wpis', () => {
    expect(newState(T0).opts.logSeen).toBe(LATEST_LOG);
    const old = JSON.parse(JSON.stringify(newState(T0)));
    delete old.opts.logSeen;
    expect(migrate(old, T0).opts.logSeen).toBe('');
  });

  it('„Nie pokazuj ponownie” zapisuje się i przetrwa wczytanie; odznaczenie znów pokazuje', () => {
    const { g, s } = makeGame();
    g.setLogSeen('');
    expect(migrate(JSON.parse(JSON.stringify(s)), T0).opts.logSeen).toBe('');
    g.setLogSeen(LATEST_LOG);
    expect(migrate(JSON.parse(JSON.stringify(s)), T0).opts.logSeen).toBe(LATEST_LOG);
  });
});
