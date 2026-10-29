import { useState } from 'preact/hooks';
import { TECH, TECH_BRANCHES, TECH_IDS, TECH_UNLOCK_FORGE } from '../../data';
import { resUrl, techUrl } from '../../art/render';
import { Costs, Px } from '../Px';
import type { Game } from '../../engine/game';
import { techBlock, techCost, techLvl, techText, techValue, type TechBlock } from '../../engine/tech';
import type { TechId } from '../../engine/types';
import { fmt, tfmt } from '../format';
import { books, booksShort } from '../texts';
import { SpeedupButton } from './Shop';

const BLOCK: Record<Exclude<TechBlock, null>, string> = {
  max: 'Maks.',
  forge: '',
  busy: 'Trwa badanie',
  books: 'Za mało Ksiąg',
  gold: 'Za mało złota',
};

/** Jednostka efektu wzięta z opisu (np. „%” albo „ min”). */
const unit = (id: TechId) => { const after = TECH[id].d.split('{v}')[1] ?? ''; return after.startsWith('%') ? '%' : after.startsWith(' min') ? ' min' : ''; };

/** Węzeł drzewka: ikona, nazwa i poziom. Dotknięcie pokazuje szczegóły i przycisk badania. */
function TechNode({ game, id, on, pick }: { game: Game; id: TechId; on: boolean; pick: (id: TechId) => void }) {
  const s = game.s;
  const T = TECH[id];
  const l = techLvl(s, id);
  const block = techBlock(s, id);
  const cur = s.tech.cur?.id === id;
  const cls = ['tnode', on ? 'on' : '', l >= T.max ? 'max' : '', block === 'forge' ? 'locked' : '', cur ? 'busy' : '', !block ? 'can' : ''].filter(Boolean).join(' ');
  return (
    <button class={cls} onClick={() => pick(id)} aria-pressed={on} aria-label={`${T.n}, poziom ${l} z ${T.max}`}>
      <Px src={techUrl(id)} size={32} />
      <span class="tn-n">{T.n}</span>
      <span class="tn-l">{block === 'forge' ? `od ${Math.max(T.req, TECH_UNLOCK_FORGE)}. poz.` : cur ? 'w toku' : `${l}/${T.max}`}</span>
      <i class="tn-bar"><i style={{ width: (l / T.max) * 100 + '%' }} /></i>
    </button>
  );
}

function TechRow({ game, id }: { game: Game; id: TechId }) {
  const s = game.s;
  const T = TECH[id];
  const l = techLvl(s, id);
  const block = techBlock(s, id);
  const c = techCost(id, l);
  const cur = s.tech.cur?.id === id;
  return (
    <li class={`tech${block === 'forge' ? ' locked' : ''}`}>
      <Px src={techUrl(id)} size={40} cls="row-ic" />
      <div class="tech-main">
        <div class="tech-n">{T.n} <span class="muted">· {l}/{T.max}</span></div>
        <div class="sub">
          {l === 0 ? `Poziom 1: ${techText(id, 1)}` : techText(id, l)}
          {l > 0 && l < T.max ? ` · następny poziom: ${techValue(id, l + 1)}${unit(id)}` : ''}
        </div>
        {block !== 'max' && (
          <div class="tech-cost">
            {block === 'forge' ? `Od ${Math.max(T.req, TECH_UNLOCK_FORGE)}. poziomu kuźni` : (
              <Costs items={[[resUrl('ksiega'), booksShort(c.books)], [resUrl('zloto'), `${fmt(c.gold)} zł.`], [resUrl('czas'), tfmt(c.ms)]]}
                cls={block === 'books' ? 'lack-0' : block === 'gold' ? 'lack-1' : ''} />
            )}
          </div>
        )}
      </div>
      {cur ? <span class="tech-busy">W toku</span> : (
        <button class="btn small primary" disabled={!!block} onClick={() => game.research(id)}>
          {block ? BLOCK[block] || 'Zablokowane' : 'Badaj'}
        </button>
      )}
    </li>
  );
}

export function ResearchPanel({ game }: { game: Game }) {
  const s = game.s;
  const cur = s.tech.cur;
  const [sel, setSel] = useState<TechId | null>(null);
  // Domyślnie: trwające badanie albo pierwsze, które można teraz zbadać.
  const shown = sel ?? cur?.id ?? TECH_IDS.find(id => !techBlock(s, id)) ?? TECH_IDS[0];
  if (s.forge.lvl < TECH_UNLOCK_FORGE) {
    return (
      <section class="card">
        <div class="eyebrow">Nauka</div>
        <div class="h">Akademia Kowalska</div>
        <p class="sub">Akademia otwiera się na {TECH_UNLOCK_FORGE}. poziomie kuźni. Badania kosztują Księgi Wiedzy i złoto, a dają stałe premie do kucia, walki i zarobku.</p>
        <p class="sub">Księgi Wiedzy masz już teraz: {books(s.books)}. Wypadają z bossów, z fal wrogów (rzadko) i z Wieży Wyzwań.</p>
      </section>
    );
  }
  return (
    <>
      <section class="card">
        <div class="row">
          <div>
            <div class="eyebrow">Nauka</div>
            <div class="h">Akademia Kowalska</div>
          </div>
          <span class="keys bookbal"><Px src={resUrl('ksiega')} size={24} />{fmt(s.books)}<small>{booksShort(s.books).replace(/^[\d\s ]+/, '')}</small></span>
        </div>
        {cur ? (
          <>
            <div class="row tech-now">
              <Px src={techUrl(cur.id)} size={40} />
              <div class="cmain"><b>{TECH[cur.id].n}</b> · poziom {techLvl(s, cur.id) + 1}<div class="tech-cost"><Costs items={[[resUrl('czas'), `zostało ${tfmt(cur.left)}`]]} /></div></div>
            </div>
            <div class="bar" style={{ marginTop: '6px' }}><i style={{ width: Math.max(0, (1 - cur.left / cur.total) * 100) + '%' }} /></div>
            <SpeedupButton game={game} what="tech" />
          </>
        ) : <p class="sub">Jedno badanie naraz. Czas biegnie także, gdy nie grasz.</p>}
        <p class="sub" style={{ marginTop: '6px' }}>Księgi Wiedzy wypadają z bossów (najwięcej za pierwsze pokonanie), rzadko z fal wrogów i co 5 pięter Wieży Wyzwań.</p>
      </section>
      <section class="card tech-tree" aria-label="Drzewka badań">
        <div class="tt-cols">
          {TECH_BRANCHES.map(br => (
            <div class="tt-col" key={br.id}>
              <div class="tt-h">{br.n}</div>
              {TECH_IDS.filter(id => TECH[id].branch === br.id).sort((a, b) => TECH[a].req - TECH[b].req).map(id => (
                <TechNode key={id} game={game} id={id} on={id === shown} pick={setSel} />
              ))}
            </div>
          ))}
        </div>
      </section>
      {shown && (
        <section class="card tech-detail">
          <div class="eyebrow">{TECH_BRANCHES.find(b => b.id === TECH[shown].branch)?.n} · szczegóły</div>
          <ul class="techs"><TechRow game={game} id={shown} /></ul>
        </section>
      )}
    </>
  );
}
