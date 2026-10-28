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

- ulepszaniem kuźni (tabela `UPGRADE_MIN`: pierwsze poziomy minuty, poz. 10 ≈ 2 h łącznie, 15 ≈ 18 h, 20 ≈ 5 dni, 25 ≈ 20 dni, 30 ≈ 55 dni; Wielkie miechy skracają czas o 30%, pomoc klanu o kolejne do 30%),
- lepszymi rudami i przeskokami (każda kraina ma rozkład rud `drops`: rudy rzadsze niż główna pojawiają się z małą szansą i rosną kraina po krainie),
- legendami przedmiotów,
- technologiami (Księgi Wiedzy z bossów, rzadko z fal, z Wieży Wyzwań),
- zestawami z rud unikalnych (bossowie i Leża Bossów, wytop od 15. poziomu kuźni),
- umiejętnościami, chowańcem i wierzchowcem (Moc liczy ich szacunkowy wkład: `skillFactor` w `stats.ts`).

Wrogowie skalują się z oczekiwanej siły gracza (`forgeExp`, `rarityExp`, `extrasExp`) i kalibracji `ENEMY_SCALE_AT_BOSS`. Kalibracja zakłada gracza, który korzysta z technologii, lochów i zestawów. Symulator ma tryb `plain` (bot bez tych systemów) jako punkt odniesienia: `npm run balance -- 150 3 plain`, oraz tryb `casual` — gracz grający 3 × 1 h dziennie, a resztę czasu offline: `npm run balance -- 1440 2 casual` (60 dni). Tryb `casual` wypisuje też Moc bota przy oczekiwanym poziomie kuźni względem zalecanej Mocy każdej krainy (do kalibracji `ENEMY_SCALE_AT_BOSS`; cel ok. 1,3–1,5 — bot gra lepiej niż przeciętny gracz).

Złoto: fala daje koszt następnego ulepszenia kuźni podzielony przez `goldWaves(f)` — więcej z: 50 × 1,2^(f−1) fal albo 4,5 fali na minutę czasu następnego ulepszenia. Gracz grający ok. 3 h dziennie zbiera na ulepszenie przez ok. 60% jego czasu; resztę wydaje na badania. Sprzedaż przedmiotu daje ok. pół fali złota (więcej za rzadsze). Czasy badań rosną jak czasy kuźni (40% czasu ulepszenia na odpowiednim poziomie, min. 10 min), koszt w złocie to koszt ulepszenia kuźni na poziomie badania.

## Zapis

Stan gracza to jeden obiekt JSON (`GameState`). `SAVE_VERSION` rośnie przy każdej zmianie znaczenia pól, a `migrate()` przenosi stare zapisy. Wersja 2 przeliczyła poziomy przedmiotów na model oparty o kuźnię. Wersja 3 dodała technologie, Księgi Wiedzy, rudy unikalne i wiele lochów (stare pole `dung` przechodzi do `dungeons.sztolnia`). Wersja 4 dodała umiejętności, chowańce, wierzchowce, Kamienie, Pieczęcie Legendy i znaleziska ze Zbrojowni. Wersja 5 dodała misje, kalendarz logowania, samouczek i ustawienia dźwięku (starzy gracze mają samouczek od razu ukończony).

## Dźwięk

`src/ui/sound.ts` syntezuje dźwięki w Web Audio (młot, przeskok, trafienia, drop rudy, boss, nagrody), więc gra nie potrzebuje plików audio. Silnik wysyła zdarzenia `sfx`, interfejs je odtwarza z ograniczeniem częstotliwości. Kontekst audio rusza przy pierwszym geście gracza (wymóg przeglądarek i WebView).

## Co dalej technicznie

- **Etap 3a (gotowe):** `src/save/server.ts` łączy grę z Nakamą przez REST (logowanie urządzeniem, RPC). Moduł `server/src/main.ts` używa tego samego silnika co klient: migruje i sprawdza zapis (`validate.ts`), liczy Moc do rankingów. Funkcje RPC: `save_get`, `save_put` (wersjonowanie — wykrywa zapis z innego urządzenia), `time`, `ranking`. Nakama wymaga, żeby `InitModule` i funkcje RPC były globalnymi deklaracjami — `server/build.mjs` pakuje moduł bez eksportów.
- **Etap 3b (gotowe):** moduł serwera jest podzielony na pliki: `save.ts` (zapis, ziarna, sprawdzanie przedmiotów i tempa kuźni), `transfer.ts` (przenoszenie konta), `obieg.ts` (Wielki Obieg), `arena.ts`, `ranking.ts`, `common.ts`; `main.ts` tylko je rejestruje. Esbuild zostawia funkcje z modułów jako globalne deklaracje, więc Nakama je znajduje.
  - **Wytop z ziarnem.** Każdy wytop ma numer `sx` i własne ziarno = pierwsze 32 bity SHA-256(sekret gracza + numer). Sekret zna tylko serwer (magazyn bez odczytu dla gracza). Gra trzyma zapas ziaren (`s.seeds`, 400, dobiera po zapisie), więc wytapia bez czekania na serwer i także w trybie offline (Skrzynia nocnej zmiany). Losowania wytopu idą zawsze w tej samej kolejności (`smeltDraws`), dlatego serwer odtwarza wytop z ziarna (`src/engine/verify.ts`) i porównuje rzadkość, przeskok, miejsce, rodzaj, poziom i statystyki. Ten sam numer daje ten sam przedmiot, a zapis z cofniętym numerem przegrywa z serwerem — wytopu nie da się powtórzyć. Przedmioty bez dowodu pochodzenia (sprzed aktualizacji, bez połączenia, zmienione) działają w grze, ale nie liczą się do rankingu Mocy i na arenie.
  - **Tempo kuźni.** Serwer pamięta czas i poziom kuźni z pierwszego zapisu (`meta.t0`, `meta.f0`) i odrzuca zapis, w którym kuźnia urosła szybciej, niż pozwalają czasy ulepszeń. Z serwerem nie ma tempa testowego ×10.
  - **Wielki Obieg.** Sprzedany przedmiot z ziarnem trafia do kolejki `s.obOut`; `obieg_sync` sprawdza go i dokłada do wspólnej puli. Ta sama funkcja oddaje znaleziska do zapasu `s.obIn` (przedmioty innych graczy na miarę kuźni, podpisane przez serwer; gdy ich brak — kowale-widma) oraz wieści „X znalazł twój przedmiot” (powiadomienia Nakamy). Skrzynie bossów i Zbrojownia biorą przedmioty z `s.obIn`.
  - **Arena.** Po każdym zapisie serwer trzyma kopię bohatera (statystyki z uznanych przedmiotów, umiejętności, chowaniec). `arena_fight` rozgrywa pojedynek (`src/engine/duel.ts`, z ziarnem), zmienia ocenę Elo obu stron i zwraca przebieg do odtworzenia. 5 walk dziennie (doba UTC); brakujących przeciwników zastępują duchy areny — przeskalowane kopie gracza.
  - **Przeniesienie konta.** `transfer_code` daje jednorazowy kod (8 znaków, 10 minut). `transfer_redeem` dołącza nowy identyfikator urządzenia do konta z kodu (`nk.linkDevice`); dotychczasowe konto tego urządzenia znika z rankingów.
- **Etap 5:** Capacitor opakuje `dist/` w aplikacje. Fonty trzeba wtedy dołączyć lokalnie, żeby gra działała bez internetu.
- **Etap 4a (gotowe):**
  - **Nicki** (`server/src/names.ts`): rejestr w magazynie użytkownika systemowego, klucz = nick bez wielkich liter, polskich znaków i separatorów („Łukasz_K.” = „lukaszk”). Pierwszy zapis gracza zajmuje jego imię z gry albo nadaje nick w stylu „Iskra_4821”. Zapis zawsze dostaje nick z rejestru; zmiana tylko przez `name_set` (raz na dobę, pierwsza zmiana nadanego nicku od razu). Bezpośrednia zmiana konta w Nakamie jest zablokowana. Filtr wulgaryzmów: `server/src/filter.ts`.
  - **Klany** (`server/src/clan.ts`): grupy Nakamy, maks. 30 osób. Przywódca = superadmin, Zastępca = admin, Starszy = członek z listy `elders` w metadanych grupy. Tryby wstępu: otwarty, na prośbę (prośba = stan 3 grupy), zamknięty; minimalna Moc liczona z Mocy serwera. Wszystko przez RPC `clan_*` — bezpośrednie API grup jest zablokowane hookami „before”. Nazwy i skróty klanów są unikalne (rejestr `clan_names`).
  - **Czat** (`server/src/chat.ts`, klient `src/save/chat.ts`): WebSocket Nakamy, pokój `global-pl` i kanał grupy klanu; historia przez REST. Hook `ChannelJoin` przepuszcza tylko te kanały, `ChannelMessageSend` sprawdza długość, blokady, czat globalny od 5. poziomu kuźni, tryb wolny (3 s globalny, 1 s klan — `localcache`), filtruje słowa i podpisuje wiadomość nickiem z rejestru. Wiadomość to JSON `{k, t, n, it?}`: `msg`, `sys` (wpisy klanu), `ann` (ogłoszenie), `drop` (karta przedmiotu z `chat_drop`, który sprawdza wytop z ziarnem). Edycja i usuwanie wiadomości są wyłączone; zgłoszenia trafiają do kolekcji `reports`.
- **Etap 4b (gotowe) — życie klanu** (`server/src/clanlife.ts`, gra: `src/engine/clan.ts`, `src/save/clanlife.ts`, `src/ui/panels/ClanLife.tsx`, liczby: `src/data/clan.ts`):
  - Stan klanu w `clan_state/{groupId}` (SYSTEM): Doświadczenie (poziom 0–10), boss (poziom, zdrowie, obrażenia graczy), prośby o pomoc i rudę, kronika. Zmiany przez `updateObject` (kontrola wersji, ponawianie). Dzienne liczniki gracza: `clan/daily` (datki, ataki, nagradzane pomoce, czas prośby o rudę) — dzień UTC.
  - Poziom klanu daje premie w `allMods` (`clanBonus`). Wpisuje go do zapisu **serwer** w `save_put` (`s.clanLvl`); gra dostaje go w odpowiedzi.
  - Boss: zdrowie = max(50 000, suma Mocy członków × 3) × 1,2^poziom; atak = Moc serwera ±15% (`serverRng`). Po pokonaniu skrzynie (`clanBossChest`) dla wszystkich atakujących według miejsca.
  - Pomoc w ulepszeniu: liczba pomocy przy danym poziomie kuźni w `clan/helped` (gracz); gra skraca trwające ulepszenie o 3% za pomoc (`applyClanHelp`), a kontrola tempa kuźni (`paceProblem`) odejmuje te same 3% i liczy czasy z najwyższym poziomem klanu gracza (`meta.clMax`).
  - Nagrody od serwera (Monety, skrzynie, ruda od klanu) czekają w `clan/rewards` z numerami. Gra przyznaje każdą raz i zapamiętuje numery w `s.clanGot`; `save_put` usuwa z kolejki nagrody, których numery są już w zapisie — dzięki temu nagroda nie przepada przy zerwanym połączeniu i nie przychodzi dwa razy.
  - Monety klanowe (`s.clanCoins`) i sklep klanowy (`s.clanShop`, limity tygodniowe, towary od poziomu klanu) działają w grze, jak inne zasoby.
  - RPC: `clan_sync`, `clan_donate`, `clan_boss_attack`, `clan_help_ask`, `clan_help`, `clan_ore_ask`, `clan_ore_give`. Gra odświeża klan co 3 minuty i przy wejściu do zakładki Klan.
  - Zapis w wersji 7 (`clanLvl`, `clanCoins`, `clanShop`, `clanHelp`, `clanGot`).
- **Kuźnia (po testach 4b):** okno decyzji (`ui/Decision.tsx`) po wytopie, z bossa i ze Zbrojowni — nowy przedmiot obok założonego. Przedmioty ze skrzyń trafiają do `s.found` (`addFound`, najwyżej 20) i nigdy nie są brane automatycznie. Auto-wytop (`autoHandle`) zatrzymuje się na rzadkości `s.autoStop` (albo części zestawu) i zostawia przedmiot w `s.pending`; słabsze sprzedaje, do pustego miejsca zakłada. Po decyzji gracza auto-wytop pracuje dalej (`s.auto` zostaje włączone, a sam auto-wytop czeka, dopóki jest `s.pending`). Domieszkę i rudę unikalną wybiera się w osobnym oknie (`mix`). Przed pokazaniem wykutego przedmiotu okno odgrywa animację kucia (`ForgeAnim`): uderzenia młota i poświata wspinająca się od minimum rudy do wylosowanej rzadkości, z drabinką wszystkich rzadkości; dotknięcie ją pomija.
- **Tła (pixel art):** `src/art/scenes.ts` rysuje sceny 160×96 z warstw (niebo z ditheringiem, góry, lasy, ruiny, jaskinie, woda, efekty) — 16 krain, 9 lochów i arena. Pole walki, karty krain, kafelki lochów i okno „i” krainy używają ich jako tła (`landBgUrl`, `dungeonBgUrl`).
- **Postaci (pixel art):** `src/art/actors.ts` + dane `actors-data.ts` (generuje `tools/art/actors.py`). Bohater 36×36 jest składany z warstw: ciało, zbroja, pas, buty, rękawice, amulet, hełm (każdy rodzaj ma własną warstwę na 3 poziomach zdobień, w kolorze rudy przedmiotu), broń to ikona przedmiotu w dłoni (`heroUrl`). Wrogowie 32×32 to kilkanaście szablonów (wilk, pająk, szkielet, smok…) z paletą dla każdego wroga (`foeUrl`; nazwy zmienne, np. „Strażnik 12. piętra”, rozpoznaje `foeKey`). Pole walki (`ui/Arena.tsx`) stawia obie postaci na jednej linii gruntu; animacje (oddech, atak, trafienie, śmierć, wejście nowego wroga) są w CSS i reagują na zdarzenia `bump`. Arena graczy dostaje od serwera wygląd obu postaci (`look` w `arena_fight`).
- **Tempo testowe:** `s.speed` mnoży czas gry w `Game.tick` (×1/×10/×50/×100, `TEST_SPEEDS`). Bez serwera dostępne zawsze; z serwerem tylko do limitu `TEST_SPEED` ze zmiennych środowiskowych Nakamy (`--runtime.env`, `ctx.env`), który serwer podaje w `save_get`, `save_put` i `time`. W trybie testowym `save_put` nie sprawdza tempa kuźni (przesuwa `meta.t0/f0`), a `seeds` wydaje ziarna 4× dalej; gra przy szybkim tempie zapisuje się, gdy zapas ziaren spada, żeby wytopy dalej miały ziarna serwera.
- **Grafika (pixel art):** `src/art/` — sprite'y jako siatki znaków z paletami, bez plików graficznych (działa też w artefakcie). Ekwipunek: 31 rodzajów × 3 poziomy zdobień (16×16), metal z palety rudy przedmiotu (`itemPalette`). Ikony z własną paletą: rudy, domieszki, rudy unikalne, zasoby i Moneta klanowa (16×16), umiejętności (24×24), badania (20×20), bossowie klanowi (32×32, jeden szablon w 5 paletach). `render.ts` zamienia sprite na obrazek (canvas → data URL, pamięć podręczna), komponent `ui/Px.tsx` wyświetla go z ostrymi pikselami. Źródła i eksport: `tools/art/` (README tam), galeria: `tools/art-gallery.ts`.
- **Barwy rzadkości:** `src/art/rarity.ts` dokłada wokół sprite'a przedmiotu obwódkę w kolorze rzadkości (Zwykły bez, Boski tęczowa); interfejs dodaje poświatę, kolor nazwy, pulsowanie od Legendarnego, obracające się promienie dla Mitycznego i Boskiego, błysk przy wykuciu i iskry w kolorze rzadkości.
- **Pula rodzajów przedmiotów:** `SLOTS[slot].kinds` tylko rośnie (nowe rodzaje na końcu), a `KIND_POOL_SIZES` pamięta dawne długości — serwer sprawdza rodzaj przedmiotu z ziarnem dla każdej z nich, więc przedmioty wykute przed rozszerzeniem puli dalej się liczą.
