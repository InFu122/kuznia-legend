// Wspólne elementy przepustki i wydarzenia: tor nagród przewijany w bok (karty jak łupy, kolor = wartość nagrody),
// okno „Odebrano!” z wyskakującymi kafelkami i tło sezonu.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { SEASON_NAMES } from '../../data';
import type { Reward } from '../../engine/types';
import { Avatar } from '../Avatar';
import { LockIcon } from '../icons';
import { Px } from '../Px';
import { RewardTiles, rewardChips, type RewardChip } from '../RewardIcons';

/** Tło sezonu (scena lochu pasująca do nazwy sezonu). */
const SEASON_BG = ['kuznia', 'ev_lowy', 'wieza', 'krypta', 'ev_kuznia', 'ev_upiory'];
export const seasonScene = (name: string) => SEASON_BG[Math.max(0, SEASON_NAMES.indexOf(name))] ?? 'wieza';

/** Wartość nagrody → kolor karty (od zwykłej do wyjątkowej). */
const TIERS = ['ore', 'gold', 'r2', 'r3', 'gem', 'r4', 'r5', 'r6'] as const;
type Tier = (typeof TIERS)[number];
function chipTier(c: RewardChip): Tier {
  if (c.key === 'gold') return 'gold';
  if (c.key === 'gems') return 'gem';
  if (c.key === 'books' || c.key === 'stones') return 'r2';
  if (c.key === 'scrolls') return 'r3';
  if (c.key === 'saddles') return 'r4';
  if (c.key === 'seals') return 'r5';
  if (c.cls === 'look' || c.cls === 'rt6') return 'r6';
  if (c.key.startsWith('egg')) return (['r2', 'r2', 'r2', 'r3', 'r4'] as const)[Number(c.key.slice(3))] ?? 'r4';
  return 'ore';
}
export const rewardTier = (chips: RewardChip[]): Tier => chips.reduce<Tier>((t, c) => (TIERS.indexOf(chipTier(c)) > TIERS.indexOf(t) ? chipTier(c) : t), 'ore');

const ChipIcon = ({ c, size }: { c: RewardChip; size: number }) =>
  c.frame ? <Avatar frame={c.frame} size={size + 4} />
    : c.cls === 'look' && c.key.startsWith('skin') ? <Avatar skin={c.key.slice(4)} size={size + 4} />
      : <Px src={c.ic!} size={size} />;

export type CardState = 'got' | 'ready' | 'lock' | 'open' | 'locked';

/** Karta nagrody na torze: jedna nagroda — duża ikona, liczba i nazwa; kilka — siatka ikonek z liczbami. */
export function RewardCard({ r, state, prem, onClaim }: { r: Reward; state: CardState; prem?: boolean; onClaim?: () => void }) {
  const chips = rewardChips(r);
  const tier = rewardTier(chips);
  const one = chips.length === 1 ? chips[0] : null;
  const title = chips.map(c => c.t).join(', ');
  return (
    <button type="button" class={`tcard t-${tier}${prem ? ' prem' : ''} ${state}`} title={title} aria-label={title}
      onClick={state === 'ready' ? onClaim : undefined} tabIndex={state === 'ready' ? 0 : -1}>
      {one ? (
        <>
          <span class="tc-ic"><ChipIcon c={one} size={34} /></span>
          {one.n ? <b class="tc-n">{one.n}</b> : null}
          <small class="tc-nm">{one.nm}</small>
        </>
      ) : (
        <span class={`tc-grid n${Math.min(chips.length, 6)}`}>
          {chips.map(c => (
            <span key={c.key} class="tc-mini"><ChipIcon c={c} size={22} />{c.n && <b>{c.n}</b>}</span>
          ))}
        </span>
      )}
      {state === 'got' && <i class="tc-badge ok" aria-label="odebrane">✓</i>}
      {state === 'locked' && <i class="tc-badge lock" aria-label="złota ścieżka"><LockIcon /></i>}
      {state === 'ready' && <span class="tc-ribbon">Odbierz</span>}
    </button>
  );
}

/** Tor przewijany w bok; po otwarciu ustawia się na kolumnie `focus` (pierwsza do odebrania albo następna). */
export function Track({ focus, children, cls = '' }: { focus: number; children: ComponentChildren; cls?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const col = el?.querySelectorAll<HTMLElement>('.tcol')[Math.max(0, focus)];
    if (el && col) el.scrollLeft = Math.max(0, col.offsetLeft - el.clientWidth * 0.3);
  }, []);
  return <div class={`trk ${cls}`} ref={ref}><ol class="trk-in">{children}</ol></div>;
}

/** Pasek w odcinkach: każdy próg nagrody to jeden odcinek (osiągnięte pełne, bieżący częściowo). */
export function SegBar({ n, full, part }: { n: number; full: number; part: number }) {
  return (
    <span class="segbar" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} class={i < full ? 'on' : ''} style={i === full ? { '--p': Math.max(0, Math.min(1, part)) } as Record<string, number> : undefined} />)}
    </span>
  );
}

/** Nad torem: tytuł, ile progów zdobyte z ilu, ile czeka do odebrania, i cała linia w odcinkach. */
export function TrackHead({ title, done, total, part, todo }: { title: string; done: number; total: number; part: number; todo: number }) {
  return (
    <div class="trk-head2">
      <div class="th-row">
        <span class="eyebrow">{title}</span>
        <span class="th-n"><b class="num">{done}</b>/{total}</span>
        {todo > 0 && <span class="trk-todo">do odebrania: {todo}</span>}
      </div>
      <SegBar n={total} full={done} part={part} />
    </div>
  );
}

/** Okno „Odebrano!”: promienie, tytuł i kafelki nagród wyskakujące po kolei. */
export function ClaimReveal({ r, title = 'Nagrody odebrane!', onClose }: { r: Reward; title?: string; onClose: () => void }) {
  return (
    <div class="claimfx" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div class="cfx-box" onClick={e => e.stopPropagation()}>
        <div class="cfx-rays" aria-hidden="true" />
        <div class="cfx-t">{title}</div>
        <RewardTiles r={r} />
        <button class="btn primary" onClick={onClose}>Super!</button>
      </div>
    </div>
  );
}
