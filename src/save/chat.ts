// Czat na żywo przez WebSocket Nakamy: pokój globalny i kanał klanu. Historia przychodzi przez REST,
// nowe wiadomości przez gniazdo. Wyciszeni gracze są zapamiętani na tym urządzeniu.
import type { SubId, ElemKey, SetId, SlotId } from '../engine/types';
import type { ServerLink } from './server';

export type ChatCh = 'global' | 'clan';
export const GLOBAL_ROOM = 'global-pl';
const MUTED_KEY = 'kuznia-legend-muted';
const HISTORY = 50;
const RECONNECT_MS = 5000;

export interface DropCard { name: string; r: number; slot: SlotId; lvl: number; ore: number; subs: { id: SubId; v: number }[]; el: ElemKey | null; set: SetId | null }
export interface ChatMsg {
  id: string; ch: ChatCh; uid: string; n: string; t: string;
  k: 'msg' | 'sys' | 'drop' | 'ann'; it?: DropCard; time: number; mine: boolean;
}

interface NkMessage { channel_id: string; message_id: string; code?: number; sender_id?: string; content: string; create_time: string }
interface Pending { ok: (m: Record<string, unknown>) => void; no: (e: Error) => void }

export class ChatLink {
  private ws: WebSocket | null = null;
  private cid = 0;
  private pend = new Map<string, Pending>();
  private listeners = new Set<() => void>();
  private retry: ReturnType<typeof setTimeout> | undefined;
  private me = '';
  ids: Partial<Record<ChatCh, string>> = {};
  msgs: Record<ChatCh, ChatMsg[]> = { global: [], clan: [] };
  unread: Record<ChatCh, number> = { global: 0, clan: 0 };
  /** Kanał, który gracz właśnie ogląda (jego wiadomości nie są „nieprzeczytane”). */
  viewing: ChatCh | null = null;
  clanId: string | null = null;
  clanName = '';
  ann = '';
  state: 'off' | 'connecting' | 'on' = 'off';
  muted: Set<string>;

  constructor(private readonly link: ServerLink) {
    let m: string[] = [];
    try { m = JSON.parse(localStorage.getItem(MUTED_KEY) || '[]') as string[]; } catch { /* brak pamięci */ }
    this.muted = new Set(Array.isArray(m) ? m : []);
  }

  on(fn: () => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private changed() { for (const fn of this.listeners) fn(); }

  /** Łączy się i przy zerwaniu połączenia próbuje znowu co kilka sekund. */
  async start(): Promise<void> {
    if (this.ws || this.state === 'connecting') return;
    clearTimeout(this.retry);
    this.state = 'connecting';
    try {
      const token = await this.link.session();
      this.me = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).uid ?? '';
      const ws = new WebSocket(this.link.base.replace(/^http/, 'ws') + '/ws?status=false&token=' + encodeURIComponent(token));
      this.ws = ws;
      ws.onmessage = ev => this.receive(String(ev.data));
      ws.onclose = () => {
        this.ws = null;
        this.state = 'off';
        this.ids = {};
        for (const p of this.pend.values()) p.no(new Error('Brak połączenia z czatem.'));
        this.pend.clear();
        this.changed();
        this.retry = setTimeout(() => void this.start(), RECONNECT_MS);
      };
      await new Promise<void>((ok, no) => { ws.onopen = () => ok(); ws.onerror = () => no(new Error('czat niedostępny')); });
      this.state = 'on';
      await this.join('global', GLOBAL_ROOM, 1);
      if (this.clanId) await this.join('clan', this.clanId, 3);
      this.changed();
    } catch {
      this.state = 'off';
      this.ws?.close();
      this.ws = null;
      this.retry = setTimeout(() => void this.start(), RECONNECT_MS * 2);
      this.changed();
    }
  }

  private send(msg: Record<string, unknown>): Promise<Record<string, unknown>> {
    const ws = this.ws;
    if (!ws || ws.readyState !== 1) return Promise.reject(new Error('Brak połączenia z czatem.'));
    const cid = String(++this.cid);
    return new Promise((ok, no) => {
      this.pend.set(cid, { ok, no });
      ws.send(JSON.stringify({ cid, ...msg }));
    });
  }

  private receive(raw: string): void {
    let m: Record<string, unknown>;
    try { m = JSON.parse(raw); } catch { return; }
    const cid = m.cid as string | undefined;
    if (cid && this.pend.has(cid)) {
      const p = this.pend.get(cid)!;
      this.pend.delete(cid);
      const e = m.error as { message?: string } | undefined;
      if (e) p.no(new Error(e.message || 'Błąd czatu.')); else p.ok(m);
      return;
    }
    const cm = m.channel_message as NkMessage | undefined;
    if (!cm) return;
    const ch = (Object.keys(this.ids) as ChatCh[]).find(k => this.ids[k] === cm.channel_id);
    const msg = ch && this.parse(cm, ch);
    if (!ch || !msg) return;
    this.msgs[ch] = this.msgs[ch].concat(msg).slice(-HISTORY * 2);
    if (this.viewing !== ch && !msg.mine && !this.muted.has(msg.uid)) this.unread[ch]++;
    if (msg.k === 'ann') this.ann = msg.t;
    this.changed();
  }

  /** Wiadomość Nakamy → wiadomość gry. Pomija zdarzenia grup Nakamy (kod różny od 0). */
  private parse(m: NkMessage, ch: ChatCh): ChatMsg | null {
    if (m.code) return null;
    let c: { k?: ChatMsg['k']; t?: string; n?: string; it?: DropCard } = {};
    try { c = JSON.parse(m.content); } catch { return null; }
    if (!c.t) return null;
    return {
      id: m.message_id, ch, uid: m.sender_id || '', n: c.n || '', t: c.t, k: c.k || 'msg', it: c.it,
      time: Date.parse(m.create_time) || Date.now(), mine: !!this.me && m.sender_id === this.me,
    };
  }

  private async join(ch: ChatCh, target: string, type: number): Promise<void> {
    const r = await this.send({ channel_join: { target, type, persistence: true, hidden: false } });
    const id = (r.channel as { id: string }).id;
    this.ids[ch] = id;
    const h = await this.link.get<{ messages?: NkMessage[] }>(`/v2/channel/${encodeURIComponent(id)}?limit=${HISTORY}&forward=false`);
    this.msgs[ch] = (h.messages || []).reverse().map(x => this.parse(x, ch)).filter((x): x is ChatMsg => !!x);
    this.changed();
  }

  /** Klan gracza: przełącza kanał klanu (null — bez klanu). */
  async setClan(id: string | null, name = '', ann = ''): Promise<void> {
    this.clanName = name;
    this.ann = ann;
    if (id === this.clanId) { this.changed(); return; }
    const old = this.ids.clan;
    this.clanId = id;
    this.ids.clan = undefined;
    this.msgs.clan = [];
    this.unread.clan = 0;
    if (old && this.state === 'on') { try { await this.send({ channel_leave: { channel_id: old } }); } catch { /* i tak go opuszczamy */ } }
    if (id && this.state === 'on') { try { await this.join('clan', id, 3); } catch { /* spróbujemy po ponownym połączeniu */ } }
    this.changed();
  }

  async say(ch: ChatCh, text: string): Promise<void> {
    const id = this.ids[ch];
    if (!id) throw new Error('Brak połączenia z czatem.');
    await this.send({ channel_message_send: { channel_id: id, content: JSON.stringify({ t: text }) } });
  }

  mute(uid: string, on: boolean): void {
    if (on) this.muted.add(uid); else this.muted.delete(uid);
    try { localStorage.setItem(MUTED_KEY, JSON.stringify([...this.muted])); } catch { /* brak pamięci */ }
    this.changed();
  }

  /** Nowe połączenie (np. po przeniesieniu konta — inna sesja i inny klan). */
  restart(): void {
    this.msgs = { global: [], clan: [] };
    this.unread = { global: 0, clan: 0 };
    this.clanId = null;
    if (this.ws) this.ws.close(); else void this.start();
  }

  get unreadTotal(): number { return this.unread.global + this.unread.clan; }
}

let current: ChatLink | null = null;
export const setChat = (c: ChatLink | null) => { current = c; };
export const getChat = () => current;
