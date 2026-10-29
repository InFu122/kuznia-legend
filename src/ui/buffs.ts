// Ikony wzmocnień z reklam: ×2 ruda (najlepsza wytapiana ruda) i ×2 złoto.
import type { BuffId } from '../data';
import { oreUrl, resUrl } from '../art/render';
import type { Game } from '../engine/game';
import { bestOre } from '../engine/shop';

export const buffIcon = (game: Game, k: BuffId) => (k === 'ruda' ? oreUrl(bestOre(game.s)) : resUrl('zloto'));
