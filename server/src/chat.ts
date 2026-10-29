// Czat na żywo (WebSocket Nakamy): pokój globalny i kanał klanu. Serwer przepuszcza tylko te kanały,
// filtruje wulgaryzmy, pilnuje trybu wolnego i podpisuje wiadomości nickiem gracza.
// Wiadomość to JSON: { k: 'msg' | 'sys' | 'drop' | 'ann', t: tekst, n: nick, it?: przedmiot }.
import { B, RAR } from '../../src/data';
import { itemName } from '../../src/engine/formulas';
import type { Item } from '../../src/engine/types';
import { clanOf, postClan } from './clan';
import { INVALID, PRECONDITION, SYSTEM_USER, err, parse, readSave, userOf } from './common';
import { censor } from './filter';
import { nameOf } from './names';
import { SEEDS_AHEAD, proofFor, smeltOk } from './save';

export const ROOMS = ['global-pl'];
const BRAG_GLOBAL_MS = 10 * 60000;

/** Rodzaj kanału z identyfikatora Nakamy: „2...pokój” (pokój), „3.grupa..” (grupa), „4.…” (prywatne). */
export function channelKind(channelId: string): { kind: 'room' | 'group' | 'dm' | '?'; target: string } {
  const p = String(channelId).split('.');
  if (p[0] === '2') return { kind: 'room', target: p[3] || '' };
  if (p[0] === '3') return { kind: 'group', target: p[1] || '' };
  if (p[0] === '4') return { kind: 'dm', target: '' };
  return { kind: '?', target: '' };
}

/** Wolno dołączyć tylko do pokoju globalnego i kanału swojego klanu (członkostwo w grupie sprawdza Nakama). */
export function chatJoin(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, env: nkruntime.EnvelopeChannelJoin): nkruntime.EnvelopeChannelJoin {
  const j = env.channelJoin;
  if (j.type === 1 && ROOMS.includes(String(j.target))) { j.persistence = true; j.hidden = false; return env; }
  if (j.type === 3) { j.persistence = true; j.hidden = false; return env; }
  if (j.type === 2) throw err('Wiadomości prywatne pojawią się później.', PRECONDITION);
  throw err('Nie ma takiego kanału.', INVALID);
}

/** Każda wiadomość gracza: długość, tryb wolny, czat globalny od 5. poziomu kuźni, blokady, filtr słów, nick. */
export function chatSend(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, env: nkruntime.EnvelopeChannelMessageSend): nkruntime.EnvelopeChannelMessageSend {
  const userId = userOf(ctx);
  const m = env.channelMessageSend;
  const ch = channelKind(m.channelId);
  if (ch.kind !== 'room' && ch.kind !== 'group') throw err('Na tym kanale nie można pisać.', PRECONDITION);
  let text = '';
  try { text = String((JSON.parse(m.content) as { t?: unknown }).t ?? ''); } catch { /* zły format */ }
  text = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) throw err('Pusta wiadomość.', INVALID);
  if (text.length > B.CHAT_MAX_LEN) throw err(`Wiadomość może mieć najwyżej ${B.CHAT_MAX_LEN} znaków.`, INVALID);

  const bans = nk.storageRead([{ collection: 'chat', key: 'bans', userId: SYSTEM_USER }]);
  const until = bans.length ? Number((bans[0].value as { [k: string]: number })[userId]) || 0 : 0;
  if (until > Date.now()) throw err('Masz blokadę czatu.', PRECONDITION);

  const save = readSave(nk, userId);
  if (ch.kind === 'room' && (!save || save.value.state.forge.lvl < B.CHAT_GLOBAL_FORGE)) {
    throw err(`Na czacie globalnym piszesz od ${B.CHAT_GLOBAL_FORGE}. poziomu kuźni. Do tego czasu pisz na czacie klanu.`, PRECONDITION);
  }
  const slow = ch.kind === 'room' ? B.CHAT_SLOW_GLOBAL_MS : B.CHAT_SLOW_CLAN_MS;
  const key = 'chat_' + userId + '_' + ch.kind;
  const last = Number(nk.localcacheGet(key)) || 0;
  const now = Date.now();
  if (now - last < slow) throw err(`Zwolnij — ${Math.ceil(slow / 1000)} s między wiadomościami.`, PRECONDITION);
  nk.localcachePut(key, now, 60);

  m.content = JSON.stringify({ k: 'msg', t: censor(text).text, n: nameOf(nk, userId) || 'Kowal' });
  return env;
}

/** Edycja i usuwanie wiadomości przez graczy są wyłączone. */
export function chatBlock(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, _env: nkruntime.Envelope): nkruntime.Envelope {
  throw err('Wiadomości nie można zmieniać.', PRECONDITION);
}

/**
 * „Pochwal się dropem”: karta przedmiotu Mitycznego lub Boskiego na czacie klanu (automatycznie)
 * albo globalnym (na życzenie, raz na 10 minut). Serwer sprawdza, czy przedmiot naprawdę wykuto.
 */
export function rpcChatDrop(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const it = req.item as Item;
  const save = readSave(nk, userId);
  if (!save || !it || typeof it !== 'object' || typeof it.sx !== 'number') throw err('Brak przedmiotu.', INVALID);
  if (it.r < 5) throw err('Na czacie można pochwalić się przedmiotem Mitycznym albo Boskim.', INVALID);
  const s = save.value.state;
  if (!smeltOk(proofFor(nk, userId, s, save.value.meta), it, (s.sx || 0) + SEEDS_AHEAD)) throw err('Serwer nie potwierdził tego wytopu.', INVALID);
  const where = req.global === true ? 'global' : 'clan';
  const o = nk.storageRead([{ collection: 'chat', key: 'brag', userId }]);
  const done = o.length ? (o[0].value as { sx: string[]; g: number }) : { sx: [], g: 0 };
  const mark = where + ':' + it.sx;
  if (done.sx.includes(mark)) return JSON.stringify({ ok: true, again: true });
  const now = Date.now();
  if (where === 'global') {
    if (s.forge.lvl < B.CHAT_GLOBAL_FORGE) throw err(`Na czacie globalnym piszesz od ${B.CHAT_GLOBAL_FORGE}. poziomu kuźni.`, PRECONDITION);
    if (now - done.g < BRAG_GLOBAL_MS) throw err('Na czacie globalnym możesz chwalić się raz na 10 minut.', PRECONDITION);
  }
  const n = nameOf(nk, userId) || 'Kowal';
  const content = {
    k: 'drop', n, t: `${n} wykuł(a) ${RAR[it.r].n.toLowerCase()} przedmiot: ${itemName(it)}!`,
    it: { name: itemName(it), r: it.r, slot: it.slot, lvl: it.lvl, ore: it.ore, subs: it.subs, el: it.el, set: it.set },
  };
  if (where === 'global') {
    nk.channelMessageSend(nk.channelIdBuild(undefined, ROOMS[0], 1 as nkruntime.ChanType), content, userId, ctx.username ?? '', true);
    done.g = now;
  } else {
    const c = clanOf(nk, userId);
    if (!c) return JSON.stringify({ ok: false });
    postClan(nk, c.g.id, content);
  }
  done.sx = done.sx.concat(mark).slice(-60);
  nk.storageWrite([{ collection: 'chat', key: 'brag', userId, value: done, permissionRead: 0, permissionWrite: 0 }]);
  return JSON.stringify({ ok: true });
}

/** Zgłoszenie wiadomości — trafia do magazynu serwera (konsola Nakamy, kolekcja „reports”). */
export function rpcChatReport(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
  nk.storageWrite([{
    collection: 'reports', key: Date.now() + '_' + nk.uuidv4().slice(0, 8), userId: SYSTEM_USER, permissionRead: 0, permissionWrite: 0,
    value: { by: userId, byName: nameOf(nk, userId), channel: str(req.channel, 120), message: str(req.message, 64), sender: str(req.sender, 64), name: str(req.name, 32), text: str(req.text, 300), t: Date.now() },
  }]);
  return JSON.stringify({ ok: true });
}
