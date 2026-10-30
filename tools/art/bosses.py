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

def hourglass():
    # Klepsydra 16×16: drewniane ramy, szkło i złoty piasek.
    rows = [
        "................",
        "...aaaaaaaaaa...",
        "...bbbbbbbbbb...",
        "....g......g....",
        "....gyyyyyyg....",
        ".....gyyyyg.....",
        "......gyyg......",
        ".......yy.......",
        ".......gg.......",
        "......g.yg......",
        ".....g..y.g.....",
        "....g..yyy.g....",
        "....gyyyyyyg....",
        "...aaaaaaaaaa...",
        "...bbbbbbbbbb...",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#a06c42', 'b': '#6e4528', 'g': '#bfe6f2', 'y': '#e8b84a'}
    return rows, pal

def crossed_swords():
    # Moc: dwa skrzyżowane miecze 16×16.
    g = [['.'] * 16 for _ in range(16)]
    def put(x, y, c):
        if 0 <= x < 16 and 0 <= y < 16: g[y][x] = c
    for i in range(10):  # ostrza po przekątnych
        put(2 + i, 2 + i, 'p'); put(3 + i, 2 + i, 'q')
        put(13 - i, 2 + i, 'p'); put(12 - i, 2 + i, 'q')
    for (x, y) in [(10, 12), (12, 10), (11, 11), (5, 12), (3, 10), (4, 11)]: put(x, y, 'y')  # jelce
    for (x, y) in [(12, 12), (13, 13), (14, 14), (3, 12), (2, 13), (1, 14)]: put(x, y, 'b')    # rękojeści
    put(2, 2, 'w'); put(13, 2, 'w')
    rows = outline([''.join(r) for r in g])
    pal = {**K, 'p': '#e8ecf0', 'q': '#9aa4ae', 'y': '#e8b84a', 'b': '#7a4a2a', 'w': '#ffffff'}
    return rows, pal

def anvil():
    # Kuźnia: kowadło z żarzącą się sztabą 16×16.
    rows = [
        "................",
        "................",
        "................",
        "......rrrr......",
        "..pppppppppppp..",
        ".pppppppppppppp.",
        "..qqqqqqqqqqqp..",
        "......qqqqp.....",
        "......qqqqp.....",
        ".....qqqqqqp....",
        "....qqqqqqqqp...",
        "...ssssssssssp..",
        "................",
        "................",
        "................",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'p': '#9aa4ae', 'q': '#5d646d', 's': '#3a3f46', 'r': '#ff8a3c'}
    return rows, pal

def key_icon():
    # Klucz do lochów 16×16: złote ucho z otworem, trzon i ząbki, ukośnie.
    rows = [
        "................",
        "................",
        "..yyyy..........",
        ".yYYYYy.........",
        "yYZ..YYy........",
        "yY....Yy........",
        "yY....Yyy.......",
        "yYY..YYYYy......",
        ".yYYYYyYYYy.....",
        "..yyyy.yYYYy....",
        ".........yYYy...",
        "........yyYYYy..",
        "........yYyYYYy.",
        ".........y.yYy..",
        "............y...",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'y': '#a8741c', 'Y': '#e8b84a', 'Z': '#fff1b8'}
    return rows, pal

def gem_icon():
    # Klejnot 16×16 (waluta premium): szlifowany rubin — korona z fasetami i ostro zbiegający spód.
    rows = [
        "................",
        "................",
        "....bbaaaabb....",
        "...baawaaaabc...",
        "..baaaaaaaabbc..",
        ".bbbbbbbbbbbbcc.",
        ".cbbabbbbbabccd.",
        "..cbbabbbabbcd..",
        "...cbbabababd...",
        "....cbbaabcd....",
        ".....cbbacd.....",
        "......cbcd......",
        ".......cd.......",
        "................",
        "................",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#ff9fc6', 'b': '#f0457a', 'c': '#b8204c', 'd': '#7a1232', 'w': '#ffffff'}
    return rows, pal

def pass_icon():
    # Przepustka Kowala 16×16: czerwony proporzec na drążku ze złotą gwiazdą i jaskółczym ogonem.
    rows = [
        "................",
        ".dddddddddddddd.",
        "..eeeeeeeeeeee..",
        "..ebbbbbbbbbbc..",
        "..ebbbbybbbbbc..",
        "..ebbbyyybbbbc..",
        "..ebyyyYyyybbc..",
        "..ebbyyyyybbbc..",
        "..ebbyybyybbbc..",
        "..ebbybbbybbbc..",
        "..ebbbbbbbbbbc..",
        "..ebbbbbbbbbbc..",
        "..ebbbbccbbbbc..",
        "..ebbbc..cbbbc..",
        "..ebbc....cbbc..",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'b': '#d8433a', 'c': '#8e2420', 'e': '#f07a5a', 'y': '#f2c14e', 'Y': '#fff1b8', 'd': '#8a5a32'}
    return rows, pal

def ad_icon():
    # Reklama z nagrodą 16×16: zwój z pieczęcią i trójkątem „odtwórz”.
    rows = [
        "................",
        "..aaaaaaaaaaaa..",
        ".abbbbbbbbbbbba.",
        ".abbbbcbbbbbbba.",
        ".abbbbccbbbbbba.",
        ".abbbbcccbbbbba.",
        ".abbbbccccbbbba.",
        ".abbbbcccbbbbba.",
        ".abbbbccbbbbbba.",
        ".abbbbcbbbbbbba.",
        ".abbbbbbbbbbbba.",
        "..aaaaaaaaaaaa..",
        ".....dd..dd.....",
        "....dd....dd....",
        "................",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#a07a4c', 'b': '#2a2f3a', 'c': '#f2c14e', 'd': '#6e4a2c'}
    return rows, pal

def arena_token():
    # Żeton Areny 16×16: fioletowa moneta ze skrzyżowanymi mieczami (ostrza w górę, rękojeści na dole).
    S = 16
    g = [['.'] * S for _ in range(S)]
    for y in range(S):
        for x in range(S):
            d = ((x + .5 - 8) ** 2 + (y + .5 - 8) ** 2) ** .5
            if d <= 7: g[y][x] = 'p'
            if 5.9 <= d <= 6.6: g[y][x] = 'q'
    rows = outline(shade([''.join(r) for r in g]))
    rows = [list(r) for r in rows]
    for i in range(6):
        rows[3 + i][4 + i] = 'Y'; rows[3 + i][5 + i] = 'k'      # miecz 1: ostrze \\ z cieniem
        rows[3 + i][11 - i] = 'Y'; rows[4 + i][11 - i] = 'k'    # miecz 2: ostrze /
    for (x, y) in [(10, 9), (9, 10), (11, 8), (5, 9), (6, 10), (4, 8)]: rows[y][x] = 'h'   # jelce
    for (x, y) in [(11, 10), (12, 11), (4, 10), (3, 11)]: rows[y][x] = 'r'                  # rękojeści
    rows = [''.join(r) for r in rows]
    pal = {**K, **ramp('p', ['#a993ec', '#7c60cc', '#5c42a8', '#3c2a7c']), **ramp('q', ['#d9c8ff', '#b9a2f4', '#9a80e0', '#7458c0']),
           'Y': '#ffffff', 'k': '#2a1c58', 'h': '#f2c14e', 'r': '#8a5a22'}
    return rows, pal

def trophy_icon():
    # Puchar 16×16 (sezon wojen klanów): złoty kielich z uszami na kamiennej podstawie.
    rows = [
        "................",
        "..aaaaaaaaaaaa..",
        ".hbwbbbbbbbbch..",
        "h.bwbbbbbbbbc.h.",
        "h.bwbbbbbbbbc.h.",
        ".hbbbbbbbbbbch..",
        "...bbbbbbbbc....",
        "....bbbbbbc.....",
        ".....bbbbc......",
        "......bbc.......",
        "......bbc.......",
        ".....bbbbc......",
        "....ssssssss....",
        "...ssssssssss...",
        "...tttttttttt...",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#fff1b8', 'b': '#f2c14e', 'c': '#b07a1c', 'w': '#fff8dc', 'h': '#d9a43a', 's': '#8a6a4a', 't': '#5a4030'}
    return rows, pal

def spark_icon():
    # Iskra 16×16 (Festiwal Kuźni): płomyk z jasnym środkiem i drobnymi iskrami.
    rows = [
        "................",
        ".......a........",
        "......aa....y...",
        "......aba.......",
        ".....abba.......",
        "....abbbba..y...",
        "...abbcbbba.....",
        "...abccccba.....",
        "..abbcwwcbba....",
        "..abccwwccba....",
        "..abccwwccba.y..",
        "..abbcccccba....",
        "...abbcccbba....",
        "....abbbbba.....",
        ".....aaaaa......",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#c8381a', 'b': '#ff7a1a', 'c': '#ffc040', 'w': '#fff4c0', 'y': '#ffd060'}
    return rows, pal

def rune_icon():
    # Runa 16×16: kamienna tabliczka z wyrytym, świecącym znakiem.
    rows = [
        "................",
        "....aaaaaaaa....",
        "...abbbbbbbba...",
        "...abbbybbbca...",
        "...abbbyybbca...",
        "...abbbyyybca...",
        "...abbbybybca...",
        "...abbbyybbca...",
        "...abbbybbbca...",
        "...abbbybbbca...",
        "...abbbybbbca...",
        "...abbbbbbbca...",
        "...abccccccca...",
        "....aaaaaaaa....",
        "................",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#3a3f4c', 'b': '#7a8296', 'c': '#555c6c', 'y': '#7ff0ff'}
    return rows, pal

def paw_icon():
    # Łapa 16×16 (chowańce): odcisk łapy z czterema palcami.
    rows = [
        "................",
        "....aa....aa....",
        "...abba..abba...",
        "...abba..abba...",
        "....aa....aa....",
        ".aa..........aa.",
        "abba..aaaa..abba",
        "abba.abbbba.abba",
        ".aa.abbbbbba.aa.",
        "...abbbccbbba...",
        "...abbccccbba...",
        "...abbbccbbba...",
        "....abbbbbba....",
        ".....aaaaaa.....",
        "................",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#7a4a2a', 'b': '#c9925a', 'c': '#e8b880'}
    return rows, pal

def horn_icon():
    # Trofeum 16×16 (Wielkie Łowy): zakrzywiony róg myśliwski z mosiężnym okuciem.
    rows = [
        "................",
        ".a..............",
        ".ab.............",
        ".abb............",
        "..abb...........",
        "..abbb..........",
        "...abbb.........",
        "...abbbb........",
        "....abbbbc......",
        ".....abbbbcc....",
        "......abbbbbcmm.",
        ".......aabbbbmmm",
        ".........aabbmmm",
        "...........aamm.",
        "................",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'a': '#fffbe8', 'b': '#e6d6ae', 'c': '#b09a70', 'm': '#d9a43a'}
    return rows, pal

def candle_icon():
    # Świeca 16×16 (Noc Upiorów): biała świeca z niebieskawym, upiornym płomieniem.
    rows = [
        "................",
        ".......g........",
        "......ggg.......",
        "......gwg.......",
        "......gwg.......",
        ".......k........",
        ".....aaaaa......",
        ".....abbbc......",
        ".....abbbc......",
        ".....abbbca.....",
        ".....abbbc......",
        ".....abbbc......",
        ".....abbbc......",
        "...ddddddddd....",
        "....eeeeeee.....",
        "................",
    ]
    rows = outline(rows)
    pal = {**K, 'g': '#7ad8ff', 'w': '#e8faff', 'k': '#2a2a2a', 'a': '#fffaf0', 'b': '#ece4d4', 'c': '#b8ac98', 'd': '#8a8a9a', 'e': '#5a5a6a'}
    return rows, pal
