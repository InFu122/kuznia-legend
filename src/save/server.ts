// Połączenie z serwerem gry (Nakama) przez REST. Gra potrzebuje tylko logowania urządzeniem i wywołań RPC,
// więc obywa się bez biblioteki klienta. Bez skonfigurowanego serwera (np. w artefakcie) gra działa lokalnie.
import type { GameState } from '../engine/types';

const DEVICE_KEY = 'kuznia-legend-device';
const TIMEOUT_MS = 10000;

export interface ServerConfig { base: string; key: string }

/** Adres serwera z konfiguracji builda: VITE_SERVER_URL ("/" = ten sam adres co gra) i VITE_SERVER_KEY. */
export function serverConfig(): ServerConfig | null {
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (!url) return null;
  const base = url === '/' ? location.origin : url.replace(/\/$/, '');
  return { base, key: (import.meta.env.VITE_SERVER_KEY as string | undefined) || 'defaultkey' };
}

export class ServerError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export interface RankRow { rank: number; name: string; score: number; sub: number; land: string; me: boolean }
export interface Ranking { board: string; title: string; records: RankRow[]; mine: RankRow | null }
export type BoardId = 'moc' | 'wieza' | 'postep';

export class ServerLink {
  private token: string | null = null;
  /** Wersja zapisu na serwerze (do wykrywania zapisu z innego urządzenia). */
  private version: string | null = null;
  online = false;
  /** Różnica: czas serwera − czas urządzenia (ms). */
  offset = 0;

  constructor(private readonly cfg: ServerConfig) {}

  private deviceId(): string {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = 'kl-' + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch {
      return 'kl-tmp-' + Math.random().toString(36).slice(2);
    }
  }

  private async req(path: string, init: RequestInit): Promise<Response> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      return await fetch(this.cfg.base + path, { ...init, signal: ac.signal });
    } finally {
      clearTimeout(t);
    }
  }

  /** Konto zakłada się samo przy pierwszym uruchomieniu na urządzeniu. */
  async auth(): Promise<void> {
    const res = await this.req('/v2/account/authenticate/device?create=true', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(this.cfg.key + ':'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.deviceId() }),
    });
    if (!res.ok) throw new ServerError(res.status, 'Logowanie nieudane');
    this.token = ((await res.json()) as { token: string }).token;
  }

  async rpc<T>(id: string, body: unknown, retry = true): Promise<T> {
    if (!this.token) await this.auth();
    const res = await this.req(`/v2/rpc/${id}?unwrap`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401 && retry) { this.token = null; return this.rpc<T>(id, body, false); }
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try { msg = (JSON.parse(text) as { message?: string }).message ?? text; } catch { /* zostaje surowy tekst */ }
      throw new ServerError(res.status, msg);
    }
    const data = JSON.parse(text) as T & { serverTime?: number };
    if (typeof data.serverTime === 'number') this.offset = data.serverTime - Date.now();
    return data;
  }

  /** Wczytuje zapis z serwera. */
  async load(): Promise<GameState | null> {
    const r = await this.rpc<{ state: GameState | null; version: string | null }>('save_get', {});
    this.version = r.version;
    this.online = true;
    return r.state;
  }

  /**
   * Zapisuje stan. Gdy serwer ma nowszy zapis z innego urządzenia, zwraca go jako `conflict`
   * (gra wybiera nowszy po `savedAt`).
   */
  async save(state: GameState): Promise<{ conflict?: GameState | null; power?: number }> {
    const r = await this.rpc<{ version?: string; power?: number; conflict?: boolean; state?: GameState | null }>(
      'save_put', { state, version: this.version });
    this.version = r.version ?? this.version;
    if (r.conflict) return { conflict: r.state ?? null };
    return { power: r.power };
  }

  ranking(board: BoardId): Promise<Ranking> {
    return this.rpc<Ranking>('ranking', { board, limit: 30 });
  }
}

let current: ServerLink | null = null;
export const setLink = (l: ServerLink | null) => { current = l; };
export const getLink = () => current;
