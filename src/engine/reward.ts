import type { Ctx } from './context';
import { unlockLook } from './cosmetics';
import type { ElemKey, Reward, SetId } from './types';

/** Przyznaje nagrodę (złoto, Księgi, rudy, domieszki, rudy unikalne, Zwoje, jaja, Siodła, Kamienie, Pieczęcie). */
export function grant(ctx: Ctx, r: Reward): void {
  const s = ctx.s;
  s.gold += r.gold ?? 0;
  s.books += r.books ?? 0;
  s.scrolls += r.scrolls ?? 0;
  s.saddles += r.saddles ?? 0;
  s.stones += r.stones ?? 0;
  s.seals += r.seals ?? 0;
  s.clanCoins += r.coins ?? 0;
  s.gems += r.gems ?? 0;
  for (const [k, v] of Object.entries(r.ores ?? {})) s.ores[Number(k)] += v ?? 0;
  for (const [k, v] of Object.entries(r.els ?? {})) s.els[k as ElemKey] = (s.els[k as ElemKey] ?? 0) + (v ?? 0);
  for (const [k, v] of Object.entries(r.uniq ?? {})) s.uniq[k as SetId] = (s.uniq[k as SetId] ?? 0) + (v ?? 0);
  for (const [k, v] of Object.entries(r.eggs ?? {})) s.eggs[Number(k)] += v ?? 0;
  if (r.skins?.length || r.frames?.length) unlockLook(s, r.skins, r.frames);
  ctx.dirty = true;
}
