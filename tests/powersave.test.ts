import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Idle } from '../src/ui/powersave';

describe('tryb oszczędzania — licznik bezczynności', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('przyciemnia po czasie bez dotyku, a dotyk liczy od nowa', () => {
    const f = vi.fn();
    const i = new Idle(60_000, f);
    i.start();
    vi.advanceTimersByTime(59_000);
    i.poke();
    vi.advanceTimersByTime(59_000);
    expect(f).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('reklama wstrzymuje przyciemnianie; po niej liczy od nowa', () => {
    const f = vi.fn();
    const i = new Idle(60_000, f);
    i.start();
    i.hold(true);
    vi.advanceTimersByTime(5 * 60_000);
    expect(f).not.toHaveBeenCalled();
    expect(i.armed).toBe(false);
    i.hold(false);
    vi.advanceTimersByTime(59_999);
    expect(f).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('po zatrzymaniu (gra w tle) nic się nie dzieje', () => {
    const f = vi.fn();
    const i = new Idle(60_000, f);
    i.start();
    i.stop();
    i.poke();
    vi.advanceTimersByTime(10 * 60_000);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('blokada ekranu', () => {
  it('włącza się i zdejmuje, powiadamiając interfejs', async () => {
    const { lockScreen, onLock, screenLocked } = await import('../src/ui/powersave');
    const f = vi.fn();
    const off = onLock(f);
    expect(screenLocked()).toBe(false);
    lockScreen();
    expect(screenLocked()).toBe(true);
    lockScreen();               // drugi raz nic nie zmienia
    expect(f).toHaveBeenCalledTimes(1);
    lockScreen(false);
    expect(screenLocked()).toBe(false);
    expect(f).toHaveBeenCalledTimes(2);
    off();
  });
});
