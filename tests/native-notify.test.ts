// Powiadomienia w aplikacji: obiekt wtyczki Capacitora odpowiada na każdą nazwę metody (także „then”),
// więc nie wolno go zwracać wprost z funkcji async — inaczej każde planowanie kończy się błędem.
import { describe, expect, it, vi } from 'vitest';

/** Atrapa jak w Capacitorze: nieznana metoda (np. `then`) to odrzucona obietnica „not implemented”. */
const calls: string[] = [];
let perm = 'granted';
const impl: Record<string, (...a: unknown[]) => Promise<unknown>> = {
  checkPermissions: async () => ({ display: perm === 'granted' ? 'granted' : 'prompt' }),
  requestPermissions: async () => ({ display: perm }),
  schedule: async (o: unknown) => {
    const ns = (o as { notifications: { id: number; isExactNotification?: boolean }[] }).notifications;
    // Każde powiadomienie bez dokładnego alarmu — inaczej Android otwiera ekran „Alarmy i przypomnienia”.
    if (ns.some(n => n.isExactNotification !== false)) throw new Error('isExactNotification musi być false');
    calls.push('schedule:' + JSON.stringify(ns.map(n => n.id)));
    return {};
  },
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

  it('treści powiadomień: konkretne, bez długich myślników', async () => {
    const { upcoming } = await import('../src/ui/native');
    const { newState } = await import('../src/engine/state');
    const st = newState(Date.now());
    st.forge.lvl = 38; st.forge.up = 39; st.forge.left = 3600000;
    st.tech.cur = { id: 'k_hart', left: 600000, total: 3600000 };
    const ns = upcoming({ s: st, unlocked: () => false } as never);
    expect(ns.map(n => n.id)).toEqual([1, 2, 4]);
    expect(ns[0].body).toBe('Kuźnia ma teraz 39. poziom. Od teraz wykuwasz mocniejsze przedmioty, od 78. do 80. poziomu.');
    expect(ns[1].body).toContain('ma teraz 1. poziom');
    for (const n of ns) expect(n.title + n.body).not.toMatch(/—/);
  });

  it('prezent dnia: przypomnienie rano o 9:00, a gdy dzisiejszy odebrany — następnego dnia', async () => {
    const { upcoming } = await import('../src/ui/native');
    const { newState } = await import('../src/engine/state');
    const { utcDay } = await import('../src/engine/shop');
    vi.useFakeTimers();
    try {
      const at9 = (d: Date) => { const t = new Date(d); t.setHours(9, 0, 0, 0); return t.getTime(); };
      // 23:30 — prezent nieodebrany: jutro o 9:00 (a nie o północy).
      const late = new Date(2026, 10, 26, 23, 30); vi.setSystemTime(late);
      const st = newState(late.getTime());
      const g = { s: st, unlocked: (id: string) => id === 'sklep' };
      const tomorrow = new Date(2026, 10, 27);
      expect(upcoming(g as never).find(n => n.id === 5)?.at).toBe(at9(tomorrow) - late.getTime());
      // 7:00 — dzisiejszy już odebrany: dopiero jutro o 9:00.
      const early = new Date(2026, 10, 27, 7, 0); vi.setSystemTime(early);
      st.shop = { ...st.shop, day: utcDay(at9(early)), gift: utcDay(at9(early)) };
      expect(upcoming(g as never).find(n => n.id === 5)?.at).toBe(at9(new Date(2026, 10, 28)) - early.getTime());
      // 7:00 — dzisiejszy nieodebrany: dziś o 9:00.
      st.shop = { ...st.shop, gift: '' };
      expect(upcoming(g as never).find(n => n.id === 5)?.at).toBe(2 * 3600000);
      // Sklep jeszcze zamknięty: bez przypomnienia.
      expect(upcoming({ s: st, unlocked: () => false } as never).some(n => n.id === 5)).toBe(false);
    } finally { vi.useRealTimers(); }
  });
});
