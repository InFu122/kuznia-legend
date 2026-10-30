# Postaci na polu walki.
#  - Bohater 36×36 składany z warstw: ciało (stała paleta) + ekwipunek (paleta rudy przedmiotu, jak ikony).
#    Każdy rodzaj hełmu, zbroi, rękawic, butów i pasa ma własną warstwę; broń to ikona przedmiotu w dłoni.
#  - Przeciwnicy 32×32: kilkanaście szablonów (wilk, dzik, pająk, ropucha, wąż, rycerz, mag, szkielet, upiór,
#    golem, troll, chochlik, ptak, smok) i palety dla każdego wroga. Rysowane przodem w prawo, eksport odbija
#    je w lewo (stoją naprzeciw bohatera) i cieniuje (światło z lewej góry).
import sys, math; sys.path.insert(0, '.')
import shade as sh
import shade2 as s2
import bosses

# ---------------------------------------------------------------- płótno
class Cv:
    def __init__(s, w, h): s.w, s.h = w, h; s.g = [['.'] * w for _ in range(h)]
    def put(s, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h: s.g[y][x] = c
    def get(s, x, y): return s.g[y][x] if 0 <= x < s.w and 0 <= y < s.h else '.'
    def rect(s, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.put(x, y, c)
    def ell(s, cx, cy, rx, ry, c, only=None):
        for y in range(s.h):
            for x in range(s.w):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1 and (only is None or s.g[y][x] in only): s.g[y][x] = c
    def line(s, x0, y0, x1, y1, c, th=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            if th <= 1: s.put(x, y, c)
            else:
                r = th / 2
                for yy in range(int(y - r) - 1, int(y + r) + 2):
                    for xx in range(int(x - r) - 1, int(x + r) + 2):
                        if (xx + .5 - x - .5) ** 2 + (yy + .5 - y - .5) ** 2 <= r * r: s.put(xx, yy, c)
    def poly(s, pts, c):
        for y in range(s.h):
            for x in range(s.w):
                px, py = x + .5, y + .5; inside = False
                for i in range(len(pts)):
                    (ax, ay), (bx, by) = pts[i], pts[(i + 1) % len(pts)]
                    if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax: inside = not inside
                if inside: s.g[y][x] = c
    def rows(s): return [''.join(r) for r in s.g]

def shade_with(rows, ramps):
    """Cieniowanie jak w shade.py, ale z własnymi regionami → tonami (jasny, średni, ciemny, najciemniejszy)."""
    h, w = len(rows), len(rows[0])
    g = [list(r) for r in rows]
    get = lambda x, y: rows[y][x] if 0 <= x < w and 0 <= y < h else '.'
    for y in range(h):
        for x in range(w):
            c = rows[y][x]
            if c not in ramps: continue
            hi, mid, lo, deep = ramps[c]
            up, left, down, right = get(x, y - 1) != c, get(x - 1, y) != c, get(x, y + 1) != c, get(x + 1, y) != c
            if (up or left) and not (down or right): t = hi
            elif (down or right) and not (up or left): t = deep if (down and right) else lo
            elif (up or left) and (down or right): t = mid if not (up and left) else hi
            else: t = mid
            g[y][x] = t
    return [''.join(r) for r in g]

# ---------------------------------------------------------------- bohater
HW = HH = 36
# Ciało: ! skóra, @ włosy, # tunika, $ spodnie, % buty — po cieniowaniu: A-C, D-F, H-J, P-R, T-V.
BASE_RAMPS = {'!': 'ABCC', '@': 'DEFF', '#': 'HIJJ', '$': 'PQRR', '%': 'TUVV'}
BASE_PAL = {'A': '#f4c9a0', 'B': '#d99b6c', 'C': '#a8693f', 'D': '#8a5a34', 'E': '#62391e', 'F': '#3e2210',
            'H': '#8c6a48', 'I': '#6a4c32', 'J': '#46301f', 'P': '#5a4a5e', 'Q': '#433646', 'R': '#2c2330',
            'T': '#7a5234', 'U': '#583a24', 'V': '#3a2416', 'e': '#1b1420', 'o': '#ffffff', 'k': '#17121c'}
HEAD = (13.5, 11.5, 5.6, 5.4)
HAND_F = (22, 21)   # dłoń z bronią (środek)

def hero_base():
    c = Cv(HW, HH)
    # nogi i buty
    c.rect(10, 27, 12, 31, '$'); c.rect(15, 27, 17, 31, '$')
    c.rect(9, 32, 12, 33, '%'); c.rect(15, 32, 18, 33, '%')
    # tylne ramię
    c.rect(6, 18, 8, 24, '#'); c.rect(6, 25, 8, 26, '!')
    # tułów
    c.poly([(9, 17), (19, 17), (19, 27), (9, 27)], '#')
    # przednie ramię (wyciągnięte do przodu)
    c.rect(18, 18, 20, 21, '#'); c.rect(20, 20, 21, 22, '#')
    # głowa
    cx, cy, rx, ry = HEAD; c.ell(cx, cy, rx, ry, '!')
    # włosy: czubek i tył głowy
    c.ell(cx - .3, 7.6, rx + .4, 2.9, '@')
    for y in range(9, 15): c.put(8, y, '@'); c.put(9, y, '@')
    c.put(10, 10, '@'); c.put(10, 9, '@'); c.put(11, 9, '@')
    rows = shade_with(c.rows(), BASE_RAMPS)
    g = [list(r) for r in rows]
    for (x, y) in [(15, 12), (18, 12)]: g[y][x] = 'e'; g[y - 1][x] = 'e'
    g[11][15] = 'e'; g[11][18] = 'e'
    g[14][16] = 'C'; g[14][17] = 'C'  # usta
    return [''.join(r) for r in g]

def hero_hand():
    """Przednia dłoń (rysowana na broni, gdy nie ma rękawic)."""
    c = Cv(HW, HH); c.rect(21, 20, 23, 22, '!')
    return shade_with(c.rows(), BASE_RAMPS)

# Warstwy ekwipunku: regiony shade.py (M metal, G złoto, L skóra, W drewno, C sukno, J klejnot) → znaki ikon.
def layer(c, tier_gold=True):
    return sh.outline(sh.shade(c.rows()))

def helm_helm(t):
    c = Cv(HW, HH); cx, cy, rx, ry = HEAD
    c.ell(cx, cy - 1.2, rx + .9, ry - .1, 'M')
    c.rect(7, 12, 9, 15, 'M')                        # osłona karku
    c.ell(16.4, 13.2, 3.9, 4, '.')                   # twarz
    c.rect(8, 8, 20, 9, 'G' if t else 'M')           # obręcz
    c.rect(17, 10, 17, 12, 'M')                      # nosal
    if t == 2:
        c.poly([(9, 5), (12, 0), (15, 0), (13, 5)], 'C')  # pióropusz
    return layer(c)

def helm_hood(t):
    c = Cv(HW, HH); cx, cy, rx, ry = HEAD
    c.ell(cx - .4, cy - .2, rx + 1.4, ry + 1.2, 'M')
    c.poly([(7, 9), (5, 4), (10, 6)], 'M')           # szpic kaptura z tyłu
    c.ell(cx + 2.4, cy + 1.9, 3.8, 4.1, '.')
    c.rect(9, 16, 18, 17, 'M')                       # kołnierz na ramionach
    if t: c.rect(16, 6, 18, 6, 'G')
    if t == 2: c.put(13, 5, 'J'); c.put(14, 5, 'J')
    return layer(c)

def helm_circlet(t):
    c = Cv(HW, HH)
    c.rect(8, 8, 19, 9, 'G' if t else 'M')
    c.put(17, 7, 'J'); c.put(17, 8, 'J'); c.put(16, 8, 'J')
    if t: c.put(13, 7, 'G'); c.put(10, 7, 'G')
    if t == 2: c.put(17, 6, 'J'); c.put(13, 6, 'G')
    return layer(c)

def armor_plate(t):
    c = Cv(HW, HH)
    c.poly([(9, 17), (19, 17), (19, 25), (16, 27), (12, 27), (9, 25)], 'M')
    c.ell(8.5, 18.5, 3, 2.4, 'M'); c.ell(19.5, 18.5, 2.8, 2.3, 'M')   # naramienniki
    if t: c.rect(9, 17, 19, 17, 'G')
    c.rect(14, 19, 14, 25, 'k') if t == 0 else None
    if t == 2: c.put(14, 20, 'J'); c.put(14, 21, 'J')
    return layer(c)

def armor_chain(t):
    c = Cv(HW, HH)
    c.rect(9, 17, 19, 28, 'M'); c.rect(6, 18, 8, 22, 'M'); c.rect(18, 18, 20, 20, 'M')
    rows = sh.shade(c.rows()); g = [list(r) for r in rows]
    for y in range(18, 29):
        for x in range(6, 21):
            if g[y][x] in '1234' and (x + y) % 2 == 0: g[y][x] = '2' if g[y][x] != '1' else '1'
    if t:
        for x in range(9, 20): g[28][x] = 'Y'
    if t == 2:
        for x in range(9, 20): g[17][x] = 'Y'
    return sh.outline([''.join(r) for r in g])

def armor_robe(t):
    c = Cv(HW, HH)
    c.poly([(9, 17), (19, 17), (20, 33), (8, 33)], 'M')
    c.rect(6, 18, 8, 23, 'M'); c.rect(18, 18, 20, 21, 'M')
    c.rect(9, 25, 19, 25, 'C')
    if t: c.rect(8, 32, 20, 32, 'G'); c.rect(14, 17, 14, 24, 'G')
    if t == 2: c.put(14, 25, 'J')
    return layer(c)

def gloves_layer(kind, t, front):
    c = Cv(HW, HH)
    mat = 'L' if (t == 0 and kind == 'Rękawice') else 'M'
    if front:
        c.rect(21, 20, 23, 22, mat)
        if kind == 'Karwasze': c.rect(19, 20, 20, 22, 'M')
        if kind == 'Szpony': c.put(24, 19, 'M'); c.put(24, 21, 'M'); c.put(24, 23, 'M')
    else:
        c.rect(6, 25, 8, 26, mat)
        if kind == 'Karwasze': c.rect(6, 22, 8, 24, 'M')
        if kind == 'Szpony': c.put(5, 27, 'M'); c.put(7, 27, 'M')
    if t and kind == 'Karwasze':
        if front: c.put(19, 20, 'G')
        else: c.rect(6, 22, 8, 22, 'G')
    return layer(c)

def boots_layer(kind, t):
    c = Cv(HW, HH)
    if kind == 'Nagolenniki':
        c.rect(10, 27, 12, 31, 'M'); c.rect(15, 27, 17, 31, 'M')
        c.rect(9, 32, 12, 33, 'L'); c.rect(15, 32, 18, 33, 'L')
        if t: c.rect(10, 27, 12, 27, 'G'); c.rect(15, 27, 17, 27, 'G')
    elif kind == 'Trzewiki':
        c.rect(9, 32, 13, 33, 'M'); c.rect(15, 32, 19, 33, 'M')
        if t: c.put(12, 32, 'G'); c.put(18, 32, 'G')
    else:
        c.rect(10, 29, 12, 31, 'M'); c.rect(15, 29, 17, 31, 'M')
        c.rect(9, 32, 12, 33, 'M'); c.rect(15, 32, 18, 33, 'M')
        c.rect(10, 29, 12, 29, 'G' if t else 'L'); c.rect(15, 29, 17, 29, 'G' if t else 'L')
    return layer(c)

def belt_layer(kind, t):
    c = Cv(HW, HH)
    if kind == 'Rzemień':
        c.rect(9, 25, 19, 25, 'L'); c.line(10, 17, 18, 25, 'L')
        c.put(14, 25, 'M')
    else:
        c.rect(9, 24, 19, 25, 'L' if kind == 'Sakwa' else 'M')
        c.rect(13, 24, 15, 25, 'G' if t else 'M')
        if kind == 'Sakwa': c.rect(7, 25, 10, 28, 'L'); c.rect(7, 25, 10, 25, 'M')
    if t == 2: c.put(14, 24, 'J')
    return layer(c)

def amulet_layer(t):
    c = Cv(HW, HH)
    c.line(11, 17, 14, 19, 'G'); c.line(17, 17, 14, 19, 'G')
    c.rect(13, 19, 15, 21, 'M'); c.put(14, 20, 'J')
    if t == 2: c.put(14, 21, 'J')
    return layer(c)

HELMS = {'Hełm': helm_helm, 'Kaptur': helm_hood, 'Diadem': helm_circlet}
ARMORS = {'Napierśnik': armor_plate, 'Kolczuga': armor_chain, 'Szata': armor_robe}
GLOVES = ['Rękawice', 'Karwasze', 'Szpony']
BOOTS = ['Buty', 'Nagolenniki', 'Trzewiki']
BELTS = ['Pas', 'Sakwa', 'Rzemień']

def hero_layers():
    L = {'base': hero_base(), 'hand': hero_hand()}
    for t in range(3):
        for k, f in HELMS.items(): L[f'helm:{k}:{t}'] = f(t)
        for k, f in ARMORS.items(): L[f'zbroja:{k}:{t}'] = f(t)
        for k in GLOVES:
            L[f'rekawice:{k}:{t}'] = gloves_layer(k, t, False)
            L[f'rekawiceF:{k}:{t}'] = gloves_layer(k, t, True)
        for k in BOOTS: L[f'buty:{k}:{t}'] = boots_layer(k, t)
        for k in BELTS: L[f'pas:{k}:{t}'] = belt_layer(k, t)
        L[f'amulet:{t}'] = amulet_layer(t)
    return L

# ---------------------------------------------------------------- przeciwnicy (przodem w prawo, p q r s t + e oczy, w biel)
FW = FH = 32

def wolf():
    c = Cv(FW, FH)
    c.line(6, 17, 1, 11, 'p', 2.6)                     # ogon
    c.ell(14, 19, 9.5, 5.2, 'p')                       # tułów
    c.ell(15, 22, 6.5, 2, 'q', only='p')               # brzuch
    c.rect(7, 22, 9, 29, 'p'); c.rect(11, 22, 12, 28, 'p')   # tylne łapy
    c.rect(19, 22, 21, 29, 'p'); c.rect(22, 21, 23, 28, 'p')  # przednie
    c.ell(23.5, 14, 4.8, 4.3, 'p')                     # głowa
    c.poly([(25, 14), (31, 15.5), (31, 18.5), (25, 18.5)], 'p')  # pysk
    c.poly([(20, 11), (21, 6), (24, 10)], 'p'); c.poly([(23, 10), (25, 6), (26.5, 11)], 'p')  # uszy
    c.ell(16, 13.5, 6, 2.5, 's', only='p')             # grzbiet
    for x in (6, 8, 10, 18, 20, 22): pass
    c.put(25, 13, 'e'); c.put(26, 13, 'e')
    c.put(28, 19, 'w'); c.put(30, 19, 'w')
    c.rect(26, 18, 31, 18, 'k')
    c.put(31, 15, 'k')
    return c

def boar():
    c = Cv(FW, FH)
    c.line(4, 17, 2, 14, 'p', 1.5)
    c.ell(14, 19, 10.5, 6.8, 'p')
    c.ell(23.5, 19.5, 5.5, 5, 'p')
    c.poly([(26, 18), (31, 18.5), (31, 23), (27, 23)], 'q')   # ryj
    c.rect(6, 24, 8, 29, 'p'); c.rect(10, 25, 12, 29, 'p'); c.rect(17, 25, 19, 29, 'p'); c.rect(21, 24, 23, 29, 'p')
    for x in range(6, 22, 2): c.line(x, 13 - (1 if x % 4 else 0), x + 1, 15, 's', 1)   # szczecina
    c.ell(13, 14, 8, 2.2, 's', only='p')
    c.poly([(20, 14), (21, 10), (23, 13)], 'p')
    c.put(25, 17, 'e'); c.put(26, 17, 'e')
    c.put(30, 20, 'k'); c.put(30, 21, 'k')
    c.line(27, 22, 29, 19, 'w', 1); c.put(29, 18, 'w')        # kieł
    return c

def spider():
    c = Cv(FW, FH)
    for i, (kx, ky, fx) in enumerate([(9, 9, 3), (14, 8, 8), (21, 9, 18), (26, 11, 29)]):
        sx = 12 + i * 3
        c.line(sx, 19, kx, ky, 'q', 1.6); c.line(kx, ky, fx, 29, 'q', 1.4)
    c.ell(11, 17, 7.5, 6.5, 'p')                       # odwłok
    c.ell(20.5, 20, 4.5, 3.8, 'p')                     # głowotułów
    c.poly([(9, 13), (13, 13), (11, 17), (13, 21), (9, 21), (11, 17)], 'r')  # znak klepsydry
    for (x, y) in [(23, 18), (24, 19), (22, 19), (24, 17)]: c.put(x, y, 'e')
    c.put(24, 23, 'w'); c.put(22, 23, 'w')
    return c

def toad():
    c = Cv(FW, FH)
    c.ell(16, 22, 11.5, 8, 'p')
    c.ell(16, 26, 8, 3.5, 'q', only='p')
    c.ell(11, 14.5, 3.3, 3.3, 'p'); c.ell(21, 14.5, 3.3, 3.3, 'p')
    c.ell(5, 27.5, 3.5, 2.5, 'p'); c.ell(27, 27.5, 3.5, 2.5, 'p')
    for (x, y) in [(7, 20), (12, 19), (24, 21), (20, 18), (9, 24)]: c.ell(x, y, 1.4, 1.2, 's', only='p')
    c.rect(10, 13, 11, 14, 'e'); c.rect(21, 13, 22, 14, 'e')
    c.line(8, 22, 24, 23, 'k', 1)
    return c

def snake():
    c = Cv(FW, FH)
    c.ell(14, 27, 11, 3.6, 'p')
    c.ell(15, 23, 8.5, 3, 'p')
    c.line(19, 22, 21, 15, 'p', 4.6); c.line(21, 15, 22, 10, 'p', 4.2)
    c.ell(24, 9, 4.6, 3.3, 'p')
    c.line(23, 13, 21, 21, 'q', 1.4)                   # brzuch szyi
    for (x, y) in [(7, 26), (12, 27), (17, 27), (11, 23), (16, 23)]: c.ell(x, y, 1.6, 1, 's', only='p')
    c.put(25, 8, 'e'); c.put(26, 8, 'e')
    c.put(29, 11, 'r'); c.put(30, 12, 'r'); c.put(31, 11, 'r'); c.put(31, 13, 'r')
    c.rect(26, 10, 28, 10, 'k')
    return c

def knight(shield=True, cape=True):
    c = Cv(FW, FH)
    if cape: c.poly([(11, 11), (21, 11), (23, 27), (9, 27)], 's')
    c.line(9, 20, 5, 3, 't', 2)                        # miecz w tylnej ręce
    c.rect(6, 19, 9, 20, 'r')                          # jelec
    c.rect(13, 22, 15, 29, 'q'); c.rect(17, 22, 19, 29, 'q')
    c.rect(12, 30, 15, 30, 'q'); c.rect(17, 30, 20, 30, 'q')
    c.poly([(12, 11), (20, 11), (21, 21), (11, 21)], 'q')
    c.ell(11, 12, 2.6, 2.2, 'q'); c.ell(21, 12, 2.6, 2.2, 'q')
    c.rect(9, 13, 11, 20, 'q')
    c.ell(16, 6.5, 4.2, 4.8, 'q')
    c.rect(15, 6, 20, 6, 'k'); c.put(17, 6, 'e'); c.put(19, 6, 'e')
    c.rect(12, 20, 20, 21, 'p')
    if shield:
        c.ell(22.5, 17, 4.2, 5.8, 'p')
        c.ell(22.5, 17, 2.6, 4, 'r', only='p')
        c.put(22, 17, 'e'); c.put(23, 17, 'e')
    else:
        c.rect(21, 13, 23, 19, 'q')
    return c

def mage(hat=False):
    c = Cv(FW, FH)
    c.line(24, 5, 24, 30, 's', 2)                      # kostur
    c.ell(24.5, 4, 2.6, 2.6, 'r'); c.put(24, 3, 'w')
    c.poly([(12, 11), (20, 11), (24, 30), (8, 30)], 'p')
    c.poly([(9, 12), (12, 12), (10, 22), (7, 21)], 'p')
    c.poly([(19, 12), (22, 13), (25, 18), (23, 20), (20, 17)], 'p')
    c.ell(24, 19, 1.7, 1.6, 't')
    c.ell(16, 7, 4.8, 5.2, 'p')
    c.ell(17.5, 8.2, 2.7, 3, 'k')
    c.put(17, 8, 'e'); c.put(19, 8, 'e')
    c.rect(11, 20, 21, 20, 'q'); c.rect(8, 29, 24, 30, 'q', ) if False else None
    for x in range(9, 24):
        if c.get(x, 29) == 'p': c.put(x, 29, 'q')
    if hat:
        c.poly([(10, 4), (22, 4), (17, 0), (12, -1)], 'q'); c.rect(9, 4, 23, 5, 'q')
    return c

def skeleton():
    c = Cv(FW, FH)
    c.line(21, 18, 27, 8, 't', 1.6)                    # zardzewiały miecz
    c.rect(20, 17, 22, 18, 'q')
    c.ell(16, 7, 4.3, 4.2, 'p')
    c.rect(14, 10, 19, 12, 'p')
    c.rect(14, 7, 15, 8, 'k'); c.rect(18, 7, 19, 8, 'k'); c.put(14, 8, 'e'); c.put(18, 8, 'e')
    c.put(15, 11, 'k'); c.put(17, 11, 'k')
    c.rect(16, 13, 16, 22, 'p')
    for y in (14, 16, 18): c.rect(12, y, 20, y, 'p')
    c.rect(13, 21, 19, 22, 'p')
    c.line(12, 14, 9, 20, 'p'); c.line(9, 20, 10, 24, 'p')
    c.line(20, 14, 21, 18, 'p')
    c.line(14, 23, 13, 29, 'p', 1.5); c.line(18, 23, 19, 29, 'p', 1.5)
    c.rect(11, 30, 14, 30, 'p'); c.rect(18, 30, 21, 30, 'p')
    c.ell(9, 18, 3.2, 4, 's')                          # tarcza
    return c

def ghost():
    c = Cv(FW, FH)
    c.ell(16, 12, 8, 8, 'p')
    c.poly([(8, 12), (24, 12), (22, 24), (26, 30), (19, 27), (16, 31), (12, 27), (7, 30), (9, 23)], 'p')
    c.poly([(22, 14), (29, 15), (30, 18), (23, 19)], 'p')
    c.ell(14, 17, 4, 7, 'q', only='p')
    c.ell(13.5, 10.5, 1.8, 2.3, 'k'); c.ell(19.5, 10.5, 1.8, 2.3, 'k')
    c.put(13, 10, 'e'); c.put(19, 10, 'e')
    c.ell(17, 16, 1.6, 2.2, 'k')
    return c

def troll(horns=False):
    c = Cv(FW, FH)
    c.line(25, 25, 29, 9, 's', 3.2)                    # maczuga
    c.ell(29, 9, 2.6, 3.4, 's')
    c.ell(14, 17.5, 8.5, 7)                            if False else None
    c.ell(14, 17.5, 8.5, 7, 'p')
    c.line(9, 15, 7, 25, 'p', 3.6); c.ell(7, 26, 2.6, 2.4, 'p')
    c.rect(9, 23, 12, 29, 'p'); c.rect(16, 23, 19, 29, 'p')
    c.rect(8, 30, 12, 30, 'p'); c.rect(16, 30, 20, 30, 'p')
    c.rect(9, 21, 20, 24, 'q')
    c.ell(22, 9.5, 4, 3.8, 'p')                        # głowa wysunięta do przodu
    c.rect(19, 7, 25, 7, 'k')                          # krzaczasta brew
    c.put(23, 8, 'e'); c.put(24, 8, 'e')
    c.put(24, 12, 'w'); c.put(21, 12, 'w'); c.rect(21, 11, 25, 11, 'k')
    c.line(19, 15, 24, 23, 'p', 3.6); c.ell(25, 24.5, 2.8, 2.6, 'p')
    if horns:
        c.line(19, 7, 15, 3, 'r', 1.6); c.line(15, 3, 15, 1, 'r'); c.line(25, 7, 28, 3, 'r', 1.6); c.line(28, 3, 28, 1, 'r')
    return c

def imp(wings=True, horns=True, sack=False):
    c = Cv(FW, FH)
    if wings: c.poly([(12, 15), (3, 6), (5, 12), (2, 14), (6, 17), (4, 21), (13, 20)], 'q')
    if sack: c.ell(9, 19, 5, 5.5, 'q')
    c.line(11, 25, 5, 28, 'p', 1.2); c.poly([(3, 26), (6, 27), (4, 30)], 'p')   # ogon
    c.ell(16, 22, 5, 5, 'p')
    c.rect(13, 26, 14, 30, 'p'); c.rect(18, 26, 19, 30, 'p')
    c.line(20, 20, 24, 23, 'p', 1.6)
    c.ell(17, 13, 5.8, 5.2, 'p')
    c.poly([(11, 11), (7, 9), (12, 14)], 'p'); c.poly([(22, 11), (26, 8), (22, 14)], 'p')   # uszy
    if horns: c.line(14, 9, 13, 4, 'r', 1.4); c.line(20, 9, 22, 4, 'r', 1.4)
    c.rect(16, 12, 17, 13, 'e'); c.rect(20, 12, 21, 13, 'e')
    c.rect(16, 16, 21, 16, 'w'); c.put(17, 17, 'k'); c.put(19, 17, 'k')
    return c

def bird(beast=False):
    c = Cv(FW, FH)
    c.poly([(9, 18), (1, 16), (2, 21), (8, 23)], 's')            # ogon
    c.ell(14, 19, 7.5, 5.2, 'p')
    c.ell(15, 21, 5, 2.4, 'q', only='p')
    c.line(19, 16, 21, 12, 'p', 3.4)
    c.ell(22, 10.5, 3.6, 3.4, 'p')
    c.poly([(24.5, 9), (29, 10.5), (27, 13.5), (24.5, 12.5)], 't')    # dziób
    c.put(23, 9, 'e'); c.put(24, 9, 'e')
    c.poly([(11, 16), (3, 2), (8, 3), (14, 8), (19, 15)], 's')       # skrzydło
    for i in range(3): c.line(6 + i * 3, 4 + i, 12 + i * 2, 14, 'k')
    c.line(12, 23, 11, 29, 't', 1.2); c.line(17, 23, 18, 29, 't', 1.2)
    c.rect(9, 30, 12, 30, 't'); c.rect(17, 30, 20, 30, 't')
    if beast:
        c.rect(9, 23, 11, 29, 'r'); c.rect(16, 23, 18, 29, 'r')
    return c

def dragon():
    c = Cv(FW, FH)
    c.poly([(13, 14), (4, 0), (0, 5), (2, 9), (0, 13), (8, 18)], 'q')   # skrzydło (błona)
    c.line(13, 14, 4, 0, 's', 1.4); c.line(11, 15, 0, 5, 's'); c.line(10, 16, 0, 13, 's')
    c.line(7, 23, 2, 26, 'p', 3.4); c.line(2, 26, 1, 30, 'p', 2.2); c.poly([(0, 29), (3, 29), (1, 31.5)], 's')   # ogon
    c.ell(14, 21.5, 9, 6.2, 'p')
    c.ell(16, 25, 6.5, 2.4, 'r', only='p')            # brzuch
    c.line(19, 18, 23, 9, 'p', 4.6)
    c.ell(25, 7.5, 4.4, 3.4, 'p')
    c.poly([(27, 6), (31.5, 7.5), (31.5, 10.5), (27, 10.5)], 'p')
    c.line(23, 5, 19, 1, 's', 1.6); c.line(25, 4.5, 23, 0, 's', 1.2)
    c.put(26, 6, 'e'); c.put(27, 6, 'e')
    c.rect(28, 9, 31, 9, 'k'); c.put(29, 10, 'w'); c.put(31, 10, 'w')
    c.rect(9, 26, 13, 29, 'p'); c.rect(18, 26, 22, 29, 'p')
    c.rect(8, 30, 13, 30, 't'); c.rect(18, 30, 23, 30, 't')
    for x in range(8, 20, 3): c.put(x, 16, 's'); c.put(x + 1, 15, 's')   # grzebień na grzbiecie
    return c

def golem():
    return bosses.golem()

# ---------- towarzysze (chowańce i wierzchowce) ----------

def horse(horn=False):
    c = Cv(FW, FH)
    c.line(6, 13, 3, 23, 's', 2.6); c.line(3, 23, 2, 26, 's', 1.6)      # ogon
    c.ell(14, 17, 9.2, 5.2, 'p')                                       # tułów
    c.ell(14, 20.5, 6.5, 1.6, 'q', only='p')                           # brzuch
    c.rect(7, 20, 8, 28, 'p'); c.rect(10, 21, 11, 27, 'p')             # tylne nogi
    c.rect(18, 20, 19, 28, 'p'); c.rect(21, 21, 22, 27, 'p')           # przednie
    c.rect(6, 29, 9, 30, 't'); c.rect(9, 28, 12, 28, 't'); c.rect(17, 29, 20, 30, 't'); c.rect(20, 28, 23, 28, 't')  # kopyta
    c.poly([(18, 16), (21, 7), (25.5, 7), (24, 16)], 'p')              # szyja
    c.poly([(22, 5), (29, 8), (30.5, 11.5), (27, 12.5), (22.5, 9.5)], 'p')  # głowa
    c.poly([(22.5, 2.5), (24.5, 5.5), (22, 6)], 'p')                   # ucho
    c.line(21.5, 5, 18.5, 15, 's', 2.2)                                # grzywa
    c.ell(13, 13.6, 5, 1.6, 'r', only='p')                             # siodło / derka
    c.put(25, 8, 'e'); c.put(29, 10.5, 'k')
    if horn: c.line(25.5, 5, 30.5, 0, 'r', 1.4)
    return c

def turtle():
    c = Cv(FW, FH)
    c.ell(24.5, 20, 3.6, 3, 's')                                       # głowa
    c.rect(6, 22, 8, 27, 's'); c.rect(18, 22, 20, 27, 's')             # łapy
    c.line(3, 23, 6, 22, 's', 1.6)                                     # ogonek
    c.ell(13.5, 20, 10.5, 8, 'p')                                      # skorupa
    c.rect(0, 22, 31, 31, '.')
    c.rect(4, 22, 23, 23, 'q')                                         # brzeg skorupy
    for (x, y) in [(9, 16), (14, 14), (19, 16), (11, 20), (17, 20)]: c.ell(x, y, 2.2, 1.8, 'r', only='p')  # tarczki
    c.rect(6, 24, 8, 27, 's'); c.rect(18, 24, 20, 27, 's')
    c.put(26, 19, 'e'); c.rect(26, 21, 27, 21, 'k')
    return c

def bear():
    c = Cv(FW, FH)
    c.ell(13, 18, 10, 7.5, 'p')                                        # tułów
    c.ell(13, 22.5, 7, 2.2, 'q', only='p')
    c.rect(5, 21, 9, 29, 'p'); c.rect(16, 21, 20, 29, 'p')             # łapy
    c.rect(4, 30, 9, 30, 's'); c.rect(15, 30, 20, 30, 's')
    c.ell(24, 13.5, 5.6, 5, 'p')                                       # głowa
    c.ell(28.5, 15.5, 2.8, 2.2, 'q')                                   # pysk
    c.ell(20.5, 8.8, 1.9, 1.9, 'p'); c.ell(25.5, 8.6, 1.9, 1.9, 'p')   # uszy
    c.ell(11, 12.5, 6.5, 2.6, 'r', only='p')                           # pancerz na grzbiecie
    c.put(24, 12, 'e'); c.put(30.5, 15, 'k')
    return c

def lizard():
    c = Cv(FW, FH)
    c.line(2, 25, 9, 20.5, 'p', 2.6); c.line(0, 27, 3, 25, 'p', 1.4)    # ogon
    c.ell(15, 20, 8, 4, 'p')                                           # tułów
    c.ell(15, 22.6, 6, 1.4, 'q', only='p')
    c.rect(9, 22, 10, 27, 'p'); c.rect(19, 22, 20, 27, 'p')
    c.rect(7, 27, 11, 27, 'p'); c.rect(18, 27, 22, 27, 'p')
    c.ell(25, 18, 5.4, 3.2, 'p')                                       # głowa
    c.poly([(13, 16), (15, 13), (17, 16), (19, 13.5), (21, 16)], 'r')  # grzebień
    for (x, y) in [(11, 18), (15, 18.5), (18, 19)]: c.put(x, y, 'r')
    c.put(27, 17, 'e'); c.rect(26, 20, 30, 20, 'k')
    return c

def owl():
    c = Cv(FW, FH)
    c.ell(16, 20, 8, 8.5, 'p')                                         # ciało
    c.ell(16, 22.5, 5, 5, 'q', only='p')                               # pierś
    c.ell(9, 20, 3, 7, 's', only='p'); c.ell(23, 20, 3, 7, 's', only='p')  # skrzydła
    c.ell(16, 11, 7, 6, 'p')                                           # głowa
    c.poly([(9, 7), (10, 2), (13, 6)], 'p'); c.poly([(19, 6), (22, 2), (23, 7)], 'p')  # pióra-uszy
    c.ell(13, 11, 2.6, 2.6, 'w'); c.ell(19, 11, 2.6, 2.6, 'w')         # oczy
    c.rect(13, 10, 13, 11, 'e'); c.rect(19, 10, 19, 11, 'e')
    c.poly([(15, 13), (17, 13), (16, 16)], 't')                        # dziób
    c.rect(12, 28, 14, 29, 't'); c.rect(18, 28, 20, 29, 't')           # szpony
    return c


def finish_foe(c, flip=True):
    rows = c.rows()
    if flip: rows = [r[::-1] for r in rows]
    return s2.outline(s2.shade(rows))

FOE_TEMPLATES = {
    'wilk': lambda: finish_foe(wolf()), 'dzik': lambda: finish_foe(boar()), 'pajak': lambda: finish_foe(spider()),
    'ropucha': lambda: finish_foe(toad()), 'waz': lambda: finish_foe(snake()), 'rycerz': lambda: finish_foe(knight()),
    'bandyta': lambda: finish_foe(knight(shield=False, cape=False)), 'mag': lambda: finish_foe(mage()),
    'wiedzma': lambda: finish_foe(mage(hat=True)), 'szkielet': lambda: finish_foe(skeleton()), 'upior': lambda: finish_foe(ghost()),
    'golem': golem, 'troll': lambda: finish_foe(troll()), 'minotaur': lambda: finish_foe(troll(horns=True)),
    'chochlik': lambda: finish_foe(imp()), 'goblin': lambda: finish_foe(imp(wings=False, horns=False, sack=True)),
    'ptak': lambda: finish_foe(bird()), 'gryf': lambda: finish_foe(bird(beast=True)), 'smok': lambda: finish_foe(dragon()),
    'kon': lambda: finish_foe(horse()), 'rog': lambda: finish_foe(horse(horn=True)), 'zolw': lambda: finish_foe(turtle()),
    'mis': lambda: finish_foe(bear()), 'jaszczur': lambda: finish_foe(lizard()), 'sowa': lambda: finish_foe(owl()),
}

# Palety: region → 4 kolory (jasny → najciemniejszy); e oczy, w biel.
def R(*cols): return list(cols)
GREY = R('#b8b2a8', '#8a847a', '#5e5952', '#3c3934')
BROWN = R('#b5835a', '#8a5d3b', '#5f3d26', '#3d2617')
DARK = R('#6a5f58', '#4a413c', '#302a27', '#1e1a18')
CREAM = R('#e9dcc0', '#c8b590', '#9a8762', '#6a5a3e')
STEEL = R('#c9d0d8', '#939ca8', '#636b77', '#3e444d')
BONE = R('#efe6cf', '#cbbf9f', '#968a6c', '#635a45')
RUST = R('#c27a4a', '#8f5230', '#5e331d', '#3a1f12')
GOLD = R('#ffe08a', '#d9a83a', '#a0731c', '#6a4810')
WOOD = R('#a87a4f', '#7a5232', '#53351f', '#352113')
RED = R('#e8705c', '#b8463a', '#842a25', '#561916')
GREEN = R('#8fc46a', '#5f9a45', '#3d6c2d', '#26451c')
BOG = R('#9fae62', '#6f7f3e', '#4b5728', '#2f3818')
PURPLE = R('#a98ad0', '#7a5ca8', '#523c7a', '#33264f')
ICE = R('#e6f6ff', '#b0d8ee', '#78a8c8', '#4a7496')
SAND = R('#e8cf98', '#c2a468', '#8e7444', '#5e4c2b')
BLACK = R('#5a5664', '#3c3946', '#27252f', '#17161d')
FIRE = R('#ffb066', '#e0702a', '#a8441a', '#6a2610')
TEAL = R('#7fd6c8', '#45a698', '#2b7468', '#1a4a43')
STAR = R('#c9b8ff', '#8d72e0', '#5a44a8', '#352870')
SKIN = R('#c79a7a', '#9c6e52', '#6e4a36', '#463024')

def P(p, q, r, s, t=None, e='#ffd23a', w='#f6f1e6'):
    pal = {'k': '#120d16', 'e': e, 'w': w}
    for reg, cols in zip('pqrst', [p, q, r, s, t or s]): pal.update(s2.ramp(reg, cols))
    return pal

FOES = {
    # klucz: (szablon, paleta)
    'Wygłodniały wilk': ('wilk', P(GREY, CREAM, RED, DARK)),
    'Wściekły pies': ('wilk', P(BROWN, CREAM, RED, DARK, e='#ff5a3a')),
    'Dziki odyniec': ('dzik', P(BROWN, SKIN, RED, DARK)),
    'Herszt Bandytów': ('bandyta', P(WOOD, BROWN, RED, RED, STEEL, e='#ffd23a')),
    'Leśny wilk': ('wilk', P(R('#8a8a72', '#646650', '#454735', '#2c2e22'), CREAM, RED, DARK, e='#c8ff5a')),
    'Olbrzymi pająk': ('pajak', P(DARK, BLACK, RED, DARK, e='#ff4040')),
    'Dzik': ('dzik', P(DARK, SKIN, RED, BLACK)),
    'Wilkołak Alfa': ('wilk', P(BLACK, GREY, RED, DARK, e='#ff3030')),
    'Bagienna ropucha': ('ropucha', P(BOG, CREAM, RED, GREEN, e='#ffd23a')),
    'Olbrzymia pijawka': ('waz', P(R('#6a4a5a', '#4c3442', '#33222c', '#20151c'), RED, RED, BLACK, e='#ff7070')),
    'Błotny wąż': ('waz', P(BOG, SAND, RED, BROWN)),
    'Wiedźma z Mokradeł': ('wiedzma', P(GREEN, BLACK, R('#c8ff8a', '#8ae04a', '#4ca82a', '#2a6a1a'), WOOD, SKIN, e='#c8ff5a')),
    'Szkielet strażnik': ('szkielet', P(BONE, RUST, RED, WOOD, STEEL, e='#7ad8ff')),
    'Upiorny łucznik': ('szkielet', P(R('#cfe6df', '#9ebfb5', '#6e8f86', '#46605a'), RUST, RED, DARK, STEEL, e='#8affd0')),
    'Zjawa': ('upior', P(R('#dff3f0', '#a9d6cf', '#76aaa2', '#4c7a73'), R('#bfe6df', '#8cc4ba', '#5e968c', '#3c665e'), RED, DARK, e='#8affd0')),
    'Upadły Rycerz': ('rycerz', P(DARK, STEEL, RED, R('#5a2a3a', '#3e1c28', '#2a121a', '#1a0b10'), STEEL, e='#ff4040')),
    'Kret olbrzymi': ('dzik', P(R('#7a6a64', '#5a4c48', '#3c3230', '#26201e'), R('#f0b0b0', '#c88686', '#9a6262', '#6a4040'), RED, BLACK, e='#ffd23a')),
    'Kamienny chrząszcz': ('pajak', P(GREY, DARK, TEAL, DARK, e='#6cf0a0')),
    'Jaskiniowy troll': ('troll', P(R('#8aa080', '#64785c', '#45543f', '#2c3628'), BROWN, RED, WOOD, e='#ffcf4a')),
    'Kamienny Golem': ('golem', bosses.boss_palette('kamien')),
    'Śnieżny wilk': ('wilk', P(ICE, R('#ffffff', '#e6f2fa', '#c0d4e2', '#8aa2b4'), RED, ICE, e='#5ac8ff')),
    'Yeti': ('troll', P(ICE, R('#8aa8c8', '#6a88a8', '#4a6888', '#2c4868'), RED, WOOD, e='#5ac8ff')),
    'Lodowy żywiołak': ('upior', P(ICE, R('#c6f6ff', '#8ad8f0', '#5aa8cc', '#3a7498'), RED, ICE, e='#ffffff')),
    'Lodowy Olbrzym': ('golem', bosses.boss_palette('lod')),
    'Harpia': ('ptak', P(R('#c08a6a', '#94664a', '#6a4632', '#432b1e'), CREAM, RED, R('#8a6a8a', '#664c66', '#463446', '#2c202c'), GOLD, e='#ff5a8a')),
    'Burzowy sokół': ('ptak', P(R('#a8b4c8', '#7884a0', '#525c78', '#323a50'), CREAM, RED, STEEL, GOLD, e='#fff07a')),
    'Górski troll': ('troll', P(GREY, BROWN, RED, WOOD, e='#ffcf4a')),
    'Gromowy Gryf': ('gryf', P(GOLD, CREAM, BROWN, R('#7a8ab0', '#56648a', '#3a4664', '#232c42'), GOLD, e='#9ff0ff')),
    'Jaskiniowy pająk': ('pajak', P(BROWN, DARK, R('#ffd27a', '#e0a040', '#a87020', '#6a4610'), DARK, e='#ffd27a')),
    'Ślepy pełzacz': ('waz', P(R('#e6d0d0', '#c0a2a2', '#907474', '#604c4c'), CREAM, RED, DARK, e='#e6d0d0')),
    'Grzybołak': ('ropucha', P(R('#d0a0c8', '#a87aa2', '#7a5478', '#50364e'), CREAM, RED, R('#f0f0f0', '#d0d0d0', '#a0a0a0', '#707070'), e='#ffe08a')),
    'Pajęcza Królowa': ('pajak', P(PURPLE, BLACK, R('#ff9ad8', '#e05aa8', '#a83a7a', '#6a2250'), DARK, e='#ff5ad8')),
    'Ghul': ('troll', P(R('#a8b89a', '#7c8c6e', '#56644a', '#38422f'), DARK, RED, BONE, e='#c8ff5a')),
    'Szkielet': ('szkielet', P(BONE, RUST, RED, WOOD, STEEL, e='#ff6a3a')),
    'Upiór': ('upior', P(R('#cfc8e6', '#a39ac0', '#776e96', '#4e486a'), R('#b6aed6', '#8a82ae', '#625a86', '#403a5e'), RED, DARK, e='#c8ff8a')),
    'Upiorny Hrabia': ('mag', P(BLACK, RED, R('#ff7a7a', '#e03a3a', '#a01e1e', '#600e0e'), DARK, R('#e8e0f0', '#c0b6cc', '#8e84a0', '#5e5670'), e='#ff3a3a')),
    'Mumia': ('szkielet', P(SAND, BROWN, RED, WOOD, BROWN, e='#6cf0ff')),
    'Pustynny skorpion': ('pajak', P(SAND, BROWN, RED, DARK, e='#ff5a3a')),
    'Piaskowy upiór': ('upior', P(SAND, R('#d8bc84', '#b0965e', '#80683c', '#544422'), RED, BROWN, e='#ffe08a')),
    'Kościany Skorpion': ('pajak', P(BONE, R('#9a8a70', '#76684e', '#544834', '#382f22'), RED, BROWN, e='#ff3a3a')),
    'Rycerz śmierci': ('rycerz', P(BLACK, BLACK, R('#8affb0', '#4ae080', '#2aa05a', '#186a3a'), R('#3a5a4a', '#284234', '#1a2c22', '#101c16'), STEEL, e='#8affb0')),
    'Nekromanta': ('mag', P(PURPLE, BLACK, R('#c8ff8a', '#8ae04a', '#4ca82a', '#2a6a1a'), WOOD, BONE, e='#c8ff8a')),
    'Kościany golem': ('golem', bosses.boss_palette('upior')),
    'Król Lisz': ('mag', P(R('#5a4a7a', '#3e3258', '#2a213c', '#1a1426'), GOLD, R('#9ff0ff', '#5ad0ff', '#2a90d0', '#185a8a'), BONE, BONE, e='#5ad0ff')),
    'Opętany mnich': ('mag', P(BROWN, R('#c8a070', '#a07a4c', '#76562f', '#4c361b'), RED, WOOD, SKIN, e='#ff5a3a')),
    'Chochlik': ('chochlik', P(RED, DARK, BLACK, DARK, e='#ffe08a')),
    'Spaczony kapłan': ('mag', P(RED, GOLD, R('#ff9ad8', '#e05aa8', '#a83a7a', '#6a2250'), WOOD, SKIN, e='#ff5ad8')),
    'Upadły Opat': ('mag', P(R('#6a2a4a', '#4c1c34', '#331222', '#200a14'), GOLD, FIRE, WOOD, SKIN, e='#ffae3a')),
    'Ognisty chochlik': ('chochlik', P(FIRE, R('#6a2a1a', '#4c1c10', '#33120a', '#200a06'), BLACK, DARK, e='#fff07a')),
    'Magmowy golem': ('golem', bosses.boss_palette('ogien')),
    'Piekielny ogar': ('wilk', P(R('#7a3a2a', '#58261c', '#3c1812', '#260e0a'), FIRE, FIRE, BLACK, e='#ffe03a')),
    'Ognisty Tytan': ('golem', bosses.boss_palette('ogien')),
    'Wywerna': ('smok', P(GREEN, R('#c8d890', '#9cb064', '#728440', '#4a5826'), CREAM, DARK, BONE, e='#ffd23a')),
    'Smoczy kultysta': ('mag', P(RED, BLACK, FIRE, WOOD, SKIN, e='#ffae3a')),
    'Młody smok': ('smok', P(RED, R('#e8a070', '#c07848', '#8e522e', '#5e341c'), CREAM, DARK, BONE, e='#ffe03a')),
    'Czerwony Smok': ('smok', P(R('#e05a4a', '#b0362e', '#7c1e1a', '#4e100e'), R('#ffb070', '#e07a3a', '#a84c1e', '#6a2a10'), GOLD, BLACK, BONE, e='#fff07a')),
    # Smocze Leże (rajd klanowy): druga faza
    'Lodowy Smok': ('smok', P(ICE, R('#ffffff', '#d8f0ff', '#9cc8e6', '#6a94b8'), R('#c6f6ff', '#8ad8f0', '#5aa8cc', '#3a7498'), R('#4a6a8a', '#34506c', '#22384e', '#142434'), BONE, e='#5ac8ff')),
    'Morski wąż': ('waz', P(TEAL, R('#c8f0d8', '#98d0b0', '#68a080', '#407058'), RED, R('#3a6a8a', '#28506a', '#1a364a', '#10222e'), e='#ffe08a')),
    'Burzowa wywerna': ('smok', P(R('#7a8ab8', '#56648e', '#3a4666', '#232c42'), R('#c8d8f0', '#9cb0d0', '#7084a8', '#465a7c'), CREAM, BLACK, BONE, e='#9ff0ff')),
    'Smok błyskawic': ('smok', P(R('#5a7ad8', '#3a56b0', '#26388a', '#16225a'), R('#fff6a8', '#ffd84a', '#d8a020', '#8e6610'), CREAM, BLACK, BONE, e='#fff6a8')),
    'Burzowy Lewiatan': ('waz', P(R('#4a7aa8', '#34587e', '#223c58', '#142438'), R('#9ff0ff', '#5ad0f0', '#2a98c0', '#18607e'), RED, BLACK, e='#9ff0ff')),
    'Gwiezdny pomiot': ('chochlik', P(STAR, BLACK, GOLD, DARK, e='#fffbe8')),
    'Pustkowiec': ('upior', P(R('#4a4466', '#332e4a', '#221e32', '#14121e'), STAR, RED, BLACK, e='#c9b8ff')),
    'Strażnik krateru': ('rycerz', P(STAR, R('#e8e0ff', '#b8a8e8', '#8a74c8', '#5c4a96'), GOLD, R('#3a2c6a', '#281e4a', '#1a1332', '#100b20'), GOLD, e='#fffbe8')),
    'Gwiezdny Pożeracz': ('smok', P(R('#3a3060', '#2a2246', '#1c1630', '#100c1e'), STAR, GOLD, R('#c9b8ff', '#8d72e0', '#5a44a8', '#352870'), BONE, e='#fffbe8')),
    # lochy
    'Kopalniany golem': ('golem', bosses.boss_palette('golem')),
    'Kamienny pełzacz': ('waz', P(GREY, DARK, RED, DARK, e='#6cf0a0')),
    'Goblin z workiem': ('goblin', P(GREEN, R('#c8a46a', '#a07e48', '#76582c', '#4c3818'), RED, DARK, e='#ffe03a')),
    'Kryształowy golem': ('golem', bosses.boss_palette('lod')),
    'Minotaur': ('minotaur', P(BROWN, RED, BONE, WOOD, e='#ff3a3a')),
    'Elitarny strażnik': ('rycerz', P(GOLD, STEEL, RED, RED, STEEL, e='#ffd23a')),
    'Strażnik Labiryntu': ('rycerz', P(BROWN, STEEL, RED, WOOD, STEEL, e='#ffd23a')),
    # wrogowie z nazwą zmienną (gra dobiera ich po początku nazwy)
    'Strażnik piętra': ('rycerz', P(PURPLE, STAR, GOLD, R('#3a2c6a', '#281e4a', '#1a1332', '#100b20'), GOLD, e='#ffd23a')),
    'Strażnik ołtarza': ('upior', P(FIRE, R('#ffd08a', '#f0a050', '#c07030', '#804418'), RED, BLACK, e='#fff6c0')),
    'Duch': ('upior', P(R('#dfe8ff', '#aab8e6', '#7a88b8', '#4e5a86'), R('#c0ccf6', '#8e9cd0', '#6270a6', '#3e4878'), RED, DARK, e='#9fe8ff')),
    'Strażnik Krypty': ('rycerz', P(BLACK, BONE, R('#8affb0', '#4ae080', '#2aa05a', '#186a3a'), R('#2a3a32', '#1c2a22', '#121c16', '#0a120e'), BONE, e='#8affb0')),
}
# Towarzysze (portrety w Bohaterze): klucz = id chowańca albo wierzchowca.
COMPANIONS = {
    # chowańce
    'wilczek': ('wilk', P(R('#d8d2c6', '#aaa396', '#7a7468', '#4e4a42'), CREAM, RED, GREY, e='#5ab0ff')),
    'kruk': ('ptak', P(BLACK, R('#6a6878', '#4c4a58', '#33323e', '#1e1d26'), RED, R('#3c3a48', '#2a2834', '#1c1a24', '#100f16'), R('#5a5664', '#3c3946', '#27252f', '#17161d'), e='#ff5a5a')),
    'zolw': ('zolw', P(R('#8fae6a', '#6a8a4a', '#4a6a32', '#2e461e'), SAND, R('#c8d88a', '#a0b864', '#748c40', '#4a5c26'), R('#a8b48a', '#7e8a64', '#566042', '#353c28'), e='#ffd23a')),
    'salamandra': ('jaszczur', P(FIRE, R('#ffe08a', '#f0b040', '#c08020', '#7a5010'), R('#5a2a1a', '#401c10', '#2a120a', '#180a06'), DARK, e='#fff07a')),
    'sowa': ('sowa', P(R('#f4f6fa', '#d0d8e2', '#a2aebe', '#6e7a8c'), R('#ffffff', '#eef2f6', '#ccd6e0', '#9aa8b8'), RED, R('#c0ccda', '#94a2b4', '#6a788c', '#465264'), GOLD, e='#ffcf3a')),
    'gryfiatko': ('gryf', P(R('#fff6e0', '#f0dcb0', '#c8b07a', '#8a764a'), CREAM, R('#d8b080', '#b08a5a', '#80623a', '#544024'), ICE, GOLD, e='#2a6aff')),
    'wilkor': ('wilk', P(R('#5a4a7a', '#3e3258', '#2a213c', '#1a1426'), R('#8a7ab0', '#6a5a90', '#4c3e6e', '#30264a'), PURPLE, BLACK, e='#c88aff')),
    'feniks': ('ptak', P(FIRE, R('#fff2a8', '#ffd060', '#e09a2a', '#a0641a'), RED, R('#ff5a2a', '#d83a1a', '#a0240e', '#661406'), GOLD, e='#fff6c0')),
    'smoczek': ('smok', P(TEAL, R('#c8f0e0', '#9ad0bc', '#6aa890', '#407a66'), CREAM, R('#2a5a6a', '#1c4250', '#122c36', '#0a1a20'), BONE, e='#ffe03a')),
    # wierzchowce
    'kon': ('kon', P(BROWN, CREAM, R('#c8463a', '#a0302a', '#741e1c', '#4a1212'), R('#3a2618', '#2a1a10', '#1c110a', '#100a06'), STEEL, e='#1a1010')),
    'dzik': ('dzik', P(DARK, SKIN, BONE, STEEL, e='#ff5a3a')),
    'wilk': ('wilk', P(SAND, CREAM, RED, BROWN, e='#ffd23a')),
    'niedzwiedz': ('mis', P(BROWN, R('#c8a07a', '#a07a54', '#765634', '#4c361e'), STEEL, DARK, e='#ffcf4a')),
    'jaszczur': ('jaszczur', P(SAND, CREAM, R('#e07a3a', '#b8582a', '#843a1a', '#56240e'), BROWN, e='#ffe03a')),
    'jednorozec': ('rog', P(R('#ffffff', '#e6eaf2', '#bcc4d4', '#8a94a8'), R('#ffffff', '#f2f4f8', '#d4dae4', '#a8b2c2'), GOLD, R('#e0b0ff', '#b880f0', '#8a54c8', '#5c3490'), GOLD, e='#5a3a8a')),
    'gryf': ('gryf', P(GOLD, CREAM, BROWN, R('#7a8ab0', '#56648a', '#3a4664', '#232c42'), GOLD, e='#9ff0ff')),
    'smok': ('smok', P(R('#4a3a66', '#33284a', '#221a32', '#140f1e'), R('#9a7ac8', '#7458a6', '#503a7c', '#322450'), R('#c8a0ff', '#a070f0', '#7044c0', '#46288a'), BLACK, BONE, e='#c8a0ff')),
}

# Wróg spoza listy: szablon i paleta według rodzaju (Bestie, Nieumarli, Demony, Smoki).
FOE_BY_TYPE = {'Bestie': 'Wygłodniały wilk', 'Nieumarli': 'Szkielet', 'Demony': 'Chochlik', 'Smoki': 'Wywerna'}

if __name__ == '__main__':
    from prev import sheet, pal as ipal
    out = '/tmp/claude-0/-home-claude/e4d4e36c-cfb8-561b-a464-0863ca6c20a5/scratchpad/'
    T = {k: f() for k, f in FOE_TEMPLATES.items()}
    names = list(FOES)
    grid = [[(T[FOES[n][0]], FOES[n][1]) for n in names[i:i + 10]] for i in range(0, len(names), 10)]
    sheet(grid, scale=4, path=out + 'foes.png', pad=8)
    # bohater: kilka zestawów
    L = hero_layers()
    def compose(parts):
        g = [list(r) for r in L['base']]; pals = [dict(BASE_PAL)]
        img = [[None] * HW for _ in range(HH)]
        def over(rows, p):
            for y, r in enumerate(rows):
                for x, ch in enumerate(r):
                    if ch != '.' and ch in p: img[y][x] = p[ch]
        over(L['base'], BASE_PAL)
        for key, ore in parts: over(L[key], ipal(ore))
        return img
    from PIL import Image
    sets = [[], [('zbroja:Napierśnik:0', 1), ('helm:Hełm:0', 1), ('buty:Buty:0', 0), ('pas:Pas:0', 0), ('rekawice:Rękawice:0', 0), ('rekawiceF:Rękawice:0', 0)],
            [('zbroja:Kolczuga:1', 2), ('helm:Kaptur:1', 3), ('buty:Nagolenniki:1', 2), ('pas:Sakwa:1', 3), ('amulet:1', 3)],
            [('zbroja:Szata:2', 6), ('helm:Diadem:2', 6), ('rekawice:Karwasze:2', 5), ('rekawiceF:Karwasze:2', 5), ('pas:Rzemień:2', 5)],
            [('zbroja:Napierśnik:2', 5), ('helm:Hełm:2', 5), ('buty:Trzewiki:2', 5), ('pas:Pas:2', 5), ('rekawice:Szpony:2', 4), ('rekawiceF:Szpony:2', 4), ('amulet:2', 6)]]
    S = 6
    out_im = Image.new('RGB', (len(sets) * (HW * S + 16), HH * S + 16), (38, 34, 42))
    for i, parts in enumerate(sets):
        img = compose(parts)
        for y in range(HH):
            for x in range(HW):
                c = img[y][x]
                if not c:
                    # obrys
                    if any(0 <= x + dx < HW and 0 <= y + dy < HH and img[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = '#17121c'
                    else: continue
                rgb = tuple(int(c[j:j + 2], 16) for j in (1, 3, 5))
                for dy in range(S):
                    for dx in range(S): out_im.putpixel((8 + i * (HW * S + 16) + x * S + dx, 8 + y * S + dy), rgb)
    out_im.save(out + 'heroes.png')
    print('ok')

def crop(rows):
    """Przycięcie do zajętego prostokąta: (x, y, wiersze)."""
    ys = [y for y, r in enumerate(rows) if r.strip('.')]
    if not ys: return (0, 0, [])
    xs = [x for r in rows for x, ch in enumerate(r) if ch != '.']
    x0, x1 = min(xs), max(xs)
    return (x0, ys[0], [r[x0:x1 + 1] for r in rows[ys[0]:ys[-1] + 1]])

def export_ts(out):
    import json
    arr = lambda rows: '[' + ', '.join(f"'{r}'" for r in rows) + ']'
    L = hero_layers()
    lines = ["// Wygenerowane przez tools/art/export.py (actors.py) — postaci na polu walki.",
             "// Bohater 36×36 z warstw: ciało (HERO_BASE_PAL) i ekwipunek (paleta rudy przedmiotu, znaki jak w ikonach).",
             "// Warstwa: [x, y, wiersze] — przycięta do zajętego prostokąta.",
             f"export const HERO_W = {HW};", f"export const HERO_H = {HH};",
             f"export const HERO_BASE_PAL: Record<string, string> = {json.dumps(BASE_PAL)};",
             "export const HERO_LAYERS: Record<string, [number, number, string[]]> = {"]
    for k, rows in L.items():
        x, y, r = crop(rows)
        lines.append(f"  '{k}': [{x}, {y}, {arr(r)}],")
    lines.append('};')
    T = {k: f() for k, f in FOE_TEMPLATES.items()}
    lines.append("\n/** Szablony wrogów 32×32 (patrzą w lewo, na bohatera). Znaki: tony regionów A–T, k obrys, e oczy, w biel. */")
    lines.append("export const FOE_TEMPLATES: Record<string, string[]> = {")
    for k, rows in T.items(): lines.append(f"  '{k}': {arr(rows)},")
    lines.append('};')
    lines.append("\n/** Wróg → [szablon, paleta]. */")
    lines.append("export const FOE_LOOK: Record<string, [string, Record<string, string>]> = {")
    for n, (tk, pal) in FOES.items():
        used = set(''.join(T[tk])) - {'.'}
        lines.append(f"  {json.dumps(n, ensure_ascii=False)}: ['{tk}', {json.dumps({k: v for k, v in pal.items() if k in used})}],")
    lines.append('};')
    lines.append(f"export const FOE_BY_TYPE: Record<string, string> = {json.dumps(FOE_BY_TYPE, ensure_ascii=False)};")
    lines.append("\n/** Towarzysze (chowańce i wierzchowce) → [szablon, paleta]; portret patrzy w lewo jak wrogowie. */")
    lines.append("export const COMPANION_LOOK: Record<string, [string, Record<string, string>]> = {")
    for n, (tk, pal) in COMPANIONS.items():
        used = set(''.join(T[tk])) - {'.'}
        lines.append(f"  '{n}': ['{tk}', {json.dumps({k: v for k, v in pal.items() if k in used})}],")
    lines.append('};')
    open(f'{out}/actors-data.ts', 'w').write('\n'.join(lines) + '\n')
    print('actors:', len(L), 'warstw,', len(T), 'szablonów,', len(FOES), 'wrogów,', len(COMPANIONS), 'towarzyszy')
