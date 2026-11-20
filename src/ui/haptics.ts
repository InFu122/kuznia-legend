// Wibracja telefonu przy rzadkich wytopach: od Rzadkiego wzwyż, tym mocniejsza, im wyższa rzadkość.
// W aplikacji przez wtyczkę Capacitora (Haptics), w przeglądarce przez navigator.vibrate (jeśli jest).
// Wyłącza ją ustawienie „Wibracje” w Kodeksie.
import { rRank } from '../data';
import { isNative } from './pwa';

type HapticsMod = typeof import('@capacitor/haptics');
let mod: HapticsMod | null = null;
const load = async () => (mod ??= await import('@capacitor/haptics'));

/** Wzór wibracji (ms: drganie, przerwa, drganie…) dla rangi rzadkości 0–9. */
export function buzzPattern(rank: number): number[] {
  if (rank < 2) return [];
  if (rank < 4) return [35];                       // Rzadki, Wyjątkowy
  if (rank < 6) return [60, 60, 60];               // Epicki, Heroiczny
  if (rank < 8) return [80, 60, 80, 60, 120];      // Legendarny, Pradawny
  return [100, 60, 100, 60, 100, 60, 220];         // Mityczny, Boski
}

/** Wibracja dla przedmiotu o rzadkości `r` (indeks RAR). `on` — ustawienie gracza. */
export async function buzz(r: number, on = true): Promise<void> {
  const p = buzzPattern(rRank(r));
  if (!on || !p.length) return;
  try {
    if (isNative()) {
      const { Haptics } = await load();
      // Drgania z wzoru po kolei (przerwy co drugi element).
      for (let i = 0; i < p.length; i += 2) {
        await Haptics.vibrate({ duration: p[i] });
        if (i + 1 < p.length) await new Promise(res => setTimeout(res, p[i] + p[i + 1]));
      }
    } else navigator.vibrate?.(p);
  } catch { /* bez wibracji */ }
}
