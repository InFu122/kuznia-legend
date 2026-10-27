// Lochy. Każdy loch to osobny tryb walki w arenie; nagrody zbierają się w `loot` i trafiają do gracza na końcu.
import { B, DUNGEONS, DUNGEON_FOES, ELEM, ELEM_KEYS, LANDS, TECH_UNLOCK_FORGE, setOfLand } from '../data';
import type { Ctx } from './context';
import { Dstar, Hstar, early, goldWave, todayStr } from './formulas';
import { addFame } from './legend';
import { techMods } from './mods';
import { pick, ri } from './rng';
import type { DungId, ElemKey, Reward, SetId } from './types';

const { SKARBIEC_MS, OLTARZE_FLOORS } = B;

/** Czy loch jest dostępny dla gracza. */
export function dungUnlocked(ctx: Ctx, id: DungId): boolean {
  const s = ctx.s;
  switch (id) {
    case 'skarbiec': return s.cleared[0];
    case 'sztolnia': return s.cleared[1];
    case 'wieza': return s.forge.lvl >= TECH_UNLOCK_FORGE;
    case 'leza': return lezaBosses(ctx).length > 0;
    case 'oltarze': return s.forge.lvl >= B.ELEM_FORGE_LVL;
  }
}

/** Klucze na dziś (odnawiają się o północy). Wieża Wyzwań nie ma limitu. */
export function dungKeys(ctx: Ctx, id: DungId): number {
  const d = ctx.s.dungeons[id];
  if (DUNGEONS[id].keys === 0) return Number.POSITIVE_INFINITY;
  const today = todayStr(ctx.now());
  if (d.day !== today) { d.day = today; d.keys = DUNGEONS[id].keys; }
  return d.keys;
}

/** Sztolnia daje rudę o poziom lepszą niż główna ruda najdalszej krainy. */
export const dungTier = (ctx: Ctx) => Math.min(6, LANDS[ctx.s.maxLand].main + 1);
/** Żywioł dnia na Ołtarzach. */
export const elementOfDay = (now: number): ElemKey => ELEM_KEYS[new Date(now).getDay() % ELEM_KEYS.length];
/** Pokonane krainy, których bossowie dają rudy unikalne. */
export const lezaBosses = (ctx: Ctx) => LANDS.map((_, i) => i).filter(i => ctx.s.cleared[i] && setOfLand(i));

export function startDungeon(ctx: Ctx, id: DungId, land = -1): boolean {
  const { s, b } = ctx;
  if (b.mode === 'dung' || !dungUnlocked(ctx, id) || dungKeys(ctx, id) < 1) return false;
  if (id === 'leza' && !lezaBosses(ctx).includes(land)) return false;
  if (DUNGEONS[id].keys > 0) s.dungeons[id].keys--;
  b.mode = 'dung';
  b.dung = {
    id, floor: id === 'wieza' ? s.dungeons.wieza.best + 1 : 1, loot: {}, tier: dungTier(ctx),
    timeLeft: id === 'skarbiec' ? SKARBIEC_MS : 0, kills: 0, el: id === 'oltarze' ? elementOfDay(ctx.now()) : null, bossLand: land,
  };
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 300;
  ctx.dirty = true;
  return true;
}

/** Trudność wrogów w lochu jako indeks etapu kampanii (0–159) plus mnożnik ponad skalą. */
function dungDifficulty(ctx: Ctx): [number, number] {
  const { s, b } = ctx;
  const d = b.dung!;
  switch (d.id) {
    case 'sztolnia': return [Math.max(0, Math.min(159, s.bestG - 4 + d.floor * 1.5)), 1];
    case 'wieza': return [Math.min(159, d.floor - 1), Math.pow(1.06, Math.max(0, d.floor - 160))];
    case 'leza': return [Math.min(159, Math.max(d.bossLand * 10 + 9, s.bestG - 2)), 1];
    default: return [s.bestG, 1];
  }
}

export function spawnDung(ctx: Ctx): void {
  const b = ctx.b;
  const d = b.dung;
  if (!d) return;
  const [g, extra] = dungDifficulty(ctx);
  const e = early(g) * extra;
  const wHp = B.WAVE_HP_MULT * Dstar(g) * e;
  const wAtk = (Hstar(g) / B.WAVE_ATK_DIV) * e;
  switch (d.id) {
    case 'sztolnia':
      b.enemy = { name: pick(ctx.rng, DUNGEON_FOES), count: 1, type: 'Bestie', max: wHp * 1.3, hp: wHp * 1.3, atk: wAtk * 1.1, boss: false, int: 1200 };
      break;
    case 'skarbiec':
      b.enemy = { name: 'Goblin z workiem', count: 1, type: 'Bestie', max: wHp * 0.6, hp: wHp * 0.6, atk: wAtk * 0.5, boss: false, int: 1200 };
      break;
    case 'wieza': {
      const max = 5 * Dstar(g) * e;
      b.enemy = { name: `Strażnik ${d.floor}. piętra`, count: 1, type: 'Demony', max, hp: max, atk: Hstar(g) * 0.12 * e, boss: false, int: 1300 };
      break;
    }
    case 'leza': {
      const L = LANDS[d.bossLand];
      const max = B.BOSS_HP_MULT * Dstar(g) * e;
      b.enemy = { name: L.boss, count: 1, type: L.type, max, hp: max, atk: Hstar(g) * B.BOSS_ATK_MULT * e, boss: true, int: 1300 };
      break;
    }
    case 'oltarze': {
      const el = d.el ?? 'zar';
      b.enemy = { name: `Strażnik: ${ELEM[el].el}`, count: 1, type: 'Demony', max: wHp * 1.6, hp: wHp * 1.6, atk: wAtk * 1.2, boss: false, int: 1200 };
      break;
    }
  }
  b.et = 0;
}

const add = (r: Reward, k: 'gold' | 'books', n: number) => { r[k] = (r[k] ?? 0) + n; };
/** Księgi Wiedzy za piętro Wieży podzielne przez 5. */
export const towerBooks = (floor: number) => 1 + Math.floor(floor / 20);

/** Wróg w lochu pokonany. */
export function dungFloor(ctx: Ctx): void {
  const { s, b } = ctx;
  const d = b.dung;
  if (!d) return;
  b.enemy = null;
  ctx.dirty = true;
  const gold = 1 + techMods(s).goldPct / 100;
  switch (d.id) {
    case 'sztolnia': {
      const n = 1 + (d.floor % 3 === 0 ? 1 : 0);
      d.loot.ores = { [d.tier]: (d.loot.ores?.[d.tier] ?? 0) + n };
      addFame(ctx, 3, 'Bestie', false);
      s.dungeons.sztolnia.best = Math.max(s.dungeons.sztolnia.best, d.floor);
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.25 * b.heroMax);
      ctx.emit({ t: 'float', side: 'foe', text: `Łup: ${d.loot.ores[d.tier]}`, cls: 'loot', force: true });
      if (d.floor % B.DUNGEON_CHECKPOINT === 0) {
        b.pause = Number.POSITIVE_INFINITY;
        ctx.emit({ t: 'modal', m: { kind: 'dungChoice', floor: d.floor, loot: d.loot } });
      } else { d.floor++; b.pause = 300; }
      return;
    }
    case 'skarbiec': {
      d.kills++;
      const g = Math.round(goldWave(s.bestG) * (3 + d.kills * 0.5) * gold);
      add(d.loot, 'gold', g);
      ctx.emit({ t: 'float', side: 'foe', text: `+${g.toLocaleString('pl-PL')} zł.`, cls: 'loot', force: true });
      s.dungeons.skarbiec.best = Math.max(s.dungeons.skarbiec.best, d.kills);
      b.pause = 120;
      return;
    }
    case 'wieza': {
      const [g] = dungDifficulty(ctx);
      add(d.loot, 'gold', Math.round(goldWave(g) * 3 * gold));
      let text = `Piętro ${d.floor} zdobyte`;
      if (d.floor % 5 === 0) { const bk = towerBooks(d.floor); add(d.loot, 'books', bk); text += ` · +${bk} Ks.`; }
      s.dungeons.wieza.best = Math.max(s.dungeons.wieza.best, d.floor);
      addFame(ctx, 5, 'Demony', false);
      ctx.emit({ t: 'float', side: 'foe', text, cls: 'loot', force: true });
      d.floor++;
      b.heroHp = b.heroMax;
      b.pause = 500;
      return;
    }
    case 'leza': {
      const set = setOfLand(d.bossLand);
      if (set) d.loot.uniq = { [set]: ri(ctx.rng, 2, 3) };
      add(d.loot, 'books', 1);
      addFame(ctx, 0, LANDS[d.bossLand].type, true);
      s.dungeons.leza.best++; // liczba zwycięstw
      dungEnd(ctx, false);
      return;
    }
    case 'oltarze': {
      const el = d.el ?? 'zar';
      d.loot.els = { [el]: (d.loot.els?.[el] ?? 0) + 1 + Math.floor(s.maxLand / 4) };
      addFame(ctx, 3, 'Demony', false);
      s.dungeons.oltarze.best = Math.max(s.dungeons.oltarze.best, d.floor);
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.3 * b.heroMax);
      if (d.floor >= OLTARZE_FLOORS) { dungEnd(ctx, false); return; }
      d.floor++;
      b.pause = 300;
      return;
    }
  }
}

/** Upływ czasu w lochu (Skarbiec ma limit 30 sekund). */
export function dungTick(ctx: Ctx, ms: number): void {
  const d = ctx.b.dung;
  if (!d || d.id !== 'skarbiec') return;
  d.timeLeft -= ms;
  if (d.timeLeft <= 0) dungEnd(ctx, false);
}

export function dungContinue(ctx: Ctx): void {
  if (!ctx.b.dung) return;
  ctx.b.dung.floor++;
  ctx.b.pause = 300;
}

/** Przyznaje nagrodę. */
export function grant(ctx: Ctx, r: Reward): void {
  const s = ctx.s;
  s.gold += r.gold ?? 0;
  s.books += r.books ?? 0;
  for (const [k, v] of Object.entries(r.ores ?? {})) s.ores[Number(k)] += v ?? 0;
  for (const [k, v] of Object.entries(r.els ?? {})) s.els[k as ElemKey] = (s.els[k as ElemKey] ?? 0) + (v ?? 0);
  for (const [k, v] of Object.entries(r.uniq ?? {})) s.uniq[k as SetId] = (s.uniq[k as SetId] ?? 0) + (v ?? 0);
}

function halve(r: Reward): Reward {
  const h = (n?: number) => Math.floor((n ?? 0) / 2);
  const out: Reward = { gold: h(r.gold), books: h(r.books) };
  if (r.ores) out.ores = Object.fromEntries(Object.entries(r.ores).map(([k, v]) => [k, h(v)]));
  if (r.els) out.els = Object.fromEntries(Object.entries(r.els).map(([k, v]) => [k, h(v)]));
  if (r.uniq) out.uniq = Object.fromEntries(Object.entries(r.uniq).map(([k, v]) => [k, h(v)]));
  return out;
}

/** Koniec lochu. Porażka w Sztolni i na Ołtarzach zabiera połowę łupu. */
export function dungEnd(ctx: Ctx, lost: boolean): void {
  const b = ctx.b;
  const d = b.dung;
  if (!d) return;
  const reward = lost && (d.id === 'sztolnia' || d.id === 'oltarze') ? halve(d.loot) : d.loot;
  grant(ctx, reward);
  if (!lost && d.id === 'sztolnia') addFame(ctx, B.FAME_DUNGEON, 'Bestie', false);
  const floor = d.id === 'wieza' ? d.floor - 1 : d.floor; // w Wieży `floor` to piętro, na które dopiero wchodzisz
  b.mode = 'camp';
  b.dung = null;
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 400;
  ctx.dirty = true;
  ctx.emit({ t: 'modal', m: { kind: 'dungEnd', id: d.id, lost, floor: d.id === 'skarbiec' ? d.kills : floor, reward } });
}
