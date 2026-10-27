import { describe, expect, it } from 'vitest';
import { channelKind } from '../src/chat';
import { roleOf, type ClanMeta } from '../src/clan';
import { censor, fold, nameClean } from '../src/filter';
import { nameKey, nickProblem, tidyName } from '../src/names';

describe('filtr słów', () => {
  it('gwiazdkuje wulgaryzmy także z polskimi znakami, wielkimi literami i cyframi', () => {
    expect(censor('ty KURWO jedna').text).toBe('ty ***** jedna');
    expect(censor('ch*j').hit).toBe(false); // już ocenzurowane przez gracza
    expect(censor('spierdalaj stąd').hit).toBe(true);
    expect(censor('k0rwa').hit).toBe(false);
    expect(censor('kurw4 mać').hit).toBe(true);
    expect(censor('fuck this').text).toBe('**** this');
  });
  it('nie rusza zwykłych słów', () => {
    for (const ok of ['Pierścień zbroi', 'principal', 'hebel', 'skrzynia', 'pedał roweru', 'Cześć wszystkim!', 'jebus']) {
      expect(censor(ok).hit, ok).toBe(ok === 'jebus');
    }
    expect(fold('Łódź Żółć')).toBe('lodz zolc');
  });
  it('nazwy sprawdza też po sklejeniu słów', () => {
    expect(nameClean('Kur_wa')).toBe(false);
    expect(nameClean('Stalowe Młoty')).toBe(true);
  });
});

describe('nicki', () => {
  it('klucz rejestru nie rozróżnia wielkości liter, polskich znaków i separatorów', () => {
    expect(nameKey('Łukasz_K.')).toBe(nameKey('lukaszk'));
    expect(nameKey('Iśkierka')).toBe(nameKey('ISKIERKA'));
  });
  it('sprawdza długość, znaki, rezerwacje i wulgaryzmy', () => {
    expect(nickProblem('Adam')).toBeNull();
    expect(nickProblem('Żelazna Pięść')).toBeNull();
    expect(nickProblem('ab')).toMatch(/od 3/);
    expect(nickProblem('12345')).toMatch(/literę/);
    expect(nickProblem('<b>Adam</b>')).toMatch(/litery, cyfry/);
    expect(nickProblem('kowal')).toMatch(/nie można/);
    expect(nickProblem('marek pl')).toMatch(/nie można/);
    expect(nickProblem('Chujek')).toMatch(/niedozwolone/);
    expect(tidyName('  Ala   ma  ')).toBe('Ala ma');
  });
});

describe('klany i czat', () => {
  it('role z grup Nakamy', () => {
    const m = { elders: ['u2'] } as ClanMeta;
    expect(roleOf(0, 'u1', m)).toBe('lider');
    expect(roleOf(1, 'u1', m)).toBe('zastepca');
    expect(roleOf(2, 'u2', m)).toBe('starszy');
    expect(roleOf(2, 'u3', m)).toBe('czlonek');
    expect(roleOf(3, 'u3', m)).toBe('prosba');
  });
  it('rodzaj kanału z identyfikatora', () => {
    expect(channelKind('2...global-pl')).toEqual({ kind: 'room', target: 'global-pl' });
    expect(channelKind('3.abc-def..')).toEqual({ kind: 'group', target: 'abc-def' });
    expect(channelKind('4.a.b.').kind).toBe('dm');
  });
});
