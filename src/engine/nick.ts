// Nick gracza, czyli imię kowala: podpis na wykutych przedmiotach, nazwa nad bohaterem, w rankingach i na czacie.
// Te same zasady formatu sprawdza gra (okno powitalne) i serwer; serwer dodatkowo pilnuje unikalności,
// zastrzeżonych słów i wulgaryzmów.
export const NAME_MIN = 3;
export const NAME_MAX = 16;
const NAME_CHARS = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż _.\-]+$/;
const LETTER = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/;
/** Domyślne imię z nowego zapisu — serwer go nie przyjmuje (zastrzeżone), więc znaczy „jeszcze bez nicku”. */
export const DEFAULT_NAME = 'Kowal';
/** Rzeczowniki do nicków nadawanych automatycznie („Iskra_4821”). */
export const NICK_NOUNS = ['Iskra', 'Młot', 'Kowadło', 'Miech', 'Żar', 'Stal', 'Ruda', 'Grot', 'Hart', 'Ogień', 'Kleszcze', 'Topór'];

/** Porządkuje nick: bez nadmiarowych spacji. */
export const tidyName = (n: unknown) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim() : '');

/** Problem z formatem nicku (długość, znaki) albo null. */
export function nickFormatProblem(n: string): string | null {
  if (n.length < NAME_MIN || n.length > NAME_MAX) return `Nick musi mieć od ${NAME_MIN} do ${NAME_MAX} znaków.`;
  if (!NAME_CHARS.test(n)) return 'Nick może zawierać litery, cyfry, spację oraz znaki _ . -';
  if (!LETTER.test(n)) return 'Nick musi zawierać co najmniej jedną literę.';
  return null;
}

/** Propozycja nicku dla nowego gracza (zajętość sprawdza serwer). */
export const suggestNick = (u: () => number = Math.random) =>
  `${NICK_NOUNS[Math.floor(u() * NICK_NOUNS.length)]}_${1000 + Math.floor(u() * 9000)}`;
