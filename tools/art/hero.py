# Bohater 48×48 z warstw (bryły z vol.py), patrzy w prawo. Gra składa go z ciała (kolory stroju) i ekwipunku
# (kolory rudy przedmiotu), a na końcu obrysowuje całą sylwetkę.
#  ciało:     p skóra, q włosy, r tunika, s spodnie, t buty
#  ekwipunek: p metal rudy, q złoto, r skóra, s drewno, t sukno, u klejnot rudy
import sys, math; sys.path.insert(0, '.')
from vol import V

W = H = 48
HAND = (35, 24.5)           # dłoń z bronią
FARK = dict(add=-.2)
def cv(): return V(W, H)

def base():
    c = cv()
    c.limb(15, 22, 12.5, 29, 2.8, 2.4, 'r', **FARK); c.ball(11.5, 31.5, 2.3, 2.3, 'p', add=-.15)   # dalsze ramię
    c.limb(18, 34, 17, 41, 3.3, 2.9, 's', **FARK); c.limb(25, 34, 26, 41, 3.5, 3.1, 's')         # nogi
    c.poly([(13.5, 40.5), (20.5, 40.5), (21.5, 45.6), (13.5, 45.6)], 't', bevel=.8, add=-.2)
    c.poly([(22.5, 40.5), (29.5, 40.5), (31.5, 45.6), (22.5, 45.6)], 't', bevel=.8)
    c.poly([(14, 20), (28, 20), (27, 35), (15, 35)], 'r', bevel=2.4)                             # tułów
    c.ball(21, 26, 6.4, 5.4, 'r', add=.06)
    c.line(21, 21, 21, 26, 's', d=-1, only='r')                                                  # rozcięcie tuniki
    c.rect(15, 31.6, 27, 33.6, 't', bevel=.5)                                                    # zwykły pasek
    c.rect(19.5, 17.5, 24.5, 21, 'p', add=-.15)                                                  # szyja
    c.ball(22, 12, 7.6, 7.4, 'p', k=.6, add=.07)                                                 # głowa
    c.ball(17.4, 13.4, 1.6, 2, 'p', add=-.1)                                                     # ucho
    c.ball(21, 7.2, 8, 4.2, 'q'); c.limb(15.4, 9, 14.8, 16, 2.6, 1.8, 'q')                       # włosy
    c.tri((24, 8.6), (29.6, 8.4), (28.4, 11.4), 'q'); c.tri((17.6, 9), (23, 9), (19, 12.6), 'q')
    c.dots([(25, 13), (25, 14), (28, 13), (28, 14)], 'k'); c.dots([(25, 12), (28, 12)], 'w')
    c.shade(26, 17, -1); c.shade(27, 17, -1); c.shade(23, 15, 1); c.shade(23, 16, 1)             # usta i rumieniec
    c.limb(27, 22, 31, 27, 3, 2.6, 'r'); c.limb(31, 27, 34, 25.2, 2.4, 2.2, 'p')                 # bliższe ramię
    return c
def hand():
    c = cv(); c.ball(HAND[0], HAND[1], 2.5, 2.5, 'p'); return c
def cape(f=0):
    c = cv()
    c.poly([(15, 20), (22, 20), (20, 30), (17 - f, 44), (11, 41), (6 - f, 43), (9, 30)], 'p', bevel=1.8)
    c.line(13, 24, 10, 41, 'p', d=-1, only='p'); c.line(17, 26, 15, 42, 'p', d=-1, only='p')
    return c

# ---------------------------------------------------------------- hełmy
def helm_helm(t):
    c = cv()
    c.ball(21.5, 10.5, 8.8, 7.6, 'p')
    c.rect(13.5, 10, 18, 19, 'p', bevel=1)                                                       # nakarczek i policzek
    c.ball(26.2, 15, 5, 5.2, '.')                                                                # twarz
    c.rect(22, 15.6, 31, 20, '.', bevel=0)
    c.rect(13, 8.6, 30.6, 10.8, 'q' if t else 'p', bevel=.6, add=(0 if t else -.12))             # obręcz
    c.rect(26, 10, 27.6, 15.4, 'p', bevel=.4)                                                    # nosal
    if t >= 1: c.line(21.5, 3.4, 21.5, 8, 'q', d=1, only='p')
    if t == 2:
        c.chain([(20, 3), (15, 0.5), (10, 3), (8, 9)], 2.4, 1.2, 't'); c.ball(26.8, 9.7, 1.3, 1.3, 'u')
    return c
def helm_kaptur(t):
    c = cv()
    c.ball(21, 21, 9.4, 3.6, 'p')                                                                # pelerynka na ramionach
    c.ball(21.2, 11.4, 9.2, 8.8, 'p'); c.tri((14, 7), (9, 2.5), (19, 4.5), 'p')
    c.ball(26, 14.2, 5, 5.4, '.'); c.rect(22, 15, 31, 19.6, '.', bevel=0)
    c.line(21, 3, 30, 10, 'p', d=-1, only='p')
    if t >= 1: c.ball(24.5, 21.4, 1.5, 1.5, 'q'); c.line(21.6, 9, 29.6, 9.4, 'q', d=0, only='p')
    if t == 2: c.ball(24.5, 21.4, 1, 1, 'u')
    return c
def helm_diadem(t):
    c = cv()
    c.rect(14.4, 7.8, 30.4, 10, 'q' if t else 'p', bevel=.6)
    c.tri((25, 8), (27, 4.5), (29, 8), 'q' if t else 'p'); c.ball(27, 8.4, 1.5, 1.5, 'u')
    if t >= 1: c.tri((19, 8), (20.5, 5.5), (22, 8), 'q'); c.tri((14.6, 8), (15.6, 6), (17, 8), 'q')
    if t == 2: c.ball(20.5, 8.6, 1, 1, 'u'); c.dot(27, 4, 'h')
    return c

# ---------------------------------------------------------------- zbroje
def armor_plate(t):
    c = cv()
    c.poly([(13.6, 20), (28.4, 20), (27.6, 31), (24.5, 35.4), (17.5, 35.4), (14.4, 31)], 'p', bevel=2.6)
    c.ball(21, 25.4, 6.4, 5, 'p', add=.1)
    c.line(21, 21, 21, 34, 'p', d=-2, only='p')
    c.line(15.5, 29.6, 26.5, 29.6, 'p', d=-1, only='p')
    c.ball(14.4, 21.4, 4.6, 3.8, 'p'); c.ball(28, 21.4, 4.4, 3.6, 'p')                           # naramienniki
    if t >= 1:
        c.line(14.5, 20.2, 27.5, 20.2, 'q', d=1); c.line(11, 23.8, 17.6, 24.6, 'q', d=0); c.line(25, 24.4, 31.4, 23.6, 'q', d=0)
    if t == 2: c.ball(21, 24.4, 2, 2, 'u', add=.15); c.tri((12, 19.6), (10.4, 15.6), (15, 18.6), 'p'); c.tri((30, 19.4), (32, 15.6), (27.4, 18.6), 'p')
    return c
def armor_chain(t):
    c = cv()
    c.limb(15, 22, 13.2, 27, 3.1, 2.8, 'p', **FARK)
    c.poly([(13.8, 20), (28.2, 20), (27.8, 38), (14.4, 38)], 'p', bevel=2.2)
    c.limb(27, 22, 30.4, 26.4, 3.2, 2.9, 'p')
    for y in range(20, 39):
        for x in range(9, 34):
            if (x + y) % 2 == 0: c.shade(x, y, -1.1)
    c.rect(14.6, 31.4, 27.4, 33.6, 'r', bevel=.5); c.ball(21, 32.5, 1.5, 1.5, 'q' if t else 'p')
    if t >= 1: c.line(14.4, 38, 27.8, 38, 'q', d=0); c.line(15, 20.2, 27, 20.2, 'q', d=1)
    if t == 2: c.line(14.4, 37, 27.8, 37, 'q', d=1); c.ball(21, 22.6, 1.4, 1.4, 'u')
    return c
def armor_robe(t):
    c = cv()
    c.limb(15, 22, 12.6, 29.4, 3.2, 3.6, 'p', **FARK)
    c.poly([(13.8, 20), (28.2, 20), (31.4, 43.4), (11.6, 43.4)], 'p', bevel=2.4)
    c.ball(21, 26, 6.6, 5.4, 'p', add=.06)
    c.line(18, 34, 16, 43, 'p', d=-1, only='p'); c.line(24.5, 34, 26.6, 43, 'p', d=-1, only='p'); c.line(21.4, 35, 21.4, 43, 'p', d=-1, only='p')
    c.limb(27, 22, 31, 27.4, 3.3, 3.5, 'p')
    c.rect(14.4, 31.2, 27.8, 33.8, 't', bevel=.6)                                                # szarfa
    c.limb(18, 33.6, 17, 39, 1.2, 1, 't')
    if t >= 1: c.line(12, 43, 31.2, 43, 'q', d=0); c.line(21, 20.4, 21, 31, 'q', d=0, only='p')
    if t == 2: c.line(12, 42, 31, 42, 'q', d=1); c.ball(21, 22.4, 1.6, 1.6, 'u', add=.15)
    return c

# ---------------------------------------------------------------- rękawice, buty, pasy, amulet
def gloves(kind, t, front):
    c = cv(); m = 'r' if (t == 0 and kind == 'Rękawice') else 'p'
    if front:
        c.ball(HAND[0], HAND[1], 2.9, 2.9, m)
        if kind == 'Karwasze':
            c.limb(31.4, 26.8, 33.6, 25.4, 2.8, 2.6, 'p')
            if t: c.line(30.4, 24.8, 32.2, 28.6, 'q', d=0, only='p')
        if kind == 'Szpony':
            for d in (-2.2, 0, 2.2): c.limb(36.5, 24.5 + d * .6, 40.5, 23 + d, 1, .5, 'p')
    else:
        c.ball(11.5, 31.5, 2.7, 2.7, m, add=-.12)
        if kind == 'Karwasze':
            c.limb(13.4, 26, 12, 30, 2.9, 2.7, 'p', add=-.12)
            if t: c.line(10.6, 26, 15.6, 26.6, 'q', d=0, only='p')
        if kind == 'Szpony':
            for d in (-1.8, 0, 1.8): c.limb(11.5 + d, 33.4, 11 + d * 1.3, 37, .9, .5, 'p')
    if t == 2 and kind != 'Szpony': c.dot(HAND[0] if front else 11, 24 if front else 31, 'h')
    return c
def boots(kind, t):
    c = cv()
    far, near = [(13.5, 40.5), (20.5, 40.5), (21.5, 45.6), (13.5, 45.6)], [(22.5, 40.5), (29.5, 40.5), (31.5, 45.6), (22.5, 45.6)]
    if kind == 'Nagolenniki':
        c.limb(17.6, 36.6, 17, 41, 3.5, 3.2, 'p', **FARK); c.limb(25.4, 36.6, 26, 41, 3.7, 3.4, 'p')
        c.ball(17.8, 36, 2.6, 2.2, 'p', add=-.05); c.ball(25.6, 36, 2.8, 2.4, 'p', add=.1)
        c.poly(far, 'r', bevel=.8, add=-.2); c.poly(near, 'r', bevel=.8)
        if t: c.line(15, 39.4, 20, 39.8, 'q', d=0, only='p'); c.line(23, 39.6, 29, 39.4, 'q', d=0, only='p')
    elif kind == 'Trzewiki':
        c.poly([(13.5, 42), (20.5, 42), (22.5, 45.6), (13.5, 45.6)], 'p', bevel=.8, add=-.2); c.poly([(22.5, 42), (29.5, 42), (32.5, 45.6), (22.5, 45.6)], 'p', bevel=.8)
        if t: c.dots([(21, 45), (31, 45)], 'h') if t == 2 else None; c.line(14, 42, 20, 42, 'q', d=0); c.line(23, 42, 29, 42, 'q', d=0)
    else:
        c.limb(17.4, 38.4, 17, 41, 3.5, 3.2, 'p', **FARK); c.limb(25.6, 38.4, 26, 41, 3.7, 3.4, 'p')
        c.poly(far, 'p', bevel=.8, add=-.2); c.poly(near, 'p', bevel=.8)
        c.line(14, 37.4, 20.6, 37.8, 'q' if t else 'r', d=0); c.line(22.2, 37.6, 29, 37.2, 'q' if t else 'r', d=0)
        c.line(14, 38.4, 20.6, 38.8, 'q' if t else 'r', d=-1); c.line(22.2, 38.6, 29, 38.2, 'q' if t else 'r', d=-1)
    if t == 2 and kind != 'Trzewiki': c.ball(26, 39 if kind == 'Buty' else 36, 1, 1, 'u')
    return c
def belt(kind, t):
    c = cv()
    if kind == 'Rzemień':
        c.line(16, 21, 27, 32, 'r', d=0); c.line(15, 21, 26, 32, 'r', d=-1); c.line(17, 21, 28, 32, 'r', d=1)
        c.rect(15, 31.6, 27.4, 33.6, 'r', bevel=.5); c.ball(21.5, 26.5, 1.5, 1.5, 'q' if t else 'p')
    else:
        c.rect(14.6, 31.2, 27.6, 34.4, 'r' if kind == 'Sakwa' else 'p', bevel=.6)
        c.rect(19.4, 30.8, 23, 34.8, 'q' if t else 'p', bevel=.6, add=.1)
        if kind == 'Sakwa':
            c.ball(16.6, 37, 3.2, 3.4, 'r'); c.rect(14, 34.4, 19.4, 36, 'r', bevel=.4, add=-.15); c.dot(16, 36, 'h') if t else None
    if t == 2: c.ball(21.2, 32.8, 1, 1, 'u')
    return c
def amulet(t):
    c = cv()
    c.line(18.6, 20.4, 21.6, 24, 'q', d=0); c.line(24.6, 20.4, 21.6, 24, 'q', d=0)
    c.ball(21.6, 25, 1.9, 1.9, 'p', add=.1); c.ball(21.6, 25, 1, 1, 'u')
    if t == 2: c.dot(21, 24, 'h')
    return c

# ---------------------------------------------------------------- broń w dłoni
_dn = math.hypot(.36, -1); DIR = (.36 / _dn, -1 / _dn); PERP = (-DIR[1], DIR[0])   # oś broni: w górę i lekko w przód
def P(d, s=0): return (HAND[0] + DIR[0] * d + PERP[0] * s, HAND[1] + DIR[1] * d + PERP[1] * s)
def shaft(c, d0, d1, r=1, m='s'): a, b = P(d0), P(d1); c.limb(a[0], a[1], b[0], b[1], r, r, m)
def weapon(kind, t):
    c = cv(); gd = 'q' if t else 'p'
    if kind in ('Miecz', 'Sztylet', 'Szabla'):
        L = {'Miecz': 22, 'Sztylet': 12, 'Szabla': 22}[kind]
        shaft(c, -3.6, 3, 1.2, 'r'); a = P(-4.6); c.ball(a[0], a[1], 1.7, 1.7, gd)
        if kind == 'Szabla':
            pts = [P(3.5 + i * (L - 3.5) / 6, 3.4 * (i / 6) ** 2 * (1 if i < 6 else .6)) for i in range(7)]
            c.chain(pts, 2.1, .8, 'p')
            a, b = P(3, -3.6), P(3, 2.4); c.limb(a[0], a[1], b[0], b[1], 1.1, 1.1, gd); g = P(.5, -3.4); c.limb(a[0], a[1], g[0], g[1], .8, .8, gd)
        else:
            w = 2 if kind == 'Miecz' else 1.6
            c.poly([P(3.6, -w), P(L - 3, -w), P(L, 0), P(L - 3, w), P(3.6, w)], 'p', bevel=1.1)
            a, b = P(L - 4, 0), P(5, 0); c.line(a[0], a[1], b[0], b[1], 'p', d=-1, only='p') if kind == 'Miecz' else None
            a, b = P(3.2, -4.4 if kind == 'Miecz' else -3), P(3.2, 4.4 if kind == 'Miecz' else 3); c.limb(a[0], a[1], b[0], b[1], 1.2, 1.2, gd)
        if t == 2: g = P(3.2); c.ball(g[0], g[1], 1.2, 1.2, 'u')
    elif kind in ('Topór', 'Młot', 'Buława'):
        shaft(c, -6, 20, 1.1)
        if t: a = P(-6); c.ball(a[0], a[1], 1.5, 1.5, 'q')
        if kind == 'Topór':
            c.poly([P(12, .6), P(13, 8), P(17, 9.6), (P(21, 8)), P(20, .6), P(16.5, 2.4)], 'p', bevel=1.3)
            if t: c.poly([P(13.6, -.6), P(16, -4.6), P(18.6, -.6)], 'p', bevel=.9)
            a, b = P(13, 0), P(19.6, 0); c.limb(a[0], a[1], b[0], b[1], 1.5, 1.5, gd)
        elif kind == 'Młot':
            c.poly([P(14, -6), P(21.4, -6), P(21.4, 6), P(14, 6)], 'p', bevel=1.6)
            for s in (-4.2, 4.2): a, b = P(14.4, s), P(21, s); c.line(a[0], a[1], b[0], b[1], gd, d=(1 if t else -1), only='p')
        else:
            h = P(19.5); c.ball(h[0], h[1], 4.4, 4.4, 'p')
            for ang in range(0, 360, 60):
                a = math.radians(ang + 15); c.tri((h[0] + math.cos(a + .35) * 3.6, h[1] + math.sin(a + .35) * 3.6), (h[0] + math.cos(a) * 7, h[1] + math.sin(a) * 7), (h[0] + math.cos(a - .35) * 3.6, h[1] + math.sin(a - .35) * 3.6), 'p')
            a = P(14.6); c.ball(a[0], a[1], 1.6, 1.6, gd)
        if t == 2: g = P(17.6, 0); c.ball(g[0], g[1], 1.2, 1.2, 'u')
    elif kind in ('Włócznia', 'Halabarda', 'Kostur'):
        shaft(c, -13, 20, 1.05)
        if kind == 'Włócznia':
            c.poly([P(19, -2.2), P(22, -2.6), P(28, 0), P(22, 2.6), P(19, 2.2)], 'p', bevel=1.1)
            a, b = P(18.6, -1.6), P(18.6, 1.6); c.limb(a[0], a[1], b[0], b[1], 1.2, 1.2, gd)
            if t: a, b = P(17, -1), P(12, -3.6); c.limb(a[0], a[1], b[0], b[1], 1.3, .6, 't')
        elif kind == 'Halabarda':
            c.poly([P(14, .6), P(14.6, 7.6), P(18, 9), P(22, 7), P(21, .6), P(17.5, 2.6)], 'p', bevel=1.2)
            c.poly([P(20, -1.8), P(27.5, 0), P(20, 1.8)], 'p', bevel=.9); c.poly([P(15.6, -.6), P(17.6, -5), P(19.6, -.6)], 'p', bevel=.8)
            a, b = P(14.4, 0), P(20.4, 0); c.limb(a[0], a[1], b[0], b[1], 1.4, 1.4, gd)
        else:
            h = P(23)
            a, b, d2 = P(19, 0), P(22, -4), P(26, -2.6); c.chain([a, b, d2], 1.3, .8, 'p' if t == 0 else 'q')
            a, b, d2 = P(19, 0), P(21, 3.6), P(25.6, 3.4); c.chain([a, b, d2], 1.3, .8, 'p' if t == 0 else 'q')
            c.ball(h[0], h[1], 2.6 + .3 * t, 2.6 + .3 * t, 'u', add=.15); c.dot(h[0] - 1, h[1] - 1, 'h')
            if t == 2: c.dots([(h[0] + 3, h[1] - 4), (h[0] - 4, h[1] - 3)], 'h')
        if t == 2 and kind != 'Kostur': g = P(17, 0); c.ball(g[0], g[1], 1.1, 1.1, 'u')
    else:                                                                                        # Łuk
        x, y = HAND
        c.chain([(x - 1, y - 15), (x + 3.4, y - 9), (x + 4.6, y), (x + 3.4, y + 9), (x - 1, y + 15)], 1.3, 1.3, 's')
        c.ball(x - 1, y - 15, 1.5, 1.5, 'p'); c.ball(x - 1, y + 15, 1.5, 1.5, 'p'); c.rect(x + 3, y - 2.6, x + 6, y + 2.6, gd, bevel=.6)
        c.seg(x - 1, y - 14, x - 3, y, 'w'); c.seg(x - 3, y, x - 1, y + 14, 'w')
        c.limb(x - 3, y, x + 9, y, .7, .7, 's'); c.tri((x + 9, y - 2), (x + 12.6, y), (x + 9, y + 2), 'p')
        if t == 2: c.ball(x + 4.6, y, 1, 1, 'u')
    return c

HELMS = {'Hełm': helm_helm, 'Kaptur': helm_kaptur, 'Diadem': helm_diadem}
ARMORS = {'Napierśnik': armor_plate, 'Kolczuga': armor_chain, 'Szata': armor_robe}
GLOVES = ['Rękawice', 'Karwasze', 'Szpony']; BOOTS = ['Buty', 'Nagolenniki', 'Trzewiki']; BELTS = ['Pas', 'Sakwa', 'Rzemień']
WEAPONS = ['Miecz', 'Topór', 'Młot', 'Włócznia', 'Buława', 'Sztylet', 'Szabla', 'Halabarda', 'Kostur', 'Łuk']

def layers():
    R = lambda c: c.rows(outline=False)
    L = {'base': R(base()), 'hand': R(hand()), 'cape': R(cape())}
    for t in range(3):
        for k, f in HELMS.items(): L[f'helm:{k}:{t}'] = R(f(t))
        for k, f in ARMORS.items(): L[f'zbroja:{k}:{t}'] = R(f(t))
        for k in GLOVES: L[f'rekawice:{k}:{t}'] = R(gloves(k, t, False)); L[f'rekawiceF:{k}:{t}'] = R(gloves(k, t, True))
        for k in BOOTS: L[f'buty:{k}:{t}'] = R(boots(k, t))
        for k in BELTS: L[f'pas:{k}:{t}'] = R(belt(k, t))
        for k in WEAPONS: L[f'bron:{k}:{t}'] = R(weapon(k, t))
        L[f'amulet:{t}'] = R(amulet(t))
    return L

# ---------------------------------------------------------------- podgląd
BODY = dict(p='#e2a878', q='#62391e', r='#6a4c32', s='#433646', t='#583a24')
def gear_pal(ore):
    import vol
    from prev import METALS
    r, g = METALS[ore]
    pal = vol.palette(dict(q='#d8a537', r='#76452f', s='#6e4528', t='#b33440', u=g[1]))
    mix = lambda a, b2, k: '#%02x%02x%02x' % tuple(round(int(a[i:i + 2], 16) * (1 - k) + int(b2[i:i + 2], 16) * k) for i in (1, 3, 5))
    for i, col in enumerate([mix(r[0], '#140f1a', .5), r[0], r[1], r[2], mix(r[2], r[3], .5), r[3]]): pal[vol.ALPH[i]] = col
    return pal
def compose(L, parts, body=BODY):
    import vol
    img = [[None] * W for _ in range(H)]
    def over(rows, p):
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch != '.' and ch in p: img[y][x] = p[ch]
    over(L['base'], vol.palette(body))
    for key, ore in parts:
        if key == 'hand': over(L['hand'], vol.palette(body))
        else: over(L[key], gear_pal(ore))
    rows = [['.'] * W for _ in range(H)]; pal = {}
    for y in range(H):
        for x in range(W):
            c = img[y][x]
            if not c and any(0 <= x + dx < W and 0 <= y + dy < H and img[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = '#1a1320'
            if c: ch = pal.setdefault(c, chr(0x100 + len(pal))); rows[y][x] = ch
    return [''.join(r) for r in rows], {v: k for k, v in pal.items()}

if __name__ == '__main__':
    import vol
    L = layers()
    sets = [[('hand', 0)],
            [('zbroja:Napierśnik:0', 1), ('pas:Pas:0', 0), ('buty:Buty:0', 0), ('rekawice:Rękawice:0', 0), ('helm:Hełm:0', 1), ('bron:Miecz:0', 1), ('rekawiceF:Rękawice:0', 0)],
            [('zbroja:Kolczuga:1', 2), ('pas:Sakwa:1', 3), ('buty:Nagolenniki:1', 2), ('amulet:1', 3), ('helm:Kaptur:1', 3), ('bron:Topór:1', 2), ('hand', 0)],
            [('zbroja:Szata:1', 3), ('pas:Rzemień:1', 3), ('rekawice:Karwasze:1', 3), ('helm:Diadem:1', 3), ('bron:Kostur:1', 3), ('rekawiceF:Karwasze:1', 3)],
            [('zbroja:Kolczuga:1', 4), ('pas:Pas:1', 4), ('buty:Buty:1', 4), ('helm:Kaptur:1', 4), ('bron:Łuk:1', 4), ('hand', 0)],
            [('zbroja:Napierśnik:2', 5), ('pas:Pas:2', 5), ('buty:Trzewiki:2', 5), ('rekawice:Szpony:2', 5), ('amulet:2', 5), ('helm:Hełm:2', 5), ('bron:Młot:2', 5), ('rekawiceF:Szpony:2', 5)],
            [('zbroja:Napierśnik:2', 6), ('pas:Pas:2', 6), ('buty:Nagolenniki:2', 6), ('rekawice:Karwasze:2', 6), ('helm:Hełm:2', 6), ('bron:Halabarda:2', 6), ('rekawiceF:Karwasze:2', 6)],
            [('zbroja:Szata:2', 6), ('helm:Diadem:2', 6), ('bron:Szabla:2', 5), ('hand', 0)],
            [('bron:Włócznia:1', 2), ('hand', 0)], [('bron:Buława:0', 1), ('hand', 0)], [('bron:Sztylet:2', 6), ('hand', 0)], [('bron:Miecz:2', 6), ('hand', 0)]]
    vol.sheet([compose(L, p) for p in sets], sys.argv[1], scale=5, cols=6)
