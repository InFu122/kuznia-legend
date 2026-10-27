import type { ComponentChildren, JSX } from 'preact';
import { B, DUNGEONS, ELEM, FORGE_UNLOCKS, LANDS, ORES, RAR, ROMAN, SETS, SET_FORGE_LVL, TECH, TECH_UNLOCK_FORGE, setOfLand } from '../data';
import { baseName, dist, itemName, jumpChances } from '../engine/formulas';
import type { Game } from '../engine/game';
import { techMods } from '../engine/mods';
import type { ModalData } from '../engine/types';
import { ItemCard } from './ItemCard';
import { fmt, pct, tfmt } from './format';
import { Dist } from './panels/Forge';
import { books, rewardText } from './texts';

export function ModalShell({ locked, onClose, children }: { locked: boolean; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="modal" onClick={e => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div class="modal-box" role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

const Close = ({ onClose, label }: { onClose: () => void; label: string }) => <button class="btn primary" onClick={onClose}>{label}</button>;

export function ModalView({ m, game, close }: { m: ModalData; game: Game; close: () => void }): JSX.Element {
  const s = game.s;
  switch (m.kind) {
    case 'intro':
      return (
        <>
          <div class="eyebrow">Wersja rozwojowa</div>
          <div class="h">Kuźnia Legend</div>
          <p class="sub">Jesteś ostatnim mistrzem kowalskim upadłego królestwa. Bohater walczy sam, a ty przetapiasz rudy z walki na ekwipunek.</p>
          <ul class="list">
            <li>Każda ruda gwarantuje minimalną rzadkość, a kuźnia daje szansę na przeskok wyżej.</li>
            <li>Założone przedmioty zbierają Sławę Czynów i w końcu budzą się z własnym imieniem.</li>
            <li>Na 10. etapie każdej krainy czeka boss — wyzwij go, gdy będziesz gotów.</li>
          </ul>
          <Close onClose={close} label="Rozpal kuźnię" />
        </>
      );
    case 'boss': {
      const L = LANDS[m.land];
      const next = m.land < LANDS.length - 1 ? LANDS[m.land + 1] : null;
      const set = setOfLand(m.land);
      return (
        <>
          <div class="eyebrow">Boss pokonany</div>
          <div class="h">{L.boss}</div>
          <p class="sub">
            Łup: {fmt(m.gold)} złota, {m.n} × {ORES[L.rare].n}, {books(m.books)}
            {set && m.uniq ? <>, {m.uniq} × <b style={{ color: SETS[set].col }}>{SETS[set].ore}</b></> : null}.
            {m.found ? ' Ze skrzyni bossa wypadł przedmiot z Wielkiego Obiegu — sprawdź go w Kuźni.' : ''}
          </p>
          {set && m.uniq > 0 && (
            <p class="sub">{SETS[set].ore} to ruda unikalna: od {SET_FORGE_LVL}. poziomu kuźni wytopisz z niej część zestawu <b>{SETS[set].n}</b>. Więcej dają Leża Bossów.</p>
          )}
          {next
            ? <p>Odblokowana kraina: <b>{next.n}</b> (Akt {ROMAN[next.act]}). Główna ruda: {ORES[next.main].n}, rzadka: {ORES[next.rare].n}.</p>
            : <p>Pokonałeś ostatniego bossa. Gwiezdny Krater możesz farmić dalej.</p>}
          <Close onClose={close} label="Dalej" />
        </>
      );
    }
    case 'awaken':
      return (
        <>
          <div class="eyebrow">Przebudzenie</div>
          <div class="h">{m.item.aw?.name}</div>
          <p class="sub">{baseName(m.item)} zebrał 20 000 Sławy Czynów i przebudził się. Od teraz nosi własne imię.</p>
          <ItemCard it={m.item} />
          <Close onClose={close} label="Dalej" />
        </>
      );
    case 'dungChoice':
      return (
        <>
          <div class="eyebrow">Głęboka Sztolnia · piętro {m.floor}</div>
          <div class="h">Wyjść czy kopać dalej?</div>
          <p class="sub">W worku: <b>{rewardText(m.loot)}</b>. Jeśli zginiesz niżej, stracisz połowę łupu.</p>
          <div class="result-actions">
            <button class="btn" onClick={() => { close(); game.dungExit(); }}>Wyjdź z łupem</button>
            <button class="btn primary" onClick={() => { close(); game.dungGo(); }}>Schodź dalej</button>
          </div>
        </>
      );
    case 'dungEnd': {
      const halves = m.id === 'sztolnia' || m.id === 'oltarze';
      const head = m.id === 'skarbiec' ? 'Czas minął' : m.id === 'wieza' ? (m.lost ? 'Strażnik cię zatrzymał' : 'Zejście z wieży') : m.lost ? 'Bohater padł' : 'Zwycięstwo';
      const where = m.id === 'skarbiec' ? `pokonane gobliny: ${m.floor}` : m.id === 'wieza' ? `najwyżej: piętro ${m.floor}` : m.id === 'oltarze' ? `strażnicy: ${m.lost ? m.floor - 1 : m.floor}/5` : m.id === 'sztolnia' ? `piętro ${m.floor}` : '';
      return (
        <>
          <div class="eyebrow">{DUNGEONS[m.id].n}{where ? ' · ' + where : ''}</div>
          <div class="h">{head}</div>
          <p class="sub">
            {m.lost && halves ? 'Uciekasz z połową łupu. ' : ''}
            {m.id === 'leza' && m.lost ? 'Boss był za silny. Klucz przepadł — spróbuj jutro albo wzmocnij ekwipunek.' : <>Zdobyto: <b>{rewardText(m.reward)}</b>.</>}
          </p>
          <Close onClose={close} label="Wróć do krainy" />
        </>
      );
    }
    case 'offline': {
      const r = m.report;
      const L = LANDS[r.land];
      return (
        <>
          <div class="eyebrow">Byłeś poza grą {tfmt(r.ms)}{r.capped ? ` (limit ${tfmt(B.OFFLINE_CAP_MS + techMods(s).offlineMin * 60000)})` : ''}</div>
          <div class="h">Witaj z powrotem</div>
          <p class="sub">Bohater walczył w krainie {L.n} z wydajnością 50%.</p>
          <ul class="list">
            <li>{fmt(r.gold)} złota</li>
            <li>{fmt(r.main)} × {ORES[L.main].n}{r.rare ? `, ${r.rare} × ${ORES[L.rare].n}` : ''}{r.el && L.el ? `, ${r.el} × ${ELEM[L.el].n}` : ''}</li>
            {r.books > 0 && <li>{books(r.books)}</li>}
            <li>+{fmt(r.fame)} Sławy Czynów dla każdego założonego przedmiotu</li>
            {r.forgeUp > 0 && <li>Kuźnia osiągnęła poziom {r.forgeUp}.</li>}
            {r.tech && <li>Zbadano: {TECH[r.tech].n} (poziom {s.tech.lv[r.tech] ?? 1}).</li>}
          </ul>
          {r.chestCount > 0 && (
            <>
              <div class="eyebrow">Skrzynia nocnej zmiany · {r.chestCount} wytopów</div>
              <ul class="list">{r.chest.map(x => <li key={x.item.id} class={`rt${x.item.r}`}>{itemName(x.item)} · {RAR[x.item.r].n} — {x.equipped ? 'założony' : 'sprzedany'}</li>)}</ul>
            </>
          )}
          <Close onClose={close} label="Do kuźni" />
        </>
      );
    }
    case 'item':
      return (<><ItemCard it={m.item} history /><Close onClose={close} label="Zamknij" /></>);
    case 'reset':
      return (
        <>
          <div class="h">Zacząć od nowa?</div>
          <p class="sub">Stracisz cały postęp: przedmioty, rudy, kuźnię i krainy.</p>
          <div class="result-actions">
            <button class="btn" onClick={close}>Anuluj</button>
            <button class="btn danger" onClick={() => { close(); game.reset(); }}>Usuń postęp</button>
          </div>
        </>
      );
    case 'info':
      return m.k === 'level' ? <LevelInfo game={game} close={close} /> : (
        <>
          <div class="eyebrow">Kuźnia · poziom {s.forge.lvl}</div>
          <div class="h">Jak działa wytop</div>
          <p class="sub">Kuźnia zamienia rudę zdobytą w walce na ekwipunek. Jedna ruda to jeden wytop i jeden losowy przedmiot: losuje się slot, poziom przedmiotu i dodatkowe statystyki.</p>
          <p class="sub">Ruda gwarantuje minimalną rzadkość. Na przykład z Mithrilu zawsze wyjdzie co najmniej Epicki przedmiot. Poziom kuźni daje szansę, że przedmiot przeskoczy o jedną lub dwie rzadkości wyżej.</p>
          <div class="eyebrow">Szanse na twoim poziomie kuźni</div>
          <div class="otable-wrap">
            <table class="otable">
              <thead><tr><th>Ruda</th><th>Co może wyjść</th></tr></thead>
              <tbody>
                {ORES.map((o, i) => {
                  const off = s.forge.lvl < o.lvl;
                  return (
                    <tr key={o.n} class={`${i === s.oreSel ? 'sel' : ''}${off ? ' off' : ''}`}>
                      <td class="oname"><span class="gem" style={{ '--c': o.col } as Record<string, string>} />{o.n}</td>
                      <td>{off ? `wytop od ${o.lvl}. poziomu kuźni` : <Dist d={dist(i, s.forge.lvl, techMods(s).jumpRel)} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p class="sub"><b>Gwarancja przeskoku:</b> jeśli {B.PITY_MAX} wytopów z rzędu nie przeskoczy, następny przeskakuje na pewno. Twój licznik: {s.pity}/{B.PITY_MAX}. Smocza Stal przeskakuje najwyżej o 1 rzadkość, a Gwiezdny Kruszec wcale.</p>
          <p class="sub"><b>Domieszki</b> (od {B.ELEM_FORGE_LVL}. poziomu kuźni) nadają przedmiotowi żywioł i dodatkowy efekt. Nie zmieniają szans na rzadkość.</p>
          <p class="sub"><b>Rudy unikalne</b> (od {SET_FORGE_LVL}. poziomu kuźni) dodane do wytopu robią z przedmiotu część zestawu. 2 i 4 części tego samego zestawu dają premie. Taki wytop zawsze przeskakuje o co najmniej 1 rzadkość (jeśli ruda bazowa w ogóle może przeskoczyć).</p>
          <p class="sub"><b>Hartowanie</b> w Nauce (od {TECH_UNLOCK_FORGE}. poziomu kuźni) mnoży szanse na przeskok{techMods(s).jumpRel ? `; twoja premia: +${pct(techMods(s).jumpRel)} względnie, już wliczona w tabelę` : ''}.</p>
          <p class="sub"><b>Po wytopie</b> porównujesz przedmiot z założonym: zielona liczba to zysk Mocy. Załóż go albo sprzedaj za złoto. Sprzedane przedmioty Rzadkie i lepsze mogą trafić do Wielkiego Obiegu.</p>
          <Close onClose={close} label="Rozumiem" />
        </>
      );
  }
}

function LevelInfo({ game, close }: { game: Game; close: () => void }) {
  const lvl = game.s.forge.lvl;
  const pts = [1, 5, 10, 15, 20, 25, 30];
  if (!pts.includes(lvl)) pts.push(lvl);
  pts.sort((a, b) => a - b);
  return (
    <>
      <div class="eyebrow">Kuźnia</div>
      <div class="h">Poziom kuźni</div>
      <p class="sub">Każdy poziom podnosi szansę, że wytop przeskoczy ponad minimum rudy, i co kilka poziomów otwiera wytop szlachetniejszej rudy. Ulepszenie kosztuje złoto i trwa określony czas; kuźnia przez cały ten czas działa normalnie.</p>
      <div class="otable-wrap">
        <table class="otable">
          <thead><tr><th>Poziom</th><th>Przeskok o 1</th><th>o 2</th><th>Odblokowuje</th></tr></thead>
          <tbody>
            {pts.map(l => {
              const [p1, p2] = jumpChances(l);
              return (
                <tr key={l} class={l === lvl ? 'sel' : ''}>
                  <td class="oname">{l}{l === lvl ? ' · teraz' : ''}</td>
                  <td>{pct(p1)}</td><td>{pct(p2)}</td>
                  <td>{l === 1 ? 'Miedź, Żelazo' : FORGE_UNLOCKS[l] ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="sub">Szanse między wypisanymi poziomami rosną płynnie. Koszt rośnie o połowę z każdym poziomem, czas o mniej więcej 28%.</p>
      <Close onClose={close} label="Rozumiem" />
    </>
  );
}
