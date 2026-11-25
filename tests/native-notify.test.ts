// Powiadomienia w aplikacji: obiekt wtyczki Capacitora odpowiada na każdą nazwę metody (także „then”),
// więc nie wolno go zwracać wprost z funkcji async — inaczej każde planowanie kończy się błędem.
import { describe, expect, it, vi } from 'vitest';

/** Atrapa jak w Capacitorze: nieznana metoda (np. `then`) to odrzucona obietnica „not implemented”. */
const calls: string[] = [];
let perm = 'granted';
const impl: Record<string, (...a: unknown[]) => Promise<unknown>> = {
  checkPermissions: async () => ({ display: perm === 'granted' ? 'granted' : 'prompt' }),
  requestPermissions: async () => ({ display: perm }),
  schedule: async (o: unknown) => { calls.push('schedule:' + JSON.stringify((o as { notifications: { id: number }[] }).notifications.map(n => n.id))); return {}; },
  getPending: async () => ({ notifications: [] }),
  cancel: async () => ({}),
};
const proxy = new Proxy({}, {
  get: (_, prop) => impl[String(prop)] ?? (() => Promise.reject(new Error(`"LocalNotifications.${String(prop)}()" is not implemented on android`))),
});
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: proxy }));
vi.mock('../src/ui/pwa', () => ({ isNative: () => true, isStandalone: () => false }));

describe('Powiadomienia telefonu', () => {
  it('wtyczka działa mimo że jej obiekt „ma” metodę then', async () => {
    const { notifyState, testNotify } = await import('../src/ui/native');
    await expect(notifyState()).resolves.toBe('granted');
    await expect(testNotify()).resolves.toBe('granted');
    expect(calls).toEqual(['schedule:[9]']);
  });

  it('włączenie pyta telefon; odmowa zostawia powiadomienia wyłączone', async () => {
    const { enableNotify, notifyOn } = await import('../src/ui/native');
    const game = { s: { opts: { notify: true } }, setNotify(v: boolean) { this.s.opts.notify = v; } };
    perm = 'denied';
    await expect(enableNotify(game as never)).resolves.toBe('denied');
    expect(game.s.opts.notify).toBe(false);
    expect(notifyOn(game as never, 'denied')).toBe(false);
    perm = 'granted';
    await expect(enableNotify(game as never)).resolves.toBe('granted');
    expect(game.s.opts.notify).toBe(true);
    expect(notifyOn(game as never, 'granted')).toBe(true);
  });
});
