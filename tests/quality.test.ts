import { describe, expect, it } from 'vitest';
import { ELEM, QUAL, SET_FORGE_LVL, qMult } from '../src/data';
import { qualSubs, qualityOf, rollSubs, smelt, smeltDraws } from '../src/engine/forge';
import { JUMP_V, mainVal } from '../src/engine/formulas';
import { mulberry32 } from '../src/engine/rng';
import { itemCore, verifySmelt } from '../src/engine/verify';
import { makeGame } from './helpers';

const seedFor = (n: number) => (Math.imul(n + 1, 2654435761) ^ 0x5bd1e995) >>> 0;

describe('jakość I–V', () => {
  it('progi losowania: I 40%, II 30%, III 18%, IV 9%, V 3%; z rudą unikalną IV (75%) albo V', () => {
    expect(QUAL.reduce((a, q) => a + q.p, 0)).toBe(100);
    expect([0, 0.399, 0.4, 0.699, 0.7, 0.879, 0.88, 0.969, 0.97, 0.9999].map(u => qualityOf(u, false))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect([0, 0.749, 0.75, 0.9999].map(u => qualityOf(u, true))).toEqual([4, 4, 5, 5]);
    expect(qMult(undefined)).toBe(1);
    expect(qMult(5)).toBeCloseTo(1.2);
  });

  it('wytop losuje jakość; statystyki dodatkowe i główna rosną z jakością; serwer odtwarza ją z ziarna', () => {
    const { ctx, s } = makeGame(11);
    s.forge.lvl = 20; s.ores[2] = 9999; s.stats.smelted = 10;
    const seen = new Set<number>();
    for (let n = 0; n < 300; n++) {
      s.seeds = [seedFor(n)]; s.sx = n;
      const it = smelt(ctx, 2, null)!;
      seen.add(it.q!);
      expect(it.jv).toBe(JUMP_V);
      expect(verifySmelt(it, seedFor(n), 0, 30)).toBeNull();
      // podrobiona jakość albo statystyki bez premii — odrzucone
      if (it.q! < 5) expect(verifySmelt({ ...it, q: it.q! + 1 }, seedFor(n), 0, 30)).toBe('jakość');
      const rng = mulberry32(seedFor(n)); smeltDraws(rng);
      const raw = rollSubs(rng, it.r);
      expect(it.subs).toEqual(qualSubs(raw, it.q!));
      if (JSON.stringify(raw) !== JSON.stringify(it.subs)) expect(verifySmelt({ ...it, subs: raw }, seedFor(n), 0, 30)).toBe('statystyki dodatkowe');
      expect(mainVal(it) / mainVal({ ...it, q: undefined })).toBeCloseTo(qMult(it.q), 1);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('ruda unikalna: jakość IV albo V, bez pewnego przeskoku', () => {
    const { ctx, s } = makeGame(12);
    s.forge.lvl = SET_FORGE_LVL + 5; s.ores[2] = 9999; s.stats.smelted = 10; s.pity = 0;
    s.uniq = { lowca: 50 }; s.uniqSel = 'lowca';
    let jumps = 0;
    for (let n = 0; n < 40; n++) {
      s.seeds = [seedFor(1000 + n)]; s.sx = 1000 + n;
      const it = smelt(ctx, 2, null)!;
      expect(it.set).toBe('lowca');
      expect(it.q).toBeGreaterThanOrEqual(4);
      expect(it.forced).not.toBe('set');
      if (it.jump > 0) jumps++;
      expect(verifySmelt(it, seedFor(1000 + n), 0, 40)).toBeNull();
    }
    expect(jumps).toBeLessThan(40); // przeskok losuje się zwyczajnie
    expect(s.uniq.lowca).toBe(10);
  });

  it('jakość w podpisie przedmiotu tylko, gdy jest (dawne podpisy zostają ważne)', () => {
    const { ctx, s } = makeGame(13);
    s.ores[0] = 10;
    const it = smelt(ctx, 0, null)!;
    const old = { ...it, q: undefined };
    expect(itemCore(old)).not.toContain(',' + it.q + ']');
    expect(JSON.parse(itemCore(it)).length).toBe(JSON.parse(itemCore(old)).length + 1);
  });

  it('domieszki są ok. 5 razy słabsze niż przed listopadem 2026', () => {
    expect(ELEM.burz.v).toBe(2.5);
    expect(ELEM.zar.v).toBe(2);
    expect(8 * ELEM.burz.v).toBe(20); // pełne 8 części — +20% obrażeń (dawniej +96%)
  });
});
