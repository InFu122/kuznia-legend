import { useEffect, useState } from 'preact/hooks';
import { getLink, type BoardId, type Ranking } from '../../save/server';
import { fmt } from '../format';

const BOARDS: [BoardId, string, string][] = [
  ['moc', 'Moc', 'Moc'],
  ['wieza', 'Wieża', 'Piętro'],
  ['postep', 'Postęp', 'Etap'],
  ['arena', 'Arena', 'Ocena'],
];

/** Etap kampanii jako „kraina X, etap Y”. */
const stage = (g: number) => `${Math.floor(g / 10) + 1}-${(g % 10) + 1}`;

export function RankingView({ close }: { close: () => void }) {
  const [board, setBoard] = useState<BoardId>('moc');
  const [data, setData] = useState<Ranking | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const link = getLink();
    setData(null);
    setErr('');
    if (!link?.online) { setErr('Brak połączenia z serwerem.'); return; }
    let live = true;
    link.ranking(board).then(r => { if (live) setData(r); }).catch(() => { if (live) setErr('Nie udało się pobrać rankingu.'); });
    return () => { live = false; };
  }, [board]);
  const col = BOARDS.find(b => b[0] === board)![2];
  const val = (score: number) => (board === 'postep' ? stage(score) : fmt(score));
  return (
    <>
      <div class="eyebrow">Rankingi graczy</div>
      <div class="seg seg4" role="tablist">
        {BOARDS.map(([id, n]) => <button key={id} role="tab" aria-selected={board === id} class={board === id ? 'on' : ''} onClick={() => setBoard(id)}>{n}</button>)}
      </div>
      {board === 'wieza' && <p class="sub">Ranking Wieży Wyzwań zaczyna się od nowa w każdy poniedziałek.</p>}
      {board === 'moc' && <p class="sub">Liczą się przedmioty, których pochodzenie sprawdził serwer (wytop z ziarnem serwera albo znalezisko z Obiegu).</p>}
      {board === 'arena' && <p class="sub">Ocena rośnie za wygrane walki i spada za przegrane — także w obronie.</p>}
      {err && <p class="sub">{err}</p>}
      {!err && !data && <p class="sub">Wczytywanie…</p>}
      {data && (
        <div class="otable-wrap">
          <table class="otable rank">
            <thead><tr><th>#</th><th>Kowal</th><th>{col}</th></tr></thead>
            <tbody>
              {data.records.map(r => (
                <tr key={r.rank} class={r.me ? 'sel' : ''}>
                  <td class="num">{r.rank}</td>
                  <td class="oname">{r.name}<small>{r.land}</small></td>
                  <td class="num">{val(r.score)}</td>
                </tr>
              ))}
              {data.mine && !data.records.some(r => r.me) && (
                <tr class="sel"><td class="num">{data.mine.rank}</td><td class="oname">{data.mine.name} (ty)</td><td class="num">{val(data.mine.score)}</td></tr>
              )}
            </tbody>
          </table>
          {!data.records.length && <p class="sub">Jeszcze nikt nie ma wyniku. Twój pojawi się po najbliższym zapisie.</p>}
        </div>
      )}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}
