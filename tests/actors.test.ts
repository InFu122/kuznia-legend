import { describe, expect, it } from 'vitest';
import { DUNGEON_FOES, LANDS, SLOTS } from '../src/data';
import { FOE_H, FOE_W, HERO_H, HERO_W, foeKey, foePixels, foeTemplate, heroKey, heroPixels } from '../src/art/actors';
import { FOE_LOOK, FOE_TEMPLATES, HERO_LAYERS } from '../src/art/actors-data';

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
    expect(foeTemplate('Czerwony Smok')).toBe('smok');
  });

  it('wróg to obrazek 32×32 z sylwetką', () => {
    const px = foePixels('Wygłodniały wilk');
    expect(px.length).toBe(FOE_W * FOE_H * 4);
    expect(opaque(px)).toBeGreaterThan(150);
  });

  it('każdy rodzaj hełmu, zbroi, rękawic, butów i pasa ma warstwę na każdym poziomie zdobień', () => {
    for (const slot of ['helm', 'zbroja', 'rekawice', 'buty', 'pas'] as const) {
      for (const [kind] of SLOTS[slot].kinds) for (let t = 0; t < 3; t++) expect(HERO_LAYERS[`${slot}:${kind}:${t}`], `${slot}:${kind}:${t}`).toBeDefined();
    }
  });

  it('wygląd bohatera zależy od założonego ekwipunku', () => {
    const bare = heroPixels({});
    expect(bare.length).toBe(HERO_W * HERO_H * 4);
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
