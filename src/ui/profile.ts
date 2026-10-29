// Otwieranie profilu gracza z dowolnego miejsca (ranking, arena, klan, czat) — okno nad bieżącym oknem.
type Fn = (id: string | null) => void;
let fn: Fn | null = null;

/** App rejestruje tu, jak pokazać profil. */
export function onProfile(f: Fn): () => void {
  fn = f;
  return () => { if (fn === f) fn = null; };
}
/** Profil gracza o identyfikatorze `id` (`null` — własny bohater). */
export const showProfile = (id: string | null) => fn?.(id);
