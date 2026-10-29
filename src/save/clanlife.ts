// Życie klanu po stronie gry: ostatni stan z serwera, nagrody i pomoc klanu wliczane do gry, odświeżanie w tle.
import { CLAN } from '../data';
import type { Game } from '../engine/game';
import { rewardText } from '../ui/texts';
import type { ServerReward } from '../engine/clan';
import { getLink, type ClanLife, type ServerLink } from './server';

/** Co ile gra odświeża klan w tle (nagrody, pomoc w ulepszeniu kuźni, poziom klanu). */
export const CLAN_SYNC_MS = 180000;

class ClanLifeStore {
  data: ClanLife | null = null;
  at = 0;
  private listeners = new Set<() => void>();

  on(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /** Nagrody od serwera (klan, wojna, smok) — gra bierze każdą raz. */
  rewards(game: Game, list: ServerReward[] | undefined): void {
    for (const x of game.serverRewards(list || [])) game.notify(`${x.why}: ${rewardText(x.r)}`, 'good');
  }

  /** Wynik z serwera: nagrody, pomoc klanu i poziom klanu trafiają do gry. */
  take(game: Game, r: ClanLife): ClanLife {
    this.rewards(game, r.rewards);
    // Skrót wojny i smoka przychodzi tylko z odświeżenia klanu — akcje go nie zmieniają.
    if (!r.war && this.data?.war) r.war = this.data.war;
    if (!r.raid && this.data?.raid) r.raid = this.data.raid;
    if (r.helped) {
      const add = game.clanHelp(r.helped.lvl, r.helped.n);
      if (add) game.notify(`Klan pomógł w ulepszeniu kuźni: −${add * CLAN.HELP_PCT}% czasu.`, 'good');
    }
    game.setClanLvl(r.clan ? r.lvl ?? 0 : 0);
    this.data = r;
    this.at = Date.now();
    for (const fn of this.listeners) fn();
    return r;
  }

  /** Odświeżenie stanu klanu. */
  async sync(game: Game): Promise<ClanLife | null> {
    const l = getLink();
    if (!l?.online) return null;
    return this.take(game, await l.clanSync(game.s.forge.up || 0));
  }

  /** Akcja klanu na serwerze (datek, atak, pomoc…) — jej wynik od razu trafia do gry. */
  async act(game: Game, fn: (l: ServerLink, up: number) => Promise<ClanLife>): Promise<ClanLife> {
    const l = getLink();
    if (!l) throw new Error('Brak połączenia z serwerem.');
    return this.take(game, await fn(l, game.s.forge.up || 0));
  }

  /** Ile rzeczy czeka w klanie (kropka na zakładce Klan). */
  todo(): number {
    const d = this.data;
    if (!d?.clan || !d.left) return 0;
    return (d.left.don > 0 ? 1 : 0) + (d.left.atk > 0 ? 1 : 0) + ((d.helps ?? []).some(h => !h.done) ? 1 : 0)
      + ((d.war?.atk ?? 0) > 0 ? 1 : 0) + ((d.raid?.left ?? 0) > 0 ? 1 : 0);
  }

  /** Po ataku na smoka albo w bitwie: skrót do kropek bez czekania na odświeżenie klanu. */
  brief(war?: { day: number; atk: number }, raid?: { left: number; done: boolean }): void {
    if (!this.data) return;
    if (war) this.data.war = war;
    if (raid) this.data.raid = raid;
    for (const fn of this.listeners) fn();
  }

  reset(): void {
    this.data = null;
    this.at = 0;
    for (const fn of this.listeners) fn();
  }
}

export const clanLife = new ClanLifeStore();
