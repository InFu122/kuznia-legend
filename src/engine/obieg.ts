// Wielki Obieg: sprzedane przedmioty trafiają do innych graczy. Do czasu podłączenia serwera
// inni gracze są symulowani (FAKE_PLAYERS); interfejs mówi o tym wprost.
import { B, FAKE_PLAYERS, LANDS, ORES, SLOTS, SLOT_ORDER } from '../data';
import { toast, type Ctx } from './context';
import { clockStr, itemLevelFor, itemName, legStage } from './formulas';
import { pick, ri } from './rng';
import { rollSubs } from './forge';
import type { Item } from './types';

export function logSmith(ctx: Ctx, msg: string): void {
  ctx.s.smith.log.unshift({ t: clockStr(ctx.now()), m: msg });
  ctx.s.smith.log = ctx.s.smith.log.slice(0, 30);
}

export function maybeObieg(ctx: Ctx, it: Item, quiet: boolean): void {
  if (it.r < 2 || it.smith !== ctx.s.name || it.obieg || ctx.rng.next() >= B.OBIEG_CHANCE) return;
  ctx.s.smith.sent.push({ n: itemName(it), r: it.r });
  if (ctx.s.smith.sent.length > 40) ctx.s.smith.sent.shift();
  logSmith(ctx, itemName(it) + ' trafił do Wielkiego Obiegu.');
  if (!quiet) toast(ctx, itemName(it) + ' trafił do Wielkiego Obiegu — może go znaleźć inny gracz');
}

/** Co kilka minut gry: ktoś znajduje twój przedmiot albo twoje przedmioty walczą u innych. */
export function obiegEvent(ctx: Ctx): void {
  const s = ctx.s.smith;
  if (s.sent.length) {
    const x = s.sent.splice(Math.floor(ctx.rng.next() * s.sent.length), 1)[0];
    const who = pick(ctx.rng, FAKE_PLAYERS);
    const pts = 10 * (x.r + 1);
    s.fame += pts;
    logSmith(ctx, `${who} znalazł(a) twój przedmiot: ${x.n}. +${pts} Sławy kowala`);
    toast(ctx, `${who} znalazł(a) twój ${x.n} · +${pts} Sławy kowala`, 'good');
    ctx.dirty = true;
  } else if (s.fame > 0 && ctx.rng.next() < 0.5) {
    const n = ri(ctx.rng, 150, 2500);
    const pts = Math.max(1, Math.round(n / 100));
    s.fame += pts;
    logSmith(ctx, `Twoje przedmioty pokonały ${n} wrogów u innych graczy. +${pts} Sławy kowala`);
    ctx.dirty = true;
  }
}

/** Przedmiot z historią, wykuty przez innego gracza — nagroda ze skrzyni bossa. */
export function obiegItem(ctx: Ctx): Item {
  const s = ctx.s;
  const smith = pick(ctx.rng, FAKE_PLAYERS);
  const L = LANDS[ri(ctx.rng, 0, s.maxLand)];
  // Znaleziska z Obiegu są na miarę twojej kuźni: najwyżej z rudy, którą sam umiesz wytopić.
  let ore = LANDS[s.maxLand].main;
  while (ore > 0 && ORES[ore].lvl > s.forge.lvl) ore--;
  const slot = pick(ctx.rng, SLOT_ORDER);
  const kind = pick(ctx.rng, SLOTS[slot].kinds);
  const r = Math.min(6, ORES[ore].floor + (ctx.rng.next() < 0.3 ? 1 : 0));
  const fame = ri(ctx.rng, 300, 4500);
  const it: Item = {
    id: s.nid++, slot, kind: kind[0], g: kind[1], ore, r, lvl: itemLevelFor(s.forge.lvl, ri(ctx.rng, -1, 1)),
    subs: rollSubs(ctx, r), el: L.el && ctx.rng.next() < 0.5 ? L.el : null, jump: 0, flvl: 0, forced: '',
    smith, land: L.n, fame, kills: { [L.type]: fame - B.FAME_BOSS }, bosses: 1, ls: 0, aw: null,
    owners: ctx.rng.next() < 0.4 ? [smith, pick(ctx.rng, FAKE_PLAYERS.filter(x => x !== smith))] : [smith], obieg: true,
  };
  it.ls = legStage(it.fame);
  return it;
}
