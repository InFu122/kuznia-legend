// Okna „i” w stylu „Jak działa wytop”: trzy kroki, tabelka z liczbami gry i krótkie karty z zasadami.
// Runy slotów, chowańce i wierzchowce.
import type { ComponentChildren } from 'preact';
import {
  B, COMPANION_MAX, DIVINE_ORE, DRAW_ODDS, DUPE_STONES, FORGE_UNLOCKS, HATCH_MS, MOUNTS, MOUNT_IDS, ORES, ORE_ORDER, PETS, PET_IDS, RAR, SLOTS, SLOT_ORDER,
  STARS_MAX, STAR_BONUS, TECH,
} from '../../data';
import { itemUrl, oreUrl, resUrl, techUrl } from '../../art/render';
import { upgradeCost, upgradeTime } from '../../engine/forge';
import { JUMP_TO_MULT, jumpChances } from '../../engine/formulas';
import { techMods } from '../../engine/mods';
import type { Game } from '../../engine/game';
import { runeCost, runeLvl } from '../../engine/runes';
import { fmt, pct, tfmt } from '../format';

const f2 = (v: number) => String(v).replace('.', ',');
import { Px } from '../Px';
import { CompPortrait } from './Companions';

type Tip = [string, string, ComponentChildren];

function Sheet({ eyebrow, title, steps, children, tips, close }: {
  eyebrow: string; title: string; steps: [string, string, string][]; children?: ComponentChildren; tips: Tip[]; close: () => void;
}) {
  return (
    <>
      <div class="eyebrow">{eyebrow}</div>
      <div class="h">{title}</div>
      <div class="fi-steps">
        {steps.map(([ic, b, d]) => <div class="fi-step" key={b}><Px src={ic} size={32} /><b>{b}</b><small>{d}</small></div>)}
      </div>
      {children}
      <div class="fi-sec">Warto wiedzieć</div>
      <div class="fi-tips">
        {tips.map(([ic, h, d]) => <div class="fi-tip" key={h}><Px src={ic} size={24} /><div><b>{h}</b><p>{d}</p></div></div>)}
      </div>
      <button class="btn primary" onClick={close}>Rozumiem</button>
    </>
  );
}

/* ---------- runy ---------- */

export function RuneInfo({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const total = SLOT_ORDER.reduce((a, sl) => a + runeLvl(s, sl), 0);
  const tiers = Array.from({ length: B.RUNE_MAX / 5 }, (_, t) => {
    const lo = t * 5 + 1, hi = lo + 4;
    return { lo, hi, ore: runeCost(s, lo).ore, n0: runeCost(s, lo).n, n1: runeCost(s, hi).n };
  });
  const weapon = s.eq.bron;
  return (
    <Sheet
      eyebrow="Bohater · runy slotów" title="Jak działają runy" close={close}
      steps={[
        [weapon ? itemUrl(weapon.kind, weapon.ore, weapon.r) : itemUrl('Miecz', 1, 1), '1. Slot', 'runa siedzi w miejscu na ekwipunek, nie w przedmiocie'],
        [resUrl('runa'), '2. Poziom', `+${B.RUNE_PCT}% głównej statystyki przedmiotu za każdy poziom (do ${B.RUNE_MAX})`],
        [resUrl('pieczec'), '3. Na zawsze', 'zostaje w slocie, gdy zmieniasz przedmiot'],
      ]}
      tips={[
        [oreUrl(2), 'Brakuje rudy?', <>Gdy nie masz rudy z kosztu, płacisz tyle samo sztuk następnej lepszej rudy, której masz dość. Nadmiar słabszych rud zamienisz w Kuźni (Rafinacja).</>],
        [itemUrl('Miecz', 3, 3), 'Co najpierw', <>Broń, Pierścień i Amulet dają obrażenia, reszta zdrowie. Runa mnoży główną statystykę, więc najwięcej daje w slocie z najsilniejszym przedmiotem.</>],
        [resUrl('zloto'), 'Złoto', <>Każdy poziom kosztuje też złoto — tym więcej, im wyższy poziom runy i im dalej jesteś w kampanii.</>],
        [resUrl('kowadlo'), `Przekuwanie · od ${B.REFORGE_FORGE_LVL}. poziomu`, <>W oknie założonego przedmiotu losujesz od nowa jedną statystykę dodatkową (za rudę przedmiotu i złoto) i wybierasz, którą wersję zostawić.</>],
      ]}
    >
      <div class="fi-sec">Koszt kolejnych poziomów</div>
      <ul class="fi-odds">
        {tiers.map(t => (
          <li key={t.lo} class={total > 0 && SLOT_ORDER.some(sl => runeLvl(s, sl) + 1 >= t.lo && runeLvl(s, sl) + 1 <= t.hi) ? 'sel' : ''}>
            <Px src={oreUrl(t.ore)} size={28} />
            <div class="fi-o">
              <div class="fi-on"><b>Poziomy {t.lo}–{t.hi}</b><small>masz {fmt(s.ores[t.ore] ?? 0)}</small></div>
              <small class="muted">{t.n0}–{t.n1} × {ORES[t.ore].n} na poziom</small>
            </div>
          </li>
        ))}
      </ul>
      <p class="sub">Twoje runy: <b>{total}</b> z {B.RUNE_MAX * SLOT_ORDER.length} poziomów{total ? ` (${SLOT_ORDER.filter(sl => runeLvl(s, sl) > 0).map(sl => `${SLOTS[sl].n} +${runeLvl(s, sl) * B.RUNE_PCT}%`).join(', ')})` : ''}.</p>
    </Sheet>
  );
}

/* ---------- chowańce ---------- */

const starsText = `Kopia tego samego daje gwiazdkę: +${Math.round(STAR_BONUS * 100)}% siły (do ${STARS_MAX}). Kopia ponad komplet zamienia się w ${DUPE_STONES} Kamieni.`;

export function PetsInfo({ close }: { close: () => void }) {
  return (
    <Sheet
      eyebrow="Bohater · chowańce" title="Jak działają chowańce" close={close}
      steps={[
        [resUrl('jajo2'), '1. Jajo', 'z bossów od aktu II, Leży Bossów i Labiryntu'],
        [resUrl('czas'), '2. Inkubator', 'jedno jajo naraz; wykluwa się także, gdy nie grasz'],
        [resUrl('lapa'), '3. Chowaniec', 'atakuje razem z bohaterem i daje stałą cechę'],
      ]}
      tips={[
        [resUrl('kamien'), 'Poziomy', <>Kamienie podnoszą poziom (do {COMPANION_MAX}): +5% siły za poziom. Kamienie dają bossowie, lochy, sklep, klan i arena.</>],
        [resUrl('trofeum'), 'Gwiazdki', <>{starsText}</>],
        [resUrl('moc'), 'Walczy jeden', <>Wybierasz jednego chowańca. Jego atak to % obrażeń bohatera, a cecha działa cały czas — także za nieobecność.</>],
        [resUrl('pieczec'), 'Na zawsze', <>Chowańce zostają z tobą na całą grę — warto inwestować w ulubionego.</>],
      ]}
    >
      <div class="fi-sec">Czas wykluwania</div>
      <ul class="fi-odds">
        {HATCH_MS.map((ms, r) => (
          <li key={r}>
            <Px src={resUrl('jajo' + r)} size={28} />
            <div class="fi-o">
              <div class="fi-on"><b class={`rt${r}`}>Jajo: {RAR[r].n}</b><small>{tfmt(ms)}</small></div>
              <small class="muted">wykluwa chowańca co najmniej tej rzadkości</small>
            </div>
          </li>
        ))}
      </ul>
      <div class="fi-sec">Chowańce</div>
      <ul class="fi-comp">
        {PET_IDS.map(id => (
          <li key={id}>
            <CompPortrait id={id} r={PETS[id].r} size={32} />
            <div><b class={`rt${PETS[id].r}`}>{PETS[id].n}</b><small>{PETS[id].d.replace('{v}', String(PETS[id].tv))}</small></div>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ---------- wierzchowce ---------- */

export function MountsInfo({ close }: { close: () => void }) {
  return (
    <Sheet
      eyebrow="Bohater · wierzchowce" title="Jak działają wierzchowce" close={close}
      steps={[
        [resUrl('siodlo'), '1. Siodło', 'z bossów aktu III i IV, Kopalni Kryształów i Leży Bossów'],
        [resUrl('klejnot'), '2. Losowanie', `rzadkość: ${DRAW_ODDS.map((p, r) => `${RAR[r].n.toLowerCase()} ${p}%`).join(', ')}`],
        [resUrl('moc'), '3. Dosiadasz', 'stała premia do obrażeń i zdrowia bohatera'],
      ]}
      tips={[
        [resUrl('kamien'), 'Poziomy', <>Kamienie podnoszą poziom (do {COMPANION_MAX}): +5% premii wierzchowca za poziom.</>],
        [resUrl('trofeum'), 'Gwiazdki', <>{starsText}</>],
        [resUrl('lapa'), 'Razem z chowańcem', <>Wierzchowiec i chowaniec działają jednocześnie — to dwie osobne premie.</>],
        [resUrl('pieczec'), 'Na zawsze', <>Wierzchowce zostają z tobą na całą grę — warto inwestować w ulubionego.</>],
      ]}
    >
      <div class="fi-sec">Wierzchowce</div>
      <ul class="fi-comp">
        {MOUNT_IDS.map(id => (
          <li key={id}>
            <CompPortrait id={id} r={MOUNTS[id].r} size={32} />
            <div><b class={`rt${MOUNTS[id].r}`}>{MOUNTS[id].n}</b><small>bazowo +{MOUNTS[id].dmg}% obrażeń, +{MOUNTS[id].hp}% zdrowia</small></div>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ---------- poziom kuźni ---------- */

/** Łączny czas ulepszeń z poziomu `from` do `to` (z premiami gracza). */
const timeTo = (game: Game, from: number, to: number) => {
  let ms = 0;
  for (let n = from + 1; n <= to; n++) ms += upgradeTime(game.s, n);
  return ms;
};
/** Czas w dniach/godzinach, krótko (np. „ok. 3 dni”, „ok. 5 h”). */
const longT = (ms: number) => {
  const h = ms / 3600000;
  if (h < 1) return tfmt(ms);
  if (h < 48) return `ok. ${Math.round(h)} h`;
  const d = h / 24;
  if (d < 60) return `ok. ${Math.round(d)} dni`;
  return `ok. ${Math.round(d / 30)} mies.`;
};

export function ForgeLevelInfo({ game, close }: { game: Game; close: () => void }) {
  const s = game.s;
  const lvl = s.forge.lvl;
  const rel = techMods(s).jumpRel;
  const jp = (l: number) => { const [a, b] = jumpChances(l, rel); return a + b; };
  const miles = Object.keys(FORGE_UNLOCKS).map(Number).sort((a, b) => a - b);
  const next = miles.find(m => m > lvl);
  const oresAt = (l: number) => ORE_ORDER.filter(i => ORES[i].lvl === l);
  const nextOre = ORE_ORDER.find(i => ORES[i].lvl > lvl);
  const weapon = s.eq.bron;
  const soon = Array.from({ length: 5 }, (_, k) => lvl + 1 + k).filter(l => l <= B.FORGE_MAX);
  const miech = TECH.k_miech;
  return (
    <Sheet
      eyebrow={`Kuźnia · poziom ${lvl} z ${B.FORGE_MAX}`} title="Co daje poziom kuźni" close={close}
      steps={[
        [resUrl('kowadlo'), '1. Przeskok', `szansa na rzadkość wyżej: ${pct(jp(lvl))} teraz, ${pct(jp(B.FORGE_MAX))} na ${B.FORGE_MAX}. poziomie`],
        [oreUrl(nextOre ?? DIVINE_ORE), '2. Nowe rudy', nextOre !== undefined ? `następna: ${ORES[nextOre].n} od ${ORES[nextOre].lvl}. poziomu` : 'wszystkie rudy już otwarte'],
        [weapon ? itemUrl(weapon.kind, weapon.ore, weapon.r) : itemUrl('Miecz', 1, 1), '3. Moc przedmiotów', 'każdy poziom to +2 poziomy nowych przedmiotów'],
      ]}
      tips={[
        [resUrl('czas'), 'Ile to trwa', <>Pierwsze 20 poziomów mija w kilka dni, dalej każdy poziom to od półtora do prawie trzech dni — cała kuźnia to mniej więcej rok gry. Kuźnia działa normalnie w trakcie ulepszania.</>],
        [techUrl('k_miech'), 'Jak skrócić', <>{miech.n} w Nauce skracają każde ulepszenie, pomoc klanu odejmuje minuty, a przyspieszenie kosztuje 1 Klejnot za minutę.</>],
        [oreUrl(4), 'Nowa ruda wchodzi stopniowo', <>Srebro, Mithril, Adamantyt i Smocza Stal tuż po odblokowaniu dają część wytopów o rzadkość niżej; po {B.RAMP_LEVELS} poziomach kuźni zawsze pełne minimum.</>],
        [resUrl('klejnot'), 'Rzadsze — trudniej', <>Przeskok na Legendarny ma ×{f2(JUMP_TO_MULT[4])} szansy, na Mityczny ×{f2(JUMP_TO_MULT[5])}, a na Boski zależy od rudy (najwięcej z Boskiej Rudy).{rel ? ` Hartowanie dodaje +${pct(rel)} względnie — już wliczone.` : ''}</>],
      ]}
    >
      <div class="fl-prog">
        <div class="fl-row"><b>Poziom {lvl}</b><small>{B.FORGE_MAX - lvl > 0 ? `do ${B.FORGE_MAX}. poziomu: ${longT(timeTo(game, lvl, B.FORGE_MAX))}` : 'najwyższy poziom'}</small></div>
        <div class="bar"><i style={{ width: (lvl / B.FORGE_MAX) * 100 + '%' }} /></div>
        {next && <small class="muted">Następny kamień milowy: <b>{next}. poziom</b> — {FORGE_UNLOCKS[next]} (za {next - lvl} {next - lvl === 1 ? 'poziom' : next - lvl < 5 ? 'poziomy' : 'poziomów'}, {longT(timeTo(game, lvl, next))}).</small>}
      </div>
      <div class="fi-sec">Kamienie milowe</div>
      <ul class="fi-odds fl-miles">
        <li class={lvl >= 1 ? 'done' : ''}>
          <span class="fl-lv">1</span>
          <div class="fi-o"><div class="fi-on"><b>Miedź i Żelazo</b><small>✓</small></div><small class="muted">pierwsze rudy, pierwszy przedmiot</small></div>
          <span class="fl-ores">{oresAt(1).map(i => <Px key={i} src={oreUrl(i)} size={20} />)}</span>
        </li>
        {miles.map(m => (
          <li key={m} class={m <= lvl ? 'done' : m === next ? 'sel' : ''}>
            <span class="fl-lv">{m}</span>
            <div class="fi-o">
              <div class="fi-on"><b>{FORGE_UNLOCKS[m]}</b><small>{m <= lvl ? '✓' : longT(timeTo(game, lvl, m))}</small></div>
              <small class="muted">przeskok {pct(jp(m))}</small>
            </div>
            <span class="fl-ores">{oresAt(m).map(i => <Px key={i} src={oreUrl(i)} size={20} />)}</span>
          </li>
        ))}
      </ul>
      {soon.length > 0 && (
        <>
          <div class="fi-sec">Najbliższe ulepszenia</div>
          <ul class="fl-soon">
            {soon.map(l => (
              <li key={l}>
                <b>{l}</b>
                <span>przeskok {pct(jp(l))} <small class="up">+{pct(jp(l) - jp(l - 1))}</small></span>
                <span><Px src={resUrl('czas')} size={14} /> {tfmt(upgradeTime(s, l))}</span>
                <span><Px src={resUrl('zloto')} size={14} /> {fmt(upgradeCost(s, l))}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
