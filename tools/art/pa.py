# Pomocnik do składania pixel artu z figur: siatka znaków, automatyczny obrys (4-sąsiedztwo).
class G:
    def __init__(s, w=16, h=16): s.w, s.h = w, h; s.g = [['.']*w for _ in range(h)]
    def put(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.g[y][x] = c
    def get(s, x, y): return s.g[y][x] if 0 <= x < s.w and 0 <= y < s.h else '.'
    def diag(s, c, ys, ch, shade=None):
        # komórki na przekątnej x+y=c dla y w ys
        for y in ys: s.put(c - y, y, ch)
    def adiag(s, c, ys, ch):
        # komórki na przekątnej x-y=c
        for y in ys: s.put(c + y, y, ch)
    def rect(s, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.put(x, y, ch)
    def circle(s, cx, cy, r, ch, fill=True):
        for y in range(s.h):
            for x in range(s.w):
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if (d <= r + 0.3) if fill else abs(d - r) < 0.6: s.put(x, y, ch)
    def outline(s, ch='k', diag=False):
        add = []
        for y in range(s.h):
            for x in range(s.w):
                if s.g[y][x] != '.': continue
                nb = [(1,0),(-1,0),(0,1),(0,-1)] + ([(1,1),(1,-1),(-1,1),(-1,-1)] if diag else [])
                if any(s.get(x+dx, y+dy) not in '.k' for dx, dy in nb): add.append((x, y))
        for x, y in add: s.g[y][x] = ch
    def rows(s): return [''.join(r) for r in s.g]
    def show(s, name=''):
        print(f"    // {name}"); print('    [')
        for r in s.rows(): print(f"      '{r}',")
        print('    ],')
