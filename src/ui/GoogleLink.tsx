// Konto Google: połączenie postępu z kontem Google (Kodeks, jednorazowe przypomnienie) i odzyskanie kowala
// na nowym telefonie (okno powitalne). Tylko w aplikacji z Google Play.
import { useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import { GoogleCancelled, googleToken } from '../save/google';
import { ServerError, getLink, googleSwitch } from '../save/server';

const errText = (e: unknown) => (e instanceof GoogleCancelled ? '' : e instanceof Error ? e.message : 'Coś poszło nie tak — spróbuj ponownie.');

/** Połącz postęp z kontem Google; gdy to konto Google ma już innego kowala — gracz wybiera, którego zatrzymać. */
export function GoogleLinkBox({ game, online, onDone }: { game: Game; online: boolean; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [clash, setClash] = useState<{ token: string; name: string; forge: number } | null>(null);
  const link = getLink();
  if (!link) return null;

  const connect = async () => {
    setBusy(true); setMsg(''); setClash(null);
    try {
      const token = await googleToken();
      const r = await link.googleLink(token);
      if (r.linked) onDone?.(); // ramka sama pokaże „Połączono z Google”
      else if (r.conflict && r.other) setClash({ token, name: r.other.name || 'bez nicku', forge: r.other.forge });
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  const take = async () => {
    if (!clash) return;
    setBusy(true); setMsg('');
    try {
      await googleSwitch(clash.token);
      setClash(null);
      setMsg(`Gotowe — grasz kowalem ${game.s.name}.`);
      onDone?.();
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };

  if (link.google && !clash) {
    return (
      <div class="gl-box">
        <p class="gl-ok"><b>✓ Połączono z Google.</b> Na nowym telefonie wybierz „Zaloguj przez Google” w oknie powitalnym — wczyta się ten kowal.</p>
        {msg && <p class="sub" role="status">{msg}</p>}
      </div>
    );
  }
  return (
    <div class="gl-box">
      {!clash ? (
        <button class="btn primary small" disabled={!online || busy} onClick={connect}>{busy ? 'Chwila…' : 'Połącz z Google'}</button>
      ) : (
        <div class="confirm" role="alertdialog">
          <span>To konto Google ma już kowala <b>{clash.name}</b> (kuźnia {clash.forge}). Wczytać go? Postęp z tego telefonu ({game.s.name}, kuźnia {game.s.forge.lvl}) przepadnie.</span>
          <div class="btnrow">
            <button class="btn danger small" disabled={busy} onClick={take}>Wczytaj {clash.name}</button>
            <button class="btn small" disabled={busy} onClick={() => { setClash(null); setMsg(`Zostajesz przy kowalu ${game.s.name}. Konto Google zostaje przy kowalu ${clash.name}.`); }}>Zostań tutaj</button>
          </div>
        </div>
      )}
      {msg && <p class="sub" role="status">{msg}</p>}
      {!online && <div class="lockline">Potrzebne połączenie z serwerem.</div>}
    </div>
  );
}

/** Okno powitalne na nowym telefonie: „Grasz już gdzie indziej? Zaloguj przez Google” — wczytuje kowala z konta Google. */
export function GoogleRestore() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const link = getLink();
  if (!link) return null;
  const go = async () => {
    setBusy(true); setMsg('');
    try {
      await googleSwitch(await googleToken());
      // Okno powitalne znika samo, gdy przyjdzie zapis z postępem.
    } catch (e) {
      setMsg(e instanceof ServerError && e.status === 404 ? e.message : errText(e));
    } finally { setBusy(false); }
  };
  return (
    <div class="gl-restore">
      <span>Grasz już na innym telefonie?</span>
      <button type="button" class="btn small" disabled={busy || !link.online} onClick={go}>{busy ? 'Chwila…' : 'Zaloguj przez Google'}</button>
      {msg && <small class="bad" role="status">{msg}</small>}
      {!link.online && <small class="muted">Logowanie zadziała po połączeniu z serwerem.</small>}
    </div>
  );
}

/** Jednorazowe przypomnienie (po pierwszym bossie): zabezpiecz postęp kontem Google. */
export function GoogleAskView({ game, close }: { game: Game; close: () => void }) {
  return (
    <>
      <div class="eyebrow">Konto</div>
      <div class="h">Zabezpiecz postęp</div>
      <p class="sub">Połącz grę z kontem Google. Gdy zmienisz telefon albo zainstalujesz grę od nowa, odzyskasz kowala jednym stuknięciem.</p>
      <GoogleLinkBox game={game} online={!!getLink()?.online} onDone={() => setTimeout(close, 1600)} />
      <button class="btn" onClick={close}>Później</button>
      <small class="muted" style={{ textAlign: 'center' }}>Możesz to zrobić w każdej chwili: Kodeks → Konto.</small>
    </>
  );
}
