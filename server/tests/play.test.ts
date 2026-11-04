// Zakupy w Google Play: ocena odpowiedzi Google i potwierdzenie składane przez serwer.
import { describe, expect, it } from 'vitest';
import { PLAY_PACKAGE, playReceipt, purchaseVerdict } from '../src/play';

const ME = '11111111-1111-1111-1111-111111111111';
const buy = (over: Partial<{ userId: string; productId: string; refundTime: number; providerResponse: string }> = {}) => ({
  userId: ME, productId: 'gems_550', refundTime: 0, providerResponse: JSON.stringify({ purchaseState: 0, consumptionState: 0, orderId: 'GPA.1' }), ...over,
});

describe('zakupy Google Play', () => {
  it('zapłacony zakup tego gracza i tego produktu — pakiet do wydania', () => {
    expect(purchaseVerdict(buy(), ME, 'gems_550')).toBe('ok');
  });
  it('płatność w toku, anulowany albo zwrócony zakup — bez pakietu', () => {
    expect(purchaseVerdict(buy({ providerResponse: JSON.stringify({ purchaseState: 2 }) }), ME, 'gems_550')).toBe('pending');
    expect(purchaseVerdict(buy({ providerResponse: JSON.stringify({ purchaseState: 1 }) }), ME, 'gems_550')).toBe('void');
    expect(purchaseVerdict(buy({ refundTime: 1730000000 }), ME, 'gems_550')).toBe('void');
  });
  it('zakup zgłoszony już przez inne konto albo inny produkt — odmowa', () => {
    expect(purchaseVerdict(buy({ userId: '22222222-2222-2222-2222-222222222222' }), ME, 'gems_550')).toBe('other');
    expect(purchaseVerdict(buy(), ME, 'gems_7000')).toBe('none');
    expect(purchaseVerdict(undefined, ME, 'gems_550')).toBe('none');
  });
  it('bez szczegółów od Google (stara Nakama) zakup jest traktowany jako zapłacony', () => {
    expect(purchaseVerdict(buy({ providerResponse: '' }), ME, 'gems_550')).toBe('ok');
  });
  it('potwierdzenie zakupu składa serwer: zawsze pakiet tej gry', () => {
    expect(JSON.parse(playReceipt('starter', 'tok-1'))).toEqual({ packageName: PLAY_PACKAGE, productId: 'starter', purchaseToken: 'tok-1' });
    expect(PLAY_PACKAGE).toBe('pl.kuznialegend.gra');
  });
});
