# Cieniowanie dla ikon z własną paletą: regiony p q r s t → tony (jasny, średni, ciemny, najciemniejszy).
TONES = {'p': 'ABCD', 'q': 'EFGH', 'r': 'IJKL', 's': 'MNOP', 't': 'QRST'}
def shade(rows):
    h, w = len(rows), len(rows[0])
    g = [list(r) for r in rows]
    get = lambda x, y: rows[y][x] if 0 <= x < w and 0 <= y < h else '.'
    for y in range(h):
        for x in range(w):
            c = rows[y][x]
            if c not in TONES: continue
            hi, mid, lo, deep = TONES[c]
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
def finish(rows): return outline(shade(rows))
def ramp(key, cols):  # paleta regionu: key ∈ p q r s t, cols = 4 kolory (jasny→najciemniejszy)
    return dict(zip(TONES[key], cols))
