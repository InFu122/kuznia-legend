// Symulator balansu: bot gra według prostej strategii przez zadany czas gry, a wyniki trafiają do Excela.
// Uruchom: npm run balance            (domyślnie 48 h gry, 3 przebiegi z różnymi ziarnami)
//          npm run balance -- 72 5     (72 h, 5 przebiegów)
import ExcelJS from 'exceljs';
import { mkdirSync } from 'node:fs';
import { B, LANDS, ORES, RAR } from '../src/data';
import { bossWaiting } from '../src/engine/combat';
import { canSmelt } from '../src/engine/forge';
import { goldWave, jumpChances, recPower, upCost, upTime } from '../src/engine/formulas';
import { Game } from '../src/engine/game';
import { mulberry32 } from '../src/engine/rng';
import { newState } from '../src/engine/state';

const HOURS = Number(process.argv[2] ?? 48);
const RUNS = Number(process.argv[3] ?? 3);
const STEP = 250;          // ms czasu gry na krok
const BOSS_RETRY = 120000; // bot próbuje bossa co 2 min, gdy ma ≥ 90% zalecanej Mocy

interface HourRow { run: number; h: number; land: string; stage: number; forge: number; power: number; rec: number; gold: number; smelted: number; jumps: number; best: string; }
interface BossRow { run: number; land: string; boss: string; h: number }

function runOnce(run: number, seed: number) {
  let t = Date.UTC(2026, 0, 1);
  const g = new Game(newState(t), { rng: mulberry32(seed), now: () => t });
  g.s.auto = false;
  const hours: HourRow[] = [];
  const bosses: BossRow[] = [];
  let sinceBoss = 0;
  let cleared = 0;
  g.on(e => { if (e.t === 'modal') g.uiBusy = false; });
  const total = HOURS * 3600000;
  for (let ms = 0; ms <= total; ms += STEP) {
    t += STEP;
    // strategia: najlepsza dostępna ruda, auto-wytop od 5. poziomu, ręczne decyzje wcześniej
    for (let o = ORES.length - 1; o >= 0; o--) if (canSmelt(g.ctx, o)) { g.s.oreSel = o; break; }
    if (g.s.forge.lvl >= B.AUTO_FORGE_LVL) g.s.auto = true;
    else if (!g.s.pending && canSmelt(g.ctx, g.s.oreSel)) {
      g.smeltManual();
      if (g.pendingDelta() > 0) g.equipPending(); else g.sellPending();
    }
    if (!g.s.forge.up && g.s.forge.lvl < B.FORGE_MAX && g.s.gold >= upCost(g.s.forge.lvl + 1)) g.upgrade();
    sinceBoss += STEP;
    if (bossWaiting(g.ctx) && !g.b.enemy?.boss && sinceBoss >= BOSS_RETRY && g.stats.power >= 0.9 * recPower(g.s.cur.land)) {
      g.challengeBoss();
      sinceBoss = 0;
    }
    g.uiBusy = false;
    g.tick(STEP);
    const nowCleared = g.s.cleared.filter(Boolean).length;
    if (nowCleared > cleared) {
      for (let i = 0; i < LANDS.length; i++) if (g.s.cleared[i] && !bosses.some(b => b.run === run && b.land === LANDS[i].n)) bosses.push({ run, land: LANDS[i].n, boss: LANDS[i].boss, h: ms / 3600000 });
      cleared = nowCleared;
    }
    if (ms % 3600000 === 0) {
      const bestR = Math.max(-1, ...Object.values(g.s.eq).map(it => it?.r ?? -1));
      hours.push({
        run, h: ms / 3600000, land: LANDS[g.s.cur.land].n, stage: g.s.cur.stage, forge: g.s.forge.lvl, power: g.stats.power,
        rec: recPower(g.s.cur.land), gold: Math.round(g.s.gold), smelted: g.s.stats.smelted, jumps: g.s.stats.jumps, best: bestR >= 0 ? RAR[bestR].n : '—',
      });
    }
  }
  return { hours, bosses };
}

async function main() {
  const hours: HourRow[] = [];
  const bosses: BossRow[] = [];
  for (let r = 1; r <= RUNS; r++) {
    const res = runOnce(r, 1000 + r);
    hours.push(...res.hours);
    bosses.push(...res.bosses);
    const last = res.hours[res.hours.length - 1];
    console.log(`Przebieg ${r}: po ${HOURS} h — ${last.land}, etap ${last.stage}, kuźnia ${last.forge}, Moc ${last.power}, pokonani bossowie: ${res.bosses.length}`);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kuźnia Legend — symulator balansu';
  const sheet = (name: string, cols: { header: string; key: string; width: number; fmt?: string }[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = cols.map(c => ({ header: c.header, key: c.key, width: c.width, style: c.fmt ? { numFmt: c.fmt } : {} }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B333D' } };
    return ws;
  };

  const ws1 = sheet('Przebieg gry', [
    { header: 'Przebieg', key: 'run', width: 10 }, { header: 'Godzina gry', key: 'h', width: 12 },
    { header: 'Kraina', key: 'land', width: 24 }, { header: 'Etap', key: 'stage', width: 7 }, { header: 'Poziom kuźni', key: 'forge', width: 13 },
    { header: 'Moc bohatera', key: 'power', width: 14, fmt: '#,##0' }, { header: 'Zalecana Moc krainy', key: 'rec', width: 18, fmt: '#,##0' },
    { header: 'Moc / zalecana', key: 'ratio', width: 14, fmt: '0%' }, { header: 'Złoto', key: 'gold', width: 14, fmt: '#,##0' },
    { header: 'Wytopy', key: 'smelted', width: 10, fmt: '#,##0' }, { header: 'Przeskoki', key: 'jumps', width: 10, fmt: '#,##0' },
    { header: 'Najlepsza rzadkość', key: 'best', width: 18 },
  ]);
  hours.forEach((h, i) => { ws1.addRow(h); ws1.getCell(`H${i + 2}`).value = { formula: `F${i + 2}/G${i + 2}` }; });

  const ws2 = sheet('Bossowie', [
    { header: 'Przebieg', key: 'run', width: 10 }, { header: 'Kraina', key: 'land', width: 24 },
    { header: 'Boss', key: 'boss', width: 22 }, { header: 'Pokonany po (h gry)', key: 'h', width: 20, fmt: '0.0' },
  ]);
  bosses.forEach(b => ws2.addRow(b));

  const ws3 = sheet('Krainy', [
    { header: '#', key: 'i', width: 5 }, { header: 'Akt', key: 'act', width: 6 }, { header: 'Kraina', key: 'n', width: 24 },
    { header: 'Główna ruda', key: 'main', width: 16 }, { header: 'Rzadka ruda', key: 'rare', width: 18 }, { header: 'Szansa rzadkiej / fala', key: 'rc', width: 20, fmt: '0.00%' },
    { header: 'Złoto / fala (etap 5)', key: 'gold', width: 20, fmt: '#,##0' }, { header: 'Zalecana Moc', key: 'rec', width: 14, fmt: '#,##0' }, { header: 'Boss', key: 'boss', width: 22 },
  ]);
  LANDS.forEach((L, i) => ws3.addRow({ i: i + 1, act: L.act, n: L.n, main: ORES[L.main].n, rare: ORES[L.rare].n, rc: L.rc, gold: goldWave(i * 10 + 4), rec: recPower(i), boss: L.boss }));

  const ws4 = sheet('Kuźnia', [
    { header: 'Poziom', key: 'l', width: 8 }, { header: 'Koszt ulepszenia (złoto)', key: 'cost', width: 24, fmt: '#,##0' },
    { header: 'Czas ulepszenia (h)', key: 'time', width: 20, fmt: '0.00' }, { header: 'Przeskok o 1', key: 'p1', width: 14, fmt: '0.0%' }, { header: 'Przeskok o 2', key: 'p2', width: 14, fmt: '0.0%' },
  ]);
  for (let l = 1; l <= B.FORGE_MAX; l++) {
    const [p1, p2] = jumpChances(l);
    ws4.addRow({ l, cost: l === 1 ? 0 : upCost(l), time: l === 1 ? 0 : upTime(l) / 3600000, p1: p1 / 100, p2: p2 / 100 });
  }

  mkdirSync('balans', { recursive: true });
  await wb.xlsx.writeFile('balans/balans.xlsx');
  console.log('Zapisano balans/balans.xlsx');
}

void main();
