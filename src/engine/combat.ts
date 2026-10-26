import { B, ELEM, LANDS, ORES } from '../data';
import { toast, type Ctx } from './context';
import { dungFloor, dungEnd, spawnDung } from './dungeon';
import { Dstar, Hstar, curG, early, gOf, goldWave } from './formulas';
import { addFame } from './legend';
import { obiegItem } from './obieg';
import { sell } from './forge';
import { pick, ri, rnd } from './rng';
import { invalidate, stats } from './stats';
import type { Enemy, Stats } from './types';

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

/** Jeden krok walki o `ms` czasu gry. */
export function stepCombat(ctx: Ctx, ms: number): void {
  const b = ctx.b;
  if (b.pause > 0) { b.pause -= ms; return; }
  if (!b.enemy) spawnNext(ctx);
  const e = b.enemy as Enemy;
  const st = stats(ctx);
  if (b.heroMax !== st.hp) invalidate(ctx);
  const hInt = 1000 / (1 + st.spd / 100);
  b.ht += ms;
  let guard = 0;
  while (b.ht >= hInt && e.hp > 0 && b.heroHp > 0 && guard++ < 50) { b.ht -= hInt; heroHit(ctx, st, e); }
  const eInt = e.int * (1 + st.slow / 100);
  b.et += ms;
  guard = 0;
  while (b.et >= eInt && e.hp > 0 && b.heroHp > 0 && guard++ < 50) { b.et -= eInt; enemyHit(ctx, st, e); }
  if (e.hp > 0 && b.heroHp > 0) b.heroHp = Math.min(b.heroMax, b.heroHp + (b.heroMax * st.regen / 100) * ms / 1000);
  if (e.hp <= 0) onEnemyDown(ctx, e);
  else if (b.heroHp <= 0) onHeroDown(ctx, e);
}

function heroHit(ctx: Ctx, st: Stats, e: Enemy): void {
  let bonus = st.eldmg + (st.vs[e.type] ?? 0);
  if (e.boss) bonus += st.boss + st.pog;
  if (e.type === 'Nieumarli' || e.type === 'Demony') bonus += st.holy;
  let d = st.dmg * rnd(ctx.rng, 0.92, 1.08) * (1 + bonus / 100);
  const crit = ctx.rng.next() < st.crit / 100;
  if (crit) d *= 1 + st.critd / 100;
  e.hp -= d;
  ctx.b.heroHp = Math.min(ctx.b.heroMax, ctx.b.heroHp + d * st.ls / 100);
  ctx.emit({ t: 'bump', who: 'hero', cls: 'lunge' });
  ctx.emit({ t: 'bump', who: 'foe', cls: 'hit' });
  ctx.emit({ t: 'float', side: 'foe', text: fmtN(d), cls: crit ? 'crit' : 'dmg', force: crit });
}

function enemyHit(ctx: Ctx, st: Stats, e: Enemy): void {
  if (ctx.rng.next() < st.dodge / 100) { ctx.emit({ t: 'float', side: 'hero', text: 'unik', cls: 'miss' }); return; }
  const d = e.atk * rnd(ctx.rng, 0.9, 1.1);
  ctx.b.heroHp -= d;
  ctx.emit({ t: 'bump', who: 'foe', cls: 'lunge' });
  ctx.emit({ t: 'bump', who: 'hero', cls: 'hit' });
  ctx.emit({ t: 'float', side: 'hero', text: '−' + fmtN(d), cls: 'hurt', force: e.boss });
}

function onEnemyDown(ctx: Ctx, e: Enemy): void {
  const { s, b } = ctx;
  if (b.mode === 'dung') { dungFloor(ctx); return; }
  if (e.boss) { bossWon(ctx, e); return; }
  const L = LANDS[s.cur.land];
  s.gold += goldWave(curG(s));
  const nOre = ri(ctx.rng, 1, 3);
  s.ores[L.main] += nOre;
  let loot = `+${nOre} ${ORES[L.main].n}`;
  if (ctx.rng.next() < L.rc) {
    s.ores[L.rare]++;
    loot += ` · ${ORES[L.rare].n}!`;
    toast(ctx, 'Rzadka ruda: ' + ORES[L.rare].n, 'good');
  }
  if (L.el && ctx.rng.next() < B.ELEM_DROP) {
    s.els[L.el] = (s.els[L.el] ?? 0) + 1;
    loot += ' · ' + ELEM[L.el].n;
  }
  ctx.emit({ t: 'float', side: 'foe', text: loot, cls: 'loot', force: true });
  addFame(ctx, e.count, e.type, false);
  s.stats.kills += e.count;
  b.heroHp = Math.min(b.heroMax, b.heroHp + B.WAVE_HEAL * b.heroMax);
  s.cur.wave++;
  if (s.cur.wave > B.WAVES_PER_STAGE) {
    s.cur.wave = 1;
    if (s.cur.stage < B.STAGES_PER_LAND) s.cur.stage++;
  }
  if (s.cur.land === s.maxLand && !s.cleared[s.cur.land]) s.frontStage = Math.max(s.frontStage, s.cur.stage);
  s.bestG = Math.max(s.bestG, curG(s));
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
  const gold = goldWave(gOf(land, B.STAGES_PER_LAND)) * 10;
  const n = ri(ctx.rng, 2, 4);
  s.gold += gold;
  s.ores[L.rare] += n;
  const found = ctx.rng.next() < B.OBIEG_FIND_FROM_BOSS ? obiegItem(ctx) : null;
  if (found) { if (!s.pending) s.pending = found; else sell(ctx, found, true); }
  b.enemy = null;
  b.heroHp = b.heroMax;
  b.pause = 600;
  ctx.dirty = true;
  if (!s.cleared[land]) {
    s.cleared[land] = true;
    if (land < LANDS.length - 1) {
      s.maxLand = Math.max(s.maxLand, land + 1);
      s.cur = { land: land + 1, stage: 1, wave: 1 };
      s.frontStage = 1;
      s.bestG = Math.max(s.bestG, gOf(land + 1, 1));
    } else s.cur = { land, stage: 1, wave: 1 };
    ctx.emit({ t: 'modal', m: { kind: 'boss', land, gold, n, found: !!found } });
  } else {
    s.cur.stage = 1;
    s.cur.wave = 1;
    toast(ctx, `Pokonano: ${L.boss} · +${fmtN(gold)} złota, ${n} × ${ORES[L.rare].n}` + (found ? ' · przedmiot z Obiegu!' : ''), 'good');
  }
}

function onHeroDown(ctx: Ctx, e: Enemy): void {
  const { s, b } = ctx;
  if (b.mode === 'dung') { dungEnd(ctx, true); return; }
  if (e.boss) {
    toast(ctx, `${e.name} był za silny. Wzmocnij ekwipunek i spróbuj ponownie.`, 'bad');
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
  if (b.mode === 'dung') { toast(ctx, 'Najpierw wyjdź ze Sztolni.', 'bad'); return false; }
  const front = i === s.maxLand && !s.cleared[i];
  s.cur = { land: i, stage: front ? s.frontStage : 1, wave: 1 };
  b.enemy = null;
  b.pause = 200;
  b.heroHp = b.heroMax;
  ctx.dirty = true;
  toast(ctx, 'Bohater rusza do krainy: ' + LANDS[i].n);
  return true;
}
