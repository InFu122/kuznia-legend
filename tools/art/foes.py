# Wrogowie 48×48 (bryły z vol.py). Każdy szablon: funkcja f(klatka 0/1) → V. Rysowane przodem w prawo,
# płótno odbija je w lewo (stoją naprzeciw bohatera); światło zawsze z lewej góry.
# Materiały: p ciało, q brzuch/drugi kolor, r akcent, s ciemne części, t metal/kość, u dodatki. e oczy, w biel, k czerń, g poświata.
import sys; sys.path.insert(0, '.')
from vol import V

BIG = False   # True: ten sam rysunek na płótnie 64×64 (bossowie z szablonu moba)
def cv(): return V(64, 64, flip=True, sc=64 / 48) if BIG else V(48, 48, flip=True)
FAR = dict(add=-.22)   # dalsze kończyny: ciemniejsze

def wilk(f, kind='wilk'):
    c = cv(); b = f
    c.chain([(11, 27 + b), (6, 23 + b), (3, 17 + 3 * b)], 3, 1.4, 'p')                  # ogon
    if kind == 'wilk': c.ball(4, 18 + 3 * b, 1.8, 2, 'q', only='p', keep=True)
    c.limb(14, 31, 12, 38, 3.2, 2.2, 'p', **FAR); c.limb(12, 38, 14, 44, 2, 1.8, 'p', **FAR)
    c.limb(32, 32, 34 + f, 44, 2.6, 1.8, 'p', **FAR)
    c.ball(20, 28 + b, 11.5, 7, 'p')
    c.ball(29, 27 + b, 8, 8.4, 'p')
    c.ball(21, 31.5 + b, 9, 3.2, 'q', only='p', keep=True)
    c.limb(17, 31, 15, 38, 3.4, 2.4, 'p'); c.limb(15, 38, 18, 44, 2.2, 2, 'p')
    c.limb(28, 32, 28 - f, 44, 2.9, 2, 'p')
    c.ball(31, 21 + b, 6.5, 6.5, 'p')
    c.ball(26, 20.5 + b, 7, 3, 's', only='p', keep=True)
    if kind != 'pies':
        for x in (22, 25, 28): c.tri((x, 20 + b), (x + 1, 15.5 + b), (x + 3.5, 20 + b), 's')    # zjeżona sierść
    if kind == 'ogar':
        for x in (15, 19, 23, 27): c.tri((x, 21 + b), (x + .5, 13 + b - 2 * f * (x % 2)), (x + 3, 21 + b), 'r'); c.dot(x + 1, 16 + b, 'g')
    if kind == 'pies': c.ball(33, 20 + b, 2.6, 4, 's')
    else: c.tri((31, 16 + b), (32.5, 8 + b), (36, 14 + b), 's')
    c.ball(37, 18.5 + b, 6, 5.6, 'p')
    c.limb(39, 20 + b, 45, 21 + b, 3.2, 2.2, 'p')
    c.limb(39.5, 24 + b, 44, 24.6 + b + f, 1.7, 1.2, 's')
    c.ball(38, 22 + b, 3.4, 2.2, 'q', only='p', keep=True)
    if kind == 'pies': c.limb(35, 15 + b, 33.5, 22 + b, 2.2, 1.6, 's')
    else: c.tri((34, 15 + b), (36.5, 6.5 + b), (39.5, 14 + b), 'p')
    c.dots([(40, 17 + b), (41, 17 + b)], 'e'); c.dots([(39, 16 + b), (40, 16 + b), (41, 16 + b), (42, 17 + b)], 'k')
    c.dots([(46, 19 + b), (46, 20 + b), (47, 20 + b)], 'k')
    c.dots([(41, 23 + b), (43, 23 + b), (45, 23 + b)], 'w')
    if kind == 'pies': c.dots([(44, 25 + b + f), (44, 26 + b + f)], 'g')                  # ślina
    return c
def pies(f): return wilk(f, 'pies')
def ogar(f): return wilk(f, 'ogar')

def dzik(f):
    c = cv(); b = f
    c.limb(8, 27 + b, 4, 23 + b, 1.4, 1, 'p')
    c.limb(13, 33, 12, 44, 3, 2.2, 'p', **FAR); c.limb(31, 34, 32, 44, 2.8, 2.1, 'p', **FAR)
    c.ball(20, 28 + b, 13, 9.5, 'p')
    c.ball(20, 33 + b, 10, 4, 'q', only='p', keep=True)
    c.ball(20, 20.5 + b, 11, 3.4, 's', only='p', keep=True)
    for x in range(10, 31, 3): c.poly([(x, 20 + b), (x + 1.5, 15 + b - (x % 2)), (x + 3, 20 + b)], 's', bevel=.6)   # szczecina
    c.limb(17, 34, 16, 44, 3.4, 2.4, 'p'); c.limb(27, 35, 27, 44, 3.2, 2.3, 'p')
    c.ball(33, 27 + b, 8, 7.6, 'p')
    c.poly([(30, 20 + b), (31, 14 + b), (35, 19 + b)], 's', bevel=.8)
    c.limb(37, 29 + b, 44, 30 + b, 4, 3.2, 'q')                           # ryj
    c.dot(45, 29 + b, 'k'); c.dot(45, 31 + b, 'k')
    c.limb(40, 33 + b, 43, 27 + b, 1.2, .8, 't')                          # kieł
    c.dot(37, 24 + b, 'e'); c.dot(38, 24 + b, 'e'); c.dots([(36, 23 + b), (37, 23 + b), (38, 23 + b)], 'k')
    for x in (12, 16, 27, 32): c.rect(x - 1, 44, x + 2, 45.5, 's', bevel=0)
    return c

def pajak(f):
    c = cv(); b = f
    legs = [(16, 13, 7), (22, 10, 17), (33, 11, 37), (39, 15, 45)]
    for i, (kx, ky, fx) in enumerate(legs):
        sx = 27 + i * 1.6; w = (f if i % 2 else -f)
        c.limb(sx, 30, kx + 2, ky + 3 + w, 1.2, 1, 's', **FAR); c.limb(kx + 2, ky + 3 + w, fx + 2, 44, 1, .7, 's', **FAR)
    c.ball(15, 27 + b, 12, 10.5, 'p')
    c.ball(12, 22 + b, 6.5, 4.5, 'q', only='p', keep=True)
    c.poly([(11, 22 + b), (18, 22 + b), (14.5, 27 + b), (18, 32 + b), (11, 32 + b), (14.5, 27 + b)], 'r', bevel=0, only='pq', keep=True)
    c.ball(31, 31 + b, 7, 6, 'p')
    for i, (kx, ky, fx) in enumerate(legs):
        sx = 27 + i * 2; w = (-f if i % 2 else f)
        c.limb(sx, 31 + b, kx, ky + w, 1.5, 1.2, 's'); c.limb(kx, ky + w, fx, 45, 1.2, .8, 's'); c.ball(kx, ky + w, 1.6, 1.6, 's')
    c.dots([(33, 28 + b), (35, 29 + b), (34, 31 + b), (36, 31 + b), (32, 30 + b)], 'e')
    c.limb(35, 35 + b, 36, 38.5 + b + f, 1.1, .7, 't'); c.limb(32, 35.5 + b, 32, 39 + b + f, 1.1, .7, 't')
    return c

def ropucha(f):
    c = cv(); b = f
    c.ball(9, 40, 6, 4.2, 'p', **FAR); c.ball(39, 40, 6, 4.2, 'p', **FAR)               # tylne łapy
    c.ball(24, 33, 15, 11.5, 'p')
    c.ball(24, 37 + b, 11 + f, 7.5, 'q', only='p', keep=True)                            # podgardle
    c.ball(16, 22, 5, 5, 'p'); c.ball(32, 22, 5, 5, 'p')                                  # oczodoły
    c.ball(16, 21.5, 3, 3, 't', k=.4); c.ball(32, 21.5, 3, 3, 't', k=.4)
    c.rect(15, 20, 18, 23, 'p', bevel=0, only='t') if False else None
    c.dots([(16, 20), (16, 21), (16, 22), (17, 20), (17, 21), (17, 22)], 'k'); c.dots([(32, 20), (32, 21), (32, 22), (33, 20), (33, 21), (33, 22)], 'k')
    c.dots([(15, 20), (31, 20)], 'e')
    for (x, y, r) in [(9, 30, 1.8), (13, 35, 1.3), (37, 31, 2), (34, 36, 1.2), (24, 24, 1.5), (40, 35, 1.2)]: c.ball(x, y, r, r, 's', ao=False)
    c.seg(12, 30, 20, 32, 'k'); c.seg(20, 32, 30, 32, 'k'); c.seg(30, 32, 37, 29, 'k')   # paszcza
    c.limb(13, 39, 11, 44, 2.6, 2.4, 'p'); c.limb(35, 39, 37, 44, 2.6, 2.4, 'p')
    c.limb(9, 44, 14, 44.4, 1.5, 1.5, 'q'); c.limb(34, 44.4, 39, 44, 1.5, 1.5, 'q')
    return c

def pijawka(f):
    c = cv(); b = f
    pts = [(6, 42), (13, 41), (20, 42), (27, 40), (31, 34), (31, 27), (33 + b, 21), (37 + b, 17)]
    c.chain(pts, 3.5, 6, 'p')
    c.chain([(8, 43.5), (20, 44), (27, 42.5), (29.5, 35), (29.5, 28)], 1.2, 1.6, 'q', only='p', keep=True)
    for i in range(1, len(pts) - 1):
        x, y = pts[i]; c.line(x - 1, y - 6, x + 1, y + 6, 's', d=-1, only='p') if i < 4 else c.line(x - 6, y, x + 6, y + 1, 's', d=-1, only='p')
    c.ball(39 + b, 15.5, 5.5, 5.5, 'p')
    c.ball(41 + b, 15.5, 3.6, 3.8, 'r', k=.3, add=-.2)                                    # gardziel
    c.ball(41.5 + b, 15.5, 1.8, 2, 'r', add=-.5)
    c.dots([(39 + b, 12), (42 + b, 12), (44 + b, 14), (44 + b, 17), (42 + b, 19), (39 + b, 19), (38 + b, 15)], 'w')
    c.dots([(36 + b, 10), (34 + b, 12)], 'e')
    return c

def waz(f, kind='waz'):
    c = cv(); b = f
    c.chain([(40, 43), (30, 44), (18, 43), (9, 41), (5, 37)], 3.8, 2, 'p')               # zwoje: dół
    c.chain([(8, 36), (16, 34), (26, 35), (33, 38)], 3.6, 4.2, 'p')
    c.chain([(30, 38), (27, 31), (28, 24), (31 + b, 17), (33 + b, 12)], 4.4, 3.6, 'p')    # szyja
    c.chain([(30, 37), (29.5, 30), (30.5, 24), (33 + b, 18)], 1.6, 1.6, 'q', only='p', keep=True)
    for (x, y) in [(12, 42), (20, 44), (30, 44), (13, 34), (21, 34), (25, 29), (26, 22)]: c.ball(x, y, 1.7, 1.2, 's', only='p', keep=True)
    if kind == 'morski':
        for (x, y) in [(24, 28), (25, 21), (28 + b, 14)]: c.tri((x, y + 3), (x - 5, y - 1), (x, y - 3), 'r')   # płetwy grzbietowe
        c.tri((5, 37), (0, 31), (2, 40), 'r'); c.tri((5, 37), (1, 43), (7, 41), 'r')
    c.ball(36 + b, 10.5, 6, 4.4, 'p')                                                     # głowa
    c.limb(38 + b, 12, 44 + b, 12.5, 3, 2.2, 'p')
    c.limb(38 + b, 14.5, 43 + b, 15 + f, 1.6, 1.2, 'q')
    if kind == 'morski': c.tri((33 + b, 8), (28 + b, 3), (36 + b, 6), 'r'); c.tri((34 + b, 13), (29 + b, 16), (33 + b, 10), 'r')
    c.dots([(38 + b, 9), (39 + b, 9)], 'e'); c.dots([(37 + b, 8), (38 + b, 8), (39 + b, 8), (40 + b, 9)], 'k')
    c.dots([(42 + b, 14), (44 + b, 14)], 'w')
    c.seg(45 + b, 15, 47, 16 + f, 'g'); c.dot(47, 14 + f, 'g') if not f else c.dot(47, 18, 'g')
    return c
def waz_morski(f): return waz(f, 'morski')

def kret(f):
    c = cv(); b = f
    c.ball(19, 31, 14, 12.5, 'p')
    c.ball(19, 38, 10, 5, 'q', only='p', keep=True)
    c.limb(12, 40, 11, 44, 3, 2.6, 'p'); c.limb(26, 40, 27, 44, 3, 2.6, 'p')
    c.ball(31, 27 + b, 8.5, 8, 'p')
    c.limb(36, 28 + b, 44, 30 + b, 3.6, 2.4, 'q')                                         # ryjek
    c.ball(45, 30 + b, 1.8, 1.8, 'r')
    c.dots([(36, 23 + b), (37, 23 + b)], 'e')
    c.dots([(39, 32 + b), (41, 33 + b), (43, 33 + b)], 'w')
    for i, a in enumerate((-.5, 0, .5)):                                                  # pazury przedniej łapy
        c.limb(33, 37 + b - 2 * f, 39 + 2 * a, 41 + 4 * a - 2 * f, 1.3, .7, 't')
    c.limb(29, 33 + b, 33, 37 + b - 2 * f, 3.4, 3, 'p')
    for i in range(3): c.limb(10 + i * 2, 44, 9 + i * 2.5, 45.6, .9, .6, 't')
    for x in (8, 12, 16, 20): c.tri((x, 20), (x + 1, 17), (x + 3, 20), 's')
    return c

def chrzaszcz(f):
    c = cv(); b = f
    for i, x in enumerate((13, 21, 29)):
        c.limb(x, 36, x - 3 + 3 * (i - 1) + (f if i != 1 else -f), 44, 1.5, 1, 's', **FAR)
    c.ball(19, 28 + b, 14, 11, 'p')                                                       # pancerz
    c.rect(4, 36 + b, 34, 46, '.', bevel=0)                                               # płaski spód
    c.poly([(6, 35 + b), (33, 35 + b), (31, 38 + b), (8, 38 + b)], 'q', bevel=.8)
    c.line(19, 17 + b, 19, 35 + b, 's', d=-2, only='p'); c.line(8, 30 + b, 31, 30 + b, 's', d=-1, only='p')
    for (x, y) in [(12, 23), (25, 24), (14, 31), (26, 31)]: c.ball(x, y + b, 1.6, 1.3, 'r', only='p', keep=True)
    c.ball(35, 31 + b, 6.5, 6, 's')                                                       # głowa
    c.chain([(37, 27 + b), (41, 20 + b), (46, 18 + b - f)], 1.8, .9, 't')                 # róg
    c.limb(39, 33 + b, 45, 35 + b + f, 1.2, .8, 't'); c.limb(38, 35 + b, 43, 38 + b + f, 1.1, .7, 't')
    c.dots([(37, 30 + b), (38, 30 + b)], 'e')
    for i, x in enumerate((11, 19, 27)):
        c.limb(x, 37 + b, x - 4 + 4 * i + (-f if i != 1 else f), 41, 1.6, 1.2, 's'); c.limb(x - 4 + 4 * i + (-f if i != 1 else f), 41, x - 5 + 5 * i, 45, 1.2, .8, 's')
    return c

# ---------------------------------------------------------------- dwunożni
def szkielet(f, kind='miecz'):
    c = cv(); b = f
    c.limb(21, 34, 20, 39, 1.3, 1.2, 'p', **FAR); c.limb(20, 39, 21, 44, 1.2, 1.1, 'p', **FAR); c.limb(20, 44.5, 24, 44.5, 1.1, 1, 'p', **FAR)
    if kind == 'miecz':                                                                   # tarcza na tylnym ramieniu
        c.limb(21, 22 + b, 17, 28 + b, 1.3, 1.2, 'p', **FAR)
        c.ball(15, 29 + b, 6.5, 7.5, 'q'); c.ball(15, 29 + b, 4.5, 5.5, 'q', add=.12); c.ball(15, 29 + b, 1.8, 1.8, 't')
    c.poly([(21, 20 + b), (30, 20 + b), (29, 31 + b), (22, 31 + b)], 's', bevel=0, add=-.3)   # ciemne wnętrze klatki
    c.limb(25.5, 19 + b, 25.5, 33 + b, 1.1, 1.1, 'p')                                     # kręgosłup
    for y in (21, 24, 27, 30): c.limb(21.5, y + b, 29.5, y + b - .6, 1, 1, 'p')            # żebra
    c.ball(25.5, 34 + b, 4.4, 2.4, 'p')                                                   # miednica
    c.limb(28, 35, 30, 39, 1.4, 1.3, 'p'); c.limb(30, 39, 29, 44, 1.3, 1.1, 'p'); c.limb(29, 44.5, 33, 44.5, 1.1, 1, 'p'); c.ball(30, 39, 1.6, 1.6, 'p')
    c.ball(26, 12 + b, 6.2, 6, 'p')                                                       # czaszka
    c.rect(24, 16 + b, 31, 19.5 + b, 'p', bevel=.6)                                       # szczęka
    c.ball(25.5, 12.5 + b, 1.8, 2, 's', add=-.5, ao=False); c.ball(30, 12.5 + b, 1.6, 2, 's', add=-.5, ao=False)
    c.dots([(25, 12 + b), (30, 12 + b)], 'e'); c.dots([(28, 15 + b), (28, 16 + b)], 'k')
    for x in (25, 27, 29): c.dot(x, 18 + b, 'k')
    c.ball(22, 21 + b, 1.8, 1.8, 'p'); c.ball(30, 21 + b, 1.8, 1.8, 'p')
    if kind == 'miecz':
        c.limb(30, 21 + b, 35, 25 + b, 1.3, 1.2, 'p'); c.limb(35, 25 + b, 38, 21 + b - f, 1.2, 1.1, 'p')
        c.limb(38.5, 19 + b - f, 43, 5 + b - f, 1.5, .9, 't')                             # miecz
        c.limb(36, 20 + b - f, 41, 21.5 + b - f, 1, 1, 'r')
    else:
        c.limb(30, 21 + b, 36, 23 + b, 1.3, 1.2, 'p'); c.limb(36, 23 + b, 40, 23 + b, 1.2, 1.1, 'p')
        c.chain([(40, 8 + b), (43.5, 15 + b), (44, 23 + b), (43.5, 31 + b), (40, 38 + b)], 1.2, 1.2, 'q')   # łuk
        c.seg(40, 8 + b, 40 - 3 * f, 23 + b, 'w'); c.seg(40 - 3 * f, 23 + b, 40, 38 + b, 'w')
        c.limb(30 - 3 * f, 23 + b, 45, 23 + b, .6, .6, 'q'); c.tri((45, 21.5 + b), (47.5, 23 + b), (45, 24.5 + b), 't')
        c.limb(22, 21 + b, 26 - 2 * f, 24 + b, 1.3, 1.2, 'p'); c.limb(26 - 2 * f, 24 + b, 31 - 3 * f, 23 + b, 1.2, 1.1, 'p')
    c.poly([(20, 33 + b), (31, 33 + b), (30, 39), (27, 37), (25, 40), (22, 37), (20, 39)], 'r', bevel=.6)   # łachman
    return c
def lucznik(f): return szkielet(f, 'luk')

def upior(f):
    c = cv(); b = -f; w = f
    c.poly([(14, 22 + b), (34, 22 + b), (37, 36), (34 + w, 45), (31, 39), (28 - w, 46), (24, 40), (20 + w, 46), (17, 39), (13 - w, 44), (11, 34)], 'p', bevel=2.4)
    c.ball(24, 27 + b, 9, 9, 'p')
    c.limb(16, 25 + b, 9, 30 + b - f, 3.4, 2.2, 'p'); c.limb(32, 25 + b, 40, 28 + b + f, 3.4, 2.2, 'p')   # rękawy
    for dx in (-1.6, 0, 1.6): c.limb(9, 30 + b - f, 5.5, 33 + b - f + dx, .9, .5, 'q'); c.limb(40, 28 + b + f, 44, 30 + b + f + dx, .9, .5, 'q')
    c.ball(25, 14 + b, 9, 9.5, 'p')                                                       # kaptur
    c.tri((18, 8 + b), (14, 2 + b), (25, 5 + b), 'p')
    c.ball(27, 15.5 + b, 5.6, 6.2, 's', k=.3, add=-.45)                                   # mrok w kapturze
    c.dots([(25, 14 + b), (26, 14 + b), (30, 14 + b), (31, 14 + b)], 'e'); c.dots([(25, 15 + b), (30, 15 + b)], 'g')
    c.dots([(27, 19 + b), (28, 19 + b), (29, 19 + b), (28, 20 + b)], 'k')
    c.line(24, 26 + b, 23, 38, 's', d=-1, only='p'); c.line(29, 26 + b, 30, 37, 's', d=-1, only='p')
    return c

def rycerz(f, kind='tarcza'):
    c = cv(); b = f
    c.poly([(16, 17 + b), (30, 17 + b), (32 + f, 41), (13 - f, 42)], 's', bevel=1.5)      # płaszcz
    c.limb(21, 33, 20, 43, 3, 2.6, 'p', **FAR); c.rect(18, 42, 24, 45.5, 'p', bevel=.7, add=-.2)
    c.limb(29, 33, 30, 43, 3.2, 2.8, 'p'); c.rect(28, 42, 35, 45.5, 'p', bevel=.7)
    c.ball(30, 38, 2.6, 2.4, 'q')                                                         # nakolannik
    c.poly([(18, 18 + b), (33, 18 + b), (32, 34 + b), (19, 34 + b)], 'p', bevel=2.2)      # napierśnik
    c.ball(25.5, 24 + b, 6.5, 5.5, 'p', add=.08)
    c.rect(19, 31 + b, 32, 34 + b, 'q', bevel=.8); c.rect(24, 31 + b, 27, 34 + b, 'r', bevel=.6)   # pas
    c.poly([(20, 34 + b), (31, 34 + b), (32, 38 + b), (19, 38 + b)], 'q', bevel=.8)       # fartuch kolczy
    c.ball(18, 19.5 + b, 4.2, 3.6, 'q'); c.ball(33, 19.5 + b, 4.2, 3.6, 'q')              # naramienniki
    c.ball(26, 10 + b, 6.4, 6.8, 'p')                                                     # hełm
    c.rect(22, 14 + b, 32, 17.5 + b, 'p', bevel=.8)
    c.rect(24.5, 9.5 + b, 32.5, 11.5 + b, 's', bevel=0, add=-.5); c.dots([(26, 10 + b), (30, 10 + b)], 'e')   # wizjer
    c.line(28.5, 12 + b, 28.5, 17 + b, 's', d=-2, only='p')
    c.chain([(24, 4 + b), (19, 1 + b), (15, 4 + b + f), (14, 9 + b + f)], 2.2, 1.2, 'r')  # kita
    if kind == 'tarcza':
        c.limb(33, 21 + b, 37, 27 + b, 2.6, 2.4, 'p')
        c.poly([(33, 20 + b), (44, 20 + b), (44, 31 + b), (38.5, 38 + b), (33, 31 + b)], 'q', bevel=1.6)   # tarcza
        c.poly([(35.5, 22.5 + b), (41.5, 22.5 + b), (41.5, 30 + b), (38.5, 34 + b), (35.5, 30 + b)], 'r', bevel=1)
        c.dots([(38, 26 + b), (39, 26 + b), (38, 27 + b), (39, 27 + b)], 'e')
        c.limb(17, 21 + b, 13, 27 + b, 2.6, 2.4, 'p'); c.limb(13, 27 + b, 11, 23 + b - f, 2.2, 2, 'p')
        c.limb(10, 21 + b - f, 6, 4 + b - f, 1.7, 1, 't'); c.limb(7, 20 + b - f, 13, 22 + b - f, 1.1, 1.1, 'r')   # miecz
    else:                                                                                  # dwuręczna halabarda
        c.limb(40, 2 + b, 37, 45, 1, 1, 'u')
        c.poly([(40, 4 + b), (46, 7 + b), (46, 15 + b), (40, 13 + b)], 't', bevel=1); c.tri((39, 1 + b), (40.5, -4 + b), (42, 2 + b), 't')
        c.limb(33, 21 + b, 38, 25 + b, 2.6, 2.4, 'p'); c.limb(17, 21 + b, 24, 29 + b, 2.6, 2.4, 'p'); c.limb(24, 29 + b, 37, 33 + b, 2.2, 2, 'p')
    return c
def halabardnik(f): return rycerz(f, 'halabarda')

def mag(f, kind='kaptur'):
    c = cv(); b = f
    c.limb(38, 4 + b, 36, 45, 1.1, 1.1, 's')                                              # kostur
    c.ball(38, 4 + b - f, 3.4, 3.4, 'r', add=.15); c.dots([(37, 2 + b - f), (38, 3 + b - f)], 'h'); c.dots([(34, 1 + b), (42, 6 + b), (41, 0 + b)][: 2 + f], 'g')
    c.poly([(17, 19 + b), (31, 19 + b), (35 + f, 45), (12 - f, 45)], 'p', bevel=2.4)      # szata
    c.ball(24, 26 + b, 8, 8, 'p')
    c.line(24, 22 + b, 22, 44, 's', d=-1, only='p'); c.line(28, 30 + b, 30, 44, 's', d=-1, only='p')
    c.rect(18, 31 + b, 31, 33.5 + b, 'q', bevel=.7); c.limb(22, 33 + b, 21, 40 + b, 1.1, 1.1, 'q')   # szarfa
    c.poly([(12.5, 42), (35, 42), (35.5, 45), (12, 45)], 'q', bevel=.8)
    c.limb(18, 22 + b, 14, 30 + b, 3.4, 3.8, 'p', **FAR); c.ball(14, 32 + b, 2, 2, 't')
    if kind == 'kaptur':
        c.ball(25, 11.5 + b, 8, 8.2, 'p'); c.tri((17, 6 + b), (15, 14 + b), (22, 5 + b), 'p'); c.tri((22, 5 + b), (20, -1 + b), (29, 5 + b), 'p')
        c.ball(27.5, 13 + b, 5, 5.4, 's', k=.3, add=-.45)
        c.dots([(26, 12 + b), (30, 12 + b)], 'e'); c.dots([(26, 13 + b), (30, 13 + b)], 'g')
    else:                                                                                  # wiedźma: kapelusz i twarz
        c.ball(26, 13 + b, 5.6, 5.8, 't')
        c.chain([(31, 14 + b), (34.5, 15.5 + b)], 1.4, .8, 't')                           # nos
        c.dots([(28, 12 + b), (29, 12 + b)], 'e'); c.seg(28, 17 + b, 31, 16 + b, 'k')
        c.limb(20, 10 + b, 18, 20 + b, 2.2, 1.6, 'u'); c.limb(23, 15 + b, 21, 22 + b, 1.4, 1, 'u')
        c.ball(26, 8.5 + b, 10.5, 2.4, 'p'); c.poly([(20, 8 + b), (32, 8 + b), (29, 2 + b), (22, -3 + b + f), (24, 3 + b)], 'p', bevel=1.2)
        c.rect(21, 6 + b, 31.5, 8 + b, 'q', bevel=.5)
    c.limb(30, 22 + b, 35, 27 + b, 3.2, 3.4, 'p'); c.ball(36.5, 27 + b, 2.1, 2.1, 't')    # ręka na kosturze
    return c
def wiedzma_m(f): return mag(f, 'kapelusz')

def mnich(f):
    c = cv(); b = f
    c.poly([(16, 19 + b), (32, 19 + b), (35, 45), (13, 45)], 'p', bevel=2.4)
    c.ball(24, 27 + b, 9, 9, 'p')
    c.line(21, 30 + b, 19, 44, 's', d=-1, only='p'); c.line(27, 30 + b, 29, 44, 's', d=-1, only='p')
    c.rect(16.5, 32 + b, 32.5, 34 + b, 'q', bevel=.6); c.limb(27, 34 + b, 28, 41 + b, .9, .9, 'q'); c.ball(28, 42 + b, 1.4, 1.4, 'q')
    c.ball(24, 20 + b, 9, 4, 'p', add=.05)                                                # opuszczony kaptur
    c.ball(26, 11 + b, 6.2, 6.4, 't')                                                     # łysa głowa
    c.ball(24, 8 + b, 4, 2, 't', add=.2, only='t')
    c.dots([(27, 11 + b), (28, 11 + b), (31, 11 + b)], 'e'); c.dots([(27, 10 + b), (28, 10 + b), (31, 10 + b)], 'k')
    c.seg(27, 15 + b, 31, 15 + b, 'k'); c.dots([(28, 16 + b), (30, 16 + b)], 'w')
    c.dots([(26, 6 + b), (27, 7 + b), (26, 8 + b), (25, 7 + b)], 'g')                     # znamię
    c.limb(17, 22 + b, 12, 28 + b, 3.6, 3.6, 'p', **FAR); c.limb(12, 28 + b, 10, 21 + b - 2 * f, 2.6, 2, 'p', **FAR)
    for d in (-1.5, 0, 1.5): c.limb(10, 20 + b - 2 * f, 9 + d, 16 + b - 2 * f, .9, .5, 't')
    c.limb(31, 22 + b, 37, 27 + b, 3.6, 3.6, 'p'); c.limb(37, 27 + b, 41, 21 + b - 2 * f, 2.6, 2, 'p')
    for d in (-1.5, 0, 1.5): c.limb(41, 20 + b - 2 * f, 42 + d, 16 + b - 2 * f, .9, .5, 't')
    c.dots([(40, 12 + b - 3 * f), (43, 13 + b - 3 * f), (9, 12 + b - 3 * f)], 'g')
    return c

def ghul(f):
    c = cv(); b = f
    c.limb(18, 33, 16, 39, 2.6, 2, 'p', **FAR); c.limb(16, 39, 19, 44.5, 2, 1.8, 'p', **FAR)
    c.limb(22, 21 + b, 14, 30 + b, 2.4, 2, 'p', **FAR); c.limb(14, 30 + b, 15, 40 + b, 2, 1.6, 'p', **FAR)
    c.ball(22, 23 + b, 9, 7.5, 'p'); c.ball(23, 31 + b, 6.5, 5.5, 'p')                    # garb i tułów
    for y in (27, 30, 33): c.line(20, y + b, 27, y + b + 1, 's', d=-2, only='p')          # żebra
    c.poly([(17, 34 + b), (29, 34 + b), (30, 40), (26, 38), (23, 41), (20, 38), (17, 40)], 'r', bevel=.6)
    c.limb(26, 35, 29, 40, 2.8, 2.2, 'p'); c.limb(29, 40, 28, 44.5, 2.2, 2, 'p'); c.limb(27, 45, 33, 45, 1.2, 1.1, 'p')
    for x in (16, 19, 22, 25): c.tri((x, 17.5 + b), (x + 1, 13.5 + b), (x + 3, 17.5 + b), 's')   # kręgi na garbie
    c.ball(33, 20 + b, 6, 5.6, 'p')                                                       # głowa
    c.rect(32, 23 + b, 40, 27.5 + b + f, 'p', bevel=.8)                                   # szczęka
    c.rect(33, 23.6 + b, 39.5, 25 + b + f, 's', bevel=0, add=-.5)
    c.dots([(34, 23 + b), (36, 23 + b), (38, 23 + b), (35, 25 + b + f), (37, 25 + b + f)], 'w')
    c.dots([(35, 19 + b), (36, 19 + b)], 'e'); c.dots([(34, 18 + b), (35, 18 + b), (36, 18 + b), (37, 19 + b)], 'k')
    c.tri((29, 16 + b), (27, 12 + b), (32, 15 + b), 'p')
    c.limb(29, 24 + b, 35, 32 + b, 2.6, 2.2, 'p'); c.limb(35, 32 + b, 39, 38 + b - 3 * f, 2.2, 1.6, 'p')
    for d in (-2, 0, 2): c.limb(39, 39 + b - 3 * f, 42 + .3 * d, 42 + b - 3 * f + d, .9, .5, 't')
    for d in (-1.6, 1.6): c.limb(15, 41 + b, 15 + d, 44.5, .9, .5, 't')
    return c

def mumia(f):
    c = cv(); b = f
    c.limb(21, 33, 20, 44, 3.2, 2.8, 'p', **FAR); c.limb(19, 45, 25, 45, 1.3, 1.2, 'p', **FAR)
    c.limb(28, 33, 29, 44, 3.4, 3, 'p'); c.limb(28, 45, 34, 45, 1.3, 1.2, 'p')
    c.poly([(18, 18 + b), (32, 18 + b), (31, 35 + b), (19, 35 + b)], 'p', bevel=2.4)
    c.ball(25, 24 + b, 7.4, 6, 'p', add=.05)
    c.ball(26, 11 + b, 6.4, 6.8, 'p')
    for y in (8, 11, 14): c.line(20, y + b + 1, 32, y + b, 's', d=-1.5, only='p')
    for y in (20, 23, 26, 29, 32): c.line(18, y + b, 32, y + b + 1.4, 's', d=-1.5, only='p')
    for y in (36, 39, 42): c.line(17, y, 33, y + 1, 's', d=-1.5, only='p')
    c.rect(26, 10 + b, 31.5, 12 + b, 's', bevel=0, add=-.5); c.dots([(29, 10 + b), (30, 10 + b)], 'e'); c.dot(29, 11 + b, 'g')
    c.limb(19, 21 + b, 27, 23 + b + f, 2.6, 2.4, 'p', **FAR); c.limb(27, 23 + b + f, 37, 22 + b + 2 * f, 2.3, 2, 'p', **FAR)
    c.limb(31, 21 + b, 36, 25 + b - f, 2.8, 2.5, 'p'); c.limb(36, 25 + b - f, 44, 23 + b - 2 * f, 2.4, 2, 'p')
    c.line(34, 21 + b, 35, 27 + b, 's', d=-1.5, only='p'); c.line(39, 21 + b, 40, 26 + b, 's', d=-1.5, only='p')
    c.chain([(44, 25 + b - 2 * f), (43, 31 + b), (45 - f, 36 + b)], 1, .7, 'q'); c.chain([(20, 12 + b), (16, 17 + b), (15 + f, 24 + b)], 1.1, .7, 'q')   # luźne bandaże
    c.chain([(27, 34 + b), (25, 39), (26 + f, 43)], 1, .7, 'q')
    return c

# ---------------------------------------------------------------- wielcy i mali
def troll(f, kind='troll'):
    c = cv(); b = f
    c.limb(8, 6 + b, 15, 26 + b, 3.4, 2, 'u') if kind == 'troll' else None                # maczuga na ramieniu
    if kind == 'troll': c.ball(8, 6 + b, 4.4, 4.4, 'u'); c.dots([(5, 4 + b), (10, 3 + b), (11, 8 + b)], 'w')
    c.limb(18, 35, 17, 43, 4.2, 3.6, 'p', **FAR); c.rect(13, 42, 21, 45.5, 'p', bevel=.8, add=-.2)
    c.limb(18, 20 + b, 13, 28 + b, 4, 3.4, 'p', **FAR); c.limb(13, 28 + b, 15, 24 + b, 3.2, 3, 'p', **FAR)
    c.ball(24, 28 + b, 12, 11, 'p')
    c.ball(26, 31 + b, 8.5, 7, 'q', only='p', keep=True)                                  # brzuch
    c.limb(29, 35, 31, 43, 4.4, 3.8, 'p'); c.rect(27, 42, 36, 45.5, 'p', bevel=.8)
    c.poly([(14, 34 + b), (35, 34 + b), (34, 40), (30, 38), (26, 41), (21, 38), (16, 40)], 'r', bevel=.7)
    if kind == 'yeti':
        for (x, y) in [(13, 22), (15, 30), (33, 21), (35, 29), (20, 19), (28, 18)]: c.tri((x, y + b), (x + 1.5, y + 5 + b), (x + 3, y + b), 'p', add=.15)
    c.ball(30, 14 + b, 7, 6.6, 'p')
    if kind == 'yeti':
        c.ball(31.5, 15 + b, 4.6, 4.4, 'q'); c.tri((24, 9 + b), (22, 4 + b), (27, 8 + b), 't'); c.tri((33, 8 + b), (36, 3 + b), (36, 9 + b), 't')
    else:
        c.limb(24.5, 13 + b, 20, 11 + b, 2, 1, 'p'); c.limb(35, 12 + b, 39, 9 + b, 1.8, .9, 'p')   # uszy
    c.dots([(30, 13 + b), (31, 13 + b), (34, 13 + b), (35, 13 + b)], 'e'); c.dots([(29, 12 + b), (30, 12 + b), (31, 12 + b), (34, 12 + b), (35, 12 + b), (36, 12 + b)], 'k')
    c.rect(29, 17 + b, 36.5, 18.4 + b, 's', bevel=0, add=-.5)
    c.limb(30, 19 + b, 29.5, 15.5 + b, 1, .6, 't'); c.limb(36, 19 + b, 36.5, 15.5 + b, 1, .6, 't')   # kły
    c.limb(34, 21 + b, 40, 29 + b, 4.2, 3.6, 'p'); c.limb(40, 29 + b, 41, 36 + b - 2 * f, 3.4, 3.6, 'p')
    if kind == 'yeti':
        for d in (-2, 0, 2): c.limb(41, 38 + b - 2 * f, 41.5 + d, 41.5 + b - 2 * f, 1, .6, 't')
    return c
def yeti(f): return troll(f, 'yeti')

def goblin(f):
    c = cv(); b = f
    c.ball(15, 28 + b, 8.5, 9, 'q'); c.limb(15, 20 + b, 20, 23 + b, 1.2, 1.2, 'u'); c.line(11, 27 + b, 17, 34 + b, 'u', d=-1, only='q')   # worek
    c.dots([(12, 23 + b), (18, 31 + b)], 'g')
    c.limb(22, 37, 21, 43, 2.4, 2, 'p', **FAR); c.limb(20, 45, 25, 45, 1.3, 1.2, 's', **FAR)
    c.limb(29, 37, 30, 43, 2.6, 2.2, 'p'); c.limb(29, 45, 35, 45, 1.3, 1.2, 's')
    c.poly([(20, 26 + b), (32, 26 + b), (33, 38 + b), (19, 38 + b)], 'r', bevel=1.8)      # kubrak
    c.rect(19.5, 34 + b, 32.5, 36 + b, 's', bevel=.5)
    c.tri((22, 17 + b), (11, 11 + b), (22, 22 + b), 'p'); c.tri((35, 17 + b), (45, 10 + b), (34, 22 + b), 'p')   # uszy
    c.ball(28, 19 + b, 8, 7.4, 'p')
    c.chain([(33, 21 + b), (38, 23 + b)], 1.8, 1, 'p')
    c.dots([(29, 17 + b), (30, 17 + b), (30, 18 + b), (34, 17 + b), (35, 17 + b), (35, 18 + b)], 'e'); c.dots([(30, 18 + b), (35, 18 + b)], 'k')
    c.seg(27, 23 + b, 34, 24 + b, 'k'); c.dots([(28, 24 + b), (31, 24 + b), (33, 25 + b)], 'w')
    c.limb(31, 28 + b, 37, 31 + b - f, 2.2, 1.8, 'p'); c.limb(38, 30 + b - f, 44, 24 + b - 2 * f, 1.2, .6, 't'); c.limb(36, 31 + b - f, 39, 33 + b - f, .9, .9, 'u')
    return c

def chochlik(f):
    c = cv(); b = -f
    c.poly([(21, 22 + b), (8, 8 + b + 5 * f), (4, 20 + b + 4 * f), (9, 19 + b + 3 * f), (9, 27 + b + 2 * f), (14, 24 + b + f), (17, 30 + b)], 's', bevel=1.2)   # skrzydło
    c.chain([(20, 34 + b), (13, 38 + b), (9, 34 + b), (6, 37 + b)], 1.5, .8, 'p'); c.tri((6, 37 + b), (2, 35 + b), (4, 41 + b), 'p')   # ogon
    c.limb(22, 35 + b, 20, 41 + b, 2.2, 1.6, 'p', **FAR); c.limb(20, 41 + b, 23, 44 + b, 1.5, 1.2, 'p', **FAR)
    c.limb(28, 35 + b, 30, 41 + b, 2.4, 1.8, 'p'); c.limb(30, 41 + b, 34, 43 + b, 1.6, 1.2, 'p')
    c.ball(25, 30 + b, 6.4, 7, 'p'); c.ball(26, 32 + b, 4, 4.4, 'q', only='p', keep=True)
    c.tri((20, 13 + b), (16, 4 + b), (25, 10 + b), 't'); c.tri((31, 10 + b), (38, 3 + b), (35, 13 + b), 't')   # rogi
    c.tri((20, 19 + b), (13, 16 + b), (21, 23 + b), 'p'); c.tri((36, 19 + b), (43, 15 + b), (36, 23 + b), 'p')
    c.ball(28, 18 + b, 8, 7.4, 'p')
    c.dots([(27, 16 + b), (28, 17 + b), (29, 17 + b), (33, 17 + b), (34, 17 + b), (35, 16 + b)], 'e'); c.dots([(26, 15 + b), (27, 15 + b), (35, 15 + b), (36, 15 + b)], 'k')
    c.poly([(26, 21 + b), (36, 21 + b), (34, 24.5 + b), (28, 24.5 + b)], 's', bevel=0, add=-.5)
    c.dots([(27, 21 + b), (29, 21 + b), (31, 21 + b), (33, 21 + b), (35, 21 + b), (30, 23 + b), (32, 23 + b)], 'w')
    c.limb(30, 28 + b, 36, 30 + b, 1.8, 1.5, 'p'); c.limb(36, 30 + b, 40, 26 + b, 1.5, 1.2, 'p')
    c.limb(40, 39 + b, 41, 12 + b, .8, .8, 'u'); c.tri((39, 13 + b), (41, 7 + b), (43, 13 + b), 't'); c.limb(38, 14 + b, 38, 10 + b, .7, .5, 't'); c.limb(44, 14 + b, 44, 10 + b, .7, .5, 't')
    return c

def minotaur(f):
    c = cv(); b = f
    c.limb(41, 1 + b, 38, 44, 1.2, 1.2, 'u')                                              # topór
    c.poly([(41, 3 + b), (47, 1 + b), (47.5, 13 + b), (41, 11 + b)], 't', bevel=1.2); c.poly([(40, 3 + b), (34, 2 + b), (34, 12 + b), (40, 11 + b)], 't', bevel=1.2)
    c.limb(19, 34, 17, 40, 4, 3, 'p', **FAR); c.limb(17, 40, 19, 44, 2.6, 2.2, 'p', **FAR); c.rect(16, 43.4, 23, 45.6, 's', bevel=.5)
    c.limb(17, 20 + b, 12, 28 + b, 4, 3.4, 'p', **FAR); c.limb(12, 28 + b, 14, 34 + b, 3.2, 3, 'p', **FAR)
    c.poly([(14, 17 + b), (35, 17 + b), (31, 35 + b), (18, 35 + b)], 'p', bevel=3)
    c.ball(20, 23 + b, 5.6, 4.6, 'p', add=.1); c.ball(29, 23 + b, 5.6, 4.6, 'p', add=.1)   # piersi
    c.line(24.5, 20 + b, 24.5, 33 + b, 's', d=-1, only='p'); c.line(20, 30 + b, 29, 30 + b, 's', d=-1, only='p')
    c.limb(28, 34, 31, 40, 4.2, 3.2, 'p'); c.limb(31, 40, 30, 44, 2.8, 2.4, 'p'); c.rect(27, 43.4, 35, 45.6, 's', bevel=.5)
    c.poly([(17, 33 + b), (32, 33 + b), (33, 40), (29, 38), (25, 41), (21, 38), (17, 40)], 'r', bevel=.7); c.rect(17, 32 + b, 32, 34 + b, 'u', bevel=.5)
    c.chain([(24, 9 + b), (20, 5 + b), (20, 0 + b)], 2, .8, 't'); c.chain([(34, 9 + b), (39, 6 + b), (41, 1 + b)], 2, .8, 't')   # rogi
    c.ball(29, 12 + b, 7, 6, 'p')
    c.limb(31, 15 + b, 36, 18 + b, 4, 3.2, 'q')                                           # pysk
    c.dots([(36, 17 + b), (38, 18 + b)], 'k'); c.limb(34, 20 + b, 38, 21 + b, 1, 1, 'u')  # kółko w nosie
    c.dots([(29, 11 + b), (30, 11 + b), (33, 11 + b)], 'e'); c.dots([(28, 10 + b), (29, 10 + b), (30, 10 + b), (33, 10 + b), (34, 10 + b)], 'k')
    c.limb(33, 20 + b, 38, 27 + b, 4.2, 3.6, 'p'); c.limb(38, 27 + b, 39, 22 + b - f, 3.2, 3, 'p')
    return c

def golem(f, kind='kamien'):
    c = cv(); b = f
    c.limb(19, 35, 18, 42, 4.6, 4.4, 'p', **FAR); c.rect(13, 41, 23, 45.6, 'p', bevel=1, add=-.2)
    c.limb(13, 19 + b, 8, 30 + b, 5, 4.4, 'p', **FAR); c.ball(8, 35 + b, 5.2, 5.2, 'p', add=-.15)
    c.poly([(12, 14 + b), (37, 14 + b), (35, 34 + b), (15, 34 + b)], 'p', bevel=3.4)
    c.poly([(16, 31 + b), (34, 31 + b), (32, 38), (18, 38)], 'q', bevel=1.4)
    c.limb(30, 36, 31, 42, 4.8, 4.6, 'p'); c.rect(26, 41, 37, 45.6, 'p', bevel=1)
    c.ball(12, 15 + b, 6.4, 5.4, 'q'); c.ball(37, 15 + b, 6.4, 5.4, 'q')                  # barki
    if kind == 'krysztal':
        for (x, y, hgt) in [(8, 12, 9), (13, 10, 7), (36, 10, 8), (41, 12, 10)]: c.poly([(x - 2, y + b), (x, y - hgt + b), (x + 2.4, y + b)], 'r', bevel=.9, add=.15)
    if kind == 'magma':
        for (x, y) in [(9, 9), (14, 7), (37, 7), (41, 10)]: c.tri((x - 1.6, y + 4 + b), (x, y - 2 + b - 2 * f), (x + 1.6, y + 4 + b), 'r', add=.2); c.dot(x, y + b - f, 'h')
    c.ball(25, 10 + b, 6, 5.4, 'p')                                                       # głowa
    c.rect(21.5, 9 + b, 30.5, 11.4 + b, 's', bevel=0, add=-.5); c.dots([(23, 10 + b), (24, 10 + b), (28, 10 + b), (29, 10 + b)], 'e')
    c.ball(25, 23 + b, 4, 4, 's', add=-.4, k=.3); c.ball(25, 23 + b, 2.6, 2.6, 'r', add=.25)   # rdzeń
    c.dots([(24, 22 + b), (25, 22 + b)], 'h'); c.dots([(25, 24 + b), (26, 23 + b)], 'g')
    for (x0, y0, x1, y1) in [(16, 18, 21, 21), (29, 21, 34, 18), (18, 28, 22, 26), (28, 26, 33, 29), (25, 27, 25, 31)]: c.line(x0, y0 + b, x1, y1 + b, 'r' if kind == 'magma' else 's', d=(1 if kind == 'magma' else -2), only='p')
    c.limb(37, 19 + b, 42, 30 + b, 5.2, 4.6, 'p'); c.ball(42, 35 + b - 2 * f, 5.6, 5.6, 'p')
    c.line(40, 35 + b - 2 * f, 45, 35 + b - 2 * f, 's', d=-2, only='p')
    return c
def golem_krysztal(f): return golem(f, 'krysztal')
def golem_magma(f): return golem(f, 'magma')

def zywiolak(f):
    c = cv(); b = -f
    for (x, y, r) in [(9, 13 + 2 * f, 2.6), (40, 11 - 2 * f, 2.4), (7, 32 - f, 2), (42, 31 + 2 * f, 2.6), (24, 3 + f, 2)]:      # odłamki wokół
        c.poly([(x, y - r * 1.6), (x + r, y), (x, y + r * 1.6), (x - r, y)], 'q', bevel=.9)
    c.poly([(24, 44 + b), (17, 36 + b), (20, 30 + b), (28, 30 + b), (31, 36 + b)], 'p', bevel=1.6)   # dolny szpic
    c.poly([(13, 22 + b), (17, 12 + b), (31, 12 + b), (35, 22 + b), (31, 33 + b), (17, 33 + b)], 'p', bevel=3)   # tułów
    c.poly([(17, 12 + b), (24, 6 + b), (31, 12 + b), (24, 16 + b)], 'q', bevel=1.4)
    c.poly([(13, 22 + b), (6, 26 + b - 2 * f), (9, 18 + b - 2 * f)], 'q', bevel=.9); c.poly([(35, 22 + b), (42, 25 + b + 2 * f), (39, 17 + b + 2 * f)], 'q', bevel=.9)
    c.line(24, 16 + b, 24, 33 + b, 'q', d=2, only='p'); c.line(17, 12 + b, 24, 16 + b, 's', d=-1, only='pq'); c.line(31, 12 + b, 24, 16 + b, 's', d=-1, only='pq')
    c.poly([(19, 20 + b), (23, 19 + b), (23, 22 + b)], 's', bevel=0, add=-.5); c.poly([(29, 20 + b), (25, 19 + b), (25, 22 + b)], 's', bevel=0, add=-.5)
    c.dots([(21, 20 + b), (22, 20 + b), (26, 20 + b), (27, 20 + b)], 'e')
    c.ball(24, 27 + b, 2.4, 2.4, 'r', add=.2); c.dots([(23, 26 + b), (24, 26 + b)], 'h')
    return c

def grzyb(f):
    c = cv(); b = f
    c.limb(21, 38, 20, 44, 2.4, 2.2, 't', **FAR); c.limb(28, 38, 29, 44, 2.6, 2.4, 't')
    c.limb(18, 45, 23, 45, 1.3, 1.2, 't', **FAR); c.limb(27, 45, 33, 45, 1.3, 1.2, 't')
    c.ball(25, 31 + b, 7.4, 9, 't')                                                       # trzon
    c.limb(19, 30 + b, 13, 34 + b - 2 * f, 2, 1.5, 't', **FAR); c.limb(31, 30 + b, 38, 33 + b + 2 * f, 2, 1.5, 't')
    c.ball(24, 16 + b, 17, 11, 'p')                                                       # kapelusz
    c.rect(4, 22 + b, 44, 30, '.', bevel=0, only='p')
    c.poly([(8, 21 + b), (40, 21 + b), (37, 24 + b), (11, 24 + b)], 'q', bevel=.8)        # blaszki
    for x in range(12, 37, 3): c.line(x, 21 + b, x + .5, 24 + b, 's', d=-1.5, only='q')
    for (x, y, r) in [(14, 13, 2.6), (24, 8, 3), (33, 13, 2.4), (20, 17, 1.6), (29, 17, 1.4), (9, 18, 1.4)]: c.ball(x, y + b, r, r * .8, 'r', only='p', keep=True)
    c.dots([(23, 29 + b), (23, 30 + b), (28, 29 + b), (28, 30 + b)], 'e'); c.dots([(22, 28 + b), (23, 28 + b), (28, 28 + b), (29, 28 + b)], 'k')
    c.seg(23, 34 + b, 28, 34 + b, 'k'); c.dots([(24, 35 + b), (27, 35 + b)], 'k')
    c.dots([(7, 28 + 3 * f), (41, 27 + 4 * f), (37, 31 + 3 * f)], 'g')                    # zarodniki
    return c

# ---------------------------------------------------------------- skrzydlaci
import math
def fan(c, x, y, a0, a1, n, L0, L1, m, r=2.3, m2=None, **kw):
    """Wachlarz piór od barku (x, y): kąty a0→a1 (stopnie, 0 = w prawo, 90 = w dół), długości L0→L1."""
    for i in range(n):
        t = i / max(1, n - 1); a = math.radians(a0 + (a1 - a0) * t); L = L0 + (L1 - L0) * t
        c.limb(x, y, x + math.cos(a) * L, y + math.sin(a) * L, r, r * .45, (m2 if (m2 and i % 2) else m), **kw)
    c.ball(x, y, r + 1.2, r + 1.2, m, **kw)

def ptak(f, kind='sokol'):
    c = cv(); b = (1 if f else 0)
    if f: fan(c, 19, 24 + b, 150, 105, 5, 15, 11, 's', m2='q', add=-.15)
    else: fan(c, 19, 22 + b, 205, 262, 5, 13, 19, 's', m2='q', add=-.15)                  # dalsze skrzydło
    fan(c, 14, 28 + b, 160, 200, 3, 11, 12, 's', r=2)                                     # ogon
    c.ball(22, 27 + b, 9.5, 6.6, 'p')
    c.ball(25, 30 + b, 6.5, 3.6, 'q', only='p', keep=True)
    c.ball(32, 21 + b, 5.6, 5.2, 'p')
    c.poly([(36, 19.5 + b), (43.5, 22.5 + b), (36.5, 24 + b)], 't', bevel=.8); c.dot(42, 23 + b, 'k')
    c.dots([(33, 20 + b), (34, 20 + b)], 'e'); c.dots([(32, 19 + b), (33, 19 + b), (34, 19 + b), (35, 20 + b)], 'k')
    if kind == 'feniks':
        c.chain([(29, 16 + b), (25, 10 + b), (27, 5 + b)], 1.4, .7, 'r'); c.chain([(31, 16 + b), (30, 9 + b)], 1.2, .6, 'r'); c.dots([(27, 4 + b), (30, 7 + b), (3, 29 + b)], 'h')
    c.limb(22, 32 + b, 25, 37 + b, 1.2, 1, 't'); c.limb(27, 32 + b, 31, 36 + b, 1.2, 1, 't')
    for d in (-1.6, 0, 1.6): c.limb(25, 37 + b, 27 + .4 * d, 40 + b + d, .8, .5, 't'); c.limb(31, 36 + b, 33 + .4 * d, 39 + b + d, .8, .5, 't')
    if f: fan(c, 24, 25 + b, 155, 100, 6, 17, 12, 'p', m2='s')
    else: fan(c, 24, 23 + b, 200, 265, 6, 14, 21, 'p', m2='s')                            # bliższe skrzydło
    return c
def feniks(f): return ptak(f, 'feniks')

def harpia(f):
    c = cv(); b = (1 if f else 0); d = 22 * f
    fan(c, 19, 22 + b, 250 - d, 170 - d, 5, 12, 19, 'p', r=3.2, m2='s')                    # skrzydła na boki
    fan(c, 29, 22 + b, 290 + d, 370 + d, 5, 12, 19, 'p', r=3.2, m2='s')
    c.limb(21, 33 + b, 19, 39 + b, 2.6, 1.5, 'p'); c.limb(27, 33 + b, 29, 39 + b, 2.6, 1.5, 'p')
    for k in (-1.8, 0, 1.8): c.limb(19, 39 + b, 19 + k, 43.5 + b, .9, .5, 't'); c.limb(29, 39 + b, 29 + k, 43.5 + b, .9, .5, 't')
    c.ball(24, 28 + b, 6.4, 8, 'p')
    for (x, y) in [(21, 30), (25, 32), (27, 28), (22, 34)]: c.tri((x, y + b), (x + 1.5, y + 3 + b), (x + 3, y + b), 's')
    c.ball(24, 22.5 + b, 5, 3.4, 'u')
    c.chain([(21, 10 + b), (16, 15 + b), (15, 22 + b + f)], 3.4, 1.2, 'r'); c.chain([(29, 10 + b), (33, 15 + b), (34, 21 + b + f)], 3, 1.2, 'r')
    c.ball(25, 13 + b, 5.6, 5.8, 'u')
    c.ball(24.5, 9 + b, 5.6, 2.8, 'r')
    c.dots([(23, 13 + b), (27, 13 + b)], 'e'); c.dots([(22, 12 + b), (23, 12 + b), (27, 12 + b), (28, 12 + b)], 'k')
    c.rect(23.5, 16 + b, 27.5, 17.4 + b, 's', bevel=0, add=-.5); c.dots([(24, 16 + b), (26, 16 + b)], 'w')
    return c

# ---------------------------------------------------------------- pełzające i gady
def pelzacz(f):
    c = cv(); b = f
    pts = [(4, 40), (10, 37), (16, 39), (22, 36), (28, 38), (33, 34), (36, 28 + b)]
    for i, (x, y) in enumerate(pts[:-1]):
        c.limb(x + 1, y + 2, x - 1 + (f if i % 2 else -f), 45, 1.1, .6, 's', **FAR); 
    c.chain(pts, 3.2, 5, 'p')
    for i, (x, y) in enumerate(pts[1:-1]): c.line(x - 1.5, y - 5, x - 1, y + 4, 's', d=-1.5, only='p')
    c.chain([(6, 42), (16, 42), (27, 41), (33, 37)], 1.2, 1.6, 'q', only='p', keep=True)
    for i, (x, y) in enumerate(pts[:-1]):
        c.limb(x + 3, y + 3, x + 2 + (-f if i % 2 else f), 45.4, 1.2, .6, 's')
    c.ball(38, 25 + b, 6, 5.6, 'p')
    c.chain([(41, 27 + b), (46, 28 + b), (47, 32 + b - f)], 1.5, .7, 't'); c.chain([(40, 29 + b), (43, 33 + b), (46, 35 + b - 2 * f)], 1.5, .7, 't')   # żuwaczki
    c.chain([(37, 20 + b), (40, 14 + b), (45, 12 + b + f)], .8, .5, 'q'); c.chain([(35, 20 + b), (36, 13 + b), (40, 9 + b - f)], .8, .5, 'q')        # czułki
    c.dots([(40, 24 + b), (42, 25 + b)], 'k')
    return c

def skorpion(f, kind='zwykly'):
    c = cv(); b = f
    for i, x in enumerate((15, 20, 25, 30)):
        c.limb(x, 36, x - 3 + (f if i % 2 else -f), 31, 1.2, 1, 's', **FAR); c.limb(x - 3 + (f if i % 2 else -f), 31, x - 5, 44, 1, .7, 's', **FAR)
    c.chain([(11, 34), (6, 30), (5, 23), (8, 15 + b), (15, 10 + b), (23, 11 + b)], 3.4, 2.4, 'p')   # ogon
    for (x, y) in [(6, 27), (6, 19), (11, 12), (19, 10)]: c.line(x - 3, y + b * (y < 20), x + 3, y + 1 + b * (y < 20), 's', d=-1.5, only='p')
    c.chain([(23, 11 + b), (28, 13 + b), (30, 18 + b + f)], 2.2, .6, 't'); c.dot(30, 19 + b + f, 'g')   # kolec
    c.ball(21, 35, 12, 6.4, 'p')                                                          # tułów
    for x in (14, 19, 24): c.line(x, 29, x - 1, 41, 's', d=-1.5, only='p')
    c.ball(33, 36, 5.6, 5, 'p')
    if kind == 'kosc': c.ball(34, 35, 4.4, 4.2, 't'); c.dots([(35, 36), (36, 36), (33, 38), (35, 38)], 'k')
    c.dots([(35, 34), (37, 34)], 'e')
    for i, x in enumerate((14, 19, 24, 29)):
        c.limb(x, 38, x - 1 + (-f if i % 2 else f), 34, 1.4, 1.1, 's'); c.limb(x - 1 + (-f if i % 2 else f), 34, x - 3, 45, 1.1, .7, 's')
    c.limb(34, 32, 38, 26 + b, 1.8, 1.6, 'p', **FAR); c.ball(41, 23 + b, 3.6, 3, 'p', add=-.15)           # dalsze szczypce
    c.limb(35, 39, 41, 36 - b, 2, 1.8, 'p'); c.ball(43.5, 33 - b, 4.2, 3.6, 'p')
    c.tri((44, 31 - b), (48, 27 - b - f), (46, 32 - b), 't'); c.tri((45, 34 - b), (48, 34 - b + f), (45, 36 - b), 't')
    return c
def skorpion_kosc(f): return skorpion(f, 'kosc')

def dragon_head(c, x, y, b, f, horn='t', big=1.0):
    c.chain([(x - 3, y - 3 + b), (x - 8 * big, y - 8 * big + b)], 1.6 * big, .7, horn); c.chain([(x - 1, y - 4 + b), (x - 4 * big, y - 10 * big + b)], 1.5 * big, .6, horn)
    c.ball(x, y + b, 5.4 * big, 4.6 * big, 'p')
    c.limb(x + 2, y + .5 + b, x + 9 * big, y + 1.5 + b, 3.4 * big, 2.4 * big, 'p')        # pysk
    c.limb(x + 2, y + 4 * big + b, x + 8 * big, y + 4.4 * big + b + f * 1.5, 1.7 * big, 1.2 * big, 'q')   # żuchwa
    c.dots([(x + 1, y - 1 + b), (x + 2, y - 1 + b)], 'e'); c.dots([(x, y - 2 + b), (x + 1, y - 2 + b), (x + 2, y - 2 + b), (x + 3, y - 1 + b)], 'k')
    c.dot(x + round(9 * big), y + b, 'k')
    c.dots([(x + round(4 * big), y + round(3 * big) + b), (x + round(6 * big), y + round(3 * big) + b), (x + round(8 * big), y + round(3 * big) + b)], 'w')

def bat_wing(c, x, y, f, m, m2, span=18, k=1):
    """Błoniaste skrzydło: klatka 0 wzniesione, klatka 1 opuszczone."""
    up = -1 if not f else -.35
    tip = (x - span * .75, y + up * span); mid = (x - span * 1.1, y + up * span * .45); low = (x - span * .9, y + up * span * .05 + 6)
    c.poly([(x, y), tip, (tip[0] - 2, tip[1] + 5), mid, (mid[0], mid[1] + 5), low, (x - span * .45, y + 6), (x - 2, y + 5)], m2, bevel=1.2, add=-.08 * (k == 0))
    for p in (tip, mid, low): c.limb(x, y, p[0], p[1], 1.3, .6, m)

def wywerna(f):
    c = cv(); b = f
    bat_wing(c, 21, 20 + b, f, 's', 'r', span=17, k=0)
    c.chain([(15, 32 + b), (9, 37), (5, 34), (2, 28 + 2 * f)], 3.4, 1, 'p'); c.tri((2, 28 + 2 * f), (-1, 23 + 2 * f), (4, 25 + 2 * f), 't')    # ogon z kolcem
    c.limb(18, 34, 16, 40, 3.4, 2.2, 'p', **FAR); c.limb(16, 40, 19, 44.5, 2, 1.6, 'p', **FAR)
    c.ball(21, 29 + b, 9, 7.4, 'p'); c.ball(23, 32 + b, 6.4, 4, 'q', only='p', keep=True)
    c.limb(24, 35, 26, 40, 3.6, 2.4, 'p'); c.limb(26, 40, 25, 44.5, 2.2, 1.8, 'p')
    for d in (0, 2.5): c.limb(25, 45, 28 + d, 45.4, 1, .6, 't'); c.limb(19, 45, 21 + d, 45.4, 1, .6, 't')
    c.chain([(27, 26 + b), (31, 20 + b), (32, 14 + b)], 4.2, 3, 'p')
    c.chain([(29, 28 + b), (33, 22 + b), (34, 16 + b)], 1.5, 1.3, 'q', only='p', keep=True)
    for (x, y) in [(26, 21), (27, 16), (29, 12)]: c.tri((x, y + b + 2), (x - 3, y + b - 1), (x + 1, y + b - 1), 't')
    dragon_head(c, 34, 11, b, f)
    bat_wing(c, 24, 22 + b, f, 'p', 'r', span=19)
    return c

def smok(f):
    c = cv(); b = f
    bat_wing(c, 22, 21 + b, f, 's', 'r', span=16, k=0)
    c.chain([(13, 31 + b), (7, 36), (3, 41), (1, 44 - 2 * f)], 4, 1, 'p')
    c.limb(14, 34, 12, 40, 3.6, 2.6, 'p', **FAR); c.limb(12, 40, 14, 44.5, 2.2, 2, 'p', **FAR)
    c.limb(30, 34, 32 + f, 44, 2.8, 2.2, 'p', **FAR)
    c.ball(20, 29 + b, 11.5, 7.6, 'p'); c.ball(28, 28 + b, 7, 7.6, 'p')
    c.ball(22, 33 + b, 9, 3.4, 'q', only='p', keep=True)
    for x in (14, 18, 22): c.tri((x, 22.5 + b), (x + 1.5, 18 + b), (x + 3.5, 22.5 + b), 't')
    c.limb(17, 33, 15, 40, 4, 2.8, 'p'); c.limb(15, 40, 18, 44.5, 2.4, 2.2, 'p')
    c.limb(27, 34, 27 - f, 44.2, 3.2, 2.4, 'p')
    for x in (17, 27 - f): c.limb(x, 45, x + 3, 45.4, 1, .6, 't')
    c.chain([(30, 24 + b), (34, 18 + b), (35, 12 + b)], 4.6, 3.2, 'p')
    c.chain([(32, 26 + b), (36, 20 + b), (37, 14 + b)], 1.6, 1.3, 'q', only='p', keep=True)
    for (x, y) in [(29, 19), (30, 14)]: c.tri((x, y + b + 2), (x - 3, y + b - 1), (x + 1, y + b - 1), 't')
    dragon_head(c, 36, 9, b, f)
    bat_wing(c, 24, 21 + b, f, 'p', 'r', span=19)
    return c

def pomiot(f):
    c = cv(); b = -f
    for i, (x, e2) in enumerate([(14, 6), (19, 12), (25, 15), (31, 11), (36, 5)]):
        w = (1 if i % 2 else -1) * (2 * f - 1)
        c.chain([(x, 26 + b), (x + w, 33 + b), (x - w + (x - 25) * .2, 39), (x + 2 * w + (x - 25) * .3, 44 - (i % 2) * 2)], 2.4, .8, 'p' if i % 2 == 0 else 's')
    c.ball(25, 19 + b, 14, 12, 'p')
    for (x, y, r) in [(13, 15, 1.6), (36, 14, 1.4), (17, 27, 1.3), (33, 26, 1.5), (25, 8, 1.2)]: c.ball(x, y + b, r, r, 'q', only='p', keep=True)
    c.ball(26, 19 + b, 7.6, 7, 'q', k=.5, add=.3)                                         # oko
    c.ball(27 + f, 19 + b, 4, 4.4, 'r'); c.ball(27.5 + f, 19 + b, 1.8, 2.6, 's', add=-.6, ao=False)
    c.dots([(25 + f, 17 + b), (26 + f, 17 + b)], 'w')
    c.dots([(8, 6 + 2 * f), (41, 8 - f), (5, 24 + f), (44, 22 - 2 * f), (38, 1 + f)], 'g'); c.dots([(8, 5 + 2 * f), (44, 21 - 2 * f)], 'h')
    return c

# ---------------------------------------------------------------- towarzysze (i gryf)
def gryf(f):
    c = cv(); b = f
    if f: fan(c, 20, 23 + b, 160, 110, 5, 15, 11, 's', m2='q', add=-.15)
    else: fan(c, 20, 21 + b, 205, 258, 5, 13, 19, 's', m2='q', add=-.15)
    c.chain([(10, 28 + b), (5, 31 + b), (3, 37 + b), (5, 41 + b - 2 * f)], 1.5, 1, 'r'); c.ball(5, 41 + b - 2 * f, 2.2, 2.2, 's')   # ogon lwa
    c.limb(13, 31, 11, 38, 3.4, 2.4, 'r', **FAR); c.limb(11, 38, 13, 44.5, 2.2, 2, 'r', **FAR)
    c.limb(30, 32, 32 + f, 43, 2.2, 1.6, 't', **FAR)
    c.ball(19, 28 + b, 10.5, 7, 'r'); c.ball(28, 26 + b, 8, 8, 'p')
    c.limb(16, 31, 14, 38, 3.6, 2.6, 'r'); c.limb(14, 38, 17, 44.5, 2.4, 2.2, 'r')
    c.limb(27, 33, 27 - f, 43, 2.4, 1.8, 't')
    for x in (27 - f, 32 + f):
        for d in (-1.6, 0, 1.6): c.limb(x, 43, x + 2 + .3 * d, 45 + .4 * d, .9, .5, 't')
    for (x, y) in [(24, 29), (28, 31), (31, 28), (26, 25)]: c.tri((x, y + b), (x + 1.5, y + 3.5 + b), (x + 3, y + b), 'q')        # pióra na piersi
    c.ball(32, 17 + b, 6.2, 6, 'p')
    c.tri((28, 13 + b), (26, 7 + b), (31, 11 + b), 'p')
    c.poly([(36, 15 + b), (44, 18.5 + b), (42.5, 22 + b), (37, 20.5 + b)], 't', bevel=1); c.dot(42, 22 + b, 'k')
    c.dots([(34, 16 + b), (35, 16 + b)], 'e'); c.dots([(33, 15 + b), (34, 15 + b), (35, 15 + b), (36, 16 + b)], 'k')
    if f: fan(c, 24, 24 + b, 165, 105, 6, 17, 12, 'p', m2='s')
    else: fan(c, 24, 22 + b, 200, 262, 6, 14, 21, 'p', m2='s')
    return c

def zolw(f):
    c = cv(); b = f
    c.limb(13, 37, 11, 44, 3, 2.6, 'p', **FAR); c.limb(30, 37, 32, 44, 3, 2.6, 'p', **FAR)
    c.limb(9, 34, 4, 37, 2, 1, 'p')
    c.ball(21, 29, 15, 12, 'q')                                                           # skorupa
    c.rect(4, 36, 38, 46, '.', bevel=0, only='q')
    c.poly([(7, 35), (35, 35), (33, 38.5), (9, 38.5)], 'r', bevel=.9)
    for (x, y, r) in [(21, 24, 4.6), (12, 28, 3.6), (30, 28, 3.6), (16, 32, 2.6), (26, 32, 2.6)]: c.ball(x, y, r, r * .85, 'r', only='q', keep=True); c.ball(x, y, r - 1.1, (r - 1.1) * .85, 'q', only='r', keep=True)
    c.limb(17, 38, 16, 44, 3.2, 2.8, 'p'); c.limb(27, 38, 28, 44, 3.2, 2.8, 'p')
    c.limb(34, 33, 40 + b, 29, 3.2, 2.8, 'p'); c.ball(42 + b, 27, 4.6, 4.2, 'p')
    c.dots([(43 + b, 26), (44 + b, 26)], 'e'); c.dots([(43 + b, 25), (44 + b, 25)], 'k'); c.seg(43 + b, 29, 46 + b, 29, 'k')
    return c

def jaszczur(f):
    c = cv(); b = f
    c.chain([(13, 33), (7, 36), (3, 41 - 2 * f), (1, 37 - 3 * f)], 3.6, .9, 'p')
    c.limb(15, 34, 12, 39, 2.8, 2, 'p', **FAR); c.limb(12, 39, 15, 44.5, 1.8, 1.6, 'p', **FAR)
    c.limb(30, 34, 33 + f, 44, 2.4, 1.8, 'p', **FAR)
    c.ball(21, 31 + b, 11, 6.2, 'p'); c.ball(23, 34 + b, 8.5, 2.8, 'q', only='p', keep=True)
    for x in range(12, 31, 3): c.tri((x, 26 + b), (x + 1.2, 22 + b + (x % 2)), (x + 3, 26 + b), 'r')
    c.limb(18, 35, 16, 40, 3, 2.2, 'p'); c.limb(16, 40, 19, 44.5, 2, 1.8, 'p')
    c.limb(28, 35, 28 - f, 44.2, 2.6, 2, 'p')
    c.chain([(30, 29 + b), (34, 25 + b)], 4.4, 3.6, 'p')
    c.ball(37, 23 + b, 5.6, 4.6, 'p'); c.limb(39, 24 + b, 45, 25 + b, 3, 2.2, 'p'); c.limb(39, 27 + b, 44, 27.6 + b + f, 1.5, 1.1, 'q')
    c.dots([(38, 21 + b), (39, 21 + b)], 'e'); c.dots([(37, 20 + b), (38, 20 + b), (39, 20 + b), (40, 21 + b)], 'k'); c.dots([(42, 26 + b), (44, 26 + b)], 'w')
    c.seg(45, 27 + b, 47, 28 + b + f, 'g')
    for (x, y) in [(15, 30), (20, 29), (25, 30)]: c.ball(x, y + b, 1.4, 1.1, 's', only='p', keep=True)
    return c

def sowa(f):
    c = cv(); b = f
    fan(c, 13, 26 + b, 100 + 30 * f, 150 + 30 * f, 4, 12, 14, 's', r=2.8)
    fan(c, 35, 26 + b, 80 - 30 * f, 30 - 30 * f, 4, 12, 14, 's', r=2.8)
    c.ball(24, 30 + b, 10, 11, 'p')
    c.ball(24, 33 + b, 7, 7.5, 'q', only='p', keep=True)
    for (x, y) in [(20, 30), (25, 31), (22, 35), (27, 35), (19, 37)]: c.dots([(x, y + b), (x + 1, y + 1 + b)], 'k') if False else c.line(x, y + b, x + 2, y + b, 's', d=-1, only='q')
    c.ball(24, 17 + b, 10, 8.4, 'p')
    c.tri((15, 12 + b), (13, 5 + b), (20, 10 + b), 'p'); c.tri((33, 12 + b), (35, 5 + b), (28, 10 + b), 'p')
    c.ball(19.5, 17 + b, 4.4, 4.4, 'q'); c.ball(28.5, 17 + b, 4.4, 4.4, 'q')
    c.ball(19.5, 17 + b, 2.6, 2.6, 't', k=.3, add=.2); c.ball(28.5, 17 + b, 2.6, 2.6, 't', k=.3, add=.2)
    c.dots([(19, 16 + b), (19, 17 + b), (20, 17 + b), (28, 16 + b), (28, 17 + b), (29, 17 + b)], 'k'); c.dots([(20, 16 + b), (29, 16 + b)], 'w')
    c.tri((22.5, 20 + b), (24, 24 + b), (25.5, 20 + b), 't')
    for x in (20, 28):
        for d in (-1.6, 0, 1.6): c.limb(x, 41 + b, x + d, 44.5, .9, .6, 't')
    return c

def kon(f, kind='kon'):
    c = cv(); b = f
    c.chain([(8, 23 + b), (4, 28 + b), (4 - f, 37)], 2.6, 1.2, 's')                       # ogon
    c.limb(12, 30, 10, 37, 3, 2, 'p', **FAR); c.limb(10, 37, 11 - f, 44, 1.8, 1.6, 'p', **FAR)
    c.limb(29, 31, 32 + f, 38, 2.6, 1.8, 'p', **FAR); c.limb(32 + f, 38, 31 + 2 * f, 44, 1.7, 1.5, 'p', **FAR)
    c.ball(19, 26 + b, 11.5, 7, 'p'); c.ball(27, 25 + b, 7, 7.4, 'p')
    c.limb(15, 30, 14, 37, 3.4, 2.2, 'p'); c.limb(14, 37, 16 + f, 44, 2, 1.7, 'p')
    c.limb(26, 31, 26 - f, 38, 2.8, 2, 'p'); c.limb(26 - f, 38, 26 - 2 * f, 44, 1.8, 1.6, 'p')
    for x in (11 - f, 16 + f, 26 - 2 * f, 31 + 2 * f): c.rect(x - 1.6, 43.4, x + 2, 45.6, 's', bevel=.5)
    c.poly([(14, 20 + b), (24, 19.5 + b), (25, 27 + b), (14, 28 + b)], 'r', bevel=1.2)    # czaprak
    c.rect(16, 18.5 + b, 23, 21 + b, 't', bevel=.9)                                       # siodło
    c.chain([(28, 22 + b), (33, 14 + b), (35, 9 + b)], 4.6, 3.2, 'p')                     # szyja
    c.chain([(27, 17 + b), (31, 10 + b), (33, 5 + b)], 2.2, 1.6, 's')                     # grzywa
    c.ball(37, 9 + b, 4.6, 4, 'p'); c.limb(38, 11 + b, 43, 16 + b, 3.6, 2.6, 'p')
    c.tri((34, 5 + b), (35, 0 + b), (37.5, 5 + b), 'p')
    if kind == 'rog': c.limb(39, 6 + b, 44, 1 + b, 1.3, .5, 'r')
    c.dots([(38, 9 + b), (39, 9 + b)], 'e'); c.dot(43, 16 + b, 'k')
    c.line(37, 12 + b, 42, 12 + b, 't', d=0, only='p'); c.line(39, 12 + b, 32, 21 + b, 't', d=0)   # uzda
    return c
def jednorozec(f): return kon(f, 'rog')

def mis(f):
    c = cv(); b = f
    c.limb(13, 33, 12, 43, 4.4, 3.6, 'p', **FAR); c.limb(31, 33, 33 + f, 43, 4, 3.4, 'p', **FAR)
    c.ball(20, 28 + b, 14, 10.5, 'p'); c.ball(30, 26 + b, 9, 9.5, 'p')
    c.ball(21, 34 + b, 10, 3.6, 'q', only='p', keep=True)
    c.limb(17, 34, 16, 43, 4.8, 4, 'p'); c.limb(27, 34, 27 - f, 43, 4.4, 3.8, 'p')
    for x in (16, 27 - f):
        for d in (-2, 0, 2): c.limb(x + d + 1, 44, x + d + 2, 45.6, .9, .5, 's')
    c.poly([(14, 19 + b), (27, 18 + b), (28, 27 + b), (14, 28 + b)], 'r', bevel=1.4); c.rect(14, 22 + b, 28, 23.4 + b, 't', bevel=.5)   # pancerz na grzbiecie
    c.ball(36, 20 + b, 7, 6.4, 'p')
    c.ball(31.5, 14.5 + b, 2.4, 2.4, 'p'); c.ball(38, 13.5 + b, 2.2, 2.2, 'p')
    c.limb(39, 22 + b, 45, 23.5 + b, 3.2, 2.4, 'q'); c.dots([(46, 22 + b), (46, 23 + b)], 'k')
    c.dots([(38, 18 + b), (39, 18 + b)], 'e'); c.dots([(37, 17 + b), (38, 17 + b), (39, 17 + b)], 'k')
    c.seg(41, 26 + b, 45, 26 + b + f, 'k'); c.dots([(42, 26 + b), (44, 26 + b)], 'w') if f else None
    return c
