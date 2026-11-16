import sys; sys.path.insert(0, '.')
import importlib, foes, vol
C = dict(grey='#8a847a', brown='#8a5d3b', dark='#4a413c', cream='#c8b590', bone='#e6dcc0', red='#b8463a', black='#34313e', bog='#6f8a3e', green='#5f9a45', skin='#c79a7a', fire='#e0702a', teal='#45a698')
def P(**k): return {a: C.get(v, v) for a, v in k.items()}
T = eval(open(sys.argv[2]).read()) if len(sys.argv) > 2 else []
items = []
for n, cols in T:
    for f in (0, 1): items.append((getattr(foes, n)(f).rows(), vol.palette(cols)))
vol.sheet(items, sys.argv[1], scale=4, cols=8)
