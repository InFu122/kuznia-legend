// Zapomniana Zbrojownia: przedmioty dawnych kowali (duchów) — z historią (kowal, pokonani wrogowie, właściciele),
// na miarę twojej kuźni. Z serwerem tworzy je i podpisuje serwer (zapas obIn), żeby liczyły się do rankingów;
// bez serwera tworzy je gra. Pole `obieg` w przedmiocie (nazwa z dawnego Wielkiego Obiegu) znaczy „przedmiot dawnego kowala”.
import { B, FAKE_PLAYERS, SLOTS, SLOT_ORDER, oreCap, landDef, R, rAt, rRank } from '../data';
import type { Ctx } from './context';
import { itemLevelFor, legStage, oreNominal } from './formulas';
import { pick, ri } from './rng';
import { rollSubs } from './forge';
import type { Item } from './types';

/** Przedmiot dawnego kowala (ducha) — z historią, na miarę twojej kuźni. */
export function ghostItem(ctx: Ctx): Item {
  const s = ctx.s;
  const smith = pick(ctx.rng, FAKE_PLAYERS);
  const L = landDef(ri(ctx.rng, 0, s.maxLand));
  // Na miarę twojej kuźni: najwyżej z rudy, którą sam umiesz wytopić.
  const ore = oreCap(landDef(s.maxLand).main, s.forge.lvl);
  const slot = pick(ctx.rng, SLOT_ORDER);
  const kind = pick(ctx.rng, SLOTS[slot].kinds);
  // Rzadkość jak wytop bez przeskoku na twojej kuźni, czasem o rangę wyżej; nigdy Boski.
  const r = rAt(Math.min(rRank(R.MITYCZNY), oreNominal(ore, s.forge.lvl) + (ctx.rng.next() < 0.3 ? 1 : 0)));
  const fame = ri(ctx.rng, 300, 4500);
  const it: Item = {
    id: s.nid++, slot, kind: kind[0], g: kind[1], ore, r, lvl: itemLevelFor(s.forge.lvl, ri(ctx.rng, -1, 1)),
    subs: rollSubs(ctx.rng, r), el: L.el && ctx.rng.next() < 0.5 ? L.el : null, jump: 0, flvl: 0, forced: '',
    smith, land: L.n, fame, kills: { [L.type]: fame - B.FAME_BOSS }, bosses: 1, ls: 0, aw: null,
    owners: ctx.rng.next() < 0.4 ? [smith, pick(ctx.rng, FAKE_PLAYERS.filter(x => x !== smith))] : [smith], obieg: true, set: null,
  };
  it.ls = legStage(it.fame);
  return it;
}

/** Przedmiot do skrzyni Zbrojowni: z serwerem z zapasu od serwera (null, gdy pusty), bez serwera — tworzony na miejscu. */
export function takeGhost(ctx: Ctx): Item | null {
  if (!ctx.net) return ghostItem(ctx);
  const it = ctx.s.obIn.shift();
  if (!it) return null;
  it.id = ctx.s.nid++;
  ctx.dirty = true;
  return it;
}
