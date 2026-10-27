// Okno czatu: pokój globalny i kanał klanu, ogłoszenie klanu, karty dropów, wyciszanie i zgłaszanie.
import { useEffect, useRef, useState } from 'preact/hooks';
import { B, RAR, SUBS } from '../../data';
import type { Game } from '../../engine/game';
import { getChat, type ChatCh, type ChatMsg } from '../../save/chat';
import { getLink } from '../../save/server';
import { f1 } from '../format';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
const STATE: Record<string, string> = { on: 'połączono', connecting: 'łączenie…', off: 'brak połączenia' };

function Message({ m, open, onMenu, onMute, onReport }: { m: ChatMsg; open: boolean; onMenu: () => void; onMute: () => void; onReport: () => void }) {
  if (m.k === 'sys') return <li class="cm sys">{m.t}</li>;
  if (m.k === 'ann') return <li class="cm ann"><b>Ogłoszenie</b>{m.n ? ` · ${m.n}` : ''}: {m.t}</li>;
  if (m.k === 'drop' && m.it) {
    const it = m.it;
    return (
      <li class={`cm drop r${it.r}`}>
        <div class="cm-h"><b class="cn">{m.n}</b><time>{hhmm(m.time)}</time></div>
        <div class="cm-t">wykuł(a) <b class="rar">{it.name}</b> · {RAR[it.r].n} · poz. {it.lvl}</div>
        {it.subs.length > 0 && <div class="cm-subs">{it.subs.map(s => `${SUBS[s.id].n} +${f1(s.v)}${SUBS[s.id].u}`).join(' · ')}</div>}
      </li>
    );
  }
  return (
    <li class={`cm${m.mine ? ' mine' : ''}`}>
      <div class="cm-h">
        <b class="cn">{m.n}</b><time>{hhmm(m.time)}</time>
        {!m.mine && m.uid && <button class="cm-more" aria-label={`Opcje: ${m.n}`} aria-expanded={open} onClick={onMenu}>⋯</button>}
      </div>
      <div class="cm-t">{m.t}</div>
      {open && (
        <div class="btnrow cm-menu">
          <button class="btn small" onClick={onMute}>Wycisz: {m.n}</button>
          <button class="btn small danger" onClick={onReport}>Zgłoś wiadomość</button>
        </div>
      )}
    </li>
  );
}

export function ChatView({ game, initial, close, goClan }: { game: Game; initial?: ChatCh; close: () => void; goClan: () => void }) {
  const chat = getChat();
  const [ch, setCh] = useState<ChatCh>(initial ?? (chat?.clanId ? 'clan' : 'global'));
  const [, force] = useState(0);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const count = chat ? chat.msgs[ch].length : 0;

  useEffect(() => chat?.on(() => force(x => x + 1)), [chat]);
  useEffect(() => {
    if (!chat) return;
    chat.viewing = ch;
    chat.unread[ch] = 0;
    return () => { chat.viewing = null; };
  }, [ch, chat, count]);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [ch, count]);

  if (!chat) {
    return (<><div class="eyebrow">Czat</div><p class="sub">Czat działa po połączeniu z serwerem gry.</p><button class="btn" onClick={close}>Zamknij</button></>);
  }
  const msgs = chat.msgs[ch].filter(m => !chat.muted.has(m.uid));
  const noClan = ch === 'clan' && !chat.clanId;
  const lockGlobal = ch === 'global' && game.s.forge.lvl < B.CHAT_GLOBAL_FORGE;

  const send = async (e: Event) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setNote('');
    try { await chat.say(ch, t); setText(''); } catch (x) { setNote((x as Error).message); } finally { setBusy(false); }
  };
  const report = (m: ChatMsg) => {
    setMenu(null);
    getLink()?.chatReport({ channel: chat.ids[m.ch] ?? '', message: m.id, sender: m.uid, name: m.n, text: m.t })
      .then(() => setNote('Dziękujemy — zgłoszenie trafiło do administratora.'))
      .catch(() => setNote('Nie udało się wysłać zgłoszenia.'));
  };

  return (
    <div class="chat">
      <div class="row">
        <div class="eyebrow">Czat</div>
        <span class={`chat-state ${chat.state}`}>{STATE[chat.state]}</span>
      </div>
      <div class="seg seg2" role="tablist">
        {(['global', 'clan'] as ChatCh[]).map(c => (
          <button key={c} role="tab" aria-selected={ch === c} class={ch === c ? 'on' : ''} onClick={() => { setCh(c); setMenu(null); setNote(''); }}>
            {c === 'global' ? 'Globalny' : chat.clanName ? `Klan: ${chat.clanName}` : 'Klan'}
            {chat.unread[c] > 0 && ch !== c && <i class="seg-badge">{chat.unread[c]}</i>}
          </button>
        ))}
      </div>
      {ch === 'clan' && chat.ann && <div class="pin"><b>Ogłoszenie:</b> {chat.ann}</div>}
      {noClan ? (
        <div class="lockline">
          Nie należysz do klanu. Czat klanu zobaczysz po dołączeniu.
          <div style={{ marginTop: '8px' }}><button class="btn small primary" onClick={goClan}>Znajdź klan</button></div>
        </div>
      ) : (
        <ul class="chat-list" ref={listRef} aria-live="polite" aria-label={ch === 'global' ? 'Czat globalny' : 'Czat klanu'}>
          {msgs.length === 0 && <li class="cm sys">{chat.state === 'on' ? 'Jeszcze nikt nic nie napisał.' : 'Łączenie z czatem…'}</li>}
          {msgs.map(m => (
            <Message key={m.id} m={m} open={menu === m.id} onMenu={() => setMenu(menu === m.id ? null : m.id)}
              onMute={() => { chat.mute(m.uid, true); setMenu(null); setNote(`Wyciszono: ${m.n}.`); }} onReport={() => report(m)} />
          ))}
        </ul>
      )}
      {lockGlobal && <p class="sub">Na czacie globalnym piszesz od {B.CHAT_GLOBAL_FORGE}. poziomu kuźni. Do tego czasu pisz na czacie klanu.</p>}
      {!noClan && (
        <form class="chat-in" onSubmit={send}>
          <input aria-label="Wiadomość" maxLength={B.CHAT_MAX_LEN} placeholder={ch === 'global' ? 'Napisz do wszystkich…' : 'Napisz do klanu…'}
            value={text} disabled={lockGlobal || chat.state !== 'on'} onInput={e => setText(e.currentTarget.value)} />
          <button class="btn primary small" disabled={busy || lockGlobal || chat.state !== 'on' || !text.trim()}>Wyślij</button>
        </form>
      )}
      {note && <p class="sub" role="status">{note}</p>}
      {chat.muted.size > 0 && (
        <button class="linkbtn" onClick={() => { for (const u of [...chat.muted]) chat.mute(u, false); setNote('Wyciszeni gracze znów są widoczni.'); }}>
          Wyciszeni gracze: {chat.muted.size} — pokaż ich wiadomości
        </button>
      )}
      <button class="btn" onClick={close}>Zamknij</button>
    </div>
  );
}
