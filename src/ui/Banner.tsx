// Nagłówek karty z pixelartową sceną w tle (jak karta Kuźni): ikona, podpis, tytuł i przyciski po prawej.
// Do tego małe pixelowe ikonki statystyk bohatera (9×9, rysowane prostokątami — ostre jak reszta grafiki).
import type { ComponentChildren, JSX } from 'preact';

export function Banner({ bg, icon, eyebrow, title, children, cls = '' }: {
  bg: string; icon?: JSX.Element; eyebrow: ComponentChildren; title: ComponentChildren; children?: ComponentChildren; cls?: string;
}) {
  return (
    <div class={`forge-banner ${cls}`} style={{ '--bg': `url(${bg})` } as Record<string, string>}>
      {icon}
      <div class="fb-txt">
        <div class="eyebrow">{eyebrow}</div>
        <div class="h">{title}</div>
      </div>
      {children}
    </div>
  );
}

/** Podpis sekcji z małą ikonką. */
export const IconEyebrow = ({ icon, children }: { icon: JSX.Element; children: ComponentChildren }) => (
  <div class="eyebrow ic">{icon}{children}</div>
);

type Pal = Record<string, string>;
/** Ikonka 9×9: wiersze znaków, każdy znak to kolor z palety (kropka = przezroczysty). */
function pix(rows: string[], pal: Pal) {
  const rects: JSX.Element[] = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (pal[c]) rects.push(<rect key={`${x}:${y}`} x={x} y={y} width="1" height="1" fill={pal[c]} />);
  }));
  return rects;
}

const STAT_PIX: Record<string, [string[], Pal]> = {
  dmg: [[
    '.......ww',
    '......wsw',
    '.....wsw.',
    '....wsd..',
    '.g.wsd...',
    '..gsd....',
    '..bg.....',
    '.b..g....',
    'b........',
  ], { w: '#ffffff', s: '#cfd6de', d: '#8b96a3', g: '#e7be62', b: '#8a5a32' }],
  hp: [[
    '.rr...rr.',
    'rwrr.rrrd',
    'rwrrrrrrd',
    'rrrrrrrrd',
    '.rrrrrrd.',
    '..rrrrd..',
    '...rrd...',
    '....d....',
    '.........',
  ], { r: '#e35a52', w: '#ffc2b8', d: '#9c2f2a' }],
  crit: [[
    '...ccc...',
    '.cc...cc.',
    '.c..c..c.',
    'c...c...c',
    'c.ccwcc.c',
    'c...c...c',
    '.c..c..c.',
    '.cc...cc.',
    '...ccc...',
  ], { c: '#ff8d4f', w: '#fff1c2' }],
  critd: [[
    '....o....',
    '.o..o..o.',
    '..o.y.o..',
    '...yyy...',
    'ooyywyyoo',
    '...yyy...',
    '..o.y.o..',
    '.o..o..o.',
    '....o....',
  ], { o: '#ff8d4f', y: '#f3cf78', w: '#ffffff' }],
  spd: [[
    '.....yy..',
    '....yy...',
    '...yy....',
    '..yyyyy..',
    '....yy...',
    '...yy....',
    '..yy.....',
    '.yd......',
    'd........',
  ], { y: '#f3cf78', d: '#b5862e' }],
  ls: [[
    '....r....',
    '....r....',
    '...rrr...',
    '..rrrrr..',
    '.rwrrrrr.',
    '.rwrrrrd.',
    '.rrrrrrd.',
    '..rrrdd..',
    '...ddd...',
  ], { r: '#c8443c', w: '#ff9d92', d: '#7d2420' }],
  dodge: [[
    '.........',
    '.bbbbbw..',
    '.......b.',
    '..bbbbb..',
    '.........',
    'bbbbbbbw.',
    '........b',
    '...bbbb..',
    '.........',
  ], { b: '#7fc8ff', w: '#d8efff' }],
  regen: [[
    '...ggg...',
    '...gwg...',
    '...ggg...',
    'ggggggggd',
    'gwgggggdd',
    'ggggggggd',
    '...ggd...',
    '...ggd...',
    '...ddd...',
  ], { g: '#6dc57b', w: '#d4f5d9', d: '#3c8a4a' }],
};

/** Pixelowa ikonka statystyki (dmg, hp, crit, critd, spd, ls, dodge, regen). */
export function StatIcon({ k, size = 18 }: { k: string; size?: number }) {
  const d = STAT_PIX[k];
  if (!d) return null;
  return (
    <svg class="stat-ic" viewBox="0 0 9 9" width={size} height={size} shape-rendering="crispEdges" aria-hidden="true">{pix(d[0], d[1])}</svg>
  );
}
