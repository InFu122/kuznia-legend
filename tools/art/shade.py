# Cieniowanie regionów (światło z lewej góry) i obrys. Litery regionów:
#   M metal (1-4)  G złoto (y Y Z)  L skóra (l m n)  W drewno (a b c)  C sukno (r s)  J klejnot (g h)
#   pozostałe znaki zostają bez zmian (np. ręcznie postawione 'w', 'k', '3').
RAMPS = {'M': ('4', '3', '2', '1'), 'G': ('Z', 'Y', 'y', 'y'), 'L': ('n', 'm', 'l', 'l'),
         'W': ('c', 'b', 'a', 'a'), 'C': ('s', 's', 'r', 'r'), 'J': ('h', 'g', 'g', 'g')}
def shade(rows):
    h, w = len(rows), len(rows[0])
    g = [list(r) for r in rows]
    get = lambda x, y: rows[y][x] if 0 <= x < w and 0 <= y < h else '.'
    for y in range(h):
        for x in range(w):
            c = rows[y][x]
            if c not in RAMPS: continue
            hi, mid, lo, deep = RAMPS[c]
            up, left, down, right = get(x, y-1) != c, get(x-1, y) != c, get(x, y+1) != c, get(x+1, y) != c
            if (up or left) and not (down or right): t = hi
            elif (down or right) and not (up or left): t = deep if (down and right) else lo
            elif (up or left) and (down or right): t = mid if not (up and left) else hi
            else: t = mid
            g[y][x] = t
    return [''.join(r) for r in g]
def outline(rows, ch='k'):
    h, w = len(rows), len(rows[0])
    g = [list(r) for r in rows]
    get = lambda x, y: rows[y][x] if 0 <= x < w and 0 <= y < h else '.'
    for y in range(h):
        for x in range(w):
            if rows[y][x] != '.': continue
            if any(get(x+dx, y+dy) not in '.k' for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))): g[y][x] = ch
    return [''.join(r) for r in g]
def mirror(half):
    # połowa lewa (8 znaków) → pełny wiersz 16
    return [r + r[::-1] for r in half]
def finish(rows): return outline(shade(rows))
def grid(w=16, h=16): return [['.']*w for _ in range(h)]
def tostr(g): return [''.join(r) for r in g]
