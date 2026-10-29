// Ligi areny i sklep areny (dane liczy serwer: server/src/league.ts).
import { ARENA_SHOP, ARENA_SHOP_IDS, LEAGUE, LEAGUES, LEAGUE_SEASON_GEMS, type ArenaShopId } from '../../data';
import { resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { arenaShopBlock, arenaShopOpen, arenaShopReward, zoneOf } from '../../engine/league';
import type { LeagueState } from '../../save/server';
import { showProfile } from '../profile';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { Res, RewardIcons, Tokens } from '../RewardIcons';

export const TokenIco = ({ size = 16 }: { size?: number }) => <Px src={resUrl('zeton')} size={size} />;
const GemIco = ({ size = 16 }: { size?: number }) => <Px src={resUrl('klejnot')} size={size} />;

/** Tarcza ligi w jej kolorze. */
export function LeagueBadge({ tier, small }: { tier: number; small?: boolean }) {
  const L = LEAGUES[Math.max(0, Math.min(LEAGUES.length - 1, tier))];
  return <span class={`lgbadge${small ? ' small' : ''}`} style={{ '--lg': L.col } as Record<string, string>}><i aria-hidden="true" />{L.n}</span>;
}

const ICON: Record<ArenaShopId, string> = { bilet: 'zeton', ksiegi: 'ksiega', kamienie: 'kamien', zwoj: 'zwoj', siodlo: 'siodlo', jajo: 'jajo2', pieczec: 'pieczec' };

export function LeagueTab({ lg, now }: { lg: LeagueState; now: number }) {
  const L = LEAGUES[lg.tier];
  const last = lg.last;
  return (
    <>
      <section class="lgcard" style={{ '--lg': L.col } as Record<string, string>}>
        <LeagueBadge tier={lg.tier} />
        <div class="cmain">
          <div class="sub">Tydzień ligi kończy się za <b>{tfmt(Math.max(0, lg.ends - now))}</b></div>
          {lg.rank ? <div class="sub">Twoje miejsce: <b class="num">{lg.rank}</b>/{LEAGUE.GROUP}</div> : null}
        </div>
      </section>
      {last && (
        <p class={`lgnote ${last.move > 0 ? 'up' : last.move < 0 ? 'down' : ''}`} role="status">
          Zeszły tydzień: <b>{last.rank}. miejsce</b> w lidze {LEAGUES[last.tier].n}
          {last.move > 0 ? ` — awans do ligi ${LEAGUES[last.tier + 1].n}!` : last.move < 0 ? ` — spadek do ligi ${LEAGUES[last.tier - 1].n}.` : ' — utrzymanie ligi.'}
          {' '}+<Tokens n={last.tokens} />.
        </p>
      )}
      {lg.lastSeason && lg.lastSeason.gems > 0 && (
        <p class="lgnote up">Sezon {lg.lastSeason.n}: najwyższa liga {LEAGUES[lg.lastSeason.best].n} — +<Res r={{ gems: lg.lastSeason.gems }} />.</p>
      )}
      {lg.rows ? (
        <ol class="lgtable">
          {lg.rows.map((r, i) => {
            const z = zoneOf(lg.tier, i + 1);
            return (
              <li key={i} class={`${z}${r.me ? ' me' : ''}${i === LEAGUE.PROMO - 1 && z === 'up' ? ' cut' : ''}${i === LEAGUE.GROUP - LEAGUE.DEMO - 1 && lg.tier > 0 ? ' cut' : ''}`}>
                <span class="pos num">{i + 1}</span>
                <span class="nm">{r.id && !r.me ? <button class="linkbtn" onClick={() => showProfile(r.id!)}>{r.n}</button> : r.me ? 'Ty' : r.n}{r.ghost && <small class="muted"> duch</small>}</span>
                <span class="num">{fmt(r.pts)}</span>
              </li>
            );
          })}
        </ol>
      ) : <p class="sub">Stocz walkę na arenie, żeby dołączyć do grupy tego tygodnia.</p>}
      <p class="sub">
        {LEAGUE.GROUP} osób w grupie. Najlepsza piątka awansuje, ostatnia piątka spada. Wygrana daje do {Math.round(LEAGUE.WIN_PTS * 1.5)} pkt
        (więcej z silniejszym rywalem), porażka {LEAGUE.LOSS_PTS}. Duchy areny zajmują wolne miejsca, gdy graczy jest mało.
      </p>
      <div class="eyebrow" style={{ marginTop: '6px' }}>Sezon {lg.season.n} · {lg.season.name}</div>
      <p class="sub">
        Kończy się za <b>{tfmt(Math.max(0, lg.season.end - now))}</b>. Na koniec sezonu Klejnoty za najwyższą ligę sezonu
        {lg.season.gems > 0 ? <> — na razie <Res r={{ gems: lg.season.gems }} /> ({LEAGUES[lg.season.best].n})</> : <> — od ligi {LEAGUES[1].n} wzwyż</>}.
        Nowy sezon zaczyna się o jedną ligę niżej.
      </p>
      <ul class="lgseason">
        {LEAGUES.map((_, i) => (
          <li key={i} class={i === lg.season.best ? 'on' : ''}><LeagueBadge tier={i} small /><span><GemIco size={12} /> {LEAGUE_SEASON_GEMS[i]}</span></li>
        ))}
      </ul>
    </>
  );
}

export function ArenaShopTab({ game, lg, busy, buy }: { game: Game; lg: LeagueState; busy: boolean; buy: (id: ArenaShopId) => void }) {
  const s = game.s;
  return (
    <>
      <p class="sub">Żetony Areny: {LEAGUE.WIN_TOKENS} za wygraną, {LEAGUE.LOSS_TOKENS} za porażkę i nagroda za miejsce w lidze na koniec tygodnia.</p>
      <ul class="gemgrid">
        {ARENA_SHOP_IDS.filter(id => arenaShopOpen(s, id)).map(id => {
          const it = ARENA_SHOP[id];
          const used = lg.shop[id] ?? 0;
          const left = Math.max(0, it.day - used);
          const block = arenaShopBlock(s, lg.shop, id, lg.tokens);
          return (
            <li key={id} class={left <= 0 ? 'out' : ''}>
              <Px src={resUrl(ICON[id])} size={28} />
              <b>{it.n}</b>
              <small>{id === 'bilet' ? it.d : <RewardIcons r={arenaShopReward(id)} size={14} />}</small>
              <small class="muted">{left > 0 ? `zostało dziś: ${left}` : 'na dziś wyprzedane'}</small>
              <button class="btn small primary" disabled={busy || !!block} onClick={() => buy(id)}><TokenIco size={14} /> {it.cost}</button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
