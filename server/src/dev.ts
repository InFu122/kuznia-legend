// Narzędzia dewelopera po stronie serwera: tylko dla kont z pliku sekrety/dev.txt (zob. isDev w common.ts).
// Klejnoty prowadzi serwer (portfel Nakamy), więc „wszystko na maksimum” w grze prosi serwer o ich dopisanie.
import { UNAUTH, err, isDev, parse, userOf } from './common';
import { walletAdd } from './shop';

/** Dopisuje deweloperowi Klejnoty (najwyżej 100 000 naraz). */
export function rpcDevGems(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const userId = userOf(ctx);
  if (!isDev(nk, userId)) throw err('Narzędzia dewelopera są tylko dla kont z pliku sekrety/dev.txt na serwerze.', UNAUTH);
  const n = Math.max(0, Math.min(100000, Math.floor(Number(parse(payload).n)) || 0));
  const gems = walletAdd(nk, userId, 'gems', n, 'dev');
  logger.info('Deweloper %s: +%d Klejnotów', userId, n);
  return JSON.stringify({ gems });
}
