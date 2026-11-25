// Zakładka Klan: wyszukiwanie i zakładanie klanu, a w klanie — ogłoszenie, członkowie z rolami,
// prośby o przyjęcie, ustawienia Przywódcy i odejście z klanu oraz życie klanu (Wspólna Kuźnia, boss, pomoc, sklep).
import { useEffect, useRef, useState } from 'preact/hooks';
import { B, landDef } from '../../data';
import type { Game } from '../../engine/game';
import { getChat } from '../../save/chat';
import { clanLife } from '../../save/clanlife';
import { showProfile } from '../profile';
import { getLink, type ClanInfo, type ClanMember, type ClanMode, type ClanRole, type ClanSummary } from '../../save/server';
import { fmt } from '../format';
import { ClanBossTab, ClanForgeTab, ClanHelpTab, ClanShopTab, errText, useAction, useClanLife, type ClanTab } from './ClanLife';
import { ClanRaidTab, ClanWarTab } from './ClanWar';
import { ClanCard, ClanHero, ClanTabs, ClanToday, ClanWeekCard, EmblemPicker, RoleIcon, icUrl, onClanTab, powerRank, takeClanTab, sortMembers, useEmb } from './ClanUi';
import { Px } from '../Px';

const ROLE: Record<ClanRole, string> = { lider: 'Przywódca', zastepca: 'Zastępca', starszy: 'Starszy', czlonek: 'Członek', prosba: 'Prośba' };
const MODE: Record<ClanMode, string> = { open: 'otwarty', request: 'na prośbę', closed: 'zamknięty' };
const LANG: Record<string, string> = { pl: 'polski', en: 'angielski', de: 'niemiecki', cs: 'czeski', uk: 'ukraiński' };

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
  const [emb, setEmb] = useEmb('nowy', '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: keyof Form) => (e: { currentTarget: { value: string } }) => setF({ ...f, [k]: e.currentTarget.value });
  const submit = async (e: Event) => {
    e.preventDefault();
    const link = getLink();
    if (!link) return;
    setBusy(true); setMsg('');
    try {
      await link.clanCreate({ name: f.name, tag: f.tag, desc: f.desc, mode: f.mode, minPower: Number(f.minPower) || 0, lang: f.lang, emb });
      onDone(`Założono klan ${f.name}.`);
    } catch (x) { setMsg(errText(x)); } finally { setBusy(false); }
  };
  return (
    <form class="settings" onSubmit={submit} style={{ marginTop: '10px' }}>
      <label class="field">Nazwa klanu (3–20 znaków)<input maxLength={20} value={f.name} onInput={set('name')} autoComplete="off" /></label>
      <label class="field">Skrót (2–4 litery lub cyfry)<input class="tag-in" maxLength={4} value={f.tag} onInput={set('tag')} autoComplete="off" /></label>
      <EmblemPicker value={emb} onChange={setEmb} tag={f.tag.toUpperCase()} />
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
        <p class="sub">Klan to wspólny czat, Wspólna Kuźnia z premiami dla wszystkich, boss klanowy, pomoc w ulepszeniach kuźni i sklep klanowy.</p>
        <div class="lockline">Odblokujesz po pokonaniu bossa krainy {landDef(0).n}.</div>
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
        <p class="sub">Do 30 kowali: czat, Wspólna Kuźnia, boss, wojny, smok, Skrzynia tygodnia i sklep. Twoja Moc w rankingu: <b class="num">{fmt(power)}</b></p>
        <form class="chat-in" onSubmit={e => { e.preventDefault(); search(); }} style={{ marginTop: '10px' }}>
          <input aria-label="Szukaj klanu" placeholder="Nazwa klanu…" value={q} onInput={e => setQ(e.currentTarget.value)} />
          <button class="btn small">Szukaj</button>
        </form>
        {msg && <p class="sub" role="status" style={{ marginTop: '8px' }}>{msg}</p>}
        {!list && <p class="sub">Wczytywanie…</p>}
        {list && !list.length && <p class="sub" style={{ marginTop: '8px' }}>{q ? 'Nie ma klanu o takiej nazwie.' : 'Na serwerze nie ma jeszcze klanów — załóż pierwszy.'}</p>}
        {list && list.length > 0 && (
          <ul class="cflist">
            {[...list].sort((a, b) => Number(power < a.minPower || a.mode === 'closed' || a.members >= a.max) - Number(power < b.minPower || b.mode === 'closed' || b.members >= b.max)).map(c => {
              const full = c.members >= c.max;
              const weak = power < c.minPower;
              const label = c.pending ? 'Prośba wysłana' : c.mode === 'closed' ? 'Zamknięty' : full ? 'Pełny' : c.mode === 'request' ? 'Poproś' : 'Dołącz';
              return <ClanCard key={c.id} c={c} mode={MODE[c.mode]} lang={LANG[c.lang] ?? c.lang} weak={weak} label={label}
                disabled={busy || !!c.pending || c.mode === 'closed' || full || weak} onJoin={() => join(c)} />;
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
  const [emb, setEmb] = useEmb(c.id, c.tag, c.emb);
  const [msg, setMsg] = useState('');
  const save = async (e: Event) => {
    e.preventDefault();
    try { await getLink()!.clanSettings({ desc, mode, minPower: Number(minPower) || 0, lang, emb }); done('Zapisano ustawienia klanu.'); } catch (x) { setMsg(errText(x)); }
  };
  return (
    <form class="settings" onSubmit={save} style={{ marginTop: '10px' }}>
      <EmblemPicker value={emb} onChange={setEmb} id={c.id} tag={c.tag} />
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

function MyClan({ game, info, reload, openChat, onTab }: { game: Game; info: ClanInfo; reload: (msg?: string) => void; openChat: () => void; onTab: (t: ClanTab) => void }) {
  const c = info.clan!;
  const me = info.role!;
  const d = useClanLife();
  const wa = useAction();
  const claimWeek = () => wa.run(async () => {
    const r = await clanLife.act(game, (l, up) => l.clanWeekClaim(up));
    const n = r.claimed ?? 0;
    return `Odebrano ${n === 1 ? 'skrzynię' : `${n} skrzynie`} tygodnia — nagrody są już u ciebie.`;
  });
  const topId = d?.week?.top?.uid;
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
  const members = sortMembers(info.members ?? []);
  const rank = powerRank(info.members ?? []);
  const total = (info.members ?? []).reduce((a, m) => a + m.power, 0);
  return (
    <>
      <ClanHero c={c} d={d} members={info.members ?? []} langName={LANG[c.lang] ?? c.lang} />
      <div class="ch-actions">
        <button class="btn primary" onClick={openChat}><Px src={icUrl('okrzyk')} size={18} />Czat klanu</button>
        {me === 'lider' && <button class="btn" aria-expanded={settings} onClick={() => setSettings(!settings)}>Ustawienia</button>}
      </div>
      {settings && <section class="card"><Settings info={info} done={m => { setSettings(false); reload(m); }} /></section>}
      {msg && <p class="sub" role="status">{msg}</p>}
      <ClanToday d={d} onTab={onTab} />
      {d?.week && <ClanWeekCard w={d.week} now={game.ctx.now()} busy={wa.busy} msg={wa.msg} onClaim={claimWeek} />}
      <section class="c-ann">
        <div class="c-ann-h">
          <span class="c-ann-ic"><Px src={icUrl('okrzyk')} size={20} /></span>
          <span class="eyebrow">Ogłoszenie</span>
          {canAnn && !annEdit && <button class="linkbtn" onClick={() => setAnnEdit(true)}>{c.ann ? 'Zmień' : 'Napisz'}</button>}
        </div>
        {annEdit ? (
          <div class="settings" style={{ marginTop: '8px' }}>
            <textarea class="ann-in" maxLength={300} rows={3} value={ann} onInput={e => setAnn(e.currentTarget.value)} aria-label="Treść ogłoszenia" />
            <div class="btnrow"><button class="btn primary small" onClick={saveAnn}>Opublikuj</button><button class="btn small" onClick={() => setAnnEdit(false)}>Anuluj</button></div>
          </div>
        ) : c.ann ? (
          <p class="c-ann-t">{c.ann}<small>— {c.annBy}{c.annT ? `, ${new Date(c.annT).toLocaleDateString('pl-PL')}` : ''}</small></p>
        ) : <p class="sub">Brak ogłoszenia. Piszą je Przywódca i Zastępcy; trafia też na czat klanu.</p>}
      </section>
      {info.requests && info.requests.length > 0 && (
        <section class="card">
          <div class="eyebrow">Chcą dołączyć · {info.requests.length}</div>
          <ul class="mbrlist">
            {info.requests.map(m => (
              <li key={m.id} class="mbr req">
                <span class="mbr-av r-prosba">{m.name.slice(0, 1)}{m.online && <i class="mbr-on" />}</span>
                <div class="mbr-main"><button class="linkbtn pname" onClick={() => showProfile(m.id)}>{m.name}</button><small>Moc {fmt(m.power)}</small></div>
                {me !== 'czlonek' && (
                  <div class="mbr-yn">
                    <button class="btn small primary" disabled={busy} onClick={() => act('accept', m)} aria-label={`Przyjmij ${m.name}`}>✓ Przyjmij</button>
                    <button class="btn small" disabled={busy} onClick={() => act('reject', m)} aria-label={`Odrzuć ${m.name}`}>✕</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section class="card">
        <div class="row">
          <div class="eyebrow">Członkowie · {members.length}/{c.max}</div>
          <span class="tech-cost">Moc klanu: <b class="num">{fmt(total)}</b></span>
        </div>
        <ul class="mbrlist">
          {members.map(m => {
            const acts = actionsFor(me, m);
            return (
              <li key={m.id} class={`mbr${m.me ? ' me' : ''}`}>
                <span class={`mbr-av r-${m.role}`}>{m.name.slice(0, 1)}{m.online && <i class="mbr-on" title="w grze" />}</span>
                <div class="mbr-main">
                  <span class="mbr-nm">
                    <button class="linkbtn pname" onClick={() => showProfile(m.me ? null : m.id)}>{m.name}{m.me ? ' (ty)' : ''}</button>
                    {topId === m.id && <span class="mbr-smith" title="Kowal tygodnia"><Px src={icUrl('kowadlo')} size={12} />Kowal tygodnia</span>}
                  </span>
                  <small><span class={`mbr-role r-${m.role}`}><RoleIcon role={m.role} />{ROLE[m.role]}</span> · Moc {fmt(m.power)}</small>
                  {menu === m.id && (
                    <div class="btnrow" style={{ marginTop: '6px' }}>
                      {acts.map(a => <button key={a} class={`btn small${a === 'kick' ? ' danger' : ''}`} disabled={busy} onClick={() => act(a, m)}>{ACTION_N[a]}</button>)}
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
                <span class={`mbr-rank${(rank.get(m.id) ?? 99) <= 3 ? ' top' : ''}`}>#{rank.get(m.id)}</span>
                {acts.length > 0 && <button class="mbr-more" aria-label={`Zarządzaj: ${m.name}`} aria-expanded={menu === m.id} onClick={() => { setMenu(menu === m.id ? null : m.id); setConfirm(null); }}>⋯</button>}
              </li>
            );
          })}
        </ul>
        <p class="sub" style={{ marginTop: '8px' }}>Przywódca: 1, Zastępcy: do {B.CLAN_DEPUTIES}, Starsi: do {B.CLAN_ELDERS}. Starsi przyjmują nowych, Zastępcy także wyrzucają.</p>
      </section>
      <div class="c-leave">
        {confirm === 'leave' ? (
          <div class="confirm">
            <span>{me === 'lider' && (info.members?.length ?? 0) > 1 ? 'Opuścić klan? Przywództwo przejmie Zastępca, Starszy albo najdawniejszy członek.' : (info.members?.length ?? 0) <= 1 ? 'Jesteś ostatnim członkiem — klan zostanie rozwiązany. Opuścić?' : 'Opuścić klan?'}</span>
            <div class="btnrow"><button class="btn danger small" disabled={busy} onClick={leave}>Tak, opuść</button><button class="btn small" onClick={() => setConfirm(null)}>Anuluj</button></div>
          </div>
        ) : <button class="linkbtn danger-link" onClick={() => setConfirm('leave')}>Opuść klan</button>}
      </div>
    </>
  );
}

const SUB: [ClanTab, string][] = [['klan', 'Klan'], ['wojna', 'Wojna'], ['smok', 'Smok'], ['boss', 'Boss'], ['kuznia', 'Kuźnia'], ['pomoc', 'Pomoc'], ['sklep', 'Sklep']];

/** Zakładki klanu z kropką, gdy coś czeka (datek, atak, komuś można pomóc). */
function ClanSeg({ tab, setTab }: { tab: ClanTab; setTab: (t: ClanTab) => void }) {
  const d = useClanLife();
  const dot: Partial<Record<ClanTab, boolean>> = d?.left ? {
    kuznia: d.left.don > 0, boss: d.left.atk > 0, pomoc: (d.helps ?? []).some(h => !h.done) || (d.ores ?? []).length > 0,
    wojna: (d.war?.atk ?? 0) > 0, smok: (d.raid?.left ?? 0) > 0,
  } : {};
  return <ClanTabs tabs={SUB} tab={tab} dots={dot} setTab={setTab} />;
}

export function ClanPanel({ game, online, openChat }: { game: Game; online: boolean; openChat: () => void }) {
  const [info, setInfo] = useState<ClanInfo | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<ClanTab>(() => takeClanTab() ?? 'klan');
  useEffect(() => onClanTab(t => { takeClanTab(); setTab(t); }), []);
  const reload = (msg?: string) => {
    if (msg) setNote(msg);
    getLink()?.clanInfo()
      .then(i => {
        const changed = (i.clan?.id ?? null) !== (clanLife.data?.clan?.id ?? null);
        setInfo(i); setErr('');
        void getChat()?.setClan(i.clan?.id ?? null, i.clan?.name ?? '', i.clan?.ann ?? '');
        if (changed || Date.now() - clanLife.at > 20000) clanLife.sync(game).catch(() => {});
      })
      .catch(e => setErr(errText(e)));
  };
  /** Pasek zakładek — po zmianie zakładki ekran zostaje na miejscu; gdy pasek był już nad ekranem, wraca do niego. */
  const segRef = useRef<HTMLDivElement>(null);
  const pick = (t: ClanTab) => {
    setTab(t);
    if (Date.now() - clanLife.at > 20000) clanLife.sync(game).catch(() => {});
    requestAnimationFrame(() => {
      const el = segRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
    });
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
      {info && !info.clan && <Finder info={info} reload={reload} />}
      {info?.clan && (
        <>
          <div ref={segRef} class="clan-seg-anchor"><ClanSeg tab={tab} setTab={pick} /></div>
          {tab === 'klan' && <MyClan key={info.clan.id} game={game} info={info} reload={reload} openChat={openChat} onTab={pick} />}
          {tab === 'kuznia' && <ClanForgeTab game={game} />}
          {tab === 'wojna' && <ClanWarTab game={game} />}
          {tab === 'smok' && <ClanRaidTab game={game} />}
          {tab === 'boss' && <ClanBossTab game={game} />}
          {tab === 'pomoc' && <ClanHelpTab game={game} />}
          {tab === 'sklep' && <ClanShopTab game={game} />}
        </>
      )}
    </>
  );
}
