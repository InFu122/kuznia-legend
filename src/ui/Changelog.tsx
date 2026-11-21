// „Co nowego”: po aktualizacji najnowszy wpis dziennika zmian (src/data/changelog.ts) z polem „Nie pokazuj ponownie” —
// niezaznaczone: okno wróci przy następnym włączeniu gry. Z Kodeksu: wszystkie wpisy, bez pola.
import { useEffect, useState } from 'preact/hooks';
import { CHANGELOG, LATEST_LOG, type LogEntry } from '../data';
import type { Game } from '../engine/game';
import { APP_VERSION } from './pwa';
import { nativeVersion } from './storeupdate';

const PARTS: { k: 'add' | 'change' | 'fix' | 'remove'; n: string; mark: string }[] = [
  { k: 'add', n: 'Nowe', mark: '+' },
  { k: 'change', n: 'Zmienione', mark: '~' },
  { k: 'fix', n: 'Poprawione', mark: '✓' },
  { k: 'remove', n: 'Usunięte', mark: '−' },
];

function Entry({ e, first }: { e: LogEntry; first: boolean }) {
  return (
    <section class={`log-entry${first ? ' first' : ''}`}>
      {!first && <div class="log-date">{e.date}</div>}
      {PARTS.filter(P => e[P.k]?.length).map(P => (
        <div key={P.k} class={`log-part ${P.k}`}>
          <div class="log-h">{P.n}</div>
          <ul>{e[P.k]!.map((t, i) => <li key={i}><i aria-hidden="true">{P.mark}</i><span>{t}</span></li>)}</ul>
        </div>
      ))}
    </section>
  );
}

export function ChangelogView({ game, all = false, close }: { game: Game; all?: boolean; close: () => void }) {
  const [ver, setVer] = useState(APP_VERSION);
  useEffect(() => { void nativeVersion().then(v => { if (v) setVer(v.name); }); }, []);
  const latest = CHANGELOG[0];
  if (!latest) return <p class="sub">Brak wpisów.</p>;
  const hide = game.s.opts.logSeen === LATEST_LOG;
  const list = all ? CHANGELOG : [latest];
  return (
    <>
      <div class="eyebrow">Co nowego · wersja {ver}</div>
      <div class="h">{all ? 'Dziennik zmian' : `Aktualizacja z ${latest.date}`}</div>
      <div class="log-list">
        {list.map((e, i) => <Entry key={e.id} e={e} first={i === 0 && !all} />)}
      </div>
      {!all && (
        <label class="log-hide">
          {/* Zapis od razu przy zaznaczeniu — działa też, gdy gracz zamknie okno tłem albo „wstecz”. */}
          <input type="checkbox" checked={hide} onChange={e => game.setLogSeen(e.currentTarget.checked ? LATEST_LOG : '')} />
          <span>Nie pokazuj ponownie</span>
        </label>
      )}
      <button class="btn primary wide" onClick={close}>{all ? 'Zamknij' : 'Graj'}</button>
    </>
  );
}
