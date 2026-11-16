# Rysowanie postaci „z brył”: każda część ciała to kula, kończyna albo płyta z własną wypukłością.
# Światło pada z lewej góry; z kąta padania wychodzi jeden z 5 tonów materiału (1 cień … 5 błysk), ton 0 to obrys.
# Części rysowane później zasłaniają wcześniejsze i rzucają na nie wąski cień — stąd głębia bez ręcznego cieniowania.
#
# Wynik: siatka znaków. Materiał m (kolejny z MATS) i ton t → znak ALPH[m*6 + t]. Znaki specjalne: SPECIAL.
# Kolory dobiera gra: z jednego koloru bazowego materiału robi 6 tonów z przesunięciem barwy (src/art/pixel.ts: ramp6).
import math

ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuv'   # 8 materiałów × 6 tonów (cyfry zostają dla zapisu RLE)
MATS = 'pqrstuvx'
SPECIAL = {'e': '*', 'w': '+', 'k': '#', 'g': '~', 'h': '^'}   # oczy/blask, biel, czerń, poświata, poświata jasna
_L = (-0.50, -0.62, 0.60)
_n = math.sqrt(sum(v * v for v in _L)); LIGHT = tuple(v / _n for v in _L)
THR = (0.16, 0.40, 0.70, 0.93)           # progi tonów 1|2|3|4|5

def tone_of(l):
    return 1 + sum(1 for t in THR if l >= t)

class V:
    def __init__(s, w=48, h=48, flip=False, sc=1.0):
        s.w, s.h, s.flip, s.sc = w, h, flip, sc
        s.mat = [[None] * w for _ in range(h)]
        s.lum = [[0.0] * w for _ in range(h)]
        s.ord = [[0] * w for _ in range(h)]
        s.fix = [[None] * w for _ in range(h)]
        s.ao = [[True] * w for _ in range(h)]
        s.n = 0
    # --- pomocnicze
    def _x(s, x): return (s.w - x) if s.flip else x
    def _put(s, x, y, m, l, only=None, keep=False, ao=True):
        if not (0 <= x < s.w and 0 <= y < s.h): return
        if only is not None and (s.mat[y][x] is None or s.mat[y][x] not in only): return
        if m == '.':
            s.mat[y][x] = None; s.fix[y][x] = None; return
        s.mat[y][x] = m; s.fix[y][x] = None
        if not keep:
            s.lum[y][x] = l; s.ord[y][x] = s.n; s.ao[y][x] = ao
    def _lit(s, nx, ny, nz, k=1.0, add=0.0):
        l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]
        return max(0.0, min(1.0, 0.6 + (l - 0.6) * k + add))
    # --- bryły
    def ball(s, cx, cy, rx, ry, m, k=1.0, add=0.0, only=None, keep=False, ao=True):
        """Kula / elipsoida."""
        k2 = s.sc; cx, cy, rx, ry = cx * k2, cy * k2, rx * k2, ry * k2
        cx = s._x(cx); s.n += 1
        for y in range(max(0, int(cy - ry) - 1), min(s.h, int(cy + ry) + 2)):
            for x in range(max(0, int(cx - rx) - 1), min(s.w, int(cx + rx) + 2)):
                nx, ny = (x + .5 - cx) / rx, (y + .5 - cy) / ry
                d = nx * nx + ny * ny
                if d <= 1: s._put(x, y, m, s._lit(nx, ny, math.sqrt(1 - d), k, add), only, keep, ao)
    def limb(s, x0, y0, x1, y1, r0, r1=None, m='p', k=1.0, add=0.0, only=None, keep=False, ao=True):
        """Kończyna: walec o promieniu r0 → r1 z zaokrąglonymi końcami."""
        if r1 is None: r1 = r0
        k2 = s.sc; x0, y0, x1, y1, r0, r1 = x0 * k2, y0 * k2, x1 * k2, y1 * k2, r0 * k2, r1 * k2
        x0, x1 = s._x(x0), s._x(x1); s.n += 1
        dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy or 1e-9
        R = max(r0, r1)
        for y in range(max(0, int(min(y0, y1) - R) - 1), min(s.h, int(max(y0, y1) + R) + 2)):
            for x in range(max(0, int(min(x0, x1) - R) - 1), min(s.w, int(max(x0, x1) + R) + 2)):
                px, py = x + .5, y + .5
                t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / L2))
                r = r0 + (r1 - r0) * t
                ox, oy = px - (x0 + dx * t), py - (y0 + dy * t)
                d = math.hypot(ox, oy) / r
                if d <= 1: s._put(x, y, m, s._lit(ox / r, oy / r, math.sqrt(1 - d * d), k, add), only, keep, ao)
    def poly(s, pts, m, bevel=1.6, k=1.0, add=0.0, only=None, keep=False, ao=True):
        """Płyta (wielokąt) ze ściętymi krawędziami."""
        pts = [(s._x(x * s.sc), y * s.sc) for x, y in pts]; bevel *= s.sc; s.n += 1
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys)) - 1), min(s.h, int(max(ys)) + 2)):
            for x in range(max(0, int(min(xs)) - 1), min(s.w, int(max(xs)) + 2)):
                px, py = x + .5, y + .5; inside = False; best = 1e9; bn = (0, 0)
                for i in range(len(pts)):
                    (ax, ay), (bx, by) = pts[i], pts[(i + 1) % len(pts)]
                    if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax: inside = not inside
                    ex, ey = bx - ax, by - ay; l2 = ex * ex + ey * ey or 1e-9
                    t = max(0, min(1, ((px - ax) * ex + (py - ay) * ey) / l2))
                    qx, qy = ax + ex * t, ay + ey * t; d = math.hypot(px - qx, py - qy)
                    if d < best: best = d; bn = (px - qx, py - qy)
                if not inside: continue
                if bevel > 0 and best < bevel:
                    f = 1 - best / bevel; ln = math.hypot(*bn) or 1
                    nx, ny = -bn[0] / ln * f * .85, -bn[1] / ln * f * .85
                    nz = math.sqrt(max(0.05, 1 - nx * nx - ny * ny))
                else: nx, ny, nz = 0, 0, 1
                s._put(x, y, m, s._lit(nx, ny, nz, k, add), only, keep, ao)
    def chain(s, pts, r0, r1, m, **kw):
        """Łańcuch kończyn przez punkty (wąż, ogon, macka): promień r0 → r1."""
        n = len(pts) - 1
        for i in range(n):
            a = r0 + (r1 - r0) * i / n; b = r0 + (r1 - r0) * (i + 1) / n
            s.limb(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], a, b, m, **kw)
    def tri(s, a, b, c2, m, **kw):
        kw.setdefault('bevel', .8); s.poly([a, b, c2], m, **kw)
    def rect(s, x0, y0, x1, y1, m, **kw):
        s.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], m, **kw)
    # --- detale
    def dot(s, x, y, ch):
        """Piksel o stałym kolorze: znak z SPECIAL (e w k g h) albo '.' (dziura)."""
        if s.sc != 1:
            x0, y0 = int(x * s.sc), int(y * s.sc)
            cells = [(x0 + i, y0) for i in range(int(round(s.sc + .3)))]
        else: cells = [(int(x), int(y))]
        for (x, y) in cells:
            x = int(math.floor(s._x(x + .5)))
            if 0 <= x < s.w and 0 <= y < s.h:
                if ch == '.': s.mat[y][x] = None; s.fix[y][x] = None
                else:
                    s.fix[y][x] = SPECIAL[ch]
                    if s.mat[y][x] is None: s.mat[y][x] = MATS[0]; s.lum[y][x] = .6; s.ord[y][x] = s.n
    def dots(s, pts, ch):
        for x, y in pts: s.dot(x, y, ch)
    def seg(s, x0, y0, x1, y1, ch):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n; s.dot(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), ch)
    def shade(s, x, y, d):
        """Rozjaśnia (d>0) albo przyciemnia (d<0) piksel o d tonów."""
        x = int(math.floor(s._x(int(x * s.sc) + .5))); y = int(y * s.sc)
        if 0 <= x < s.w and 0 <= y < s.h and s.mat[y][x]: s.lum[y][x] = max(0, min(1, s.lum[y][x] + d * .25))
    def line(s, x0, y0, x1, y1, m, d=0, only=None):
        """Cienka kreska materiałem m (1 px), opcjonalnie tylko na materiałach `only`."""
        s.n += 1
        x0, y0, x1, y1 = x0 * s.sc, y0 * s.sc, x1 * s.sc, y1 * s.sc
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n
            x = int(math.floor(s._x(x0 + (x1 - x0) * t + .5))); y = int(round(y0 + (y1 - y0) * t))
            s._put(x, y, m, max(0, min(1, .6 + d * .25)), only, False, False)
    # --- wynik
    def rows(s, outline=True, ao=True):
        w, h = s.w, s.h
        tone = [[0] * w for _ in range(h)]
        for y in range(h):
            for x in range(w):
                if s.mat[y][x] is None: continue
                t = tone_of(s.lum[y][x])
                if ao and s.ao[y][x]:
                    o = s.ord[y][x]; drop = 0
                    for dx, dy, wgt in ((-1, 0, 1), (0, -1, 1), (-1, -1, 1)):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and s.mat[yy][xx] is not None and s.ord[yy][xx] > o and s.ao[yy][xx]: drop = max(drop, wgt)
                    t = max(1, t - drop)
                tone[y][x] = t
        g = [['.'] * w for _ in range(h)]
        for y in range(h):
            for x in range(w):
                m = s.mat[y][x]
                if m is None: continue
                g[y][x] = s.fix[y][x] or ALPH[MATS.index(m) * 6 + tone[y][x]]
        if outline:
            add = []
            for y in range(h):
                for x in range(w):
                    if s.mat[y][x] is not None: continue
                    best = None
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and s.mat[yy][xx] is not None:
                            if best is None or s.ord[yy][xx] > best[0]: best = (s.ord[yy][xx], s.mat[yy][xx])
                    if best: add.append((x, y, ALPH[MATS.index(best[1]) * 6]))
            for x, y, ch in add: g[y][x] = ch
        return [''.join(r) for r in g]

# ---------------------------------------------------------------- kolory (to samo liczy gra: src/art/pixel.ts ramp6)
import colorsys
def _hex(c): return tuple(int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
def _toward(h, target, deg):
    d = ((target - h + 540) % 360) - 180
    return (h + max(-deg, min(deg, d))) % 360
def ramp6(base):
    """6 tonów z koloru bazowego: 0 obrys, 1–2 cienie (chłodniejsze), 3 baza, 4–5 światła (cieplejsze)."""
    r, g, b = _hex(base); h, s, v = colorsys.rgb_to_hsv(r, g, b); h *= 360
    spec = [(0.30, 1.15, 255, 24), (0.50, 1.14, 255, 16), (0.74, 1.08, 255, 8), (1.0, 1.0, 0, 0), (-0.32, 0.82, 55, 7), (-0.62, 0.52, 55, 13)]
    out = []
    for i, (kv, ks, th, deg) in enumerate(spec):
        hh = _toward(h, th, deg) if s > 0.04 else h
        vv = v * kv if kv > 0 else v + (1 - v) * (-kv)
        ss = min(1, s * ks)
        rr, gg, bb = colorsys.hsv_to_rgb(hh / 360, ss, vv)
        if i == 0: rr, gg, bb = rr * .7 + .078 * .3, gg * .7 + .059 * .3, bb * .7 + .102 * .3
        out.append('#%02x%02x%02x' % (round(rr * 255), round(gg * 255), round(bb * 255)))
    return out
def palette(cols):
    """cols: {'p': '#..', 'q': ..., 'e': kolor oczu, 'g': poświata} → znak → kolor."""
    pal = {'+': '#ffffff', '#': '#140f1a', '*': cols.get('e', '#ffd23a')}
    g = cols.get('g', cols.get('e', '#ffd23a')); pal['~'] = g
    r, gg, b = _hex(g); pal['^'] = '#%02x%02x%02x' % tuple(round((c + (1 - c) * .6) * 255) for c in (r, gg, b))
    for m, base in cols.items():
        if m in MATS:
            for t, c in enumerate(ramp6(base)): pal[ALPH[MATS.index(m) * 6 + t]] = c
    return pal
def sheet(items, path, scale=4, cols=8, bg=(86, 104, 84), cell=None):
    """items: [(rows, pal)] → PNG z podglądem."""
    from PIL import Image
    cw = cell or max(len(r[0][0]) for r in items) * scale + 8
    n = len(items); H = ((n + cols - 1) // cols) * cw
    im = Image.new('RGB', (cols * cw, H), bg)
    for i, (rows, pal) in enumerate(items):
        ox, oy = (i % cols) * cw + 4, (i // cols) * cw + 4
        if (i % cols + i // cols) % 2: im.paste(Image.new('RGB', (cw, cw), tuple(max(0, c - 14) for c in bg)), (ox - 4, oy - 4))
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch == '.' or ch not in pal: continue
                c = tuple(int(pal[ch][j:j + 2], 16) for j in (1, 3, 5))
                for dy in range(scale):
                    for dx in range(scale): im.putpixel((ox + x * scale + dx, oy + y * scale + dy), c)
    im.save(path)
