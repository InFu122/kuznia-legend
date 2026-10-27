# Ikony umiejętności 24×24: tło (pikselowy gradient w kolorze żywiołu) + emblemat.
import sys, math; sys.path.insert(0, '.')
from shade2 import shade, outline, ramp
K = {'k': '#120d16', 'w': '#ffffff'}

def bg(cols):
    # cols: 4 kolory tła od środka do brzegu; ramka 1 px
    g = [['.'] * 24 for _ in range(24)]
    for y in range(24):
        for x in range(24):
            if (x in (0, 23) and y in (0, 23)): continue
            d = math.hypot(x - 11.5, y - 11.5)
            i = 0 if d < 6 else 1 if d < 10 else 2 if d < 14 else 3
            g[y][x] = '0123'[i]
            if x in (0, 23) or y in (0, 23): g[y][x] = '9'
    return g

def draw(g, rows, ox=4, oy=4):
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.': g[oy + y][ox + x] = c

def emblem(rows):
    # cieniowanie regionów i obrys tylko wokół emblematu (na tle)
    return outline(shade(rows))

def make(rows16, bgcols, regions, extra=None, ox=4, oy=4, size=16):
    g = bg(bgcols)
    em = emblem(rows16)
    draw(g, em, ox, oy)
    pal = {**K, '0': bgcols[0], '1': bgcols[1], '2': bgcols[2], '3': bgcols[3], '9': bgcols[4]}
    for k, cols in regions.items(): pal.update(ramp(k, cols))
    if extra: pal.update(extra)
    return [''.join(r) for r in g], pal

BG = {
    'blue': ['#3b5c8c', '#2c4670', '#213656', '#18273f', '#7aa7e0'],
    'cyan': ['#2f7d93', '#246175', '#1b4a5a', '#133642', '#7fe0f0'],
    'orange': ['#9a5a1e', '#7a4518', '#5c3313', '#40230d', '#f0b060'],
    'green': ['#3f7a3a', '#305e2d', '#244722', '#183218', '#8fd88a'],
    'red': ['#8c2a28', '#6c1f1f', '#511717', '#381010', '#ff7a6a'],
    'purple': ['#5b3a9a', '#472d78', '#36225b', '#251840', '#b48cff'],
    'crimson': ['#7a1a2e', '#5e1424', '#46101b', '#300b13', '#ff6b8a'],
    'gold': ['#8c6a1e', '#6e5318', '#523e12', '#3a2c0d', '#ffd86b'],
}
METAL = ['#f0f4f8', '#b9c2cc', '#7c8794', '#4a525d']
WOOD = ['#c58a55', '#94613a', '#6a4226', '#452a17']
FIRE = ['#fff3a8', '#ffb43a', '#ff6a1e', '#b8320f']

def arrows():
    rows = [
        "....q...........",
        "....p......q....",
        ".....p.....p....",
        "......p.....p...",
        "...q...p.....p..",
        "...p....p.....p.",
        "....p....rr....r",
        ".....p...rr....r",
        "......p.........",
        ".......p........",
        "........rr......",
        "........rr......",
        "................",
        "................",
        "................",
        "................",
    ]
    return make(rows, BG['blue'], {'p': WOOD, 'q': ['#ffffff', '#e8e8e8', '#c8c8c8', '#9a9a9a'], 'r': METAL}, oy=5)

def rune_shield():
    rows = [
        "................",
        "..pppppppppppp..",
        "..pppppppppppp..",
        "..ppppppqppppp..",
        "..pppppqqqpppp..",
        "..ppppppqppppp..",
        "..ppppqqqqqppp..",
        "...pppppqpppp...",
        "...ppppqpqppp...",
        "....pppqpqpp....",
        ".....pppppp.....",
        "......pppp......",
        ".......pp.......",
        "................",
        "................",
        "................",
    ]
    return make(rows, BG['blue'], {'p': METAL, 'q': ['#d6fbff', '#6fe3ff', '#2fa9d6', '#1b6f8f']}, oy=5)

def horn():
    rows = [
        "................",
        "................",
        "..........qq....",
        ".........qppq...",
        "........qpppq...",
        ".......pppppq...",
        "......ppppp.....",
        "....pppppp......",
        "..ppppppp.......",
        ".pppppp.........",
        ".ppppp..........",
        "..ppp...........",
        "................",
        "................",
        "................",
        "................",
    ]
    r, p = make(rows, BG['orange'], {'p': ['#fff1cf', '#e8c98d', '#b8925a', '#7a5c34'], 'q': ['#ffe48f', '#d8a537', '#8a5a12', '#5a3a0c']}, oy=4, ox=6)
    g = [list(x) for x in r]
    for (x, y) in [(3, 4), (2, 6), (2, 8), (3, 10), (1, 5), (1, 9), (0, 7)]:
        if g[y][x] not in '.k': g[y][x] = 'w'
    return [''.join(x) for x in g], p

def potion():
    rows = [
        "......qq........",
        "......qq........",
        ".....pppp.......",
        "......pp........",
        "......pp........",
        "....pppppp......",
        "...pprrrrpp.....",
        "..pprrrrrrrp....",
        "..prrrrrrrrp....",
        "..prrrrrrrrp....",
        "..prrrrrrrrp....",
        "...prrrrrrp.....",
        "....pppppp......",
        "................",
        "................",
        "................",
    ]
    r, p = make(rows, BG['green'], {'p': ['#e8f6ff', '#b8d8ea', '#7ea4bc', '#4d6f86'], 'q': WOOD, 'r': ['#ff9a9a', '#e8323f', '#a8182a', '#6a0d1a']}, ox=6, oy=5)
    g = [list(x) for x in r]
    for (x, y) in [(9, 12), (9, 13), (10, 12)]: g[y][x] = 'w'
    return [''.join(x) for x in g], p

def fireball():
    rows = [
        "................",
        "................",
        "..........ppp...",
        ".........ppppp..",
        "........ppqqqpp.",
        ".......ppqqrqqp.",
        "......ppqqrrrqp.",
        ".....ppqqqrqqpp.",
        "....pppqqqqqpp..",
        "...ppp.pppppp...",
        "..pp....ppp.....",
        ".pp.............",
        ".p..............",
        "................",
        "................",
        "................",
    ]
    return make(rows, BG['red'], {'p': ['#ffb43a', '#ff6a1e', '#d6401f', '#8a1f10'], 'q': ['#fff3a8', '#ffd25a', '#ffa83a', '#ff7a1e'], 'r': ['#ffffff', '#fffbe0', '#fff3a8', '#ffe08a']}, oy=4)

def nova():
    g = [['.'] * 16 for _ in range(16)]
    c = 7.5
    for y in range(16):
        for x in range(16):
            dx, dy = x - c, y - c
            ax, ay = abs(dx), abs(dy)
            if (ax <= 0.6 and ay <= 7) or (ay <= 0.6 and ax <= 7) or (abs(ax - ay) <= 0.6 and ax <= 5.2):
                g[y][x] = 'p'
            if math.hypot(dx, dy) <= 1.6: g[y][x] = 'q'
    # haczyki płatka śniegu
    for (x, y) in [(6, 2), (9, 2), (6, 13), (9, 13), (2, 6), (2, 9), (13, 6), (13, 9)]: g[y][x] = 'p'
    rows = [''.join(r) for r in g]
    return make(rows, BG['cyan'], {'p': ['#ffffff', '#c9f4ff', '#7fd8f0', '#3a9cc0'], 'q': ['#ffffff', '#ffffff', '#e8fbff', '#c9f4ff']})

def blood_blade():
    rows = [
        "...............p",
        "..............pp",
        ".............ppp",
        "............ppp.",
        "...........ppp..",
        "..........ppp...",
        ".........ppp....",
        "....q...ppp.....",
        "....qq.ppp......",
        ".....qqpp.......",
        "......rq........",
        ".....rrqq.......",
        "....rr...q......",
        "...rr...........",
        "..r.............",
        "................",
    ]
    r, p = make(rows, BG['crimson'], {'p': ['#ffd6d6', '#d8dde3', '#9aa1ab', '#5b626c'], 'q': ['#ffe48f', '#d8a537', '#8a5a12', '#5a3a0c'], 'r': WOOD}, ox=4, oy=3)
    g = [list(x) for x in r]
    for (x, y) in [(15, 7), (16, 8), (13, 9), (14, 10), (11, 12), (17, 12), (18, 13), (17, 14)]:
        g[y][x] = 'x'
    return [''.join(x) for x in g], {**p, 'x': '#e8102a'}

def storm():
    rows = [
        "....pppppp......",
        "..pppppppppp....",
        ".pppppppppppp...",
        ".ppppppppppppp..",
        "..pppppppppppp..",
        "....qqq.........",
        "....qqq.........",
        "...qqq..........",
        "...qqqqqq.......",
        ".....qqq........",
        "....qqq.........",
        "....qq..........",
        "...qq...........",
        "...q............",
        "................",
        "................",
    ]
    return make(rows, BG['purple'], {'p': ['#c9c3e8', '#8f86b8', '#5e5687', '#3a3459'], 'q': ['#ffffff', '#fff27a', '#ffd23a', '#d69a1e']}, ox=4, oy=4)

def dragon():
    rows = [
        "................",
        "..pp............",
        "...ppp..........",
        "...pppp.........",
        "..ppppppp.......",
        ".ppppppppp......",
        ".pppwkppppp.....",
        ".pppppppppppq...",
        "..ppppppppqqqq..",
        "...ppppppqqqqrr.",
        "....pppp..qqqrrr",
        ".....pp....qqrrr",
        "............qrr.",
        "................",
        "................",
        "................",
    ]
    r, p = make(rows, BG['gold'], {'p': ['#7ad18a', '#3f9a52', '#24663a', '#143f24'], 'q': FIRE, 'r': ['#fffbe0', '#fff3a8', '#ffd25a', '#ffb43a']}, ox=3, oy=5)
    return r, {**p, 'w': '#ffe95c'}

SKILL_ICONS = {'deszcz': arrows, 'tarcza': rune_shield, 'okrzyk': horn, 'eliksir': potion, 'kula': fireball,
               'nova': nova, 'krwawe': blood_blade, 'burza': storm, 'oddech': dragon}

# ---------- wersje 20×20 (większe emblematy) ----------
def blank(n=20): return [['.'] * n for _ in range(n)]
def S(g): return [''.join(r) for r in g]
def P(g, x, y, c):
    if 0 <= y < len(g) and 0 <= x < len(g[0]): g[y][x] = c

def arrows():
    g = blank()
    def arrow(hx, hy, L):
        for (x, y) in [(hx, hy), (hx + 1, hy), (hx, hy - 1), (hx + 1, hy - 1), (hx + 2, hy), (hx, hy - 2)]: P(g, x, y, 'r')
        for i in range(1, L): P(g, hx + 1 + i, hy - 1 - i, 'p')
        tx, ty = hx + L, hy - L
        for k in range(3):  # lotki po obu stronach końca drzewca
            P(g, tx - k + 1, ty + k + 1 - 1, 'q'); P(g, tx - k - 1 + 1, ty + k - 1 - 1 + 1, 'q')
    arrow(1, 12, 7); arrow(7, 17, 7); arrow(9, 9, 5)
    return make(S(g), BG['blue'], {'p': WOOD, 'q': ['#ffffff', '#f0e6e6', '#d06060', '#8a2a2a'], 'r': METAL}, ox=2, oy=2)

def horn():
    g = blank()
    for i in range(0, 60):
        t = i / 59
        x = 2 + 14 * t
        y = 16 - 12 * (t ** 1.7)
        w = 0.8 + 3.2 * (t ** 2)
        for yy in range(20):
            for xx in range(20):
                if math.hypot(xx - x, yy - y) <= w: P(g, xx, yy, 'p')
    for (x, y) in [(2, 16), (3, 16), (2, 15), (3, 15), (4, 15)]: P(g, x, y, 'q')
    for i in range(20):  # złota obręcz przy czarze
        for j in range(20):
            if g[j][i] == 'p' and 11 <= i <= 12: g[j][i] = 'q'
    for yy in range(20):  # wylot czary
        for xx in range(20):
            if ((xx - 16.3) / 1.6) ** 2 + ((yy - 3.6) / 2.6) ** 2 <= 1 and g[yy][xx] == 'p': g[yy][xx] = 'x'
    rows, pal = make(S(g), BG['orange'], {'p': ['#fff1cf', '#e8c98d', '#b8925a', '#7a5c34'], 'q': ['#ffe48f', '#d8a537', '#8a5a12', '#5a3a0c']}, ox=1, oy=2)
    pal['x'] = '#4a2e14'
    gg = [list(r) for r in rows]
    for (x, y) in [(21, 3), (22, 4), (22, 5), (21, 6), (20, 1), (21, 1)]: 
        if gg[y][x] not in 'k': gg[y][x] = 'w'
    return [''.join(r) for r in gg], pal

def fireball():
    g = blank()
    cx, cy = 12.5, 7.5
    for y in range(20):
        for x in range(20):
            d = math.hypot(x - cx, y - cy)
            if d <= 5.2: g[y][x] = 'p'
            if d <= 3.6: g[y][x] = 'q'
            if d <= 1.8: g[y][x] = 'r'
    # ogon płomienia ku lewemu dołowi
    tail = [(7, 11), (6, 12), (5, 13), (4, 14), (3, 15), (2, 16), (7, 12), (6, 13), (5, 14), (8, 12), (6, 11), (4, 13), (3, 16), (2, 17), (5, 12), (8, 13), (7, 13)]
    for (x, y) in tail: P(g, x, y, 'p')
    for (x, y) in [(7, 10), (8, 11), (9, 11), (6, 11)]: P(g, x, y, 'q')
    return make(S(g), BG['red'], {'p': ['#ffb43a', '#ff6a1e', '#d6401f', '#8a1f10'], 'q': ['#fff3a8', '#ffd25a', '#ffa83a', '#ff7a1e'], 'r': ['#ffffff', '#fffbe0', '#fff3a8', '#ffe08a']}, ox=2, oy=2)

def dragon():
    rows = [
        "....................",
        ".pp.................",
        "..ppp...............",
        "...pppp.............",
        "..ppppppp...........",
        ".ppppppppppp........",
        ".ppkwppppppppp......",
        ".ppppppppppppppp....",
        "..pppppppppppppppp..",
        "...pppppp....pppppp.",
        "...ppppp.qqqqq......",
        "...pppppqqqqqqqrr...",
        "....ppppppqqqqrrrrr.",
        ".....pppppp.qqrrrrrr",
        "..............rrrrr.",
        "...............rrr..",
        "....................",
        "....................",
        "....................",
        "....................",
    ]
    r, p = make(rows, BG['gold'], {'p': ['#7ad18a', '#3f9a52', '#24663a', '#143f24'], 'q': FIRE, 'r': ['#fffbe0', '#fff3a8', '#ffd25a', '#ffb43a']}, ox=2, oy=4)
    return r, {**p, 'w': '#ffe95c'}

SKILL_ICONS.update({'deszcz': arrows, 'okrzyk': horn, 'kula': fireball, 'oddech': dragon})
