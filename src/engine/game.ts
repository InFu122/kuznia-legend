import { B, ELEM, ORES, RAR, SETS, SET_FORGE_LVL, TECH } from '../data';
import { challengeBoss, goLand } from './combat';
import { toast, type Ctx } from './context';
import { dungContinue, dungEnd, dungKeys, dungTick, dungTier, dungUnlocked, labChoose, startDungeon } from './dungeon';
import { equipSkill, levelUp, openSaddle, openScroll, selectMount, selectPet, startHatch, tickHatch, useSeal } from './companions';
import { canClaimLogin, claimChest, claimLogin, claimMission, claimable, ensureMissions } from './missions';
import { tutTick } from './tutorial';
import { canSmelt, decideAuto, equip, sell, sellFor, smelt, startUpgrade, tickForge, upgradeCost, upgradeTime } from './forge';
import { itemName } from './formulas';
import { allMods } from './mods';
import { startResearch, tickResearch } from './tech';
import { obiegEvent } from './obieg';
import { applyOffline } from './offline';
import { mulberry32, rnd, type Rng } from './rng';
import { newBattle, newState } from './state';
import { invalidate, powerDelta, stats } from './stats';
import { stepCombat } from './combat';
import type { DungId, ElemKey, GameEvent, GameState, Item, MountId, PetId, SetId, SkillId, SlotId, TechId } from './types';

/**
 * Fasada silnika dla interfejsu: trzyma stan, prowadzi czas gry i wystawia akcje gracza.
 * Interfejs słucha zdarzeń (`on`) i niczego nie liczy sam.
 */
export class Game {
  readonly ctx: Ctx;
  private listeners = new Set<(e: GameEvent) => void>();
  /** Gdy interfejs pokazuje okno, auto-wytop czeka. */
  uiBusy = false;
  lastAuto: { item: Item; equipped: boolean } | null = null;

  constructor(state: GameState, opts: { rng?: Rng; now?: () => number } = {}) {
    const now = opts.now ?? (() => Date.now());
    this.ctx = {
      s: state, b: newBattle(),
      rng: opts.rng ?? mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0),
      now, emit: e => this.dispatch(e), cache: null, dirty: false,
    };
    invalidate(this.ctx);
    this.ctx.b.heroHp = this.ctx.b.heroMax;
  }

  get s() { return this.ctx.s; }
  get b() { return this.ctx.b; }
  get stats() { return stats(this.ctx); }

  on(fn: (e: GameEvent) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private dispatch(e: GameEvent) { for (const fn of this.listeners) fn(e); }
  private changed() { this.dispatch({ t: 'change' }); }

  /** Upływ `realMs` milisekund prawdziwego czasu (z uwzględnieniem tempa testowego). */
  tick(realMs: number): void {
    const ctx = this.ctx;
    const ms = realMs * ctx.s.speed;
    if (tickForge(ctx, ms)) this.changed();
    if (tickResearch(ctx, ms)) this.changed();
    if (tickHatch(ctx, ms)) this.changed();
    if (tutTick(ctx)) this.changed();
    ctx.b.obiegT -= ms;
    if (ctx.b.obiegT <= 0) { ctx.b.obiegT = rnd(ctx.rng, 60000, 150000); obiegEvent(ctx); }
    if (ctx.s.auto && ctx.s.forge.lvl >= B.AUTO_FORGE_LVL && !this.uiBusy) {
      ctx.b.autoT -= ms;
      if (ctx.b.autoT <= 0) { ctx.b.autoT = this.autoInterval(); this.autoStep(); }
    }
    if (ctx.b.mode === 'dung') dungTick(ctx, ms);
    stepCombat(ctx, ms);
  }

  /** Auto-wytop jest włączony, ale brakuje wybranej rudy. */
  get autoWaiting(): boolean { return this.s.auto && this.s.forge.lvl >= B.AUTO_FORGE_LVL && !canSmelt(this.ctx, this.s.oreSel); }

  /** Odstęp auto-wytopu z premią Wprawnych rąk. */
  autoInterval(): number { return B.AUTO_INTERVAL_MS / (1 + allMods(this.s).autoSpeed / 100); }

  private autoStep(): void {
    const ctx = this.ctx;
    const s = ctx.s;
    if (s.pending) {
      const it = s.pending;
      s.pending = null;
      this.lastAuto = { item: it, equipped: decideAuto(ctx, it, true) };
    }
    // Brak rudy nie wyłącza auto-wytopu: kuźnia czeka, aż wypadnie następna.
    if (!canSmelt(ctx, s.oreSel)) return;
    const it = smelt(ctx, s.oreSel, s.elSel);
    if (!it) return;
    const equipped = decideAuto(ctx, it, false);
    this.lastAuto = { item: it, equipped };
    if (it.r >= 4) toast(ctx, `${equipped ? 'Założono' : 'Sprzedano'}: ${itemName(it)} (${RAR[it.r].n})`, 'good');
    if (it.r >= 3) this.dispatch({ t: 'sfx', k: 'rare', r: it.r });
    this.changed();
  }

  /* ---------- akcje gracza ---------- */

  smeltManual(): Item | null {
    const ctx = this.ctx;
    if (ctx.s.pending) return null;
    const it = smelt(ctx, ctx.s.oreSel, ctx.s.elSel);
    if (!it) return null;
    ctx.s.pending = it;
    this.lastAuto = null;
    this.dispatch({ t: 'sfx', k: it.jump ? 'jump' : 'smelt', r: it.r });
    if (it.r >= 4) toast(ctx, `Wykuto: ${itemName(it)} (${RAR[it.r].n})!`, 'good');
    this.changed();
    return it;
  }
  equipPending(): void {
    const it = this.s.pending;
    if (!it) return;
    this.s.pending = null;
    equip(this.ctx, it, false);
    toast(this.ctx, 'Założono: ' + itemName(it));
    this.changed();
  }
  sellPending(): void {
    const it = this.s.pending;
    if (!it) return;
    this.s.pending = null;
    const price = sellFor(this.s, it);
    sell(this.ctx, it, false);
    toast(this.ctx, `Sprzedano za ${price.toLocaleString('pl-PL')} złota`);
    this.changed();
  }
  pendingDelta(): number { return this.s.pending ? powerDelta(this.ctx, this.s.pending) : 0; }
  setOre(i: number): void {
    if (this.s.forge.lvl < ORES[i].lvl) { toast(this.ctx, `${ORES[i].n}: wytop od ${ORES[i].lvl}. poziomu kuźni.`, 'bad'); return; }
    this.s.oreSel = i;
    this.ctx.dirty = true;
    this.changed();
  }
  setElem(k: ElemKey | null): void { this.s.elSel = k && ELEM[k] ? k : null; this.ctx.dirty = true; this.changed(); }
  setUniq(k: SetId | null): void {
    if (k && this.s.forge.lvl < SET_FORGE_LVL) { toast(this.ctx, `Zestawy: wytop od ${SET_FORGE_LVL}. poziomu kuźni.`, 'bad'); return; }
    this.s.uniqSel = k && SETS[k] ? k : null;
    this.ctx.dirty = true;
    this.changed();
  }
  toggleAuto(): void { this.s.auto = !this.s.auto; this.b.autoT = 300; this.ctx.dirty = true; this.changed(); }
  upgrade(): void {
    if (startUpgrade(this.ctx)) toast(this.ctx, `Ulepszanie kuźni do poziomu ${this.s.forge.up}`);
    this.changed();
  }
  upgradeTotal(): number { return this.s.forge.up ? upgradeTime(this.s, this.s.forge.up) : 0; }
  upgradeCost(): number { return upgradeCost(this.s, this.s.forge.lvl + 1); }
  upgradeTime(): number { return upgradeTime(this.s, this.s.forge.lvl + 1); }
  research(id: TechId): boolean {
    const ok = startResearch(this.ctx, id);
    if (ok) toast(this.ctx, `Badanie rozpoczęte: ${TECH[id].n}`);
    this.changed();
    return ok;
  }
  challengeBoss(): void { challengeBoss(this.ctx); this.changed(); }
  goLand(i: number): void { goLand(this.ctx, i); this.changed(); }
  /* ---------- umiejętności, chowańce, wierzchowce ---------- */

  openScroll() { const r = openScroll(this.ctx); if (r) this.dispatch({ t: 'modal', m: { kind: 'draw', what: 'skill', ...r } }); this.changed(); return r; }
  equipSkill(id: SkillId | null, slot: number) { const ok = equipSkill(this.ctx, id, slot); this.changed(); return ok; }
  startHatch(r: number) { const ok = startHatch(this.ctx, r); this.changed(); return ok; }
  selectPet(id: PetId | null) { const ok = selectPet(this.ctx, id); this.changed(); return ok; }
  openSaddle() { const r = openSaddle(this.ctx); if (r) this.dispatch({ t: 'modal', m: { kind: 'draw', what: 'mount', ...r } }); this.changed(); return r; }
  selectMount(id: MountId | null) { const ok = selectMount(this.ctx, id); this.changed(); return ok; }
  levelUp(kind: 'pet' | 'mount', id: PetId | MountId) { const ok = levelUp(this.ctx, kind, id); this.changed(); return ok; }
  useSeal(slot: SlotId) { const ok = useSeal(this.ctx, slot); this.changed(); return ok; }

  /* ---------- misje, kalendarz, ustawienia ---------- */

  claimMission(scope: 'daily' | 'weekly', i: number) { const r = claimMission(this.ctx, scope, i); this.changed(); return r; }
  claimChest() { const r = claimChest(this.ctx); this.changed(); return r; }
  claimLogin() { const r = claimLogin(this.ctx); this.changed(); return r; }
  claimable(): number { return claimable(this.ctx); }
  canClaimLogin(): boolean { return canClaimLogin(this.ctx); }
  missions() { ensureMissions(this.ctx); return this.s.missions; }
  setSound(on: boolean, vol = this.s.opts.vol) { this.s.opts = { sound: on, vol: Math.max(0, Math.min(1, vol)) }; this.ctx.dirty = true; this.changed(); }

  /** Decyzja o znalezisku ze Zbrojowni: załóż albo sprzedaj. */
  takeFound(i: number, wear: boolean): void {
    const it = this.s.found[i];
    if (!it) return;
    this.s.found.splice(i, 1);
    if (wear) { equip(this.ctx, it, false); toast(this.ctx, 'Założono: ' + itemName(it)); }
    else { const p = sellFor(this.s, it); sell(this.ctx, it, true); toast(this.ctx, `Sprzedano za ${p.toLocaleString('pl-PL')} złota`); }
    this.ctx.dirty = true;
    this.changed();
  }
  foundDelta(i: number): number { const it = this.s.found[i]; return it ? powerDelta(this.ctx, it) : 0; }
  labChoose(i: number) { const ok = labChoose(this.ctx, i); this.changed(); return ok; }

  /** Wejście do lochu; `land` wybiera bossa w Leżach Bossów. */
  startDung(id: DungId, land = -1): boolean { const ok = startDungeon(this.ctx, id, land); this.changed(); return ok; }
  dungGo(): void { dungContinue(this.ctx); this.changed(); }
  dungExit(): void { dungEnd(this.ctx, false); this.changed(); }
  dungKeys(id: DungId): number { return dungKeys(this.ctx, id); }
  dungUnlocked(id: DungId): boolean { return dungUnlocked(this.ctx, id); }
  dungTier(): number { return dungTier(this.ctx); }
  setName(n: string): string {
    this.s.name = n.trim().slice(0, 16) || 'Kowal';
    this.ctx.dirty = true;
    this.changed();
    return this.s.name;
  }
  toggleSpeed(): void { this.s.speed = this.s.speed > 1 ? 1 : 10; this.ctx.dirty = true; this.changed(); }
  reset(): void {
    const name = this.s.name;
    this.ctx.s = newState(this.ctx.now());
    this.ctx.s.name = name;
    this.ctx.b = newBattle();
    this.ctx.cache = null;
    this.lastAuto = null;
    invalidate(this.ctx);
    this.ctx.b.heroHp = this.ctx.b.heroMax;
    this.ctx.dirty = true;
    this.changed();
  }
  /** Wywołaj po powrocie do gry: nalicza nagrody offline i pokazuje podsumowanie. */
  offline(ms: number): void {
    const report = applyOffline(this.ctx, ms);
    if (report) this.dispatch({ t: 'modal', m: { kind: 'offline', report } });
    this.changed();
  }
  /** Podmiana stanu (np. nowszy zapis z chmury). */
  load(state: GameState): void {
    this.ctx.s = state;
    this.ctx.b = newBattle();
    this.ctx.cache = null;
    invalidate(this.ctx);
    this.ctx.b.heroHp = this.ctx.b.heroMax;
    this.changed();
  }
  takeDirty(): boolean { const d = this.ctx.dirty; this.ctx.dirty = false; return d; }
}
