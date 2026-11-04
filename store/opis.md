# Karta gry w Google Play — teksty i grafiki

Wszystko do wklejenia w Play Console → **Rozwój sprzedaży → Główna karta sklepu** (język: polski).

## Nazwa aplikacji (do 30 znaków)

```
Kuźnia Legend
```

## Krótki opis (do 80 znaków)

```
Wytapiaj rudy, wykuwaj legendarny ekwipunek i prowadź bohatera przez 16 krain!
```

## Pełny opis (do 4000 znaków)

```
Z kuźni zostały zgliszcza. Stary mistrz wciska ci w dłonie swój młot i trzy sztaby żelaza: „Teraz ty jesteś kowalem”. Bohater wyrusza o świcie — nie pozwól mu iść z gołymi rękami.

Kuźnia Legend to RPG, w którym ty kujesz, a bohater walczy sam. Wrogowie zostawiają rudę, ty przetapiasz ją na ekwipunek, a każdy wytop to szansa na przedmiot lepszy, niż się spodziewasz.

⚒ WYTAPIAJ I WYKUWAJ
• 10 rzadkości — od Zwykłych przez Epickie i Legendarne aż po Boskie
• lepsza ruda to rzadsze przedmioty, a każdy poziom kuźni zwiększa szansę na przeskok o rzadkość wyżej
• założone przedmioty zdobywają Sławę Czynów i w końcu budzą się z własnym imieniem
• przekuwaj, ulepszaj kuźnię i zdobywaj kolejne rudy: od miedzi po Gwiezdny Kruszec

⚔ WALCZ BEZ PRZERWY
• bohater sam przemierza 16 krain w 4 aktach: od Spalonej Wioski po Gwiezdny Krater
• pokonuj bossów, a potem zejdź do Otchłani
• gra liczy się także, gdy nie grasz — po powrocie czekają łupy z nocnej zmiany

📜 ROZWIJAJ SIĘ
• Akademia Kowalska: ponad 20 badań w czterech dziedzinach, większość w trzech stopniach
• umiejętności, runy, chowańce i wierzchowce
• lochy po łupy, Wieża Wyzwań i wydarzenia

🛡 GRAJ Z INNYMI
• klany ze Wspólną Kuźnią, bossem klanowym i wojnami klanów
• arena i tygodniowe ligi
• rankingi Mocy, postępu i Wieży
• Wielki Obieg: sprzedane przez ciebie przedmioty trafiają do skrzyń innych graczy — z twoim nickiem

Gra jest darmowa. Możesz obejrzeć reklamę za nagrodę (tylko gdy sam wybierzesz) i kupić Klejnoty, ale wszystko zdobędziesz też grając.

Postęp zapisuje się na serwerze gry — kodem przeniesienia przeniesiesz kowala na inny telefon.
```

## Kategoria i kontakt

- Typ: **Gra**, kategoria: **RPG** (role-playing).
- Tagi (do 5): RPG, Idle, Fantasy, Pixel art, Jeden gracz / Wieloosobowa — wybierz z listy Google.
- E-mail kontaktowy: ten sam co CONTACT_EMAIL w `.env` (Google pokazuje go publicznie).
- Witryna: adres gry (np. `https://adamserver.taild0a9c3.ts.net`) — tam leży `app-ads.txt` dla AdMob.
- Polityka prywatności: `https://ADRES-GRY/polityka-prywatnosci.html`.

## Grafiki (folder `store/`)

| Plik | Gdzie w Play Console | Wymagania Google |
|---|---|---|
| `ikona-512.png` | Ikona aplikacji | 512×512 PNG, do 1 MB (sklep sam zaokrągla rogi) |
| `grafika-1024x500.png` | Grafika (feature graphic) | 1024×500 PNG/JPEG, bez przezroczystości |
| `zrzut-1…6-*.jpg` | Zrzuty ekranu telefonu | 2–8 zrzutów, 1080×1920 |

Zrzuty i grafikę zrobiono z prawdziwej gry (pixel art z silnika). Jeśli dodasz nowe funkcje, zrób nowe zrzuty — karta sklepu nie może pokazywać rzeczy, których w grze nie ma.

## Produkty w aplikacji (Zarabianie → Produkty → Produkty w aplikacji)

Identyfikator produktu musi być **dokładnie** taki jak w tabeli (gra i serwer szukają tych identyfikatorów). Typ: produkt jednorazowy, „do wielokrotnego zakupu” (gra zużywa zakup po wydaniu Klejnotów).

| Identyfikator | Nazwa | Opis | Cena (PLN) |
|---|---|---|---|
| `starter` | Pakiet Nowicjusza | 300 Klejnotów, 10 Ksiąg Wiedzy, 2 Zwoje zaklęć i Rzadkie jajo — tylko raz | 9,99 |
| `gems_100` | Garść Klejnotów | 100 Klejnotów | 4,99 |
| `gems_550` | Sakiewka Klejnotów | 500 + 50 gratis Klejnotów | 22,99 |
| `gems_1200` | Szkatuła Klejnotów | 1000 + 200 gratis Klejnotów | 44,99 |
| `gems_2600` | Kufer Klejnotów | 2000 + 600 gratis Klejnotów | 89,99 |
| `gems_7000` | Skarbiec Klejnotów | 5000 + 2000 gratis Klejnotów | 219,99 |

Ceny w grze pokazują się z Google Play (w walucie gracza), więc możesz je zmienić w Play Console bez nowej wersji gry. Zawartość pakietów zmienia się w `src/data/shop.ts` (gra i serwer).
