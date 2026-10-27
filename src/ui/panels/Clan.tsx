// Zakładka Klan: wyszukiwanie i zakładanie klanu, a w klanie — ogłoszenie, członkowie z rolami,
// prośby o przyjęcie, ustawienia Przywódcy i odejście z klanu.
import { useEffect, useState } from 'preact/hooks';
import { B, LANDS } from '../../data';
import { getChat } from '../../save/chat';
import { ServerError, getLink, type ClanInfo, type ClanMember, type ClanMode, type ClanRole, type ClanSummary } from '../../save/server';
import { fmt } from '../format';

const ROLE: Record<ClanRole, string> = { lider: 'Przywódca', zastepca: 'Zastępca', starszy: 'Starszy', czlonek: 'Członek', prosba: 'Prośba' };
const MODE: Record<ClanMode, string> = { open: 'otwarty', request: 'na prośbę', closed: 'zamknięty' };
const LANG: Record<string, string> = { pl: 'polski', en: 'angielski', de: 'niemiecki', cs: 'czeski', uk: 'ukraiński' };
const errText = (e: unknown) => (e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.');

type Action = 'accept' | 'reject' | 'kick' | 'promote' | 'demote' | 'transfer';
const ACTION_N: Record<Action, string> = { accept: 'Przyjmij', reject: 'Odrzuć', kick: 'Wyrzuć', promote: 'Awansuj', demote: 'Degraduj', transfer: 'Przekaż przywództwo' };

/** Co aktualny gracz może zrobić z członkiem (te same zasady sprawdza serwer). */
function actionsFor(me: ClanRole, m: ClanMember): Action[] {
  if (m.me) return [];
  if (m.role === 'prosba') return me === 'czlonek' ? [] : ['accept', 'reject'];
  const out: Action[] = [];
  if (me === 'lider') {
    if (m.role === 'czlonek' || m.role === 'starszy') out.push('promote');
    if (m.role === 'zastepca' || m.role === 'starszy') out.push('demote');
    out.push('kick', 'transfer');
  } else if (me === 'zastepca' && (m.role === 'starszy' || m.role === 'czlonek')) out.push('kick');
  return out;
}

interface Form { name: string; tag: string; desc: string; mode: ClanMode; minPower: string; lang: string }

function CreateForm({ onDone }: { onDone: (msg: string) => void }) {
  const [f, setF] = useState<Form>({ name: '', tag: '', desc: '', mode: 'open', minPower: '0', lang: 'pl' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: keyof Form) => (e: { currentTarget: { value: string } }) => setF({ ...f, [k]: e.currentTarget.value });
  const submit = async (e: Event) => {
    e.preventDefault();
    const link = getLink();
    if (!link) return;
    setBusy(true); setMsg('');
    try {
      await link.clanCreate({ name: f.name, tag: f.tag, desc: f.desc, mode: f.mode, minPower: Number(f.minPower) || 0, lang: f.lang });
      onDone(`Założono klan ${f.name}.`);
    } catch (x) { setMsg(errText(x)); } finally { setBusy(false); }
  };
  return (
    <form class="settings" onSubmit={submit} style={{ marginTop: '10px' }}>
      <label class="field">Nazwa klanu (3–20 znaków)<input maxLength={20} value={f.name} onInput={set('name')} autoComplete="off" /></label>
      <label class="field">Skrót (2–4 litery lub cyfry)<input class="tag-in" maxLength={4} value={f.tag} onInput={set('tag')} autoComplete="off" /></label>
      <label class="field">Opis<input maxLength={160} value={f.desc} onInput={set('desc')} autoComplete="off" /></label>
      <div class="form2">
        <label class="field">Wstęp
          <select value={f.mode} onChange={set('mode')}>{(Object.keys(MODE) as ClanMode[]).map(m => <option key={m} value={m}>{MODE[m]}</option>)}</select>
        </label>
        <label class="field">Język
          <select value={f.lang} onChange={set('lang')}>{Object.keys(LANG).map(l => <option key={l} value={l}>{LANG[l]}</option>)}</select>
        </label>
      </div>
      <label class="field">Minimalna Moc<input type="number" min={0} step={100} value={f.minPower} onInput={set('minPower')} /></label>
      <button class="btn primary" disabled={busy || f.name.trim().length < 3 || f.tag.trim().length < 2}>Załóż klan</button>
      {msg && <p class="sub" role="alert">{msg}</p>}
    </form>
  );
}

function Finder({ info, reload }: { info: ClanInfo; reload: (msg?: string) => void }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<ClanSummary[] | null>(null);
  const [power, setPower] = useState(0);
  const [msg, setMsg] = useState('');
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const search = (query = q) => {
    getLink()?.clanList(query).then(r => { setList(r.clans); setPower(r.power); }).catch(e => setMsg(errText(e)));
  };
  useEffect(() => search(''), []);
  const join = async (c: ClanSummary) => {
    setBusy(true); setMsg('');
    try {
      const r = await getLink()!.clanJoin(c.id);
      if (r.joined) reload(`Dołączono do klanu ${c.name}.`);
      else { setMsg(`Wysłano prośbę o przyjęcie do klanu ${c.name}.`); reload(); search(); }
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  const cancel = async (c: ClanSummary) => {
    try { await getLink()!.clanLeave(c.id); reload(`Wycofano prośbę do klanu ${c.name}.`); search(); } catch (e) { setMsg(errText(e)); }
  };
  if (!info.unlocked) {
    return (
      <section class="card">
        <div class="eyebrow">Klany</div>
        <div class="h">Razem raźniej</div>
        <p class="sub">Klan to wspólny czat i — wkrótce — Wspólna Kuźnia, boss klanowy i wojny klanów.</p>
        <div class="lockline">Odblokujesz po pokonaniu bossa krainy {LANDS[0].n}.</div>
      </section>
    );
  }
  return (
    <>
      {info.pending && info.pending.length > 0 && (
        <section class="card">
          <div class="eyebrow">Twoje prośby o przyjęcie</div>
          <ul class="clist">
            {info.pending.map(c => (
              <li key={c.id}>
                <div class="cmain"><div class="cname">{c.name} <span class="ctag">[{c.tag}]</span></div><div class="tech-cost">czeka na decyzję klanu</div></div>
                <button class="btn small" onClick={() => cancel(c)}>Wycofaj</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section class="card">
        <div class="eyebrow">Klany</div>
        <div class="h">Znajdź klan</div>
        <p class="sub">Do 30 kowali, wspólny czat klanu. Twoja Moc w rankingu: <b class="num">{fmt(power)}</b>.</p>
        <form class="chat-in" onSubmit={e => { e.preventDefault(); search(); }} style={{ marginTop: '10px' }}>
          <input aria-label="Szukaj klanu" placeholder="Nazwa klanu…" value={q} onInput={e => setQ(e.currentTarget.value)} />
          <button class="btn small">Szukaj</button>
        </form>
        {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
        {!list && <p class="sub">Wczytywanie…</p>}
        {list && !list.length && <p class="sub" style={{ marginTop: '8px' }}>{q ? 'Nie ma klanu o takiej nazwie.' : 'Na serwerze nie ma jeszcze klanów — załóż pierwszy.'}</p>}
        {list && list.length > 0 && (
          <ul class="clist">
            {list.map(c => {
              const full = c.members >= c.max;
              const weak = power < c.minPower;
              const label = c.pending ? 'Prośba wysłana' : c.mode === 'closed' ? 'Zamknięty' : full ? 'Pełny' : c.mode === 'request' ? 'Poproś' : 'Dołącz';
              return (
                <li key={c.id}>
                  <div class="cmain">
                    <div class="cname">{c.name} <span class="ctag">[{c.tag}]</span></div>
                    <div class="tech-cost">{c.members}/{c.max} · {MODE[c.mode]} · {LANG[c.lang] ?? c.lang}{c.minPower ? ` · Moc od ${fmt(c.minPower)}` : ''}</div>
                    {c.desc && <div class="tech-cost">{c.desc}</div>}
                    {weak && <div class="tech-cost warn">Za mała Moc</div>}
                  </div>
                  <button class="btn small primary" disabled={busy || c.pending || c.mode === 'closed' || full || weak} onClick={() => join(c)}>{label}</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section class="card">
        <div class="row">
          <div><div class="eyebrow">Własny klan</div><div class="h">Załóż klan</div></div>
          {!create && <button class="btn small" onClick={() => setCreate(true)}>Załóż</button>}
        </div>
        <p class="sub">Zostaniesz Przywódcą. Nazwa i skrót muszą być unikalne. Nowy klan możesz założyć raz na dobę.</p>
        {create && <CreateForm onDone={m => { setCreate(false); reload(m); }} />}
      </section>
    </>
  );
}

function Settings({ info, done }: { info: ClanInfo; done: (m: string) => void }) {
  const c = info.clan!;
  const [desc, setDesc] = useState(c.desc);
  const [mode, setMode] = useState<ClanMode>(c.mode);
  const [minPower, setMin] = useState(String(c.minPower));
  const [lang, setLang] = useState(c.lang);
  const [msg, setMsg] = useState('');
  const save = async (e: Event) => {
    e.preventDefault();
    try { await getLink()!.clanSettings({ desc, mode, minPower: Number(minPower) || 0, lang }); done('Zapisano ustawienia klanu.'); } catch (x) { setMsg(errText(x)); }
  };
  return (
    <form class="settings" onSubmit={save} style={{ marginTop: '10px' }}>
      <label class="field">Opis<input maxLength={160} value={desc} onInput={e => setDesc(e.currentTarget.value)} /></label>
      <div class="form2">
        <label class="field">Wstęp<select value={mode} onChange={e => setMode(e.currentTarget.value as ClanMode)}>{(Object.keys(MODE) as ClanMode[]).map(m => <option key={m} value={m}>{MODE[m]}</option>)}</select></label>
        <label class="field">Język<select value={lang} onChange={e => setLang(e.currentTarget.value)}>{Object.keys(LANG).map(l => <option key={l} value={l}>{LANG[l]}</option>)}</select></label>
      </div>
      <label class="field">Minimalna Moc<input type="number" min={0} step={100} value={minPower} onInput={e => setMin(e.currentTarget.value)} /></label>
      <button class="btn primary">Zapisz ustawienia</button>
      {msg && <p class="sub" role="alert">{msg}</p>}
    </form>
  );
}

function MyClan({ info, reload, openChat }: { info: ClanInfo; reload: (msg?: string) => void; openChat: () => void }) {
  const c = info.clan!;
  const me = info.role!;
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ a: Action; m: ClanMember } | 'leave' | null>(null);
  const [annEdit, setAnnEdit] = useState(false);
  const [ann, setAnn] = useState(c.ann);
  const [settings, setSettings] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const canAnn = me === 'lider' || me === 'zastepca';

  const act = async (a: Action, m: ClanMember) => {
    if ((a === 'kick' || a === 'transfer') && !(confirm && confirm !== 'leave' && confirm.a === a && confirm.m.id === m.id)) { setConfirm({ a, m }); return; }
    setBusy(true); setMsg(''); setConfirm(null); setMenu(null);
    try { await getLink()!.clanManage(a, m.id); reload(`${ACTION_N[a]}: ${m.name} — gotowe.`); } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  const leave = async () => {
    setBusy(true);
    try { await getLink()!.clanLeave(); reload(`Opuszczono klan ${c.name}.`); } catch (e) { setMsg(errText(e)); setBusy(false); }
  };
  const saveAnn = async () => {
    try { await getLink()!.clanSettings({ ann }); setAnnEdit(false); reload('Ogłoszenie zapisane.'); } catch (e) { setMsg(errText(e)); }
  };
  const list = (people: ClanMember[]) => (
    <ul class="clist">
      {people.map(m => {
        const acts = actionsFor(me, m);
        return (
          <li key={m.id} class="member">
            <div class="cmain">
              <div class="cname">{m.name}{m.me ? ' (ty)' : ''} <span class={`role r-${m.role}`}>{ROLE[m.role]}</span>{m.online && <span class="online" title="w grze" />}</div>
              <div class="tech-cost">Moc {fmt(m.power)}</div>
              {menu === m.id && (
                <div class="btnrow" style={{ marginTop: '6px' }}>
                  {acts.map(a => <button key={a} class={`btn small${a === 'kick' || a === 'reject' ? ' danger' : ''}`} disabled={busy} onClick={() => act(a, m)}>{ACTION_N[a]}</button>)}
                </div>
              )}
              {confirm && confirm !== 'leave' && confirm.m.id === m.id && (
                <div class="confirm" style={{ marginTop: '6px' }}>
                  <span>{confirm.a === 'kick' ? `Wyrzucić ${m.name} z klanu?` : `Przekazać przywództwo graczowi ${m.name}? Zostaniesz Zastępcą.`}</span>
                  <div class="btnrow">
                    <button class="btn danger small" disabled={busy} onClick={() => act(confirm.a, m)}>Tak</button>
                    <button class="btn small" onClick={() => setConfirm(null)}>Anuluj</button>
                  </div>
                </div>
              )}
            </div>
            {acts.length > 0 && <button class="btn small" aria-expanded={menu === m.id} onClick={() => { setMenu(menu === m.id ? null : m.id); setConfirm(null); }}>{m.role === 'prosba' ? 'Decyzja' : 'Zarządzaj'}</button>}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <section class="card">
        <div class="eyebrow">Klan · [{c.tag}] · {LANG[c.lang] ?? c.lang}</div>
        <div class="h">{c.name}</div>
        {c.desc && <p class="sub">{c.desc}</p>}
        <div class="stats" style={{ marginTop: '10px' }}>
          <div class="stat"><small>Członkowie</small><b>{c.members}/{c.max}</b></div>
          <div class="stat"><small>Twoja rola</small><b>{ROLE[me]}</b></div>
          <div class="stat"><small>Wstęp</small><b>{MODE[c.mode]}{c.minPower ? ` · ${fmt(c.minPower)}` : ''}</b></div>
        </div>
        <div class="btnrow" style={{ marginTop: '10px' }}>
          <button class="btn primary small" onClick={openChat}>Czat klanu</button>
          {me === 'lider' && <button class="btn small" aria-expanded={settings} onClick={() => setSettings(!settings)}>Ustawienia</button>}
        </div>
        {settings && <Settings info={info} done={m => { setSettings(false); reload(m); }} />}
        {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
      </section>
      <section class="card">
        <div class="row">
          <div class="eyebrow">Ogłoszenie klanu</div>
          {canAnn && !annEdit && <button class="linkbtn" onClick={() => setAnnEdit(true)}>{c.ann ? 'Zmień' : 'Napisz'}</button>}
        </div>
        {annEdit ? (
          <div class="settings" style={{ marginTop: '8px' }}>
            <textarea class="ann-in" maxLength={300} rows={3} value={ann} onInput={e => setAnn(e.currentTarget.value)} aria-label="Treść ogłoszenia" />
            <div class="btnrow"><button class="btn primary small" onClick={saveAnn}>Opublikuj</button><button class="btn small" onClick={() => setAnnEdit(false)}>Anuluj</button></div>
          </div>
        ) : c.ann ? (
          <p class="ann">{c.ann}<small> — {c.annBy}{c.annT ? `, ${new Date(c.annT).toLocaleDateString('pl-PL')}` : ''}</small></p>
        ) : <p class="sub">Brak ogłoszenia. Piszą je Przywódca i Zastępcy; trafia też na czat klanu.</p>}
      </section>
      {info.requests && info.requests.length > 0 && (
        <section class="card">
          <div class="eyebrow">Prośby o przyjęcie · {info.requests.length}</div>
          {list(info.requests)}
        </section>
      )}
      <section class="card">
        <div class="eyebrow">Członkowie · {info.members?.length ?? 0}</div>
        <p class="sub">Przywódca: 1, Zastępcy: do {B.CLAN_DEPUTIES}, Starsi: do {B.CLAN_ELDERS}. Starsi przyjmują nowych, Zastępcy także wyrzucają.</p>
        {list(info.members ?? [])}
      </section>
      <section class="card">
        <div class="eyebrow">Wkrótce</div>
        <p class="sub">Wspólna Kuźnia Klanu, boss klanowy, pomoc w ulepszeniach, prośby o rudę i wojny klanów.</p>
      </section>
      <section class="card">
        {confirm === 'leave' ? (
          <div class="confirm">
            <span>{me === 'lider' && (info.members?.length ?? 0) > 1 ? 'Opuścić klan? Przywództwo przejmie Zastępca, Starszy albo najdawniejszy członek.' : (info.members?.length ?? 0) <= 1 ? 'Jesteś ostatnim członkiem — klan zostanie rozwiązany. Opuścić?' : 'Opuścić klan?'}</span>
            <div class="btnrow"><button class="btn danger small" disabled={busy} onClick={leave}>Tak, opuść</button><button class="btn small" onClick={() => setConfirm(null)}>Anuluj</button></div>
          </div>
        ) : <button class="btn danger small" onClick={() => setConfirm('leave')}>Opuść klan</button>}
      </section>
    </>
  );
}

export function ClanPanel({ online, openChat }: { online: boolean; openChat: () => void }) {
  const [info, setInfo] = useState<ClanInfo | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const reload = (msg?: string) => {
    if (msg) setNote(msg);
    getLink()?.clanInfo()
      .then(i => { setInfo(i); setErr(''); void getChat()?.setClan(i.clan?.id ?? null, i.clan?.name ?? '', i.clan?.ann ?? ''); })
      .catch(e => setErr(errText(e)));
  };
  useEffect(() => {
    if (!online) return;
    reload();
    // Odświeżenie, gdy w klanie coś się zmieni (wpis systemowy na czacie klanu) i co minutę.
    const chat = getChat();
    const lastSys = () => chat?.msgs.clan.filter(m => m.k === 'sys' || m.k === 'ann').pop()?.id ?? '';
    let seen = lastSys();
    const off = chat?.on(() => { const id = lastSys(); if (id && id !== seen) { seen = id; reload(); } });
    const t = setInterval(() => reload(), 60000);
    return () => { off?.(); clearInterval(t); };
  }, [online]);
  if (!online) return <section class="card"><div class="eyebrow">Klany</div><p class="sub">Klany i czat działają po połączeniu z serwerem gry.</p></section>;
  return (
    <>
      {note && <div class="toastline" role="status">{note}</div>}
      {err && <section class="card"><p class="sub" role="alert">{err}</p><button class="btn small" onClick={() => reload()}>Spróbuj ponownie</button></section>}
      {!info && !err && <section class="card"><p class="sub">Wczytywanie klanu…</p></section>}
      {info && (info.clan ? <MyClan key={info.clan.id} info={info} reload={reload} openChat={openChat} /> : <Finder info={info} reload={reload} />)}
    </>
  );
}
