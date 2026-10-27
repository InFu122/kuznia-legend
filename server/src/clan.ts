// Klany na grupach Nakamy. Gra zarządza klanem wyłącznie przez RPC (bezpośrednie API grup jest zablokowane),
// więc serwer pilnuje zasad: odblokowanie po pierwszym bossie, minimalna Moc, tryb wstępu, limity ról.
// Role: Przywódca = superadmin (0), Zastępca = admin (1), Starszy = członek z listy `elders`, Członek (2), prośba (3).
import { B } from '../../src/data';
import { INVALID, NOT_FOUND, PRECONDITION, SYSTEM_USER, err, parse, readSave, userOf } from './common';
import { censor, nameClean } from './filter';
import { nameKey, nameOf } from './names';

export type ClanMode = 'open' | 'request' | 'closed';
export type Role = 'lider' | 'zastepca' | 'starszy' | 'czlonek' | 'prosba';
export interface ClanMeta { tag: string; mode: ClanMode; minPower: number; lang: string; ann: string; annBy: string; annT: number; elders: string[] }

const MODES: ClanMode[] = ['open', 'request', 'closed'];
export const LANGS = ['pl', 'en', 'de', 'cs', 'uk'];
const CLAN_NAME = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż '_.\-]+$/;
const CREATE_COOLDOWN_MS = 24 * 3600000;
const DESC_MAX = 160;
const ANN_MAX = 300;
const ROLE_N: Record<Role, string> = { lider: 'Przywódca', zastepca: 'Zastępca', starszy: 'Starszy', czlonek: 'Członek', prosba: 'prośba' };

const meta = (g: nkruntime.Group): ClanMeta => {
  const m = (g.metadata || {}) as Partial<ClanMeta>;
  return {
    tag: m.tag || '', mode: m.mode && MODES.includes(m.mode) ? m.mode : 'open', minPower: m.minPower || 0, lang: m.lang || 'pl',
    ann: m.ann || '', annBy: m.annBy || '', annT: m.annT || 0, elders: Array.isArray(m.elders) ? m.elders : [],
  };
};

export function roleOf(state: number | undefined, userId: string, m: ClanMeta): Role {
  if (state === 0) return 'lider';
  if (state === 1) return 'zastepca';
  if (state === 3) return 'prosba';
  return m.elders.includes(userId) ? 'starszy' : 'czlonek';
}

/** Klan gracza (bez próśb o przyjęcie) albo null. */
export function clanOf(nk: nkruntime.Nakama, userId: string): { g: nkruntime.Group; state: number } | null {
  const l = nk.userGroupsList(userId, 20).userGroups || [];
  const x = l.find(u => u.group && typeof u.state === 'number' && u.state <= 2);
  return x && x.group ? { g: x.group, state: x.state as number } : null;
}

const pendingOf = (nk: nkruntime.Nakama, userId: string) =>
  (nk.userGroupsList(userId, 20).userGroups || []).filter(u => u.state === 3 && u.group).map(u => u.group as nkruntime.Group);

/** Wpis systemowy na czacie klanu. */
export function postClan(nk: nkruntime.Nakama, groupId: string, content: { [k: string]: unknown }): void {
  try {
    nk.channelMessageSend(nk.channelIdBuild(undefined, groupId, 3 as nkruntime.ChanType), content, SYSTEM_USER, '', true);
  } catch { /* czat nie jest konieczny do działania klanu */ }
}
const sys = (nk: nkruntime.Nakama, groupId: string, t: string) => postClan(nk, groupId, { k: 'sys', t });

function myPower(nk: nkruntime.Nakama, userId: string): number {
  const s = readSave(nk, userId);
  return s ? s.value.power || 0 : 0;
}

function requireUnlocked(nk: nkruntime.Nakama, userId: string): void {
  const s = readSave(nk, userId);
  if (!s || s.value.state.maxLand < B.CLAN_UNLOCK_LAND) throw err('Klany odblokujesz po pokonaniu pierwszego bossa.', PRECONDITION);
}

const displayName = (nk: nkruntime.Nakama, userId: string) => nameOf(nk, userId) || 'Kowal';

function members(nk: nkruntime.Nakama, groupId: string): nkruntime.GroupUser[] {
  return nk.groupUsersList(groupId, 100).groupUsers || [];
}

function updateMeta(nk: nkruntime.Nakama, g: nkruntime.Group, m: ClanMeta, extra: { desc?: string; open?: boolean; lang?: string } = {}): void {
  nk.groupUpdate(g.id, null, null, null, extra.lang ?? null, extra.desc ?? null, null, extra.open ?? null, m as unknown as { [k: string]: unknown }, null);
}

/** Wycofuje prośby o przyjęcie do innych klanów (gracz jest już w klanie). */
function dropRequests(nk: nkruntime.Nakama, userId: string, username: string): void {
  for (const g of pendingOf(nk, userId)) { try { nk.groupUserLeave(g.id, userId, username); } catch { /* już nie ma prośby */ } }
}

function clanSummary(g: nkruntime.Group) {
  const m = meta(g);
  return { id: g.id, name: g.name, tag: m.tag, desc: g.description, members: g.edgeCount, max: g.maxCount, minPower: m.minPower, mode: m.mode, lang: g.langTag || m.lang };
}

/* ---------- RPC ---------- */

/** Lista klanów (z wyszukiwaniem po początku nazwy). */
export function rpcClanList(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const q = typeof parse(payload).q === 'string' ? String(parse(payload).q).trim().slice(0, 20) : '';
  const list = nk.groupsList(q ? q + '%' : undefined, undefined, undefined, undefined, 50).groups || [];
  const pending = pendingOf(nk, userId).map(g => g.id);
  return JSON.stringify({
    clans: list.map(g => ({ ...clanSummary(g), pending: pending.includes(g.id) })).sort((a, b) => b.members - a.members),
    power: myPower(nk, userId),
  });
}

/** Zakłada klan: nazwa i skrót są unikalne, założyciel zostaje Przywódcą. */
export function rpcClanCreate(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  requireUnlocked(nk, userId);
  if (clanOf(nk, userId)) throw err('Jesteś już w klanie — najpierw go opuść.', PRECONDITION);
  const name = typeof req.name === 'string' ? req.name.replace(/\s+/g, ' ').trim() : '';
  const tag = typeof req.tag === 'string' ? req.tag.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  if (name.length < 3 || name.length > 20 || !CLAN_NAME.test(name)) throw err('Nazwa klanu: 3–20 znaków (litery, cyfry, spacja, _ . - \').', INVALID);
  if (tag.length < 2 || tag.length > 4) throw err('Skrót klanu: 2–4 litery lub cyfry.', INVALID);
  if (!nameClean(name) || !nameClean(tag)) throw err('Nazwa albo skrót zawiera niedozwolone słowo.', INVALID);
  const mode = MODES.includes(req.mode as ClanMode) ? (req.mode as ClanMode) : 'open';
  const lang = LANGS.includes(String(req.lang)) ? String(req.lang) : 'pl';
  const minPower = Math.max(0, Math.min(1e9, Math.floor(Number(req.minPower) || 0)));
  const desc = censor(typeof req.desc === 'string' ? req.desc.trim().slice(0, DESC_MAX) : '').text;

  const me = nk.storageRead([{ collection: 'clan', key: 'me', userId }]);
  const last = me.length ? Number(me[0].value.created) || 0 : 0;
  if (Date.now() - last < CREATE_COOLDOWN_MS) throw err('Nowy klan możesz założyć raz na dobę.', PRECONDITION);

  // Rejestr nazw i skrótów (bez względu na wielkość liter i polskie znaki).
  const keys = [{ collection: 'clan_names', key: 'n_' + nameKey(name) }, { collection: 'clan_names', key: 't_' + tag.toLowerCase() }];
  if (nk.storageRead(keys.map(k => ({ ...k, userId: SYSTEM_USER }))).length) throw err('Klan o takiej nazwie albo skrócie już istnieje.', INVALID);
  const m: ClanMeta = { tag, mode, minPower, lang, ann: '', annBy: '', annT: 0, elders: [] };
  let g: nkruntime.Group;
  try {
    g = nk.groupCreate(userId, name, userId, lang, desc, '', mode === 'open', m as unknown as { [k: string]: unknown }, B.CLAN_MAX);
  } catch {
    throw err('Klan o takiej nazwie już istnieje.', INVALID);
  }
  nk.storageWrite(keys.map(k => ({ ...k, userId: SYSTEM_USER, value: { g: g.id }, permissionRead: 0 as const, permissionWrite: 0 as const })));
  nk.storageWrite([{ collection: 'clan', key: 'me', userId, value: { created: Date.now() }, permissionRead: 0, permissionWrite: 0 }]);
  dropRequests(nk, userId, ctx.username ?? '');
  sys(nk, g.id, `${displayName(nk, userId)} zakłada klan ${name} [${tag}].`);
  return JSON.stringify({ id: g.id });
}

/** Dołączenie (klan otwarty) albo prośba o przyjęcie (klan na prośbę). */
export function rpcClanJoin(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const id = String(parse(payload).id || '');
  requireUnlocked(nk, userId);
  if (clanOf(nk, userId)) throw err('Jesteś już w klanie — najpierw go opuść.', PRECONDITION);
  const g = (nk.groupsGetId([id]) || [])[0];
  if (!g) throw err('Nie ma takiego klanu.', NOT_FOUND);
  const m = meta(g);
  if (m.mode === 'closed') throw err('Ten klan nie przyjmuje nowych członków.', PRECONDITION);
  if (g.edgeCount >= g.maxCount) throw err('Klan jest pełny.', PRECONDITION);
  const power = myPower(nk, userId);
  if (power < m.minPower) throw err(`Ten klan wymaga Mocy ${m.minPower} (twoja Moc w rankingu: ${power}).`, PRECONDITION);
  nk.groupUserJoin(g.id, userId, ctx.username ?? '');
  if (m.mode === 'open') {
    dropRequests(nk, userId, ctx.username ?? '');
    sys(nk, g.id, `${displayName(nk, userId)} dołącza do klanu.`);
    return JSON.stringify({ joined: true });
  }
  return JSON.stringify({ requested: true });
}

/** Odejście z klanu. Przywódca przekazuje władzę (Zastępcy, Starszemu albo najstarszemu członkowi); ostatni członek rozwiązuje klan. */
export function leaveClan(nk: nkruntime.Nakama, userId: string, username: string): void {
  const c = clanOf(nk, userId);
  if (!c) return;
  const g = c.g;
  const m = meta(g);
  const all = members(nk, g.id).filter(u => u.user && typeof u.state === 'number' && u.state <= 2 && u.user.userId !== userId);
  const who = displayName(nk, userId);
  if (!all.length) {
    nk.groupDelete(g.id);
    nk.storageDelete([
      { collection: 'clan_names', key: 'n_' + nameKey(g.name), userId: SYSTEM_USER },
      { collection: 'clan_names', key: 't_' + m.tag.toLowerCase(), userId: SYSTEM_USER },
    ]);
    return;
  }
  if (c.state === 0 && !all.some(u => u.state === 0)) {
    const rank = (u: nkruntime.GroupUser) => (u.state === 1 ? 0 : m.elders.includes(u.user.userId) ? 1 : 2);
    const next = all.slice().sort((a, b) => rank(a) - rank(b) || Number(a.user.createTime) - Number(b.user.createTime))[0];
    const steps = next.state === 1 ? 1 : 2;
    for (let i = 0; i < steps; i++) nk.groupUsersPromote(g.id, [next.user.userId]);
    m.elders = m.elders.filter(x => x !== next.user.userId);
    sys(nk, g.id, `${displayName(nk, next.user.userId)} zostaje Przywódcą klanu.`);
  }
  m.elders = m.elders.filter(x => x !== userId);
  updateMeta(nk, g, m);
  nk.groupUserLeave(g.id, userId, username);
  sys(nk, g.id, `${who} opuszcza klan.`);
}

export function rpcClanLeave(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const id = String(parse(payload).cancel || '');
  if (id) { // wycofanie prośby o przyjęcie
    nk.groupUserLeave(id, userId, ctx.username ?? '');
    return JSON.stringify({ ok: true });
  }
  if (!clanOf(nk, userId)) throw err('Nie jesteś w klanie.', PRECONDITION);
  leaveClan(nk, userId, ctx.username ?? '');
  return JSON.stringify({ ok: true });
}

/** Klan gracza: dane, ogłoszenie, członkowie z rolą i Mocą, prośby o przyjęcie. */
export function rpcClanInfo(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, _payload: string): string {
  const userId = userOf(ctx);
  const c = clanOf(nk, userId);
  if (!c) {
    const s = readSave(nk, userId);
    return JSON.stringify({ clan: null, unlocked: !!s && s.value.state.maxLand >= B.CLAN_UNLOCK_LAND, pending: pendingOf(nk, userId).map(clanSummary) });
  }
  const g = c.g;
  const m = meta(g);
  const list = members(nk, g.id).filter(u => u.user);
  const ids = list.map(u => u.user.userId);
  const power: Record<string, number> = {};
  for (const r of nk.leaderboardRecordsList('moc', ids, ids.length).ownerRecords || []) power[r.ownerId] = r.score;
  const people = list.map(u => ({
    id: u.user.userId, name: u.user.displayName || u.user.username, role: roleOf(u.state, u.user.userId, m),
    power: power[u.user.userId] || 0, online: !!u.user.online, me: u.user.userId === userId,
  }));
  const order: Record<Role, number> = { lider: 0, zastepca: 1, starszy: 2, czlonek: 3, prosba: 4 };
  people.sort((a, b) => order[a.role] - order[b.role] || b.power - a.power);
  const myRole = roleOf(c.state, userId, m);
  return JSON.stringify({
    clan: { ...clanSummary(g), ann: m.ann, annBy: m.annBy, annT: m.annT },
    role: myRole,
    members: people.filter(p => p.role !== 'prosba'),
    requests: myRole === 'czlonek' ? [] : people.filter(p => p.role === 'prosba'),
    unlocked: true,
  });
}

/**
 * Zarządzanie członkami: przyjmij / odrzuć prośbę, awansuj, zdegraduj, wyrzuć, przekaż przywództwo.
 * Przywódca może wszystko; Zastępca przyjmuje, odrzuca i wyrzuca Starszych i Członków; Starszy przyjmuje i odrzuca prośby.
 */
export function rpcClanManage(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const action = String(req.action || '');
  const target = String(req.user || '');
  const c = clanOf(nk, userId);
  if (!c) throw err('Nie jesteś w klanie.', PRECONDITION);
  const g = c.g;
  const m = meta(g);
  const me = roleOf(c.state, userId, m);
  const t = members(nk, g.id).find(u => u.user && u.user.userId === target);
  if (!t || target === userId) throw err('Nie ma takiego członka.', NOT_FOUND);
  const tr = roleOf(t.state, target, m);
  const tn = t.user.displayName || 'Kowal';
  const deny = () => { throw err('Nie masz do tego uprawnień.', PRECONDITION); };
  const count = (r: Role) => members(nk, g.id).filter(u => u.user && roleOf(u.state, u.user.userId, m) === r).length;

  switch (action) {
    case 'accept':
      if (tr !== 'prosba' || me === 'czlonek') deny();
      if (g.edgeCount >= g.maxCount) throw err('Klan jest pełny.', PRECONDITION);
      if (clanOf(nk, target)) { nk.groupUsersKick(g.id, [target]); throw err(`${tn} jest już w innym klanie.`, PRECONDITION); }
      nk.groupUsersAdd(g.id, [target]);
      dropRequests(nk, target, t.user.username);
      sys(nk, g.id, `${tn} dołącza do klanu.`);
      break;
    case 'reject':
      if (tr !== 'prosba' || me === 'czlonek') deny();
      nk.groupUsersKick(g.id, [target]);
      break;
    case 'kick':
      if (!(me === 'lider' || (me === 'zastepca' && (tr === 'starszy' || tr === 'czlonek'))) || tr === 'prosba') deny();
      nk.groupUsersKick(g.id, [target]);
      m.elders = m.elders.filter(x => x !== target);
      updateMeta(nk, g, m);
      sys(nk, g.id, `${tn} zostaje usunięty(-a) z klanu.`);
      break;
    case 'promote':
      if (me !== 'lider') deny();
      if (tr === 'czlonek') {
        if (count('starszy') >= B.CLAN_ELDERS) throw err(`Klan ma już ${B.CLAN_ELDERS} Starszych.`, PRECONDITION);
        m.elders.push(target);
        updateMeta(nk, g, m);
      } else if (tr === 'starszy') {
        if (count('zastepca') >= B.CLAN_DEPUTIES) throw err(`Klan ma już ${B.CLAN_DEPUTIES} Zastępców.`, PRECONDITION);
        nk.groupUsersPromote(g.id, [target]);
        m.elders = m.elders.filter(x => x !== target);
        updateMeta(nk, g, m);
      } else deny();
      sys(nk, g.id, `${tn} zostaje ${tr === 'czlonek' ? 'Starszym' : 'Zastępcą'}.`);
      break;
    case 'demote':
      if (me !== 'lider') deny();
      if (tr === 'zastepca') {
        nk.groupUsersDemote(g.id, [target]);
        if (count('starszy') < B.CLAN_ELDERS) m.elders.push(target);
      } else if (tr === 'starszy') m.elders = m.elders.filter(x => x !== target);
      else deny();
      updateMeta(nk, g, m);
      sys(nk, g.id, `${tn} jest teraz ${tr === 'zastepca' && m.elders.includes(target) ? 'Starszym' : 'Członkiem'}.`);
      break;
    case 'transfer': {
      if (me !== 'lider' || tr === 'prosba') deny();
      const steps = tr === 'zastepca' ? 1 : 2;
      for (let i = 0; i < steps; i++) nk.groupUsersPromote(g.id, [target]);
      m.elders = m.elders.filter(x => x !== target);
      nk.groupUsersDemote(g.id, [userId]); // były Przywódca zostaje Zastępcą
      if (count('zastepca') > B.CLAN_DEPUTIES) { nk.groupUsersDemote(g.id, [userId]); m.elders.push(userId); }
      updateMeta(nk, g, m);
      sys(nk, g.id, `${tn} zostaje Przywódcą klanu.`);
      break;
    }
    default:
      throw err('Nieznana akcja.', INVALID);
  }
  return JSON.stringify({ ok: true, role: ROLE_N[tr] });
}

/** Ustawienia klanu (Przywódca) i ogłoszenie (Przywódca i Zastępcy). */
export function rpcClanSettings(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const c = clanOf(nk, userId);
  if (!c) throw err('Nie jesteś w klanie.', PRECONDITION);
  const g = c.g;
  const m = meta(g);
  const me = roleOf(c.state, userId, m);
  const extra: { desc?: string; open?: boolean; lang?: string } = {};
  if (typeof req.ann === 'string') {
    if (me !== 'lider' && me !== 'zastepca') throw err('Ogłoszenia piszą Przywódca i Zastępcy.', PRECONDITION);
    m.ann = censor(req.ann.trim().slice(0, ANN_MAX)).text;
    m.annBy = displayName(nk, userId);
    m.annT = Date.now();
    if (m.ann) postClan(nk, g.id, { k: 'ann', t: m.ann, n: m.annBy });
  }
  const settings = ['desc', 'mode', 'minPower', 'lang'].some(k => req[k] !== undefined);
  if (settings) {
    if (me !== 'lider') throw err('Ustawienia zmienia Przywódca.', PRECONDITION);
    if (typeof req.desc === 'string') extra.desc = censor(req.desc.trim().slice(0, DESC_MAX)).text;
    if (MODES.includes(req.mode as ClanMode)) { m.mode = req.mode as ClanMode; extra.open = m.mode === 'open'; }
    if (req.minPower !== undefined) m.minPower = Math.max(0, Math.min(1e9, Math.floor(Number(req.minPower) || 0)));
    if (LANGS.includes(String(req.lang))) { m.lang = String(req.lang); extra.lang = m.lang; }
  }
  updateMeta(nk, g, m, extra);
  return JSON.stringify({ ok: true });
}

/** Bezpośrednie API grup Nakamy jest wyłączone — klanami zarządza się tylko przez gry (RPC wyżej). */
export function blockGroupApi(_ctx: nkruntime.Context, _logger: nkruntime.Logger, _nk: nkruntime.Nakama, _data: unknown): never {
  throw err('Klanami zarządza się w grze.', PRECONDITION);
}
