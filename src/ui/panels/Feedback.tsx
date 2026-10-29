// Okno „Zgłoś uwagę”: tester pisze, co mu się podoba, co przeszkadza albo co się zepsuło.
import { useState } from 'preact/hooks';
import type { Game } from '../../engine/game';
import { ServerError, getLink } from '../../save/server';
import { reportMeta } from '../report';

export function FeedbackView({ game, close }: { game: Game; close: () => void }) {
  const [kind, setKind] = useState<'uwaga' | 'blad'>('uwaga');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const link = getLink();
  const send = async () => {
    if (!link) return;
    setBusy(true); setMsg('');
    try {
      await link.feedback(kind, text.trim(), reportMeta(game));
      setDone(true);
    } catch (e) {
      setMsg(e instanceof ServerError ? e.message : 'Brak połączenia z serwerem — spróbuj za chwilę.');
    } finally { setBusy(false); }
  };
  if (done) {
    return (
      <>
        <div class="eyebrow">Dziękujemy!</div>
        <div class="h">Zgłoszenie wysłane</div>
        <p class="sub">Każda uwaga pomaga dopracować grę. Możesz wysłać kolejną w dowolnej chwili.</p>
        <button class="btn primary" onClick={close}>Wróć do gry</button>
      </>
    );
  }
  return (
    <>
      <div class="eyebrow">Test gry</div>
      <div class="h">Zgłoś uwagę</div>
      <div class="seg seg2" role="radiogroup" aria-label="Rodzaj zgłoszenia">
        <button role="radio" aria-checked={kind === 'uwaga'} class={kind === 'uwaga' ? 'on' : ''} onClick={() => setKind('uwaga')}>Uwaga lub pomysł</button>
        <button role="radio" aria-checked={kind === 'blad'} class={kind === 'blad' ? 'on' : ''} onClick={() => setKind('blad')}>Coś nie działa</button>
      </div>
      <label class="field" for="fb">
        {kind === 'blad' ? 'Co się stało i co robiłeś chwilę wcześniej?' : 'Co ci się podoba, co przeszkadza, czego brakuje?'}
        <textarea id="fb" class="fb-text" rows={6} maxLength={1000} value={text} onInput={e => setText(e.currentTarget.value)}
          placeholder={kind === 'blad' ? 'Np. po otwarciu Lochów gra się zawiesiła na ekranie…' : 'Np. za długo czekam na ulepszenie kuźni…'} />
      </label>
      <p class="sub">Do zgłoszenia dołączamy wersję gry, model przeglądarki, rozmiar ekranu, twój nick, poziom kuźni i krainę — żeby łatwiej znaleźć problem.</p>
      {msg && <p class="sub" role="alert">{msg}</p>}
      <div class="result-actions">
        <button class="btn" onClick={close}>Anuluj</button>
        <button class="btn primary" disabled={busy || !link?.online || text.trim().length < 5} onClick={send}>{busy ? 'Wysyłanie…' : 'Wyślij'}</button>
      </div>
      {!link?.online && <div class="lockline">Potrzebne połączenie z serwerem.</div>}
    </>
  );
}
