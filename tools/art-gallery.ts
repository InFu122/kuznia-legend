// Galeria pixel artu (strona HTML do przeglądu): npx vite-node tools/art-gallery.ts plik.html
import { writeFileSync } from 'node:fs';
import { ELEM, ORES, SETS, SKILLS, TECH, TECH_BRANCHES, RAR } from '../src/data';
import { ELEM_ICONS, ORE_ICONS, RES_ICONS, SET_ORE_ICONS, SKILL_ICONS, TECH_ICONS, type IconData } from '../src/art/icons-data';
import { ITEM_KINDS, METALS, itemPalette, itemSprite, tierOf } from '../src/art/items';
import { rgba, sprite, type Palette, type Sprite } from '../src/art/pixel';
import { png } from './png';

const out = process.argv[2] || 'galeria.html';
const uri = (s: Sprite, p: Palette) => 'data:image/png;base64,' + png(s.w, s.h, rgba(s, p)).toString('base64');
const ic = (d: IconData) => uri(sprite(d.rows), d.pal);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tile = (src: string, name: string, sub = '', size = 16) =>
  `<figure class="tile"><img src="${src}" width="${size}" height="${size}" style="--s:${size}" alt="${esc(name)}"><figcaption>${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</figcaption></figure>`;

const RES_N: Record<string, string> = {
  zloto: 'Złoto', ksiega: 'Księga Wiedzy', zwoj: 'Zwój zaklęć', siodlo: 'Siodło', kamien: 'Kamień', pieczec: 'Pieczęć Legendy',
  jajo0: 'Jajo zwykłe', jajo1: 'Jajo niepospolite', jajo2: 'Jajo rzadkie', jajo3: 'Jajo epickie', jajo4: 'Jajo legendarne',
};
const TIER_N = ['proste', 'zdobione', 'mistrzowskie'];

const ores = ORES.map((o, i) => tile(ic(ORE_ICONS[String(i)]), o.n, `wytop od ${o.lvl}. poz. kuźni`)).join('');
const elems = (Object.keys(ELEM) as (keyof typeof ELEM)[]).map(k => tile(ic(ELEM_ICONS[k]), ELEM[k].n, ELEM[k].el)).join('');
const sets = (Object.keys(SETS) as (keyof typeof SETS)[]).map(k => tile(ic(SET_ORE_ICONS[k]), SETS[k].ore, SETS[k].n)).join('');
const res = Object.keys(RES_ICONS).map(k => tile(ic(RES_ICONS[k]), RES_N[k] ?? k)).join('');
const skills = (Object.keys(SKILLS) as (keyof typeof SKILLS)[]).map(k => tile(ic(SKILL_ICONS[k]), SKILLS[k].n, RAR[SKILLS[k].r].n, 24)).join('');
const techs = TECH_BRANCHES.map(b => `<div class="branch"><h3>${esc(b.n)}</h3><div class="tiles">${
  (Object.keys(TECH) as (keyof typeof TECH)[]).filter(k => TECH[k].branch === b.id).map(k => tile(ic(TECH_ICONS[k]), TECH[k].n, '', 20)).join('')}</div></div>`).join('');

const head = `<tr><th scope="col"></th>${METALS.map((m, i) => `<th scope="col">${esc(m.n)}<small>${TIER_N[tierOf(i)]}</small></th>`).join('')}</tr>`;
const body = ITEM_KINDS.map(k => `<tr><th scope="row">${esc(k)}</th>${METALS.map((_, i) =>
  `<td><img src="${uri(itemSprite(k, tierOf(i)), itemPalette(i))}" width="16" height="16" style="--s:16" alt="${esc(k)} — ${esc(METALS[i].n)}"></td>`).join('')}</tr>`).join('');

const html = `<title>Grafiki Kuźni Legend</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Grenze+Gotisch:wght@500;700&display=swap">
<style>
/* Układ: katalog warsztatu — jedna kolumna sekcji, sprite'y na płytach jak w grze, przełącznik powiększenia u góry. Jeden ciemny motyw, jak w grze. */
:root{
  color-scheme: dark;
  --iron:#13171c; --plate:#1b2128; --plate-2:#232b34; --rivet:#33404c; --ash:#8f9aa7; --frost:#e9edf1; --straw:#e7be62;
  --f-display:"Grenze Gotisch", "Times New Roman", Georgia, serif;
  --f-ui:"Barlow", "Segoe UI", system-ui, sans-serif;
  --zoom:3;
}
body{background:var(--iron); color:var(--frost); font-family:var(--f-ui); font-size:15px; line-height:1.45;
  padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); padding-block:24px 48px}
.wrap{max-width:980px; margin:0 auto; display:flex; flex-direction:column; gap:28px}
header{display:flex; flex-direction:column; gap:10px}
h1{font-family:var(--f-display); font-weight:700; color:var(--straw); font-size:clamp(34px, 7vw, 54px); line-height:1; margin:0; text-wrap:balance}
.lead{color:var(--ash); max-width:65ch; margin:0}
.zoom{display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:13px; color:var(--ash)}
.zoom button{font:inherit; color:var(--frost); background:var(--plate-2); border:1px solid var(--rivet); border-radius:8px; padding:6px 12px; cursor:pointer}
.zoom button[aria-pressed="true"]{border-color:var(--straw); color:var(--straw)}
.zoom button:focus-visible{outline:2px solid var(--straw); outline-offset:2px}
section{display:flex; flex-direction:column; gap:12px}
h2{font-family:var(--f-display); font-weight:500; font-size:30px; margin:0; line-height:1.1}
h2 + p{margin:0; color:var(--ash); max-width:65ch}
h3{font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--ash); margin:0 0 8px; font-weight:600}
.tiles{display:grid; grid-template-columns:repeat(auto-fill, minmax(max(108px, calc(16px * var(--zoom) + 40px)), 1fr)); gap:8px}
.tile{margin:0; background:var(--plate); border:1px solid var(--rivet); border-radius:10px; padding:12px 8px 10px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; min-width:0}
.tile figcaption{font-size:13px; font-weight:600; line-height:1.2; hyphens:auto; overflow-wrap:break-word}
.tile small{display:block; font-weight:400; color:var(--ash); font-size:12px; margin-top:2px}
img{image-rendering:pixelated; width:calc(var(--s) * var(--zoom) * 1px); height:auto; max-width:100%}
.branch + .branch{margin-top:12px}
.table-wrap{overflow-x:auto; border:1px solid var(--rivet); border-radius:12px; background:var(--plate)}
table{border-collapse:collapse; width:100%}
th, td{padding:8px; text-align:center}
thead th{font-size:12px; font-weight:600; color:var(--frost); vertical-align:bottom; border-bottom:1px solid var(--rivet)}
thead small{display:block; color:var(--ash); font-weight:400}
tbody th{text-align:left; font-weight:600; font-size:14px; white-space:nowrap; padding-left:14px}
tbody tr + tr td, tbody tr + tr th{border-top:1px solid var(--plate-2)}
.rar{display:flex; gap:6px; flex-wrap:wrap}
.rar span{font-size:12px; font-weight:600; border:1px solid var(--rivet); border-left:3px solid var(--c); border-radius:6px; padding:3px 8px}
@media (prefers-reduced-motion: no-preference){ img{transition:width .15s} }
</style>
<div class="wrap" lang="pl">
  <header>
    <h1>Grafiki Kuźni Legend</h1>
    <p class="lead">Pixel art do gry: rudy, domieszki, rudy unikalne, zasoby, cały ekwipunek w 7 metalach, umiejętności i badania. Przedmioty mają trzy poziomy zdobień — im lepsza ruda, tym bogatsza forma. W grze ikony mają rozmiar ok. 48 px (×3).</p>
    <div class="zoom" role="group" aria-label="Powiększenie">Powiększenie:
      <button type="button" id="z2" data-z="2" aria-pressed="false">×2</button>
      <button type="button" id="z3" data-z="3" aria-pressed="true">×3 (jak w grze)</button>
      <button type="button" id="z5" data-z="5" aria-pressed="false">×5</button>
      <button type="button" id="z8" data-z="8" aria-pressed="false">×8</button>
    </div>
  </header>
  <section><h2>Rudy</h2><p>Siedem rud głównych — od bryłki Miedzi po odłamek Gwiezdnego Kruszcu.</p><div class="tiles">${ores}</div></section>
  <section><h2>Domieszki żywiołów</h2><p>Dodawane przy wytopie od 10. poziomu kuźni.</p><div class="tiles">${elems}</div></section>
  <section><h2>Rudy unikalne</h2><p>Z bossów krain; każda daje część jednego zestawu.</p><div class="tiles">${sets}</div></section>
  <section><h2>Zasoby</h2><div class="tiles">${res}</div></section>
  <section>
    <h2>Ekwipunek</h2>
    <p>12 rodzajów przedmiotów × 7 metali. Ten sam rysunek przemalowuje paleta rudy; Srebro, Mithril i Adamantyt dostają złote zdobienia i klejnot, Smocza Stal i Gwiezdny Kruszec — formę mistrzowską.</p>
    <div class="table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <div class="rar" aria-label="Kolory rzadkości (ramki w grze)">${RAR.map((r, i) => `<span style="--c:${['#a6afb9', '#63c470', '#55a2f2', '#b281f2', '#f39d40', '#ef5d56', '#f5da74'][i]}">${esc(r.n)}</span>`).join('')}</div>
  </section>
  <section><h2>Umiejętności</h2><p>Ikony 24×24 z tłem w barwie żywiołu.</p><div class="tiles">${skills}</div></section>
  <section><h2>Badania</h2><p>Odznaki 20×20; kolor ramki to gałąź Akademii Kowalskiej.</p>${techs}</section>
</div>
<script>
(function () {
  var root = document.documentElement;
  var btns = document.querySelectorAll('.zoom button');
  function set(z) {
    root.style.setProperty('--zoom', z);
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.z === String(z))); });
    try { localStorage.setItem('zoom', String(z)); } catch (e) {}
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.z); }); });
  try { var z = localStorage.getItem('zoom'); if (z) set(z); } catch (e) {}
})();
</script>
`;
writeFileSync(out, html);
console.log('zapisano', out, Math.round(html.length / 1024), 'KB');
