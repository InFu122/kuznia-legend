// Filtr wulgaryzmów (PL, EN) dla czatu, nicków i nazw klanów. Porównuje słowa po sprowadzeniu
// do małych liter bez polskich znaków i typowych podmian (0→o, 1→i, 3→e, 4→a, @→a, $→s).

const FOLD: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i',
};

/** Małe litery, bez polskich znaków i podmian cyfr. */
export function fold(s: string): string {
  let out = '';
  for (const ch of s.toLowerCase()) out += FOLD[ch] ?? ch;
  return out;
}

/** Rdzenie, które mogą wystąpić w środku słowa. */
const ANYWHERE = [
  'kurw', 'kurew', 'chuj', 'pierd', 'jeba', 'jebi', 'jebn', 'jebc', 'jebal', 'pizd', 'skurw', 'dziwk', 'kutas', 'cwel',
  'czarnuch', 'ciapat', 'fuck', 'shit', 'cunt', 'bitch', 'nigg', 'whore', 'asshole', 'motherf',
];
/** Rdzenie liczone tylko na początku słowa (krótkie, łatwo o fałszywy alarm). */
const START = ['huj', 'jeb', 'cip', 'fiut', 'ciot', 'pedzi', 'fag', 'dick', 'zjeb', 'wyjeb', 'pojeb', 'zajeb', 'odjeb', 'spierd'];

const isBad = (word: string) => {
  const w = fold(word).replace(/[^a-z]/g, '');
  if (!w) return false;
  return ANYWHERE.some(x => w.includes(x)) || START.some(x => w.startsWith(x));
};

/** Zastępuje wulgarne słowa gwiazdkami. */
export function censor(text: string): { text: string; hit: boolean } {
  let hit = false;
  const out = text.replace(/[^\s.,;:!?()"'«»„”\-–—]+/g, w => {
    if (!isBad(w)) return w;
    hit = true;
    return '*'.repeat(Math.min(8, w.length));
  });
  return { text: out, hit };
}

/** Czy nazwa (nick, klan) jest wolna od wulgaryzmów — także po sklejeniu słów („Kur_wa”). */
export const nameClean = (name: string) => !censor(name).hit && !ANYWHERE.some(x => fold(name).replace(/[^a-z]/g, '').includes(x));
