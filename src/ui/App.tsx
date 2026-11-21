import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import type { ModalData } from '../engine/types';
import { Arena } from './Arena';
import { ModalShell, ModalView } from './Modals';
import { ProfileView } from './panels/Profile';
import { onProfile } from './profile';
import { Toasts } from './Toasts';
import { fmt } from './format';
import { LockIcon, TabIcon, type Tab } from './icons';
import { toast } from '../engine/context';
import { ADVENTURE, NAVS, NAV_OF, VIEW_NAME, reachText, reachTarget, type Nav } from './nav';
import { ForgeDock } from './Dock';
import { ChatPop, GoalStrip } from './Goal';
import { menuTodo } from './Menu';
import { Coach, type CoachMark } from './Coach';
import { ClanPanel } from './panels/Clan';
import { CodexPanel } from './panels/Codex';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { DungeonPanel } from './panels/Dungeon';
import { ForgePanel } from './panels/Forge';
import { HeroPanel } from './panels/Hero';
import { LandsPanel } from './panels/Lands';
import { ResearchPanel } from './panels/Research';
import { B, FEATURES, FEATURE_IDS, ORES, type FeatureId } from '../data';
import { gearHint, tutStep } from '../engine/tutorial';
import { bossWaiting } from '../engine/combat';
import { play, setSound, unlockAudio } from './sound';
import { initMusic, kickMusic, moodOf, setMood, setMusic } from './music';
import { hasUpdate, onPwa } from './pwa';
import { onStoreUpdate, storeUpdateReady, updateFromStore } from './storeupdate';
import { initHistoryBack, initNative } from './native';
import { runBack } from './back';
import { PowerSave } from './PowerSave';

/** Okna, których nie zamyka się obok ani „wstecz” — czekają na decyzję. */
const LOCKED = new Set<ModalData['kind']>(['dungChoice', 'labChoice', 'decide', 'intro']);
/** Okna, przy których auto-wytop i walka idą dalej (nie czekają na decyzję gracza). */
const NOT_BUSY = new Set<ModalData['kind']>(['chat', 'ranking', 'arena', 'menu', 'ores']);

/** Widoki odblokowywane z postępem (kłódka). */
const TAB_FEATURE: Partial<Record<Tab, FeatureId>> = { bohater: 'bohater', nauka: 'nauka', krainy: 'krainy', lochy: 'lochy', klan: 'klan' };

export interface SaveInfo {
  mode: 'local' | 'cloud' | 'server' | 'connecting' | 'offline';
  error?: string;              // serwer odrzucił zapis
  reason?: string;             // dlaczego nie ma połączenia
  retry?: () => void;          // połącz ponownie teraz
  redeem?: (code: string) => Promise<void>;  // przejmij konto z kodu przeniesienia
  flush?: () => Promise<void>;               // zapisz teraz (np. przed odświeżeniem po aktualizacji)
  deleteAccount?: (confirm: string) => Promise<void>; // usuń konto na serwerze i zacznij od zera
}

export function App({ game, save, onReady }: { game: Game; save: SaveInfo; onReady?: () => void }) {
  const [tab, setTab] = useState<Tab>('kuznia');
  const [, force] = useState(0);
  /** Otwarty profil gracza: `undefined` — zamknięty, `null` — własny. */
  const [profile, setProfile] = useState<string | null | undefined>(undefined);
  useEffect(() => onProfile(id => setProfile(id)), []);
  const queue = useRef<ModalData[]>([]);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (game.s.stats.smelted === 0) queue.current.push({ kind: 'intro' });
    const off = game.on(e => {
      if (e.t === 'modal') { queue.current.push(e.m); force(x => x + 1); }
      else if (e.t === 'change') force(x => x + 1);
      else if (e.t === 'sfx') play(e.k, e.r);
      else if (e.t === 'drop') play(e.rare ? 'dropRare' : 'drop');
    });
    const id = setInterval(() => force(x => x + 1), 250);
    const offPwa = onPwa(() => force(x => x + 1));
    const offStore = onStoreUpdate(() => force(x => x + 1));
    // Aplikacja na telefon: powiadomienia i „wstecz” (zamyka okno; okna z decyzją zostają, bez okna — gra chowa się).
    // Najpierw najwyższe okno (rejestrują się w ModalShell), potem powrót do Kuźni z innej zakładki.
    const back = () => {
      if (runBack()) return true;
      if (tabRef.current !== 'kuznia') { goTabRef.current('kuznia'); return true; }
      return false;
    };
    void initNative(game, back);
    const offHist = initHistoryBack(back);
    force(x => x + 1);
    onReady?.();
    // Kalendarz logowania wita gracza, który już grał (nowy gracz ma najpierw wstęp i samouczek).
    if (game.s.stats.smelted > 0 && game.unlocked('zadania') && game.canClaimLogin()) { queue.current.push({ kind: 'missions', tab: 'login' }); force(x => x + 1); }
    // Na telefonie przeglądarka pozwala na dźwięk dopiero po puszczeniu palca (pointerup/touchend/click),
    // a nie przy samym dotknięciu — dlatego nasłuchujemy kilku zdarzeń i ponawiamy start muzyki.
    const unlock = () => { unlockAudio(); initMusic(); kickMusic(); };
    const evs = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
    for (const ev of evs) window.addEventListener(ev, unlock, { capture: true, passive: true });
    return () => { off(); offPwa(); offStore(); offHist(); clearInterval(id); for (const ev of evs) window.removeEventListener(ev, unlock, { capture: true }); };
  }, [game]);

  // Samouczek: bieżący krok i wskazówka „palcem” (ukryta przez gracza do następnego kroku).
  const step = tutStep(game.s);
  const [coachOff, setCoachOff] = useState('');
  /** Wskazówka po ogłoszeniu nowej funkcji („Pokaż”). */
  const [feat, setFeat] = useState<FeatureId | null>(null);
  /** Zakładka, w której gracz właśnie obejrzał nową funkcję — póki w niej jest, samouczek nie ciągnie go gdzie indziej. */
  const [featTab, setFeatTab] = useState<Tab | null>(null);
  useEffect(() => { if (featTab && tab !== featTab) setFeatTab(null); }, [tab]);
  // Nowe funkcje w otwartej zakładce: znika znaczek „nowe”.
  useEffect(() => { game.seenFeatures(FEATURE_IDS.filter(id => FEATURES[id].at.tab === tab)); }, [tab]);
  setSound(game.s.opts.sound, game.s.opts.vol);
  setMusic(game.s.opts.music, game.s.opts.mvol);
  setMood(moodOf(game.b.mode, !!game.b.enemy?.boss));

  // Wstęp jest dla nowego gracza — znika, gdy z serwera przyszedł zapis z postępem.
  if (queue.current[0]?.kind === 'intro' && game.s.stats.smelted > 0) queue.current.shift();
  const modal = queue.current[0] ?? null;
  // Okno z decyzją wstrzymuje auto-wytop; czat, rankingi, arena i menu nie.
  game.uiBusy = !!modal && !NOT_BUSY.has(modal.kind);
  const close = () => { queue.current.shift(); force(x => x + 1); };
  const open = (m: ModalData) => { queue.current.unshift(m); force(x => x + 1); };
  const goTab = (t: Tab, scroll = false) => {
    const f = TAB_FEATURE[t];
    if (f && !game.unlocked(f)) { open({ kind: 'locked', id: f }); return; }
    setTab(t);
    if (scroll) panelRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };
  // Dla przycisku „wstecz” (rejestrowanego raz przy starcie) — bieżąca zakładka i przełączanie.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const goTabRef = useRef(goTab);
  goTabRef.current = goTab;
  /** Ostatnio oglądana część Przygody (przycisk na dole wraca do niej). */
  const lastAdv = useRef<Tab>('krainy');
  if (ADVENTURE.includes(tab)) lastAdv.current = tab;
  const nav = NAV_OF[tab];
  const goNav = (n: Nav) => {
    if (n === 'menu') { open({ kind: 'menu' }); return; }
    if (n === 'przygoda') { goTab(lastAdv.current); return; }
    goTab(n);
  };

  // Wysokość dolnego paska (kowadło, czat, zakładki) — tyle miejsca zostawia strona pod treścią.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bottomRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--bottom-h', Math.ceil(el.getBoundingClientRect().height) + 'px'));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** „Pokaż” w pasku samouczka: znowu wskazuje palcem bieżący krok. */
  const showStep = () => { setCoachOff(''); setFeat(null); };
  /** Przycisk w nagłówku: zablokowany — okno z kłódką, inaczej akcja (i koniec znaczka „nowe”). */
  const headBtn = (id: FeatureId, act: () => void) => () => {
    if (!game.unlocked(id)) { open({ kind: 'locked', id }); return; }
    game.seenFeatures([id]);
    act();
  };
  const isNew = (pred: (f: (typeof FEATURES)[FeatureId]) => boolean) => s.unlNew.some(id => FEATURES[id as FeatureId] && pred(FEATURES[id as FeatureId]));
  const s = game.s;
  const mt = menuTodo(game);

  // Wskazówka palcem: najpierw nowa funkcja (po „Pokaż” w ogłoszeniu), potem bieżący krok samouczka.
  // `navHint` — wskazówka, jak dojść do miejsca (może świecić też nad otwartym Menu).
  let mark: (CoachMark & { key: string }) | null = null;
  let navHint = false;
  if (feat) {
    const F = FEATURES[feat];
    const where = F.at.inTab;
    if (where && tab !== where) {
      mark = { key: `f:${feat}:tab`, target: reachTarget(where), title: `Nowość: ${F.n}`, text: reachText(where) };
      navHint = true;
    } else if (F.at.tab) {
      const deep = NAV_OF[F.at.tab] !== F.at.tab;
      mark = { key: `f:${feat}`, target: reachTarget(F.at.tab), title: `Nowość: ${F.n}`, text: deep ? `${F.d} ${reachText(F.at.tab)}` : F.d };
      navHint = true;
    } else if (F.at.btn === 'zadania' || F.at.btn === 'czat') {
      mark = { key: `f:${feat}`, target: [F.target, '[data-tab="menu"]'], title: `Nowość: ${F.n}`, text: `${F.d} Otwórz Menu → ${F.at.btn === 'czat' ? 'Czat' : 'Zadania'}.` };
      navHint = true;
    } else {
      mark = { key: `f:${feat}`, target: F.target, title: `Nowość: ${F.n}`, text: F.d };
    }
  } else if (step && coachOff !== step.id) {
    const gear = gearHint(s);
    const waiting = step.id === 'boss1' && bossWaiting(game.ctx);
    if (tab !== step.tab) {
      if (tab !== featTab) {
        mark = { key: `${step.id}:tab`, target: reachTarget(step.tab), title: step.t, text: reachText(step.tab) };
        navHint = true;
      }
    } else if (gear && !waiting) {
      // Zamiast czekać na bohatera: kuj dalej, póki są puste miejsca i ruda.
      mark = { key: `${step.id}:gear`, target: '.dock-go', title: 'Wypełnij ekwipunek',
        text: `Bohater nosi ${gear.worn}/8 przedmiotów, a masz ${fmt(gear.ore)} × ${ORES[s.oreSel].n}. Kuj dalej — każdy nowy przedmiot to więcej Mocy na bossa.` };
    } else if (step.id === 'boss1') {
      // Przycisk bossa jest dopiero na 10. etapie — wcześniej tylko obwódka paska etapów, bez dłoni.
      mark = waiting ? { key: 'boss1:go', target: '.arena-actions .btn', title: step.t, text: step.d }
        : { key: 'boss1:look', target: '.arena .track', title: step.t, text: step.d, act: 'look' };
    } else mark = { key: step.id, target: step.target, title: step.t, text: step.d, act: step.act };
  }
  // Nad oknami wskazówka tylko w Menu (droga do funkcji) i przy decyzji o pierwszej broni (krok „Załóż broń”).
  const coachOn = !!mark && (!modal || (modal.kind === 'menu' && navHint) || (!feat && modal.kind === 'decide' && step?.id === 'equip1'));
  const hideCoach = () => { if (feat) setFeat(null); else if (step) setCoachOff(step.id); };
  const tapCoach = () => {
    if (!feat || mark?.key !== `f:${feat}`) return;
    const F = FEATURES[feat];
    setFeat(null);
    setFeatTab(F.at.inTab ?? F.at.tab ?? tab);
  };
  const elTab = tab === 'kuznia' && s.forge.lvl >= B.ELEM_FORGE_LVL;
  return (
    <>
      {/* Na Kuźni od poziomu domieszek nad przyciskiem rudy wystaje „dobudówka” — treść i dymek czatu robią jej miejsce. */}
      <div class={`app${elTab ? ' el-tab' : ''}`}>
        <header class="hud">
          <div class="hud-chip gold" title="Złoto"><Px src={resUrl('zloto')} size={22} /><b>{fmt(s.gold)}</b></div>
          <button class={`hud-chip gems${game.unlocked('sklep') ? '' : ' locked'}`} data-btn="sklep" onClick={headBtn('sklep', () => open({ kind: 'shop', tab: 'klejnoty' }))}
            aria-label={game.unlocked('sklep') ? `Klejnoty: ${fmt(s.gems)}. Kup w sklepie` : `Klejnoty: ${fmt(s.gems)}. Sklep zablokowany`}>
            <Px src={resUrl('klejnot')} size={22} /><b>{fmt(s.gems)}</b>
            {game.unlocked('sklep') ? <i class="plus" aria-hidden="true">+</i> : <LockIcon />}
            {s.unlNew.includes('sklep') && <i class="badge dotb new" aria-hidden="true" />}
          </button>
          <span class="hud-gap" />
          {s.speed > 1 && <span class="speed-badge" title="Tempo testowe">×{s.speed}</span>}
          {(save.error || save.mode === 'offline' || save.mode === 'connecting') && (
            <button class={`net-pill ${save.mode}`} title={save.error ?? save.reason}
              onClick={() => {
                if (save.error) { toast(game.ctx, `Serwer odrzucił zapis: ${save.error}`, 'bad'); return; }
                if (save.mode === 'offline' && save.retry) {
                  // Dotknięcie „Offline” od razu próbuje połączyć (gra i tak próbuje sama co kilka sekund).
                  toast(game.ctx, `Łączę ponownie… ${save.reason ? `(${save.reason})` : ''}`.trim());
                  save.retry();
                  return;
                }
                toast(game.ctx, save.reason || (save.mode === 'connecting' ? 'Łączenie z serwerem…' : 'Brak połączenia z serwerem — gra zapisuje się na telefonie.'));
              }}>
              {save.error ? 'Zapis odrzucony' : save.mode === 'connecting' ? 'Łączenie…' : 'Offline'}
            </button>
          )}
          <div class="hud-chip moc" title="Moc bohatera"><Px src={resUrl('moc')} size={20} /><b>{fmt(game.stats.power)}</b></div>
        </header>
        {storeUpdateReady() ? (
          <section class="updbar" role="status">
            <span>Jest nowa wersja gry w Google Play.</span>
            <button class="btn small primary" onClick={() => { void (save.flush?.() ?? Promise.resolve()).catch(() => {}).finally(() => void updateFromStore()); }}>Aktualizuj</button>
          </section>
        ) : hasUpdate() && (
          <section class="updbar" role="status">
            <span>Jest nowa wersja gry.</span>
            <button class="btn small primary" onClick={() => { void (save.flush?.() ?? Promise.resolve()).catch(() => {}).finally(() => location.reload()); }}>Odśwież</button>
          </section>
        )}
        <GoalStrip game={game} step={step} onShow={showStep} onMissions={t => headBtn('zadania', () => open({ kind: 'missions', tab: t }))()} />
        <Arena game={game} onTab={t => goTab(t, true)} onInfo={land => open({ kind: 'landinfo', land })} onAd={what => open({ kind: 'adOffer', what })} onPass={() => open({ kind: 'shop', tab: 'przepustka' })} />
        <main class="panel" ref={panelRef}>
          {nav === 'przygoda' && (
            <div class="seg seg2 adv-seg" role="tablist" aria-label="Przygoda">
              {ADVENTURE.map(t => {
                const f = TAB_FEATURE[t]!;
                const locked = !game.unlocked(f);
                return (
                  <button key={t} role="tab" data-tab={t} aria-selected={tab === t} class={`${tab === t ? 'on' : ''}${locked ? ' locked' : ''}`} onClick={() => goTab(t)}>
                    {locked && <LockIcon />}{VIEW_NAME[t]}
                    {t === 'lochy' && tab !== 'lochy' && game.eventTodo() > 0 && <i class="seg-badge">!</i>}
                    {tab !== t && s.unlNew.includes(f) && <i class="tab-dot new" aria-label="nowe" />}
                  </button>
                );
              })}
            </div>
          )}
          {nav === 'menu' && (
            <div class="view-head">
              <button class="modal-back" onClick={() => open({ kind: 'menu' })} aria-label="Wróć do Menu"><span aria-hidden="true">‹</span> Menu</button>
              <span class="vh-t">{VIEW_NAME[tab]}</span>
            </div>
          )}
          {tab === 'kuznia' && <ForgePanel game={game} onInfo={k => open({ kind: 'info', k })} onFound={() => open({ kind: 'found' })} onMix={what => open({ kind: 'mix', what })} onDecide={() => open({ kind: 'decide' })} onPick={() => open({ kind: 'ores' })} />}
          {tab === 'bohater' && <HeroPanel game={game} onItem={item => open({ kind: 'item', item })} />}
          {tab === 'nauka' && <ResearchPanel game={game} />}
          {tab === 'krainy' && <LandsPanel game={game} onInfo={land => open({ kind: 'landinfo', land })} />}
          {tab === 'klan' && <ClanPanel game={game} online={save.mode === 'server'} openChat={() => open({ kind: 'chat', ch: 'clan' })} />}
          {tab === 'lochy' && <DungeonPanel game={game} online={save.mode === 'server'} onArena={() => open({ kind: 'arena' })} onInfo={id => open({ kind: 'dunginfo', id })} onEvent={() => open({ kind: 'event' })} />}
          {tab === 'kodeks' && <CodexPanel game={game} save={save} onReset={() => open({ kind: 'reset' })} onRanking={() => open({ kind: 'ranking' })} onFeedback={() => open({ kind: 'feedback' })} />}
        </main>
      </div>
      <PowerSave awake={s.opts.awake !== false} dim={s.opts.dim !== false} />
      <div class="tabs" ref={bottomRef}>
        <div class={`tabs-wrap${elTab ? ' el-tab' : ''}`}>
          <ChatPop game={game} onOpen={ch => { game.seenFeatures(['czat']); open({ kind: 'chat', ch }); }} />
          {tab === 'kuznia' && <ForgeDock game={game} onElem={() => open({ kind: 'mix', what: 'el' })} onPick={() => open({ kind: 'ores' })} onDecide={() => open({ kind: 'decide' })} onAuto={() => open({ kind: 'auto' })} />}
          <nav class="tabs-in" aria-label="Zakładki">
            {NAVS.map(([id, n]) => {
              const locked = id === 'bohater' ? !game.unlocked('bohater') : id === 'przygoda' ? !game.unlocked('krainy') && !game.unlocked('lochy') : false;
              const on = id === 'menu' ? nav === 'menu' || modal?.kind === 'menu' : nav === id;
              const fresh = nav !== id && (
                id === 'menu' ? mt.fresh
                  : id === 'przygoda' ? isNew(F => F.at.tab === 'krainy' || F.at.tab === 'lochy' || F.at.inTab === 'lochy')
                    : isNew(F => F.at.tab === id || F.at.inTab === id));
              return (
                <button key={id} data-tab={id} class={`tab tab-${id}${on ? ' on' : ''}${locked ? ' locked' : ''}`} aria-current={on && id !== 'menu' ? 'page' : undefined}
                  aria-haspopup={id === 'menu' ? 'dialog' : undefined} aria-label={locked ? `${n}: zablokowane` : undefined} onClick={() => goNav(id)}>
                  <span class="tab-ic">{locked ? <LockIcon /> : <TabIcon tab={id} />}</span><span>{n}</span>
                  {fresh && <i class="tab-dot new" aria-label="nowe" />}
                  {id === 'przygoda' && tab !== 'lochy' && !fresh && game.eventTodo() > 0 && <i class="tab-dot" aria-label="nagrody wydarzenia do odebrania" />}
                  {id === 'menu' && !fresh && (mt.n > 0 ? <i class="tab-num">{mt.n > 99 ? '99+' : mt.n}</i> : mt.dot && <i class="tab-dot" aria-label="w menu coś czeka" />)}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      {modal && (
        <ModalShell locked={LOCKED.has(modal.kind)} onClose={close} cls={modal.kind === 'menu' || modal.kind === 'auto' ? 'sheet' : modal.kind === 'ores' ? 'sheet ores-sheet' : ''}>
          <ModalView m={modal} game={game} close={close} goTab={t => goTab(t)} onFeature={id => setFeat(id)} />
        </ModalShell>
      )}
      {profile !== undefined && (
        <ModalShell locked={false} onClose={() => setProfile(undefined)}>
          <ProfileView game={game} id={profile} close={() => setProfile(undefined)} />
        </ModalShell>
      )}
      {coachOn && mark && <Coach key={mark.key} mark={mark} onHide={hideCoach} onTap={tapCoach} />}
      <Toasts game={game} />
    </>
  );
}
