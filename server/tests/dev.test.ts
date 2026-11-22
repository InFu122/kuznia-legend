import { describe, expect, it } from 'vitest';
import { isDev } from '../src/common';

describe('narzędzia dewelopera na serwerze', () => {
  it('serwer: konto dewelopera tylko z pliku sekrety/dev.txt', () => {
    const nk = (txt: string | null) => ({ fileRead: () => { if (txt === null) throw new Error('brak'); return txt; } }) as unknown as nkruntime.Nakama;
    expect(isDev(nk('abc-123\ndef-456'), 'def-456')).toBe(true);
    expect(isDev(nk('abc-123, def-456'), 'abc-123')).toBe(true);
    expect(isDev(nk('abc-123'), 'abc-12')).toBe(false);
    expect(isDev(nk(null), 'abc-123')).toBe(false);
    expect(isDev(nk('abc-123'), '')).toBe(false);
  });
});
