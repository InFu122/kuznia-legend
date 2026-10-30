// Wygląd: stroje bohatera (kolory włosów, tuniki i spodni oraz płaszcz) i ramki awatara.
// Wyłącznie ozdoby — nie zmieniają statystyk. Zdobywa się je w przepustce, wydarzeniach, ligach, sezonach wojen i za kuźnię.

/** Strój „Złoty Kowal” za ten poziom kuźni (dawniej za Dziedzictwo). */
export const GOLD_SKIN_FORGE = 100;

export type SkinId = 'zwykly' | 'nocny' | 'szkarlat' | 'ognisty' | 'lowca' | 'upiorny' | 'mistrz' | 'zloty';
export type FrameId = 'prosta' | 'przepustka' | 'braz' | 'srebro' | 'zloto' | 'platyna' | 'diament' | 'iskra' | 'szron' | 'widmo' | 'puchar';

/** Znaki palety bohatera: D–F włosy, H–J tunika, P–R spodnie, T–V buty (skóra A–C się nie zmienia). */
export type SkinPal = Partial<Record<'D' | 'E' | 'F' | 'H' | 'I' | 'J' | 'P' | 'Q' | 'R' | 'T' | 'U' | 'V', string>>;
export interface SkinDef { n: string; src: string; pal: SkinPal; cape?: [string, string, string] }

export const SKINS: Record<SkinId, SkinDef> = {
  zwykly: { n: 'Strój kowala', src: 'na start', pal: {} },
  nocny: {
    n: 'Nocny Wędrowiec', src: 'Przepustka Kowala — 20. poziom (darmowa ścieżka)',
    pal: { D: '#2a2a3a', E: '#1c1c2a', F: '#10101a', H: '#3a4a6a', I: '#2a3650', J: '#1c2438', P: '#2a2a36', Q: '#1e1e28', R: '#14141c' },
    cape: ['#3a4a7a', '#26325a', '#18203c'],
  },
  szkarlat: {
    n: 'Szkarłatny Rycerz', src: 'Przepustka Kowala — 30. poziom złotej ścieżki',
    pal: { D: '#e8c070', E: '#c89a48', F: '#8a6428', H: '#8a1e1e', I: '#6a1414', J: '#4a0c0c', P: '#3a2a2a', Q: '#2a1e1e', R: '#1a1212' },
    cape: ['#d8302a', '#a01e1a', '#6a120e'],
  },
  ognisty: {
    n: 'Strój Festiwalu', src: 'wydarzenie Festiwal Kuźni — ostatni próg',
    pal: { D: '#ff8a2a', E: '#d85a14', F: '#9a3a0a', H: '#5a3a2a', I: '#46281c', J: '#2e1a12', P: '#4a3020', Q: '#36221a', R: '#24160e' },
    cape: ['#ffb040', '#ff6a1a', '#b8360a'],
  },
  lowca: {
    n: 'Strój Łowcy', src: 'wydarzenie Wielkie Łowy — ostatni próg',
    pal: { D: '#6a4a2a', E: '#4a321c', F: '#2e1e10', H: '#4a6a3a', I: '#36502a', J: '#24381c', P: '#5a4a32', Q: '#463826', R: '#30261a' },
    cape: ['#e8e0d0', '#b8aa90', '#8a7a60'],
  },
  upiorny: {
    n: 'Strój Upiora', src: 'wydarzenie Noc Upiorów — ostatni próg',
    pal: { D: '#e8eef8', E: '#b8c4d8', F: '#8090a8', H: '#4a3a6a', I: '#382a54', J: '#261c3c', P: '#2a2436', Q: '#1e1a28', R: '#14101c' },
    cape: ['#9a8ae0', '#6a5ab8', '#40347a'],
  },
  mistrz: {
    n: 'Mistrz Areny', src: 'awans do ligi Diament III na arenie',
    pal: { D: '#1a1a1a', E: '#101010', F: '#080808', H: '#5a2a8a', I: '#44206a', J: '#2e144a', P: '#3a3a4a', Q: '#2a2a38', R: '#1c1c26' },
    cape: ['#f2c94c', '#c89a28', '#8a6410'],
  },
  zloty: {
    n: 'Złoty Kowal', src: `Kuźnia — ${GOLD_SKIN_FORGE}. poziom`,
    pal: { D: '#f4e0a0', E: '#d8b860', F: '#a08030', H: '#c8a040', I: '#a07e28', J: '#705418', P: '#5a4a2a', Q: '#46381e', R: '#302612' },
    cape: ['#fff1b8', '#f2c14e', '#b07a1c'],
  },
};
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];

/** Ramka awatara: dwa kolory obramowania (gradient) i opcjonalna poświata. */
export interface FrameDef { n: string; src: string; c1: string; c2: string; glow?: string }
export const FRAMES: Record<FrameId, FrameDef> = {
  prosta: { n: 'Prosta', src: 'na start', c1: '#6a5a4a', c2: '#3a2e24' },
  przepustka: { n: 'Proporzec', src: 'Przepustka Kowala — 10. poziom złotej ścieżki', c1: '#f07a5a', c2: '#8e2420' },
  braz: { n: 'Brązowa', src: 'pierwszy awans w lidze areny', c1: '#e0a070', c2: '#7a4a24' },
  srebro: { n: 'Srebrna', src: 'awans do ligi Srebro', c1: '#f0f4f8', c2: '#8a96a4' },
  zloto: { n: 'Złota', src: 'awans do ligi Złoto', c1: '#fff1b8', c2: '#c8922a', glow: '#f2c94c' },
  platyna: { n: 'Platynowa', src: 'awans do ligi Platyna', c1: '#d8fff6', c2: '#4aa894', glow: '#8fe0d0' },
  diament: { n: 'Diamentowa', src: 'awans do ligi Diament', c1: '#e0f0ff', c2: '#7a5ae0', glow: '#a98bff' },
  iskra: { n: 'Iskry', src: 'wydarzenie Festiwal Kuźni — ostatni próg', c1: '#ffd060', c2: '#c8381a', glow: '#ff7a1a' },
  szron: { n: 'Szron', src: 'wydarzenie Wielkie Łowy — ostatni próg', c1: '#f0faff', c2: '#5a9ac8', glow: '#9ae0ff' },
  widmo: { n: 'Widmo', src: 'wydarzenie Noc Upiorów — ostatni próg', c1: '#e0d8ff', c2: '#5a4a9a', glow: '#9a8ae0' },
  puchar: { n: 'Pucharowa', src: 'sezon wojen — klan w pierwszej trójce', c1: '#fff1b8', c2: '#8a5a32', glow: '#f2c14e' },
};
export const FRAME_IDS = Object.keys(FRAMES) as FrameId[];

/** Ramka za ligę areny (indeks ligi → ramka; Diament III–I mają jedną). */
export const LEAGUE_FRAMES: FrameId[] = ['braz', 'srebro', 'zloto', 'platyna', 'diament', 'diament', 'diament'];
/** Od tej ligi strój Mistrza Areny. */
export const MASTER_SKIN_TIER = 4;
