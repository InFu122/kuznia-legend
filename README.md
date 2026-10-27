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
npm run build:server   # moduł serwera Nakama → server/build/index.js
```

W trakcie testów w zakładce Kodeks jest przełącznik **Tempo ×10**, który przyspiesza walkę i timery.

## Serwer gry (Docker)

```bash
cp .env.example .env      # ustaw własne hasła i klucze
docker compose up -d --build
```

Gra: `http://ADRES-SERWERA:8080`, konsola Nakamy: `:7351`. Szczegóły, CasaOS i kopie zapasowe: [docs/SERWER.md](docs/SERWER.md).

## Struktura

```
src/
  data/       dane gry: rudy, rzadkości, sloty, krainy, liczby balansu
  engine/     silnik gry — czysty TypeScript, bez DOM i bez zegara przeglądarki
  ui/         interfejs w Preact (arena, panele, okna)
  save/       zapis gry (przeglądarka, chmura artefaktu, serwer Nakama)
server/       moduł serwera Nakama (TypeScript, korzysta z silnika z src/), Dockerfile
deploy/       obraz gry z nginx
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
   - 2c: misje dzienne i tygodniowe ze skrzynią za komplet, kalendarz logowania (7. dnia epicki Zwój), samouczek pierwszych 15 minut, dźwięki syntezowane w Web Audio. *(gotowe)*
3. **Serwer** — Nakama
   - 3a: Docker (Nakama 3.30 + PostgreSQL + gra w nginx), konta zakładane automatycznie, zapis na serwerze z kontrolą i wykrywaniem konfliktów, czas serwera, rankingi Mocy, Wieży i postępu. *(gotowe)*
   - 3b: przenoszenie konta na inne urządzenie kodem, wytop z ziarnem serwera (bez cofania i powtarzania wytopów; serwer sprawdza przedmioty i tempo rozwoju kuźni), prawdziwy Wielki Obieg między graczami, arena z oceną i rankingiem. *(gotowe)*
4. **Społeczność**
   - 4a: unikalne nicki (nadawane nowym graczom, zmiana w Kodeksie), klany do 30 osób z rolami (Przywódca, Zastępcy, Starsi), ogłoszenia, czat na żywo — globalny i klanowy — z filtrem wulgaryzmów, trybem wolnym, wyciszaniem i zgłaszaniem, karty Mitycznych i Boskich dropów na czacie. *(gotowe)*
   - 4b: Wspólna Kuźnia Klanu z 10 poziomami premii, boss klanowy ze skrzyniami dla atakujących, pomoc w ulepszeniach kuźni, prośby o rudę, Monety i sklep klanowy. *(gotowe)*
   - 4c: wojny klanów i ranking klanów.
5. **Sklep** — aplikacja Capacitor na Androida i iOS, płatności, reklamy z nagrodą, soft launch.
