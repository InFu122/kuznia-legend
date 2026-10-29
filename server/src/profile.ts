// Profil gracza: awatar i ramka, tytuł kowala, Moc, ekwipunek, statystyki bohatera, klan, liga i ocena areny, Dziedzictwo.
// Statystyki pochodzą z bohatera areny (liczone z uznanych przedmiotów), a gdy go nie ma — z zapisu.
import { LANDS } from '../../src/data';
import { frameOr, skinOr } from '../../src/engine/cosmetics';
import { fighterStats } from '../../src/engine/duel';
import { smithTitle } from '../../src/engine/formulas';
import { allMods } from '../../src/engine/mods';
import { computeStats, extraOf } from '../../src/engine/stats';
import { readHero } from './arena';
import { clanOf } from './clan';
import { INVALID, NOT_FOUND, err, parse, readSave, userOf } from './common';
import { ownRecord } from './ranking';
import { cleanName } from './validate';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function rpcPlayerProfile(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const me = userOf(ctx);
  const id = String(parse(payload).id || '');
  if (!UUID.test(id)) throw err('Nie ma takiego gracza.', INVALID);
  const save = readSave(nk, id);
  if (!save) throw err('Ten gracz nie ma jeszcze zapisanej gry.', NOT_FOUND);
  const s = save.value.state;
  const hero = readHero(nk, id);
  // Bohater areny jest aktualny po każdym zapisie od drugiej krainy; starszy (np. po Dziedzictwie) — liczymy z zapisu.
  const fresh = hero && hero.t >= (save.value.savedAt || 0) - 60000;
  const st = fresh ? hero!.f.st : fighterStats(computeStats(s.eq, allMods(s), extraOf(s)));
  const c = clanOf(nk, id);
  const arena = ownRecord(nk, 'arena', id);
  const lo = nk.storageRead([{ collection: 'league', key: 'me', userId: id }]);
  const league = lo.length ? Number((lo[0].value as { tier?: number }).tier) || 0 : null;
  const ach = Object.values(s.ach || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  return JSON.stringify({
    id, me: id === me, name: cleanName(s.name), title: smithTitle(s.smith?.fame ?? 0).n,
    sk: skinOr(s.look?.skin), fr: frameOr(s.look?.frame),
    power: save.value.power, forge: s.forge.lvl, land: LANDS[s.maxLand]?.n ?? '', maxLand: s.maxLand,
    eq: s.eq, st, skills: (s.skills?.eq ?? []).filter(Boolean), pet: s.petSel ?? null, mount: s.mountSel ?? null,
    clan: c ? { n: c.g.name, tag: ((c.g.metadata || {}) as { tag?: string }).tag || '' } : null,
    arena: arena ? { rating: arena.score, rank: arena.rank } : null, league,
    legacy: s.legacy && s.legacy.gen > 0 ? { gen: s.legacy.gen, stars: s.legacy.stars } : null,
    codex: Array.isArray(s.codex) ? s.codex.length : 0, ach, savedAt: save.value.savedAt,
  });
}
