// Przedmioty dawnych kowali do skrzyń Zapomnianej Zbrojowni: serwer tworzy je (kowale-widma) i podpisuje,
// żeby liczyły się do rankingów. (Dawny Wielki Obieg — wymiana sprzedanych przedmiotów między graczami — jest usunięty;
// RPC zostaje pod starą nazwą `obieg_sync`, a starsze wersje gry, które wciąż wysyłają przedmioty, są ignorowane.)
import { B } from '../../src/data';
import type { Ctx } from '../../src/engine/context';
import { newBattle } from '../../src/engine/state';
import { ghostItem } from '../../src/engine/armory';
import type { Rng } from '../../src/engine/rng';
import type { GameState, Item } from '../../src/engine/types';
import { PRECONDITION, err, parse, readSave, serverRng, signItem, userOf } from './common';
import { proofFor } from './save';

/** Przedmiot kowala-widma na miarę kuźni gracza, podpisany przez serwer. */
function npcItem(nk: nkruntime.Nakama, key: string, rng: Rng, s: GameState): Item {
  const ctx = { s: JSON.parse(JSON.stringify(s)) as GameState, b: newBattle(), rng, now: () => Date.now(), emit: () => {}, cache: null, dirty: false, net: false } as Ctx;
  const it = ghostItem(ctx);
  it.id = 0;
  it.npc = true;
  it.sig = signItem(nk, key, it);
  return it;
}

/** `want` — ile przedmiotów do zapasu Zbrojowni. Zwraca je (pola `events`/`accepted` puste — dla starszych wersji gry). */
export function rpcObiegSync(ctx: nkruntime.Context, _logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  const req = parse(payload);
  const save = readSave(nk, userId);
  if (!save) throw err('Najpierw zapisz grę.', PRECONDITION);
  const s = save.value.state;
  const proof = proofFor(nk, userId, s, save.value.meta);
  const rng = serverRng(nk);
  const want = Math.max(0, Math.min(B.GHOST_STOCK, Math.floor(Number(req.want)) || 0));
  const items: Item[] = [];
  while (items.length < want) items.push(npcItem(nk, proof.sign, rng, s));
  return JSON.stringify({ accepted: 0, items, events: [], real: 0, serverTime: Date.now() });
}
