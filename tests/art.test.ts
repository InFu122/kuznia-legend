import { describe, expect, it } from 'vitest';
import { CLAN_BOSSES, CLAN_SHOP, ELEM, KIND_POOL_SIZES, ORES, SETS, SKILLS, SLOTS, TECH } from '../src/data';
import { BOSS_ICONS, ELEM_ICONS, ORE_ICONS, RES_ICONS, SET_ORE_ICONS, SKILL_ICONS, TECH_ICONS, type IconData } from '../src/art/icons-data';
import { ITEM_TEMPLATES } from '../src/art/items-data';
import { itemPalette } from '../src/art/items';
import { halo, RARITY_GLOW } from '../src/art/rarity';
import { rgba, sprite } from '../src/art/pixel';

const usedChars = (rows: string[]) => new Set(rows.join('').split('').filter(c => c !== '.'));

describe('pixel art', () => {
  it('każdy rodzaj przedmiotu z puli wytopu ma 3 szablony 16×16 z kolorami w palecie', () => {
    const pal = itemPalette(3);
    for (const s of Object.values(SLOTS)) for (const [kind] of s.kinds) {
      const t = ITEM_TEMPLATES[kind];
      expect(t, kind).toBeDefined();
      for (const rows of t) {
        expect(rows.length, kind).toBe(16);
        expect(rows.every(r => r.length === 16), kind).toBe(true);
        for (const c of usedChars(rows)) expect(pal[c], `${kind}: znak ${c}`).toBeDefined();
      }
    }
  });

  it('ikony istnieją dla rud, domieszek, rud unikalnych, umiejętności i badań, a ich palety są pełne', () => {
    const check = (d: IconData | undefined, name: string) => {
      expect(d, name).toBeDefined();
      for (const c of usedChars(d!.rows)) expect(d!.pal[c], `${name}: znak ${c}`).toBeDefined();
    };
    ORES.forEach((o, i) => check(ORE_ICONS[String(i)], o.n));
    Object.keys(ELEM).forEach(k => check(ELEM_ICONS[k], k));
    Object.keys(SETS).forEach(k => check(SET_ORE_ICONS[k], k));
    Object.keys(SKILLS).forEach(k => check(SKILL_ICONS[k], k));
    Object.keys(TECH).forEach(k => check(TECH_ICONS[k], k));
    ['zloto', 'ksiega', 'zwoj', 'siodlo', 'kamien', 'pieczec', 'jajo0', 'jajo4', 'moneta'].forEach(k => check(RES_ICONS[k], k));
    for (const b of CLAN_BOSSES) {
      check(BOSS_ICONS[b.pal], b.n);
      expect(BOSS_ICONS[b.pal].rows.length).toBe(32);
      expect(BOSS_ICONS[b.pal].rows.every(r => r.length === 32)).toBe(true);
    }
    // towary sklepu klanowego mają ikony
    for (const it of Object.values(CLAN_SHOP)) expect(it.icon.startsWith('ore') ? ORE_ICONS[it.icon.slice(3)] : RES_ICONS[it.icon], it.n).toBeDefined();
  });

  it('historia pul: ostatnia długość to obecna lista, a długości rosną', () => {
    for (const [slot, sizes] of Object.entries(KIND_POOL_SIZES)) {
      expect(sizes[sizes.length - 1], slot).toBe(SLOTS[slot as keyof typeof SLOTS].kinds.length);
      expect(sizes.every((n, i) => i === 0 || n > sizes[i - 1]), slot).toBe(true);
    }
  });

  it('poświata rzadkości: brak dla Zwykłego, obwódka w kolorze rzadkości od Niepospolitego', () => {
    const s = sprite(ITEM_TEMPLATES['Miecz'][0]);
    const base = rgba(s, itemPalette(0));
    const h0 = halo(base, s.w, s.h, 0), h5 = halo(base, s.w, s.h, 5);
    expect(h0.w).toBe(18);
    const count = (px: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i]) n++; return n; };
    expect(count(h5.px)).toBeGreaterThan(count(h0.px));
    expect(RARITY_GLOW).toHaveLength(7);
  });
});
