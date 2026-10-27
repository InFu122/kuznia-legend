import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { B } from '../../src/data';
import { smelt } from '../../src/engine/forge';
import { upgradeTime } from '../../src/engine/forge';
import { obiegItem } from '../../src/engine/obieg';
import { makeGame } from '../../tests/helpers';
import { seedOf, signItem } from '../src/common';
import { paceProblem, powerOf, verifiedEq, type Proof } from '../src/save';
import { normCode } from '../src/transfer';
import { validateSave } from '../src/validate';

/** Namiastka API Nakamy: tylko skrót SHA-256 (jak nk.sha256Hash — szesnastkowo). */
const nk = { sha256Hash: (s: string) => createHash('sha256').update(s).digest('hex') } as unknown as nkruntime.Nakama;
const SECRET = 'sekret-gracza';
const SIGN = 'sekret-serwera';

function geared() {
  const h = makeGame(9);
  const { ctx, s } = h;
  s.seeds = Array.from({ length: 300 }, (_, i) => seedOf(nk, SECRET, i));
  s.forge.lvl = 20; s.ores[3] = 300; s.stats.smelted = 5;
  for (let i = 0; i < 120; i++) { const it = smelt(ctx, 3, null)!; s.eq[it.slot] = it; }
  const proof: Proof = { nk, secret: SECRET, sign: SIGN, maxRel: 0, forge: s.forge.lvl };
  return { ...h, proof };
}

describe('serwer: pochodzenie przedmiotów', () => {
  it('uznaje przedmioty wytopione z ziaren i liczy z nich Moc', () => {
    const { s, proof } = geared();
    const v = verifiedEq(proof, s, []);
    expect(v.bad).toEqual([]);
    expect(Object.keys(v.eq)).toHaveLength(8);
    expect(powerOf(s, v.eq)).toBe(powerOf(s, s.eq));
    expect(validateSave(s)).toEqual([]);
  });

  it('nie liczy przedmiotów zmienionych, bez dowodu pochodzenia i z cudzym ziarnem', () => {
    const { s, proof } = geared();
    s.eq.helm!.subs[0].v += 5;
    delete s.eq.buty!.sx;
    s.eq.pas!.sx = s.sx + 10;     // numer, którego jeszcze nie było
    const v = verifiedEq(proof, s, []);
    expect(v.bad.sort()).toEqual(['buty', 'helm', 'pas']);
    expect(powerOf(s, v.eq)).toBeLessThan(powerOf(s, s.eq));
  });

  it('uznaje znalezisko z Obiegu tylko z podpisem serwera', () => {
    const { ctx, s, proof } = geared();
    const found = obiegItem(ctx);
    found.slot = 'helm';
    found.sig = signItem(nk, SIGN, found);
    s.eq.helm = found;
    expect(verifiedEq(proof, s, []).bad).toEqual([]);
    found.r = Math.min(6, found.r + 1);
    expect(verifiedEq(proof, s, []).bad).toEqual(['helm']);
  });

  it('pewny przeskok uznaje najwyżej raz na PITY_MAX wytopów', () => {
    const { s, proof } = geared();
    const v1 = verifiedEq(proof, s, []);
    const pityItems = Object.values(s.eq).filter(it => it?.forced === 'pity');
    if (pityItems.length) expect(v1.pity.length).toBe(pityItems.length);
    // Wcześniej uznany pewny przeskok tuż obok: kolejny jest podejrzany.
    const it = s.eq.bron!;
    it.forced = 'pity';
    const near = verifiedEq(proof, s, [it.sx! - 1]);
    expect(near.bad).toContain('bron');
  });

  it('tempo kuźni: odrzuca poziomy zdobyte szybciej niż czasy ulepszeń', () => {
    const { s } = geared();
    const now = 10 * 3600000;
    s.forge.lvl = 20; s.forge.up = 0;
    expect(paceProblem(s, { t0: now - 60000, f0: 19, pity: [] }, now)).toBeTruthy();
    const need = upgradeTime(s, 20);
    expect(paceProblem(s, { t0: now - need, f0: 19, pity: [] }, now)).toBeNull();
    expect(paceProblem(s, { t0: now - 1000, f0: 20, pity: [] }, now)).toBeNull();
  });

  it('tempo kuźni uwzględnia pomoc klanu i najwyższy poziom klanu', () => {
    const { s } = geared();
    const now = 1000 * 3600000;
    s.forge.lvl = 20; s.forge.up = 0; s.clanLvl = 0;
    const need = upgradeTime(s, 20);
    const meta = { t0: now - need * 0.7, f0: 19, pity: [] };
    expect(paceProblem(s, meta, now)).toBeTruthy();                  // bez pomocy za szybko
    expect(paceProblem(s, meta, now, { 20: 10 })).toBeNull();        // 10 pomocy = −30%
    expect(paceProblem(s, { ...meta, t0: now - need * 0.55 }, now, { 20: 50 })).toBeTruthy(); // ponad 10 pomocy się nie liczy
    s.forge.lvl = 30;
    let t28 = 0;
    for (let n = 25; n <= 30; n++) t28 += upgradeTime({ ...s, clanLvl: 10 }, n);
    const m28 = { t0: now - t28, f0: 24, pity: [] };
    expect(paceProblem(s, m28, now)).toBeTruthy();                   // bez premii klanu za szybko
    expect(paceProblem(s, { ...m28, clMax: 10 }, now)).toBeNull();   // gracz był w klanie z premią do czasu ulepszeń
  });

  it('kod przeniesienia: wielkie litery, bez myślników i spacji', () => {
    expect(normCode(' ab3d-ef9h ')).toBe('AB3DEF9H');
    expect(normCode(5)).toBe('');
  });

  it('kontrola zapisu sprawdza ziarna i kolejki Obiegu', () => {
    const { s } = geared();
    s.seeds.push(-1);
    s.sx = 1.5;
    s.obIn = Array.from({ length: B.OBIEG_STOCK + 5 }, () => s.eq.helm!);
    const p = validateSave(s);
    expect(p).toContain('ziarna wytopu');
    expect(p).toContain('numer wytopu');
    expect(p).toContain('zapas Obiegu');
  });
});
