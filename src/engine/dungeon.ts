// Lochy. Każdy loch to osobny tryb walki w arenie; nagrody zbierają się w `loot` i trafiają do gracza na końcu.
import {
  B, DUNGEONS, DUNGEON_FOES, EVENT, ELEM, ELEM_KEYS, FAKE_PLAYERS, KOPALNIA_WAVES, KRYPTA_FLOORS, KRYPTA_ORDER, LAB_BLESSINGS,
  LAB_DOORS, LAB_ROOMS, LANDS, PETS_UNLOCK_LAND, TECH_UNLOCK_FORGE, ZBROJOWNIA_CHESTS, setOfLand,
  type LabDoor,
} from '../data';
import { mountsUnlocked, petsUnlocked, skillsUnlocked } from './companions';
import { addEventPts, eventFloorPts, eventOf, evText } from './events';
import type { Ctx } from './context';
import { Dstar, Hstar, early, goldWave, legStage, todayStr } from './formulas';
import { addFound, rollSubs } from './forge';
import { addFame } from './legend';
import { allMods } from './mods';
import { obiegItem, takeObieg } from './obieg';
import { pick, ri } from './rng';
import { fullStats, invalidate } from './stats';
import { grant } from './reward';
import { track } from './missions';

export { grant };
import type { DungId, ElemKey, FoeType, KryptaRuleId, LabDoorOpt, Reward } from './types';

const { SKARBIEC_MS, OLTARZE_FLOORS } = B;
const ACT2 = PETS_UNLOCK_LAND;

/** Czy loch jest dostępny dla gracza. */
export function dungUnlocked(ctx: Ctx, id: DungId): boolean {
  const s = ctx.s;
  switch (id) {
    case 'skarbiec': return s.cleared[0];
    case 'sztolnia': return s.cleared[1];
    case 'wieza': return s.forge.lvl >= TECH_UNLOCK_FORGE;
    case 'leza': return lezaBosses(ctx).length > 0;
    case 'oltarze': return s.forge.lvl >= B.ELEM_FORGE_LVL;
    case 'kopalnia': case 'labirynt': case 'zbrojownia': return s.maxLand >= ACT2;
    case 'krypta': return s.dungeons.krypta.best > 0 || Object.values(s.eq).some(it => it && it.ls >= 1);
    case 'sezon': return s.cleared[0];
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
/** Zasada tygodnia w Krypcie Bohaterów (zmienia się w poniedziałek). */
export function kryptaRule(now: number): KryptaRuleId {
  const week = Math.floor((now / 86400000 + 3) / 7); // 1970-01-01 to czwartek, więc +3 dni daje tygodnie od poniedziałku
  return KRYPTA_ORDER[((week % 4) + 4) % 4];
}

/** Duch strzegący skrzyni w Zbrojowni: z serwerem to kowal przedmiotu, który leży w skrzyni. */
function ghostName(ctx: Ctx): string {
  return (ctx.net && ctx.s.obIn[0]?.smith) || pick(ctx.rng, FAKE_PLAYERS);
}

export function startDungeon(ctx: Ctx, id: DungId, land = -1): boolean {
  const { s, b } = ctx;
  if (b.mode === 'dung' || !dungUnlocked(ctx, id) || dungKeys(ctx, id) < 1) return false;
  if (id === 'leza' && !lezaBosses(ctx).includes(land)) return false;
  if (DUNGEONS[id].keys > 0) { s.dungeons[id].keys--; s.stats.keys++; }
  b.mode = 'dung';
  b.dung = {
    id, floor: id === 'wieza' ? s.dungeons.wieza.best + 1 : 1, loot: {}, tier: dungTier(ctx),
    timeLeft: id === 'skarbiec' ? SKARBIEC_MS : 0, kills: 0, el: id === 'oltarze' ? elementOfDay(ctx.now()) : null, bossLand: land,
    bless: { dmg: 0, hp: 0, ls: 0 }, doors: null, elite: false, items: [], rule: id === 'krypta' ? kryptaRule(ctx.now()) : null,
    ghost: id === 'zbrojownia' ? ghostName(ctx) : undefined, evp: 0,
  };
  b.enemy = null;
  if (id === 'krypta') invalidate(ctx); // walczą tylko przedmioty z legendą
  b.heroHp = b.heroMax;
  b.pause = 300;
  if (id === 'labirynt') offerDoors(ctx);
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
    case 'kopalnia': return [Math.max(0, Math.min(159, s.bestG - 3 + d.floor)), 1];
    case 'labirynt': return [s.bestG, 1 + 0.05 * d.floor];
    case 'zbrojownia': return [s.bestG, 1 + 0.2 * (d.floor - 1)];
    case 'sezon': return [Math.max(0, Math.min(159, s.bestG - 6 + d.floor)), 1 + EVENT.STRENGTH_STEP * (d.floor - 1)];
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
  const foe = (name: string, type: 'Bestie' | 'Nieumarli' | 'Demony' | 'Smoki', hp: number, atk: number, boss = false) => {
    b.enemy = { name, count: 1, type, max: hp, hp, atk, boss, int: boss ? 1300 : 1200 };
  };
  switch (d.id) {
    case 'sztolnia': foe(pick(ctx.rng, DUNGEON_FOES), 'Bestie', wHp * 1.3, wAtk * 1.1); break;
    case 'skarbiec': foe('Goblin z workiem', 'Bestie', wHp * 0.6, wAtk * 0.5); break;
    case 'wieza': foe(`Strażnik ${d.floor}. piętra`, 'Demony', 5 * Dstar(g) * e, Hstar(g) * 0.12 * e); break;
    case 'leza': {
      const L = LANDS[d.bossLand];
      foe(L.boss, L.type, B.BOSS_HP_MULT * Dstar(g) * e, Hstar(g) * B.BOSS_ATK_MULT * e, true);
      break;
    }
    case 'oltarze': foe(`Strażnik: ${ELEM[d.el ?? 'zar'].el}`, 'Demony', wHp * 1.6, wAtk * 1.2); break;
    case 'kopalnia': foe('Kryształowy golem', 'Bestie', wHp * 1.2, wAtk); break;
    case 'labirynt':
      if (d.floor >= LAB_ROOMS) foe('Minotaur', 'Bestie', B.BOSS_HP_MULT * 0.9 * Dstar(g) * e, Hstar(g) * B.BOSS_ATK_MULT * e, true);
      else if (d.elite) foe('Elitarny strażnik', 'Bestie', wHp * 2.4, wAtk * 1.4);
      else foe('Strażnik Labiryntu', 'Bestie', wHp * 1.2, wAtk);
      break;
    case 'zbrojownia': foe(`Duch: ${d.ghost ?? pick(ctx.rng, FAKE_PLAYERS)}`, 'Nieumarli', wHp * 2, wAtk * 1.3); break;
    case 'sezon': {
      const ev = eventOf(ctx.now()).def;
      if (d.floor >= EVENT.FLOORS) foe(ev.boss, ev.type, B.BOSS_HP_MULT * 0.8 * Dstar(g) * e, Hstar(g) * B.BOSS_ATK_MULT * e, true);
      else foe(ev.foes[(d.floor - 1) % ev.foes.length], ev.type, wHp * 1.3, wAtk * 1.1);
      break;
    }
    case 'krypta': {
      // Strażnicy skalują się z pełną siłą bohatera, a walczą z nim tylko przedmioty z legendą.
      const f = fullStats(ctx);
      const dps = f.dmg * (1 + (f.crit / 100) * (f.critd / 100)) * (1 + f.spd / 100);
      let hp = dps * (4 + 2 * d.floor), atk = f.hp * (0.02 + 0.01 * d.floor);
      if (d.rule === 'giganci') { hp *= 2; atk *= 0.6; }
      foe(`Strażnik Krypty ${d.floor}/${KRYPTA_FLOORS}`, 'Nieumarli', hp, atk);
      break;
    }
  }
  b.et = 0;
}

const add = (r: Reward, k: 'gold' | 'books' | 'scrolls' | 'stones' | 'saddles' | 'seals', n: number) => { r[k] = (r[k] ?? 0) + n; };
const addOre = (r: Reward, ore: number, n: number) => { r.ores = { ...r.ores, [ore]: (r.ores?.[ore] ?? 0) + n }; };
const addEgg = (r: Reward, rar: number) => { r.eggs = { ...r.eggs, [rar]: (r.eggs?.[rar] ?? 0) + 1 }; };
/** Księgi Wiedzy za piętro Wieży podzielne przez 5. */
export const towerBooks = (floor: number) => 1 + Math.floor(floor / 20);
/** Kamienie za falę Kopalni Kryształów. */
export const mineStones = (maxLand: number) => 2 + Math.floor(maxLand / 3);
/** Rzadkość jaj z lochów: rośnie z postępem. */
const dungEggRarity = (maxLand: number) => Math.max(0, Math.min(4, Math.floor((maxLand - 3) / 3)));

/** Wróg w lochu pokonany. */
export function dungFloor(ctx: Ctx): void {
  const { s, b } = ctx;
  const d = b.dung;
  if (!d) return;
  b.enemy = null;
  ctx.dirty = true;
  const gold = 1 + allMods(s).goldPct / 100;
  switch (d.id) {
    case 'sztolnia': {
      const n = 1 + (d.floor % 3 === 0 ? 1 : 0);
      addOre(d.loot, d.tier, n);
      addFame(ctx, 3, 'Bestie', false);
      s.dungeons.sztolnia.best = Math.max(s.dungeons.sztolnia.best, d.floor);
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.25 * b.heroMax);
      ctx.emit({ t: 'float', side: 'foe', text: `Łup: ${d.loot.ores?.[d.tier]}`, cls: 'loot', force: true });
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
      if (d.floor % 10 === 0 && skillsUnlocked(s)) { add(d.loot, 'scrolls', 1); text += ' · Zwój'; }
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
      if (petsUnlocked(s) && ctx.rng.next() < 0.2 * (1 + allMods(s).eggPct / 100)) addEgg(d.loot, dungEggRarity(s.maxLand));
      if (mountsUnlocked(s) && ctx.rng.next() < 0.25) add(d.loot, 'saddles', 1);
      addFame(ctx, 0, LANDS[d.bossLand].type, true);
      s.dungeons.leza.best++; // liczba zwycięstw
      track(ctx, 'boss');
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
    case 'kopalnia': {
      const n = mineStones(s.maxLand);
      add(d.loot, 'stones', n);
      s.dungeons.kopalnia.best = Math.max(s.dungeons.kopalnia.best, d.floor);
      ctx.emit({ t: 'float', side: 'foe', text: `+${n} Kamieni`, cls: 'loot', force: true });
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.25 * b.heroMax);
      if (d.floor >= KOPALNIA_WAVES) {
        if (mountsUnlocked(s)) add(d.loot, 'saddles', 1); else add(d.loot, 'stones', 5);
        dungEnd(ctx, false);
        return;
      }
      d.floor++;
      b.pause = 300;
      return;
    }
    case 'labirynt': {
      const rare = LANDS[s.maxLand].rare;
      if (d.floor >= LAB_ROOMS) { // Minotaur
        add(d.loot, 'books', 3);
        add(d.loot, 'scrolls', 1);
        addOre(d.loot, rare, 3);
        if (petsUnlocked(s) && ctx.rng.next() < Math.min(1, 0.4 * (1 + allMods(s).eggPct / 100))) addEgg(d.loot, dungEggRarity(s.maxLand));
        addFame(ctx, 0, 'Bestie', true);
        s.dungeons.labirynt.best = LAB_ROOMS;
        dungEnd(ctx, false);
        return;
      }
      if (d.elite) { addOre(d.loot, rare, 2); add(d.loot, 'books', 1); } else addOre(d.loot, rare, 1);
      d.elite = false;
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.2 * b.heroMax);
      s.dungeons.labirynt.best = Math.max(s.dungeons.labirynt.best, d.floor);
      nextRoom(ctx);
      return;
    }
    case 'zbrojownia': {
      // Z serwerem skrzynia kryje prawdziwy przedmiot z Obiegu (podpisany, więc bez zmian w statystykach);
      // bez serwera albo przy pustej kolejce — przedmiot ducha, z szansą na wyższą rzadkość.
      const real = ctx.net ? takeObieg(ctx) : null;
      const it = real ?? obiegItem(ctx);
      if (!real) {
        it.smith = d.ghost ?? it.smith;
        it.owners = [it.smith, ...it.owners.filter(o => o !== it.smith)].slice(0, 3);
        if (ctx.rng.next() < 0.5 && it.r < 6) { it.r++; it.subs = rollSubs(ctx.rng, it.r); }
      }
      const fame = ri(ctx.rng, 1000, 6000);
      if (fame > it.fame) {
        const t = (Object.keys(it.kills)[0] ?? 'Bestie') as FoeType;
        it.fame = fame;
        it.kills = { [t]: fame - B.FAME_BOSS };
      }
      it.ls = legStage(it.fame);
      d.items.push(it);
      s.dungeons.zbrojownia.best = Math.max(s.dungeons.zbrojownia.best, d.floor);
      ctx.emit({ t: 'float', side: 'foe', text: 'Skrzynia otwarta!', cls: 'loot', force: true });
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.3 * b.heroMax);
      if (d.floor >= ZBROJOWNIA_CHESTS) { dungEnd(ctx, false); return; }
      d.floor++;
      d.ghost = ghostName(ctx);
      b.pause = 400;
      return;
    }
    case 'sezon': {
      const pts = eventFloorPts(d.floor);
      addEventPts(ctx, pts, d.floor);
      d.evp = (d.evp ?? 0) + pts;
      s.dungeons.sezon.best = Math.max(s.dungeons.sezon.best, d.floor);
      const ev = eventOf(ctx.now()).def;
      ctx.emit({ t: 'float', side: 'foe', text: `+${evText(pts, ev)}`, cls: 'loot', force: true });
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.3 * b.heroMax);
      if (d.floor >= EVENT.FLOORS) {
        // skrzynia za pokonanie bossa wydarzenia
        add(d.loot, 'books', 2);
        add(d.loot, 'stones', 10 + Math.floor(s.maxLand / 2));
        add(d.loot, 'gold', Math.round(goldWave(s.bestG) * 20 * gold));
        if (skillsUnlocked(s)) add(d.loot, 'scrolls', 1);
        addFame(ctx, 0, ev.type, true);
        track(ctx, 'boss');
        dungEnd(ctx, false);
        return;
      }
      addFame(ctx, 3, ev.type, false);
      d.floor++;
      b.pause = 400;
      return;
    }
    case 'krypta': {
      add(d.loot, 'seals', d.floor >= KRYPTA_FLOORS ? 2 : 1);
      s.dungeons.krypta.best = Math.max(s.dungeons.krypta.best, d.floor);
      ctx.emit({ t: 'float', side: 'foe', text: 'Pieczęć Legendy', cls: 'loot', force: true });
      b.heroHp = Math.min(b.heroMax, b.heroHp + 0.3 * b.heroMax);
      if (d.floor >= KRYPTA_FLOORS) { dungEnd(ctx, false); return; }
      d.floor++;
      b.pause = 400;
      return;
    }
  }
}

/* ---------- Labirynt Minotaura ---------- */

function rollDoor(ctx: Ctx, not?: LabDoor): LabDoorOpt {
  const kinds = (Object.keys(LAB_DOORS) as LabDoor[]).filter(k => k !== not);
  let x = ctx.rng.next() * kinds.reduce((a, k) => a + LAB_DOORS[k].w, 0);
  let kind = kinds[0];
  for (const k of kinds) { x -= LAB_DOORS[k].w; if (x < 0) { kind = k; break; } }
  return kind === 'oltarz' ? { kind, bless: ri(ctx.rng, 0, LAB_BLESSINGS.length - 1) } : { kind };
}

/** Pokazuje dwoje drzwi i zatrzymuje walkę do wyboru. */
function offerDoors(ctx: Ctx): void {
  const d = ctx.b.dung!;
  const a = rollDoor(ctx);
  d.doors = [a, rollDoor(ctx, a.kind)];
  ctx.b.pause = Number.POSITIVE_INFINITY;
  ctx.emit({ t: 'modal', m: { kind: 'labChoice', room: d.floor, doors: d.doors, loot: d.loot } });
}

function nextRoom(ctx: Ctx): void {
  const d = ctx.b.dung!;
  d.floor++;
  if (d.floor >= LAB_ROOMS) { d.doors = null; ctx.b.pause = 500; return; } // Minotaur
  offerDoors(ctx);
}

/** Gracz wybiera drzwi w Labiryncie. */
export function labChoose(ctx: Ctx, i: number): boolean {
  const { s, b } = ctx;
  const d = b.dung;
  if (!d || d.id !== 'labirynt' || !d.doors?.[i]) return false;
  const door = d.doors[i];
  d.doors = null;
  ctx.dirty = true;
  switch (door.kind) {
    case 'walka': case 'elita':
      d.elite = door.kind === 'elita';
      b.enemy = null;
      b.pause = 300;
      return true;
    case 'skarb':
      add(d.loot, 'gold', Math.round(goldWave(s.bestG) * 8 * (1 + allMods(s).goldPct / 100)));
      addOre(d.loot, LANDS[s.maxLand].rare, 1);
      break;
    case 'zrodlo':
      b.heroHp = b.heroMax;
      break;
    case 'oltarz': {
      const bl = LAB_BLESSINGS[door.bless ?? 0];
      d.bless[bl.k] += bl.v;
      break;
    }
  }
  nextRoom(ctx);
  return true;
}

/* ---------- wspólne ---------- */

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
  const { b } = ctx;
  const d = b.dung;
  if (!d) return;
  const reward = lost && (d.id === 'sztolnia' || d.id === 'oltarze') ? halve(d.loot) : d.loot;
  grant(ctx, reward);
  if (!lost && d.id === 'sztolnia') addFame(ctx, B.FAME_DUNGEON, 'Bestie', false);
  // W Wieży `floor` to piętro, na które dopiero wchodzisz; w pozostałych lochach porażka nie zalicza bieżącego piętra.
  const floor = d.id === 'wieza' ? d.floor - 1 : d.id === 'skarbiec' ? d.kills : lost ? d.floor - 1 : d.floor;
  b.mode = 'camp';
  b.dung = null;
  b.enemy = null;
  if (d.id === 'krypta') invalidate(ctx);
  b.heroHp = b.heroMax;
  b.pause = 400;
  if (d.items.length) addFound(ctx, d.items);
  track(ctx, 'dung');
  ctx.emit({ t: 'sfx', k: lost ? 'lose' : 'win' });
  ctx.dirty = true;
  ctx.emit({ t: 'modal', m: { kind: 'dungEnd', id: d.id, lost, floor, reward, items: d.items.length, evp: d.evp } });
  if (d.items.length) ctx.emit({ t: 'modal', m: { kind: 'found' } });
}
