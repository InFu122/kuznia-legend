import { ABYSS_FROM, AD, AD_BUFFS, B, DUNG_ORDER, ELEM, FEATURES, ORES, R, RAR, SETS, SET_FORGE_LVL, TECH, TEST_SPEEDS, TUTORIAL, rGe, rTier, type AchId, type FeatureId, type BuffId, type GemItemId, type FrameId, type SkinId } from '../data';
import { DEFAULT_NAME, NAME_MAX, tidyName } from './nick';
import { applyClanHelp, buyClanShop, takeServerRewards, type ServerReward } from './clan';
import { challengeBoss, goLand } from './combat';
import { toast, type Ctx } from './context';
import { dungContinue, dungEnd, dungKeys, dungTick, dungTier, dungUnlocked, labChoose, startDungeon } from './dungeon';
import { equipBestSkills, equipSkill, levelPreview, levelUp, openSaddle, openScroll, selectBestMount, selectBestPet, selectMount, selectPet, startHatch, tickHatch, useSeal } from './companions';
import { canClaimLogin, claimChest, claimLogin, claimMission, claimable, ensureMissions } from './missions';
import { tutTick } from './tutorial';
import { autoHandle, autoTarget, autoTargets, canSmelt, equip, refine, sell, smelt, startUpgrade, tickForge, upgradeCost, upgradeTime, refineTo } from './forge';
import { itemName, type AwKey } from './formulas';
import { setAwakening } from './legend';
import { devFinish, devForge, devLand, devMax, devResources } from './dev';
import { allMods } from './mods';
import { startResearch, tickResearch } from './tech';
import { checkUnlocks, isUnlocked, seenFeature } from './unlocks';
import { applyOffline } from './offline';
import { mulberry32, type Rng } from './rng';
import { newBattle, newState } from './state';
import { acceptReforge, payReforge, refundReforge, rerollSub, upgradeRune } from './runes';
import { achCount, claimAch, discover } from './achievements';
import { invalidate, powerDelta, stats } from './stats';
import { stepCombat } from './combat';
import {
  adRewardLocal, applyBoost, buyGemItemLocal, buyPackLocal, buyPassLocal, claimGiftLocal, claimPassLocal, refillKeys, shopToday, speedupLocal, tickPassLocal,
  type PassTrack, type ShopState,
} from './shop';
import { claimEvent, dungName, eventUnclaimed, tickEvent } from './events';
import { setFrame, setSkin } from './cosmetics';
import type { DungId, ElemKey, EventTrack, GameEvent, GameState, Item, ModalData, MountId, PetId, Reward, SetId, SkillId, SlotId, TechId } from './types';

/** Stan sklepu od serwera (odpowiedzi RPC sklepu i zapisu). */
export interface ShopSync { gems?: number; shop?: ShopState; pass?: PassTrack | null; buffs?: Partial<Record<BuffId, number>>; boost?: { lvl: number; ms: number } | null; techDone?: boolean }

/**
 * Fasada silnika dla interfejsu: trzyma stan, prowadzi czas gry i wystawia akcje gracza.
 * Interfejs słucha zdarzeń (`on`) i niczego nie liczy sam.
 */
export class Game {
  readonly ctx: Ctx;
  private listeners = new Set<(e: GameEvent) => void>();
  /** Gdy interfejs pokazuje okno, auto-wytop czeka. */
  uiBusy = false;
  /** Najwyższe dozwolone tempo testowe: bez serwera ×100, z serwerem tyle, ile pozwala serwer (domyślnie ×1). */
  maxSpeed: number;
  /** Tempo wybrane przez gracza, przywracane, gdy serwer pozwoli (np. po ponownym uruchomieniu gry). */
  private wantSpeed = 1;
  /** Ostatni przedmiot z auto-wytopu i co się z nim stało. */
  lastAuto: { item: Item; res: 'equip' | 'sell' | 'stop' } | null = null;
  /** Ikonka reklamy na polu walki: po obejrzeniu ×2 ruda albo ×2 złoto przez godzinę. */
  adOffer: { kind: BuffId; until: number } | null = null;
  private offerT = 60000;
  private lastOffer: BuffId = 'zloto';
  private passT = 0;
  private eventT = 0;
  private unlT = 0;
  /** Lochy otwarte przy ostatnim sprawdzeniu — nowy loch dostaje komunikat. */
  private dungOpen: Set<DungId> | null = null;

  constructor(state: GameState, opts: { rng?: Rng; now?: () => number; net?: boolean } = {}) {
    const now = opts.now ?? (() => Date.now());
    this.ctx = {
      s: state, b: newBattle(),
      rng: opts.rng ?? mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0),
      now, emit: e => this.dispatch(e), cache: null, dirty: false, net: !!opts.net,
    };
    this.maxSpeed = this.ctx.net ? 1 : TEST_SPEEDS[TEST_SPEEDS.length - 1];
    this.wantSpeed = state.speed || 1;
    if (this.ctx.net) state.speed = 1; // z serwerem przyspieszenie dopiero, gdy serwer ma włączony tryb testowy
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
  private dispatch(e: GameEvent) {
    if (e.t === 'first') this.firsts.add(e.id);
    for (const fn of this.listeners) fn(e);
  }
  /** Przedmioty (id), które jako pierwsze w historii gracza osiągnęły swoją rzadkość — odznaka „Pierwszy …!”. */
  readonly firsts = new Set<number>();
  /** Ile lepszych przedmiotów z rzędu gracz założył (seria; zeruje ją słabszy przedmiot). */
  streak = 0;
  /** Seria lepszych przedmiotów: założenie lepszego ją wydłuża, słabszy (założony albo sprzedany) przerywa. */
  private noteDecision(better: boolean, wear: boolean, name: string): void {
    if (wear && better) this.streak++;
    else if (!better) this.streak = 0;
    if (wear) toast(this.ctx, this.streak >= 3 ? `Seria: ${this.streak} lepsze z rzędu!` : 'Założono: ' + name, this.streak >= 3 ? 'good' : undefined);
  }
  private changed() { this.dispatch({ t: 'change' }); }

  /** Upływ `realMs` milisekund prawdziwego czasu (z uwzględnieniem tempa testowego). */
  tick(realMs: number): void {
    const ctx = this.ctx;
    const ms = realMs * ctx.s.speed;
    if (tickForge(ctx, ms)) this.changed();
    if (tickResearch(ctx, ms)) this.changed();
    if (tickHatch(ctx, ms)) this.changed();
    if (tutTick(ctx)) this.changed();
    if (ctx.s.auto && ctx.s.forge.lvl >= B.AUTO_FORGE_LVL && !this.uiBusy) {
      ctx.b.autoT -= ms;
      if (ctx.b.autoT <= 0) { ctx.b.autoT = this.autoInterval(); this.autoStep(); }
    }
    if (ctx.b.mode === 'dung') dungTick(ctx, ms);
    stepCombat(ctx, ms);
    this.shopTick(realMs);
  }

  /** Przepustka bez serwera (co 5 s) i ikonka reklamy na polu walki (co kilka minut prawdziwego czasu gry). */
  private shopTick(realMs: number): void {
    const ctx = this.ctx;
    const s = ctx.s;
    const now = ctx.now();
    // Nowe funkcje (kłódki): sprawdzane kilka razy na sekundę, ogłoszenie oknem.
    this.unlT -= realMs;
    if (this.unlT <= 0) { this.unlT = 400; if (checkUnlocks(ctx).length) this.changed(); }
    this.eventT -= realMs;
    if (this.eventT <= 0) {
      this.eventT = 5000;
      const before = this.s.event?.dpts ?? -1;
      const e = tickEvent(ctx);
      if (e.dpts !== before) this.changed();
      const open = DUNG_ORDER.filter(id => dungUnlocked(ctx, id));
      if (this.dungOpen) for (const id of open) if (!this.dungOpen.has(id)) toast(ctx, `Nowy loch: ${dungName(id, now)}! Zajrzyj do zakładki Lochy.`, 'good');
      this.dungOpen = new Set(open);
    }
    if (!ctx.net) {
      this.passT -= realMs;
      if (this.passT <= 0) {
        this.passT = 5000;
        const r = tickPassLocal(ctx);
        if (r) toast(ctx, 'Nowy sezon Przepustki Kowala — nieodebrane nagrody trafiły do ciebie.', 'good');
      }
    }
    if (this.adOffer && this.adOffer.until <= now) { this.adOffer = null; this.changed(); }
    if (s.tut < TUTORIAL.length || s.forge.lvl < 3 || ctx.b.mode !== 'camp' || this.adOffer) return;
    this.offerT -= realMs;
    if (this.offerT > 0) return;
    this.offerT = AD.OFFER_EVERY_MS;
    const sh = shopToday(s.shop, now);
    const order: BuffId[] = this.lastOffer === 'ruda' ? ['zloto', 'ruda'] : ['ruda', 'zloto'];
    const kind = order.find(k => (s.buffs?.[k] ?? 0) <= now && (sh.ads[k] ?? 0) < AD_BUFFS[k].day);
    if (!kind) return;
    this.lastOffer = kind;
    this.adOffer = { kind, until: now + AD.OFFER_SHOW_MS };
    this.changed();
  }
  /* ---------- runy i przekuwanie ---------- */

  upgradeRune(slot: SlotId): boolean { return this.done(upgradeRune(this.ctx, slot)); }
  /** Przekuwanie bez serwera: płaci i zwraca nową wersję przedmiotu (do wyboru). */
  reforge(slot: SlotId, i: number): Item | null {
    const it = this.s.eq[slot];
    if (!it || !payReforge(this.ctx, it)) return null;
    this.changed();
    return rerollSub(this.ctx.rng, it, i);
  }
  /** Z serwerem: zapłata przed przekuciem (zwrot przy błędzie serwera). */
  payReforge(slot: SlotId): boolean { const it = this.s.eq[slot]; return this.done(!!it && payReforge(this.ctx, it)); }
  refundReforge(slot: SlotId): void { const it = this.s.eq[slot]; if (it) { refundReforge(this.ctx, it); this.changed(); } }
  acceptReforge(cand: Item): boolean { return this.done(acceptReforge(this.ctx, cand)); }

  /** Komplet kluczy ze sklepu (z serwerem — po potwierdzeniu zakupu). */
  refillKeys(): void { refillKeys(this.s, this.ctx.now()); this.ctx.dirty = true; this.changed(); }
  /** Otwiera okno gry (np. sklep z przycisku przyspieszenia). */
  openModal(m: ModalData): void { this.dispatch({ t: 'modal', m }); }
  dismissAdOffer(): void { if (this.adOffer) { this.adOffer = null; this.changed(); } }

  /* ---------- sklep i przepustka ---------- */

  /** Dzisiejsze limity sklepu. */
  get shopNow(): ShopState { return shopToday(this.s.shop, this.ctx.now()); }
  private done<T>(v: T): T { if (v) this.changed(); return v; }
  buyGemItem(id: GemItemId): boolean { return this.done(buyGemItemLocal(this.ctx, id)); }
  claimGift(): Reward | null { return this.done(claimGiftLocal(this.ctx)); }
  adReward(kind: BuffId | 'gems'): boolean { if (kind !== 'gems') this.adOffer = null; return this.done(adRewardLocal(this.ctx, kind)); }
  buyPack(id: string): boolean { return this.done(buyPackLocal(this.ctx, id)); }
  buyPass(): boolean { return this.done(buyPassLocal(this.ctx)); }
  claimPass(): Reward | null { return this.done(claimPassLocal(this.ctx)); }
  speedup(what: 'forge' | 'tech'): boolean {
    const ok = speedupLocal(this.ctx, what);
    if (ok) { this.tick(0); this.changed(); }
    return ok;
  }
  /** Stan sklepu od serwera: Klejnoty, limity, przepustka, wzmocnienia i przyspieszenia. */
  applyShop(r: ShopSync): void {
    const s = this.s;
    if (typeof r.gems === 'number' && r.gems >= 0) s.gems = r.gems;
    if (r.shop) s.shop = r.shop;
    if (r.pass !== undefined) s.pass = r.pass;
    if (r.buffs) for (const k of Object.keys(AD_BUFFS) as BuffId[]) { const v = r.buffs[k]; if (typeof v === 'number' && v > (s.buffs[k] ?? 0)) s.buffs = { ...s.buffs, [k]: v }; }
    if (r.boost) applyBoost(this.ctx, r.boost.lvl, r.boost.ms);
    if (r.techDone && s.tech.cur) s.tech.cur = { ...s.tech.cur, left: 0 };
    // Dane od serwera nie wymagają ponownego zapisu — chyba że przyspieszenie zmieniło kuźnię albo badanie.
    if (r.boost || r.techDone) { this.ctx.dirty = true; this.tick(0); }
    this.changed();
  }


  /** Auto-wytop jest włączony, ale brakuje wybranej rudy. */
  get autoWaiting(): boolean { return this.s.auto && this.s.forge.lvl >= B.AUTO_FORGE_LVL && !this.s.pending && !canSmelt(this.ctx, this.s.oreSel); }
  /** Auto-wytop wstrzymany: przedmiot o wybranej rzadkości czeka na decyzję. */
  get autoPaused(): boolean { return this.s.auto && !!this.s.pending; }

  /** Odstęp auto-wytopu z premią Wprawnych rąk. */
  autoInterval(): number { return B.AUTO_INTERVAL_MS / (1 + allMods(this.s).autoSpeed / 100); }

  private autoStep(): void {
    const ctx = this.ctx;
    const s = ctx.s;
    if (s.pending) return; // przedmiot czeka na decyzję gracza — po niej auto-wytop jedzie dalej
    // Skończyła się ruda (albo jest za wysoka na ten poziom kuźni): auto-wytop się wyłącza i mówi dlaczego.
    if (!canSmelt(ctx, s.oreSel)) {
      const O = ORES[s.oreSel];
      s.auto = false;
      ctx.dirty = true;
      toast(ctx, s.forge.lvl < O.lvl ? `Auto-wytop wyłączony: ${O.n} od ${O.lvl}. poziomu kuźni.` : `Auto-wytop wyłączony — skończyła się ruda: ${O.n}.`, 'bad');
      this.changed();
      return;
    }
    const it = smelt(ctx, s.oreSel, s.autoEl);
    if (!it) return;
    const res = autoHandle(ctx, it, true);
    this.lastAuto = { item: it, res };
    this.dispatch({ t: 'forged', item: it });
    if (res === 'stop') {
      // Cel osiągnięty: auto staje, sygnał dźwiękowy i okno z decyzją.
      this.dispatch({ t: 'sfx', k: 'alert', r: rTier(it.r) });
      toast(ctx, `Wybrana rzadkość! ${itemName(it)} (${RAR[it.r].n})`, 'good');
      this.dispatch({ t: 'modal', m: { kind: 'decide' } });
    } else if (rGe(it.r, R.WYJATKOWY)) this.dispatch({ t: 'sfx', k: 'rare', r: rTier(it.r) });
    this.changed();
  }

  /** Czy funkcja jest odblokowana (i dostępna w tej grze — część tylko z serwerem). */
  unlocked(id: FeatureId): boolean { return isUnlocked(this.s, id) && (this.ctx.net || !FEATURES[id].net); }
  /** Gracz otworzył nowe funkcje — znika znaczek „nowe”. */
  seenFeatures(ids: FeatureId[]): void { if (seenFeature(this.s, ids)) { this.ctx.dirty = true; this.changed(); } }

  /** Rzadkości do wyboru dla auto-wytopu z wybranej rudy i aktualny cel. */
  autoTargets(): number[] { return autoTargets(this.s.oreSel, this.s.forge.lvl); }
  autoTarget(): number { return autoTarget(this.s); }
  setAutoStop(r: number): void {
    if (!autoTargets(this.s.oreSel, this.s.forge.lvl).includes(r)) return;
    this.s.autoStop = r;
    this.ctx.dirty = true;
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
    this.dispatch({ t: 'forged', item: it });
    // Dźwięk przeskoku gra animacja wykuwania (żeby nie zdradzić wyniku przed czasem).
    this.dispatch({ t: 'modal', m: { kind: 'decide' } });
    this.changed();
    return it;
  }
  /** Rafinacja rudy `from` na następną (`times` sztuk albo ile się da). */
  refine(from: number, times: number): number {
    const n = refine(this.ctx, from, times);
    if (n) { toast(this.ctx, `Rafinacja: +${n} ${ORES[refineTo(from)].n}`, 'good'); this.changed(); }
    return n;
  }
  equipPending(): void {
    const it = this.s.pending;
    if (!it) return;
    const better = powerDelta(this.ctx, it) > 0;
    this.s.pending = null;
    equip(this.ctx, it, false);
    this.noteDecision(better, true, itemName(it));
    this.changed();
  }
  sellPending(): void {
    const it = this.s.pending;
    if (!it) return;
    this.noteDecision(powerDelta(this.ctx, it) > 0, false, '');
    this.s.pending = null;
    // Bez powiadomienia: monety lecą do licznika złota z dymkiem „+N” (gdy licznika nie widać — okno pokazuje komunikat).
    sell(this.ctx, it, false);
    this.changed();
  }
  pendingDelta(): number { return this.s.pending ? powerDelta(this.ctx, this.s.pending) : 0; }
  /** Wybór rudy; zablokowaną też można wybrać — kuźnia pokaże jej szanse („wytop od poziomu…”). */
  setOre(i: number): void {
    if (!ORES[i]) return;
    this.s.oreSel = i;
    this.ctx.dirty = true;
    this.changed();
  }
  setElem(k: ElemKey | null): void { this.s.elSel = k && ELEM[k] ? k : null; this.ctx.dirty = true; this.changed(); }
  /** Domieszka auto-wytopu (osobno od ręcznego wytopu; null — bez domieszki). */
  setAutoEl(k: ElemKey | null): void { this.s.autoEl = k && ELEM[k] ? k : null; this.ctx.dirty = true; this.changed(); }
  setUniq(k: SetId | null): void {
    if (k && this.s.forge.lvl < SET_FORGE_LVL) { toast(this.ctx, `Ruda unikalna: wytop od ${SET_FORGE_LVL}. poziomu kuźni.`, 'bad'); return; }
    this.s.uniqSel = k && SETS[k] ? k : null;
    this.ctx.dirty = true;
    this.changed();
  }
  toggleAuto(): void {
    this.s.auto = !this.s.auto;
    // Włączenie przy przedmiocie czekającym na decyzję: najpierw okno decyzji, potem auto rusza samo.
    if (this.s.auto && this.s.pending) this.dispatch({ t: 'modal', m: { kind: 'decide' } });
    this.b.autoT = 300;
    this.ctx.dirty = true;
    this.changed();
  }
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
  /** Narzędzia dewelopera (Kodeks): przeskakiwanie etapów gry do testów. */
  dev(what: 'max' | 'land' | 'lastLand' | 'forge10' | 'finish' | 'res'): void {
    const c = this.ctx;
    if (what === 'max') devMax(c);
    else if (what === 'land') devLand(c, this.s.maxLand + 1);
    else if (what === 'lastLand') devLand(c, ABYSS_FROM - 1); // ostatnia kraina kampanii (dalej Otchłań)
    else if (what === 'forge10') devForge(c, 10);
    else if (what === 'finish') devFinish(c);
    else devResources(c);
    c.dirty = true;
    this.changed();
  }
  /** Moc teraz i po ulepszeniu towarzysza o poziom. */
  levelPreview(kind: 'pet' | 'mount', id: PetId | MountId) { return levelPreview(this.ctx, kind, id); }
  useSeal(slot: SlotId) { const ok = useSeal(this.ctx, slot); this.changed(); return ok; }
  /** Wybór albo zmiana cechy przebudzenia założonego przedmiotu (pierwszy wybór darmowy, potem złoto). */
  setAwakening(slot: SlotId, key: AwKey) { const ok = setAwakening(this.ctx, slot, key); this.changed(); return ok; }
  /** „Załóż najlepsze”: umiejętności, chowaniec albo wierzchowiec dające najwięcej Mocy. */
  equipBest(what: 'skills' | 'pet' | 'mount'): boolean {
    const ok = what === 'skills' ? equipBestSkills(this.ctx) : what === 'pet' ? selectBestPet(this.ctx) : selectBestMount(this.ctx);
    toast(this.ctx, ok ? 'Założono najlepsze — Moc: ' + Math.round(this.stats.power).toLocaleString('pl-PL') : 'Masz już założone najlepsze.', ok ? 'good' : undefined);
    this.changed();
    return ok;
  }

  /* ---------- misje, kalendarz, ustawienia ---------- */

  claimMission(scope: 'daily' | 'weekly', i: number) { const r = claimMission(this.ctx, scope, i); this.changed(); return r; }
  claimChest() { const r = claimChest(this.ctx); this.changed(); return r; }
  claimLogin() { const r = claimLogin(this.ctx); this.changed(); return r; }
  claimable(): number { return claimable(this.ctx) + achCount(this.s); }
  claimAch(id: AchId): Reward | null { return this.done(claimAch(this.ctx, id)); }
  setSkin(id: SkinId): boolean { return this.done(setSkin(this.ctx, id)); }
  setFrame(id: FrameId): boolean { return this.done(setFrame(this.ctx, id)); }
  /** Wydarzenie: aktualny stan (liczy punkty z gry). */
  event(): EventTrack { return tickEvent(this.ctx); }
  claimEvent(): Reward | null { return this.done(claimEvent(this.ctx)); }
  /** Nieodebrane nagrody wydarzenia (kropka na zakładce Lochy). */
  eventTodo(): number { return this.s.event ? eventUnclaimed(this.s.event, this.s).n : 0; }
  canClaimLogin(): boolean { return canClaimLogin(this.ctx); }
  missions() { ensureMissions(this.ctx); return this.s.missions; }
  setSound(on: boolean, vol = this.s.opts.vol) { this.s.opts = { ...this.s.opts, sound: on, vol: Math.max(0, Math.min(1, vol)) }; this.ctx.dirty = true; this.changed(); }
  setNotify(on: boolean) { this.s.opts = { ...this.s.opts, notify: on }; this.ctx.dirty = true; this.changed(); }
  setVibe(on: boolean) { this.s.opts = { ...this.s.opts, vibe: on }; this.ctx.dirty = true; this.changed(); }
  /** Ekran nie gaśnie w czasie gry. */
  setAwake(on: boolean) { this.s.opts = { ...this.s.opts, awake: on }; this.ctx.dirty = true; this.changed(); }
  /** Tryb oszczędzania: przyciemnianie po minucie bez dotyku. */
  setDim(on: boolean) { this.s.opts = { ...this.s.opts, dim: on }; this.ctx.dirty = true; this.changed(); }
  /** „Nie pokazuj ponownie” w oknie Co nowego: id wpisu albo '' (pokaż przy następnym włączeniu). */
  /** Prośba o połączenie z Google była już pokazana (raz na konto). */
  setGoogleAsked() { this.s.opts = { ...this.s.opts, gAsk: true }; this.ctx.dirty = true; this.changed(); }
  setLogSeen(id: string) { this.s.opts = { ...this.s.opts, logSeen: id }; this.ctx.dirty = true; this.changed(); }
  /** Wybór utworu (null — automatycznie według miejsca). Wybranie utworu włącza muzykę. */
  setTrack(id: string | null) { this.s.opts = { ...this.s.opts, track: id, music: id ? true : this.s.opts.music }; this.ctx.dirty = true; this.changed(); }
  setMusic(on: boolean, vol = this.s.opts.mvol) { this.s.opts = { ...this.s.opts, music: on, mvol: Math.max(0, Math.min(1, vol)) }; this.ctx.dirty = true; this.changed(); }

  /** Decyzja o znalezisku ze Zbrojowni: załóż albo sprzedaj. */
  takeFound(i: number, wear: boolean): void {
    const it = this.s.found[i];
    if (!it) return;
    const better = powerDelta(this.ctx, it) > 0;
    this.s.found.splice(i, 1);
    discover(this.ctx, it);
    if (wear) { equip(this.ctx, it, false); this.noteDecision(better, true, itemName(it)); }
    else { this.noteDecision(better, false, ''); sell(this.ctx, it, true); }
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
    this.s.name = tidyName(n).slice(0, NAME_MAX) || DEFAULT_NAME;
    this.ctx.dirty = true;
    this.changed();
    return this.s.name;
  }
  /** Tempa testowe dostępne teraz. */
  get speeds(): number[] { return TEST_SPEEDS.filter(v => v <= this.maxSpeed); }
  setSpeed(v: number): void {
    if (!this.speeds.includes(v)) return;
    this.wantSpeed = v;
    if (this.s.speed === v) return;
    this.s.speed = v;
    this.ctx.dirty = true;
    this.changed();
  }
  /** Następne tempo testowe (×1 → ×10 → …). */
  toggleSpeed(): void {
    const l = this.speeds;
    this.setSpeed(l[(l.indexOf(this.s.speed) + 1) % l.length]);
  }
  /** Najwyższe tempo, na które pozwala serwer (tryb testowy serwera). */
  setMaxSpeed(n: number): void {
    this.maxSpeed = Math.max(1, Math.floor(n) || 1);
    const v = this.allowedSpeed(this.wantSpeed);
    if (this.s.speed !== v) { this.s.speed = v; this.changed(); }
  }
  /** Najszybsze dozwolone tempo nie większe niż `v`. */
  private allowedSpeed(v: number): number { return Math.max(...this.speeds.filter(x => x <= v)); }
  get net(): boolean { return this.ctx.net; }
  /** Nick nadany albo potwierdzony przez serwer. */
  applyServerName(name: string): void {
    if (!name || name === this.s.name) return;
    this.s.name = name;
    this.changed();
  }

  /* ---------- serwer: ziarna wytopu, przedmioty Zbrojowni, arena ---------- */

  /** Ile ziaren wytopu warto dobrać i od którego numeru. */
  seedNeed(): { from: number; n: number } {
    const have = this.s.seeds.length;
    return { from: this.s.sx + have, n: have < B.SEEDS_REFILL ? B.SEEDS_RESERVE - have : 0 };
  }
  /** Dokłada ziarna od serwera, jeśli pasują do kolejki. */
  addSeeds(from: number, seeds: number[]): boolean {
    if (from !== this.s.sx + this.s.seeds.length || !seeds.length) return false;
    this.s.seeds.push(...seeds.filter(x => Number.isInteger(x) && x >= 0 && x <= 0xffffffff));
    this.ctx.dirty = true;
    return true;
  }
  /** Ile przedmiotów dawnych kowali (Zbrojownia) brakuje w zapasie od serwera. */
  ghostNeed(): number { return Math.max(0, B.GHOST_STOCK - this.s.obIn.length); }
  /** Przedmioty dawnych kowali od serwera (podpisane) do zapasu Zbrojowni. */
  ghostIn(items: Item[]): void {
    for (const it of items) if (this.s.obIn.length < B.GHOST_STOCK) this.s.obIn.push(it);
    if (items.length) { this.ctx.dirty = true; this.changed(); }
  }
  /** Nagroda z walki na arenie (liczy ją serwer). */
  arenaReward(gold: number): void {
    if (!(gold > 0)) return;
    this.s.gold += Math.floor(gold);
    this.ctx.dirty = true;
    this.changed();
  }
  /** Komunikat w dymku (np. z działań na serwerze). */
  notify(msg: string, kind?: 'good' | 'bad'): void { toast(this.ctx, msg, kind); }

  /* ---------- klan (serwer) ---------- */

  /** Poziom klanu od serwera (premie dla członków). */
  setClanLvl(lvl: number): void {
    const l = Math.max(0, Math.floor(lvl) || 0);
    if (l === this.s.clanLvl) return;
    this.s.clanLvl = l;
    this.ctx.dirty = true;
    invalidate(this.ctx);
    this.changed();
  }
  /** Nagrody od serwera (Monety, skrzynie bossa klanowego, ruda od klanu) — każda tylko raz. */
  serverRewards(list: ServerReward[]): ServerReward[] {
    const got = takeServerRewards(this.ctx, list);
    if (got.length) this.changed();
    return got;
  }
  /** Pomoc klanu w ulepszeniu kuźni (liczy ją serwer). Zwraca liczbę nowych pomocy. */
  clanHelp(lvl: number, n: number): number {
    const add = applyClanHelp(this.ctx, lvl, n);
    if (add) this.changed();
    return add;
  }
  /** Płatność złotem lub rudą za akcję klanu (datek, dar rudy). Zwraca false, gdy brakuje. */
  clanPay(gold: number, ore?: { i: number; n: number }): boolean {
    const s = this.s;
    if (gold > s.gold || (ore && !(ore.n > 0 && s.ores[ore.i] >= ore.n))) return false;
    s.gold -= gold;
    if (ore) s.ores[ore.i] -= ore.n;
    this.ctx.dirty = true;
    this.changed();
    return true;
  }
  /** Zwrot, gdy serwer odrzucił akcję. */
  clanRefund(gold: number, ore?: { i: number; n: number }): void {
    this.s.gold += gold;
    if (ore) this.s.ores[ore.i] += ore.n;
    this.ctx.dirty = true;
    this.changed();
  }
  buyClan(id: Parameters<typeof buyClanShop>[1]): boolean {
    const ok = buyClanShop(this.ctx, id);
    if (ok) this.changed();
    return ok;
  }

  reset(): void {
    const old = this.s;
    this.ctx.s = newState(this.ctx.now());
    // Imię, ziarna wytopu i zapas Zbrojowni zostają: numer wytopu nigdy się nie cofa.
    // Poziom klanu i lista odebranych nagród klanu też zostają — należą do konta, nie do rozgrywki.
    // Klejnoty, przepustka, limity sklepu i wzmocnienia też należą do konta.
    Object.assign(this.ctx.s, {
      name: old.name, sx: old.sx, seeds: old.seeds, obIn: old.obIn, obOut: old.obOut, clanLvl: old.clanLvl, clanGot: old.clanGot, speed: old.speed,
      gems: old.gems, shop: old.shop, buffs: old.buffs, pass: old.pass,
    });
    this.ctx.b = newBattle();
    this.ctx.cache = null;
    this.lastAuto = null;
    invalidate(this.ctx);
    this.ctx.b.heroHp = this.ctx.b.heroMax;
    this.ctx.dirty = true;
    this.changed();
  }
  /** Do kiedy sięga ostatnio podsumowana nieobecność (zegar urządzenia — tym samym liczą `ms` wywołujący `offline`). */
  private offlineTo = 0;
  /** Wywołaj po powrocie do gry: nalicza nagrody offline i pokazuje podsumowanie. */
  offline(ms: number): void {
    // Przepustka bez serwera: przełom dnia przed nagrodami za nieobecność, żeby wrogowie z nocy liczyli się do nowego dnia.
    if (!this.ctx.net) tickPassLocal(this.ctx);
    tickEvent(this.ctx);
    const report = applyOffline(this.ctx, ms);
    if (report) {
      // Nieobecność zaczęła się przed końcem poprzedniego podsumowania — to ta sama przerwa policzona od nowa
      // (np. po starcie przyszedł z serwera nowszy zapis). Okno pokaże się drugi raz tylko, jeśli pierwsze wciąż czeka.
      const wall = Date.now();
      const again = wall - ms < this.offlineTo - 5000;
      this.offlineTo = wall;
      this.dispatch({ t: 'modal', m: { kind: 'offline', report, again } });
      // Skrzynia nocnej zmiany zatrzymała się na wybranej rzadkości — przedmiot czeka na decyzję.
      if (report.chest.some(x => x.stop) && this.s.pending) this.dispatch({ t: 'modal', m: { kind: 'decide' } });
    }
    this.changed();
  }
  /** Podmiana stanu (np. nowszy zapis z chmury). */
  load(state: GameState): void {
    this.dungOpen = null; // inny zapis — bez komunikatów o „nowych” lochach
    state.speed = this.allowedSpeed(this.wantSpeed); // tempo testowe to ustawienie tego urządzenia
    this.ctx.s = state;
    this.ctx.b = newBattle();
    this.ctx.cache = null;
    invalidate(this.ctx);
    this.ctx.b.heroHp = this.ctx.b.heroMax;
    this.changed();
  }
  takeDirty(): boolean { const d = this.ctx.dirty; this.ctx.dirty = false; return d; }
}
