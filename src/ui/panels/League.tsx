// Ligi areny i sklep areny (dane liczy serwer: server/src/league.ts).
import { ARENA_SHOP, ARENA_SHOP_IDS, LEAGUE, LEAGUES, LEAGUE_SEASON_GEMS, type ArenaShopId } from '../../data';
import { resUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { arenaShopBlock, arenaShopOpen, zoneOf } from '../../engine/league';
import type { LeagueState } from '../../save/server';
import { showProfile } from '../profile';
import { fmt, tfmt } from '../format';
import { Px } from '../Px';
import { Res, Tokens } from '../RewardIcons';

export const TokenIco = ({ size = 16 }: { size?: number }) => <Px src={resUrl('zeton')} size={size} />;
const GemIco = ({ size = 16 }: { size?: number }) => <Px src={resUrl('klejnot')} size={size} />;

/** Tarcza ligi w jej kolorze. */
export function LeagueBadge({ tier, small, big }: { tier: number; small?: boolean; big?: boolean }) {
  const L = LEAGUES[Math.max(0, Math.min(LEAGUES.length - 1, tier))];
  return <span class={`lgbadge${small ? ' small' : ''}${big ? ' big' : ''}`} style={{ '--lg': L.col } as Record<string, string>}><i aria-hidden="true" />{L.n}</span>;
}

const ICON: Record<ArenaShopId, string> = { bilet: 'zeton', ksiegi: 'ksiega', kamienie: 'kamien', zwoj: 'zwoj', siodlo: 'siodlo', jajo: 'jajo2', pieczec: 'pieczec' };

/** Gdzie gracz jest w grupie: strefa awansu, bezpiecznie albo strefa spadku — i ile punktów dzieli go od granicy. */
function zoneInfo(lg: LeagueState): { cls: 'up' | 'down' | ''; n: string; d: string } | null {
  if (!lg.rows || !lg.rank) return null;
  const me = lg.rows[lg.rank - 1];
  const z = zoneOf(lg.tier, lg.rank);
  const top = lg.tier < LEAGUES.length - 1;
  if (z === 'up') return { cls: 'up', n: 'Strefa awansu', d: `Utrzymaj miejsce w najlepszej ${LEAGUE.PROMO === 5 ? 'piątce' : LEAGUE.PROMO} do końca tygodnia, a awansujesz do ligi ${LEAGUES[lg.tier + 1].n}.` };
  if (z === 'down') {
    const safe = lg.rows[LEAGUE.GROUP - LEAGUE.DEMO - 1];
    return { cls: 'down', n: 'Strefa spadku', d: safe && me ? `Do bezpiecznego miejsca brakuje ${fmt(Math.max(1, safe.pts - me.pts + 1))} pkt.` : 'Wygrywaj, żeby wyjść ze strefy spadku.' };
  }
  const cut = lg.rows[LEAGUE.PROMO - 1];
  return { cls: '', n: 'Bezpiecznie', d: top && cut && me ? `Do strefy awansu brakuje ${fmt(Math.max(1, cut.pts - me.pts + 1))} pkt.` : 'Najwyższa liga — walcz o jak najlepsze miejsce.' };
}

export function LeagueTab({ lg, now }: { lg: LeagueState; now: number }) {
  const L = LEAGUES[lg.tier];
  const last = lg.last;
  const zone = zoneInfo(lg);
  const canUp = lg.tier < LEAGUES.length - 1;
  const canDown = lg.tier > 0;
  return (
    <>
      <section class="ar-lghead" style={{ '--lg': L.col } as Record<string, string>}>
        <LeagueBadge tier={lg.tier} big />
        <div class="cmain">
          <div class="ar-lgpos">{lg.rank ? <><b class="num">{lg.rank}.</b> miejsce <small>z {LEAGUE.GROUP}</small></> : 'Jeszcze bez miejsca'}</div>
          <small>Tydzień kończy się za <b>{tfmt(Math.max(0, lg.ends - now))}</b></small>
        </div>
      </section>
      {zone && <div class={`ar-zone ${zone.cls}`}><b>{zone.cls === 'up' ? '▲ ' : zone.cls === 'down' ? '▼ ' : ''}{zone.n}</b><span>{zone.d}</span></div>}
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
      <ul class="ar-rules">
        <li><small>Wygrana</small><b>do {Math.round(LEAGUE.WIN_PTS * 1.5)} pkt</b></li>
        <li><small>Porażka</small><b>{LEAGUE.LOSS_PTS} pkt</b></li>
        <li class="up"><small>Awans</small><b>{canUp ? `top ${LEAGUE.PROMO}` : '—'}</b></li>
        <li class="down"><small>Spadek</small><b>{canDown ? `ostatnie ${LEAGUE.DEMO}` : '—'}</b></li>
      </ul>
      {lg.rows ? (
        <ol class="lgtable ar-table" ref={el => {
          // Gdy twój wiersz jest poza widokiem tabeli — przewiń tak, żeby był w środku.
          const me = el?.querySelector<HTMLElement>('li.me');
          if (!el || !me || el.dataset.done) return;
          el.dataset.done = '1';
          const top = me.getBoundingClientRect().top - el.getBoundingClientRect().top;
          if (top + me.offsetHeight > el.clientHeight) el.scrollTop = top - el.clientHeight / 2;
        }}>
          {lg.rows.map((r, i) => {
            const z = zoneOf(lg.tier, i + 1);
            const head = i === 0 && canUp ? <li key="h-up" class="lg-div up" aria-hidden="true">▲ awans do ligi {LEAGUES[lg.tier + 1].n}</li> : null;
            const mid = canUp && i === LEAGUE.PROMO ? <li key="h-mid" class="lg-div" aria-hidden="true">utrzymanie ligi</li> : null;
            const down = canDown && i === LEAGUE.GROUP - LEAGUE.DEMO ? <li key="h-down" class="lg-div down" aria-hidden="true">▼ spadek do ligi {LEAGUES[lg.tier - 1].n}</li> : null;
            return [head, mid, down, (
              <li key={i} class={`${z}${r.me ? ' me' : ''}`}>
                <span class="pos num">{i + 1}</span>
                <span class="nm">{r.id && !r.me ? <button class="linkbtn" onClick={() => showProfile(r.id!)}>{r.n}</button> : r.me ? 'Ty' : r.n}{r.ghost && <small class="muted"> duch</small>}</span>
                <span class="num">{fmt(r.pts)}</span>
              </li>
            )];
          })}
        </ol>
      ) : <p class="sub">Stocz walkę na arenie, żeby dołączyć do grupy tego tygodnia.</p>}
      <p class="sub ar-foot">Wygrana z silniejszym rywalem daje więcej punktów. Duchy areny zajmują wolne miejsca, gdy graczy jest mało.</p>
      <div class="eyebrow" style={{ marginTop: '4px' }}>Sezon {lg.season.n} · {lg.season.name}</div>
      <p class="sub">
        Kończy się za <b>{tfmt(Math.max(0, lg.season.end - now))}</b>. Klejnoty za najwyższą ligę sezonu
        {lg.season.gems > 0 ? <> — na razie <Res r={{ gems: lg.season.gems }} /></> : <> — od ligi {LEAGUES[1].n} wzwyż</>}. Nowy sezon zaczyna się ligę niżej.
      </p>
      <ul class="lgseason ar-season">
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
      <div class="ar-wallet">
        <TokenIco size={30} />
        <div><b class="num">{fmt(lg.tokens)}</b> <span>Żetonów Areny</span>
          <small>wygrana +{LEAGUE.WIN_TOKENS} · porażka +{LEAGUE.LOSS_TOKENS} · nagroda za miejsce w lidze co tydzień</small></div>
      </div>
      <ul class="gemgrid ar-shop">
        {ARENA_SHOP_IDS.filter(id => arenaShopOpen(s, id)).map(id => {
          const it = ARENA_SHOP[id];
          const used = lg.shop[id] ?? 0;
          const left = Math.max(0, it.day - used);
          const block = arenaShopBlock(s, lg.shop, id, lg.tokens);
          const poor = left > 0 && lg.tokens < it.cost;
          return (
            <li key={id} class={left <= 0 ? 'out' : ''}>
              <Px src={resUrl(ICON[id])} size={30} />
              <b>{it.n}</b>
              {id === 'bilet' && <small>{it.d}</small>}
              <small class="muted">{left > 0 ? `dziś jeszcze ${left}` : 'na dziś wyprzedane'}</small>
              <button class={`btn small${poor ? '' : ' primary'}`} disabled={busy || !!block} title={block ?? undefined} onClick={() => buy(id)}><TokenIco size={14} /> {it.cost}</button>
              {poor && <small class="ar-need">brakuje {it.cost - lg.tokens}</small>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
