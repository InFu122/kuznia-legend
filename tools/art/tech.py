# Ikony badań 20×20: odznaka w kolorze gałęzi + emblemat 16×16.
import sys, math; sys.path.insert(0, '.')
from shade2 import shade, outline, ramp
K = {'k': '#120d16', 'w': '#ffffff'}
BR = {  # gałąź: wnętrze (2 tony), ramka (jasna, ciemna)
    'kucie': ['#3a2a1e', '#2c2017', '#e0a050', '#8a5a22'],
    'walka': ['#3a1e22', '#2c171a', '#e06a5a', '#8a2a26'],
    'ekonomia': ['#20321f', '#182618', '#8fd06a', '#3f7a2e'],
    'towarzysze': ['#2a2238', '#1f192a', '#b98cf0', '#5a3a8a'],
}
METAL = ['#f0f4f8', '#b9c2cc', '#7c8794', '#4a525d']
WOOD = ['#c58a55', '#94613a', '#6a4226', '#452a17']
GOLD = ['#fff0a8', '#f2c94c', '#c7902a', '#7d5216']
LEATHER = ['#c98a5c', '#9a5f3a', '#6e3f25', '#472716']
FIRE = ['#fff3a8', '#ffb43a', '#ff6a1e', '#b8320f']

def badge(branch):
    g = [['.'] * 20 for _ in range(20)]
    for y in range(20):
        for x in range(20):
            cut = 3  # ścięte rogi (ośmiokąt)
            if x + y < cut or (19 - x) + y < cut or x + (19 - y) < cut or (19 - x) + (19 - y) < cut: continue
            edge = x in (0, 19) or y in (0, 19) or x + y == cut or (19 - x) + y == cut or x + (19 - y) == cut or (19 - x) + (19 - y) == cut
            if edge: g[y][x] = '8' if (x + y) < 19 else '9'
            else: g[y][x] = '6' if math.hypot(x - 9.5, y - 9.5) < 6 else '7'
    return g

def make(branch, rows, regions, extra=None, ox=2, oy=2):
    g = badge(branch)
    em = outline(shade(rows))
    for y, r in enumerate(em):
        for x, c in enumerate(r):
            if c != '.': g[oy + y][ox + x] = c
    b = BR[branch]
    pal = {**K, '6': b[0], '7': b[1], '8': b[2], '9': b[3]}
    for k, cols in regions.items(): pal.update(ramp(k, cols))
    if extra: pal.update(extra)
    return [''.join(r) for r in g], pal

def blank(): return [['.'] * 16 for _ in range(16)]
def S(g): return [''.join(r) for r in g]
def P(g, x, y, c):
    if 0 <= x < 16 and 0 <= y < 16: g[y][x] = c

def hart():
    rows = [
        "........p.......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......qqq......",
        ".......qqq......",
        ".......qqq......",
        ".......qqq......",
        ".....rrrrrrr....",
        "........s.......",
        "........s.......",
        "........s.......",
        ".......rrr......",
        "................",
        "................",
    ]
    r, p = make('kucie', rows, {'p': METAL, 'q': FIRE, 'r': GOLD, 's': WOOD})
    g = [list(x) for x in r]
    for (x, y) in [(5, 7), (13, 6), (12, 9), (6, 10)]: g[y][x] = 'x'
    return [''.join(x) for x in g], {**p, 'x': '#ffd25a'}

def bellows():
    rows = [
        "................",
        "................",
        "..pppppp........",
        ".pppppppp.......",
        ".pppppppp.......",
        "..qqqqqqqqrr....",
        "..qqqqqqqqrrrrrr",
        "..qqqqqqqqrr....",
        ".pppppppp.......",
        ".pppppppp.......",
        "..pppppp........",
        "................",
        "................",
        "................",
        "................",
        "................",
    ]
    r, p = make('kucie', rows, {'p': WOOD, 'q': LEATHER, 'r': METAL}, oy=3)
    g = [list(x) for x in r]
    for (x, y) in [(19 - 1, 7), (18, 9), (18, 11)]: pass
    return [''.join(x) for x in g], p

def gear():
    g = blank()
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5)
            a = math.atan2(y - 7.5, x - 7.5)
            tooth = math.cos(8 * a) > 0.3
            if d <= (6.6 if tooth else 5.2): g[y][x] = 'p'
            if d <= 2.2: g[y][x] = '.'
    # młotek na kole
    for i in range(7): P(g, 4 + i, 12 - i, 'q')
    for (x, y) in [(10, 3), (11, 4), (12, 5), (9, 4), (10, 5), (11, 6), (12, 4)]: P(g, x, y, 'r')
    return make('kucie', S(g), {'p': METAL, 'q': WOOD, 'r': GOLD})

def save_ore():
    rows = [
        "................",
        "....qqqqqq......",
        "...q......q.....",
        "..q........q....",
        "..q.........q...",
        ".qqq........q...",
        "..q..pppp...q...",
        "....pppppp..q...",
        "...pppppppp.q...",
        "...pppppppp.q...",
        "....pppppp.qqq..",
        "............q...",
        "................",
        "................",
        "................",
        "................",
    ]
    return make('kucie', rows, {'p': ['#f6c48e', '#d9824a', '#a5522c', '#6b3324'], 'q': ['#c8ffb0', '#6fd64a', '#2f8f2c', '#16501a']}, oy=3)

def guild_coin():
    g = blank()
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5)
            if d <= 7.2: g[y][x] = 'p'
            if 5.2 <= d <= 5.9: g[y][x] = 'q'
    anvil = ["..rrrrrrr...", "...rrrrr....", "....rrr.....", "...rrrrr...."]
    for j, row in enumerate(anvil):
        for i, c in enumerate(row):
            if c == 'r': g[6 + j][2 + i] = 'r'
    return make('kucie', S(g), {'p': GOLD, 'q': ['#d6a43a', '#b8862a', '#8a5a12', '#5a3a0c'], 'r': METAL})

def blade():
    rows = [
        ".......pp.......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        ".......ppp......",
        "....qqqqqqqqq...",
        "........r.......",
        "........r.......",
        "........r.......",
        ".......qqq......",
        "................",
        "................",
    ]
    return make('walka', rows, {'p': METAL, 'q': GOLD, 'r': WOOD})

def shield():
    rows = [
        "................",
        "..pppppppppppp..",
        "..pqqqqqpppppp..",
        "..pqqqqqpppppp..",
        "..pqqqqqpppppp..",
        "..pqqqqqpppppp..",
        "..pppppppqqqqp..",
        "...ppppppqqqp...",
        "...ppppppqqqp...",
        "....pppppqqp....",
        ".....ppppqp.....",
        "......pppp......",
        ".......pp.......",
        "................",
        "................",
        "................",
    ]
    return make('walka', rows, {'p': METAL, 'q': ['#ff8a7a', '#d23a3a', '#9a1f26', '#5e1016']}, oy=3)

def target():
    g = blank()
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 8.5)
            if d <= 6.8: g[y][x] = 'p' if int(d / 1.8) % 2 == 0 else 'q'
    for i in range(6): P(g, 9 + i, 6 - i, 'r')
    for (x, y) in [(8, 7), (8, 8), (7, 8)]: P(g, x, y, 's')
    for (x, y) in [(14, 0), (15, 1), (13, 0), (15, 2)]: P(g, x, y, 't')
    return make('walka', S(g), {'p': ['#fff1e0', '#f0d8c0', '#c8a888', '#8a6a4a'], 'q': ['#ff8a7a', '#d23a3a', '#9a1f26', '#5e1016'], 'r': WOOD, 's': METAL, 't': ['#ffffff', '#ffe0e0', '#d06060', '#8a2a2a']})

def skull():
    rows = [
        "q..............q",
        "qq............qq",
        ".qq..pppppp..qq.",
        "..qqppppppppqq..",
        "...pppppppppp...",
        "...pppppppppp...",
        "...ppkkppkkpp...",
        "...ppkkppkkpp...",
        "...pppppppppp...",
        "....pppkkppp....",
        ".....pppppp.....",
        ".....pkpkpkp....",
        "......pppp......",
        "................",
        "................",
        "................",
    ]
    return make('walka', rows, {'p': ['#fffbe8', '#e8dfc4', '#b8ad8a', '#7a7058'], 'q': ['#ff8a7a', '#d23a3a', '#9a1f26', '#5e1016']}, oy=3)

def coin_bag():
    rows = [
        "................",
        "......qqq.......",
        ".....q...q......",
        "......ppp.......",
        ".....ppppp......",
        "....ppppppp.....",
        "...ppppppppp....",
        "..ppppppppppp...",
        "..ppppppppppp...",
        "..ppppppppppp...",
        "...ppppppppp.rr.",
        "....ppppppp.rrrr",
        "............rrrr",
        ".............rr.",
        "................",
        "................",
    ]
    r, p = make('ekonomia', rows, {'p': LEATHER, 'q': GOLD, 'r': GOLD}, oy=2)
    g = [list(x) for x in r]
    for (x, y) in [(8, 10), (9, 10), (8, 11), (9, 12), (8, 13), (9, 13), (10, 11)]: g[y][x] = 'x'
    return [''.join(x) for x in g], {**p, 'x': '#ffe08a'}

def pickaxe():
    rows = [
        "................",
        ".....pppppp.....",
        "...pppppppppp...",
        "..ppp..qq..ppp..",
        ".pp....qq....pp.",
        ".p.....qq.....p.",
        "p......qq......p",
        ".......qq.......",
        ".......qq.......",
        ".......qq.......",
        ".......qq.......",
        ".......qq.......",
        ".......qq.......",
        ".......rr.......",
        "................",
        "................",
    ]
    return make('ekonomia', rows, {'p': METAL, 'q': WOOD, 'r': GOLD})

def moon():
    g = blank()
    for y in range(16):
        for x in range(16):
            if math.hypot(x - 7, y - 8) <= 6.2 and math.hypot(x - 10, y - 6) > 5.0: g[y][x] = 'p'
    for (x, y) in [(13, 12), (12, 2), (14, 4)]: P(g, x, y, 'q')
    r, p = make('ekonomia', S(g), {'p': ['#fffbe0', '#f3e3a1', '#c9a94a', '#8a6a2a'], 'q': ['#ffffff', '#ffffff', '#e8e8ff', '#c8c8ff']})
    return r, p

def magnifier():
    g = blank()
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 6.5, y - 6.5)
            if d <= 5.4: g[y][x] = 'p'
            if d <= 3.8: g[y][x] = 'r'
    for (x, y) in [(5, 5), (6, 5), (7, 6), (6, 6), (6, 7), (7, 5)]: P(g, x, y, 's')
    for i in range(5): P(g, 10 + i, 10 + i, 'q'); P(g, 11 + i, 10 + i, 'q')
    return make('ekonomia', S(g), {'p': GOLD, 'q': WOOD, 'r': ['#e8f6ff', '#b8d8ea', '#8ab4cf', '#5a86a4'], 's': ['#ffd0f0', '#ff6bc8', '#c02a8a', '#701850']})


EGG = ['#fff6e0', '#f0dcb0', '#c9a874', '#8a6a3e']

def nest():
    # Hodowca: jajo w gnieździe
    g = blank()
    for y in range(16):
        for x in range(16):
            if ((x - 7.5) / 4.2) ** 2 + ((y - 6.5) / 5.4) ** 2 <= 1: g[y][x] = 'p'
    for y in range(10, 15):
        for x in range(1, 15):
            if ((x - 7.5) / 7.0) ** 2 + ((y - 10.5) / 4.0) ** 2 <= 1 and y >= 10: g[y][x] = 'q'
    for (x, y) in [(3, 11), (6, 12), (9, 11), (12, 12), (5, 13), (10, 13)]: P(g, x, y, 'r')
    for (x, y) in [(6, 4), (8, 6), (9, 3)]: P(g, x, y, 's')
    return make('towarzysze', S(g), {'p': EGG, 'q': WOOD, 'r': ['#e8c890', '#c09a60', '#8a6a3e', '#5a4024'], 's': ['#a8e070', '#7cc04a', '#4f8a2a', '#2f5a18']})

def hatch():
    # Wylęgarnia: pęknięte jajo i klepsydra czasu
    g = blank()
    for y in range(16):
        for x in range(16):
            if ((x - 7.5) / 5.0) ** 2 + ((y - 8.5) / 6.2) ** 2 <= 1: g[y][x] = 'p'
    for (x, y) in [(3, 7), (4, 8), (5, 7), (6, 8), (7, 7), (8, 8), (9, 7), (10, 8), (11, 7), (12, 8)]: P(g, x, y, 'k')
    for (x, y) in [(6, 4), (7, 4), (8, 4), (7, 5)]: P(g, x, y, 'q')
    return make('towarzysze', S(g), {'p': EGG, 'q': ['#ffe08a', '#f2c94c', '#c7902a', '#7d5216']})

def bond():
    # Więź: serce
    g = blank()
    for y in range(16):
        for x in range(16):
            u, v = (x - 7.5) / 6.5, (y - 7.0) / 6.5
            if (u * u + v * v - 0.35) ** 3 - u * u * v * v * v * 1.1 <= 0: g[y][x] = 'p'
    for (x, y) in [(4, 4), (5, 4), (4, 5)]: P(g, x, y, 'q')
    return make('towarzysze', S(g), {'p': ['#ff9ab8', '#f0457a', '#b8204c', '#7a1232'], 'q': ['#ffffff', '#ffe0ea', '#ffc0d0', '#ff9ab8']})

def stable():
    # Stajnia: podkowa
    g = blank()
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.0)
            if 3.6 <= d <= 6.4 and y <= 12: g[y][x] = 'p'
    for y in range(10, 15):
        for x in (2, 3, 12, 13): P(g, x, y, 'p')
    for (x, y) in [(3, 6), (12, 6), (5, 2), (10, 2), (2, 10), (13, 10)]: P(g, x, y, 'k')
    return make('towarzysze', S(g), {'p': METAL})

TECH_ICONS = {'k_hart': hart, 'k_miech': bellows, 'k_auto': gear, 'k_oszcz': save_ore, 'k_tanie': guild_coin,
              'w_ostrze': blade, 'w_pancerz': shield, 'w_precyzja': target, 'w_pogromca': skull,
              'e_kupiec': coin_bag, 'e_gornik': pickaxe, 'e_noc': moon, 'e_poszuk': magnifier,
              't_hodowca': nest, 't_wylegarnia': hatch, 't_wiez': bond, 't_stajnia': stable}
