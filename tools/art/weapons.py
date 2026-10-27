import sys; sys.path.insert(0, '.')
from shade import finish, grid, tostr
import math

def P(g, x, y, c):
    if 0 <= x < 16 and 0 <= y < 16: g[y][x] = c

def haft(g, y0, y1, mat='W', width=2):
    # trzonek wzdłuż x+y=15 (i 16 przy szerokości 2), y od y0 do y1
    for y in range(y0, y1 + 1):
        P(g, 15 - y, y, mat)
        if width == 2: P(g, 16 - y, y, mat)

def butt(g, tier, y=14):
    if tier >= 1: P(g, 15 - y, y, 'G'); P(g, 16 - y, y, 'G')

def axe(tier):
    g = grid()
    haft(g, 3, 14)
    prof = [2, 2, 2.5, 3, 3.5, 4, 4.5]
    for y in range(16):
        for x in range(16):
            u, v = x - y, x + y
            out = 14 - v
            if 0 <= out <= 6 and abs(u - 5) <= prof[out]: P(g, x, y, 'M')
            if tier >= 1:
                out2 = v - 17
                if 0 <= out2 <= (4 if tier == 1 else 5) and abs(u - 5) <= prof[out2]: P(g, x, y, 'M')
    # wycięcie (łuk) w środku ostrza od strony trzonka — topór brodaty
    for (x, y) in [(7, 7)]: P(g, x, y, '.')
    if tier >= 1:
        for (x, y) in [(10, 5), (11, 5)]: P(g, x, y, 'G')
    if tier == 2:
        for (x, y) in [(13, 2), (14, 1)]: P(g, x, y, 'M')  # kolec na szczycie trzonka
        P(g, 10, 5, 'J'); P(g, 11, 5, 'J')
    butt(g, tier)
    return finish(tostr(g))

def hammer(tier):
    g = grid()
    haft(g, 6, 14)
    for y in range(16):
        for x in range(16):
            u, v = x - y, x + y
            if 5 <= u <= (9 if tier < 2 else 10) and 10 <= v <= (20 if tier == 0 else 21): P(g, x, y, 'M')
    if tier >= 1:
        for y in range(16):
            for x in range(16):
                u, v = x - y, x + y
                if g[y][x] == 'M' and v in (15, 16): P(g, x, y, 'G')
    if tier == 2:
        P(g, 11, 4, 'J'); P(g, 12, 4, 'J')
        for (x, y) in [(14, 0), (15, 0), (15, 1)]: P(g, x, y, 'M')  # kolec
    butt(g, tier)
    return finish(tostr(g))

def spear(tier):
    g = grid()
    haft(g, 6, 15, width=2)
    W = {7: 0.5, 8: 1, 9: 1.5, 10: 2, 11: 2, 12: 1.5, 13: 1, 14: 0.5} if tier < 2 else {7: 0.5, 8: 1.5, 9: 2, 10: 2.5, 11: 2, 12: 1.5, 13: 1, 14: 0.5}
    for y in range(16):
        for x in range(16):
            u, v = x - y, x + y
            w = W.get(u)
            if w is not None and abs(v - 15.5) <= w: P(g, x, y, 'M')
            if tier == 2 and u == 6 and 12 <= v <= 19: P(g, x, y, 'G')  # poprzeczka pod grotem
    if tier >= 1:
        for (x, y) in [(9, 5), (10, 5)]: P(g, x, y, 'G')
        for (x, y) in [(7, 6), (7, 7), (6, 7)]: P(g, x, y, 'C')  # frędzel
    if tier == 2: P(g, 12, 3, 'J')
    butt(g, tier, 15)
    return finish(tostr(g))

def mace(tier):
    g = grid()
    haft(g, 7, 14)
    cx, cy, r = 10.5, 4.5, (2.7 if tier < 2 else 3.2)
    for y in range(16):
        for x in range(16):
            if math.hypot(x - cx, y - cy) <= r: P(g, x, y, 'M')
    L = 1 if tier == 0 else 2
    inside = lambda x, y: math.hypot(x - cx, y - cy) <= r
    for (dx, dy) in [(0, -1), (-1, 0), (1, 0)] + ([(0, 1)] if tier == 0 else []):
        for (bx, by) in [(10, 4), (11, 4), (10, 5), (11, 5)]:
            # pierwsza komórka poza kulą w danym kierunku, potem kolec długości L
            x, y = bx, by
            while inside(x, y): x += dx; y += dy
            if (dx == 0 and bx in (10, 11) and by == (4 if dy < 0 else 5)) or (dy == 0 and by in (4, 5) and bx == (10 if dx < 0 else 11)):
                for i in range(L): P(g, x + dx * i, y + dy * i, 'M')
    if tier >= 1:
        for (x, y) in [(8, 7), (9, 7)]: P(g, x, y, 'G')
    if tier == 2:
        for (x, y) in [(10, 4), (11, 4), (10, 5), (11, 5)]: P(g, x, y, 'J')
    butt(g, tier)
    return finish(tostr(g))

def sword(tier):
    g = grid()
    # ostrze: x+y = 15..17 (tier 2: szersze)
    for y in range(1, 9):
        for v in ((15, 16, 17) if tier < 2 else (14, 15, 16, 17)):
            x = v - y
            if y == 1 and v != 15: continue
            if y == 2 and v not in (15, 16): continue
            P(g, x, y, 'M')
    guard = [(5, 7), (6, 8), (7, 9), (8, 10), (9, 11)]
    if tier >= 1: guard += [(4, 6), (10, 12)]
    if tier == 2: guard += [(3, 6), (10, 13), (4, 5), (11, 12)]
    for (x, y) in guard: P(g, x, y, 'G')
    grip = 'L' if tier >= 1 else 'W'
    for (x, y) in [(6, 10), (5, 11), (4, 12)]: P(g, x, y, grip)
    for (x, y) in [(2, 13), (3, 13), (2, 14), (3, 14)]: P(g, x, y, 'G')
    if tier >= 1: P(g, 7, 9, 'J')
    if tier == 2: P(g, 2, 13, 'J'); P(g, 3, 14, 'J')
    rows = finish(tostr(g))
    return rows

KINDS = {'Miecz': sword, 'Topór': axe, 'Młot': hammer, 'Włócznia': spear, 'Buława': mace}
