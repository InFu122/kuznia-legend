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
          <button class="btn primary small" disabled={s.scrolls < 1} onClick={() => game.openScroll()}>Otwórz Zwój</button>
        </div>
        <p class="sub">Trzy umiejętności rzucają się same, gdy są gotowe. Kopie tej samej umiejętności podnoszą jej poziom.</p>
        <Odds />
        <div class="skslots">
          {s.skills.eq.map((id, i) => (
            <button key={i} class={`skslot${id ? ` r${SKILLS[id].r}` : ' empty'}`} disabled={!id} onClick={() => game.equipSkill(null, i)} aria-label={id ? `Zdejmij: ${SKILLS[id].n}` : 'Pusty slot'}>
              {id ? <><b>{SKILLS[id].n}</b><small>poz. {s.skills.lv[id]} · zdejmij</small></> : <small>pusty slot</small>}
            </button>
          ))}
        </div>
      </section>
      {owned.length > 0 && (
        <section class="card">
          <div class="eyebrow">Twoje umiejętności</div>
          <ul class="clist">
            {owned.map(id => {
              const S = SKILLS[id];
              const lvl = s.skills.lv[id] ?? 1;
              const on = s.skills.eq.includes(id);
              return (
                <li key={id}>
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

export function PetsView({ game }: { game: Game }) {
  const s = game.s;
  if (!petsUnlocked(s)) {
    return <section class="card"><div class="eyebrow">Chowańce</div><p class="sub">Odblokujesz je w akcie II (kraina {PETS_UNLOCK_LAND + 1}). Pierwsze jajo da boss ostatniej krainy aktu I.</p></section>;
  }
  const h = s.hatch;
  const owned = PET_IDS.filter(id => s.pets[id]);
  const t = petTrait(s);
  return (
    <>
      <section class="card">
        <div class="row">
          <div><div class="eyebrow">Chowańce</div><div class="h">Inkubator</div></div>
          <span class="keys">Kamienie: {fmt(s.stones)}</span>
        </div>
        {h ? (
          <>
            <p class="sub">Wykluwa się jajo <span class={`rt${h.r}`}>{RAR[h.r].n}</span> · zostało {tfmt(h.left)}</p>
            <div class="bar" style={{ marginTop: '6px' }}><i style={{ width: Math.max(0, (1 - h.left / h.total) * 100) + '%' }} /></div>
          </>
        ) : <p class="sub">Inkubator jest pusty. Jaja dają bossowie, Leża Bossów i Labirynt; wykluwają się także, gdy nie grasz.</p>}
        <div class="mix">
          {s.eggs.map((n, r) => n > 0 && (
            <button key={r} class="chip" disabled={!!h} onClick={() => game.startHatch(r)}>
              Wykluj: <span class={`rt${r}`}>{RAR[r].n}</span> · {n} ({tfmt(HATCH_MS[r])})
            </button>
          ))}
          {s.eggs.every(n => n === 0) && <span class="sub">Nie masz jaj.</span>}
        </div>
        {t && s.petSel && <p class="sub">Walczy: <b>{PETS[s.petSel].n}</b> · cecha: {PETS[s.petSel].d.replace('{v}', f1(t.v))}</p>}
      </section>
      {owned.length > 0 && (
        <section class="card">
          <div class="eyebrow">Twoje chowańce</div>
          <ul class="clist">
            {owned.map(id => <PetRow key={id} game={game} id={id} />)}
          </ul>
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
  const cost = upgradeCost('pet', id, c.lvl);
  const tv = petTraitValue(id, c.lvl, c.stars);
  return (
    <li>
      <div class="cmain">
        <div class="cname"><span class={`rt${P.r}`}>{P.n}</span> <span class="muted">· poz. {c.lvl}</span> <Stars n={c.stars} /></div>
        <div class="sub">Atak: {pct(petAtkPct(id, c.lvl, c.stars))} obrażeń bohatera co {f1(P.int / 1000)} s · {P.d.replace('{v}', f1(tv))}</div>
        {c.lvl < COMPANION_MAX && <div class="tech-cost">Ulepszenie: {fmt(cost)} Kamieni</div>}
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
  if (!mountsUnlocked(s)) {
    return <section class="card"><div class="eyebrow">Wierzchowce</div><p class="sub">Odblokujesz je w akcie III (kraina {MOUNTS_UNLOCK_LAND + 1}). Siodła dają bossowie aktu III i IV, Kopalnia Kryształów i Leża Bossów.</p></section>;
  }
  const owned = MOUNT_IDS.filter(id => s.mounts[id]);
  const mb = mountBonus(s);
  return (
    <>
      <section class="card">
        <div class="row">
          <div><div class="eyebrow">Wierzchowce</div><div class="h">Siodła: {fmt(s.saddles)}</div></div>
          <button class="btn primary small" disabled={s.saddles < 1} onClick={() => game.openSaddle()}>Otwórz Siodło</button>
        </div>
        <p class="sub">Wierzchowiec daje stałą premię do obrażeń i zdrowia. Kopie dają gwiazdki (+15% każda), Kamienie — poziomy.</p>
        <Odds />
        {s.mountSel && <p class="sub">Dosiadasz: <b>{MOUNTS[s.mountSel].n}</b> · +{f1(mb.dmg)}% obrażeń, +{f1(mb.hp)}% zdrowia · Kamienie: {fmt(s.stones)}</p>}
      </section>
      {owned.length > 0 && (
        <section class="card">
          <div class="eyebrow">Stajnia</div>
          <ul class="clist">{owned.map(id => <MountRow key={id} game={game} id={id} />)}</ul>
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
  const cost = upgradeCost('mount', id, c.lvl);
  return (
    <li>
      <div class="cmain">
        <div class="cname"><span class={`rt${M.r}`}>{M.n}</span> <span class="muted">· poz. {c.lvl}</span> <Stars n={c.stars} /></div>
        <div class="sub">+{f1(M.dmg * k)}% obrażeń · +{f1(M.hp * k)}% zdrowia</div>
        {c.lvl < COMPANION_MAX && <div class="tech-cost">Ulepszenie: {fmt(cost)} Kamieni</div>}
      </div>
      <div class="cbtns">
        {s.mountSel === id ? <span class="tech-busy">Dosiadasz</span> : <button class="btn small" onClick={() => game.selectMount(id)}>Dosiądź</button>}
        {c.lvl < COMPANION_MAX && <button class="btn small primary" disabled={s.stones < cost} onClick={() => game.levelUp('mount', id)}>Ulepsz</button>}
      </div>
    </li>
  );
}
