import { describe, expect, it } from 'vitest';
import { DUNGEON_FOES, LANDS, SLOTS } from '../src/data';
import { HERO_H, HERO_W, clanBossPixels, companionPixels, foeKey, foePixels, foeSize, foeTemplate, heroKey, heroPixels } from '../src/art/actors';
import { CLAN_BOSSES, MOUNTS, PETS } from '../src/data';
import { ramp6, unrle } from '../src/art/pixel';
import { CLAN_BOSS_LOOK, COMPANION_LOOK, FOE_LOOK, FOE_TEMPLATES, HERO_LAYERS } from '../src/art/actors-data';

const opaque = (px: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] === 255) n++; return n; };

describe('postaci na polu walki', () => {
  it('każdy wróg i boss krain oraz lochów ma własny wygląd', () => {
    const names = [...LANDS.flatMap(L => [...L.foes, L.boss]), ...DUNGEON_FOES, 'Goblin z workiem', 'Kryształowy golem', 'Minotaur', 'Elitarny strażnik', 'Strażnik Labiryntu'];
    const missing = names.filter(n => !FOE_LOOK[n]);
    expect(missing).toEqual([]);
    for (const [, [t]] of Object.entries(FOE_LOOK)) expect(FOE_TEMPLATES[t]).toBeDefined();
  });

  it('wrogowie o zmiennej nazwie dostają wygląd po początku nazwy, nieznani — po rodzaju', () => {
    expect(foeKey('Strażnik 12. piętra', 'Demony')).toBe('Strażnik piętra');
    expect(foeKey('Strażnik: Żar', 'Demony')).toBe('Strażnik ołtarza');
    expect(foeKey('Strażnik Krypty 3/5', 'Nieumarli')).toBe('Strażnik Krypty');
    expect(foeKey('Duch: Marek_PL', 'Nieumarli')).toBe('Duch');
    expect(foeKey('Ktoś zupełnie nowy', 'Smoki')).toBe('Wywerna');
    expect(foeTemplate('Czerwony Smok')).toBe('czerwony_smok');
    expect(foeKey('Król Lisz z Otchłani', 'Nieumarli')).toBe('Król Lisz');
  });

  it('wróg to obrazek 48×48, boss krainy 64×64 — z dwiema klatkami ruchu', () => {
    const px = foePixels('Wygłodniały wilk');
    expect(foeSize('Wygłodniały wilk')).toBe(48);
    expect(px.length).toBe(48 * 48 * 4);
    expect(opaque(px)).toBeGreaterThan(400);
    expect(Buffer.from(px).equals(Buffer.from(foePixels('Wygłodniały wilk', undefined, 1)))).toBe(false);
    for (const L of LANDS) {
      expect(foeSize(L.boss), L.boss).toBe(64);
      expect(opaque(foePixels(L.boss)), L.boss).toBeGreaterThan(900);
    }
    for (const [k, [w, a, b]] of Object.entries(FOE_TEMPLATES)) {
      expect(unrle(a, w).length, k).toBe(w);
      expect(unrle(b, w).every(r => r.length === w), k).toBe(true);
    }
  });

  it('każdy boss krainy ma własny szablon', () => {
    const tpls = LANDS.map(L => FOE_LOOK[L.boss][0]);
    expect(new Set(tpls).size).toBe(LANDS.length);
  });

  it('chowańce, wierzchowce i bossowie klanowi mają portrety', () => {
    for (const id of [...Object.keys(PETS), ...Object.keys(MOUNTS)]) { expect(COMPANION_LOOK[id], id).toBeDefined(); expect(opaque(companionPixels(id))).toBeGreaterThan(300); }
    for (const b of CLAN_BOSSES) { expect(CLAN_BOSS_LOOK[b.pal], b.pal).toBeDefined(); expect(opaque(clanBossPixels(b.pal))).toBeGreaterThan(900); }
  });

  it('tony materiału: od ciemnego obrysu do jasnego blasku', () => {
    const r = ramp6('#8a5d3b');
    const lum = (c: string) => parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.59 + parseInt(c.slice(5, 7), 16) * 0.11;
    expect(r).toHaveLength(6);
    expect(r[3]).toBe('#8a5d3b');
    for (let i = 1; i < 6; i++) expect(lum(r[i])).toBeGreaterThan(lum(r[i - 1]));
  });

  it('każdy rodzaj hełmu, zbroi, rękawic, butów i pasa ma warstwę na każdym poziomie zdobień', () => {
    for (const slot of ['helm', 'zbroja', 'rekawice', 'buty', 'pas'] as const) {
      for (const [kind] of SLOTS[slot].kinds) for (let t = 0; t < 3; t++) expect(HERO_LAYERS[`${slot}:${kind}:${t}`], `${slot}:${kind}:${t}`).toBeDefined();
    }
  });

  it('wygląd bohatera zależy od założonego ekwipunku', () => {
    const bare = heroPixels({});
    expect(bare.length).toBe(HERO_W * HERO_H * 4);
    expect(Buffer.from(bare).equals(Buffer.from(heroPixels({}, 'zwykly', 1)))).toBe(false); // druga klatka: oddech
    for (const [kind] of SLOTS.bron.kinds) for (let t = 0; t < 3; t++) expect(HERO_LAYERS[`bron:${kind}:${t}`], kind).toBeDefined();
    const knight = heroPixels({ bron: { kind: 'Miecz', ore: 1 }, helm: { kind: 'Hełm', ore: 1 }, zbroja: { kind: 'Napierśnik', ore: 1 } });
    const mage = heroPixels({ bron: { kind: 'Kostur', ore: 3 }, helm: { kind: 'Diadem', ore: 3 }, zbroja: { kind: 'Szata', ore: 3 } });
    expect(opaque(knight)).toBeGreaterThan(opaque(bare));
    expect(Buffer.from(knight).equals(Buffer.from(mage))).toBe(false);
    // inna ruda tego samego rodzaju — inny kolor
    const silver = heroPixels({ helm: { kind: 'Hełm', ore: 2 } }), copper = heroPixels({ helm: { kind: 'Hełm', ore: 0 } });
    expect(Buffer.from(silver).equals(Buffer.from(copper))).toBe(false);
    expect(heroKey({ helm: { kind: 'Hełm', ore: 2 } })).not.toBe(heroKey({ helm: { kind: 'Hełm', ore: 0 } }));
  });

  it('nieznany rodzaj przedmiotu nie psuje rysunku (bierze domyślny)', () => {
    const px = heroPixels({ helm: { kind: 'Korona z przyszłości', ore: 2 }, bron: { kind: 'Nowa broń', ore: 2 } });
    expect(opaque(px)).toBeGreaterThan(opaque(heroPixels({})));
  });
});
