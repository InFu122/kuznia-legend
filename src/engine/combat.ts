import { B, ELEM, LANDS, MOUNTS_UNLOCK_LAND, ORES, PETS_UNLOCK_LAND, SETS, SKILLS, SKILLS_UNLOCK_G, oreShares, setOfLand, skillValue } from '../data';
import { toast, type Ctx } from './context';
import { dungFloor, dungEnd, spawnDung } from './dungeon';
import { allMods } from './mods';
import { Dstar, Hstar, curG, early, gOf, goldWave } from './formulas';
import { addFame } from './legend';
import { takeObieg } from './obieg';
import { addFound } from './forge';
import { pick, ri, rnd } from './rng';
import { invalidate, stats } from './stats';
import { grant } from './reward';
import { track } from './missions';
import type { Enemy, Fx, Reward, Stats } from './types';

const fmtN = (n: number) => Math.round(n).toLocaleString('pl-PL');

export function spawnNext(ctx: Ctx): void {
  const { s, b } = ctx;
  if (b.mode === 'dung') { spawnDung(ctx); return; }
  if (s.cur.stage === B.STAGES_PER_LAND && s.cleared[s.cur.land]) { spawnBoss(ctx); return; }
  const L = LANDS[s.cur.land];
  let g = curG(s);
  if (s.cur.stage === B.STAGES_PER_LAND) g -= 1; // przed bossem farmisz poziom 9. etapu
  const e = early(g);
  const max = B.WAVE_HP_MULT * Dstar(g) * e * rnd(ctx.rng, 0.9, 1.1);
  b.enemy = { name: pick(ctx.rng, L.foes), count: ri(ctx.rng, 3, 6), type: L.type, max, hp: max, atk: (Hstar(g) / B.WAVE_ATK_DIV) * e, boss: false, int: 1200 };
  b.et = 0;
}

export function spawnBoss(ctx: Ctx): void {
  const L = LANDS[ctx.s.cur.land];
  const g = gOf(ctx.s.cur.land, B.STAGES_PER_LAND);
  const e = early(g);
  const max = B.BOSS_HP_MULT * Dstar(g) * e;
  ctx.b.enemy = { name: L.boss, count: 1, type: L.type, max, hp: max, atk: Hstar(g) * B.BOSS_ATK_MULT * e, boss: true, int: 1300 };
  ctx.b.et = 0;
  ctx.b.ht = 0;
}

export const bossWaiting = (ctx: Ctx) =>
  ctx.b.mode === 'camp' && ctx.s.cur.stage === B.STAGES_PER_LAND && !ctx.s.cleared[ctx.s.cur.land];

export function challengeBoss(ctx: Ctx): boolean {
  if (!bossWaiting(ctx) || ctx.b.enemy?.boss) return false;
  ctx.b.heroHp = ctx.b.heroMax;
  spawnBoss(ctx);
  ctx.b.pause = 0;
  toast(ctx, LANDS[ctx.s.cur.land].boss + ' wychodzi do walki!');
  return true;
}

/** Modyfikatory walki z lochu: błogosławieństwa Labiryntu i zasada tygodnia w Krypcie. */
function arena(ctx: Ctx) {
  const d = ctx.b.dung;
  const rule = d?.rule ?? null;
  return {
    dmg: 1 + (d?.bless.dmg ?? 0) / 100,
    tough: 1 + (d?.bless.hp ?? 0) / 100,
    ls: d?.bless.ls ?? 0,
    lsMul: rule === 'krew' ? 2 : 1,
    regen: rule !== 'krew',
    pace: rule === 'szybkosc' ? 1.5 : 1,
    elem: rule !== 'zywioly',
  };
}

/** Jeden krok walki o `ms` czasu gry. */
export function stepCombat(ctx: Ctx, ms: number): void {
  const b = ctx.b;
  if (b.pause > 0) { b.pause -= ms; return; }
  if (!b.enemy) spawnNext(ctx);
  const e = b.enemy as Enemy;
  const st = stats(ctx);
  if (b.heroMax !== st.hp) invalidate(ctx);
  const a = arena(ctx);
  tickFx(b.fx, ms);
  castSkills(ctx, st, e);
  const hInt = 1000 / (1 + (st.spd + (b.fx.spdT > 0 ? b.fx.spdV : 0)) / 100) / a.pace;
  b.ht += ms;
  let guard = 0;
  while (b.ht >= hInt && e.hp > 0 && b.heroHp > 0 && guard++ < 50) { b.ht -= hInt; heroHit(ctx, st, e); }
  if (st.petInt && e.hp > 0) {
    b.pt += ms;
    guard = 0;
    while (b.pt >= st.petInt && e.hp > 0 && guard++ < 20) { b.pt -= st.petInt; petHit(ctx, st, e); }
  }
  const eInt = (e.int * (1 + (a.elem ? st.slow : 0) / 100)) / a.pace;
  if (b.fx.stunT <= 0) b.et += ms;
  guard = 0;
  while (b.et >= eInt && e.hp > 0 && b.heroHp > 0 && guard++ < 50) { b.et -= eInt; enemyHit(ctx, st, e); }
  if (e.hp > 0 && b.heroHp > 0 && a.regen) b.heroHp = Math.min(b.heroMax, b.heroHp + (b.heroMax * st.regen / 100) * ms / 1000);
  if (e.hp <= 0) onEnemyDown(ctx, e);
  else if (b.heroHp <= 0) onHeroDown(ctx, e);
}

function tickFx(fx: Fx, ms: number): void {
  for (let i = 0; i < fx.cd.length; i++) fx.cd[i] = Math.max(0, fx.cd[i] - ms);
  fx.dmgT -= ms; fx.spdT -= ms; fx.lsT -= ms; fx.stunT -= ms;
  fx.shieldT -= ms;
  if (fx.shieldT <= 0) fx.shield = 0;
}

/** Premia procentowa do obrażeń wobec danego wroga (żywioły, typ, bossowie). */
function bonusVs(ctx: Ctx, st: Stats, e: Enemy): number {
  const a = arena(ctx);
  let bonus = (a.elem ? st.eldmg : 0) + (st.vs[e.type] ?? 0);
  if (e.boss) bonus += st.boss + st.pog;
  if (a.elem && (e.type === 'Nieumarli' || e.type === 'Demony')) bonus += st.holy;
  if (ctx.b.fx.dmgT > 0) bonus += ctx.b.fx.dmgV;
  return bonus;
}

/** Umiejętności rzucają się same, gdy są gotowe i jest w kogo. */
function castSkills(ctx: Ctx, st: Stats, e: Enemy): void {
  const { b, s } = ctx;
  if (e.hp <= 0 || b.heroHp <= 0) return;
  const fx = b.fx;
  s.skills.eq.forEach((id, i) => {
    if (!id || fx.cd[i] > 0) return;
    const S = SKILLS[id];
    const v = skillValue(id, s.skills.lv[id] ?? 1);
    switch (S.kind) {
      case 'dmg': {
        const d = st.dmg * (v / 100) * (1 + bonusVs(ctx, st, e) / 100) * arena(ctx).dmg;
        e.hp -= d;
        ctx.emit({ t: 'float', side: 'foe', text: `${S.n}! ${fmtN(d)}`, cls: 'crit', force: true });
        ctx.emit({ t: 'bump', who: 'foe', cls: 'hit' });
        break;
      }
      case 'heal':
        if (b.heroHp > 0.6 * b.heroMax) return; // czeka, aż będzie potrzebny
        b.heroHp = Math.min(b.heroMax, b.heroHp + b.heroMax * v / 100);
        ctx.emit({ t: 'float', side: 'hero', text: `${S.n} +${fmtN(b.heroMax * v / 100)}`, cls: 'loot', force: true });
        break;
      case 'shield': fx.shield = b.heroMax * v / 100; fx.shieldT = S.dur; break;
      case 'buffDmg': fx.dmgT = S.dur; fx.dmgV = v; break;
      case 'buffSpd': fx.spdT = S.dur; fx.spdV = v; break;
      case 'buffLs': fx.lsT = S.dur; fx.lsV = v; break;
      case 'stun': fx.stunT = v * 1000; break;
    }
    if (S.kind !== 'dmg' && S.kind !== 'heal') ctx.emit({ t: 'float', side: 'hero', text: S.n, cls: 'loot', force: true });
    ctx.emit({ t: 'sfx', k: 'skill' });
    fx.cd[i] = S.cd;
  });
}

function heroHit(ctx: Ctx, st: Stats, e: Enemy): void {
  const a = arena(ctx);
  let d = st.dmg * rnd(ctx.rng, 0.92, 1.08) * (1 + bonusVs(ctx, st, e) / 100) * a.dmg;
  const crit = ctx.rng.next() < st.crit / 100;
  if (crit) d *= 1 + st.critd / 100;
  e.hp -= d;
  const ls = (st.ls + a.ls + (ctx.b.fx.lsT > 0 ? ctx.b.fx.lsV : 0)) * a.lsMul;
  ctx.b.heroHp = Math.min(ctx.b.heroMax, ctx.b.heroHp + d * ls / 100);
  ctx.emit({ t: 'bump', who: 'hero', cls: 'lunge' });
  ctx.emit({ t: 'bump', who: 'foe', cls: 'hit' });
  ctx.emit({ t: 'float', side: 'foe', text: fmtN(d), cls: crit ? 'crit' : 'dmg', force: crit });
  ctx.emit({ t: 'sfx', k: crit ? 'crit' : 'hit' });
}

function petHit(ctx: Ctx, st: Stats, e: Enemy): void {
  const d = st.petAtk * rnd(ctx.rng, 0.9, 1.1) * arena(ctx).dmg;
  e.hp -= d;
  ctx.emit({ t: 'float', side: 'foe', text: fmtN(d), cls: 'pet' });
}

function enemyHit(ctx: Ctx, st: Stats, e: Enemy): void {
  if (ctx.rng.next() < st.dodge / 100) { ctx.emit({ t: 'float', side: 'hero', text: 'unik', cls: 'miss' }); ctx.emit({ t: 'sfx', k: 'dodge' }); return; }
  let d = (e.atk * rnd(ctx.rng, 0.9, 1.1)) / arena(ctx).tough;
  const fx = ctx.b.fx;
  if (fx.shield > 0) {
    const absorbed = Math.min(fx.shield, d);
    fx.shield -= absorbed;
    d -= absorbed;
  }
  ctx.b.heroHp -= d;
  ctx.emit({ t: 'bump', who: 'foe', cls: 'lunge' });
  ctx.emit({ t: 'bump', who: 'hero', cls: 'hit' });
  ctx.emit({ t: 'float', side: 'hero', text: d > 0 ? '−' + fmtN(d) : 'tarcza', cls: d > 0 ? 'hurt' : 'miss', force: e.boss });
  ctx.emit({ t: 'sfx', k: d > 0 ? 'hurt' : 'block' });
}

function onEnemyDown(ctx: Ctx, e: Enemy): void {
  const { s, b } = ctx;
  if (!e.boss) ctx.emit({ t: 'sfx', k: 'kill' });
  if (b.mode === 'dung') { dungFloor(ctx); return; }
  if (e.boss) { bossWon(ctx, e); return; }
  const L = LANDS[s.cur.land];
  const mods = allMods(s);
  // Złoto wypada z każdej fali; ruda tylko czasem — wtedy interfejs pokazuje animację dropu.
  const gold = Math.round(goldWave(curG(s)) * (1 + mods.goldPct / 100));
  s.gold += gold;
  let loot = `+${fmtN(gold)} zł.`;
  // Ruda: z części fal, według rozkładu krainy (główna 1–3 sztuki, rzadsze po 1).
  if (ctx.rng.next() < B.ORE_DROP) {
    const ore = pickOre(L, ctx.rng.next(), mods.rarePct);
    const nOre = (ore === L.main ? ri(ctx.rng, 1, B.ORE_MAIN_MAX) : 1) + (ctx.rng.next() * 100 < mods.extraOre ? 1 : 0);
    const rare = ore > L.main;
    s.ores[ore] += nOre;
    loot += rare ? ` · ${ORES[ore].n}!` : ` · +${nOre} ${ORES[ore].n}`;
    ctx.emit({ t: 'drop', ore, n: nOre, rare });
    if (rare) toast(ctx, 'Rzadka ruda: ' + ORES[ore].n, 'good');
  }
  if (L.el && ctx.rng.next() < B.ELEM_DROP) {
    s.els[L.el] = (s.els[L.el] ?? 0) + 1;
    loot += ' · ' + ELEM[L.el].n;
  }
  if (ctx.rng.next() < B.BOOK_DROP) {
    s.books++;
    loot += ' · Księga Wiedzy';
  }
  if (s.bestG >= SKILLS_UNLOCK_G && ctx.rng.next() < B.SCROLL_DROP) {
    s.scrolls++;
    loot += ' · Zwój zaklęć';
  }
  ctx.emit({ t: 'float', side: 'foe', text: loot, cls: 'loot', force: true });
  addFame(ctx, e.count, e.type, false);
  s.stats.kills += e.count;
  track(ctx, 'wave');
  b.heroHp = Math.min(b.heroMax, b.heroHp + B.WAVE_HEAL * b.heroMax);
  s.cur.wave++;
  if (s.cur.wave > B.WAVES_PER_STAGE) {
    s.cur.wave = 1;
    if (s.cur.stage < B.STAGES_PER_LAND) s.cur.stage++;
  }
  if (s.cur.land === s.maxLand && !s.cleared[s.cur.land]) s.frontStage = Math.max(s.frontStage, s.cur.stage);
  const before = s.bestG;
  s.bestG = Math.max(s.bestG, curG(s));
  if (before < SKILLS_UNLOCK_G && s.bestG >= SKILLS_UNLOCK_G) {
    s.scrolls += B.SCROLLS_START;
    toast(ctx, `Odblokowano umiejętności: masz ${B.SCROLLS_START} Zwoje zaklęć (zakładka Bohater)`, 'good');
  }
  b.enemy = null;
  b.pause = 320;
  ctx.dirty = true;
}

function bossWon(ctx: Ctx, e: Enemy): void {
  const { s, b } = ctx;
  const land = s.cur.land;
  const L = LANDS[land];
  s.stats.bosses++;
  addFame(ctx, 0, e.type, true);
  track(ctx, 'boss');
  ctx.emit({ t: 'sfx', k: 'boss' });
  const first = !s.cleared[land];
  const gold = Math.round(goldWave(gOf(land, B.STAGES_PER_LAND)) * 10 * (1 + allMods(s).goldPct / 100));
  const n = ri(ctx.rng, 2, 4);
  const books = first ? B.BOOKS_BOSS_FIRST + land : ctx.rng.next() < B.BOOKS_BOSS_CHANCE ? 1 : 0;
  const set = setOfLand(land);
  const uniq = set ? (first ? B.UNIQ_BOSS_FIRST : ctx.rng.next() < B.UNIQ_BOSS_CHANCE ? 1 : 0) : 0;
  s.gold += gold;
  s.ores[L.rare] += n;
  s.books += books;
  if (set && uniq) s.uniq[set] = (s.uniq[set] ?? 0) + uniq;
  const extra = bossExtras(ctx, land, first);
  grant(ctx, extra);
  const found = ctx.rng.next() < B.OBIEG_FIND_FROM_BOSS ? takeObieg(ctx) : null;
  // Przedmiot ze skrzyni bossa czeka na decyzję gracza (auto-wytop nigdy go nie zakłada ani nie sprzedaje).
  if (found) addFound(ctx, [found]);
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 600;
  ctx.dirty = true;
  if (first) {
    s.cleared[land] = true;
    if (land < LANDS.length - 1) {
      s.maxLand = Math.max(s.maxLand, land + 1);
      s.cur = { land: land + 1, stage: 1, wave: 1 };
      s.frontStage = 1;
      s.bestG = Math.max(s.bestG, gOf(land + 1, 1));
    } else s.cur = { land, stage: 1, wave: 1 };
    ctx.emit({ t: 'modal', m: { kind: 'boss', land, gold, n, found: !!found, books, uniq, extra } });
    if (found) ctx.emit({ t: 'modal', m: { kind: 'found' } });
  } else {
    s.cur.stage = 1;
    s.cur.wave = 1;
    toast(ctx, `Pokonano: ${L.boss} · +${fmtN(gold)} złota, ${n} × ${ORES[L.rare].n}` + (books ? ', Księga Wiedzy' : '') +
      (uniq && set ? ` · ${SETS[set].ore}!` : '') + (found ? ' · przedmiot z Obiegu!' : ''), 'good');
    if (found) ctx.emit({ t: 'modal', m: { kind: 'found' } });
  }
}

/** Która ruda wypadła (u ∈ [0, 1)) według rozkładu krainy. */
export function pickOre(L: (typeof LANDS)[number], u: number, rarePct = 0): number {
  const sh = oreShares(L, rarePct);
  let acc = 0;
  for (const [o, p] of sh) { acc += p / 100; if (u < acc) return o; }
  return sh[sh.length - 1][0];
}

/** Rzadkość jaja z bossa krainy (od 4. krainy). */
export const eggRarity = (land: number) => Math.max(0, Math.min(4, Math.floor((land - 3) / 3)));

/** Zwoje, Jaja, Siodła i Kamienie z bossa. Za pierwsze pokonanie pewne, potem z niewielką szansą. */
function bossExtras(ctx: Ctx, land: number, first: boolean): Reward {
  const r: Reward = {};
  const act = LANDS[land].act;
  if (first) r.scrolls = B.SCROLLS_BOSS_FIRST + act;
  else if (ctx.rng.next() < B.SCROLL_BOSS_CHANCE) r.scrolls = 1;
  if (land >= PETS_UNLOCK_LAND - 1) {
    if (first || ctx.rng.next() < B.EGG_BOSS_CHANCE) r.eggs = { [eggRarity(land)]: 1 };
    if (first) r.stones = 10 + 2 * land;
  }
  if (land >= MOUNTS_UNLOCK_LAND - 1) {
    if (first) r.saddles = B.SADDLES_BOSS_FIRST;
    else if (ctx.rng.next() < B.SADDLE_BOSS_CHANCE) r.saddles = 1;
  }
  return r;
}

function onHeroDown(ctx: Ctx, e: Enemy): void {
  const { s, b } = ctx;
  if (b.mode === 'dung') { dungEnd(ctx, true); return; }
  if (e.boss) {
    toast(ctx, `${e.name} był za silny. Wzmocnij ekwipunek i spróbuj ponownie.`, 'bad');
    ctx.emit({ t: 'sfx', k: 'lose' });
    if (s.cleared[s.cur.land]) { s.cur.stage = 1; s.cur.wave = 1; }
  } else {
    if (s.cur.stage > 1) s.cur.stage--;
    s.cur.wave = 1;
    toast(ctx, 'Bohater padł — cofasz się o jeden etap.', 'bad');
  }
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 800;
  ctx.dirty = true;
}

/** Przeniesienie bohatera do innej odblokowanej krainy. */
export function goLand(ctx: Ctx, i: number): boolean {
  const { s, b } = ctx;
  if (i < 0 || i > s.maxLand) return false;
  if (b.mode === 'dung') { toast(ctx, 'Najpierw wyjdź z lochu.', 'bad'); return false; }
  const front = i === s.maxLand && !s.cleared[i];
  s.cur = { land: i, stage: front ? s.frontStage : 1, wave: 1 };
  b.enemy = null;
  b.pause = 200;
  b.heroHp = b.heroMax;
  ctx.dirty = true;
  toast(ctx, 'Bohater rusza do krainy: ' + LANDS[i].n);
  return true;
}
