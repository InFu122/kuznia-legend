import { describe, expect, it } from 'vitest';
import { nickFormatProblem, suggestNick, tidyName } from '../src/engine/nick';
import { makeGame } from './helpers';

describe('imię kowala (nick)', () => {
  it('sprawdza format jak serwer', () => {
    expect(nickFormatProblem('Adam')).toBeNull();
    expect(nickFormatProblem('Łukasz_K.')).toBeNull();
    expect(nickFormatProblem('Ab')).toMatch(/od 3 do 16/);
    expect(nickFormatProblem('Bardzo długi nick kowala')).toMatch(/od 3 do 16/);
    expect(nickFormatProblem('Adam!')).toMatch(/litery, cyfry/);
    expect(nickFormatProblem('1234')).toMatch(/literę/);
    expect(tidyName('  Stary   Mistrz ')).toBe('Stary Mistrz');
  });

  it('proponuje poprawny nick', () => {
    for (let i = 0; i < 50; i++) expect(nickFormatProblem(suggestNick())).toBeNull();
    expect(suggestNick(() => 0)).toBe('Iskra_1000');
  });

  it('imię z okna powitalnego trafia do zapisu i na nowe przedmioty', () => {
    const { g, s } = makeGame();
    expect(g.setName('  Adam  z  Kuźni ')).toBe('Adam z Kuźni');
    const it = g.smeltManual()!;
    expect(it.smith).toBe('Adam z Kuźni');
    expect(s.name).toBe('Adam z Kuźni');
    expect(g.setName('   ')).toBe('Kowal');
  });
});
