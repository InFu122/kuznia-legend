import { B, ELEM, PETS, SETS, SKILLS, SLOTS, STAT_CAPS, petAtkPct, skillValue } from '../data';
import type { Ctx } from './context';
import { mainVal } from './formulas';
import { allMods, techMods } from './mods';
import type { FoeType, GameState, Item, Mods, SetId, SkillId, SlotId, Stats } from './types';

/** Chowaniec i umiejętności — liczą się do Mocy, ale nie są częścią ekwipunku. */
export interface Extra { pet?: { atk: number; int: number } | null; skills?: { id: SkillId; lvl: number }[]; heir?: Item | null; runes?: Partial<Record<SlotId, number>> }

export function extraOf(s: GameState): Extra {
  const p = s.petSel ? s.pets[s.petSel] : null;
  return {
    pet: s.petSel && p ? { atk: petAtkPct(s.petSel, p.lvl, p.stars) * (1 + techMods(s).compPct / 100), int: PETS[s.petSel].int } : null,
    skills: s.skills.eq.filter((x): x is SkillId => !!x).map(id => ({ id, lvl: s.skills.lv[id] ?? 1 })),
    heir: s.legacy?.item ?? null,
    runes: s.runes ?? {},
  };
}

/**
 * Szacunkowy wkład umiejętności do Mocy: [mnożnik obrażeń, mnożnik wytrzymałości].
 * Zakłada walkę trwającą ~10 s; dokładne działanie liczy walka.
 */
export function skillFactor(skills: Extra['skills'], spd: number): [number, number] {
  let d = 1, h = 1;
  for (const { id, lvl } of skills ?? []) {
    const S = SKILLS[id];
    const v = skillValue(id, lvl);
    const per = S.cd / 1000;
    switch (S.kind) {
      case 'dmg': d += v / 100 / per / (1 + spd / 100); break;
      case 'buffDmg': d += (v / 100) * (S.dur / S.cd); break;
      case 'buffSpd': d += (v / 100) * (S.dur / S.cd) / (1 + spd / 100); break;
      case 'buffLs': h += (v / 100) * (S.dur / S.cd) * 0.5; break;
      case 'shield': h += (v / 100) * Math.min(1, 10000 / S.cd); break;
      case 'heal': h += (v / 100) * Math.min(1, 10000 / S.cd); break;
      case 'stun': h += Math.min(0.5, (v * 1000) / S.cd); break;
    }
  }
  return [d, h];
}

/** Ile części każdego zestawu jest założonych. */
export function setCounts(eq: GameState['eq']): { id: SetId; count: number }[] {
  const c: Partial<Record<SetId, number>> = {};
  for (const it of Object.values(eq)) if (it?.set) c[it.set] = (c[it.set] ?? 0) + 1;
  return (Object.entries(c) as [SetId, number][]).map(([id, count]) => ({ id, count }));
}

export function computeStats(eq: GameState['eq'], mods: Mods, extra: Extra = {}): Stats {
  let dmg = 10, hp = 100, crit = 5, critd = 50, spd = 0, ls = 0, dodge = 0, regen = 0.5, boss = 0, eldmg = 0, slow = 0, holy = 0, pog = 0;
  const vs: Partial<Record<FoeType, number>> = {};
  const addSub = (id: string, v: number) => {
    switch (id) {
      case 'crit': crit += v; break;
      case 'critd': critd += v; break;
      case 'spd': spd += v; break;
      case 'ls': ls += v; break;
      case 'dodge': dodge += v; break;
      case 'regen': regen += v; break;
      case 'boss': boss += v; break;
    }
  };
  for (const it of Object.values(eq)) {
    if (!it) continue;
    const rune = Math.max(0, Math.min(B.RUNE_MAX, extra.runes?.[it.slot] ?? 0));
    const m = mainVal(it) * (1 + (rune * B.RUNE_PCT) / 100);
    if (SLOTS[it.slot].stat === 'dmg') dmg += m; else hp += m;
    for (const s of it.subs) addSub(s.id, s.v);
    if (it.el) {
      const E = ELEM[it.el];
      if (E.eff === 'dmg') eldmg += E.v; else if (E.eff === 'slow') slow += E.v; else if (E.eff === 'ls') ls += E.v; else holy += E.v;
    }
    if (it.aw) {
      if (it.aw.kind === 'boss') pog += it.aw.v;
      else if (it.aw.t) vs[it.aw.t] = (vs[it.aw.t] ?? 0) + it.aw.v;
    }
  }
  // Pamiątka Rodu (Dziedzictwo): część głównej statystyki i statystyk dodatkowych przedmiotu z poprzedniego pokolenia
  if (extra.heir) {
    const k = B.LEGACY_HEIR_PCT / 100;
    const m = mainVal(extra.heir) * k;
    if (SLOTS[extra.heir.slot].stat === 'dmg') dmg += m; else hp += m;
    for (const s of extra.heir.subs) addSub(s.id, s.v * k);
  }
  // zestawy: bonus za 2 i za 4 części
  let dmgPct = mods.dmgPct, hpPct = mods.hpPct;
  crit += mods.crit;
  boss += mods.bossPct;
  spd += mods.spd; ls += mods.ls; regen += mods.regen; eldmg += mods.eldmg;
  const sets = setCounts(eq);
  for (const { id, count } of sets) {
    for (const b of [count >= 2 ? SETS[id].b2 : null, count >= 4 ? SETS[id].b4 : null]) {
      if (!b) continue;
      dmgPct += b.dmgPct ?? 0; hpPct += b.hpPct ?? 0; crit += b.crit ?? 0; spd += b.spd ?? 0;
      ls += b.ls ?? 0; dodge += b.dodge ?? 0; boss += b.bossPct ?? 0;
      for (const [t, v] of Object.entries(b.vs ?? {}) as [FoeType, number][]) vs[t] = (vs[t] ?? 0) + v;
    }
  }
  dmg *= 1 + dmgPct / 100;
  hp *= 1 + hpPct / 100;
  crit = Math.min(crit, STAT_CAPS.crit); critd = Math.min(critd, STAT_CAPS.critd); spd = Math.min(spd, STAT_CAPS.spd);
  ls = Math.min(ls, STAT_CAPS.ls); dodge = Math.min(dodge, STAT_CAPS.dodge); regen = Math.min(regen, STAT_CAPS.regen);
  const petAtk = extra.pet ? dmg * extra.pet.atk / 100 : 0;
  const petInt = extra.pet ? extra.pet.int : 0;
  // Moc = średnie obrażenia na sekundę × 4 + zdrowie efektywne × 0,4 (te same wzory co w walce),
  // plus chowaniec i szacunkowy wkład umiejętności
  const [sd, sh] = skillFactor(extra.skills, spd);
  const dps = dmg * (1 + (crit / 100) * (critd / 100)) * (1 + spd / 100) * (1 + eldmg / 100) + (petInt ? petAtk * 1000 / petInt : 0);
  const power = Math.round(dps * 4 * sd + (hp * 0.4 / (1 - dodge / 100)) * sh);
  return { dmg, hp, crit, critd, spd, ls, dodge, regen, boss, eldmg, slow, holy, pog, vs, sets, petAtk, petInt, power };
}

/** Ekwipunek, którym walczy bohater: w Krypcie Bohaterów tylko przedmioty z legendą. */
export function fightEq(ctx: Ctx): GameState['eq'] {
  if (ctx.b.dung?.id !== 'krypta') return ctx.s.eq;
  return Object.fromEntries(Object.entries(ctx.s.eq).filter(([, it]) => it && it.ls >= 1));
}

export function stats(ctx: Ctx): Stats {
  if (!ctx.cache) ctx.cache = computeStats(fightEq(ctx), allMods(ctx.s), extraOf(ctx.s));
  return ctx.cache;
}

/** Pełne statystyki (cały ekwipunek), niezależnie od lochu. */
export const fullStats = (ctx: Ctx): Stats => computeStats(ctx.s.eq, allMods(ctx.s), extraOf(ctx.s));

/** Przelicza statystyki po zmianie ekwipunku lub technologii i zachowuje procent zdrowia bohatera. */
export function invalidate(ctx: Ctx): void {
  ctx.cache = null;
  const c = stats(ctx);
  const ratio = ctx.b.heroMax ? ctx.b.heroHp / ctx.b.heroMax : 1;
  ctx.b.heroMax = c.hp;
  ctx.b.heroHp = Math.max(1, Math.min(c.hp, ratio * c.hp));
}

/** Ile Mocy zyska (lub straci) bohater po założeniu przedmiotu. */
export function powerDelta(ctx: Ctx, it: Item): number {
  return computeStats({ ...ctx.s.eq, [it.slot]: it }, allMods(ctx.s), extraOf(ctx.s)).power - fullStats(ctx).power;
}
