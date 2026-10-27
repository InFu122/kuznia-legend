# Architektura

## Zasada główna: silnik osobno, interfejs osobno

`src/engine/` to czysty TypeScript. Nie dotyka DOM, `window`, `localStorage` ani `Date.now()` — czas i losowość dostaje z zewnątrz przez obiekt `Ctx`:

```ts
interface Ctx {
  s: GameState;      // zapisywany stan gracza
  b: Battle;         // stan walki (niezapisywany)
  rng: Rng;          // losowość — w testach z ziarnem
  now: () => number; // zegar — w testach sterowany
  emit: (e: GameEvent) => void; // zdarzenia dla interfejsu
  cache: Stats | null;
  dirty: boolean;    // stan zmienił się od ostatniego zapisu
}
```

Dzięki temu ten sam kod:
- działa w przeglądarce i w aplikacji Capacitor,
- daje się testować deterministycznie (`tests/`),
- napędza symulator balansu (`tools/balance-sim.ts`),
- w etapie 3 trafi na serwer Nakama (środowisko TypeScript), gdzie wytop, waluty i PvP będą liczone autorytatywnie.

## Przepływ

```
main.tsx ── pętla requestAnimationFrame ──► Game.tick(ms)
                                            ├─ tickForge    (ulepszenie kuźni)
                                            ├─ tickResearch (badanie w Akademii)
                                            ├─ tickHatch    (wykluwanie jaja)
                                            ├─ tutTick      (kroki samouczka)
                                            ├─ obiegEvent   (Wielki Obieg)
                                            ├─ auto-wytop
                                            ├─ dungTick     (czas Skarbca)
                                            └─ stepCombat   (fale, bossowie, lochy, umiejętności, chowaniec)
Game.emit ──► interfejs: toast · float · bump · drop · sfx · modal · change
UI ──► akcje Game: smeltManual, equipPending, upgrade, research, goLand, startDung(id)…
```

`Game` (`src/engine/game.ts`) to jedyny punkt wejścia dla interfejsu. Interfejs niczego nie liczy sam — czyta stan i wywołuje akcje.

## Moduły silnika

| Plik | Odpowiada za |
| --- | --- |
| `formulas.ts` | wszystkie wzory: krzywe trudności, koszty, szanse przeskoku, nazwy przedmiotów |
| `forge.ts` | wytop, gwarancja przeskoku, zakładanie, sprzedaż, ulepszanie kuźni |
| `combat.ts` | fale, bossowie, przenoszenie między krainami |
| `legend.ts` | Sława Czynów, progi legendy, przebudzenie |
| `obieg.ts` | Piętno Kowala i Wielki Obieg (do etapu 4 symulowany) |
| `dungeon.ts` | 9 lochów (Skarbiec, Sztolnia, Wieża, Leża Bossów, Ołtarze, Kopalnia Kryształów, Labirynt, Zbrojownia, Krypta); klucze dzienne |
| `tech.ts`, `mods.ts` | Akademia Kowalska: koszty i czas badań; `allMods` sumuje technologie, cechę chowańca i wierzchowca |
| `missions.ts` | misje dzienne i tygodniowe (`track` liczy postęp), skrzynia za komplet, kalendarz logowania |
| `tutorial.ts` | samouczek: warunki kroków i nagrody |
| `reward.ts` | `grant` — przyznawanie nagród |
| `companions.ts` | Zwoje i umiejętności, jaja i chowańce, Siodła i wierzchowce, ulepszanie Kamieniami, Pieczęcie Legendy |
| `offline.ts` | nagrody za czas poza grą, Skrzynia nocnej zmiany |
| `stats.ts` | statystyki bohatera i Moc, premie technologii i zestawów |
| `state.ts` | nowy stan i migracja starszych zapisów |

## Balans i tempo

Siła przedmiotu = baza slotu × 1,08^poziom × mnożnik rzadkości × bonus legendy, a poziom przedmiotu = 2 × poziom kuźni. Postęp w kampanii nie podnosi siły przedmiotów, więc krainy stawiają ściany, które pokonuje się:

- ulepszaniem kuźni (czas: poz. 10 ≈ 40 min, 20 ≈ 9 h, 25 ≈ 31 h, 30 ≈ 108 h gry; Wielkie miechy skracają go do 30%),
- lepszymi rudami i przeskokami,
- legendami przedmiotów,
- technologiami (Księgi Wiedzy z bossów, rzadko z fal, z Wieży Wyzwań),
- zestawami z rud unikalnych (bossowie i Leża Bossów, wytop od 15. poziomu kuźni),
- umiejętnościami, chowańcem i wierzchowcem (Moc liczy ich szacunkowy wkład: `skillFactor` w `stats.ts`).

Wrogowie skalują się z oczekiwanej siły gracza (`forgeExp`, `rarityExp`, `extrasExp`) i kalibracji `ENEMY_SCALE_AT_BOSS`. Kalibracja zakłada gracza, który korzysta z technologii, lochów i zestawów. Symulator ma tryb `plain` (bot bez tych systemów) jako punkt odniesienia: `npm run balance -- 150 3 plain`.

## Zapis

Stan gracza to jeden obiekt JSON (`GameState`). `SAVE_VERSION` rośnie przy każdej zmianie znaczenia pól, a `migrate()` przenosi stare zapisy. Wersja 2 przeliczyła poziomy przedmiotów na model oparty o kuźnię. Wersja 3 dodała technologie, Księgi Wiedzy, rudy unikalne i wiele lochów (stare pole `dung` przechodzi do `dungeons.sztolnia`). Wersja 4 dodała umiejętności, chowańce, wierzchowce, Kamienie, Pieczęcie Legendy i znaleziska ze Zbrojowni. Wersja 5 dodała misje, kalendarz logowania, samouczek i ustawienia dźwięku (starzy gracze mają samouczek od razu ukończony).

## Dźwięk

`src/ui/sound.ts` syntezuje dźwięki w Web Audio (młot, przeskok, trafienia, drop rudy, boss, nagrody), więc gra nie potrzebuje plików audio. Silnik wysyła zdarzenia `sfx`, interfejs je odtwarza z ograniczeniem częstotliwości. Kontekst audio rusza przy pierwszym geście gracza (wymóg przeglądarek i WebView).

## Co dalej technicznie

- **Etap 3:** `src/save/` dostanie adapter Nakama; wytop przeniesie się na serwer (klient wyśle „przetop rudę X”, serwer odpowie przedmiotem).
- **Etap 5:** Capacitor opakuje `dist/` w aplikacje. Fonty trzeba wtedy dołączyć lokalnie, żeby gra działała bez internetu.
