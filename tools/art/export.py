# Eksport pixel artu do TypeScriptu: src/art/items-data.ts i src/art/icons-data.ts
import sys, json; sys.path.insert(0, '.')
import weapons, armor, more, ores, skills, tech, bosses
OUT = sys.argv[1]

def arr(rows, ind='    '):
    return '[\n' + ''.join(f"{ind}  '{r}',\n" for r in rows) + f"{ind}]"

# --- ekwipunek: szablony (paleta wspólna, metal z rudy) ---
kinds = {**weapons.KINDS, **armor.KINDS, **more.KINDS}
lines = ["// Wygenerowane przez tools/art/export.py — szablony ekwipunku 16×16 (3 poziomy zdobień).",
         "// Znaki: k obrys, 1-4 metal rudy, a b c drewno, l m n skóra, y Y Z złoto, g h klejnot, r s sukno, w błysk.",
         "export const ITEM_TEMPLATES: Record<string, [string[], string[], string[]]> = {"]
for name, fn in kinds.items():
    lines.append(f"  '{name}': [")
    for tier in range(3):
        lines.append('    ' + arr(fn(tier), '    ') + ',')
    lines.append('  ],')
lines.append('};')
open(f'{OUT}/items-data.ts', 'w').write('\n'.join(lines) + '\n')

# --- ikony z własną paletą ---
def icon_entry(key, rp):
    rows, pal = rp
    used = set(''.join(rows)) - {'.'}
    p = {k: v for k, v in pal.items() if k in used}
    return f"  '{key}': {{ rows: {arr(rows, '  ')}, pal: {json.dumps(p, ensure_ascii=False)} }},"

groups = [
    ('ORE_ICONS', 'rudy (indeks jak ORES)', [(str(i), f()) for i, f in enumerate(ores.ORE_ICONS.values())]),
    ('ELEM_ICONS', 'domieszki żywiołów', [(k, f()) for k, f in ores.ELEM_ICONS.items()]),
    ('SET_ORE_ICONS', 'rudy unikalne zestawów', [(k, f()) for k, f in ores.SET_ICONS.items()]),
    ('RES_ICONS', 'zasoby', [(k, f()) for k, f in ores.RES_ICONS.items()] + [('moneta', bosses.clan_coin()), ('czas', bosses.hourglass())]),
    ('SKILL_ICONS', 'umiejętności 24×24', [(k, f()) for k, f in skills.SKILL_ICONS.items()]),
    ('TECH_ICONS', 'badania 20×20', [(k, f()) for k, f in tech.TECH_ICONS.items()]),
    ('BOSS_ICONS', 'bossowie klanowi 32×32', [(k, (bosses.boss_template(), bosses.boss_palette(k))) for k in bosses.PALS]),
]
lines = ["// Wygenerowane przez tools/art/export.py — ikony z własną paletą.",
         "export interface IconData { rows: string[]; pal: Record<string, string> }"]
for name, desc, items in groups:
    lines.append(f"\n/** {desc[0].upper() + desc[1:]}. */")
    lines.append(f"export const {name}: Record<string, IconData> = {{")
    for k, rp in items: lines.append(icon_entry(k, rp))
    lines.append('};')
open(f'{OUT}/icons-data.ts', 'w').write('\n'.join(lines) + '\n')
print('ok', sum(len(i) for _, _, i in groups), 'ikon,', len(kinds) * 3, 'szablonów')
