import { useEffect, useState } from 'preact/hooks';
import { resUrl } from '../../art/render';
import { WAR_TROPHIES } from '../../data';
import { getLink, type BoardId, type ClanRanking, type Ranking } from '../../save/server';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { Avatar } from '../Avatar';

type Tab = BoardId | 'klany';
const BOARDS: [Tab, string, string][] = [
  ['moc', 'Moc', 'Moc'],
  ['wieza', 'Wieża', 'Piętro'],
  ['postep', 'Postęp', 'Etap'],
  ['arena', 'Arena', 'Ocena'],
  ['klany', 'Klany', ''],
];

/** Etap kampanii jako „kraina X, etap Y”. */
const stage = (g: number) => `${Math.floor(g / 10) + 1}-${(g % 10) + 1}`;

export function RankingView({ initial, close }: { initial?: Tab; close: () => void }) {
  const [board, setBoard] = useState<Tab>(initial ?? 'moc');
  return (
    <>
      <div class="eyebrow">Rankingi</div>
      <div class="seg seg5" role="tablist">
        {BOARDS.map(([id, n]) => <button key={id} role="tab" aria-selected={board === id} class={board === id ? 'on' : ''} onClick={() => setBoard(id)}>{n}</button>)}
      </div>
      {board === 'klany' ? <ClanBoards /> : <PlayerBoard board={board} />}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}

function PlayerBoard({ board }: { board: BoardId }) {
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
                  <td class="oname"><span class="rk-who"><Avatar skin={r.sk} frame={r.fr} size={28} /><span>{r.name}<small>{r.land}</small></span></span></td>
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
    </>
  );
}

/** Ranking klanów: Moc klanów i Puchary sezonu wojen z nagrodami za miejsce. */
function ClanBoards() {
  const [kind, setKind] = useState<'sezon' | 'moc'>('sezon');
  const [data, setData] = useState<ClanRanking | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const link = getLink();
    setData(null);
    setErr('');
    if (!link?.online) { setErr('Brak połączenia z serwerem.'); return; }
    let live = true;
    link.clanRanking(kind).then(r => { if (live) setData(r); }).catch(() => { if (live) setErr('Nie udało się pobrać rankingu.'); });
    return () => { live = false; };
  }, [kind]);
  const se = data?.season;
  const name = (r: { n: string; tag: string }) => (r.tag ? `[${r.tag}] ` : '') + r.n;
  return (
    <>
      <div class="seg seg2" role="tablist">
        <button role="tab" aria-selected={kind === 'sezon'} class={kind === 'sezon' ? 'on' : ''} onClick={() => setKind('sezon')}>Sezon wojen</button>
        <button role="tab" aria-selected={kind === 'moc'} class={kind === 'moc' ? 'on' : ''} onClick={() => setKind('moc')}>Moc klanów</button>
      </div>
      {kind === 'sezon' && se && (
        <>
          <p class="sub">
            Sezon {se.n} · {se.name} — koniec za <b>{tfmt(Math.max(0, se.end - Date.now()))}</b>.
            Puchary za każdą wojnę: wygrana {WAR_TROPHIES.win}, remis {WAR_TROPHIES.draw}, porażka {WAR_TROPHIES.loss} i 1 za każde {fmt(WAR_TROPHIES.perPts)} punktów klanu (do {WAR_TROPHIES.bonusMax}).
          </p>
          <ul class="cseason">
            {se.rewards.map((x, i) => (
              <li key={i}>
                <b>{x.top === 0 ? 'Pozostałe' : x.top === 1 ? '1. miejsce' : `do ${x.top}. miejsca`}</b>
                <span><Px src={resUrl('klejnot')} size={12} /> {x.gems} · <Px src={resUrl('moneta')} size={12} /> {x.coins}</span>
              </li>
            ))}
          </ul>
          <p class="sub">Nagrodę dostaje każdy, kto zdobył punkty w wojnie tego sezonu — według miejsca klanu, za który walczył.</p>
        </>
      )}
      {kind === 'moc' && <p class="sub">Suma Mocy członków klanu. Odświeża się, gdy członkowie zaglądają do klanu.</p>}
      {err && <p class="sub">{err}</p>}
      {!err && !data && <p class="sub">Wczytywanie…</p>}
      {data && (
        <div class="otable-wrap">
          <table class="otable rank">
            <thead><tr><th>#</th><th>Klan</th><th>{kind === 'sezon' ? 'Puchary' : 'Moc'}</th></tr></thead>
            <tbody>
              {data.records.map(r => (
                <tr key={r.rank} class={r.me ? 'sel' : ''}>
                  <td class="num">{r.rank}</td>
                  <td class="oname">{name(r)}<small>{kind === 'sezon' ? `wygrane wojny: ${r.sub}` : `członkowie: ${r.m}`}</small></td>
                  <td class="num">{fmt(r.score)}</td>
                </tr>
              ))}
              {data.mine && !data.records.some(r => r.me) && (
                <tr class="sel"><td class="num">{data.mine.rank}</td><td class="oname">{name(data.mine)}</td><td class="num">{fmt(data.mine.score)}</td></tr>
              )}
            </tbody>
          </table>
          {!data.records.length && (
            <p class="sub">{kind === 'sezon' ? 'W tym sezonie żadna wojna jeszcze się nie skończyła. Puchary przychodzą po niedzielnym rozliczeniu.' : 'Klany pojawią się tu, gdy członkowie zajrzą do zakładki Klan.'}</p>
          )}
          {data.clan && !data.mine && <p class="sub">Twój klan {name(data.clan)} nie ma jeszcze wyniku w tym rankingu.</p>}
        </div>
      )}
    </>
  );
}
