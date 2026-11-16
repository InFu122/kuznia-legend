# Postaci na polu walki → src/art/actors-data.ts.
#  - bohater 48×48 z warstw (hero.py),
#  - wrogowie 48×48 (foes.py) i bossowie krain 64×64 (bossy.py), po dwie klatki ruchu,
#  - kto jak wygląda: szablon + kolory bazowe materiałów (gra robi z nich tony: src/art/pixel.ts ramp6).
import sys, json; sys.path.insert(0, '.')
import foes, bossy, hero, vol

BONE, STEEL, GOLD, WOOD, CREAM = '#e6dcc0', '#a8b0bc', '#d9a83a', '#6a4a2a', '#c8b590'
def P(**k): return k

FOES = {
    # --- akt I
    'Wygłodniały wilk': ('wilk', P(p='#8a847a', q=CREAM, s='#4a413c', e='#ffd23a')),
    'Wściekły pies': ('pies', P(p='#8a5d3b', q=CREAM, s='#4a2e1c', e='#ff5a3a', g='#d8f0ff')),
    'Dziki odyniec': ('dzik', P(p='#8a5d3b', q='#c79a7a', s='#4a2e1c', t=BONE, e='#ff5a3a')),
    'Herszt Bandytów': ('herszt', P(p='#6a4630', q='#8a8478', r='#8a2a25', s='#3a3440', t='#c79a7a', u='#3a2618', x=STEEL, e='#ffd23a')),
    'Leśny wilk': ('wilk', P(p='#646650', q='#b8b090', s='#34362a', e='#c8ff5a')),
    'Olbrzymi pająk': ('pajak', P(p='#4a413c', q='#6a5f58', r='#d8302a', s='#2a2530', t=BONE, e='#ff4040')),
    'Dzik': ('dzik', P(p='#4a413c', q='#9c6e52', s='#27252f', t=BONE, e='#ffd23a')),
    'Wilkołak Alfa': ('wilkolak', P(p='#3c3946', q='#6a6672', r='#5a4a6a', s='#24222c', t=BONE, e='#ff3030')),
    'Bagienna ropucha': ('ropucha', P(p='#6f8a3e', q='#d8d09a', s='#4b6a28', t='#f0d040', e='#ffffff')),
    'Olbrzymia pijawka': ('pijawka', P(p='#5c3a4c', q='#b06a7a', r='#7a1e2a', s='#33222c', e='#ff7070')),
    'Błotny wąż': ('waz', P(p='#6f7f3e', q='#d8c890', s='#4b5728', e='#ffd23a', g='#ff5a6a')),
    'Wiedźma z Mokradeł': ('wiedzma', P(p='#3a3444', q='#d8d4c8', r='#8a2a6a', s='#2a4a2a', t='#8fb46a', u=WOOD, x='#8ae04a', e='#ffe03a', g='#c8ff8a')),
    'Szkielet strażnik': ('szkielet', P(p=BONE, q='#8a5d3b', r='#8a2a25', s='#3a2a30', t=STEEL, e='#7ad8ff')),
    'Upiorny łucznik': ('lucznik', P(p='#b8d4cc', q='#6a4a32', r='#3a5a52', s='#243a38', t=STEEL, e='#8affd0')),
    'Zjawa': ('upior', P(p='#a9d6cf', q='#dff3f0', s='#1c2a30', e='#8affd0', g='#4ac8a0')),
    'Upadły Rycerz': ('upadly', P(p='#4a4e5c', q='#2e303a', r='#d8302a', s='#4a1c28', u=WOOD, x='#8a909c', e='#ff4040', g='#ff6a5a')),
    # --- akt II
    'Kret olbrzymi': ('kret', P(p='#5a4c48', q='#e0a0a0', r='#f08a9a', s='#3c3230', t=BONE, e='#ffd23a')),
    'Kamienny chrząszcz': ('chrzaszcz', P(p='#6a7078', q='#3a3440', r='#45a698', s='#2c2a34', t='#c8c0a8', e='#6cf0a0')),
    'Jaskiniowy troll': ('troll', P(p='#64785c', q='#8aa080', r='#8a5d3b', s='#2c3628', t=BONE, u='#7a5232', e='#ffcf4a')),
    'Kamienny Golem': ('golem_boss', P(p='#8a8478', q='#6a655c', r='#4ae0a0', s='#3a3632', u='#75706a', v='#5f8a45', e='#6cf0a0', g='#4ae0a0')),
    'Śnieżny wilk': ('wilk', P(p='#d0e0ec', q='#ffffff', s='#8aa2b4', e='#5ac8ff')),
    'Yeti': ('yeti', P(p='#d0e4f0', q='#6a88a8', r='#5a6a7a', s='#2c4868', t='#3a4a5a', e='#5ac8ff')),
    'Lodowy żywiołak': ('zywiolak', P(p='#8ad8f0', q='#c6f6ff', r='#ffffff', s='#3a7498', e='#ffffff', g='#c6f6ff')),
    'Lodowy Olbrzym': ('olbrzym', P(p='#7aa8cc', q='#e6f6ff', r='#b0e4f8', s='#3a5a7a', u='#c8d4dc', e='#ffffff', g='#c6f6ff')),
    'Harpia': ('harpia', P(p='#94664a', r='#5a2a4a', s='#6a4632', t='#3a3030', u='#d8a888', e='#ff5a8a')),
    'Burzowy sokół': ('ptak', P(p='#7884a0', q='#d8d0c0', s='#525c78', t=GOLD, e='#fff07a')),
    'Górski troll': ('troll', P(p='#8a847a', q='#a8a298', r='#6a4630', s='#34302c', t=BONE, u='#5a4a3a', e='#ffcf4a')),
    'Gromowy Gryf': ('gryf_boss', P(p='#f0e4c8', q=CREAM, r='#c09a3e', s='#56648a', t=GOLD, u='#fff6a8', e='#9ff0ff', g='#9ff0ff')),
    'Jaskiniowy pająk': ('pajak', P(p='#8a5d3b', q='#a87a50', r='#e0a040', s='#3a2a20', t=BONE, e='#ffd27a')),
    'Ślepy pełzacz': ('pelzacz', P(p='#c0a2a2', q='#e8d8d0', s='#7a5c5c', t='#5a3a3a')),
    'Grzybołak': ('grzyb', P(p='#a84a6a', q='#e8d8c0', r='#f0e8e0', s='#8a7a60', t='#e0d0b0', e='#2a1a20', g='#c8ff8a')),
    'Pajęcza Królowa': ('krolowa', P(p='#523c7a', q='#7a5ca8', r='#e05aa8', s='#27252f', t=BONE, u='#d8d0c0', x='#ffd0ea', e='#ff5ad8', g='#8ae04a')),
    # --- akt III
    'Ghul': ('ghul', P(p='#8c9c7e', r='#5a4a3a', s='#56644a', t=BONE, e='#c8ff5a')),
    'Szkielet': ('szkielet', P(p='#d8ccb0', q='#5a4a3a', r='#4a3a5a', s='#2a2030', t='#8a8478', e='#ff6a3a')),
    'Upiór': ('upior', P(p='#8a82ae', q='#cfc8e6', s='#1e1a2c', e='#c8ff8a', g='#8ae04a')),
    'Upiorny Hrabia': ('hrabia', P(p='#2a2434', r='#a01e1e', s='#1c1824', t='#e0d8e8', u='#18141c', x='#f0ece0', e='#ff3a3a')),
    'Mumia': ('mumia', P(p='#d8c494', q='#c2a468', s='#7e6a44', e='#6cf0ff', g='#2ab0c8')),
    'Pustynny skorpion': ('skorpion', P(p='#c2a468', s='#7a5a34', t='#3a2a20', e='#ff5a3a', g='#8ae04a')),
    'Piaskowy upiór': ('upior', P(p='#c2a468', q='#e8cf98', s='#3a2a1a', e='#ffe08a', g='#e0a040')),
    'Kościany Skorpion': ('skorpion_boss', P(p='#cbbf9f', s='#7a6e54', t='#efe6cf', e='#ff3a3a', g='#8ae04a')),
    'Rycerz śmierci': ('rycerz', P(p='#34313e', q='#22202a', r='#4ae080', s='#1a2c22', t='#7a8a84', e='#8affb0')),
    'Nekromanta': ('mag', P(p='#523c7a', q='#2a2230', r='#8ae04a', s='#3a2a20', t=BONE, e='#c8ff8a', g='#c8ff8a')),
    'Kościany golem': ('golem', P(p='#cbbf9f', q='#968a6c', r='#8ae04a', s='#3a3428', e='#c8ff8a', g='#8ae04a')),
    'Król Lisz': ('lisz', P(p='#3e3258', q=GOLD, s='#1a1426', t=BONE, u='#c9a03a', x='#5ad0ff', e='#5ad0ff', g='#5ad0ff')),
    'Opętany mnich': ('mnich', P(p='#8a5d3b', q='#d8c890', s='#4a2e1c', t='#c8a890', e='#ff5a3a', g='#ff4a3a')),
    'Chochlik': ('chochlik', P(p='#b8463a', q='#d86a4a', s='#5a2030', t='#3a2a30', u='#4a3a30', e='#ffe08a')),
    'Spaczony kapłan': ('mag', P(p='#a0302a', q=GOLD, r='#e05aa8', s='#3a2a20', t='#c8a890', e='#ff5ad8', g='#ff9ad8')),
    'Upadły Opat': ('opat', P(p='#4c1c34', q='#e8dcc0', r='#7a3a6a', s='#200a14', t='#c8a0a0', u=GOLD, x='#3a2a30', e='#ffae3a', g='#c8a0ff')),
    # --- akt IV
    'Ognisty chochlik': ('chochlik', P(p='#e0702a', q='#ffb066', s='#7a2a1a', t='#3a1a14', u='#4a2a20', e='#fff07a')),
    'Magmowy golem': ('golem_magma', P(p='#4a3a38', q='#33282a', r='#ff7a2a', s='#1e1618', e='#ffe03a', g='#ffb040')),
    'Piekielny ogar': ('ogar', P(p='#58261c', q='#8a3a22', r='#e0702a', s='#2a1210', e='#ffe03a', g='#ffe08a')),
    'Ognisty Tytan': ('tytan', P(p='#4a3a38', q='#33282a', r='#ff7a2a', s='#1e1618', e='#ffe03a', g='#ffb040')),
    'Wywerna': ('wywerna', P(p='#5f9a45', q='#c8d890', r='#8a5a3a', s='#3d6c2d', t=BONE, e='#ffd23a')),
    'Smoczy kultysta': ('mag', P(p='#7a1e1a', q='#2a2026', r='#ff8a2a', s='#3a2a20', t='#c8a890', e='#ffae3a', g='#ffb040')),
    'Młody smok': ('smok', P(p='#b8463a', q='#e8a070', r='#7a2a3a', s='#842a25', t=BONE, e='#ffe03a')),
    'Czerwony Smok': ('czerwony_smok', P(p='#b0362e', q='#e07a3a', r='#6a1c2a', s='#7c1e1a', t=BONE, u=GOLD, v='#ff9a2a', e='#fff07a', g='#ffb040')),
    'Lodowy Smok': ('czerwony_smok', P(p='#8ac4e0', q='#e6f6ff', r='#4a7aa8', s='#5a8ab0', t='#ffffff', u='#c6f6ff', v='#c6f6ff', e='#5ac8ff', g='#c6f6ff')),
    'Morski wąż': ('waz_morski', P(p='#45a698', q='#c8f0d8', r='#3a6a9a', s='#2b7468', e='#ffe08a', g='#ff5a6a')),
    'Burzowa wywerna': ('wywerna', P(p='#56648e', q='#c8d8f0', r='#3a4a7a', s='#3a4666', t=BONE, e='#9ff0ff')),
    'Smok błyskawic': ('smok', P(p='#3a56b0', q='#ffd84a', r='#26388a', s='#26387a', t='#fff6a8', e='#fff6a8')),
    'Burzowy Lewiatan': ('lewiatan', P(p='#34587e', q='#9fd8e8', r='#2a98c0', s='#223c58', u='#3a6a9a', x='#fff6a8', e='#9ff0ff', g='#9ff0ff')),
    'Gwiezdny pomiot': ('pomiot', P(p='#5a44a8', q='#c9b8ff', r='#ffd84a', s='#352870', g='#c9b8ff')),
    'Pustkowiec': ('upior', P(p='#332e4a', q='#8d72e0', s='#0e0c18', e='#c9b8ff', g='#8d72e0')),
    'Strażnik krateru': ('halabardnik', P(p='#8d72e0', q='#5a44a8', r=GOLD, s='#281e4a', t='#e8e0ff', u='#c9a03a', e='#fffbe8')),
    'Gwiezdny Pożeracz': ('pozeracz', P(p='#2a2246', q='#8d72e0', r='#ffd84a', s='#1c1630', t='#e8e0ff', x='#fffbe8', g='#c9b8ff')),
    # --- lochy
    'Kopalniany golem': ('golem', P(p='#7a6a58', q='#5a4c3e', r='#ffb040', s='#2e2620', e='#ffd23a', g='#ffb040')),
    'Kamienny pełzacz': ('pelzacz', P(p='#8a847a', q='#b8b2a8', s='#4a4640', t='#2c2a28')),
    'Goblin z workiem': ('goblin', P(p='#5f9a45', q='#a07e48', r='#7a4a32', s='#3a2a20', t='#c9d0d8', u='#6a4a2a', e='#ffe03a', g='#ffe08a')),
    'Kryształowy golem': ('golem_krysztal', P(p='#7a9ab8', q='#56708e', r='#8ad8f0', s='#2c4058', e='#ffffff', g='#8ad8f0')),
    'Minotaur': ('minotaur', P(p='#8a5d3b', q='#c8a07a', r='#8a2a25', s='#2a1c14', t=BONE, u='#c9a03a', e='#ff3a3a')),
    'Elitarny strażnik': ('halabardnik', P(p='#c8a040', q='#8a6a20', r='#b8463a', s='#6a1c24', t='#c9d0d8', u=WOOD, e='#ffd23a')),
    'Strażnik Labiryntu': ('rycerz', P(p='#8a6a4a', q='#5a4630', r='#b8463a', s='#3a2a20', t='#c9d0d8', e='#ffd23a')),
    # --- wrogowie z nazwą zmienną (gra dobiera ich po początku nazwy)
    'Strażnik piętra': ('rycerz', P(p='#7a5ca8', q='#523c7a', r=GOLD, s='#281e4a', t='#e8e0ff', e='#ffd23a')),
    'Strażnik ołtarza': ('zywiolak', P(p='#e0702a', q='#ffd08a', r='#fff6c0', s='#7a2a10', e='#fff6c0', g='#ffb040')),
    'Duch': ('upior', P(p='#aab8e6', q='#dfe8ff', s='#1e2238', e='#9fe8ff', g='#5a8aff')),
    'Strażnik Krypty': ('rycerz', P(p='#3a4a42', q='#26322c', r='#4ae080', s='#121c16', t=BONE, e='#8affb0')),
}
# Towarzysze (portrety w Bohaterze): klucz = id chowańca albo wierzchowca.
COMPANIONS = {
    'wilczek': ('wilk', P(p='#c8c2b6', q='#f0ece0', s='#7a7468', e='#5ab0ff')),
    'kruk': ('ptak', P(p='#3c3946', q='#5a5664', s='#27252f', t='#5a5664', e='#ff5a5a')),
    'zolw': ('zolw', P(p='#6a8a4a', q='#8a7a50', r='#5a4a2a', e='#ffd23a')),
    'salamandra': ('jaszczur', P(p='#e0702a', q='#ffe08a', r='#5a2a1a', s='#a8441a', e='#fff07a', g='#ff5a6a')),
    'sowa': ('sowa', P(p='#d0d8e2', q='#f4f6fa', s='#94a2b4', t=GOLD, e='#ffcf3a')),
    'gryfiatko': ('gryf', P(p='#f0dcb0', q=CREAM, r='#b08a5a', s='#8a9ab8', t=GOLD, e='#2a6aff')),
    'wilkor': ('wilk', P(p='#3e3258', q='#6a5a90', s='#1a1426', e='#c88aff')),
    'feniks': ('feniks', P(p='#e0702a', q='#ffd060', r='#ffe08a', s='#b8361a', t=GOLD, e='#fff6c0', g='#fff2a8')),
    'smoczek': ('smok', P(p='#45a698', q='#c8f0e0', r='#1c4250', s='#2b7468', t=BONE, e='#ffe03a')),
    'kon': ('kon', P(p='#8a5d3b', r='#a0302a', s='#2a1a10', t='#5a3a22', e='#1a1010')),
    'dzik': ('dzik', P(p='#4a413c', q='#9c6e52', s='#939ca8', t=BONE, e='#ff5a3a')),
    'wilk': ('wilk', P(p='#c2a468', q='#e9dcc0', s='#8a5d3b', e='#ffd23a')),
    'niedzwiedz': ('mis', P(p='#7a5232', q='#a07a54', r='#939ca8', s='#2a1c14', t='#636b77', e='#ffcf4a')),
    'jaszczur': ('jaszczur', P(p='#c2a468', q='#e9dcc0', r='#b8582a', s='#8a5d3b', e='#ffe03a', g='#ff5a6a')),
    'jednorozec': ('jednorozec', P(p='#e6eaf2', r='#b880f0', s='#b880f0', t=GOLD, e='#5a3a8a')),
    'gryf': ('gryf', P(p='#e8dcc0', q=CREAM, r='#c09a3e', s='#56648a', t=GOLD, e='#9ff0ff')),
    'smok': ('smok', P(p='#33284a', q='#7458a6', r='#7044c0', s='#221a32', t=BONE, e='#c8a0ff')),
}
# Bossowie klanowi (klucz = pal z CLAN_BOSSES).
CLAN_BOSSES = {
    'golem': ('golem_boss', P(p='#6a7080', q='#4a4e5c', r='#ffb040', s='#2a2c36', u='#565a68', v='#8a5d3b', e='#ffd23a', g='#ffb040')),
    'kamien': ('golem_boss', P(p='#8a8478', q='#6a655c', r='#4ae0a0', s='#3a3632', u='#75706a', v='#5f8a45', e='#6cf0a0', g='#4ae0a0')),
    'ogien': ('tytan', P(p='#4a3a38', q='#33282a', r='#ff7a2a', s='#1e1618', e='#ffe03a', g='#ffb040')),
    'lod': ('olbrzym', P(p='#7aa8cc', q='#e6f6ff', r='#b0e4f8', s='#3a5a7a', u='#c8d4dc', e='#ffffff', g='#c6f6ff')),
    'upior': ('upadly', P(p='#3a4a42', q='#26322c', r='#4ae080', s='#16261e', u=WOOD, x='#7a8a84', e='#8affb0', g='#4ae080')),
}
FOE_BY_TYPE = {'Bestie': 'Wygłodniały wilk', 'Nieumarli': 'Szkielet', 'Demony': 'Chochlik', 'Smoki': 'Wywerna'}

def template(name):
    if name in bossy.BOSS_TEMPLATES: return bossy.BOSS_TEMPLATES[name]
    return getattr(foes, name)

def rle(rows):
    s = ''.join(rows); out = []; i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]: j += 1
        n = j - i; out.append((str(n) if n > 2 else '') + (s[i] if n > 2 else s[i] * n)); i = j
    return ''.join(out)

def crop(rows):
    ys = [y for y, r in enumerate(rows) if r.strip('.')]
    if not ys: return (0, 0, [])
    xs = [x for r in rows for x, ch in enumerate(r) if ch != '.']
    x0, x1 = min(xs), max(xs)
    return (x0, ys[0], [r[x0:x1 + 1] for r in rows[ys[0]:ys[-1] + 1]])

def export_ts(out):
    arr = lambda rows: '[' + ', '.join(f"'{r}'" for r in rows) + ']'
    L = hero.layers()
    lines = ["// Wygenerowane przez tools/art/export.py (actors.py) — postaci na polu walki.",
             "// Znaki: materiał m (kolejny z „pqrstuvx”) i ton t (0 obrys, 1–5 cień → blask) to znak A–v o numerze m·6+t;",
             "// * oczy, + biel, # czerń, ~ poświata, ^ jasna poświata. Kolory tonów liczy gra z koloru bazowego (pixel.ts: ramp6).",
             f"export const HERO_W = {hero.W};", f"export const HERO_H = {hero.H};",
             f"/** Kolory bazowe ciała: p skóra, q włosy, r tunika, s spodnie, t buty. */",
             f"export const HERO_BODY: Record<string, string> = {json.dumps(hero.BODY)};",
             "/** Warstwa bohatera: [x, y, wiersze] — przycięta do zajętego prostokąta. Ekwipunek: p metal, q złoto, r skóra, s drewno, t sukno, u klejnot. */",
             "export const HERO_LAYERS: Record<string, [number, number, string[]]> = {"]
    for k, rows in L.items():
        x, y, r = crop(rows)
        lines.append(f"  '{k}': [{x}, {y}, {arr(r)}],")
    lines.append('};')
    used = sorted({tk for tk, _ in list(FOES.values()) + list(COMPANIONS.values()) + list(CLAN_BOSSES.values())})
    T = {}
    for k in used:
        fn = template(k); T[k] = [fn(0).rows(), fn(1).rows()]
    lines.append("\n/** Szablony wrogów: [bok płótna, klatka 0, klatka 1] (zapis RLE: liczba + znak). Patrzą w lewo, na bohatera. */")
    lines.append("export const FOE_TEMPLATES: Record<string, [number, string, string]> = {")
    for k, (a, b) in T.items(): lines.append(f"  '{k}': [{len(a)}, '{rle(a)}', '{rle(b)}'],")
    lines.append('};')
    def table(name, doc, d):
        lines.append(f"\n/** {doc} */")
        lines.append(f"export const {name}: Record<string, [string, Record<string, string>]> = {{")
        for n, (tk, cols) in d.items():
            chars = set(''.join(T[tk][0] + T[tk][1]))
            keep = {m: c for m, c in cols.items() if m in 'eg' or any(vol.ALPH[vol.MATS.index(m) * 6 + t] in chars for t in range(6))}
            miss = [m for i, m in enumerate(vol.MATS) if any(vol.ALPH[i * 6 + t] in chars for t in range(6)) and m not in cols]
            if miss: raise SystemExit(f'{n} ({tk}): brak kolorów materiałów {miss}')
            lines.append(f"  {json.dumps(n, ensure_ascii=False)}: ['{tk}', {json.dumps(keep)}],")
        lines.append('};')
    table('FOE_LOOK', 'Wróg → [szablon, kolory bazowe materiałów; e — oczy, g — poświata].', FOES)
    lines.append(f"export const FOE_BY_TYPE: Record<string, string> = {json.dumps(FOE_BY_TYPE, ensure_ascii=False)};")
    table('COMPANION_LOOK', 'Towarzysze (chowańce i wierzchowce); portret patrzy w lewo jak wrogowie.', COMPANIONS)
    table('CLAN_BOSS_LOOK', 'Bossowie klanowi (klucz: pal z CLAN_BOSSES).', CLAN_BOSSES)
    open(f'{out}/actors-data.ts', 'w').write('\n'.join(lines) + '\n')
    print('actors:', len(L), 'warstw,', len(T), 'szablonów,', len(FOES), 'wrogów,', len(COMPANIONS), 'towarzyszy')

if __name__ == '__main__':
    export_ts(sys.argv[1])
