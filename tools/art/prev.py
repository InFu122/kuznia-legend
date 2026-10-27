# Podgląd w Pythonie (te same palety co src/art/items.ts).
from PIL import Image
METALS = [
 (['#6b3324','#a5522c','#d9824a','#f6c48e'], ['#1f7f75','#4fd0bd']),
 (['#3b3f47','#666c76','#9aa1ab','#d8dde3'], ['#7a2430','#d0505c']),
 (['#56617a','#93a1b6','#cbd6e4','#ffffff'], ['#2b5fb8','#6fb0ff']),
 (['#1b5767','#2f95a9','#6fd0de','#d4fbff'], ['#5a2fa0','#b07cff']),
 (['#24502a','#3f8742','#79b86c','#d0f0b4'], ['#a3262e','#ff6b6b']),
 (['#4e1015','#8f2125','#cf4637','#ff9c78'], ['#c76a00','#ffc23a']),
 (['#7a5a1d','#c09a3e','#f1dd96','#fffbe8'], ['#2a8fd6','#9fe8ff']),
]
FIXED = dict(k='#17121c', a='#3f2618', b='#6e4528', c='#a06c42', l='#46291f', m='#76452f', n='#a5694a',
             y='#8a5a12', Y='#d8a537', Z='#ffe48f', r='#6a1c24', s='#b33440', w='#ffffff')
def pal(ore):
    r, g = METALS[ore]
    p = dict(FIXED); p.update({'1': r[0], '2': r[1], '3': r[2], '4': r[3], 'g': g[0], 'h': g[1]}); return p
def hexc(c): return tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
def render(rows, p, scale):
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new('RGBA', (w*scale, h*scale), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in '. ' or ch not in p: continue
            for dy in range(scale):
                for dx in range(scale): im.putpixel((x*scale+dx, y*scale+dy), hexc(p[ch]) + (255,))
    return im
def sheet(grid, scale=5, path='out.png', pad=12):
    # grid: lista wierszy; element = (rows, palette)
    cell = max(max(len(r[0]) for r in row) for row in grid if row) * scale + pad
    W = max(len(r) for r in grid) * cell; H = len(grid) * cell
    out = Image.new('RGB', (W, H), (38, 34, 42))
    for j, row in enumerate(grid):
        for i, it in enumerate(row):
            bg = (38,34,42) if (i+j) % 2 == 0 else (48,43,54)
            out.paste(Image.new('RGB', (cell, cell), bg), (i*cell, j*cell))
            if not it: continue
            im = render(it[0], it[1], scale)
            out.paste(im, (i*cell + (cell-im.width)//2, j*cell + (cell-im.height)//2), im)
    out.save(path)
