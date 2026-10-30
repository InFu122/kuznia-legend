import { companionUrl, resUrl, skillUrl } from '../../art/render';
import { InfoBtn } from './Forge';
import { Px } from '../Px';
import {
  COMPANION_MAX, DRAW_ODDS, HATCH_MS, MOUNTS, MOUNTS_UNLOCK_LAND, MOUNT_IDS, PETS, PETS_UNLOCK_LAND, PET_IDS, RAR,
  SKILLS, SKILL_IDS, SKILL_MAX, STARS_MAX, companionMult, petAtkPct, petTraitValue, skillValue,
} from '../../data';
import { mountsUnlocked, petsUnlocked, skillNeed, skillsUnlocked, upgradeCost } from '../../engine/companions';
import type { Game } from '../../engine/game';
import { mountBonus, petTrait } from '../../engine/mods';
import type { MountId, PetId, SkillId } from '../../engine/types';
import { f1, fmt, pct, tfmt } from '../format';

const Stars = ({ n }: { n: number }) => (n > 0 ? <span class="stars" title={`Gwiazdki: ${n}/${STARS_MAX}`}>{'★'.repeat(n)}</span> : null);
const Odds = () => <p class="sub">Szanse: {DRAW_ODDS.map((p, r) => <span key={r}>{r > 0 && ' · '}<span class={`rt${r}`}>{RAR[r].n} {p}%</span></span>)}</p>;
const skillText = (id: SkillId, lvl: number) => SKILLS[id].d.replace('{v}', f1(skillValue(id, lvl)));

/* ---------- umiejętności ---------- */

/** „Załóż najlepsze” — wybiera to, co daje najwięcej Mocy. */
const BestBtn = ({ onClick }: { onClick: () => void }) => <button class="btn small primary best-btn" onClick={onClick}>Załóż najlepsze</button>;

export function SkillsView({ game }: { game: Game }) {
  const s = game.s;
  if (!skillsUnlocked(s)) {
    return <section class="card"><div class="eyebrow">Umiejętności</div><p class="sub">Odblokujesz je na 5. etapie pierwszej krainy. Dostaniesz wtedy pierwsze Zwoje zaklęć.</p></section>;
  }
  const owned = SKILL_IDS.filter(id => s.skills.lv[id]);
  const full = !s.skills.eq.includes(null);
  return (
    <>
      <section class="card">
        <div class="row">
          <div><div class="eyebrow">Umiejętności</div><div class="h">Zwoje zaklęć: {fmt(s.scrolls)}</div></div>
          <button class="btn primary small btn-scroll" disabled={s.scrolls < 1} onClick={() => game.openScroll()}>Otwórz Zwój</button>
        </div>
        <p class="sub">Trzy umiejętności rzucają się same, gdy są gotowe. Kopie tej samej umiejętności podnoszą jej poziom.</p>
        <Odds />
        <div class="skslots">
          {s.skills.eq.map((id, i) => (
            <button key={i} class={`skslot${id ? ` r${SKILLS[id].r}` : ' empty'}`} disabled={!id} onClick={() => game.equipSkill(null, i)} aria-label={id ? `Zdejmij: ${SKILLS[id].n}` : 'Pusty slot'}>
              {id ? <><Px src={skillUrl(id)} size={48} /><b>{SKILLS[id].n}</b><small>poz. {s.skills.lv[id]} · zdejmij</small></> : <small>pusty slot</small>}
            </button>
          ))}
        </div>
      </section>
      {owned.length > 0 && (
        <section class="card">
          <div class="row"><div class="eyebrow">Twoje umiejętności</div><BestBtn onClick={() => game.equipBest('skills')} /></div>
          <ul class="clist">
            {owned.map(id => {
              const S = SKILLS[id];
              const lvl = s.skills.lv[id] ?? 1;
              const on = s.skills.eq.includes(id);
              return (
                <li key={id}>
                  <Px src={skillUrl(id)} size={48} cls="row-ic" />
                  <div class="cmain">
                    <div class="cname"><span class={`rt${S.r}`}>{S.n}</span> <span class="muted">· poz. {lvl}/{SKILL_MAX}</span></div>
                    <div class="sub">{skillText(id, lvl)} · co {f1(S.cd / 1000)} s</div>
                    {lvl < SKILL_MAX && <div class="tech-cost">Kopie do następnego poziomu: {s.skills.cards[id] ?? 0}/{skillNeed(lvl)}</div>}
                  </div>
                  {on ? <span class="tech-busy">Założona</span>
                    : <button class="btn small" disabled={full} onClick={() => game.equipSkill(id, s.skills.eq.indexOf(null))}>{full ? 'Sloty pełne' : 'Załóż'}</button>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

/* ---------- chowańce ---------- */

/** Portret towarzysza 32×32 (odwrócony w stronę bohatera) w ramce w kolorze rzadkości. */
export function CompPortrait({ id, r, size = 40, locked = false }: { id: string; r: number; size?: number; locked?: boolean }) {
  return (
    <span class={`cport r${r}${locked ? ' locked' : ''}`} style={{ '--ps': size + 'px' } as Record<string, string>}>
      <Px src={companionUrl(id)} size={size} cls="flip" />
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
        <div class="row"><div><div class="eyebrow">Chowańce</div><div class="h">Wkrótce</div></div><InfoBtn onClick={info} label="Jak działają chowańce" /></div>
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
        <div class="row">
          <div><div class="eyebrow">Chowańce</div><div class="h">Inkubator</div></div>
          <div class="row" style={{ gap: '8px' }}><StoneChip n={s.stones} /><InfoBtn onClick={info} label="Jak działają chowańce" /></div>
        </div>
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
          <CompPortrait id={sel} r={PETS[sel].r} size={64} />
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
          <div class="row"><div class="eyebrow">Twoje chowańce</div><BestBtn onClick={() => game.equipBest('pet')} /></div>
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
        {c.lvl < COMPANION_MAX && <button class="btn small primary" disabled={s.stones < cost} onClick={() => game.levelUp('pet', id)}>Ulepsz</button>}
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
        <div class="row"><div><div class="eyebrow">Wierzchowce</div><div class="h">Wkrótce</div></div><InfoBtn onClick={info} label="Jak działają wierzchowce" /></div>
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
        <div class="row">
          <div><div class="eyebrow">Wierzchowce</div><div class="h">Stajnia</div></div>
          <div class="row" style={{ gap: '8px' }}><StoneChip n={s.stones} /><InfoBtn onClick={info} label="Jak działają wierzchowce" /></div>
        </div>
        <div class="saddle">
          <Px src={resUrl('siodlo')} size={40} />
          <div class="cmain"><b>Siodła: {fmt(s.saddles)}</b><small class="muted">Siodło losuje wierzchowca. Kopie dają gwiazdki.</small></div>
          <button class="btn primary small" disabled={s.saddles < 1} onClick={() => game.openSaddle()}>Otwórz Siodło</button>
        </div>
        <Odds />
      </section>
      {sel && (
        <section class={`card compshow r${MOUNTS[sel].r}`}>
          <CompPortrait id={sel} r={MOUNTS[sel].r} size={64} />
          <div class="cmain">
            <div class="eyebrow">Dosiadasz</div>
            <div class="h"><span class={`rt${MOUNTS[sel].r}`}>{MOUNTS[sel].n}</span> <Stars n={s.mounts[sel]!.stars} /></div>
            <div class="sub">Poziom {s.mounts[sel]!.lvl} · <b>+{f1(mb.dmg)}%</b> obrażeń · <b>+{f1(mb.hp)}%</b> zdrowia</div>
          </div>
        </section>
      )}
      {owned.length > 0 && (
        <section class="card">
          <div class="row"><div class="eyebrow">Twoje wierzchowce</div><BestBtn onClick={() => game.equipBest('mount')} /></div>
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
        {c.lvl < COMPANION_MAX && <button class="btn small primary" disabled={s.stones < cost} onClick={() => game.levelUp('mount', id)}>Ulepsz</button>}
      </div>
    </li>
  );
}
