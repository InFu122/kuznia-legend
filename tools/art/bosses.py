# Boss klanowy 32×32: kolos z kamienia/metalu z żarzącym się rdzeniem. Jeden szablon, pięć palet.
# Regiony: p ciało, q pancerz (naramienniki, pięści, pas, stopy), r żar (oczy, rdzeń, pęknięcia), s rogi i korona.
import sys; sys.path.insert(0, '.')
from shade2 import shade, outline, ramp

W = H = 32

def canvas(): return [['.'] * W for _ in range(H)]

def put(g, x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c

def rect(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(g, x, y, c)

def ellipse(g, cx, cy, rx, ry, c):
    for y in range(H):
        for x in range(W):
            if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: put(g, x, y, c)

def mirror(g):
    # lewa połowa (x < 16) odbita na prawą
    for y in range(H):
        for x in range(16): g[y][W - 1 - x] = g[y][x]

def golem():
    g = canvas()
    # nogi i stopy
    rect(g, 10, 22, 14, 28, 'p')
    rect(g, 9, 28, 14, 30, 'q')
    # tułów: szeroki w barkach, węższy w pasie
    for y in range(10, 22):
        x0 = 8 + max(0, (y - 13)) // 3
        rect(g, x0, y, 15, y, 'p')
    # pas
    rect(g, 10, 20, 15, 21, 'q')
    # ramiona i pięści
    rect(g, 3, 13, 7, 21, 'p')
    ellipse(g, 5.5, 23.5, 3.6, 3.3, 'q')
    # naramienniki z kolcem i nitami
    ellipse(g, 7, 12.5, 5, 3.6, 'q')
    for (x, y) in [(4, 8), (4, 9), (5, 9), (3, 7)]: put(g, x, y, 's')
    # głowa
    rect(g, 12, 3, 15, 8, 'p')
    rect(g, 11, 4, 11, 7, 'p')
    rect(g, 12, 4, 15, 4, 'q')  # brew / hełm
    # rogi: grube u nasady, zakręcone na zewnątrz i w górę
    for (x, y) in [(10, 5), (10, 4), (9, 4), (9, 3), (8, 3), (8, 2), (7, 2), (7, 1), (7, 0), (10, 3), (9, 5)]: put(g, x, y, 's')
    # usta
    rect(g, 13, 8, 15, 8, 'q')
    # szyja
    rect(g, 13, 9, 15, 9, 'p')
    mirror(g)
    # żar: oczy, rdzeń, pęknięcia
    for x in (13, 14, 17, 18): put(g, x, 6, 'r')
    for y, half in [(13, 0), (14, 1), (15, 2), (16, 1), (17, 0)]:
        for x in range(15 - half, 17 + half): put(g, x, y, 'r')
    for (x, y) in [(5, 16), (6, 17), (5, 18), (11, 25), (12, 26), (26, 16), (25, 17), (26, 18), (20, 25), (19, 26)]: put(g, x, y, 'r')
    return outline(shade([''.join(r) for r in g]))

K = {'k': '#120d16'}
# Palety: ciało (p), pancerz (q), żar (r), rogi (s) — każda od najjaśniejszego do najciemniejszego.
PALS = {
    'golem': dict(p=['#b7bcc4', '#878d97', '#5d636d', '#3c4048'], q=['#8a6a4a', '#674c33', '#4a3524', '#2f2117'],
                  r=['#fff3a8', '#ffcf4a', '#e68a1e', '#a8520e'], s=['#d8d2c4', '#a89f8c', '#7a715f', '#4f4a3e']),
    'kamien': dict(p=['#a8a08a', '#7f7764', '#5a5444', '#3b372c'], q=['#6c8a5a', '#4f6a40', '#38502d', '#24351d'],
                   r=['#c8ffd8', '#6cf0a0', '#28b468', '#147040'], s=['#e0d6b8', '#b0a585', '#7e765c', '#524c3b']),
    'ogien': dict(p=['#7a4a3c', '#58322a', '#3c201c', '#261412'], q=['#3a3438', '#29242a', '#1c181d', '#120f13'],
                  r=['#fff6c0', '#ffd04a', '#ff7a1a', '#c23a0a'], s=['#ffb070', '#e0702a', '#a8481a', '#6a2a10']),
    'lod': dict(p=['#d8f2ff', '#9fd2ee', '#6aa6cc', '#43769a'], q=['#5d6fa8', '#44528a', '#2f3b68', '#1f2747'],
                r=['#ffffff', '#c6f6ff', '#6fd8ff', '#2a9ad0'], s=['#eef8ff', '#bcdcf0', '#88b0cc', '#5a7e98']),
    'upior': dict(p=['#6a6280', '#4c4660', '#343046', '#221f30'], q=['#3a2f4a', '#2a2236', '#1c1726', '#120f19'],
                  r=['#f2ffe8', '#b6ff8a', '#62e048', '#2a9a2a'], s=['#c8c0d8', '#9a90b0', '#6c6484', '#463f58']),
}

def boss_template(): return golem()
def boss_palette(key):
    p = dict(K)
    for reg, cols in PALS[key].items(): p.update(ramp(reg, cols))
    return p

if __name__ == '__main__':
    from prev import sheet
    rows = golem()
    sheet([[(rows, boss_palette(k)) for k in PALS]], scale=6, path='/tmp/claude-0/-home-claude/e4d4e36c-cfb8-561b-a464-0863ca6c20a5/scratchpad/bosses.png')
    print('\n'.join(rows))

def clan_coin():
    # Moneta klanowa 16×16: złota moneta z emaliowaną tarczą klanu.
    S = 16
    g = [['.'] * S for _ in range(S)]
    for y in range(S):
        for x in range(S):
            d = ((x + .5 - 8) ** 2 + (y + .5 - 8) ** 2) ** .5
            if d <= 7: g[y][x] = 'p'
            if 5.0 <= d <= 5.8: g[y][x] = 'q'
    shield = {4: (6, 9), 5: (5, 10), 6: (5, 10), 7: (5, 10), 8: (5, 10), 9: (6, 9), 10: (7, 8)}
    for y, (a, b) in shield.items():
        for x in range(a, b + 1): g[y][x] = 's'
    rows = outline(shade([''.join(r) for r in g]))
    rows = [list(r) for r in rows]
    for (x, y) in [(5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (7, 6), (8, 6), (6, 7), (7, 7), (8, 7), (9, 7)]: rows[y][x] = 'Y'  # kowadło na tarczy
    rows[2][6] = 'w'; rows[3][4] = 'w'
    rows = [''.join(r) for r in rows]
    pal = {**K, **ramp('p', ['#ffe48f', '#e0ad3c', '#b07a1c', '#7a4f10']), **ramp('q', ['#c8902a', '#a8741c', '#7e5412', '#5a3a0c']),
           **ramp('s', ['#7fb8ff', '#3f7fe0', '#2a58b0', '#1a3a7a']), 'Y': '#f4f0e6', 'w': '#ffffff'}
    return rows, pal
