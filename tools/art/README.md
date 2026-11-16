# Pixel art Kuźni Legend

Grafiki są danymi w kodzie (`src/art/items-data.ts`, `src/art/icons-data.ts`): siatki znaków + palety.
Gra rysuje je w przeglądarce (`src/art/render.ts`), a jeden szablon przedmiotu przemalowuje się na każdy metal.

Szablony składają skrypty w tym katalogu (Python 3 + Pillow tylko do podglądu):

- `weapons.py`, `armor.py` — ekwipunek 16×16, 3 poziomy zdobień (litery regionów: M metal, G złoto, L skóra, W drewno, C sukno, J klejnot),
- `ores.py` — rudy, domieszki, rudy unikalne, zasoby,
- `skills.py` — umiejętności 24×24, `tech.py` — badania 20×20,
- `bosses.py` — boss klanowy 32×32 (jeden szablon, 5 palet), Moneta klanowa, klepsydra, miecze i kowadło,
- `vol.py` — rysowanie postaci „z brył”: kule, kończyny i płyty z własną wypukłością, światło z lewej góry, 5 tonów materiału + obrys; części z przodu rzucają cień na te z tyłu,
- `foes.py` — wrogowie i towarzysze 48×48 (dwie klatki ruchu), `bossy.py` — 16 bossów krain 64×64, `hero.py` — bohater 48×48 z warstw (ciało, hełmy, zbroje, rękawice, buty, pasy, amulet, 10 rodzajów broni),
- `actors.py` — kto jak wygląda (szablon + kolory bazowe materiałów) i eksport → `src/art/actors-data.ts`; tony z koloru bazowego liczy gra (`ramp6` w `src/art/pixel.ts`),
- `shade.py`, `shade2.py` — automatyczne cieniowanie (światło z lewej góry) i obrys.

Po zmianach:

```bash
cd tools/art && python3 export.py ../../src/art          # nowe dane dla gry
npx vite-node tools/art-gallery.ts galeria.html          # strona z podglądem wszystkich grafik (z katalogu głównego)
npx vite-node tools/art-sheet.ts postaci.png 2           # wszystkie postaci w jednym PNG
```

Plików `*-data.ts` można też poprawiać ręcznie — to zwykłe siatki znaków.
