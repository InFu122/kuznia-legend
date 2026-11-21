// Wymuszona aktualizacja: gdy jest nowsza wersja gry (Google Play w aplikacji, nowy build na stronie gry),
// cały ekran zasłania grę i prosi o aktualizację — przy każdej nowej wersji, żeby nikt nie grał na starej.
// Postęp przed pokazaniem ekranu idzie na serwer; po aktualizacji gra liczy czas nieobecności jak zwykle.
import { useEffect, useState } from 'preact/hooks';
import { resUrl } from '../art/render';
import { Px } from './Px';
import { APP_VERSION } from './pwa';
import { holdDim } from './powersave';
import { nativeVersion } from './storeupdate';

export function UpdateWall({ store, onShow, onUpdate }: {
  /** true — aktualizacja z Google Play (aplikacja), false — odświeżenie strony gry. */
  store: boolean;
  /** Raz po pokazaniu ekranu (zapis postępu na serwer). */
  onShow: () => void;
  /** „Aktualizuj” / „Odśwież”. */
  onUpdate: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(APP_VERSION);
  useEffect(() => {
    onShow();
    void nativeVersion().then(v => { if (v) setVer(`${v.name} (${v.code})`); });
    // Ekran nie znika — fokus na przycisku, żeby klawiatura i czytnik ekranu trafiały od razu w aktualizację.
    document.querySelector<HTMLButtonElement>('.upwall .btn')?.focus();
    // Ekran aktualizacji nie przygasa po minucie (gracz czyta i decyduje).
    holdDim(true);
    return () => holdDim(false);
  }, []);
  const go = () => {
    if (busy) return;
    setBusy(true);
    void onUpdate().catch(() => {}).finally(() => setBusy(false));
  };
  return (
    <div class="upwall" role="alertdialog" aria-modal="true" aria-labelledby="upwall-t" aria-describedby="upwall-d"
      onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <div class="uw-card">
        <div class="uw-ic" aria-hidden="true"><Px src={resUrl('kowadlo')} size={56} /></div>
        <div class="eyebrow">Nowa wersja</div>
        <h2 id="upwall-t">Zaktualizuj Kuźnię Legend</h2>
        <p id="upwall-d">
          Jest nowa wersja gry. Żeby grać dalej, {store ? 'zaktualizuj ją w Google Play' : 'odśwież stronę'} —
          to chwila, a postęp jest zapisany i nic nie przepadnie.
        </p>
        <button class="btn primary uw-go" disabled={busy} onClick={go}>
          {busy ? (store ? 'Otwieram Google Play…' : 'Odświeżam…') : store ? 'Aktualizuj' : 'Odśwież'}
        </button>
        <small class="uw-v">Twoja wersja: {ver}</small>
      </div>
    </div>
  );
}
