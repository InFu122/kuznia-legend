// Symulator balansu: bot gra według prostej strategii przez zadany czas gry, a wyniki trafiają do Excela.
// Uruchom: npm run balance                  (domyślnie 48 h gry, 3 przebiegi z różnymi ziarnami)
//          npm run balance -- 72 5          (72 h, 5 przebiegów)
//          npm run balance -- 120 3 plain   (bot bez technologii, lochów i zestawów — punkt odniesienia)
//          npm run balance -- 1440 2 casual (60 dni: gracz gra 3 × 1 h dziennie, resztę czasu offline)
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { B, DUNG_ORDER, FORGE_AT_BOSS, LANDS, ORES, RAR, SET_FORGE_LVL, SET_IDS, TECH_IDS } from '../src/data';
import { bossWaiting } from '../src/engine/combat';
import { lezaBosses } from '../src/engine/dungeon';
import { canSmelt } from '../src/engine/forge';
import { goldWave, jumpChances, recPower, upCost, upTime } from '../src/engine/formulas';
import { Game } from '../src/engine/game';
import { mulberry32 } from '../src/engine/rng';
import { newState } from '../src/engine/state';
import { techBlock } from '../src/engine/tech';
import { mountsUnlocked, petsUnlocked, skillsUnlocked, upgradeCost } from '../src/engine/companions';
import { fullStats, skillFactor } from '../src/engine/stats';
import { MOUNT_IDS, PET_IDS, SKILL_IDS } from '../src/data';
import type { LabDoorKind, MountId, PetId, SkillId, TechId } from '../src/engine/types';

const HOURS = Number(process.argv[2] ?? 48);
const RUNS = Number(process.argv[3] ?? 3);
const PLAIN = process.argv[4] === 'plain';
/** Gracz „zwyczajny”: 3 sesje po godzinie dziennie (8:00, 13:00, 20:00), pomiędzy — nagrody offline. */
const CASUAL = process.argv[4] === 'casual';
const SESSIONS = [8, 13, 20];
const activeAt = (ms: number) => !CASUAL || SESSIONS.includes(Math.floor(ms / 3600000) % 24);
/** Początek najbliższej sesji po chwili `ms`. */
function nextSession(ms: number): number {
  const day = Math.floor(ms / 86400000) * 86400000;
  for (let d = 0; d < 2; d++) for (const h of SESSIONS) { const at = day + d * 86400000 + h * 3600000; if (at > ms) return at; }
  return ms + 3600000;
}
const STEP = 250;          // ms czasu gry na krok
const BOSS_RETRY = 120000; // bot próbuje bossa co 2 min, gdy ma ≥ 90% zalecanej Mocy
const TOWER_RETRY = 30 * 60000;
const SAMPLE = 6 * 60000;  // próbka Mocy co 6 min (do kalibracji)
/** Kolejność badań bota: pierwsze niezablokowane z listy. */
const TECH_PRIORITY: TechId[] = ['w_ostrze', 'w_pancerz', 'k_hart', 'e_kupiec', 'k_miech', 'e_gornik', 'w_precyzja', 'w_pogromca', 'k_oszcz', 'e_poszuk', 'k_auto', 'k_tanie', 'e_noc'];

interface HourRow {
  run: number; h: number; land: string; stage: number; forge: number; power: number; rec: number; gold: number; smelted: number; jumps: number; best: string;
  books: number; tech: number; sets: string; tower: number; skills: string; pet: string; mount: string;
}
interface BossRow { run: number; land: string; boss: string; h: number; forge: number; power: number }

/** Bot dba o umiejętności, chowańce i wierzchowce (co minutę gry). */
function manageCompanions(g: Game): void {
  const s = g.s;
  if (skillsUnlocked(s)) {
    while (s.scrolls > 0) g.openScroll();
    const spd = g.stats.spd;
    const ranked = SKILL_IDS.filter(id => s.skills.lv[id])
      .map(id => { const [d, h] = skillFactor([{ id, lvl: s.skills.lv[id]! }], spd); return { id, v: d * h }; })
      .sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.id as SkillId);
    if (ranked.join() !== s.skills.eq.filter(Boolean).join()) ranked.forEach((id, i) => g.equipSkill(id, i));
  }
  if (petsUnlocked(s)) {
    if (!s.hatch) for (let r = 4; r >= 0; r--) if (s.eggs[r] > 0) { g.startHatch(r); break; }
    pickBest(g, PET_IDS.filter(id => s.pets[id]), id => g.selectPet(id as PetId));
  }
  if (mountsUnlocked(s)) {
    while (s.saddles > 0) g.openSaddle();
    pickBest(g, MOUNT_IDS.filter(id => s.mounts[id]), id => g.selectMount(id as MountId));
  }
  // Kamienie: tańsze ulepszenie z dwóch (chowaniec, wierzchowiec)
  for (let guard = 0; guard < 50; guard++) {
    const opts: ['pet' | 'mount', PetId | MountId, number][] = [];
    if (s.petSel) opts.push(['pet', s.petSel, upgradeCost('pet', s.petSel, s.pets[s.petSel]!.lvl)]);
    if (s.mountSel) opts.push(['mount', s.mountSel, upgradeCost('mount', s.mountSel, s.mounts[s.mountSel]!.lvl)]);
    opts.sort((a, b) => a[2] - b[2]);
    if (!opts.length || !g.levelUp(opts[0][0], opts[0][1])) break;
  }
  while (s.seals > 0 && s.eq.bron) g.useSeal('bron');
  // misje, skrzynia i kalendarz logowania
  const ms = g.missions();
  ms.daily.forEach((_, i) => g.claimMission('daily', i));
  ms.weekly.forEach((_, i) => g.claimMission('weekly', i));
  g.claimChest();
  g.claimLogin();
  while (s.found.length) g.takeFound(0, g.foundDelta(0) > 0);
}

/** Wybiera to, co daje najwięcej Mocy. */
function pickBest(g: Game, ids: string[], select: (id: string) => void): void {
  let best = '', bp = -1;
  for (const id of ids) { select(id); const p = fullStats(g.ctx).power; if (p > bp) { bp = p; best = id; } }
  if (best) select(best);
}

/** Labirynt: ołtarz, potem elita przy dobrym zdrowiu, źródło przy złym. */
function labPick(g: Game): number {
  const doors = g.b.dung!.doors!;
  const hp = g.b.heroHp / g.b.heroMax;
  const score = (k: LabDoorKind) => ({ oltarz: 5, elita: hp > 0.7 ? 4 : 1, zrodlo: hp < 0.5 ? 6 : 0, skarb: 3, walka: 2 })[k];
  return score(doors[0].kind) >= score(doors[1].kind) ? 0 : 1;
}

function runOnce(run: number, seed: number) {
  let t = Date.UTC(2026, 0, 1);
  const g = new Game(newState(t), { rng: mulberry32(seed), now: () => t });
  g.s.auto = false;
  const hours: HourRow[] = [];
  const bosses: BossRow[] = [];
  const samples: number[] = [];
  let sinceBoss = 0;
  let sinceTower = TOWER_RETRY;
  let cleared = 0;
  g.on(e => { if (e.t === 'modal') g.uiBusy = false; });
  const total = HOURS * 3600000;
  const powerAtForge: number[] = [];
  for (let ms = 0; ms <= total; ms += STEP) {
    if (!activeAt(ms)) {
      // poza sesją: nagrody offline (kuźnia, badania i jaja biegną cały czas)
      const next = Math.min(nextSession(ms), total + STEP);
      const gap = next - ms;
      t += gap;
      g.offline(gap);
      g.uiBusy = false;
      ms = next - STEP;
      continue;
    }
    t += STEP;
    // strategia: najlepsza dostępna ruda, auto-wytop od 5. poziomu, ręczne decyzje wcześniej
    for (let o = ORES.length - 1; o >= 0; o--) if (canSmelt(g.ctx, o)) { g.s.oreSel = o; break; }
    // auto-wytop staje na przeskoku (cel domyślny) — bot zakłada lepszy przedmiot i jedzie dalej; znaleziska tak samo
    if (g.s.pending) { if (g.pendingDelta() > 0) g.equipPending(); else g.sellPending(); }
    while (g.s.found.length) g.takeFound(0, g.foundDelta(0) > 0);
    if (g.s.forge.lvl >= B.AUTO_FORGE_LVL) g.s.auto = true;
    else if (!g.s.pending && canSmelt(g.ctx, g.s.oreSel)) {
      g.smeltManual();
      if (g.pendingDelta() > 0) g.equipPending(); else g.sellPending();
    }
    if (!g.s.forge.up && g.s.forge.lvl < B.FORGE_MAX && g.s.gold >= g.upgradeCost()) g.upgrade();
    if (!PLAIN) {
      // badania: po ulepszeniu kuźni, za resztę złota
      if (!g.s.tech.cur) for (const id of TECH_PRIORITY) if (!techBlock(g.s, id)) { g.research(id); break; }
      // zestawy: ruda unikalna, której jest najwięcej
      if (g.s.forge.lvl >= SET_FORGE_LVL) {
        const best = SET_IDS.filter(k => (g.s.uniq[k] ?? 0) > 0).sort((a, b) => (g.s.uniq[b] ?? 0) - (g.s.uniq[a] ?? 0))[0] ?? null;
        if (g.s.uniqSel !== best) g.setUniq(best);
      }
      // lochy: codzienne klucze, Wieża co 30 min
      sinceTower += STEP;
      if (g.b.mode === 'camp' && !g.b.enemy?.boss) {
        for (const id of DUNG_ORDER) {
          if (!g.dungUnlocked(id)) continue;
          if (id === 'wieza') { if (sinceTower >= TOWER_RETRY && g.startDung('wieza')) { sinceTower = 0; break; } continue; }
          if (g.dungKeys(id) < 1) continue;
          if (id === 'leza') { const ls = lezaBosses(g.ctx); if (g.startDung('leza', ls[ls.length - 1])) break; continue; }
          if (g.startDung(id)) break;
        }
      }
      if (g.b.dung?.id === 'labirynt' && g.b.dung.doors) g.labChoose(labPick(g));
      if (ms % 60000 === 0) manageCompanions(g);
      // Sztolnia: na punkcie kontrolnym schodź dalej, jeśli bohater ma ponad 60% zdrowia
      if (g.b.dung?.id === 'sztolnia' && g.b.pause === Number.POSITIVE_INFINITY) {
        if (g.b.heroHp > 0.6 * g.b.heroMax && g.b.dung.floor < 20) g.dungGo(); else g.dungExit();
      }
    }
    sinceBoss += STEP;
    if (bossWaiting(g.ctx) && !g.b.enemy?.boss && sinceBoss >= BOSS_RETRY && g.stats.power >= 0.9 * recPower(g.s.cur.land)) {
      g.challengeBoss();
      sinceBoss = 0;
    }
    g.uiBusy = false;
    g.tick(STEP);
    const nowCleared = g.s.cleared.filter(Boolean).length;
    if (nowCleared > cleared) {
      for (let i = 0; i < LANDS.length; i++) if (g.s.cleared[i] && !bosses.some(b => b.run === run && b.land === LANDS[i].n)) bosses.push({ run, land: LANDS[i].n, boss: LANDS[i].boss, h: ms / 3600000, forge: g.s.forge.lvl, power: g.stats.power });
      cleared = nowCleared;
    }
    if (ms % SAMPLE === 0) samples.push(g.stats.power);
    if (powerAtForge[g.s.forge.lvl] === undefined) powerAtForge[g.s.forge.lvl] = g.stats.power;
    powerAtForge[g.s.forge.lvl] = Math.max(powerAtForge[g.s.forge.lvl], g.stats.power);
    if (ms % 3600000 === 0) {
      const bestR = Math.max(-1, ...Object.values(g.s.eq).map(it => it?.r ?? -1));
      hours.push({
        run, h: ms / 3600000, land: LANDS[g.s.cur.land].n, stage: g.s.cur.stage, forge: g.s.forge.lvl, power: g.stats.power,
        rec: recPower(g.s.cur.land), gold: Math.round(g.s.gold), smelted: g.s.stats.smelted, jumps: g.s.stats.jumps, best: bestR >= 0 ? RAR[bestR].n : '—',
        books: g.s.books, tech: TECH_IDS.reduce((a, id) => a + (g.s.tech.lv[id] ?? 0), 0),
        sets: g.stats.sets.map(x => `${x.id}:${x.count}`).join(' '), tower: g.s.dungeons.wieza.best,
        skills: g.s.skills.eq.filter(Boolean).map(id => `${id}${g.s.skills.lv[id!]}`).join(' '),
        pet: g.s.petSel ? `${g.s.petSel}${g.s.pets[g.s.petSel]!.lvl}` : '', mount: g.s.mountSel ? `${g.s.mountSel}${g.s.mounts[g.s.mountSel]!.lvl}` : '',
      });
    }
  }
  return { hours, bosses, samples, powerAtForge };
}

async function main() {
  const hours: HourRow[] = [];
  const bosses: BossRow[] = [];
  const samples: number[][] = [];
  const calib: number[][] = [];
  for (let r = 1; r <= RUNS; r++) {
    const res = runOnce(r, 1000 + r);
    // Kalibracja: najwyższa Moc bota na poziomie kuźni oczekiwanym przy bossie krainy, względem zalecanej Mocy krainy.
    calib.push(LANDS.map((_, i) => (res.powerAtForge[FORGE_AT_BOSS[i]] ?? NaN) / recPower(i)));
    hours.push(...res.hours);
    bosses.push(...res.bosses);
    samples.push(res.samples);
    const last = res.hours[res.hours.length - 1];
    console.log(`Przebieg ${r}${PLAIN ? ' (plain)' : ''}: po ${HOURS} h — ${last.land}, etap ${last.stage}, kuźnia ${last.forge}, Moc ${last.power}, Księgi ${last.books}, badania ${last.tech}, zestawy [${last.sets}], wieża ${last.tower}, umiejętności [${last.skills}], chowaniec ${last.pet}, wierzchowiec ${last.mount}, bossowie: ${res.bosses.length}`);
    console.log('  bossowie (' + (CASUAL ? 'dni' : 'h') + '): ' + res.bosses.map(b => (CASUAL ? b.h / 24 : b.h).toFixed(1)).join(' '));
  }
  console.log('Moc przy oczekiwanym poziomie kuźni / zalecana Moc krainy (średnio):');
  console.log('  ' + LANDS.map((_, i) => { const v = calib.map(c => c[i]).filter(x => Number.isFinite(x)); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '—'; }).join(' '));
  mkdirSync('balans', { recursive: true });
  writeFileSync(`balans/sim-${PLAIN ? 'plain' : 'full'}.json`, JSON.stringify({ bosses, samples, step: SAMPLE }));

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
    { header: 'Księgi', key: 'books', width: 9 }, { header: 'Poziomy badań', key: 'tech', width: 14 },
    { header: 'Zestawy', key: 'sets', width: 18 }, { header: 'Wieża', key: 'tower', width: 8 },
    { header: 'Umiejętności', key: 'skills', width: 26 }, { header: 'Chowaniec', key: 'pet', width: 14 }, { header: 'Wierzchowiec', key: 'mount', width: 14 },
  ]);
  hours.forEach((h, i) => { ws1.addRow(h); ws1.getCell(`H${i + 2}`).value = { formula: `F${i + 2}/G${i + 2}` }; });

  const ws2 = sheet('Bossowie', [
    { header: 'Przebieg', key: 'run', width: 10 }, { header: 'Kraina', key: 'land', width: 24 },
    { header: 'Boss', key: 'boss', width: 22 }, { header: 'Pokonany po (h gry)', key: 'h', width: 20, fmt: '0.0' },
    { header: 'Poziom kuźni', key: 'forge', width: 13 }, { header: 'Moc', key: 'power', width: 14, fmt: '#,##0' },
  ]);
  bosses.forEach(b => ws2.addRow(b));

  const ws3 = sheet('Krainy', [
    { header: '#', key: 'i', width: 5 }, { header: 'Akt', key: 'act', width: 6 }, { header: 'Kraina', key: 'n', width: 24 },
    { header: 'Główna ruda', key: 'main', width: 16 }, { header: 'Rzadka ruda', key: 'rare', width: 18 }, { header: 'Rozkład rud (% dropów)', key: 'drops', width: 44 },
    { header: 'Złoto / fala (etap 5)', key: 'gold', width: 20, fmt: '#,##0' }, { header: 'Zalecana Moc', key: 'rec', width: 14, fmt: '#,##0' }, { header: 'Boss', key: 'boss', width: 22 },
  ]);
  LANDS.forEach((L, i) => ws3.addRow({ i: i + 1, act: L.act, n: L.n, main: ORES[L.main].n, rare: ORES[L.rare].n, drops: L.drops.map(([o, p]) => `${ORES[o].n} ${p}%`).join(', '), gold: goldWave(i * 10 + 4), rec: recPower(i), boss: L.boss }));

  const ws4 = sheet('Kuźnia', [
    { header: 'Poziom', key: 'l', width: 8 }, { header: 'Koszt ulepszenia (złoto)', key: 'cost', width: 24, fmt: '#,##0' },
    { header: 'Czas ulepszenia (h)', key: 'time', width: 20, fmt: '0.00' }, { header: 'Przeskok o 1', key: 'p1', width: 14, fmt: '0.0%' }, { header: 'Przeskok o 2', key: 'p2', width: 14, fmt: '0.0%' },
  ]);
  for (let l = 1; l <= B.FORGE_MAX; l++) {
    const [p1, p2] = jumpChances(l);
    ws4.addRow({ l, cost: l === 1 ? 0 : upCost(l), time: l === 1 ? 0 : upTime(l) / 3600000, p1: p1 / 100, p2: p2 / 100 });
  }

  await wb.xlsx.writeFile('balans/balans.xlsx');
  console.log('Zapisano balans/balans.xlsx');
}

void main();
