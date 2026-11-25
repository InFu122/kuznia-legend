// Wygląd klanu: herb klanu, baner z poziomem Wspólnej Kuźni, kafelki „Dziś dla klanu”, zakładki z ikonami,
// lista członków z rolami, karty klanów w wyszukiwarce, Skrzynia tygodnia i Kowal tygodnia.
import { useState } from 'preact/hooks';
import { CLAN, CLAN_EMB_COLORS, CLAN_EMB_ICONS, CLAN_LEVELS, CLAN_WEEK, type ClanEmb } from '../../data';
import { dungeonBgUrl, resUrl, skillUrl } from '../../art/render';
import type { ClanLife, ClanMember, ClanRole, ClanSummary, ClanWeek } from '../../save/server';
import { tfmt } from '../format';
import { fmt } from '../format';
import { Px } from '../Px';
import type { ClanTab } from './ClanLife';

/** Ikona z zasobów albo z umiejętności (tarcza, okrzyk, oddech, burza… są ikonami umiejętności). */
const SKILL_IC = new Set(['deszcz', 'tarcza', 'okrzyk', 'eliksir', 'kula', 'nova', 'krwawe', 'burza', 'oddech']);
export const icUrl = (k: string) => (SKILL_IC.has(k) ? skillUrl(k) : resUrl(k));

/* ---------- herb klanu ---------- */

const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
/** Herb domyślny (klan, którego Przywódca jeszcze nie wybrał herbu): wyliczony z identyfikatora i skrótu. */
export const embDefault = (id: string, tag: string): ClanEmb => { const h = hash(id + '|' + tag); return { c: h % CLAN_EMB_COLORS.length, i: (h >>> 4) % CLAN_EMB_ICONS.length }; };
/** Kolor i symbol herbu: wybrany przez Przywódcę albo domyślny. */
export const embOf = (id: string, tag: string, emb?: ClanEmb | null) => { const e = emb ?? embDefault(id, tag); return { c: CLAN_EMB_COLORS[e.c], i: CLAN_EMB_ICONS[e.i] as string }; };

export function ClanEmblem({ id, tag, emb, size = 56 }: { id: string; tag: string; emb?: ClanEmb | null; size?: number }) {
  const e = embOf(id, tag, emb);
  return (
    <span class="cemb" style={{ '--ec': e.c, width: size + 'px', height: Math.round(size * 1.14) + 'px' } as Record<string, string>} aria-hidden="true">
      <svg viewBox="0 0 100 114" class="cemb-sh">
        <path d="M50 3 L95 17 V54 C95 84 73 102 50 111 C27 102 5 84 5 54 V17 Z" class="cemb-fill" />
        <path d="M50 3 L95 17 V54 C95 84 73 102 50 111 C27 102 5 84 5 54 V17 Z" class="cemb-shine" />
        <path d="M50 3 L95 17 V54 C95 84 73 102 50 111 C27 102 5 84 5 54 V17 Z" class="cemb-edge" />
      </svg>
      <Px src={icUrl(e.i)} size={Math.round(size * 0.46)} />
    </span>
  );
}

/* ---------- baner klanu ---------- */

export function ClanHero({ c, d, members, langName }: {
  c: ClanSummary; d: ClanLife | null; members: ClanMember[]; langName: string;
}) {
  const lvl = d?.lvl ?? 0;
  const next = d?.next ?? null, cur = d?.cur ?? 0, xp = d?.xp ?? 0;
  const pct = next ? Math.min(100, ((xp - cur) / (next - cur)) * 100) : 100;
  const online = members.filter(m => m.online).length;
  const perk = CLAN_LEVELS[lvl];
  return (
    <section class="ch-hero" style={{ '--bg': `url(${dungeonBgUrl('kuznia')})` } as Record<string, string>}>
      <div class="ch-top">
        <ClanEmblem id={c.id} tag={c.tag} emb={c.emb} size={64} />
        <div class="ch-main">
          <span class="eyebrow">[{c.tag}] · {langName}</span>
          <div class="ch-name">{c.name}</div>
          <div class="ch-chips">
            <span class="ch-lvl">Poziom {lvl}</span>
            <span class="ch-chip">{c.members}/{c.max} kowali</span>
            <span class="ch-chip on"><i />{online} w grze</span>
          </div>
        </div>
      </div>
      <div class="ch-xp">
        <div class="bar big"><i style={{ width: pct + '%' }} /></div>
        <small>{next !== null ? <>Wspólna Kuźnia <b>{fmt(xp)} / {fmt(next)}</b> · poziom {lvl + 1}: {perk?.d ?? ''}</> : 'Wspólna Kuźnia na najwyższym poziomie'}</small>
      </div>
    </section>
  );
}

/* ---------- dziś dla klanu ---------- */

export function ClanToday({ d, onTab }: { d: ClanLife | null; onTab: (t: ClanTab) => void }) {
  if (!d?.left) return null;
  const toHelp = (d.helps ?? []).filter(h => !h.done).length + (d.ores ?? []).length;
  const tiles: { t: ClanTab; ic: string; n: string; s: string; todo: boolean }[] = [
    { t: 'kuznia', ic: 'zloto', n: 'Datek', s: d.left.don > 0 ? `zostało ${d.left.don}/${CLAN.DONATE_PER_DAY}` : 'wpłacone', todo: d.left.don > 0 },
    { t: 'boss', ic: 'moc', n: 'Boss', s: d.left.atk > 0 ? `${d.left.atk}/${CLAN.BOSS_ATTACKS} ataki` : 'ataki zużyte', todo: d.left.atk > 0 },
    { t: 'pomoc', ic: 'czas', n: 'Pomoc', s: toHelp ? `${toHelp} czeka` : 'nikt nie prosi', todo: toHelp > 0 },
    { t: 'wojna', ic: 'okrzyk', n: 'Wojna', s: (d.war?.atk ?? 0) > 0 ? `${d.war!.atk} ataki` : 'bez ataków', todo: (d.war?.atk ?? 0) > 0 },
    { t: 'smok', ic: 'oddech', n: 'Smok', s: (d.raid?.left ?? 0) > 0 ? `${d.raid!.left} atak` : d.raid?.done ? 'pokonany' : 'zrobione', todo: (d.raid?.left ?? 0) > 0 },
  ];
  const done = tiles.filter(x => !x.todo).length;
  return (
    <section class="card ct">
      <div class="ct-h">
        <div><span class="eyebrow">Dziś dla klanu</span><div class="ct-sub">Każde zadanie daje Monety klanowe i Doświadczenie klanu</div></div>
        <span class={`ct-cnt${done === tiles.length ? ' all' : ''}`}>{done}/{tiles.length}</span>
      </div>
      <div class="ct-grid">
        {tiles.map(x => (
          <button key={x.t} class={`ct-tile${x.todo ? ' todo' : ' done'}`} onClick={() => onTab(x.t)}>
            <span class="ct-ic"><Px src={icUrl(x.ic)} size={26} />{!x.todo && <i class="ct-ok">✓</i>}</span>
            <b>{x.n}</b>
            <small>{x.s}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- zakładki z ikonami ---------- */

const TAB_IC: Record<ClanTab, string> = { klan: 'tarcza', wojna: 'okrzyk', smok: 'oddech', boss: 'moc', kuznia: 'kowadlo', pomoc: 'czas', sklep: 'moneta' };
export function ClanTabs({ tabs, tab, dots, setTab }: { tabs: [ClanTab, string][]; tab: ClanTab; dots: Partial<Record<ClanTab, boolean>>; setTab: (t: ClanTab) => void }) {
  return (
    <div class="ctabs" role="tablist" aria-label="Klan">
      {tabs.map(([id, n]) => (
        <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
          <Px src={icUrl(TAB_IC[id])} size={22} />
          <span>{n}</span>
          {dots[id] && <i class="tab-dot" aria-label="coś czeka" />}
        </button>
      ))}
    </div>
  );
}

/* ---------- członkowie ---------- */

const ROLE_ORDER: ClanRole[] = ['lider', 'zastepca', 'starszy', 'czlonek', 'prosba'];
export const sortMembers = (list: ClanMember[]) =>
  [...list].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || b.power - a.power);
/** Miejsce w klanie według Mocy (1 = najsilniejszy). */
export const powerRank = (list: ClanMember[]) => {
  const r = new Map<string, number>();
  [...list].sort((a, b) => b.power - a.power).forEach((m, i) => r.set(m.id, i + 1));
  return r;
};

export const RoleIcon = ({ role }: { role: ClanRole }) =>
  role === 'lider' ? (
    <svg class="rl-ic lider" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 3l3.5 3L8 1l3.5 5L15 3l-1.5 8h-11z" fill="currentColor" /></svg>
  ) : role === 'zastepca' ? (
    <svg class="rl-ic zastepca" viewBox="0 0 12 14" aria-hidden="true"><path d="M6 1l5 2v4c0 3-2.2 5.2-5 6-2.8-.8-5-3-5-6V3z" fill="currentColor" /></svg>
  ) : role === 'starszy' ? (
    <svg class="rl-ic starszy" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l1.8 3.9 4.2.5-3.1 2.9.8 4.2L7 10.4 3.3 12.5l.8-4.2L1 5.4l4.2-.5z" fill="currentColor" /></svg>
  ) : null;

/* ---------- wyszukiwarka: karta klanu ---------- */

export function ClanCard({ c, mode, lang, weak, label, disabled, onJoin }: {
  c: ClanSummary; mode: string; lang: string; weak: boolean; label: string; disabled: boolean; onJoin: () => void;
}) {
  const full = c.members >= c.max;
  return (
    <li class={`cf${weak ? ' weak' : ''}`}>
      <ClanEmblem id={c.id} tag={c.tag} emb={c.emb} size={46} />
      <div class="cf-main">
        <b class="cf-name">{c.name} <span class="ctag">[{c.tag}]</span></b>
        <div class="cf-mem"><div class="bar"><i style={{ width: (c.members / c.max) * 100 + '%' }} /></div><small class="num">{c.members}/{c.max}</small></div>
        <div class="cf-chips">
          <span class={`cf-chip m-${c.mode}`}>{mode}</span>
          <span class="cf-chip">{lang}</span>
          {c.minPower > 0 && <span class={`cf-chip${weak ? ' bad' : ''}`}>Moc od {fmt(c.minPower)}</span>}
        </div>
        {c.desc && <small class="cf-desc">{c.desc}</small>}
      </div>
      <button class={`btn small${!disabled && !full ? ' primary' : ''}`} disabled={disabled} onClick={onJoin}>{label}</button>
    </li>
  );
}

/* ---------- wybór herbu (zakładanie klanu i ustawienia Przywódcy) ---------- */

export function EmblemPicker({ value, onChange, id = 'nowy', tag = '' }: { value: ClanEmb; onChange: (e: ClanEmb) => void; id?: string; tag?: string }) {
  return (
    <div class="embpick">
      <div class="ep-prev"><ClanEmblem id={id} tag={tag} emb={value} size={64} /><small>{tag ? `[${tag}]` : 'Herb klanu'}</small></div>
      <div class="ep-opts">
        <div class="ep-row" role="radiogroup" aria-label="Kolor herbu">
          {CLAN_EMB_COLORS.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={value.c === i} class={`ep-col${value.c === i ? ' on' : ''}`} style={{ background: c }} onClick={() => onChange({ ...value, c: i })} aria-label={`Kolor ${i + 1}`} />
          ))}
        </div>
        <div class="ep-row ep-ico" role="radiogroup" aria-label="Symbol herbu">
          {CLAN_EMB_ICONS.map((k, i) => (
            <button key={k} type="button" role="radio" aria-checked={value.i === i} class={`ep-sym${value.i === i ? ' on' : ''}`} onClick={() => onChange({ ...value, i })} aria-label={`Symbol ${i + 1}`}>
              <Px src={icUrl(k)} size={22} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
/** Stan wyboru herbu z wartością początkową (wybrany herb klanu albo domyślny). */
export const useEmb = (id: string, tag: string, emb?: ClanEmb | null) => useState<ClanEmb>(emb ?? embDefault(id, tag));

/* ---------- Skrzynia tygodnia i Kowal tygodnia ---------- */

const CHEST_COL = ['#c98a4a', '#b9c2cc', '#e7be62', '#b07cff', '#ff9f43'];
/** Skrzynia narysowana wektorowo: kolor progu, zamknięta albo otwarta (odebrana). */
export const ChestIcon = ({ tier, state, size = 30 }: { tier: number; state: 'lock' | 'open' | 'got'; size?: number }) => (
  <svg class={`wchest ${state}`} viewBox="0 0 32 28" width={size} height={Math.round(size * 0.875)} style={{ '--cc': CHEST_COL[tier] } as Record<string, string>} aria-hidden="true">
    <rect x="3" y="12" width="26" height="14" rx="2" class="ch-body" />
    {state === 'got'
      ? <path d="M3 12 L6 3 H26 L29 12 Z" class="ch-lid open" />
      : <path d="M3 12 C3 5 8 3 16 3 C24 3 29 5 29 12 Z" class="ch-lid" />}
    <rect x="3" y="11" width="26" height="3" class="ch-band" />
    <rect x="13.5" y="12" width="5" height="7" rx="1" class="ch-lock" />
  </svg>
);

export function ClanWeekCard({ w, now, busy, msg, onClaim }: { w: ClanWeek; now: number; busy: boolean; msg: string; onClaim: () => void }) {
  const n = w.goals.length;
  // Skrzynie w równych odstępach; pasek rośnie odcinkami między progami.
  let fill = 0;
  w.goals.forEach((g, i) => { const prev = i ? w.goals[i - 1] : 0; fill += Math.max(0, Math.min(1, (w.pts - prev) / (g - prev))) / n; });
  const claim = w.mine > 0 ? Math.max(0, w.open - w.got.length) : 0;
  const next = w.goals.find(g => w.pts < g);
  return (
    <section class="card cw">
      <div class="row">
        <div><span class="eyebrow">Skrzynia tygodnia</span><div class="ct-sub">Wspólne punkty całego klanu otwierają kolejne skrzynie</div></div>
        <span class="ps-time">{tfmt(Math.max(0, w.ends - now))}</span>
      </div>
      <div class="cw-track">
        <div class="cw-bar"><i style={{ width: fill * 100 + '%' }} /></div>
        {w.goals.map((g, i) => {
          const st = w.got.includes(i) ? 'got' : w.pts >= g ? 'open' : 'lock';
          return (
            <span key={i} class={`cw-chest ${st}`} style={{ left: ((i + 1) / n) * 100 + '%' }}>
              <span class="cw-cbox"><ChestIcon tier={i} state={st} size={i === n - 1 ? 36 : 30} />{st === 'got' && <i class="ct-ok">✓</i>}</span>
              <small class="num">{g >= 1000 ? (g / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' tys.' : g}</small>
            </span>
          );
        })}
      </div>
      <div class="cw-info">
        <span><b class="num">{w.pts}</b> pkt klanu{next !== undefined ? <> · do następnej: <b class="num">{next - w.pts}</b></> : ' · wszystkie otwarte!'}</span>
        <span>twoje: <b class="num">{w.mine}</b> pkt</span>
      </div>
      {claim > 0 ? (
        <button class="btn primary big cw-claim" disabled={busy} onClick={onClaim}>Odbierz {claim === 1 ? 'skrzynię' : `skrzynie (${claim})`}</button>
      ) : w.mine === 0 ? <p class="cw-note">Dołóż choć 1 punkt, a odbierzesz każdą skrzynię otwartą w tym tygodniu.</p> : null}
      {msg && <p class="sub" role="status">{msg}</p>}
      <ul class="cw-pts">
        <li>Datek <b>+{CLAN_WEEK.PTS.don}</b></li><li>Atak na bossa <b>+{CLAN_WEEK.PTS.atk}</b></li><li>Pomoc <b>+{CLAN_WEEK.PTS.help}</b></li>
        <li>Dar rudy <b>+{CLAN_WEEK.PTS.ore}</b></li><li>Bitwa <b>+{CLAN_WEEK.PTS.war}</b></li><li>Smok <b>+{CLAN_WEEK.PTS.raid}</b></li>
      </ul>
      <div class="cw-smith">
        <span class="cw-crown"><Px src={icUrl('kowadlo')} size={24} /></span>
        <div class="cw-sm-main">
          <span class="eyebrow">Kowal tygodnia</span>
          {w.top ? <b>{w.top.n}{w.top.me ? ' (ty!)' : ''} <small class="num">· {w.top.pts} pkt w zeszłym tygodniu</small></b> : <b class="muted">jeszcze nikt — to może być ty</b>}
          <small>{w.lead ? <>Teraz prowadzi: <b>{w.lead.n}{w.lead.me ? ' (ty)' : ''}</b> · {w.lead.pts} pkt.</> : 'W tym tygodniu jeszcze nikt nie zdobył punktów.'} Nagroda: +{CLAN_WEEK.TOP_REWARD.coins} Monet i Pieczęć Legendy.</small>
        </div>
      </div>
    </section>
  );
}

/* ---------- przejście do zakładki klanu z innego miejsca (np. „Pomóż” na czacie) ---------- */

let wantTab: ClanTab | null = null;
const tabFns = new Set<(t: ClanTab) => void>();
/** Otwórz zakładkę klanu `t` (zakładka Klan sama się przełączy, a jeśli jeszcze jej nie ma — wybierze ją przy otwarciu). */
export function openClanTab(t: ClanTab): void {
  wantTab = t;
  for (const fn of tabFns) fn(t);
}
/** Zakładka klanu zamówiona przed otwarciem panelu (bierze ją raz). */
export function takeClanTab(): ClanTab | null { const t = wantTab; wantTab = null; return t; }
export function onClanTab(fn: (t: ClanTab) => void): () => void { tabFns.add(fn); return () => { tabFns.delete(fn); }; }
