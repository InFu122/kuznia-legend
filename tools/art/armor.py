import sys, math; sys.path.insert(0, '.')
from shade import finish, grid, tostr, mirror

def M(half): return mirror(half)

def helm(tier):
    if tier == 0:
        h = ["........", "........", ".....MMM", "....MMMM", "...MMMMM", "..MMMMMM", "..MMMMMM", "..MMMMMM",
             "..MMMMMM", "..MMkkkM", "..MMkkkM", "..MMMkkM", "...MMkkM", "...MM...", "........", "........"]
    elif tier == 1:
        h = ["........", "......MM", ".....MMG", "....MMMG", "...MMMMG", "..MMMMMG", "..MMMMMG", "..kkkkkG",
             "..MMMMMM", "..MMMMMM", "..MMMMMM", "..MMMMMM", "...MMMMM", "...GGGGG", "........", "........"]
    else:
        h = ["G.......", "GG......", ".GG..MMM", "..GGMMMM", "...MMMMM", "..MMMMJJ", "..MMMMMM", "..MkkkkM",
             "..MMMMkM", "..MMMMkM", "..MMMMMM", "..GMMMMM", "...GMMMM", "....GGGG", "........", "........"]
    return finish(M(h))

def chest(tier):
    if tier == 0:
        h = ["........", "........", "...LL...", "..MLLM..", ".MMMMMMM", "MMMMMMMM", "MMMMMMMM", "..MMMMMM",
             "..MMMMMM", "..MMMMMM", "..MMMMMM", "...MMMMM", "...LLLLL", "...MMMMM", "....MMM.", "........"]
    elif tier == 1:
        h = ["........", "........", "..GG....", ".GMMG...", "GMMMMGGG", "GMMMMMMG", "MMMMMMMG", "..MMMMMG",
             "..MMMMMG", "..MMMMMG", "..MMMMMG", "...MMMMG", "...GGGGG", "...MMMMM", "....MMM.", "........"]
    else:
        h = ["M.......", "MM......", ".MMG....", ".GMMG...", "GMMMMGGG", "GMMMMMMG", "MMMMMMJJ", "..MMMMJJ",
             "..MMMMMG", "..MMMMMG", "..MMMMMG", "...MMMMG", "...GGGGG", "...MMMMM", "....MMM.", "........"]
    return finish(M(h))

def gloves(tier):
    body = 'L' if tier == 0 else 'M'
    lo, hi = ('l', 'n') if tier == 0 else ('2', '4')
    f = lambda: hi + lo
    r = ["................", "................",
         "...." + "".join(hi + "." for _ in range(4)) + "....",
         "...." + f() * 4 + "....", "...." + f() * 4 + "....",
         "...." + body * 8 + "." + body * 2 + ".", "...." + body * 11 + ".", "...." + body * 10 + "..",
         "...." + body * 9 + "...", "...." + body * 8 + "....",
         "...MMMMMMMMMM...", "...MMMMMMMMMM...", "..MMMMMMMMMMMM..", "..MMMMMMMMMMMM..", "................", "................"]
    r = [list(x) for x in r]
    if tier >= 1:
        for x in range(3, 13): r[10][x] = 'G'
        for x in range(2, 14): r[13][x] = 'G'
    if tier == 2:
        for x in (4, 6, 8, 10): r[1][x] = 'w'
        for (x, y) in [(6, 6), (7, 6), (6, 7), (7, 7)]: r[y][x] = 'J'
        r[4][14] = 'w'
    return finish(["".join(x) for x in r])

def boots(tier):
    if tier == 0:
        r = ["................", "................", "....LLLLL.......", "....LLLLL.......", "....LLLLL.......",
             "....LLLLL.......", "....LLLLL.......", "....LLLLL.......", "....LLLLLL......", "....LLLLLLLL....",
             "....LLLLLLLLMM..", "...LLLLLLLLLMMM.", "...WWWWWWWWWWWW.", "................", "................", "................"]
    elif tier == 1:
        r = ["................", "...GGGGGGG......", "...MMMMMMM......", "....MMMMM.......", "....MMMMM.......",
             "....kkkkk.......", "....MMMMM.......", "....MMMMM.......", "....LLLLLL......", "....LLLLLLLL....",
             "....LLLLLLLLMM..", "...MMMMMLLLLMMM.", "...WWWWWWWWWWWW.", "................", "................", "................"]
    else:
        r = ["..w.............", ".ww.............", ".wwGGGGGGG......", "..wMMMMMMM......", "..wwMMMMM.......",
             "...wMMJMM.......", "....MMMMM.......", "....kkkkk.......", "....MMMMMM......", "....MMMMMMMM....",
             "....MMMMMMMMMM..", "...MMMMMMMMMMMM.", "...GGGGGGGGGGGG.", "................", "................", "................"]
    return finish(r)

def belt(tier):
    g = grid()
    cx, cy, rx, ry = 7.5, 8.5, 7.2, 4.2
    for y in range(16):
        for x in range(16):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if 0.45 <= d <= 1.0: g[y][x] = 'L'
    # klamra z przodu (dół elipsy)
    for y in range(10, 15):
        for x in range(5, 11):
            g[y][x] = 'M' if tier < 2 else 'G'
    for (x, y) in [(7, 12), (8, 12)]: g[y][x] = 'k'
    if tier == 1:
        for (x, y) in [(1, 6), (14, 6), (2, 10), (13, 10)]: g[y][x] = 'M'
    if tier == 2:
        for (x, y) in [(7, 12), (8, 12), (7, 11), (8, 11)]: g[y][x] = 'J'
        for (x, y) in [(1, 6), (14, 6), (2, 10), (13, 10), (4, 4), (11, 4)]: g[y][x] = 'G'
    return finish(tostr(g))

def ring(tier):
    g = grid()
    cx, cy = 7.5, 9.5
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - cx, y - cy)
            if (3.0 if tier == 0 else 3.4) <= d <= 5.0: g[y][x] = 'M'
    if tier >= 1:
        for y in range(2, 6):
            for x in range(5, 11):
                if math.hypot(x - 7.5, y - 3.8) <= 2.2: g[y][x] = 'J'
        for (x, y) in [(5, 5), (10, 5), (6, 2), (9, 2)]: g[y][x] = 'M' if tier == 1 else 'G'
    if tier == 2:
        for (x, y) in [(3, 6), (12, 6)]: g[y][x] = 'J'
        g[0][7] = 'w'; g[1][7] = 'w'; g[0][8] = '.'
    return finish(tostr(g))

def amulet(tier):
    g = grid()
    chain = 'M' if tier < 2 else 'G'
    for i in range(6):
        g[1 + i][2 + i] = chain if i % 2 == 0 else '.'
        g[1 + i][13 - i] = chain if i % 2 == 0 else '.'
    for x in (2, 13): g[0][x] = chain
    if tier == 0:
        for y in range(7, 15):
            for x in range(3, 13):
                if math.hypot(x - 7.5, y - 10.5) <= 3.4: g[y][x] = 'M'
        for (x, y) in [(7, 10), (8, 10), (7, 11), (8, 11)]: g[y][x] = 'k'
    elif tier == 1:
        for y in range(7, 16):
            for x in range(3, 13):
                d = ((x - 7.5) / 3.2) ** 2 + ((y - 11) / 3.8) ** 2
                if d <= 1: g[y][x] = 'M'
                if ((x - 7.5) / 2.0) ** 2 + ((y - 11) / 2.6) ** 2 <= 1: g[y][x] = 'J'
    else:
        for y in range(6, 16):
            for x in range(1, 15):
                ax, ay = abs(x - 7.5), abs(y - 10.5)
                if ax + ay <= 4.6 or (ax <= 0.5 and ay <= 5) or (ay <= 0.5 and ax <= 6.5): g[y][x] = 'G'
                if math.hypot(x - 7.5, y - 10.5) <= 2.1: g[y][x] = 'J'
        g[9][7] = 'w'
    g[6][7] = g[6][8] = chain
    return finish(tostr(g))

KINDS = {'Hełm': helm, 'Napierśnik': chest, 'Rękawice': gloves, 'Buty': boots, 'Pas': belt, 'Pierścień': ring, 'Amulet': amulet}
