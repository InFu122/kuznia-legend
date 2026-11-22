import { companionUrl, dungeonBgUrl, landBgUrl, resUrl, skillUrl } from '../../art/render';
import { Banner, IconEyebrow } from '../Banner';
import { InfoBtn } from './Forge';
import { Px } from '../Px';
import {
  COMPANION_MAX, DRAW_ODDS, HATCH_MS, MOUNTS, MOUNTS_UNLOCK_LAND, MOUNT_IDS, PETS, PETS_UNLOCK_LAND, PET_IDS, RAR,
  SKILLS, SKILL_IDS, SKILL_MAX, STARS_MAX, companionMult, petAtkPct, petTraitValue,
} from '../../data';
import { mountsUnlocked, petsUnlocked, skillNeed, skillsUnlocked, upgradeCost } from '../../engine/companions';
import type { Game } from '../../engine/game';
import { mountBonus, petTrait } from '../../engine/mods';
import type { MountId, PetId } from '../../engine/types';
import { useState } from 'preact/hooks';
import { f1, fmt, pct, tfmt } from '../format';
import { buzz } from '../haptics';
import { play } from '../sound';
import { skillFx } from '../skillText';

/** Gwiazdki zawsze widoczne: zdobyte złote, brakujące przygaszone (od razu widać, ile kopii jeszcze się przyda). */
const Stars = ({ n }: { n: number }) => (
  <span class="stars" title={`Gwiazdki: ${n}/${STARS_MAX}`} aria-label={`Gwiazdki: ${n} z ${STARS_MAX}`}>
    {Array.from({ length: STARS_MAX }, (_, i) => <i key={i} class={i < n ? 'on' : ''} aria-hidden="true">★</i>)}
  </span>
);
const Odds = () => <p class="sub">Szanse: {DRAW_ODDS.map((p, r) => <span key={r}>{r > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n} {p}%</span></span>)}</p>;

/* ---------- umiejętności ---------- */

/** „Załóż najlepsze” — wybiera to, co daje najwięcej Mocy. */
const BestBtn = ({ onClick }: { onClick: () => void }) => <button class="btn small primary best-btn" onClick={onClick}>Załóż najlepsze</button>;

/** Zwój zaklęć do otwarcia (animacja i wygląd bez zmian). */
function ScrollBox({ game }: { game: Game }) {
  const n = game.s.scrolls;
  return (
    <div class={`scrollbox${n > 0 ? ' has' : ''}`}>
      <span class="sb-ic"><Px src={resUrl('zwoj')} size={44} /><b class="sb-n">{fmt(n)}</b></span>
      <div class="cmain">
        <b>{n > 0 ? `Zwoje zaklęć: ${fmt(n)}` : 'Brak zwojów'}</b>
        <small class="muted">{n > 0 ? 'Nowa umiejętność albo kopia, która podnosi jej poziom.' : 'Zwoje dają bossowie krain i lochy, osiągnięcia, wydarzenia, Przepustka i sklep.'}</small>
      </div>
      <button class="btn primary btn-scroll" disabled={n < 1} onClick={() => game.openScroll()}><Px src={resUrl('zwoj')} size={18} />Otwórz</button>
    </div>
  );
}

/** Umiejętności: zwój do otwarcia, założone sloty jak karty ekwipunku, pozostałe umiejętności w krótkich wierszach. */
function SkillsBook({ game }: { game: Game }) {
  const s = game.s;
  const [open, setOpen] = useState<string | null>(null);
  const owned = SKILL_IDS.filter(id => s.skills.lv[id]);
  const rest = owned.filter(id => !s.skills.eq.includes(id));
  const full = !s.skills.eq.includes(null);
  return (
    <>
      <section class="card">
        <Banner bg={dungeonBgUrl('wieza')} icon={<Px src={resUrl('zwoj')} size={32} />} eyebrow="Umiejętności" title="Księga zaklęć" />
        <ScrollBox game={game} />
        <details class="odds-mini">
          <summary>Szanse ze zwoju</summary>
          <Odds />
        </details>
      </section>
      <section class="card">
        <div class="row"><IconEyebrow icon={<Px src={resUrl('zwoj')} size={16} />}>Założone · rzucają się same</IconEyebrow>{owned.length > 0 && <BestBtn onClick={() => game.equipBest('skills')} />}</div>
        <div class="skeq">
          {s.skills.eq.map((id, i) => {
            if (!id) return (
              <div key={i} class="eqc empty skc">
                <span class="eqc-ic"><Px src={resUrl('zwoj')} size={26} cls="ghost" /></span>
                <span class="eqc-t"><small>Slot {i + 1}</small><b>pusty slot</b><span>wybierz umiejętność z listy niżej</span></span>
              </div>
            );
            const S = SKILLS[id];
            const lvl = s.skills.lv[id] ?? 1;
            const fx = skillFx(id, lvl);
            const have = s.skills.cards[id] ?? 0;
            return (
              <div key={i} class={`eqc skc r${S.r}`}>
                <span class="eqc-ic"><Px src={skillUrl(id)} size={36} /></span>
                <span class="eqc-t">
                  <small>Slot {i + 1} · <span class={`skc-k k-${fx.kind}`}>{fx.tag}</span></small>
                  <b class={`rt${S.r}`}>{S.n}</b>
                  <span class="eqc-st">{fx.main} {fx.label}</span>
                  <span>poz. {lvl}/{SKILL_MAX}{lvl < SKILL_MAX ? ` · kopie ${have}/${skillNeed(lvl)}` : ' · maks.'} · co {f1(S.cd / 1000)} s</span>
                </span>
                <button class="btn small skc-off" onClick={() => game.equipSkill(null, i)} aria-label={`Zdejmij: ${S.n}`}>Zdejmij</button>
              </div>
            );
          })}
        </div>
      </section>
      {rest.length > 0 && (
        <section class="card">
          <div class="row"><IconEyebrow icon={<Px src={resUrl('zwoj')} size={16} />}>Pozostałe umiejętności · {rest.length}</IconEyebrow><span class="num sub">masz {owned.length}/{SKILL_IDS.length}</span></div>
          <p class="sub sk-hint">{full ? 'Sloty pełne — zdejmij jedną wyżej, żeby założyć inną. ' : ''}Dotknij, żeby zobaczyć opis.</p>
          <ul class="skrows">
            {rest.map(id => {
              const S = SKILLS[id];
              const lvl = s.skills.lv[id] ?? 1;
              const on = s.skills.eq.includes(id);
              const fx = skillFx(id, lvl);
              const nx = lvl < SKILL_MAX ? skillFx(id, lvl + 1) : null;
              const have = s.skills.cards[id] ?? 0;
              const need = skillNeed(lvl);
              const isOpen = open === id;
              return (
                <li key={id} class={`skrow r${S.r}${on ? ' on' : ''}`}>
                  <button class="skr-main" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
                    <span class="skr-ic"><Px src={skillUrl(id)} size={36} /></span>
                    <span class="skr-t">
                      <span class="skr-top"><b class={`rt${S.r}`}>{S.n}</b><span class={`sk-tag k-${fx.kind}`}>{fx.tag}</span></span>
                      <span class="skr-fx"><b>{fx.main}</b> {fx.label} · co {f1(S.cd / 1000)} s</span>
                      <span class="skr-lv"><small>poz. {lvl}</small>{nx ? <><span class="bar"><i style={{ width: Math.min(100, (have / need) * 100) + '%' }} /></span><small>{have}/{need}</small></> : <small class="sk-max">maks.</small>}</span>
                    </span>
                  </button>
                  {on ? <span class="skr-on">Założona</span>
                    : !full && <button class="btn small skr-btn" onClick={() => game.equipSkill(id, s.skills.eq.indexOf(null))}>Załóż</button>}
                  {isOpen && (
                    <div class="skr-more">
                      {fx.text}
                      {nx && <> Następny poziom ({have}/{need} kopii): <b>{nx.main}</b>.</>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

export function SkillsView({ game }: { game: Game }) {
  const s = game.s;
  if (!skillsUnlocked(s)) {
    return (
      <section class="card">
        <Banner bg={dungeonBgUrl('wieza')} icon={<Px src={resUrl('zwoj')} size={32} />} eyebrow="Umiejętności" title="Wkrótce" />
        <p class="sub">Odblokujesz je na 5. etapie pierwszej krainy. Dostaniesz wtedy pierwsze Zwoje zaklęć.</p>
      </section>
    );
  }
  return <SkillsBook game={game} />;
}

/* ---------- chowańce ---------- */

/** Portret towarzysza 32×32 (odwrócony w stronę bohatera) w ramce w kolorze rzadkości. */
export function CompPortrait({ id, r, size = 48, locked = false }: { id: string; r: number; size?: number; locked?: boolean }) {
  return (
    <span class={`cport r${r}${locked ? ' locked' : ''}`} style={{ '--ps': size + 'px' } as Record<string, string>}>
      <Px src={companionUrl(id)} size={size} cls={size < 48 ? 'flip smooth' : 'flip'} />
    </span>
  );
}

const StoneChip = ({ n }: { n: number }) => <span class="reschip" title="Kamienie — ulepszają chowańce i wierzchowce"><Px src={resUrl('kamien')} size={16} /><b>{fmt(n)}</b> Kamieni</span>;

/** Kolekcja: wszystkie chowańce albo wierzchowce, nieposiadane jako cienie. */
function Collection({ ids, have, r, label }: { ids: string[]; have: (id: string) => boolean; r: (id: string) => number; label: string }) {
  const n = ids.filter(have).length;
  return (
    <div class="ccoll">
      <div class="row"><span class="eyebrow">{label}</span><span class="num">{n}/{ids.length}</span></div>
      <div class="ccoll-grid">
        {ids.map(id => <CompPortrait key={id} id={id} r={r(id)} size={28} locked={!have(id)} />)}
      </div>
    </div>
  );
}

export function PetsView({ game }: { game: Game }) {
  const s = game.s;
  const info = () => game.openModal({ kind: 'info', k: 'pets' });
  if (!petsUnlocked(s)) {
    return (
      <section class="card comphead">
        <Banner bg={dungeonBgUrl('leza')} icon={<Px src={resUrl('lapa')} size={32} />} eyebrow="Chowańce" cls="fb-i" title="Wkrótce"><InfoBtn corner onClick={info} label="Jak działają chowańce" /></Banner>
        <p class="sub">Odblokujesz je w akcie II (kraina {PETS_UNLOCK_LAND + 1}). Pierwsze jajo da boss ostatniej krainy aktu I.</p>
      </section>
    );
  }
  const h = s.hatch;
  const owned = PET_IDS.filter(id => s.pets[id]);
  const t = petTrait(s);
  const sel = s.petSel && s.pets[s.petSel] ? s.petSel : null;
  return (
    <>
      <section class="card comphead">
        <Banner bg={dungeonBgUrl('leza')} icon={<Px src={resUrl('jajo2')} size={32} />} eyebrow="Chowańce" cls="fb-i" title="Inkubator">
          <div class="fb-side"><InfoBtn corner onClick={info} label="Jak działają chowańce" /><StoneChip n={s.stones} /></div>
        </Banner>
        <div class={`incub${h ? ` on r${h.r}` : ''}`}>
          <div class="incub-nest" aria-hidden="true">
            {h ? <Px src={resUrl('jajo' + Math.min(4, h.r))} size={56} cls="incub-egg" /> : <span class="incub-empty" />}
          </div>
          <div class="cmain">
            {h ? (
              <>
                <b>Wykluwa się jajo <span class={`rt${h.r}`}>{RAR[h.r].n}</span></b>
                <div class="bar" style={{ marginTop: '6px' }}><i style={{ width: Math.max(0, (1 - h.left / h.total) * 100) + '%' }} /></div>
                <small class="muted">zostało {tfmt(h.left)} — wykluwa się także, gdy nie grasz</small>
              </>
            ) : (
              <>
                <b>Inkubator jest pusty</b>
                <small class="muted">Wybierz jajo poniżej. Jaja dają bossowie, Leża Bossów i Labirynt.</small>
              </>
            )}
          </div>
        </div>
        <ul class="eggs">
          {s.eggs.map((n, r) => (
            <li key={r} class={`rt-b${r}${n > 0 ? '' : ' none'}`}>
              <Px src={resUrl('jajo' + r)} size={32} />
              <span class={`rt${r}`}>{RAR[r].n}</span>
              <small>×{n} · {tfmt(HATCH_MS[r])}</small>
              <button class="btn small" disabled={!!h || n < 1} onClick={() => game.startHatch(r)}>Wykluj</button>
            </li>
          ))}
        </ul>
      </section>
      {sel && t && (
        <section class={`card compshow r${PETS[sel].r}`}>
          <CompPortrait id={sel} r={PETS[sel].r} size={72} />
          <div class="cmain">
            <div class="eyebrow">Walczy u twojego boku</div>
            <div class="h"><span class={`rt${PETS[sel].r}`}>{PETS[sel].n}</span> <Stars n={s.pets[sel]!.stars} /></div>
            <div class="sub">Poziom {s.pets[sel]!.lvl} · atak {pct(petAtkPct(sel, s.pets[sel]!.lvl, s.pets[sel]!.stars))} obrażeń bohatera co {f1(PETS[sel].int / 1000)} s</div>
            <div class="sub">Cecha: {PETS[sel].d.replace('{v}', f1(t.v))}</div>
          </div>
        </section>
      )}
      {owned.length > 0 && (
        <section class="card">
          <div class="row"><IconEyebrow icon={<Px src={resUrl('lapa')} size={16} />}>Twoje chowańce</IconEyebrow><BestBtn onClick={() => game.equipBest('pet')} /></div>
          <ul class="clist">
            {owned.map(id => <PetRow key={id} game={game} id={id} />)}
          </ul>
          <Collection ids={PET_IDS} have={id => !!s.pets[id as PetId]} r={id => PETS[id as PetId].r} label="Kolekcja chowańców" />
        </section>
      )}
    </>
  );
}

function PetRow({ game, id }: { game: Game; id: PetId }) {
  const s = game.s;
  const P = PETS[id];
  const c = s.pets[id]!;
  const on = s.petSel === id;
  const cost = upgradeCost('pet', id, c.lvl, game.s);
  const tv = petTraitValue(id, c.lvl, c.stars);
  return (
    <li class={on ? 'on' : ''}>
      <CompPortrait id={id} r={P.r} />
      <div class="cmain">
        <div class="cname"><span class={`rt${P.r}`}>{P.n}</span> <span class="muted">· poz. {c.lvl}</span> <Stars n={c.stars} /></div>
        <div class="sub">Atak {pct(petAtkPct(id, c.lvl, c.stars))} co {f1(P.int / 1000)} s · {P.d.replace('{v}', f1(tv))}</div>
        {c.lvl < COMPANION_MAX && <div class="tech-cost"><Px src={resUrl('kamien')} size={14} /> {fmt(cost)} Kamieni na poziom {c.lvl + 1}</div>}
      </div>
      <div class="cbtns">
        {on ? <span class="tech-busy">Walczy</span> : <button class="btn small" onClick={() => game.selectPet(id)}>Wybierz</button>}
        {c.lvl < COMPANION_MAX && <button class="btn small primary" onClick={() => game.openModal({ kind: 'compUp', what: 'pet', id })}>Ulepsz</button>}
      </div>
    </li>
  );
}

/* ---------- wierzchowce ---------- */

export function MountsView({ game }: { game: Game }) {
  const s = game.s;
  const info = () => game.openModal({ kind: 'info', k: 'mounts' });
  if (!mountsUnlocked(s)) {
    return (
      <section class="card comphead">
        <Banner bg={landBgUrl(0)} icon={<Px src={resUrl('siodlo')} size={32} />} eyebrow="Wierzchowce" cls="fb-i" title="Wkrótce"><InfoBtn corner onClick={info} label="Jak działają wierzchowce" /></Banner>
        <p class="sub">Odblokujesz je w akcie III (kraina {MOUNTS_UNLOCK_LAND + 1}). Siodła dają bossowie aktu III i IV, Kopalnia Kryształów i Leża Bossów.</p>
      </section>
    );
  }
  const owned = MOUNT_IDS.filter(id => s.mounts[id]);
  const mb = mountBonus(s);
  const sel = s.mountSel && s.mounts[s.mountSel] ? s.mountSel : null;
  return (
    <>
      <section class="card comphead stable">
        <Banner bg={landBgUrl(0)} icon={<Px src={resUrl('siodlo')} size={32} />} eyebrow="Wierzchowce" cls="fb-i" title="Stajnia">
          <div class="fb-side"><InfoBtn corner onClick={info} label="Jak działają wierzchowce" /><StoneChip n={s.stones} /></div>
        </Banner>
        <div class="saddle">
          <Px src={resUrl('siodlo')} size={40} />
          <div class="cmain"><b>Siodła: {fmt(s.saddles)}</b><small class="muted">Siodło losuje wierzchowca. Kopie dają gwiazdki.</small></div>
          <button class="btn primary small" disabled={s.saddles < 1} onClick={() => game.openSaddle()}>Otwórz Siodło</button>
        </div>
        <Odds />
      </section>
      {sel && (
        <section class={`card compshow r${MOUNTS[sel].r}`}>
          <CompPortrait id={sel} r={MOUNTS[sel].r} size={72} />
          <div class="cmain">
            <div class="eyebrow">Dosiadasz</div>
            <div class="h"><span class={`rt${MOUNTS[sel].r}`}>{MOUNTS[sel].n}</span> <Stars n={s.mounts[sel]!.stars} /></div>
            <div class="sub">Poziom {s.mounts[sel]!.lvl} · <b>+{f1(mb.dmg)}%</b> obrażeń · <b>+{f1(mb.hp)}%</b> zdrowia</div>
          </div>
        </section>
      )}
      {owned.length > 0 && (
        <section class="card">
          <div class="row"><IconEyebrow icon={<Px src={resUrl('siodlo')} size={16} />}>Twoje wierzchowce</IconEyebrow><BestBtn onClick={() => game.equipBest('mount')} /></div>
          <ul class="clist">{owned.map(id => <MountRow key={id} game={game} id={id} />)}</ul>
          <Collection ids={MOUNT_IDS} have={id => !!s.mounts[id as MountId]} r={id => MOUNTS[id as MountId].r} label="Kolekcja wierzchowców" />
        </section>
      )}
    </>
  );
}

function MountRow({ game, id }: { game: Game; id: MountId }) {
  const s = game.s;
  const M = MOUNTS[id];
  const c = s.mounts[id]!;
  const k = companionMult(c.lvl, c.stars);
  const cost = upgradeCost('mount', id, c.lvl, game.s);
  const on = s.mountSel === id;
  return (
    <li class={on ? 'on' : ''}>
      <CompPortrait id={id} r={M.r} />
      <div class="cmain">
        <div class="cname"><span class={`rt${M.r}`}>{M.n}</span> <span class="muted">· poz. {c.lvl}</span> <Stars n={c.stars} /></div>
        <div class="sub">+{f1(M.dmg * k)}% obrażeń · +{f1(M.hp * k)}% zdrowia</div>
        {c.lvl < COMPANION_MAX && <div class="tech-cost"><Px src={resUrl('kamien')} size={14} /> {fmt(cost)} Kamieni na poziom {c.lvl + 1}</div>}
      </div>
      <div class="cbtns">
        {on ? <span class="tech-busy">Dosiadasz</span> : <button class="btn small" onClick={() => game.selectMount(id)}>Dosiądź</button>}
        {c.lvl < COMPANION_MAX && <button class="btn small primary" onClick={() => game.openModal({ kind: 'compUp', what: 'mount', id })}>Ulepsz</button>}
      </div>
    </li>
  );
}

/**
 * Ulepszenie chowańca albo wierzchowca: co się zmieni (przed → po), ile Mocy doda, koszt w Kamieniach — i dopiero
 * wtedy „Ulepsz”. Okno zostaje otwarte: po ulepszeniu poziom podskakuje i można ulepszać dalej.
 */
export function CompUpgrade({ game, what, id, close }: { game: Game; what: 'pet' | 'mount'; id: string; close: () => void }) {
  const s = game.s;
  const [pop, setPop] = useState(0);
  const pet = what === 'pet';
  const def = pet ? PETS[id as PetId] : MOUNTS[id as MountId];
  const c = pet ? s.pets[id as PetId] : s.mounts[id as MountId];
  if (!c) return null;
  const max = c.lvl >= COMPANION_MAX;
  const cost = upgradeCost(what, id as PetId | MountId, c.lvl, s);
  const L = c.lvl, N = Math.min(COMPANION_MAX, c.lvl + 1);
  const rows: [string, string, string][] = [];
  let trait = '';
  if (pet) {
    const P = PETS[id as PetId];
    rows.push(['Atak', pct(petAtkPct(id as PetId, L, c.stars)), pct(petAtkPct(id as PetId, N, c.stars))]);
    // Cecha z jednostką z opisu („+{v}% zdrowia” → „+13,8%”), pełne zdanie pod spodem.
    const pre = P.d.startsWith('+') ? '+' : '', unit = P.d.includes('{v}%') ? '%' : '';
    rows.push(['Cecha', pre + f1(petTraitValue(id as PetId, L, c.stars)) + unit, pre + f1(petTraitValue(id as PetId, N, c.stars)) + unit]);
    trait = P.d.replace('{v}', f1(petTraitValue(id as PetId, N, c.stars)));
  } else {
    const M = MOUNTS[id as MountId];
    const k0 = companionMult(L, c.stars), k1 = companionMult(N, c.stars);
    rows.push(['Obrażenia', `+${f1(M.dmg * k0)}%`, `+${f1(M.dmg * k1)}%`]);
    rows.push(['Zdrowie', `+${f1(M.hp * k0)}%`, `+${f1(M.hp * k1)}%`]);
  }
  const active = pet ? s.petSel === id : s.mountSel === id;
  const pw = max ? null : game.levelPreview(what, id as PetId | MountId);
  const lack = s.stones < cost;
  const up = () => {
    if (!game.levelUp(what, id as PetId | MountId)) return;
    setPop(p => p + 1);
    play('levelup');
    void buzz(Math.max(2, def.r), s.opts.vibe !== false);
  };
  return (
    <div class={`cup r${def.r}`}>
      <div class="eyebrow">Ulepszenie · {pet ? 'chowaniec' : 'wierzchowiec'}</div>
      <div class="cup-head">
        <span class={`cup-port${pop ? ' fx' : ''}`} key={pop}><CompPortrait id={id} r={def.r} size={72} /></span>
        <div>
          <div class="h"><span class={`rt${def.r}`}>{def.n}</span> <Stars n={c.stars} /></div>
          <div class="cup-lvl">
            <b class={pop ? 'cup-pop' : ''} key={'l' + pop}>Poziom {L}</b>
            {!max && <><span class="cup-arr">→</span><b class="cup-next">{N}</b></>}
          </div>
        </div>
      </div>
      {max ? <p class="sub">Maksymalny poziom ({COMPANION_MAX}).</p> : (
        <>
          <ul class="cup-rows">
            {rows.map(([n, a, b]) => <li key={n}><span>{n}</span><span class="cup-a">{a}</span><span class="cup-arr">→</span><b class="cup-b">{b}</b></li>)}
          </ul>
          {trait && <p class="sub cup-trait">Po ulepszeniu: {trait}</p>}
          <p class="sub cup-pw">
            {pw && active && pw.next > pw.now ? <>Moc bohatera: <b>+{fmt(pw.next - pw.now)}</b></>
              : pet ? 'Moc wzrośnie, gdy ten chowaniec będzie walczył u twojego boku.' : 'Moc wzrośnie, gdy go dosiądziesz.'}
          </p>
          <div class={`cup-cost${lack ? ' lack' : ''}`}><Px src={resUrl('kamien')} size={18} /><b>{fmt(cost)}</b> Kamieni <small>(masz {fmt(s.stones)})</small></div>
        </>
      )}
      <div class="result-actions">
        <button class="btn" onClick={close}>{pop ? 'Gotowe' : 'Anuluj'}</button>
        {!max && <button class="btn primary cup-go" disabled={lack} onClick={up}>{lack ? 'Za mało Kamieni' : <><b>Ulepsz</b><small>do poziomu {N}</small></>}</button>}
      </div>
    </div>
  );
}
