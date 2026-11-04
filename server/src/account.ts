// Usunięcie konta na prośbę gracza (wymóg Google Play: z poziomu gry i ze strony WWW).
//
// Kolejność: wiadomości gracza na czacie (pokój globalny i kanał klanu), wyjście z klanu (z przekazaniem
// przywództwa albo rozwiązaniem pustego klanu), nick w rejestrze, kod przeniesienia, miejsce w grupie ligi,
// wpisy w rankingach, zgłoszenia uwag i błędów — a na końcu samo konto Nakamy razem z zapisem gry, portfelem, urządzeniami i całym
// magazynem gracza. Przedmioty, które gracz oddał wcześniej do Wielkiego Obiegu, zostają w grze innych graczy.
import { BOARDS } from './ranking';
import { ROOMS } from './chat';
import { clanOf, leaveClan } from './clan';
import { INVALID, NOT_FOUND, SYSTEM_USER, err, parse, readSave, updateObject, userOf } from './common';
import { nameKey, releaseName } from './names';

/** Słowo, które gracz wpisuje w grze, żeby potwierdzić usunięcie konta. */
export const DELETE_WORD = 'USUŃ';
const MSG_PAGES = 30; // najwyżej 30 × 100 ostatnich wiadomości na kanał

/** Usuwa wiadomości gracza z kanału czatu (najnowsze najpierw). Zwraca liczbę usuniętych. */
function dropMessages(nk: nkruntime.Nakama, channelId: string, userId: string): number {
  let cursor: string | undefined;
  let n = 0;
  for (let page = 0; page < MSG_PAGES; page++) {
    const l = nk.channelMessagesList(channelId, 100, false, cursor);
    for (const m of l.messages || []) {
      if (m.senderId === userId && m.messageId) {
        try { nk.channelMessageRemove(channelId, m.messageId, userId, m.username || '', true); n++; } catch { /* już usunięta */ }
      }
    }
    cursor = l.nextCursor;
    if (!cursor) break;
  }
  return n;
}

interface LeagueMe { g?: string | null }
interface LeagueGroup { members: Record<string, unknown>; order: string[] }

export function deleteAccount(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, username: string): void {
  const step = (what: string, fn: () => void) => {
    try { fn(); } catch (e) { logger.warn('Usuwanie konta %s — %s: %s', userId, what, String(e)); }
  };
  let msgs = 0;
  step('czat', () => {
    for (const room of ROOMS) msgs += dropMessages(nk, nk.channelIdBuild(undefined, room, 1 as nkruntime.ChanType), userId);
    const c = clanOf(nk, userId);
    if (c) msgs += dropMessages(nk, nk.channelIdBuild(undefined, c.g.id, 3 as nkruntime.ChanType), userId);
  });
  step('klan', () => leaveClan(nk, userId, username));
  step('prośby do klanów', () => {
    for (const u of nk.userGroupsList(userId, 20).userGroups || []) if (u.group) nk.groupUserLeave(u.group.id, userId, username);
  });
  step('nick', () => releaseName(nk, userId));
  step('kod przeniesienia', () => {
    const mine = nk.storageRead([{ collection: 'transfer', key: 'mine', userId }]);
    if (mine.length && mine[0].value.code) nk.storageDelete([{ collection: 'transfer', key: String(mine[0].value.code), userId: SYSTEM_USER }]);
  });
  step('liga', () => {
    const me = nk.storageRead([{ collection: 'league', key: 'me', userId }]);
    const g = me.length ? (me[0].value as LeagueMe).g : null;
    if (g) {
      updateObject<LeagueGroup>(nk, 'league_grp', g, SYSTEM_USER, cur => {
        if (!cur || !cur.members[userId]) return null;
        const members = { ...cur.members };
        delete members[userId];
        return { ...cur, members, order: cur.order.filter(x => x !== userId) };
      });
    }
  });
  step('zgłoszenia uwag', () => {
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const l = nk.storageList(SYSTEM_USER, 'feedback', 100, cursor);
      const mine = (l.objects || []).filter(o => (o.value as { by?: string }).by === userId);
      if (mine.length) nk.storageDelete(mine.map(o => ({ collection: 'feedback', key: o.key, userId: SYSTEM_USER })));
      cursor = l.cursor;
      if (!cursor) break;
    }
  });
  step('rankingi', () => {
    for (const id of Object.keys(BOARDS)) {
      try { nk.leaderboardRecordDelete(id, userId); } catch { /* brak wpisu */ }
    }
  });
  nk.accountDeleteId(userId, false);
  logger.info('Konto %s usunięte na prośbę gracza (usunięte wiadomości czatu: %d).', userId, msgs);
}

/** Usunięcie konta z gry: gracz potwierdza słowem „USUŃ”. Po tym gra zaczyna od zera na nowym koncie. */
export function rpcAccountDelete(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const word = String(parse(payload).confirm || '').trim().toUpperCase();
  if (word !== DELETE_WORD && word !== 'USUN') throw err(`Wpisz ${DELETE_WORD}, żeby potwierdzić usunięcie konta.`, INVALID);
  deleteAccount(nk, logger, userId, ctx.username ?? '');
  return JSON.stringify({ ok: true });
}

/**
 * Usunięcie konta przez administratora — dla gracza, który prosi o to e-mailem (np. nie ma już gry na telefonie).
 * Tylko z kluczem serwera (NAKAMA_HTTP_KEY z .env), np.:
 *   curl -X POST "https://ADRES/v2/rpc/account_delete_admin?http_key=KLUCZ&unwrap" -d '{"name":"Nick"}'
 * Bez `"confirm":true` tylko pokazuje znalezione konto; z nim — usuwa.
 */
export function rpcAccountDeleteAdmin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  if (ctx.userId) throw err('Tylko dla administratora.', INVALID);
  const req = parse(payload);
  let userId = typeof req.id === 'string' ? req.id : '';
  if (!userId && typeof req.name === 'string') {
    const o = nk.storageRead([{ collection: 'names', key: nameKey(req.name), userId: SYSTEM_USER }]);
    userId = o.length ? String((o[0].value as { u?: string }).u || '') : '';
  }
  if (!userId) throw err('Nie ma gracza o takim nicku.', NOT_FOUND);
  let acc: nkruntime.Account;
  try { acc = nk.accountGetId(userId); } catch { throw err('Nie ma takiego konta.', NOT_FOUND); }
  const save = readSave(nk, userId);
  const found = {
    id: userId,
    nick: acc.user.displayName || acc.user.username,
    kuznia: save ? save.value.state.forge.lvl : null,
    ostatniZapis: save ? new Date(save.value.savedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null,
  };
  if (req.confirm !== true) return JSON.stringify({ znaleziono: found, usun: 'wyślij to samo z "confirm":true' }, null, 1);
  deleteAccount(nk, logger, userId, acc.user.username || '');
  return JSON.stringify({ usunieto: found }, null, 1);
}
