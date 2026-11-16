import sys; sys.path.insert(0, '.')
import bossy, vol
C = dict(bone='#e6dcc0', steel='#a8b0bc', gold='#d9a83a', wood='#6a4a2a')
def P(**k): return {a: C.get(v, v) for a, v in k.items()}
T = eval(open(sys.argv[2]).read())
items = []
for n, cols in T:
    for f in (0, 1): items.append((getattr(bossy, n)(f).rows(), vol.palette(cols)))
vol.sheet(items, sys.argv[1], scale=3, cols=8)
