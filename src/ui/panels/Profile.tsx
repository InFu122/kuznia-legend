// Profil gracza: wygląd, tytuł, Moc, ekwipunek (z kartą przedmiotu), statystyki, umiejętności, klan, liga i arena.
// Własny bohater liczy się z gry (także bez serwera), cudzy — z serwera (player_profile).
import { useEffect, useState } from 'preact/hooks';
import { LANDS, MOUNTS, PETS, RAR, SKILLS, SLOT_ORDER, SLOTS } from '../../data';
import { itemUrl, landBgUrl, resUrl, skillUrl } from '../../art/render';
import { fighterStats } from '../../engine/duel';
import { itemName, smithTitle } from '../../engine/formulas';
import type { Game } from '../../engine/game';
import type { Item, SlotId } from '../../engine/types';
import { clanLife } from '../../save/clanlife';
import { getLink, ServerError, type Profile } from '../../save/server';
import { HeroSprite } from '../Arena';
import { Avatar } from '../Avatar';
import { f1, fmt, pct } from '../format';
import { ItemCard } from '../ItemCard';
import { Px } from '../Px';
import { starsText } from '../texts';
import { LeagueBadge } from './League';

function ownProfile(game: Game): Profile {
  const s = game.s;
  const c = clanLife.data?.clan;
  return {
    id: '', me: true, name: s.name, title: smithTitle(s.smith.fame).n, sk: s.look.skin, fr: s.look.frame,
    power: game.stats.power, forge: s.forge.lvl, land: LANDS[s.maxLand].n, maxLand: s.maxLand,
    eq: s.eq, st: fighterStats(game.stats), skills: s.skills.eq.filter((x): x is NonNullable<typeof x> => !!x), pet: s.petSel, mount: s.mountSel,
    clan: c ? { n: c.name, tag: c.tag } : null, arena: null, league: null,
    legacy: s.legacy?.gen ? { gen: s.legacy.gen, stars: s.legacy.stars } : null,
    codex: s.codex.length, ach: Object.values(s.ach).reduce((a, b) => a + (b ?? 0), 0),
  };
}

export function ProfileView({ game, id, close }: { game: Game; id: string | null; close: () => void }) {
  const [p, setP] = useState<Profile | null>(id ? null : ownProfile(game));
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<SlotId | null>(null);
  useEffect(() => {
    if (!id) return;
    const l = getLink();
    if (!l?.online) { setErr('Profil innego gracza wymaga połączenia z serwerem.'); return; }
    let live = true;
    l.playerProfile(id).then(r => { if (live) setP(r); }).catch(e => { if (live) setErr(e instanceof ServerError ? e.message : 'Brak połączenia z serwerem.'); });
    return () => { live = false; };
  }, [id]);

  if (!p) {
    return (
      <>
        <div class="eyebrow">Profil gracza</div>
        <p class="sub" role={err ? 'alert' : undefined}>{err || 'Wczytywanie…'}</p>
        <button class="btn" onClick={close}>Zamknij</button>
      </>
    );
  }
  const st = p.st;
  const stats: [string, string][] = [
    ['Obrażenia', fmt(st.dmg)], ['Zdrowie', fmt(st.hp)], ['Krytyk', pct(st.crit)], ['Obr. krytyczne', pct(st.critd)],
    ['Szybkość ataku', '+' + pct(st.spd)], ['Kradzież życia', pct(st.ls)], ['Unik', pct(st.dodge)], ['Regeneracja', f1(st.regen) + '%/s'],
  ];
  const it = open ? p.eq[open] : null;
  return (
    <>
      <div class="pf-head" style={{ '--bg': `url(${landBgUrl(p.maxLand)})` } as Record<string, string>}>
        <div class="pf-hero" aria-hidden="true"><HeroSprite eq={p.eq as Record<string, Item | null>} skin={p.sk} /></div>
        <div class="pf-id">
          <Avatar skin={p.sk} frame={p.fr} size={46} />
          <div class="pf-name">
            <div class="eyebrow">{p.me ? 'Twój bohater' : 'Profil gracza'}</div>
            <div class="h">{p.name}</div>
            <div class="sub">{p.title}{p.clan ? <> · [{p.clan.tag}] {p.clan.n}</> : null}</div>
          </div>
        </div>
      </div>
      <ul class="pf-badges">
        <li><Px src={resUrl('moc')} size={18} /><span><b>{fmt(p.power)}</b> Mocy</span></li>
        <li><Px src={resUrl('kowadlo')} size={18} /><span>Kuźnia <b>{p.forge}</b></span></li>
        <li><span>Najdalej: <b>{p.land}</b></span></li>
        {p.league !== null && <li><LeagueBadge tier={p.league} small /></li>}
        {p.arena && <li><Px src={resUrl('zeton')} size={18} /><span>Arena <b>{fmt(p.arena.rating)}</b>{p.arena.rank ? ` · #${p.arena.rank}` : ''}</span></li>}
        {p.legacy && <li><span>Pokolenie <b>{p.legacy.gen + 1}</b> · {starsText(p.legacy.stars)}</span></li>}
        <li><span>Kodeks <b>{p.codex}</b> · osiągnięcia <b>{p.ach}</b></span></li>
      </ul>
      <div class="eyebrow">Ekwipunek</div>
      <ul class="pf-eq">
        {SLOT_ORDER.map(sl => {
          const x = p.eq[sl];
          return (
            <li key={sl}>
              <button class={`pf-slot${x ? ' r' + x.r : ' empty'}${open === sl ? ' on' : ''}`} disabled={!x} onClick={() => setOpen(open === sl ? null : sl)}
                aria-label={x ? `${itemName(x)} · ${RAR[x.r].n}` : `${SLOTS[sl].n}: pusto`}>
                {x ? <Px src={itemUrl(x.kind, x.ore, x.r)} size={28} /> : <small>{SLOTS[sl].n}</small>}
                {x && <b>{x.lvl}</b>}
              </button>
            </li>
          );
        })}
      </ul>
      {it ? <ItemCard it={it} history /> : <p class="sub">Dotknij przedmiotu, żeby zobaczyć szczegóły.</p>}
      <div class="eyebrow" style={{ marginTop: '6px' }}>Statystyki</div>
      <div class="stats">{stats.map(([k, v]) => <div class="stat" key={k}><small>{k}</small><b>{v}</b></div>)}</div>
      {(p.skills.length > 0 || p.pet || p.mount) && (
        <div class="pf-extra">
          {p.skills.map(k => <span key={k} class="pf-skill" title={SKILLS[k].n}><Px src={skillUrl(k)} size={22} /><small>{SKILLS[k].n}</small></span>)}
          {p.pet && <span class="pf-skill"><Px src={resUrl('jajo2')} size={22} /><small>{PETS[p.pet].n}</small></span>}
          {p.mount && <span class="pf-skill"><Px src={resUrl('siodlo')} size={22} /><small>{MOUNTS[p.mount].n}</small></span>}
        </div>
      )}
      {!p.me && <p class="sub">Statystyki liczą się z przedmiotów, których pochodzenie sprawdził serwer — tak samo jak na arenie.</p>}
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}
