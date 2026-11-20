import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatLink } from '../src/save/chat';
import type { ServerLink } from '../src/save/server';

/** Gniazdo na niby: odpowiada na dołączenie do kanału i na „ping”, chyba że jest martwe. */
class FakeWs {
  static all: FakeWs[] = [];
  readyState = 0;
  dead = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  constructor(readonly url: string) {
    FakeWs.all.push(this);
    queueMicrotask(() => { this.readyState = 1; this.onopen?.(); });
  }
  send(raw: string) {
    if (this.dead) return;
    const m = JSON.parse(raw) as Record<string, unknown>;
    const reply = m.channel_join ? { cid: m.cid, channel: { id: 'kanal-' + FakeWs.all.length } } : { cid: m.cid, pong: {} };
    queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(reply) }));
  }
  close() { this.readyState = 3; queueMicrotask(() => this.onclose?.()); }
}

const token = 'x.' + btoa(JSON.stringify({ uid: 'ja' })) + '.y';
const link = { base: 'https://serwer', session: async () => token, get: async () => ({ messages: [] }) } as unknown as ServerLink;
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

describe('czat: samo łączy się od nowa', () => {
  beforeEach(() => { vi.useFakeTimers(); FakeWs.all = []; vi.stubGlobal('WebSocket', FakeWs); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('martwe gniazdo (brak odpowiedzi na ping) zastępuje nowym', async () => {
    const c = new ChatLink(link);
    await c.start(); await flush();
    expect(c.state).toBe('on');
    FakeWs.all[0].dead = true;
    c.wake();
    await vi.advanceTimersByTimeAsync(10000);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(FakeWs.all.length).toBe(2);
    expect(c.state).toBe('on');
  });

  it('żywe gniazdo zostaje', async () => {
    const c = new ChatLink(link);
    await c.start(); await flush();
    c.wake();
    await vi.advanceTimersByTimeAsync(15000);
    expect(FakeWs.all.length).toBe(1);
    expect(c.state).toBe('on');
  });

  it('po zerwaniu wake() łączy od razu, bez czekania na następną próbę', async () => {
    const c = new ChatLink(link);
    await c.start(); await flush();
    FakeWs.all[0].close(); await flush();
    expect(c.state).toBe('off');
    c.wake(); await flush();
    expect(FakeWs.all.length).toBe(2);
    expect(c.state).toBe('on');
  });
});
