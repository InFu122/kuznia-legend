// Powiadomienia w aplikacji: obiekt wtyczki Capacitora odpowiada na każdą nazwę metody (także „then”),
// więc nie wolno go zwracać wprost z funkcji async — inaczej każde planowanie kończy się błędem.
import { describe, expect, it, vi } from 'vitest';

/** Atrapa jak w Capacitorze: nieznana metoda (np. `then`) to odrzucona obietnica „not implemented”. */
const calls: string[] = [];
const impl: Record<string, (...a: unknown[]) => Promise<unknown>> = {
  checkPermissions: async () => ({ display: 'granted' }),
  requestPermissions: async () => ({ display: 'granted' }),
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
});
