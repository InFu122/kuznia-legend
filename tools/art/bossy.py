# Bossowie krain 64×64 — każdy z własnym wyglądem (bryły z vol.py; ci sami co w foes.py „po sąsiedzku”, tylko więksi i bogatsi).
# Część bossów to powiększony szablon moba z dodatkami (golem, gryf, skorpion, smok) — rysowany w siatce 48 i skalowany.
import sys, math; sys.path.insert(0, '.')
from vol import V
import foes
from foes import fan, FAR

def cv(): return V(64, 64, flip=True)
def big(fn, f, **kw):
    foes.BIG = True
    try: return fn(f, **kw)
    finally: foes.BIG = False

def herszt(f):
    c = cv(); b = f
    c.limb(26, 46, 25, 57, 4.4, 3.8, 's', **FAR); c.rect(20, 56, 30, 61.5, 'u', bevel=1, add=-.2)
    c.limb(38, 46, 40, 57, 4.6, 4, 's'); c.rect(36, 56, 47, 61.5, 'u', bevel=1)
    c.poly([(19, 22 + b), (45, 22 + b), (47 + f, 50), (16 - f, 52)], 'r', bevel=2)        # płaszcz
    c.limb(22, 27 + b, 15, 37 + b, 4.4, 3.8, 'p', **FAR); c.ball(14, 40 + b, 3, 3, 't', add=-.15)
    c.limb(13, 44 + b, 10, 31 + b, 1.2, .7, 'x'); c.limb(11, 41 + b, 16, 42 + b, 1, 1, 'u')   # sztylet w tylnej dłoni
    c.poly([(22, 24 + b), (43, 24 + b), (41, 46 + b), (24, 46 + b)], 'p', bevel=3)        # skórzany pancerz
    c.ball(32.5, 31 + b, 9, 7, 'p', add=.06)
    for x in (27, 32, 37): c.ball(x, 37 + b, 1.3, 1.3, 'x'); c.ball(x, 41 + b, 1.3, 1.3, 'x')   # ćwieki
    c.line(23, 26 + b, 41, 44 + b, 'u', d=-1, only='p'); c.line(24, 27 + b, 42, 45 + b, 'u', d=0, only='p')   # pas na skos
    c.rect(24, 44 + b, 41, 47.5 + b, 'u', bevel=.8); c.rect(30, 43.6 + b, 35, 48 + b, 'x', bevel=.8)
    c.ball(21, 25 + b, 7.5, 5.6, 'q'); c.ball(44, 25 + b, 7.5, 5.6, 'q')                  # futrzany kołnierz
    for x in range(15, 50, 4): c.tri((x, 27 + b), (x + 1.5, 32 + b), (x + 3.5, 27 + b), 'q')
    c.ball(33, 14 + b, 7.6, 7.8, 't')                                                     # głowa
    c.poly([(26, 16 + b), (41, 16 + b), (40, 23 + b), (34, 26 + b), (28, 23 + b)], 's', bevel=1.2)   # broda
    c.poly([(25, 9 + b), (41, 8 + b), (41.5, 12 + b), (25.5, 13 + b)], 'r', bevel=1, add=.1)        # chusta
    c.ball(33, 8 + b, 7.6, 3.6, 'r', add=.1); c.chain([(26, 11 + b), (21, 14 + b), (19 - f, 19 + b)], 1.6, .8, 'r')
    c.dots([(36, 15 + b), (37, 15 + b)], 'e'); c.dots([(35, 14 + b), (36, 14 + b), (37, 14 + b), (38, 14 + b)], 'k')
    c.rect(29, 13.5 + b, 32.6, 16.5 + b, 'u', bevel=0, add=-.5); c.line(25, 12 + b, 33, 15 + b, 'u', d=-2, only='tr')   # opaska na oko
    c.seg(34, 21 + b, 38, 21 + b, 'k'); c.dot(37, 22 + b, 'w')
    c.limb(43, 28 + b, 50, 36 + b, 4.6, 4, 'p'); c.limb(50, 36 + b, 53, 29 + b - 2 * f, 3.6, 3.2, 't')
    c.poly([(51, 26 + b - 2 * f), (55, 27 + b - 2 * f), (60, 6 + b - 2 * f), (57, 2 + b - 2 * f), (52, 8 + b - 2 * f)], 'x', bevel=1.4)   # tasak
    c.limb(49, 27 + b - 2 * f, 57, 29 + b - 2 * f, 1.2, 1.2, 'u'); c.dots([(57, 5 + b - 2 * f), (56, 8 + b - 2 * f)], 'w')
    return c

def wilkolak(f):
    c = cv(); b = f
    c.chain([(17, 42 + b), (9, 46), (5, 41 - 2 * f)], 3.4, 1.4, 'p')
    c.limb(24, 44, 20, 51, 4.4, 3, 'p', **FAR); c.limb(20, 51, 24, 58, 2.6, 2.2, 'p', **FAR); c.limb(23, 60, 30, 60.5, 2, 1.6, 'p', **FAR)
    c.limb(23, 26 + b, 14, 36 + b, 4.4, 3.4, 'p', **FAR); c.limb(14, 36 + b, 12, 46 + b, 3.2, 2.6, 'p', **FAR)
    for d in (-2.4, 0, 2.4): c.limb(12, 47 + b, 11 + d, 52 + b, 1.1, .6, 't')
    c.ball(27, 27 + b, 12, 10, 'p'); c.ball(30, 38 + b, 8.5, 8, 'p')                      # garb i tułów
    c.ball(33, 34 + b, 6.5, 8, 'q', only='p', keep=True)
    for x in (17, 21, 25, 29): c.tri((x, 19 + b), (x + 1.5, 13 + b), (x + 4.5, 19 + b), 's')
    c.poly([(22, 44 + b), (39, 44 + b), (40, 52), (35, 50), (31, 54), (27, 50), (22, 53)], 'r', bevel=.8)   # podarte spodnie
    c.limb(34, 46, 39, 52, 4.6, 3.2, 'p'); c.limb(39, 52, 36, 58, 2.8, 2.4, 'p'); c.limb(35, 60, 43, 60.5, 2.2, 1.7, 'p')
    for x in (29, 42): c.dots([(x, 61), (x + 2, 61)], 'w')
    c.ball(40, 22 + b, 8.6, 8, 'p')                                                       # głowa
    c.tri((34, 17 + b), (33, 6 + b), (39, 14 + b), 's'); c.tri((38, 15 + b), (41, 4 + b), (45, 14 + b), 'p')
    c.limb(44, 24 + b, 54, 26 + b, 4.6, 3.2, 'p')                                         # pysk
    c.limb(44, 29.5 + b, 52, 31 + b + 2 * f, 2.4, 1.6, 's')
    c.rect(46, 27.6 + b, 54, 29 + b + f, 'r', bevel=0, add=-.35)
    c.dots([(47, 27 + b), (49, 27 + b), (51, 27 + b), (53, 27 + b), (48, 29 + b + 2 * f), (50, 29 + b + 2 * f), (52, 29 + b + 2 * f)], 'w')
    c.dots([(44, 20 + b), (45, 20 + b), (46, 21 + b)], 'e'); c.dots([(43, 19 + b), (44, 19 + b), (45, 19 + b), (46, 20 + b), (47, 21 + b)], 'k')
    c.dots([(56, 24 + b), (57, 25 + b), (56, 25 + b)], 'k')
    for (x, y) in [(33, 27), (36, 30), (33, 31)]: c.tri((x, y + b), (x + 1, y + 4 + b), (x + 3.5, y + b), 'q')
    c.limb(35, 29 + b, 44, 39 + b, 4.6, 3.6, 'p'); c.limb(44, 39 + b, 51, 37 + b - 3 * f, 3.4, 2.8, 'p')
    for d in (-2.6, 0, 2.6): c.limb(52, 37 + b - 3 * f, 57, 36 + b - 3 * f + d, 1.2, .6, 't')
    return c

def wiedzma(f):
    c = cv(); b = (-1 if f else 0)
    c.limb(4, 43 + b, 60, 37 + b, 1.4, 1.4, 'u')                                          # miotła
    fan(c, 8, 43 + b, 150 + 8 * f, 210 - 8 * f, 5, 10, 10, 'x', r=2)
    c.rect(11, 40 + b, 14, 46 + b, 'r', bevel=.6)
    c.poly([(22, 26 + b), (10 - 2 * f, 30 + b), (6, 40 + b - 2 * f), (14, 37 + b), (12, 45 + b), (22, 40 + b), (30, 42 + b)], 's', bevel=1.6)   # peleryna na wietrze
    c.limb(30, 40 + b, 40, 44 + b, 4.2, 3.4, 'p'); c.limb(40, 44 + b, 43, 52 + b, 2.6, 2, 'q'); c.limb(42, 54 + b, 48, 54.5 + b, 2, 1.6, 's')   # noga, pasiasta pończocha, but
    for y in (46, 49): c.line(39, y + b, 44, y + b + 1, 'r', d=0, only='q')
    c.poly([(23, 24 + b), (39, 24 + b), (42, 42 + b), (22, 43 + b)], 'p', bevel=2.6)
    c.ball(31, 31 + b, 8, 7, 'p', add=.05)
    c.rect(24, 36 + b, 41, 38.6 + b, 'r', bevel=.7); c.ball(32, 37.3 + b, 1.8, 1.8, 'x')
    c.ball(36, 15 + b, 7.4, 7.6, 't')                                                     # twarz
    c.chain([(41, 16 + b), (47, 19 + b), (48, 22 + b)], 2, .9, 't'); c.dot(46, 16 + b, 'k')   # nos z brodawką
    c.poly([(36, 21 + b), (42, 22 + b), (40, 27 + b), (36, 25 + b)], 't', bevel=1)        # podbródek
    c.dots([(39, 13 + b), (40, 13 + b), (40, 14 + b)], 'e'); c.dots([(38, 12 + b), (39, 12 + b), (40, 12 + b), (41, 13 + b)], 'k')
    c.seg(38, 21 + b, 42, 20 + b, 'k'); c.dot(40, 21 + b, 'w')
    c.chain([(30, 12 + b), (25, 20 + b), (24 - f, 30 + b)], 3.4, 1.4, 'x'); c.chain([(33, 18 + b), (30, 26 + b)], 2, 1.1, 'x')   # siwe włosy
    c.ball(35, 9.5 + b, 14, 3.2, 'p'); c.rect(21, 9 + b, 49, 12 + b, '.', bevel=0, only=None) if False else None
    c.poly([(27, 9 + b), (43, 8 + b), (39, 0 + b), (30, -8 + b), (25, -10 + b + f), (30, -1 + b)], 'p', bevel=1.6)
    c.rect(28, 5.5 + b, 42.4, 8.5 + b, 'r', bevel=.6); c.rect(33, 5 + b, 37, 9 + b, 'x', bevel=.6)
    c.limb(38, 28 + b, 46, 33 + b, 3.6, 3, 'p'); c.ball(48, 35 + b, 2.6, 2.6, 't')        # dłoń na miotle
    c.limb(26, 27 + b, 20, 20 + b - 2 * f, 3.4, 2.8, 'p', **FAR); c.ball(19, 18 + b - 2 * f, 2.4, 2.4, 't')
    c.ball(16, 12 + b - 2 * f, 4.4, 4.4, 'x', add=.2, k=.5); c.ball(16, 12 + b - 2 * f, 2.6, 2.6, 'x', add=.4, ao=False)   # kula jadu
    c.dots([(15, 10 + b - 2 * f), (16, 11 + b - 2 * f)], 'h'); c.dots([(10, 7 + b), (22, 6 + b - f), (12, 18 + b + f)], 'g')
    return c

def upadly(f):
    c = cv(); b = f
    c.poly([(19, 20 + b), (42, 20 + b), (46 + f, 54), (40, 50), (36, 57), (30, 51), (24, 58), (19, 51), (13 - f, 56)], 's', bevel=2)   # podarty płaszcz
    c.limb(27, 44, 26, 57, 4.4, 3.8, 'p', **FAR); c.rect(21, 56, 31, 61.5, 'p', bevel=1, add=-.2)
    c.limb(38, 44, 40, 57, 4.6, 4, 'p'); c.rect(36, 56, 47, 61.5, 'p', bevel=1); c.ball(40, 50, 3.6, 3.2, 'q')
    c.poly([(22, 22 + b), (43, 22 + b), (41, 45 + b), (24, 45 + b)], 'p', bevel=3.2)
    c.ball(32.5, 29 + b, 9, 7, 'p', add=.08); c.line(32.5, 24 + b, 32.5, 43 + b, 'q', d=-2, only='p')
    for y in (36, 39, 42): c.line(26, y + b, 39, y + b, 'q', d=-1, only='p')
    c.rect(24, 43 + b, 41, 46.6 + b, 'q', bevel=.8); c.ball(32.5, 44.8 + b, 2.4, 2.4, 'r', add=.2)
    c.poly([(25, 46 + b), (40, 46 + b), (42, 53), (33, 50), (23, 53)], 'q', bevel=1)
    c.ball(21, 23 + b, 7, 5.6, 'q'); c.ball(44, 23 + b, 7, 5.6, 'q')
    for (x, dx) in ((17, -3), (22, -1), (43, 1), (48, 3)): c.tri((x - 2, 19 + b), (x + dx, 11 + b), (x + 2, 19 + b), 'q')   # kolce naramienników
    c.ball(33, 12 + b, 8, 8.6, 'p')
    c.rect(28, 17 + b, 41, 22 + b, 'p', bevel=1)
    c.chain([(27, 8 + b), (21, 5 + b), (19, -1 + b)], 2.4, .8, 'q'); c.chain([(39, 7 + b), (45, 4 + b), (47, -2 + b)], 2.4, .8, 'q')   # rogi hełmu
    c.rect(30.5, 11 + b, 41.5, 13.6 + b, 's', bevel=0, add=-.6); c.dots([(33, 12 + b), (34, 12 + b), (38, 12 + b), (39, 12 + b)], 'e')
    for x in (33, 36, 39): c.line(x, 15 + b, x, 21 + b, 's', d=-2, only='p')
    c.limb(22, 26 + b, 15, 35 + b, 4.2, 3.6, 'p', **FAR); c.ball(14, 38 + b, 3.4, 3.4, 'q', add=-.1)
    c.limb(43, 26 + b, 50, 34 + b, 4.4, 3.8, 'p'); c.ball(51, 37 + b, 3.6, 3.6, 'q')
    c.poly([(49.5, 34 + b), (53.5, 34 + b), (54.5, 6 + b - f), (51.5, 0 + b - f), (48.5, 6 + b - f)], 'x', bevel=1.4)   # miecz dwuręczny
    c.line(51.5, 6 + b, 51.5, 32 + b, 'r', d=2, only='x'); c.dots([(51, 10 + b), (51, 18 + b), (51, 26 + b)], 'h')
    c.limb(45, 35 + b, 58, 35 + b, 1.6, 1.6, 'q'); c.limb(51.5, 37 + b, 51.5, 43 + b, 1.4, 1.4, 'u'); c.ball(51.5, 44 + b, 2, 2, 'r')
    c.dots([(47, 3 + b - 2 * f), (57, 10 + b - f), (46, 14 + b + f)], 'g')
    return c

def golem_boss(f):
    c = big(foes.golem, f)
    b = f
    for (x, y, h) in [(7, 11, 6), (12, 8, 8), (17, 9, 5), (33, 8, 6), (38, 7, 9), (43, 11, 6)]: c.poly([(x - 2.4, y + 3 + b), (x, y - h + b), (x + 2.6, y + 3 + b)], 'u', bevel=1)   # skalne iglice
    for (x, y, r) in [(10, 17, 2.6), (39, 18, 2.2), (17, 30, 2), (33, 33, 2.4), (8, 31, 1.8), (30, 13, 1.6)]: c.ball(x, y + b, r, r * .7, 'v', ao=False)   # mech
    for (x, y) in [(18, 17), (32, 17), (22, 29), (28, 29)]: c.dot(x, y + b, 'g')
    c.dots([(21, 19 + b), (29, 19 + b)], 'h')
    return c

def olbrzym(f):
    c = cv(); b = f
    c.limb(9, 2 + b, 17, 34 + b, 4.4, 2.4, 'r')                                           # lodowa maczuga
    for (x, y, d) in [(5, 6, -4), (12, 0, 2), (4, 13, -4), (14, 9, 4)]: c.poly([(x, y + b), (x + d, y - 3 + b), (x + .5 * d, y + 3 + b)], 'r', bevel=.9, add=.15)
    c.limb(25, 46, 24, 56, 5.4, 4.6, 'p', **FAR); c.rect(18, 55, 30, 61.5, 'p', bevel=1.2, add=-.2)
    c.limb(22, 26 + b, 16, 36 + b, 5, 4.4, 'p', **FAR); c.ball(16, 38 + b, 4.6, 4.6, 'p', add=-.15)
    c.ball(32, 35 + b, 14, 13, 'p')
    c.ball(34, 39 + b, 10, 8, 'q', only='p', keep=True) if False else None
    c.limb(39, 46, 41, 56, 5.6, 4.8, 'p'); c.rect(35, 55, 48, 61.5, 'p', bevel=1.2)
    c.poly([(19, 43 + b), (46, 43 + b), (46, 52), (41, 49), (37, 54), (32, 50), (27, 54), (22, 49), (18, 52)], 'u', bevel=.9)   # futro
    c.rect(19, 41.5 + b, 46, 44.5 + b, 's', bevel=.7); c.ball(32.5, 43 + b, 2.6, 2.6, 'r', add=.2)
    c.ball(21, 25 + b, 7.6, 6, 'u'); c.ball(45, 25 + b, 7.6, 6, 'u')                      # futrzane barki
    c.ball(35, 16 + b, 8.4, 8, 'p')
    c.poly([(27, 19 + b), (43, 19 + b), (42, 27 + b), (39, 32 + b), (36, 28 + b), (33, 35 + b), (30, 28 + b), (27, 30 + b)], 'q', bevel=1.2)   # broda z sopli
    c.ball(35, 10 + b, 8.4, 3.4, 'q')                                                     # włosy
    for (x, h) in ((29, 6), (33, 8), (37, 9), (41, 6)): c.poly([(x - 1.6, 9 + b), (x, 9 - h + b), (x + 1.8, 9 + b)], 'r', bevel=.8, add=.15)   # korona z lodu
    c.dots([(36, 15 + b), (37, 15 + b), (41, 15 + b)], 'e'); c.dots([(35, 14 + b), (36, 14 + b), (37, 14 + b), (40, 14 + b), (41, 14 + b)], 'k')
    c.ball(39.5, 18 + b, 2, 1.6, 'p', add=.15)
    c.rect(35, 22 + b, 41, 23.4 + b, 's', bevel=0, add=-.5)
    c.limb(45, 28 + b, 52, 38 + b, 5.2, 4.6, 'p'); c.ball(53, 43 + b - 2 * f, 5.4, 5.4, 'p')
    c.dots([(8, 22 + 2 * f), (55, 20 - f), (50, 8 + 2 * f), (22, 6 + f)], 'h')
    return c

def gryf_boss(f):
    c = big(foes.gryf, f); b = f
    for (x, y) in [(27, 10), (29, 7), (25, 13)]: c.tri((x, y + b + 2), (x - 3.5, y + b - 2.5), (x + .5, y + b - 1), 's')   # czub
    pts = [(40, 4), (43, 9), (41, 9), (45, 15)] if not f else [(6, 6), (10, 11), (8, 12), (12, 18)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]): c.line(x0, y0, x1, y1, 'u', d=2)
    c.dots([(3, 20 + 2 * f), (44, 30 - f), (12, 4 + f), (36, 40)], 'h'); c.dots([(4, 20 + 2 * f), (45, 30 - f)], 'g')
    c.ball(28, 24 + b, 3, 3, 'u', only='p', keep=True)
    return c

def krolowa(f):
    c = cv(); b = f
    legs = [(13, 12, 3, 38), (19, 8, 9, 58), (44, 8, 55, 58), (51, 13, 61, 40)]
    for i, (kx, ky, fx, fy) in enumerate(legs):
        w = (f if i % 2 else -f); sx = 26 + i * 4
        c.limb(sx, 40, kx + (3 if i < 2 else -3), ky + 4 + w, 1.8, 1.4, 's', **FAR); c.limb(kx + (3 if i < 2 else -3), ky + 4 + w, fx + (4 if i < 2 else -4), fy - 2, 1.4, .8, 's', **FAR)
    c.ball(27, 24 + b, 17, 15, 'p')                                                       # odwłok
    c.ball(22, 17 + b, 9, 6, 'q', only='p', keep=True)
    for (x, y, r) in [(27, 22, 5), (17, 28, 3), (37, 27, 3.4), (27, 34, 3)]: c.ball(x, y + b, r, r * .9, 'r', only='pq', keep=True); c.ball(x, y + b, r - 1.6, (r - 1.6) * .9, 'x', only='r', keep=True)
    for (x, h) in ((16, 6), (22, 9), (28, 10), (34, 8), (39, 5)): c.poly([(x - 2, 11 + b + abs(x - 27) * .25), (x, 11 - h + b + abs(x - 27) * .25), (x + 2.2, 11 + b + abs(x - 27) * .25)], 't', bevel=.9)   # korona z kolców
    for (x, y) in [(10, 40), (15, 44), (9, 46)]: c.ball(x, y, 3, 3, 'u', add=.1); c.dot(x - 1, y - 1, 'w')    # jaja
    c.ball(41, 43 + b, 9, 7.6, 'p')                                                       # głowotułów
    for i, (kx, ky, fx, fy) in enumerate(legs):
        w = (-f if i % 2 else f); sx = 34 + i * 4
        c.limb(sx, 44 + b, kx, ky + w, 2.2, 1.7, 's'); c.limb(kx, ky + w, fx, fy + 3, 1.7, .9, 's'); c.ball(kx, ky + w, 2.2, 2.2, 's')
    c.dots([(42, 39 + b), (43, 39 + b), (46, 40 + b), (47, 40 + b), (44, 42 + b), (48, 43 + b), (41, 42 + b), (46, 44 + b)], 'e')
    c.limb(46, 48 + b, 48, 54 + b + f, 1.6, .8, 't'); c.limb(41, 49 + b, 41, 55 + b + f, 1.6, .8, 't'); c.dots([(48, 55 + b + f), (41, 56 + b + f)], 'g')
    return c

def hrabia(f):
    c = cv(); b = (-1 if f else 0); w = 3 * f
    c.poly([(24, 20 + b), (9 - w, 14 + b), (4 - w, 26 + b), (9, 25 + b), (6, 37 + b), (12, 35 + b), (11, 47 + b), (18, 44 + b), (22, 56), (30, 44 + b)], 's', bevel=1.6)   # peleryna jak skrzydła
    c.poly([(41, 20 + b), (56 + w, 14 + b), (61 + w, 26 + b), (56, 25 + b), (59, 37 + b), (53, 35 + b), (54, 47 + b), (47, 44 + b), (43, 56), (35, 44 + b)], 's', bevel=1.6)
    c.poly([(26, 22 + b), (39, 22 + b), (44, 50 + b), (36, 47 + b), (33, 58), (29, 47 + b), (21, 50 + b)], 'r', bevel=1.4)   # czerwone podbicie
    c.poly([(26, 22 + b), (39, 22 + b), (38, 46 + b), (35, 43 + b), (32.5, 56), (30, 43 + b), (27, 46 + b)], 'p', bevel=2.4)   # surdut
    c.poly([(30, 23 + b), (35, 23 + b), (33.5, 34 + b), (31.5, 34 + b)], 'x', bevel=.6); c.ball(32.5, 25 + b, 1.8, 1.6, 'r', add=.2); c.dots([(32, 29 + b), (32, 32 + b)], 'k')   # żabot i guziki
    c.poly([(22, 22 + b), (26, 8 + b), (31, 21 + b)], 's', bevel=1.2); c.poly([(43, 22 + b), (39, 8 + b), (34, 21 + b)], 's', bevel=1.2)   # wysoki kołnierz
    c.ball(32.5, 14 + b, 6.4, 7.2, 't')                                                   # twarz
    c.poly([(26, 10 + b), (39, 10 + b), (38, 7 + b), (32.5, 12 + b), (27, 7 + b)], 'u', bevel=.8); c.ball(32.5, 7.5 + b, 6.6, 3, 'u')   # zaczesane włosy
    c.dots([(29, 14 + b), (30, 14 + b), (35, 14 + b), (36, 14 + b)], 'e'); c.dots([(28, 13 + b), (29, 13 + b), (30, 13 + b), (35, 13 + b), (36, 13 + b), (37, 13 + b)], 'k')
    c.seg(30, 18 + b, 35, 18 + b, 'k'); c.dots([(30, 19 + b), (35, 19 + b)], 'w')
    c.limb(26, 25 + b, 19, 32 + b - w, 3, 2.6, 'p'); c.limb(19, 32 + b - w, 15, 26 + b - w, 2.4, 2, 'p')
    c.limb(39, 25 + b, 46, 32 + b - w, 3, 2.6, 'p'); c.limb(46, 32 + b - w, 50, 26 + b - w, 2.4, 2, 'p')
    for d in (-2, 0, 2): c.limb(15, 25 + b - w, 14 + d, 20 + b - w, 1, .5, 't'); c.limb(50, 25 + b - w, 51 + d, 20 + b - w, 1, .5, 't')
    for (x, y) in [(8, 6 + 2 * f), (55, 4 + 3 * f)]:                                      # nietoperze
        c.tri((x, y), (x - 4, y - 3 + 2 * f), (x - 2, y + 2), 's'); c.tri((x, y), (x + 4, y - 3 + 2 * f), (x + 2, y + 2), 's'); c.dot(x, y, 'e')
    return c

def skorpion_boss(f):
    c = big(foes.skorpion, f, kind='kosc'); b = f
    for x in (13, 17, 21, 25): c.tri((x, 30), (x + 1, 24 - (x % 2)), (x + 3, 30), 't')    # kolce na grzbiecie
    for (x, y) in [(5, 25), (5, 19), (9, 13), (16, 9)]: c.tri((x - 3, y + b * (y < 20)), (x - 6, y - 3 + b * (y < 20)), (x - 2, y - 3 + b * (y < 20)), 't')
    c.ball(34, 34, 5, 4.6, 't'); c.ball(32.6, 34, 1.4, 1.6, 's', add=-.6, ao=False); c.ball(36, 34, 1.4, 1.6, 's', add=-.6, ao=False)   # czaszka
    c.dots([(32, 33), (36, 33)], 'e'); c.dots([(33, 37), (35, 37), (34, 36)], 'k')
    c.dots([(30, 20 + b + f), (29, 22 + b + f)], 'g'); c.dot(30, 21 + b + f, 'h')
    return c

def lisz(f):
    c = cv(); b = (-1 if f else 0)
    c.limb(52, 2 + b, 49, 58, 1.5, 1.5, 'u')                                              # kostur
    c.chain([(52, 2 + b), (48, -1 + b), (47, 4 + b)], 1.4, 1, 'u'); c.chain([(52, 2 + b), (56, -1 + b), (57, 4 + b)], 1.4, 1, 'u')
    c.ball(52, 2 + b, 3.6, 4.2 + f, 'x', add=.25, k=.5); c.dots([(51, 0 + b), (52, 1 + b), (52, -3 + b - f)], 'h'); c.dots([(46, 8 + 2 * f), (58, 9 - f)], 'g')
    c.poly([(19, 24 + b), (44, 24 + b), (48, 50), (43 + f, 60), (39, 53), (34 - f, 62), (30, 54), (25 + f, 61), (20, 52), (15 - f, 58)], 'p', bevel=2.6)   # szata
    c.ball(31.5, 33 + b, 11, 10, 'p')
    c.poly([(26, 26 + b), (38, 26 + b), (37, 40 + b), (27, 40 + b)], 's', bevel=0, add=-.35)       # klatka z żeber
    c.limb(32, 26 + b, 32, 41 + b, 1.2, 1.2, 't')
    for y in (28, 31.5, 35, 38.5): c.limb(27, y + b, 37, y + b - .6, 1, 1, 't')
    c.ball(32, 33.5 + b, 2.8, 2.8, 'x', add=.3, k=.5); c.dots([(31, 32 + b), (32, 33 + b)], 'h')   # filakterium
    c.line(24, 42 + b, 22, 56, 's', d=-1, only='p'); c.line(39, 42 + b, 41, 56, 's', d=-1, only='p'); c.line(31, 44 + b, 31, 55, 's', d=-1, only='p')
    c.ball(20, 25 + b, 6.6, 5, 'q'); c.ball(44, 25 + b, 6.6, 5, 'q')                      # naramienniki
    c.tri((16, 22 + b), (13, 15 + b), (21, 21 + b), 'q'); c.tri((48, 22 + b), (51, 15 + b), (43, 21 + b), 'q')
    c.ball(32, 14 + b, 7, 7.2, 't')                                                       # czaszka
    c.rect(28, 19 + b, 37, 23 + b, 't', bevel=.7)
    c.ball(29.5, 14.5 + b, 2.2, 2.4, 's', add=-.6, ao=False); c.ball(35.5, 14.5 + b, 2.2, 2.4, 's', add=-.6, ao=False)
    c.dots([(29, 14 + b), (30, 14 + b), (35, 14 + b), (36, 14 + b)], 'e'); c.dots([(29, 15 + b), (35, 15 + b)], 'g')
    c.dots([(32, 18 + b), (33, 18 + b)], 'k')
    for x in (29, 31, 33, 35): c.dot(x, 22 + b, 'k')
    c.rect(25, 8 + b, 39.5, 10.6 + b, 'u', bevel=.7)                                      # korona
    for (x, h) in ((26.5, 5), (32.3, 7), (38, 5)): c.poly([(x - 1.8, 8.6 + b), (x, 8.6 - h + b), (x + 1.8, 8.6 + b)], 'u', bevel=.7)
    c.dots([(32, 9 + b), (26, 9 + b), (38, 9 + b)], 'g')
    c.limb(19, 28 + b, 13, 36 + b, 4, 4.6, 'p', **FAR); c.limb(12, 38 + b, 9, 42 + b - 2 * f, 1.2, 1, 't')
    for d in (-2, 0, 2): c.limb(9, 43 + b - 2 * f, 6, 45 + b - 2 * f + d, .9, .5, 't')
    c.limb(44, 28 + b, 48, 34 + b, 4, 4.4, 'p'); c.ball(50, 36 + b, 2.2, 2.2, 't')
    return c

def opat(f):
    c = cv(); b = f
    for i, x in enumerate((17, 25, 34, 43)):                                              # macki spod habitu
        w = (1 if i % 2 else -1) * (2 * f - 1)
        c.chain([(x, 52), (x + w, 57), (x - 2 * w + (x - 30) * .3, 61)], 2.4, .9, 'r')
    c.poly([(16, 22 + b), (46, 22 + b), (52, 56), (10, 56)], 'p', bevel=3)                # habit
    c.ball(31, 38 + b, 17, 15, 'p')                                                       # opasły brzuch
    c.ball(31, 42 + b, 10, 8, 'p', add=.08)
    c.poly([(27, 24 + b), (35, 24 + b), (34, 52 + b), (28, 52 + b)], 'q', bevel=.9)       # stuła
    c.rect(29, 32 + b, 33, 40 + b, 'u', bevel=.4); c.rect(27, 34.5 + b, 35, 37 + b, 'u', bevel=.4)   # odwrócony znak
    c.ball(31, 30 + b, 1.4, 1.4, 'x', add=.3)
    c.line(20, 44 + b, 16, 55, 's', d=-1, only='p'); c.line(43, 44 + b, 47, 55, 's', d=-1, only='p')
    c.ball(31, 15 + b, 8, 7.6, 't')                                                       # nalana twarz
    c.ball(31, 21 + b, 6.6, 3.4, 't', add=-.08)
    c.chain([(24, 12 + b), (17, 9 + b), (14, 2 + b)], 2.6, .9, 'x'); c.chain([(38, 12 + b), (45, 9 + b), (48, 2 + b)], 2.6, .9, 'x')   # rogi przebijają mitrę
    c.poly([(24, 10 + b), (38, 10 + b), (36, 2 + b), (31, -4 + b), (26, 2 + b)], 'q', bevel=1.6)   # mitra
    c.rect(24, 8 + b, 38, 10.6 + b, 'u', bevel=.6); c.line(31, -2 + b, 31, 8 + b, 'u', d=0, only='q')
    c.dots([(27, 15 + b), (28, 15 + b), (28, 16 + b), (34, 15 + b), (35, 15 + b), (34, 16 + b)], 'e'); c.dots([(26, 14 + b), (27, 14 + b), (28, 14 + b), (34, 14 + b), (35, 14 + b), (36, 14 + b)], 'k')
    c.poly([(26, 19 + b), (36, 19 + b), (34, 22.6 + b), (28, 22.6 + b)], 's', bevel=0, add=-.6)
    c.dots([(27, 19 + b), (29, 19 + b), (31, 19 + b), (33, 19 + b), (35, 19 + b), (29, 22 + b), (32, 22 + b)], 'w')
    c.limb(17, 26 + b, 9, 34 + b, 5, 5.4, 'p', **FAR); c.ball(8, 37 + b, 3, 3, 't', add=-.1)
    c.limb(8, 39 + b, 6 + 3 * f, 50 + b, .7, .7, 'u'); c.ball(6 + 3 * f, 52 + b, 3.4, 3.4, 'u'); c.dots([(5 + 3 * f, 51 + b), (7 + 3 * f, 52 + b)], 'h')   # kadzielnica
    c.dots([(4 + 3 * f, 46 - f), (9 + 2 * f, 43 - 2 * f), (3 + f, 41 - f)], 'g')
    c.limb(45, 26 + b, 53, 33 + b, 5, 5.4, 'p'); c.limb(53, 33 + b, 56, 24 + b - 2 * f, 3, 2.4, 't')
    for d in (-2, 0, 2): c.limb(56, 23 + b - 2 * f, 57 + d, 18 + b - 2 * f, 1.1, .5, 'x')
    c.ball(57, 12 + b - 2 * f, 3.4, 3.4, 'r', add=.25, k=.5); c.dots([(56, 10 + b - 2 * f), (57, 11 + b - 2 * f)], 'h')
    return c

def tytan(f):
    c = cv(); b = f
    c.limb(25, 46, 24, 56, 5.6, 5, 'p', **FAR); c.rect(18, 55, 30, 61.5, 'p', bevel=1.2, add=-.2)
    c.limb(18, 22 + b, 11, 34 + b, 5.6, 5, 'p', **FAR); c.ball(10, 40 + b, 6, 6, 'p', add=-.15); c.ball(10, 40 + b, 3.4, 3.4, 'r', add=.2)
    c.poly([(16, 16 + b), (48, 16 + b), (44, 44 + b), (20, 44 + b)], 'p', bevel=4)
    c.poly([(21, 41 + b), (43, 41 + b), (41, 50), (23, 50)], 'q', bevel=1.6)
    c.limb(39, 47, 41, 56, 5.8, 5.2, 'p'); c.rect(35, 55, 48, 61.5, 'p', bevel=1.2)
    c.ball(16, 17 + b, 8, 6.6, 'q'); c.ball(48, 17 + b, 8, 6.6, 'q')
    for (x, y) in [(11, 11), (16, 8), (21, 11), (43, 10), (48, 7), (53, 11)]:             # płomienie na barkach
        c.poly([(x - 2.2, y + 4 + b), (x - .5 + f, y - 5 + b - 3 * f * (x % 2)), (x + 2.2, y + 4 + b)], 'r', bevel=.9, add=.2); c.dot(x, y + b, 'h')
    c.ball(32, 28 + b, 5.6, 5.6, 's', add=-.4, k=.3); c.ball(32, 28 + b, 4, 4, 'r', add=.3); c.dots([(31, 26 + b), (32, 27 + b), (30, 27 + b)], 'h')   # serce
    for (x0, y0, x1, y1) in [(20, 20, 27, 25), (44, 20, 37, 25), (22, 38, 28, 32), (42, 38, 36, 32), (32, 34, 32, 42), (24, 30, 20, 34), (40, 30, 44, 34), (38, 47, 42, 54), (26, 47, 23, 54)]:
        c.line(x0, y0 + b, x1, y1 + b, 'r', d=1, only='pq')
    c.ball(32, 9 + b, 6.6, 6, 'p')                                                        # głowa
    for (x, h) in ((27, 7), (30, 10), (33, 12), (36, 9), (38, 6)): c.poly([(x - 2.2, 6 + b), (x - .6 + f, 6 - h + b - 2 * f * (x % 2)), (x + 2.2, 6 + b)], 'r', bevel=.9, add=.25)
    c.dots([(30, -3 + b - f), (33, -5 + b), (36, -2 + b - f)], 'h')
    c.rect(27.5, 8 + b, 37.5, 10.6 + b, 's', bevel=0, add=-.6); c.dots([(29, 9 + b), (30, 9 + b), (34, 9 + b), (35, 9 + b)], 'e')
    c.rect(29, 12.6 + b, 36, 13.8 + b, 'r', bevel=0, add=.2)
    c.limb(47, 22 + b, 53, 34 + b, 6, 5.2, 'p'); c.ball(54, 40 + b - 2 * f, 6.4, 6.4, 'p'); c.ball(54, 40 + b - 2 * f, 3.6, 3.6, 'r', add=.25)
    c.line(50, 26 + b, 53, 33 + b, 'r', d=1, only='p'); c.dots([(53, 38 + b - 2 * f), (54, 39 + b - 2 * f)], 'h')
    c.dots([(6, 26 - 3 * f), (58, 28 - 2 * f), (4, 14 - 2 * f), (59, 12 - 3 * f)], 'g')
    return c

def czerwony_smok(f):
    c = big(foes.smok, f); b = f
    for x in (13, 17, 21, 25): c.tri((x, 22.5 + b), (x + 1.5, 16 + b), (x + 4, 22.5 + b), 'u')
    c.chain([(33, 6 + b), (29, 2 + b), (27, -3 + b)], 1.6, .6, 'u'); c.chain([(35, 5 + b), (33, 0 + b), (33, -4 + b)], 1.5, .6, 'u')
    for (x, y) in [(18, 27), (23, 26), (27, 30), (14, 30)]: c.ball(x, y + b, 1.6, 1.2, 's', only='p', keep=True)
    if f:
        c.chain([(46, 12 + b), (47.5, 16 + b)], 1.6, 1, 'v', add=.25); c.dots([(46, 12 + b), (47, 14 + b)], 'h'); c.dots([(47, 18 + b), (45, 17 + b)], 'g')
    else: c.dots([(46, 13 + b), (47, 12 + b)], 'g')
    return c

def lewiatan(f):
    c = cv(); b = f
    c.chain([(6, 60), (5, 48), (10, 40), (17, 44), (18, 56)], 4.6, 5, 'p', **FAR)         # tylny zwój
    for (x, y) in [(5, 46), (11, 39)]: c.tri((x, y + 1), (x - 4, y - 5), (x + 2, y - 3), 'r')
    c.chain([(58, 61), (57, 50), (50, 44 + b), (47, 52)], 3.6, 2, 'p', **FAR); c.tri((47, 52), (41, 49 - 2 * f), (44, 57), 'r'); c.tri((47, 52), (50, 59), (44, 57), 'r')   # ogon z płetwą
    c.chain([(27, 62), (25, 50), (22, 38), (24, 26 + b), (30, 17 + b), (37, 13 + b)], 7.4, 5.6, 'p')   # szyja
    c.chain([(30, 61), (29, 50), (26.5, 39), (28.5, 28 + b), (34, 20 + b)], 2.6, 2.2, 'q', only='p', keep=True)
    for (x, y) in [(27, 55), (25, 46), (25, 37), (28, 29), (33, 22)]: c.line(x - 1, y + b * (y < 40), x + 5, y + 1 + b * (y < 40), 's', d=-1, only='q')
    for (x, y) in [(19, 50), (16, 41), (16, 32), (19, 23), (25, 15)]: c.poly([(x, y + 3 + b * (y < 40)), (x - 6, y - 2 + b * (y < 40)), (x + 1, y - 4 + b * (y < 40))], 'r', bevel=.9)   # płetwa grzbietowa
    c.poly([(34, 9 + b), (26, 1 + b), (38, 6 + b)], 'r', bevel=1); c.poly([(36, 17 + b), (29, 22 + b), (34, 12 + b)], 'r', bevel=1)   # płetwy głowy
    c.ball(41, 12 + b, 8, 6.4, 'p')
    c.limb(44, 12 + b, 55, 12 + b, 4.6, 3, 'p')                                           # górna szczęka
    c.limb(43, 18 + b, 53, 20 + b + 2 * f, 2.6, 1.6, 'q')                                 # żuchwa
    c.rect(45, 15.5 + b, 54, 17 + b + f, 's', bevel=0, add=-.6)
    c.dots([(46, 15 + b), (48, 15 + b), (50, 15 + b), (52, 15 + b), (54, 15 + b), (47, 17 + b + 2 * f), (49, 18 + b + 2 * f), (51, 18 + b + 2 * f)], 'w')
    c.dots([(43, 9 + b), (44, 9 + b), (44, 10 + b)], 'e'); c.dots([(42, 8 + b), (43, 8 + b), (44, 8 + b), (45, 9 + b)], 'k'); c.dot(57, 11 + b, 'k')
    c.chain([(54, 9 + b), (59, 5 + b), (61, 9 + b - 2 * f)], .9, .5, 'r'); c.chain([(52, 9 + b), (55, 3 + b), (60, 1 + b + 2 * f)], .9, .5, 'r')   # wąsy
    for x in range(0, 64, 7): c.ball(x + 3 - (2 * f if (x // 7) % 2 else -f), 60 + ((x // 7) % 2), 5.4, 3.2, 'u', ao=False)   # fale
    for x in range(2, 64, 7): c.dots([(x + f, 57 + (x % 2)), (x + 1 + f, 57 + (x % 2))], 'w')
    pts = [(10, 4), (14, 11), (11, 12), (16, 20)] if f else [(55, 26), (58, 32), (56, 33), (60, 40)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]): c.line(x0, y0, x1, y1, 'x', d=2)
    c.dots([(6, 20 - f), (60, 22 + f), (48, 30)], 'g')
    return c

def pozeracz(f):
    c = cv(); b = (-1 if f else 0)
    for i, (x, y) in enumerate([(10, 44), (17, 50), (26, 53), (37, 53), (46, 50), (53, 44)]):   # macki
        w = (1 if i % 2 else -1) * (2 * f - 1); dx = (x - 32) * .28
        c.chain([(x, y + b - 6), (x + dx + w, y + 3), (x + 2 * dx - 2 * w, y + 9), (x + 3 * dx + w, min(62, y + 15))], 3.2, .9, 'p' if i % 2 else 's')
    c.ball(32, 28 + b, 22, 20, 'p')
    for (x, y, r) in [(13, 22, 2.2), (51, 24, 2), (20, 42, 2), (45, 41, 2.4), (31, 10, 1.8), (42, 12, 1.4)]: c.ball(x, y + b, r, r, 'q', only='p', keep=True)
    c.ball(33, 31 + b, 12.4, 11.6, 's', add=-.3, k=.4)                                    # paszcza
    c.ball(33, 31 + b, 8.4, 7.8, 's', add=-.55, k=.3, ao=False)
    for i in range(12):
        a = math.radians(i * 30 + 15 * f); r1, r2 = 12, 7.2
        c.limb(33 + math.cos(a) * r1, 31 + b + math.sin(a) * (r1 - .6), 33 + math.cos(a) * r2, 31 + b + math.sin(a) * (r2 - .4), 1.5, .5, 't', ao=False)
    c.ball(33, 31 + b, 3.6, 3.4, 'x', add=.25, k=.5, ao=False); c.dots([(32, 30 + b), (33, 30 + b), (33, 31 + b)], 'h')   # gwiazda w gardzieli
    for (x, y, r) in [(16, 14, 3.4), (30, 8, 2.8), (46, 13, 3.6), (53, 27, 2.6), (11, 30, 2.6)]:                         # oczy
        c.ball(x, y + b, r, r, 'r', add=.2, k=.5); c.ball(x + .6, y + b, r * .45, r * .7, 's', add=-.7, ao=False); c.dot(x - 1, y - 1 + b, 'w')
    c.dots([(4, 6 + f), (58, 5 - f), (2, 36 + 2 * f), (61, 40 - 2 * f), (8, 56), (24, 1 + f), (56, 55 - f)], 'g'); c.dots([(4, 5 + f), (61, 39 - 2 * f)], 'h')
    return c

BOSS_TEMPLATES = dict(herszt=herszt, wilkolak=wilkolak, wiedzma=wiedzma, upadly=upadly, golem_boss=golem_boss, olbrzym=olbrzym, gryf_boss=gryf_boss, krolowa=krolowa,
                      hrabia=hrabia, skorpion_boss=skorpion_boss, lisz=lisz, opat=opat, tytan=tytan, czerwony_smok=czerwony_smok, lewiatan=lewiatan, pozeracz=pozeracz)
