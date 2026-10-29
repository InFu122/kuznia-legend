// Wielki Obieg na serwerze: sprzedane przedmioty graczy trafiają do wspólnej puli, a skrzynie bossów
// i Zbrojownia innych graczy dostają je z powrotem — podpisane przez serwer. Kowal dostaje wieść, gdy ktoś
// znajdzie jego przedmiot. Gdy w puli brakuje przedmiotów innych graczy, serwer dokłada przedmioty kowali-widm.
import { B, LANDS, ORES } from '../../src/data';
import type { Ctx } from '../../src/engine/context';
import { itemLevelFor, itemName } from '../../src/engine/formulas';
import { newBattle } from '../../src/engine/state';
import { obiegItem } from '../../src/engine/obieg';
import { ri, type Rng } from '../../src/engine/rng';
import type { FoundEvent, GameState, Item } from '../../src/engine/types';
import { PRECONDITION, SYSTEM_USER, err, parse, readSave, serverRng, signItem, updateObject, userOf } from './common';
import { proofFor, smeltOk } from './save';

/** Kod powiadomienia: ktoś znalazł twój przedmiot. */
export const NOTE_FOUND = 100;
const POOL_MAX = 400;
const SENT_MAX = 500;
const OUT_MAX = 10;

interface PoolEntry { it: Item; uid: string; t: number }
interface Pool { items: PoolEntry[] }

/** Najlepsza ruda, której przedmioty gracz może dostać z Obiegu: z jego krainy i taka, którą sam umie wytopić. */
export function maxOreFor(s: GameState): number {
  let ore = LANDS[s.maxLand].rare;
  while (ore > 0 && ORES[ore].lvl > s.forge.lvl) ore--;
  return ore;
}

/** Przedmiot z puli przygotowany dla znalazcy: poziom na miarę jego kuźni i podpis serwera. */
function forFinder(nk: nkruntime.Nakama, key: string, rng: Rng, src: Item, s: GameState): Item {
  const it: Item = JSON.parse(JSON.stringify(src));
  it.id = 0;
  it.lvl = itemLevelFor(s.forge.lvl, ri(rng, -1, 1));
  it.obieg = true;
  delete it.sx;
  it.sig = signItem(nk, key, it);
  return it;
}

/** Przedmiot kowala-widma (gdy w puli brakuje przedmiotów innych graczy). */
function npcItem(nk: nkruntime.Nakama, key: string, rng: Rng, s: GameState): Item {
  const ctx = { s: JSON.parse(JSON.stringify(s)) as GameState, b: newBattle(), rng, now: () => Date.now(), emit: () => {}, cache: null, dirty: false, net: false } as Ctx;
  const it = obiegItem(ctx);
  it.id = 0;
  it.npc = true;
  it.sig = signItem(nk, key, it);
  return it;
}

/**
 * Jedno połączenie z Obiegiem:
 * `out` — twoje sprzedane przedmioty (serwer sprawdza ich wytop), `want` — ile znalezisk chcesz w zapas.
 * Zwraca znaleziska oraz wieści o twoich przedmiotach znalezionych przez innych.
 */
export function rpcObiegSync(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const save = readSave(nk, userId);
  if (!save) throw err('Najpierw zapisz grę.', PRECONDITION);
  const s = save.value.state;
  const now = Date.now();
  const proof = proofFor(nk, userId, s, save.value.meta);
  const rng = serverRng(nk);

  // 1. Twoje przedmioty do puli — tylko prawdziwe wytopy, każdy raz.
  const out = Array.isArray(req.out) ? (req.out as Item[]).slice(0, OUT_MAX) : [];
  const fresh: PoolEntry[] = [];
  if (out.length) {
    updateObject<{ sx: number[] }>(nk, 'obieg', 'sent', userId, cur => {
      fresh.length = 0;
      const sent = cur ? cur.sx.slice() : [];
      for (const it of out) {
        if (!it || typeof it !== 'object' || typeof it.sx !== 'number' || sent.includes(it.sx)) continue;
        if (it.r < 2 || !smeltOk(proof, it, s.sx)) continue;
        sent.push(it.sx);
        // Piętno kowala to zawsze obecny nick z rejestru (nie da się podszyć pod innego gracza).
        const clean: Item = { ...it, smith: s.name, id: 0, fame: 0, kills: {}, bosses: 0, ls: 0, aw: null, owners: [s.name], obieg: false };
        delete clean.sig;
        delete clean.npc;
        fresh.push({ it: clean, uid: userId, t: now });
      }
      return fresh.length ? { sx: sent.slice(-SENT_MAX) } : null;
    });
  }

  // 2. Znaleziska dla ciebie: przedmioty innych graczy, na miarę twojej kuźni.
  const want = Math.max(0, Math.min(B.OBIEG_STOCK, Math.floor(Number(req.want)) || 0));
  const maxOre = maxOreFor(s);
  let taken: PoolEntry[] = [];
  if (fresh.length || want) {
    updateObject<Pool>(nk, 'obieg', 'pool', SYSTEM_USER, cur => {
      const items = (cur ? cur.items : []).concat(fresh);
      const fits = items.map((e, i) => [e, i] as const).filter(([e]) => e.uid !== userId && e.it.ore <= maxOre);
      const pickIdx = new Set<number>();
      while (pickIdx.size < Math.min(want, fits.length)) pickIdx.add(fits[Math.floor(rng.next() * fits.length)][1]);
      taken = items.filter((_, i) => pickIdx.has(i));
      if (!fresh.length && !taken.length) return null;
      return { items: items.filter((_, i) => !pickIdx.has(i)).slice(-POOL_MAX) };
    });
  }
  const key = proof.sign;
  const items = taken.map(e => forFinder(nk, key, rng, e.it, s));
  if (taken.length) {
    nk.notificationsSend(taken.map(e => ({
      userId: e.uid, subject: 'Wielki Obieg', code: NOTE_FOUND, persistent: true, senderId: userId,
      content: { who: s.name, n: itemName(e.it), r: e.it.r },
    })));
  }
  while (items.length < want) items.push(npcItem(nk, key, rng, s));

  // 3. Wieści: kto znalazł twoje przedmioty.
  const notes = (nk.notificationsList(userId, 100).notifications || []).filter(n => n.code === NOTE_FOUND);
  const events: FoundEvent[] = notes.map(n => {
    const c = (typeof n.content === 'string' ? JSON.parse(n.content) : n.content) as FoundEvent;
    return { who: String(c.who), n: String(c.n), r: Number(c.r) || 0 };
  });
  const ids = notes.map(n => n.id).filter((x): x is string => !!x);
  if (ids.length) nk.notificationsDeleteId(ids, userId);

  return JSON.stringify({ accepted: fresh.length, items, events, real: taken.length, serverTime: now });
}
