import sys, math; sys.path.insert(0, '.')
from shade2 import finish, ramp
K = {'k': '#17121c', 'w': '#ffffff'}
STONE = ['#8d8478', '#6b6359', '#4d463f', '#36302b']
DARK_STONE = ['#5b4f55', '#433a40', '#2f282d', '#211b20']

ROCK = [
    "................",
    "................",
    "......pppp......",
    "....pppppppp....",
    "...pppppppppp...",
    "..ppppppppppppp.",
    "..ppppppppppppp.",
    ".pppppppppppppp.",
    ".pppppppppppppp.",
    ".ppppppppppppppp",
    "pppppppppppppppp",
    "pppppppppppppppp",
    ".pppppppppppppp.",
    "..pppppppppppp..",
    "....pppppppp....",
    "................",
]

def stamp(rows, cells, ch):
    g = [list(r) for r in rows]
    for (x, y) in cells:
        if 0 <= y < len(g) and 0 <= x < len(g[0]): g[y][x] = ch
    return [''.join(r) for r in g]

def blob(x, y, w, h): return [(x + i, y + j) for i in range(w) for j in range(h)]

def nugget_ore(metal, stone=STONE, sparkle=True):
    r = list(ROCK)
    cells = blob(4, 5, 3, 2) + blob(5, 4, 1, 1) + blob(9, 7, 3, 2) + blob(10, 6, 2, 1) + blob(4, 10, 2, 2) + blob(10, 11, 3, 1) + blob(11, 10, 1, 1)
    r = stamp(r, cells, 'q')
    rows = finish(r)
    # pęknięcia w skale
    rows = stamp(rows, [(7, 9), (8, 10), (8, 11), (2, 8)], 'C')
    if sparkle: rows = stamp(rows, [(5, 4), (10, 6)], 'w')
    pal = {**K, **ramp('p', stone), **ramp('q', metal)}
    return rows, pal

def crystal_cluster(cols, base=STONE, glow=None):
    # skała u podstawy + trzy kryształy (ściany: jasna lewa, ciemna prawa)
    rows = [
        "................",
        ".......EF.......",
        "......EEFF......",
        "......EEFF......",
        "...E..EEFF......",
        "..EEF.EEFF..FG..",
        "..EEFFEEFF.EFG..",
        "...EFFEEFFEEFG..",
        "...EFFEEFFEEFG..",
        "....EFEEFFEEFG..",
        "....EFEEFFEFFG..",
        "...pppEEFFpppp..",
        "..ppppppppppppp.",
        "..ppppppppppppp.",
        "...pppppppppp...",
        "................",
    ]
    rows = finish(rows)
    rows = stamp(rows, [(7, 2), (7, 3)], 'w')
    pal = {**K, 'E': cols[0], 'F': cols[1], 'G': cols[2], 'H': cols[3], **ramp('p', base)}
    # kryształy wypełnione bezpośrednio literami tonów — dociemnij prawe ściany
    return rows, pal

def gem(cols, shape='round', sparkle=True):
    if shape == 'round':
        g = [['.'] * 16 for _ in range(16)]
        for y in range(16):
            for x in range(16):
                if math.hypot(x - 7.5, y - 8) <= 5.4: g[y][x] = 'p'
        rows = finish([''.join(r) for r in g])
        rows = stamp(rows, [(5, 5), (6, 5), (5, 6)], 'w')
    else:  # szlif (romb z fasetami)
        rows = [
            "................",
            "................",
            "....AAAAAAAA....",
            "...AAAABBBBBB...",
            "..AAAABBBBBBCC..",
            ".AAAAABBBBBCCCC.",
            ".BBBBBBBBBBCCCC.",
            "..BBBBBBBBCCCC..",
            "...BBBBBBCCCC...",
            "....BBBBBCCC....",
            ".....BBBCCC.....",
            "......BBCC......",
            ".......BC.......",
            "................",
            "................",
            "................",
        ]
        rows = stamp(rows, [(4, 3), (5, 3), (4, 4)], 'w')
        rows = [r for r in rows]
        from shade2 import outline
        rows = outline(rows)
    return rows, {**K, **ramp('p', cols), 'A': cols[0], 'B': cols[1], 'C': cols[2], 'D': cols[3]}

def ingot_star():
    # Gwiezdny Kruszec: bryłka w kształcie gwiazdy (meteoryt) z iskrami
    g = [['.'] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 8
            a = math.atan2(dy, dx)
            rr = 4.2 + 2.6 * max(0, math.cos(5 * (a + math.pi / 2)))
            if math.hypot(dx, dy) <= rr: g[y][x] = 'p'
    rows = finish([''.join(r) for r in g])
    rows = stamp(rows, [(6, 5), (7, 4), (6, 6)], 'w')
    rows = stamp(rows, [(1, 2), (14, 12)], 'w')
    return rows, {**K, **ramp('p', ['#fffbe8', '#f1dd96', '#c09a3e', '#7a5a1d'])}

def lava_ore():
    r = list(ROCK)
    veins = [(3, 9), (4, 8), (5, 8), (6, 7), (7, 7), (8, 6), (9, 6), (10, 5), (8, 8), (9, 9), (10, 10), (11, 10), (12, 9), (5, 11), (6, 12)]
    r = stamp(r, veins, 'x')
    rows = finish(r)
    rows = stamp(rows, [(7, 7), (9, 9)], 'y')
    return rows, {**K, **ramp('p', DARK_STONE), 'x': '#ff6a2b', 'y': '#ffd36b'}

ORE_ICONS = {
    'Miedź': lambda: nugget_ore(['#f6c48e', '#d9824a', '#a5522c', '#6b3324']),
    'Żelazo': lambda: nugget_ore(['#e6eaee', '#a7aeb7', '#6b717b', '#3e424a']),
    'Srebro': lambda: nugget_ore(['#ffffff', '#d5deea', '#99a7bc', '#5d6880']),
    'Mithril': lambda: crystal_cluster(['#e6fdff', '#7fd8e4', '#3497aa', '#1b5767']),
    'Adamantyt': lambda: crystal_cluster(['#e2f7cc', '#8cc87c', '#468e45', '#24502a']),
    'Smocza Stal': lava_ore,
    'Gwiezdny Kruszec': ingot_star,
}

# ---------- poprawki rud głównych ----------
RUST_STONE = ['#8f7466', '#6d564b', '#4e3d35', '#342822']
BLUE_STONE = ['#7d8796', '#5d6674', '#434a56', '#2e333c']
def iron(): return nugget_ore(['#d9e0e8', '#9aa4b0', '#626b76', '#3a4049'], stone=RUST_STONE)
def silver():
    rows, pal = nugget_ore(['#ffffff', '#e2e9f2', '#a9b6c8', '#6a7690'], stone=BLUE_STONE)
    rows = stamp(rows, [(11, 10), (3, 6)], 'w')
    return rows, pal
ORE_ICONS['Żelazo'] = iron
ORE_ICONS['Srebro'] = silver

# ---------- domieszki żywiołów ----------
def fire():
    rows, pal = gem(['#ffe08a', '#ff8a2b', '#d6401f', '#7a1c12'], 'cut')
    rows = stamp(rows, [(7, 6), (8, 6), (7, 7), (8, 7), (8, 8)], 'y')
    return rows, {**pal, 'y': '#fff3b0'}
def ice():
    return crystal_cluster(['#ffffff', '#bfefff', '#6cc3ec', '#2f6f9f'], base=['#e8f6ff', '#b9d9ef', '#7fa6c4', '#4d6f8c'])
def storm():
    rows, pal = gem(['#d7c4ff', '#8f6bff', '#5233c4', '#2a1a6e'], 'cut')
    rows = stamp(rows, [(9, 3), (8, 4), (7, 5), (8, 5), (9, 5), (8, 6), (7, 7), (6, 8)], 'y')
    return rows, {**pal, 'y': '#ffe95c'}
def poison():
    rows, pal = gem(['#d4ff9a', '#6fd64a', '#2f8f2c', '#16501a'], 'round')
    rows = stamp(rows, [(9, 9), (10, 10), (7, 11), (10, 7)], 'C')
    return rows, pal
def shadow():
    rows = [
        "................",
        ".........E......",
        "........EEF.....",
        ".......EEEFF....",
        "......EEEEFF....",
        ".....EEEEFFFG...",
        ".....EEEEFFFG...",
        "....EEEEFFFFG...",
        "....EEEFFFFGG...",
        "...EEEEFFFFGG...",
        "...EEEFFFFGG....",
        "....EEFFFFGG....",
        ".....EFFFGG.....",
        "......FFGG......",
        "................",
        "................",
    ]
    from shade2 import outline
    rows = outline(rows)
    rows = stamp(rows, [(8, 3), (7, 5), (6, 7)], 'x')
    return rows, {**K, 'E': '#5b4a7a', 'F': '#2e2440', 'G': '#17121f', 'x': '#c79cff'}
def light():
    rows, pal = crystal_cluster(['#ffffff', '#fff3c2', '#e3c46a', '#9a7a2a'], base=['#efe6cf', '#cbbd9b', '#9c8e6e', '#6b6049'])
    rows = stamp(rows, [(2, 2), (13, 3), (12, 1)], 'w')
    return rows, pal

ELEM_ICONS = {'zar': fire, 'szron': ice, 'burz': storm, 'jad': poison, 'cien': shadow, 'jasn': light}

# ---------- rudy unikalne (zestawy) ----------
def fang():
    rows = [
        "................",
        "....rrrrr.......",
        "...rrrrrrr......",
        "...ppppppp......",
        "...pppppppp.....",
        "....pppppppp....",
        "....ppppppppp...",
        ".....pppppppp...",
        "......ppppppp...",
        ".......pppppp...",
        "........ppppp...",
        ".........pppp...",
        "..........ppp...",
        "...........pp...",
        "...........p....",
        "................",
    ]
    rows = finish(rows)
    rows = stamp(rows, [(5, 4), (5, 5), (6, 6)], 'w')
    return rows, {**K, **ramp('p', ['#fff8e6', '#eadbb8', '#c2ad83', '#8a7652']), **ramp('r', ['#c98b74', '#9a5b48', '#6d3a2e', '#4a241c'])}
def golem_heart():
    rows = [
        "................",
        "................",
        "...pppp..pppp...",
        "..pppppppppppp..",
        ".pppppppppppppp.",
        ".pppppppppppppp.",
        ".pppppppppppppp.",
        ".pppppppppppppp.",
        "..pppppppppppp..",
        "...pppppppppp...",
        "....pppppppp....",
        ".....pppppp.....",
        "......pppp......",
        ".......pp.......",
        "................",
        "................",
    ]
    rows = finish(rows)
    rows = stamp(rows, [(7, 4), (8, 4), (7, 5), (8, 6), (7, 7), (6, 7), (9, 7), (7, 8), (8, 9), (5, 5), (10, 5)], 'x')
    return rows, {**K, **ramp('p', ['#b8aa92', '#8c7f6b', '#655b4c', '#433b31']), 'x': '#57d3ff'}
def feather():
    rows = [
        "................",
        "............qqq.",
        "..........qqqqq.",
        ".........qqqqqq.",
        "........ppqqqq..",
        ".......ppppqq...",
        "......pppppp....",
        ".....pppppp.....",
        "....pppppp......",
        "...ppppp........",
        "..pppp..........",
        "..ppp...........",
        ".rr.............",
        "r...............",
        "................",
        "................",
    ]
    rows = finish(rows)
    # stosina pióra przez środek
    rows = stamp(rows, [(2, 12), (3, 11), (4, 10), (5, 9), (6, 8), (7, 7), (8, 6), (9, 5), (10, 4), (11, 3), (12, 2)], 'z')
    return rows, {**K, **ramp('p', ['#ffe3a8', '#e0a85a', '#b0743a', '#734622']), **ramp('q', ['#e8f7ff', '#8fd0ff', '#4a93d0', '#285a8c']),
                  **ramp('r', ['#e9dcc6', '#c8b597', '#9c8a6c', '#6b5c44']), 'z': '#fff4dc'}
def lich_bone():
    rows = [
        "................",
        "................",
        "..pp............",
        ".pppp...........",
        ".ppppp..........",
        "..ppppp.........",
        "....pppp........",
        ".....pppp.......",
        "......pppp......",
        ".......pppp.....",
        "........ppppp...",
        ".........ppppp..",
        "..........pppp..",
        "...........pp...",
        "................",
        "................",
    ]
    rows = finish(rows)
    rows = stamp(rows, [(0, 1), (3, 0), (14, 11), (12, 14), (7, 4), (10, 12)], 'x')
    return rows, {**K, **ramp('p', ['#fbf6e4', '#e4dbbd', '#b9ad8a', '#857a5c']), 'x': '#7dffb4'}
def dragon_scale():
    rows = [
        "................",
        "................",
        "...pppppppppp...",
        "..pppppppppppp..",
        "..pppppppppppp..",
        "..pppppppppppp..",
        "...pppppppppp...",
        "...pppppppppp...",
        "....pppppppp....",
        "....pppppppp....",
        ".....pppppp.....",
        "......pppp......",
        ".......pp.......",
        "................",
        "................",
        "................",
    ]
    rows = finish(rows)
    rows = stamp(rows, [(7, 3), (8, 3), (7, 4), (8, 4), (7, 5), (8, 5), (7, 6), (8, 6), (7, 7), (8, 7), (7, 8), (8, 8), (7, 9), (8, 9)], 'y')
    rows = stamp(rows, [(4, 3), (5, 3), (4, 4)], 'w')
    return rows, {**K, **ramp('p', ['#ffb28a', '#ef6a3d', '#b8352a', '#6e1a18']), 'y': '#ffd27a'}
def star_shard():
    rows = [
        "................",
        ".......E........",
        "......EEF.......",
        "......EEF.......",
        ".....EEEFF......",
        ".....EEEFF......",
        "....EEEEFFG.....",
        "....EEEEFFG.....",
        "...EEEEEFFGG....",
        "...EEEEFFFGG....",
        "....EEEFFFG.....",
        ".....EEFFG......",
        "......EFG.......",
        ".......F........",
        "................",
        "................",
    ]
    from shade2 import outline
    rows = outline(rows)
    rows = stamp(rows, [(6, 4), (5, 8), (12, 2), (2, 12), (13, 12)], 'w')
    return rows, {**K, 'E': '#fffbe0', 'F': '#f3e3a1', 'G': '#c9a94a'}

SET_ICONS = {'lowca': fang, 'straz': golem_heart, 'wicher': feather, 'nekro': lich_bone, 'smok': dragon_scale, 'gwiazda': star_shard}

# ---------- zasoby ----------
GOLD = ['#fff0a8', '#f2c94c', '#c7902a', '#7d5216']
def coins():
    rows = [
        "................",
        "................",
        "................",
        "....pppppp......",
        "...pppppppp.....",
        "...pppppppp.....",
        "....pppppp......",
        "...pppppppp.qqqq",
        "...pppppppqqqqqq",
        "....ppppppqqqqqq",
        "...ppppppppqqqqq",
        "...ppppppppqqqq.",
        "....pppppp.qqqq.",
        "...pppppppp.....",
        "....pppppp......",
        "................",
    ]
    rows = finish(rows)
    for y in (5, 8, 11, 13): rows = stamp(rows, [(4, y), (5, y), (6, y), (7, y), (8, y), (9, y)], 'C')
    return rows, {**K, **ramp('p', GOLD), **ramp('q', GOLD), 'w': '#ffffff'}
def book():
    rows = [
        "................",
        "................",
        "...ppppppppppy..",
        "..pppppppppppyy.",
        "..pppppppppppyy.",
        "..ppppqqqqpppyy.",
        "..pppqqqqqqppyy.",
        "..pppqqrrqqppyy.",
        "..pppqqrrqqppyy.",
        "..pppqqqqqqppyy.",
        "..ppppqqqqpppyy.",
        "..pppppppppppyy.",
        "..ppppppppppppy.",
        "...yyyyyyyyyyyy.",
        "................",
        "................",
    ]
    rows = finish(rows)
    return rows, {**K, **ramp('p', ['#9b86ff', '#6b4fd6', '#46309c', '#2a1b63']), **ramp('q', GOLD), **ramp('r', ['#a8f0ff', '#5ad1ff', '#2a8fd6', '#1b4f80']), 'y': '#f3ead2'}
def scroll():
    rows = [
        "................",
        "................",
        "..qq............",
        ".qqqq...........",
        ".qqqppp.........",
        "..qppppp........",
        "...pppppp.......",
        "....pppppp......",
        ".....pppppp.....",
        "......pppppp....",
        ".......pppppq...",
        "........ppqqqq..",
        ".........qqqqq..",
        "..........qqq...",
        "................",
        "................",
    ]
    rows = finish(rows)
    rows = stamp(rows, [(7, 7), (8, 8), (6, 8), (7, 9)], 'x')
    return rows, {**K, **ramp('p', ['#fff3d6', '#ecd9ac', '#c9ae78', '#8c744a']), **ramp('q', ['#f5e1b5', '#d6b679', '#a7834b', '#6d5530']), 'x': '#c23a3a'}
EGG_COLS = [
    (['#f4f1ea', '#d9d3c5', '#a9a090', '#6e6759'], '#9aa1ab'),
    (['#e9f9e4', '#a8e09a', '#63b25a', '#336a2f'], '#2f7a33'),
    (['#e6f1ff', '#9cc6ff', '#4f8fe0', '#28508f'], '#1f4a9a'),
    (['#f3e6ff', '#cfa6ff', '#9461e0', '#55308f'], '#ffe08a'),
    (['#fff1d6', '#ffc76b', '#e0892a', '#8f4d12'], '#c0262e'),
]
def egg(r):
    g = [['.'] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            dy = (y - 9) / (5.6 if y >= 9 else 6.6)
            if ((x - 7.5) / 4.6) ** 2 + dy ** 2 <= 1: g[y][x] = 'p'
    rows = finish([''.join(r) for r in g])
    rows = stamp(rows, [(9, 6), (10, 7), (6, 10), (7, 10), (10, 12), (5, 13)], 'x')
    rows = stamp(rows, [(5, 5), (5, 6)], 'w')
    cols, spot = EGG_COLS[r]
    return rows, {**K, **ramp('p', cols), 'x': spot}
def saddle():
    rows = [
        "................",
        "................",
        "................",
        ".pp.............",
        ".ppp.........pp.",
        "..pppp......ppp.",
        "..ppppppppppppp.",
        "...pppppppppppp.",
        "...qqqqqqqqqqq..",
        "...sssssssssss..",
        "....ssssssssss..",
        "........r.......",
        "........r.......",
        ".......rrr......",
        "................",
        "................",
    ]
    rows = finish(rows)
    return rows, {**K, **ramp('p', ['#c98a5c', '#9a5f3a', '#6e3f25', '#472716']), **ramp('q', GOLD), **ramp('s', ['#a8673f', '#7d4a2c', '#57311d', '#3a2012']), **ramp('r', ['#c9ccd1', '#9aa1ab', '#666c76', '#3b3f47'])}
def stone():
    rows, pal = gem(['#e4fdff', '#7ee8f0', '#30a9bd', '#16606f'], 'cut')
    return rows, pal
def seal():
    g = [['.'] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            a = math.atan2(y - 7, x - 7.5)
            rr = 5.6 + 0.6 * math.cos(8 * a)
            if math.hypot(x - 7.5, y - 7) <= rr: g[y][x] = 'p'
    for (x, y) in [(5, 12), (5, 13), (4, 14), (10, 12), (10, 13), (11, 14)]: g[y][x] = 'q'
    rows = finish([''.join(r) for r in g])
    star = [(7, 4), (8, 4), (6, 6), (7, 5), (8, 5), (9, 6), (7, 6), (8, 6), (7, 7), (8, 7), (6, 8), (9, 8), (5, 6), (10, 6)]
    rows = stamp(rows, star, 'y')
    return rows, {**K, **ramp('p', ['#ff8a7a', '#d23a3a', '#9a1f26', '#5e1016']), **ramp('q', ['#ff8a7a', '#d23a3a', '#9a1f26', '#5e1016']), 'y': '#ffd86b'}

RES_ICONS = {'zloto': coins, 'ksiega': book, 'zwoj': scroll, 'siodlo': saddle, 'kamien': stone, 'pieczec': seal,
             **{f'jajo{r}': (lambda r=r: egg(r)) for r in range(5)}}
