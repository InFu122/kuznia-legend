import type { ComponentChildren } from 'preact';
import { B, ELEM, FORGE_UNLOCKS, LANDS, ORES, RAR, ROMAN } from '../data';
import { baseName, dist, itemName, jumpChances } from '../engine/formulas';
import type { Game } from '../engine/game';
import type { ModalData } from '../engine/types';
import { ItemCard } from './ItemCard';
import { fmt, pct, tfmt } from './format';
import { Dist } from './panels/Forge';

export function ModalShell({ locked, onClose, children }: { locked: boolean; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="modal" onClick={e => { if (e.target === e.currentTarget && !locked) onClose(); }}>
      <div class="modal-box" role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

const Close = ({ onClose, label }: { onClose: () => void; label: string }) => <button class="btn primary" onClick={onClose}>{label}</button>;

export function ModalView({ m, game, close }: { m: ModalData; game: Game; close: () => void }) {
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
      return (
        <>
          <div class="eyebrow">Boss pokonany</div>
          <div class="h">{L.boss}</div>
          <p class="sub">Łup: {fmt(m.gold)} złota i {m.n} × {ORES[L.rare].n}.{m.found ? ' Ze skrzyni bossa wypadł przedmiot z Wielkiego Obiegu — sprawdź go w Kuźni.' : ''}</p>
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
          <p class="sub">Masz w worku {m.loot} × {ORES[m.tier].n}. Jeśli zginiesz niżej, stracisz połowę łupu.</p>
          <div class="result-actions">
            <button class="btn" onClick={() => { close(); game.dungExit(); }}>Wyjdź z łupem</button>
            <button class="btn primary" onClick={() => { close(); game.dungGo(); }}>Schodź dalej</button>
          </div>
        </>
      );
    case 'dungEnd':
      return (
        <>
          <div class="eyebrow">Głęboka Sztolnia</div>
          <div class="h">{m.lost ? 'Bohater padł' : 'Udane zejście'}</div>
          <p class="sub">{m.lost ? 'Uciekasz z połową łupu.' : 'Wynosisz cały łup na powierzchnię.'} Zdobyto: <b>{m.keep} × {ORES[m.tier].n}</b> (piętro {m.floor}).</p>
          <Close onClose={close} label="Wróć do krainy" />
        </>
      );
    case 'offline': {
      const r = m.report;
      const L = LANDS[r.land];
      return (
        <>
          <div class="eyebrow">Byłeś poza grą {tfmt(r.ms)}{r.capped ? ' (limit 8 h)' : ''}</div>
          <div class="h">Witaj z powrotem</div>
          <p class="sub">Bohater walczył w krainie {L.n} z wydajnością 50%.</p>
          <ul class="list">
            <li>{fmt(r.gold)} złota</li>
            <li>{fmt(r.main)} × {ORES[L.main].n}{r.rare ? `, ${r.rare} × ${ORES[L.rare].n}` : ''}{r.el && L.el ? `, ${r.el} × ${ELEM[L.el].n}` : ''}</li>
            <li>+{fmt(r.fame)} Sławy Czynów dla każdego założonego przedmiotu</li>
            {r.forgeUp > 0 && <li>Kuźnia osiągnęła poziom {r.forgeUp}.</li>}
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
                      <td>{off ? `wytop od ${o.lvl}. poziomu kuźni` : <Dist d={dist(i, s.forge.lvl)} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p class="sub"><b>Gwarancja przeskoku:</b> jeśli {B.PITY_MAX} wytopów z rzędu nie przeskoczy, następny przeskakuje na pewno. Twój licznik: {s.pity}/{B.PITY_MAX}. Smocza Stal przeskakuje najwyżej o 1 rzadkość, a Gwiezdny Kruszec wcale.</p>
          <p class="sub"><b>Domieszki</b> (od {B.ELEM_FORGE_LVL}. poziomu kuźni) nadają przedmiotowi żywioł i dodatkowy efekt. Nie zmieniają szans na rzadkość.</p>
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
