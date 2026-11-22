// Szanse losowań przed zakupem (Zwój zaklęć, Siodło, Rzadkie jajo). Google Play wymaga, żeby gra pokazywała je, zanim
// gracz kupi coś z losową zawartością. Liczby idą prosto z danych gry — te same, z których losuje silnik.
import { DRAW_ODDS, MOUNTS, MOUNT_IDS, PETS, PET_IDS, RAR, SKILLS, SKILL_IDS } from '../data';

export type OddsWhat = 'zwoj' | 'siodlo' | 'jajo';

/** Rzadkość jaja ze sklepu (zawsze ta sama — losuje się tylko, który chowaniec z tej rzadkości). */
export const SHOP_EGG_R = 2;

/** 45% · 22,5% · 0,67% — bez zbędnych zer, ale bez zaokrąglania, które zmieniłoby sumę. */
const pct = (x: number) => String(Number(x.toFixed(x >= 1 ? 1 : 2))).replace('.', ',') + '%';
const word = (n: number, what: OddsWhat) => {
  const forms = what === 'zwoj' ? ['umiejętność', 'umiejętności', 'umiejętności'] : what === 'siodlo' ? ['wierzchowiec', 'wierzchowce', 'wierzchowców'] : ['chowaniec', 'chowańce', 'chowańców'];
  return n === 1 ? forms[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? forms[1] : forms[2];
};

/** Wiersze: rzadkość, szansa na nią, ile jest rzeczy w tej rzadkości i szansa na każdą z nich. */
export function oddsRows(what: OddsWhat): { r: number; p: number; n: number; each: number }[] {
  const byR = (r: number) =>
    what === 'zwoj' ? SKILL_IDS.filter(k => SKILLS[k].r === r).length
      : what === 'siodlo' ? MOUNT_IDS.filter(k => MOUNTS[k].r === r).length
        : PET_IDS.filter(k => PETS[k].r === r).length;
  if (what === 'jajo') {
    const n = byR(SHOP_EGG_R);
    return [{ r: SHOP_EGG_R, p: 100, n, each: n ? 100 / n : 0 }];
  }
  const total = DRAW_ODDS.reduce((a, b) => a + b, 0);
  return DRAW_ODDS.map((w, r) => {
    const p = (w / total) * 100;
    const n = byR(r);
    return { r, p, n, each: n ? p / n : 0 };
  }).filter(x => x.p > 0);
}

const TITLE: Record<OddsWhat, string> = { zwoj: 'Zwój zaklęć', siodlo: 'Siodło', jajo: 'Rzadkie jajo' };
const NOTE: Record<OddsWhat, string> = {
  zwoj: 'Najpierw losuje się rzadkość, potem jedna z umiejętności tej rzadkości — każda tak samo. Powtórka podnosi poziom umiejętności.',
  siodlo: 'Najpierw losuje się rzadkość, potem jeden z wierzchowców tej rzadkości — każdy tak samo. Powtórka daje gwiazdkę albo Kamienie.',
  jajo: 'Z jaja zawsze wykluwa się chowaniec rzadki — losuje się tylko który, każdy tak samo. Powtórka daje gwiazdkę albo Kamienie.',
};

export function OddsTable({ what }: { what: OddsWhat }) {
  const rows = oddsRows(what);
  return (
    <div class="odds" role="region" aria-label={`Szanse: ${TITLE[what]}`}>
      <b>Szanse · {TITLE[what]}</b>
      <table>
        <tbody>
          {rows.map(x => (
            <tr key={x.r}>
              <td class={`rt${x.r}`}>{RAR[x.r].n}</td>
              <td class="num">{pct(x.p)}</td>
              <td class="muted">{x.n} {word(x.n, what)}, {what === 'zwoj' ? 'każda' : 'każdy'} {pct(x.each)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small>{NOTE[what]}</small>
    </div>
  );
}
