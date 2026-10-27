import { TECH, TECH_BRANCHES, TECH_IDS, TECH_UNLOCK_FORGE } from '../../data';
import { techUrl } from '../../art/render';
import { Px } from '../Px';
import type { Game } from '../../engine/game';
import { techBlock, techCost, techLvl, techText, techValue, type TechBlock } from '../../engine/tech';
import type { TechId } from '../../engine/types';
import { fmt, tfmt } from '../format';
import { books, booksShort } from '../texts';

const BLOCK: Record<Exclude<TechBlock, null>, string> = {
  max: 'Maks.',
  forge: '',
  busy: 'Trwa badanie',
  books: 'Za mało Ksiąg',
  gold: 'Za mało złota',
};

/** Jednostka efektu wzięta z opisu (np. „%” albo „ min”). */
const unit = (id: TechId) => { const after = TECH[id].d.split('{v}')[1] ?? ''; return after.startsWith('%') ? '%' : after.startsWith(' min') ? ' min' : ''; };

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
            {block === 'forge' ? `Od ${Math.max(T.req, TECH_UNLOCK_FORGE)}. poziomu kuźni` : `${booksShort(c.books)} · ${fmt(c.gold)} zł. · ${tfmt(c.ms)}`}
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
          <span class="keys">{books(s.books)}</span>
        </div>
        {cur ? (
          <>
            <p class="sub">Badanie: <b>{TECH[cur.id].n}</b>, poziom {techLvl(s, cur.id) + 1} · zostało {tfmt(cur.left)}</p>
            <div class="bar" style={{ marginTop: '6px' }}><i style={{ width: Math.max(0, (1 - cur.left / cur.total) * 100) + '%' }} /></div>
          </>
        ) : <p class="sub">Jedno badanie naraz. Czas biegnie także, gdy nie grasz.</p>}
        <p class="sub" style={{ marginTop: '6px' }}>Księgi Wiedzy wypadają z bossów (najwięcej za pierwsze pokonanie), rzadko z fal wrogów i co 5 pięter Wieży Wyzwań.</p>
      </section>
      {TECH_BRANCHES.map(br => (
        <section class="card" key={br.id}>
          <div class="eyebrow">{br.n}</div>
          <ul class="techs">{TECH_IDS.filter(id => TECH[id].branch === br.id).map(id => <TechRow key={id} game={game} id={id} />)}</ul>
        </section>
      ))}
    </>
  );
}
