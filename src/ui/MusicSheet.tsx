// Wybór muzyki (nutka obok Mocy): włącz/wyłącz, głośność i utwór — automatycznie według miejsca
// (spokojna w krainach, szybsza w lochach, chóry przy bossach) albo jeden wybrany: gra do końca, potem wraca automat.
import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import { TRACKS, nowPlaying, onTrack, skipTrack, trackName } from './music';

/** Nutka (z kreską, gdy muzyka jest wyłączona). */
export const NoteIcon = ({ off = false }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 17.5V5.5l10-2v12" />
    <circle cx="6.5" cy="17.5" r="2.5" fill="currentColor" />
    <circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" />
    {off && <path d="M3.5 3.5l17 17" stroke-width="2.4" />}
  </svg>
);

/** Słupki „gra teraz”. */
const Eq = () => <span class="mus-eq" aria-hidden="true"><i /><i /><i /></span>;

const GROUPS: { g: 'calm' | 'dyn' | 'choir'; n: string }[] = [
  { g: 'calm', n: 'Spokojne · krainy' },
  { g: 'dyn', n: 'Bojowe · lochy i bossowie' },
  { g: 'choir', n: 'Chóry · bossowie' },
];

export function MusicSheet({ game }: { game: Game }) {
  const s = game.s;
  const [, force] = useState(0);
  useEffect(() => onTrack(() => force(x => x + 1)), []);
  const cur = s.opts.track ?? null;
  const on = s.opts.music;
  const now = nowPlaying();
  return (
    <>
      <div class="h">Muzyka</div>
      <div class="mus-top">
        <button class={`toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={() => game.setMusic(!on)}><span class="knob" />{on ? 'Gra' : 'Wyłączona'}</button>
        {on && (
          <label class="mus-vol">
            <input type="range" min={0} max={100} step={5} value={Math.round(s.opts.mvol * 100)} aria-label="Głośność muzyki"
              onInput={e => game.setMusic(true, Number(e.currentTarget.value) / 100)} />
            <b>{Math.round(s.opts.mvol * 100)}%</b>
          </label>
        )}
      </div>
      <p class="sub mus-now">{on ? (now ? <>Teraz gra: <b>{trackName(now)}</b>{cur ? ' — po nim muzyka wraca do automatycznej.' : ''}</> : 'Muzyka zacznie grać po dotknięciu ekranu.') : 'Muzyka jest wyłączona — wybierz utwór, żeby ją włączyć.'}</p>
      <div class="mus-list" role="radiogroup" aria-label="Utwór">
        <button role="radio" aria-checked={!cur} class={`mus-auto${!cur ? ' on' : ''}`} onClick={() => game.setTrack(null)}>
          <span class="mus-ic">{!cur && now ? <Eq /> : <NoteIcon />}</span>
          <span><b>Automatycznie</b><small>spokojna w krainach, szybsza w lochach, chóry przy bossach</small></span>
        </button>
        {!cur && on && now && <button class="btn small mus-skip" onClick={() => skipTrack()}>Następny utwór ›</button>}
        {GROUPS.map(G => (
          <div key={G.g} class="mus-group">
            <div class="eyebrow">{G.n}</div>
            <div class="mus-grid">
              {TRACKS.filter(t => t.g === G.g).map(t => (
                <button key={t.id} role="radio" aria-checked={cur === t.id} class={`mus-t${cur === t.id ? ' on' : ''}${now === t.id ? ' now' : ''}`}
                  onClick={() => game.setTrack(t.id)}>
                  {now === t.id && <Eq />}<span>{t.n}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
