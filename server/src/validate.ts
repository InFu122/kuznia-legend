// Kontrola zapisu wysłanego przez klienta. Odrzuca wartości, których uczciwa gra nie może wytworzyć.
// Pochodzenie przedmiotów (ziarno wytopu, podpis Obiegu) i tempo rozwoju kuźni sprawdza save.ts.
import {
  ACHIEVEMENTS, B, CLAN, COMPANION_MAX, LANDS, MOUNTS, ORES, PETS, SKILLS, SKILL_MAX, SLOTS, STARS_MAX, SUBS, TECH,
} from '../../src/data';
import { maxJump } from '../../src/engine/formulas';
import type { GameState, Item, SubId } from '../../src/engine/types';

const MAX_ITEM_LVL = 2 * B.FORGE_MAX + 2;
const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const nonNeg = (n: unknown) => fin(n) && n >= 0;

function checkItem(it: Item, where: string, out: string[]): void {
  const bad = (m: string) => out.push(`${where}: ${m}`);
  if (!it || typeof it !== 'object') { bad('brak przedmiotu'); return; }
  if (!SLOTS[it.slot]) bad('nieznany slot');
  if (!fin(it.ore) || !ORES[it.ore]) { bad('nieznana ruda'); return; }
  if (!fin(it.r) || it.r < ORES[it.ore].floor || it.r > Math.min(6, ORES[it.ore].floor + maxJump(it.ore) + 1)) bad(`rzadkość ${it.r} niemożliwa z rudy ${ORES[it.ore].n}`);
  if (!fin(it.lvl) || it.lvl < 1 || it.lvl > MAX_ITEM_LVL) bad(`poziom ${it.lvl}`);
  if (!Array.isArray(it.subs) || it.subs.length > 6) bad('za dużo statystyk dodatkowych');
  else for (const sub of it.subs) {
    const S = SUBS[sub.id as SubId];
    if (!S || !fin(sub.v) || sub.v < 0 || sub.v > S.hi * (1 + 0.15 * 6) + 0.05) bad(`statystyka ${String(sub.id)}=${String(sub.v)}`);
  }
  if (!nonNeg(it.fame)) bad('Sława Czynów');
}

/** Zwraca listę problemów; pusta lista = zapis wiarygodny. */
export function validateSave(s: GameState): string[] {
  const out: string[] = [];
  const bad = (m: string) => out.push(m);
  if (!fin(s.forge.lvl) || s.forge.lvl < 1 || s.forge.lvl > B.FORGE_MAX || Math.floor(s.forge.lvl) !== s.forge.lvl) bad(`poziom kuźni ${s.forge.lvl}`);
  if (s.forge.up && s.forge.up !== s.forge.lvl + 1) bad('ulepszenie kuźni');
  if (!fin(s.maxLand) || s.maxLand < 0 || s.maxLand >= LANDS.length) bad('kraina');
  if (!fin(s.bestG) || s.bestG < 0 || s.bestG > LANDS.length * 10) bad('postęp kampanii');
  for (const k of ['gold', 'books', 'scrolls', 'saddles', 'stones', 'seals'] as const) if (!nonNeg(s[k])) bad(`zasób ${k}`);
  if (!Array.isArray(s.ores) || s.ores.length !== ORES.length || !s.ores.every(nonNeg)) bad('rudy');
  if (!Array.isArray(s.eggs) || !s.eggs.every(nonNeg)) bad('jaja');
  for (const [id, l] of Object.entries(s.tech.lv)) if (!TECH[id as keyof typeof TECH] || !fin(l) || l < 0 || l > TECH[id as keyof typeof TECH].max) bad(`technologia ${id}`);
  for (const [id, l] of Object.entries(s.skills.lv)) if (!SKILLS[id as keyof typeof SKILLS] || !fin(l) || l < 1 || l > SKILL_MAX) bad(`umiejętność ${id}`);
  for (const [id, c] of Object.entries(s.pets)) if (!PETS[id as keyof typeof PETS] || !c || c.lvl < 1 || c.lvl > COMPANION_MAX || c.stars < 0 || c.stars > STARS_MAX) bad(`chowaniec ${id}`);
  for (const [id, c] of Object.entries(s.mounts)) if (!MOUNTS[id as keyof typeof MOUNTS] || !c || c.lvl < 1 || c.lvl > COMPANION_MAX || c.stars < 0 || c.stars > STARS_MAX) bad(`wierzchowiec ${id}`);
  for (const [slot, it] of Object.entries(s.eq)) if (it) { checkItem(it, `ekwipunek/${slot}`, out); if (it.slot !== slot) bad(`ekwipunek/${slot}: zły slot`); }
  if (s.pending) checkItem(s.pending, 'wytop', out);
  for (const it of s.found) checkItem(it, 'znalezisko', out);
  if (!Number.isInteger(s.sx) || s.sx < 0) bad('numer wytopu');
  if (!Array.isArray(s.seeds) || s.seeds.length > 2 * B.SEEDS_RESERVE || !s.seeds.every(x => Number.isInteger(x) && x >= 0 && x <= 0xffffffff)) bad('ziarna wytopu');
  if (!Array.isArray(s.obIn) || s.obIn.length > B.OBIEG_STOCK + 4) bad('zapas Obiegu');
  else s.obIn.forEach(it => checkItem(it, 'Obieg', out));
  if (!Array.isArray(s.obOut) || s.obOut.length > 40) bad('kolejka Obiegu');
  else s.obOut.forEach(it => checkItem(it, 'Obieg', out));
  if (typeof s.name !== 'string' || s.name.length > 16) bad('imię');
  if (!nonNeg(s.clanCoins)) bad('Monety klanowe');
  if (!Array.isArray(s.clanGot) || s.clanGot.length > 200 || !s.clanGot.every(x => typeof x === 'string' && x.length <= 40)) bad('nagrody klanu');
  if (!Array.isArray(s.codex) || s.codex.length > 400 || !s.codex.every(k => typeof k === 'string' && k.length <= 40)) bad('kolekcja');
  for (const [id, n] of Object.entries(s.ach || {})) if (!ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS] || !fin(n) || n < 0 || n > ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS].tiers.length) bad(`osiągnięcie ${id}`);
  for (const [sl, l] of Object.entries(s.runes || {})) if (!SLOTS[sl as keyof typeof SLOTS] || !fin(l) || l < 0 || l > B.RUNE_MAX || Math.floor(l) !== l) bad(`runa ${sl}`);
  if (!s.clanHelp || !fin(s.clanHelp.n) || s.clanHelp.n < 0 || s.clanHelp.n > CLAN.HELP_MAX) bad('pomoc klanu');
  return out;
}

/** Imię kowala bez znaków sterujących i nadmiarowych spacji. */
export function cleanName(name: unknown): string {
  const n = typeof name === 'string' ? name.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) : '';
  return n || 'Kowal';
}
