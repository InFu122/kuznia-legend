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
                                            ├─ tickForge   (ulepszenie kuźni)
                                            ├─ obiegEvent  (Wielki Obieg)
                                            ├─ auto-wytop
                                            └─ stepCombat  (fale, bossowie, Sztolnia)
Game.emit ──► interfejs: toast · float · bump · modal · change
UI ──► akcje Game: smeltManual, equipPending, upgrade, goLand, startDung…
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
| `dungeon.ts` | Głęboka Sztolnia |
| `offline.ts` | nagrody za czas poza grą, Skrzynia nocnej zmiany |
| `stats.ts` | statystyki bohatera i Moc |
| `state.ts` | nowy stan i migracja starszych zapisów |

## Balans i tempo

Siła przedmiotu = baza slotu × 1,08^poziom × mnożnik rzadkości × bonus legendy, a poziom przedmiotu = 2 × poziom kuźni. Postęp w kampanii nie podnosi siły przedmiotów, więc krainy stawiają ściany, które pokonuje się:

- ulepszaniem kuźni (czas: poz. 10 ≈ 40 min, 20 ≈ 9 h, 25 ≈ 31 h, 30 ≈ 108 h gry),
- lepszymi rudami i przeskokami,
- legendami przedmiotów.

Wrogowie skalują się z oczekiwanej siły gracza (`forgeExp`, `rarityExp`, `extrasExp`) i kalibracji `ENEMY_SCALE_AT_BOSS`.

## Zapis

Stan gracza to jeden obiekt JSON (`GameState`). `SAVE_VERSION` rośnie przy każdej zmianie znaczenia pól, a `migrate()` przenosi stare zapisy. Wersja 2 przeliczyła poziomy przedmiotów na model oparty o kuźnię.

## Co dalej technicznie

- **Etap 3:** `src/save/` dostanie adapter Nakama; wytop przeniesie się na serwer (klient wyśle „przetop rudę X”, serwer odpowie przedmiotem).
- **Etap 5:** Capacitor opakuje `dist/` w aplikacje. Fonty trzeba wtedy dołączyć lokalnie, żeby gra działała bez internetu.
