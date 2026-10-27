# Dodatkowe rodzaje ekwipunku (etap „więcej wersji”): 5 broni i po 2 rodzaje na pozostałe miejsca.
import sys, math; sys.path.insert(0, '.')
from shade import finish, grid, tostr, mirror

def P(g, x, y, c):
    if 0 <= x < 16 and 0 <= y < 16: g[y][x] = c
def haft(g, y0, y1, mat='W', width=2):
    for y in range(y0, y1 + 1):
        P(g, 15 - y, y, mat)
        if width == 2: P(g, 16 - y, y, mat)
def M(h): return mirror(h)
def rows_of(lst): return [list(r) for r in lst]
def S(g): return [''.join(r) for r in g]

# ---------- broń ----------
def dagger(tier):
    g = grid()
    blade = range(3, 10) if tier < 2 else range(2, 10)
    for y in blade:
        for v in ((16, 17) if tier == 0 else (15, 16, 17)):
            if y == blade[0] and v != 16: continue
            P(g, v - y, y, 'M')
    if tier == 2:  # falista klinga (kris)
        for (x, y) in [(13, 4), (11, 6), (9, 8)]: P(g, x, y, 'M')
    guard = [(5, 8), (6, 9), (7, 10), (8, 11)] if tier == 0 else [(4, 7), (5, 8), (6, 9), (7, 10), (8, 11), (9, 12)]
    for (x, y) in guard: P(g, x, y, 'G')
    for (x, y) in [(5, 11), (4, 12)]: P(g, x, y, 'L' if tier else 'W')
    for (x, y) in [(2, 13), (3, 13), (2, 14), (3, 14)]: P(g, x, y, 'G' if tier < 2 else 'J')
    if tier >= 1: P(g, 6, 9, 'J')
    return finish(S(g))

def saber(tier):
    g = grid()
    # zakrzywiona klinga: oś od (6,9) łukiem do (14,0)
    pts = []
    for i in range(40):
        t = i / 39
        x = 6 + 8.5 * t
        y = 9 - 9 * t + 2.2 * math.sin(math.pi * t)
        pts.append((x, y, 1.15 - 0.55 * t + (0.25 if tier == 2 else 0)))
    for yy in range(16):
        for xx in range(16):
            if any(math.hypot(xx - x, yy - y) <= w for (x, y, w) in pts): P(g, xx, yy, 'M')
    guard = [(5, 8), (6, 9), (7, 10), (8, 11)]
    if tier >= 1: guard += [(4, 9), (4, 10), (5, 11), (6, 12)]  # kabłąk
    for (x, y) in guard: P(g, x, y, 'G')
    for (x, y) in [(5, 10), (4, 11), (3, 12)]: P(g, x, y, 'L' if tier else 'W')
    for (x, y) in [(1, 13), (2, 13), (2, 14)]: P(g, x, y, 'G')
    if tier == 2: P(g, 7, 10, 'J'); P(g, 1, 13, 'J')
    return finish(S(g))

def halberd(tier):
    g = grid()
    haft(g, 3, 15)
    # ostrze topora po lewej stronie trzonka
    for y in range(16):
        for x in range(16):
            u, v = x - y, x + y
            out = 14 - v
            if 0 <= out <= (3 if tier == 0 else 4) and 4 <= u <= (7 if tier < 2 else 8): P(g, x, y, 'M')
            if 17 <= v <= 18 and 5 <= u <= 6: P(g, x, y, 'M')  # hak z tyłu
    for (x, y) in [(13, 1), (14, 0), (13, 2)]: P(g, x, y, 'M')  # szpic
    if tier >= 1: P(g, 10, 6, 'G'); P(g, 11, 6, 'G')
    if tier == 2:
        P(g, 8, 4, 'J')
        for (x, y) in [(9, 7), (9, 8), (8, 8)]: P(g, x, y, 'C')
    return finish(S(g))

def staff(tier):
    g = grid()
    haft(g, 5, 15)
    cx, cy, r = 11.5, 3.5, (2.0 if tier == 0 else 2.5 if tier == 1 else 3.0)
    for yy in range(16):
        for xx in range(16):
            if math.hypot(xx - cx, yy - cy) <= r: P(g, xx, yy, 'J')
    claws = [(9, 4), (9, 5), (10, 6), (11, 6)] if tier == 0 else [(8, 3), (8, 4), (9, 6), (10, 7), (12, 7), (14, 6)]
    for (x, y) in claws: P(g, x, y, 'M')
    if tier >= 1:
        for (x, y) in [(9, 8), (8, 9)]: P(g, x, y, 'G')
    rows = finish(S(g))
    rows = [list(r) for r in rows]
    rows[2][10] = 'w'
    if tier == 2:
        for (x, y) in [(15, 0), (14, 1), (8, 0), (15, 6)]:
            if rows[y][x] == '.': rows[y][x] = 'w'
    return [''.join(r) for r in rows]

def bow(tier):
    g = grid()
    # łęczysko: łuk od (3,2) do (13,12) wygięty w lewo-dół; cięciwa prosta po przekątnej
    for i in range(60):
        t = i / 59
        bx = 2 + 11 * t + 3.2 * math.sin(math.pi * t)
        by = 2 + 11 * t - 3.2 * math.sin(math.pi * t)
        for (dx, dy) in ((0, 0), (1, 0)) if tier == 0 else ((0, 0), (1, 0), (0, -1)):
            P(g, int(round(bx)) + dx, int(round(by)) + dy, 'W' if tier == 0 else 'M')
    for i in range(12): P(g, 2 + i, 3 + i, 'w')  # cięciwa
    for (x, y) in [(9, 5), (10, 6), (10, 5)]: P(g, x, y, 'L' if tier < 2 else 'G')  # uchwyt
    if tier >= 1:
        for (x, y) in [(2, 2), (3, 2), (13, 12), (13, 13)]: P(g, x, y, 'G')
    if tier == 2: P(g, 10, 5, 'J')
    return finish(S(g))

# ---------- głowa ----------
def hood(tier):
    h = ["......MM", ".....MMM", "....MMMM", "...MMMMM", "...MMMMM", "..MMMMkk", "..MMMkkk", "..MMMkkk",
         "..MMMkkk", "..MMMMkk", ".MMMMMMM", "MMMMMMMM", "MMMMMMMM", "MMMMMMMM", ".MMMMMMM", "........"]
    g = rows_of(M(h))
    if tier >= 1:
        for x in range(1, 15): g[14][x] = 'G'
        g[11][7] = g[11][8] = 'J'
    if tier == 2:
        g[7][6] = 'h'; g[7][9] = 'h'  # świecące oczy w mroku
    return finish(S(g))

def circlet(tier):
    if tier == 0:
        h = ["........", "........", "........", "........", "........", "........", ".......J", "......JJ",
             ".MMMMMMM", ".MMMMMMM", "..MMMMMM", "........", "........", "........", "........", "........"]
    elif tier == 1:
        h = ["........", "........", "........", "........", "...M....", "...MM..J", "..MMM.JJ", "..MMMMMM",
             ".MMMMMMM", ".MJMMMMM", ".GGGGGGG", "........", "........", "........", "........", "........"]
    else:
        h = ["........", "........", ".......J", "...J...J", "...M..JJ", "..MMM.MM", "..MMMMMM", ".MMMMMMM",
             ".MJMMMMM", ".MMMMMMM", ".GGGGGGG", "........", "........", "........", "........", "........"]
    rows = finish(M(h))
    if tier == 2:
        rows = [list(r) for r in rows]; rows[1][8] = 'w'; rows = [''.join(r) for r in rows]
    return rows

def chainmail(tier):
    h = ["........", "........", "...MMM..", "..MMMMMM", ".MMMMMMM", "MMMMMMMM", "MM.MMMMM", "...MMMMM",
         "...MMMMM", "...MMMMM", "...MMMMM", "...MMMMM", "...MMMMM", "...MMMMM", "........", "........"]
    g = rows_of(M(h))
    if tier >= 1:
        for x in range(3, 13): g[10][x] = 'L'
        g[10][7] = g[10][8] = 'G'
        for x in range(3, 13): g[13][x] = 'G'
    if tier == 2:
        for (x, y) in [(0, 4), (1, 4), (14, 4), (15, 4), (0, 3), (15, 3)]: g[y][x] = 'M'
        g[6][7] = g[6][8] = 'J'
    rows = finish(S(g))
    # oczka kolczugi: szachownica ciemnych punktów na metalu
    out = [list(r) for r in rows]
    for y in range(16):
        for x in range(16):
            if out[y][x] in '34' and (x + y) % 2 == 0: out[y][x] = '2'
    return [''.join(r) for r in out]

def robe(tier):
    h = ["........", "........", "....MMMG", "...MMMMG", "..MMMMMG", ".MMMMMMG", "MM.MMMMG", "M..MMMMG",
         "...MMMMG", "..MMMMMG", "..MMMMMG", ".MMMMMMG", ".MMMMMMG", "MMMMMMMG", "GGGGGGGG", "........"]
    g = rows_of(M(h))
    if tier == 0:
        for y in range(16):
            for x in range(16):
                if g[y][x] == 'G': g[y][x] = 'M'
        for x in range(4, 12): g[8][x] = 'L'
    if tier >= 1:
        for x in range(4, 12): g[8][x] = 'G'
    if tier == 2:
        g[4][7] = g[4][8] = 'J'
        for (x, y) in [(5, 11), (10, 11), (4, 12), (11, 12)]: g[y][x] = 'h'
    return finish(S(g))

# ---------- ręce ----------
def bracers(tier):
    r = ["................", "................", "..MMMM....MMMM..", "..MMMM....MMMM..", "..LLLL....LLLL..",
         "..MMMM....MMMM..", "..MMMM....MMMM..", "..MMMM....MMMM..", "..LLLL....LLLL..", "..MMMM....MMMM..",
         "..MMMM....MMMM..", "..MMMM....MMMM..", "................", "................", "................", "................"]
    g = rows_of(r)
    if tier >= 1:
        for y in (4, 8):
            for x in (2, 3, 4, 5, 10, 11, 12, 13): g[y][x] = 'G'
    if tier == 2:
        for (x, y) in [(1, 6), (0, 6), (14, 6), (15, 6)]: g[y][x] = 'M'
        g[6][3] = g[6][4] = g[6][11] = g[6][12] = 'J'
    return finish(S(g))

def claws(tier):
    L = 4 if tier == 0 else 5
    r = rows_of(["................"] * 16)
    for k, x in enumerate((5, 8, 11)):
        for i in range(L + (1 if k == 1 else 0)):
            r[6 - i][x] = 'w' if i == L - 1 + (1 if k == 1 else 0) else 'M'
    for y in range(7, 11):
        for x in range(4, 13): r[y][x] = 'L' if tier == 0 else 'M'
    for y in range(11, 14):
        for x in range(4, 13): r[y][x] = 'L'
    if tier >= 1:
        for x in range(4, 13): r[11][x] = 'G'
    if tier == 2: r[8][7] = r[8][8] = r[9][7] = r[9][8] = 'J'
    return finish(S(r))

# ---------- nogi ----------
def greaves(tier):
    r = ["................", "....MMM.........", "...MMMMM........", "...MMMMM........", "....MMMM........",
         "....LLLL........", "....MMMM........", "....MMMM........", "....MMMM........", "....MMMMM.......",
         "....MMMMMMM.....", "...MMMMMMMMM....", "...MMMMMMMMMMM..", "................", "................", "................"]
    g = rows_of(r)
    if tier >= 1:
        for x in range(4, 8): g[5][x] = 'G'
        for x in range(3, 14):
            if g[12][x] == 'M': g[12][x] = 'G'
    if tier == 2:
        g[0][5] = 'M'; g[2][5] = 'J'; g[2][6] = 'J'
    rows = [list(x) for x in finish(S(g))]
    for (y, x0, x1) in [(9, 5, 8), (11, 5, 11)]:  # łączenia płyt
        for x in range(x0, x1 + 1):
            if rows[y][x] in '1234': rows[y][x] = '1'
    return [''.join(x) for x in rows]

def shoes(tier):
    r = ["................", "................", "................", "................", "................",
         "....LLLL........", "....LLLL........", "...LLLLLL.......", "...LLLLLLLL.....", "...LLLLLLLLLL...",
         "..LLLLLLLLLLLLL.", "..WWWWWWWWWWWWW.", "................", "................", "................", "................"]
    g = rows_of(r)
    if tier >= 1:
        for (x, y) in [(12, 9), (13, 10), (14, 10), (12, 10)]: g[y][x] = 'M'
        for x in range(4, 8): g[5][x] = 'G'
    if tier == 2:
        g[9][14] = 'M'; g[8][15] = 'M'
        g[7][5] = 'J'
        for x in range(2, 15): g[11][x] = 'G'
    return finish(S(g))

def sash(tier):
    # Sakwa: pas z przypiętą skórzaną sakiewką
    r = ["................", "................", "................", "LLLLLLLLLLLLLLLL", "LLLLLLLLLLLLLLLL",
         "................", "....llllllll....", "....LLLLLLLL....", "....LLLLLLLL....", "....LLLLLLLL....",
         "....LLLLLLLL....", "....LLLLLLLL....", ".....LLLLLL.....", "................", "................", "................"]
    g = rows_of(r)
    for y in (5,): g[y][5] = g[y][10] = 'L'
    for (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8)]: g[y][x] = 'M'  # zapięcie z rudy
    for x in (1, 14):
        g[3][x] = g[4][x] = 'M'
    if tier >= 1:
        for x in range(4, 12): g[6][x] = 'G'
    if tier == 2:
        g[7][7] = g[7][8] = g[8][7] = g[8][8] = 'J'
        for x in range(0, 16):
            if g[3][x] == 'L': g[3][x] = 'G'
    return finish(S(g))

def strap(tier):
    r = ["................", "................", "................", "................", "................",
         "LLLLLLLLLLLLLLLL", "LLLLLLLLLLLLLLLL", "LLLLLLLLLLLLLLLL", "................", "................",
         "................", "................", "................", "................", "................", "................"]
    g = rows_of(r)
    for x in (2, 13):
        for y in range(4, 9): g[y][x] = 'M'
    for y in range(4, 9):
        for x in range(6, 10): g[y][x] = 'M'
    g[6][7] = g[6][8] = 'k'
    if tier >= 1:
        for x in (4, 11): g[6][x] = 'M'
        for x in range(0, 16):
            if g[5][x] == 'L': g[5][x] = 'G'
    if tier == 2:
        g[6][7] = g[6][8] = 'J'
        for (x, y) in [(7, 9), (8, 9), (7, 10), (8, 10), (7, 11)]: g[y][x] = 'M'  # zawieszka
    return finish(S(g))

# ---------- biżuteria ----------
def signet(tier):
    g = grid()
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 10)
            if 3.2 <= d <= 4.9: g[y][x] = 'M'
    for y in range(3, 8):
        for x in range(5, 11): g[y][x] = 'M' if tier < 2 else 'G'
    face = 'G' if tier == 1 else 'J' if tier == 2 else 'k'
    for (x, y) in [(7, 4), (8, 4), (6, 5), (9, 5), (7, 6), (8, 6)]: g[y][x] = face
    rows = finish(S(g))
    return rows

def band(tier):
    g = grid()
    for y in range(16):
        for x in range(16):
            dx, dy = (x - 7.5) / 5.5, (y - 8.5) / 4.2
            d = dx * dx + dy * dy
            if 0.45 <= d <= 1.0: g[y][x] = 'M'
            if tier >= 1 and 0.62 <= d <= 0.75: g[y][x] = 'G'
    if tier == 2:
        for (x, y) in [(7, 4), (2, 8), (13, 8), (7, 12)]: g[y][x] = 'J'
    rows = finish(S(g))
    if tier == 2:
        rows = [list(r) for r in rows]; rows[1][12] = 'w'; rows = [''.join(r) for r in rows]
    return rows

def medallion(tier):
    g = grid()
    chain = 'M' if tier < 2 else 'G'
    for i in range(5):
        g[1 + i][3 + i] = chain if i % 2 == 0 else '.'
        g[1 + i][12 - i] = chain if i % 2 == 0 else '.'
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 10.5)
            if d <= 4.6: g[y][x] = 'M' if tier < 2 else 'G'
            if tier >= 1 and d <= 2.2: g[y][x] = 'J'
    if tier == 0:
        for (x, y) in [(7, 9), (8, 9), (6, 10), (9, 10), (7, 11), (8, 11), (7, 12), (8, 12)]: g[y][x] = 'k'
    if tier == 2:
        for (x, y) in [(7, 4), (8, 4), (2, 10), (13, 10), (7, 15), (8, 15)]: g[y][x] = 'M'
    g[5][7] = g[5][8] = chain
    return finish(S(g))

def talisman(tier):
    rows = [
        "......M..M......",
        ".......MM.......",
        ".......MM.......",
        "......MMMM......",
        ".....MMMMMM.....",
        ".....MMMMMM.....",
        "....MMMMMMMM....",
        "....MMMMMMMM....",
        "...MMMMMMMMMM...",
        "...MMMMMMMMMM...",
        "....MMMMMMMM....",
        ".....MMMMMM.....",
        "......MMMM......",
        ".......MM.......",
        "................",
        "................",
    ]
    g = rows_of(rows)
    eye = [(6, 8), (7, 8), (8, 8), (9, 8), (5, 9), (10, 9), (6, 10), (7, 10), (8, 10), (9, 10)]
    for (x, y) in eye: g[y][x] = 'k'
    g[9][7] = g[9][8] = 'J' if tier >= 1 else 'k'
    if tier >= 1:
        for (x, y) in [(7, 4), (8, 4), (7, 5), (8, 5)]: g[y][x] = 'G'
    if tier == 2:
        for (x, y) in [(2, 8), (13, 8), (1, 9), (14, 9)]: g[y][x] = 'G'
    rows = finish(S(g))
    if tier == 2:
        rows = [list(r) for r in rows]; rows[6][2] = 'w'; rows = [''.join(r) for r in rows]
    return rows

KINDS = {
    'Sztylet': dagger, 'Szabla': saber, 'Halabarda': halberd, 'Kostur': staff, 'Łuk': bow,
    'Kaptur': hood, 'Diadem': circlet, 'Kolczuga': chainmail, 'Szata': robe,
    'Karwasze': bracers, 'Szpony': claws, 'Nagolenniki': greaves, 'Trzewiki': shoes,
    'Sakwa': sash, 'Rzemień': strap, 'Sygnet': signet, 'Obrączka': band, 'Medalion': medallion, 'Talizman': talisman,
}
