# Kuźnia Legend

Mobilne idle RPG w klasycznym fantasy: bohater walczy sam, a gracz przetapia rudy zdobyte w walce na ekwipunek. Ruda gwarantuje minimalną rzadkość, kuźnia daje szansę na przeskok wyżej, a założone przedmioty zbierają Sławę Czynów i budzą się z własnym imieniem. Każdy przedmiot nosi podpis kowala (Piętno Kowala) i może trafić do innych graczy przez Wielki Obieg.

Pełny projekt gry (GDD): dokument „Kuźnia Legend — dokument projektowy gry” w claude.ai.

## Uruchomienie

Wymagany Node.js 20 lub nowszy.

```bash
npm install
npm run dev            # gra w przeglądarce z odświeżaniem na żywo
npm test               # testy silnika
npm run balance        # symulator balansu → balans/balans.xlsx (domyślnie 48 h gry, 3 przebiegi)
npm run balance -- 160 5   # 160 h gry, 5 przebiegów
npm run balance -- 150 3 plain   # bot bez technologii, lochów i zestawów (punkt odniesienia)
npm run build          # wersja produkcyjna w dist/
npm run build:single   # cała gra w jednym pliku: dist-single/index.html
npm run build:artifact # fragment do publikacji jako artefakt claude.ai
```

W trakcie testów w zakładce Kodeks jest przełącznik **Tempo ×10**, który przyspiesza walkę i timery.

## Struktura

```
src/
  data/       dane gry: rudy, rzadkości, sloty, krainy, liczby balansu
  engine/     silnik gry — czysty TypeScript, bez DOM i bez zegara przeglądarki
  ui/         interfejs w Preact (arena, panele, okna)
  save/       zapis gry (przeglądarka, a później serwer)
tests/        testy silnika (Vitest)
tools/        symulator balansu, pakowanie artefaktu
docs/         dokumentacja techniczna
```

Szczegóły w [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md).

## Balans

Wszystkie liczby siedzą w `src/data/balance.ts`. Po każdej zmianie uruchom `npm run balance` i porównaj w arkuszu **Bossowie**, przy jakim poziomie kuźni bot pokonuje bossów, z krzywą `FORGE_AT_BOSS`.

Obecna kalibracja (bot grający bez przerwy i korzystający ze wszystkich systemów: technologii, lochów, zestawów, umiejętności, chowańców i wierzchowców): akt I ≈ 0,6 h, akt II ≈ 7 h, akt III ≈ 24 h, akt IV ≈ 100–120 h. Złoto wypada z każdej fali, ruda z 35% fal (`B.ORE_DROP`).

## Plan

1. **Fundament** — projekt, silnik w modułach, testy, symulator balansu. *(gotowe)*
2. **Pełna gra offline**
   - 2a: drzewko technologii (Akademia Kowalska, Księgi Wiedzy), lochy Skarbiec Złota, Wieża Wyzwań, Leża Bossów i Ołtarze Żywiołów, rudy unikalne i 6 zestawów. *(gotowe)*
   - 2b: umiejętności (Zwoje zaklęć), chowańce (jaja i wykluwanie), wierzchowce (Siodła), Kamienie z Kopalni Kryształów, Labirynt Minotaura, Krypta Bohaterów z Pieczęciami Legendy, Zapomniana Zbrojownia. *(gotowe)*
   - 2c: misje dzienne, kalendarz logowania, samouczek, dźwięki.
3. **Serwer** — Nakama: konta, zapis, wytop liczony na serwerze, rankingi, arena.
4. **Społeczność** — klany, czat, prawdziwy Wielki Obieg, boss i wojny klanów.
5. **Sklep** — aplikacja Capacitor na Androida i iOS, płatności, reklamy z nagrodą, soft launch.
