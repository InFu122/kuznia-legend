# Pixel art Kuźni Legend

Grafiki są danymi w kodzie (`src/art/items-data.ts`, `src/art/icons-data.ts`): siatki znaków + palety.
Gra rysuje je w przeglądarce (`src/art/render.ts`), a jeden szablon przedmiotu przemalowuje się na każdy metal.

Szablony składają skrypty w tym katalogu (Python 3 + Pillow tylko do podglądu):

- `weapons.py`, `armor.py` — ekwipunek 16×16, 3 poziomy zdobień (litery regionów: M metal, G złoto, L skóra, W drewno, C sukno, J klejnot),
- `ores.py` — rudy, domieszki, rudy unikalne, zasoby,
- `skills.py` — umiejętności 24×24, `tech.py` — badania 20×20,
- `shade.py`, `shade2.py` — automatyczne cieniowanie (światło z lewej góry) i obrys.

Po zmianach:

```bash
cd tools/art && python3 export.py ../../src/art          # nowe dane dla gry
npx vite-node tools/art-gallery.ts galeria.html          # strona z podglądem wszystkich grafik (z katalogu głównego)
```

Plików `*-data.ts` można też poprawiać ręcznie — to zwykłe siatki znaków.
