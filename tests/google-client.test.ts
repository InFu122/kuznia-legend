import { describe, expect, it } from 'vitest';
import { googleDetail } from '../src/save/google';

describe('logowanie Google — szczegóły błędu', () => {
  it('wycina krótki komunikat Google z długiego błędu wtyczki', () => {
    const m = 'Google Sign-In failed: [16] Account reauth failed. The plugin cleared Credential Manager credential-selection state and retried once.';
    expect(googleDetail(m)).toBe('[16] Account reauth failed');
    expect(googleDetail('[28444] Developer console is not set up correctly.')).toBe('[28444] Developer console is not set up correctly');
  });
  it('bez numeru błędu zostawia początek komunikatu', () => {
    expect(googleDetail('Something odd')).toBe('Something odd');
    expect(googleDetail('x'.repeat(300))).toHaveLength(160);
  });
});
