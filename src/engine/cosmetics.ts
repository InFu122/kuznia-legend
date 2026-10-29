// Wygląd: odblokowane stroje i ramki oraz wybór (tylko ozdoby).
import { FRAMES, SKINS, type FrameId, type SkinId } from '../data';
import type { Ctx } from './context';
import type { GameState } from './types';

/** Dopisuje zdobyte stroje i ramki (bez powtórzeń, tylko znane). Zwraca, czy coś przybyło. */
export function unlockLook(s: GameState, skins: readonly string[] = [], frames: readonly string[] = []): boolean {
  const l = s.look;
  const ns = skins.filter((x): x is SkinId => x in SKINS && !l.skins.includes(x as SkinId));
  const nf = frames.filter((x): x is FrameId => x in FRAMES && !l.frames.includes(x as FrameId));
  if (!ns.length && !nf.length) return false;
  s.look = { ...l, skins: [...l.skins, ...new Set(ns)], frames: [...l.frames, ...new Set(nf)] };
  return true;
}

export function setSkin(ctx: Ctx, id: SkinId): boolean {
  if (!ctx.s.look.skins.includes(id) || ctx.s.look.skin === id) return false;
  ctx.s.look = { ...ctx.s.look, skin: id };
  ctx.dirty = true;
  return true;
}

export function setFrame(ctx: Ctx, id: FrameId): boolean {
  if (!ctx.s.look.frames.includes(id) || ctx.s.look.frame === id) return false;
  ctx.s.look = { ...ctx.s.look, frame: id };
  ctx.dirty = true;
  return true;
}

/** Znany strój albo zwykły (dane od serwera, np. przeciwnik na arenie). */
export const skinOr = (x: unknown): SkinId => (typeof x === 'string' && x in SKINS ? x as SkinId : 'zwykly');
export const frameOr = (x: unknown): FrameId => (typeof x === 'string' && x in FRAMES ? x as FrameId : 'prosta');
