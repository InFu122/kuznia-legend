// Eksport grafik z silnika gry do grafik sklepu (tools/store): tła krain i lochów, bohater, bossowie, przedmioty.
import { avatarUrl, companionUrl, dungeonBgUrl, foeUrl, heroUrl, itemUrl, oreUrl, resUrl, landBgUrl } from '../../src/art/render';
import { LANDS } from '../../src/data/world';
import type { HeroGear } from '../../src/art/actors';

const out: Record<string, string> = {};
LANDS.forEach((L, i) => { out['land' + i] = landBgUrl(i); out['boss' + i] = foeUrl(L.boss, L.type); out['boss' + i + 'b'] = foeUrl(L.boss, L.type, 1); });
out.land16 = landBgUrl(16);
for (const id of ['skarbiec', 'sztolnia', 'wieza', 'leza', 'oltarze', 'kopalnia', 'labirynt', 'zbrojownia', 'krypta', 'ulepszenie', 'kuznia', 'ev_kuznia', 'ev_lowy', 'ev_upiory', 'arena']) out['d_' + id] = dungeonBgUrl(id);
const gear = (ore: number): HeroGear => ({ bron: { kind: 'Miecz', ore }, helm: { kind: 'Hełm', ore }, zbroja: { kind: 'Napierśnik', ore }, rekawice: { kind: 'Rękawice', ore }, buty: { kind: 'Buty', ore }, pas: { kind: 'Pas', ore } });
for (const ore of [1, 4, 5, 6, 9]) for (const skin of ['zwykly', 'zloty', 'ognisty', 'mistrz'] as const) out[`hero_${ore}_${skin}`] = heroUrl(gear(ore), skin);
for (const ore of [4, 5, 6, 9]) for (const k of ['Miecz', 'Topór', 'Młot', 'Hełm', 'Napierśnik', 'Amulet', 'Pierścień', 'Buty', 'Rękawice']) out[`it_${k}_${ore}`] = itemUrl(k, ore, 6);
for (let o = 0; o < 10; o++) out['ore' + o] = oreUrl(o);
for (const r of ['zloto', 'klejnot', 'jajo0', 'jajo1', 'jajo2', 'jajo3', 'jajo4', 'kowadlo', 'iskra', 'puchar', 'moneta', 'przepustka', 'trofeum', 'runa', 'ksiega', 'zwoj']) out['res_' + r] = resUrl(r);
for (const c of ['wilczek', 'kruk', 'zolw', 'feniks', 'smoczek', 'gryf', 'kon', 'wilk']) { try { out['c_' + c] = companionUrl(c); } catch { /* brak */ } }
out.avatar = avatarUrl('zloty');
(window as unknown as { ART: Record<string, string> }).ART = out;
document.title = 'ok';
