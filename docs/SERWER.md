# Serwer gry na Dockerze (CasaOS)

Serwer to trzy kontenery uruchamiane jednym poleceniem:

| Kontener | Co robi | Port |
| --- | --- | --- |
| `web` | gra w przeglądarce (nginx); przekazuje API Nakamy pod tym samym adresem | 8080 |
| `nakama` | serwer gry Nakama 3.30.0 z modułem Kuźni Legend (konta, zapis, wytop, Wielki Obieg, arena, rankingi, klany, czat) | 7350 (API i czat), 7351 (konsola) |
| `postgres` | baza danych PostgreSQL 16 | tylko wewnątrz Dockera |

## Pierwsze uruchomienie

Potrzebujesz terminala na serwerze (SSH albo terminal w CasaOS). Docker i Docker Compose są w CasaOS od razu.

```bash
# 1. Pobierz projekt (jeśli nie ma gita: sudo apt install git)
git clone https://github.com/InFu122/kuznia-legend.git
cd kuznia-legend

# 2. Ustaw hasła i klucze — zmień wszystkie wartości, same litery i cyfry
cp .env.example .env
nano .env            # klucze możesz wygenerować: openssl rand -hex 16

# 3. Zbuduj i uruchom (pierwszy raz kilka minut)
docker compose up -d --build
docker compose ps    # wszystkie trzy kontenery powinny mieć status running / healthy
```

Potem:

- **gra:** `http://ADRES-SERWERA:8080` — na telefonie w tej samej sieci Wi-Fi też działa,
- **konsola Nakamy:** `http://ADRES-SERWERA:7351` — login `admin` i hasło z `.env`; widać tam konta, zapisy i rankingi.

Adres serwera sprawdzisz w CasaOS albo poleceniem `hostname -I`.

Interfejs CasaOS („Zainstaluj aplikację niestandardową”) nie umie budować obrazów z kodu, dlatego pierwsze uruchomienie robimy w terminalu. Po nim kontenery widać też w panelu CasaOS.

## Sprawdzenie, czy serwer działa

Z dowolnego komputera z Node.js:

```bash
node tools/server-check.mjs http://ADRES-SERWERA:8080 TWÓJ_NAKAMA_SERVER_KEY
```

Skrypt loguje się kontem testowym i sprawdza czas serwera, zapis, ziarna wytopu i rankingi.

## Codzienna obsługa

```bash
git pull && docker compose up -d --build                  # aktualizacja gry i serwera
docker compose logs -f nakama                             # logi serwera
docker compose exec postgres pg_dump -U nakama nakama > kopia.sql   # kopia zapasowa bazy
docker compose down                                       # wyłączenie (dane zostają)
```

`docker compose down -v` usuwa także bazę z kontami i zapisami — używaj tylko, gdy chcesz zacząć od zera.

Jeśli port 8080 jest zajęty (np. przez inną aplikację CasaOS), zmień `WEB_PORT` w `.env` i uruchom `docker compose up -d` ponownie.

### Tempo testowe

Na czas testów serwer pozwala przyspieszyć grę: **Kodeks → Ustawienia → Tempo testowe ×1 / ×10 / ×50 / ×100** (walka, kuźnia, badania, wykluwanie i inne timery). Gdy tempo jest włączone, obok nazwy gry widać plakietkę „×10” itp. Limit ustawia zmienna `TEST_SPEED` w `.env` (bez niej: do ×100):

- `TEST_SPEED=100` — do ×100, `TEST_SPEED=10` — do ×10, `TEST_SPEED=1` — tempo testowe wyłączone.

W trybie testowym można też przestawić dzień wojny klanów i smoka (np. żeby sprawdzić sobotnią bitwę we wtorek). Adres otwierasz w przeglądarce albo `curl` z klucza `NAKAMA_HTTP_KEY` z `.env` (dni: 0 = poniedziałek … 6 = niedziela; `w` to numer tygodnia z odpowiedzi `war_state`, np. `w2965`):

```
curl -X POST "https://ADRES/v2/rpc/war_test_clock?http_key=KLUCZ&unwrap" -d '{"w":"w2965","d":5}'
curl -X POST "https://ADRES/v2/rpc/war_test_clock?http_key=KLUCZ&unwrap" -d '{"clear":true}'
```

Przy `TEST_SPEED=1` serwer odrzuca zmianę zegara.
- Po zmianie: `docker compose up -d` (w logach Nakamy: „tempo testowe: do ×100” albo „wyłączone”).

W trybie testowym serwer nie pilnuje tempa rozwoju kuźni. Po wyłączeniu pilnuje go od ostatniego zapisu, więc konta z testów grają dalej. Dzienne limity (arena, klan, klucze lochów) liczą się w prawdziwym czasie także przy przyspieszeniu. **Przed udostępnieniem gry innym graczom ustaw `TEST_SPEED=1`.**

## Jak gra korzysta z serwera

- Przy pierwszym uruchomieniu na urządzeniu gra zakłada konto sama (logowanie identyfikatorem urządzenia).
- Zapis trafia na serwer co 30 sekund i przy wyjściu z gry. Serwer sprawdza go i odrzuca niemożliwe wartości (np. poziom kuźni 99 albo przedmiot Boski z Miedzi) oraz kuźnię, która rośnie szybciej, niż pozwalają czasy ulepszeń.
- Gdy na serwerze jest nowszy zapis z innego urządzenia, gra bierze nowszy.
- Dzienne resety (klucze, misje, kalendarz) liczą się od zegara serwera, więc przestawianie zegara w telefonie nic nie daje.
- Rankingi (Moc, Wieża Wyzwań co tydzień, postęp, arena) liczy serwer z zapisu — gracz nie może wysłać sobie wyniku.
- Bez połączenia gra działa dalej i zapisuje lokalnie; co minutę próbuje połączyć się znowu.

### Nick

Każdy gracz ma na serwerze unikalny nick — „Adam”, „adam” i „Ádam” to ten sam nick. Przy pierwszym połączeniu gra zajmuje imię kowala, jeśli jest wolne; w przeciwnym razie (albo gdy to domyślny „Kowal”) serwer nadaje nick w stylu „Iskra_4821” i gra o tym informuje. Nick zmienisz w **Kodeks → Ustawienia** — raz na dobę, a wygenerowany nick od razu. Serwer odrzuca nicki zajęte, wulgarne i nazwy kowali-widm.

### Wytop

Wynik każdego wytopu losuje się z ziarna, które wydaje serwer (gra trzyma zapas na kilkaset wytopów, więc kuje bez czekania i także bez połączenia). Ten sam wytop zawsze daje ten sam przedmiot — wczytanie starszego zapisu nie pozwala wylosować go jeszcze raz. Serwer odtwarza wytop z ziarna i sprawdza każdy założony przedmiot.

Do rankingu Mocy i na arenę liczą się tylko przedmioty, których pochodzenie serwer potwierdził: wykute z ziarnem albo znalezione w Obiegu. Przedmioty wykute przed tą aktualizacją działają w grze normalnie, ale do rankingu się nie liczą, dopóki ich nie wymienisz — wykuj nowe, a liczą się od razu. Kodeks pokazuje w karcie **Serwer gry**, ile założonych przedmiotów się nie liczy.

Z serwerem nie ma tempa testowego ×10.

### Grasz na telefonie i komputerze

1. Na urządzeniu, na którym masz postęp: **Kodeks → Konto → Pokaż kod**. Kod ma 8 znaków, działa 10 minut i tylko raz.
2. Na drugim urządzeniu: **Kodeks → Konto**, wpisz kod i potwierdź **Połącz z kontem z kodu**.

Od tej chwili oba urządzenia grają tym samym kowalem. Postęp z drugiego urządzenia (sprzed połączenia) zostaje zastąpiony, a jego konto znika z rankingów. Najlepiej grać na jednym urządzeniu naraz — przy równoczesnej grze na dwóch urządzeniach gra zachowa postęp tylko z jednego z nich.

### Wielki Obieg

Rzadkie i lepsze przedmioty, które sprzedajesz, z szansą 30% trafiają do wspólnej puli na serwerze. Skrzynie bossów i Zbrojownia innych graczy losują z niej przedmioty na miarę ich kuźni. Gdy ktoś znajdzie twój przedmiot, dostajesz Sławę kowala i wieść w Kodeksie. Gdy w puli brakuje przedmiotów innych graczy (np. grasz sam), skrzynie dostają przedmioty kowali-widm.

### Arena

Zakładka **Lochy → Arena** (po pokonaniu pierwszego bossa). Walczysz z kopiami bohaterów innych graczy z ich ostatniego zapisu; walkę liczy serwer, a gra ją odtwarza. 5 walk dziennie (nowe o północy czasu UTC), za wygraną ocena rośnie, za porażkę spada — także gdy ktoś zaatakuje ciebie. Gdy graczy jest mało, listę uzupełniają duchy areny (słabsza, równa i silniejsza kopia ciebie). Ranking areny jest w **Kodeks → Rankingi**.

**Ligi areny.** Pierwsza walka tygodnia (poniedziałek–niedziela, UTC — ten sam tydzień co wojna klanów) dopisuje cię do grupy 30 osób z twojej ligi: Brąz, Srebro, Złoto, Platyna, Diament III, II i I. Wygrana daje 20 pkt ligi z równym rywalem (od 10 do 30 zależnie od jego Mocy), porażka 3. Wolne miejsca w grupie zajmują duchy areny, których wynik rośnie przez tydzień. Po tygodniu najlepsza piątka awansuje, ostatnia piątka spada; tydzień rozlicza się przy pierwszym wejściu na arenę w nowym tygodniu. Sezon ligi trwa 28 dni (jak Przepustka Kowala): na koniec Klejnoty za najwyższą ligę sezonu (Srebro 20 … Diament I 300), a nowy sezon zaczyna się o jedną ligę niżej.

**Żetony Areny** (portfel serwera, klucz `tokens`): 5 za wygraną, 1 za porażkę i nagroda za miejsce w lidze na koniec tygodnia. **Sklep areny** (zakładka w oknie areny) sprzedaje za Żetony bilety na dodatkowe walki (3 dziennie), Księgi, Kamienie, Zwoje, Siodła, Rzadkie jaja i Pieczęcie Legendy, z dziennymi limitami.

### Profile graczy

Dotknięcie gracza w rankingu, na liście przeciwników areny, w tabeli ligi, na liście członków klanu albo „Profil” w menu wiadomości czatu otwiera jego profil: awatar w ramce, strój, tytuł kowala, klan, Moc, poziom kuźni, ligę i ocenę areny, Dziedzictwo oraz cały ekwipunek (dotknięcie przedmiotu pokazuje jego kartę) i statystyki bohatera. Statystyki liczy serwer z uznanych przedmiotów (jak na arenie). Własny profil: **Bohater → Podgląd bohatera** albo **Kodeks → Mój profil** (działa też bez serwera).

### Lochy po kolei

Lochy otwierają się stopniowo przez cztery akty: Skarbiec Złota po 1. bossie, loch sezonowy po 2., Głęboka Sztolnia po 3., Wieża Wyzwań od 6. poziomu kuźni, Ołtarze Żywiołów od 10., Leża Bossów po 5. bossie, Kopalnia Kryształów po 6., Labirynt Minotaura po 8., Zapomniana Zbrojownia po 10., Krypta Bohaterów po 11. bossie i pierwszym Zahartowanym przedmiocie. Gra ogłasza każdy nowy loch. Loch, w którym gracz już był, zostaje otwarty.

### Wydarzenia i lochy sezonowe

Co 2 tygodnie nowe wydarzenie (na zmianę: Festiwal Kuźni, Wielkie Łowy, Noc Upiorów) z własnymi punktami (Iskry, Trofea, Świece) i lochem sezonowym (Ognista Otchłań, Lodowa Grota, Nawiedzone Katakumby). Punkty za codzienną grę według wydarzenia (wytopy, wrogowie, klucze w lochach) — najwyżej 400 dziennie — i bez limitu za piętra lochu sezonowego (2 klucze dziennie, 10 pięter, na końcu boss i skrzynia). 12 progów nagród; nieodebrane trafiają do gracza same po końcu wydarzenia. Baner wydarzenia jest na górze zakładki **Lochy**. Punkty liczy gra; serwer w zapisie odrzuca więcej punktów, niż da się zdobyć w czasie wydarzenia.

### Wygląd: stroje i ramki

**Kodeks → Piętno Kowala → Wygląd**: 8 strojów bohatera (kolory i płaszcz) i 11 ramek awatara — wyłącznie ozdoby. Zdobywa się je w Przepustce Kowala (ramka na 10. poziomie złotej ścieżki, strój na 20. poziomie darmowej i na 30. złotej), za ostatni próg każdego wydarzenia (strój i ramka), za awanse w ligach areny (ramki lig, od Diamentu III strój Mistrza Areny), za miejsce klanu w pierwszej trójce sezonu wojen (ramka) i za Dziedzictwo (Złoty Kowal). Strój i ramkę widzą inni gracze w rankingach i na arenie.

### Klany

Zakładka **Klan** (po pokonaniu pierwszego bossa): wyszukiwanie, dołączanie, zakładanie klanu. Klan ma do 30 członków. Przywódca ustawia opis, tryb wstępu (otwarty, na prośbę, zamknięty), minimalną Moc i język, awansuje i degraduje (do 2 Zastępców i 5 Starszych) oraz może przekazać przywództwo. Zastępcy piszą ogłoszenia i wyrzucają, Starsi przyjmują prośby. Gdy Przywódca odchodzi, władzę przejmuje Zastępca, Starszy albo najdawniejszy członek; ostatni członek rozwiązuje klan.

### Życie klanu

W klanie zakładka **Klan** ma siedem części:

- **Wojna** — co tydzień klan walczy z klanem o podobnej Mocy (gdy takiego nie ma — z klanem-widmem). Poniedziałek: dobór i skład. Wtorek: każdy wytop to punkt. Środa: 5 pokonanych wrogów (także w nagrodach za nieobecność) to punkt. Czwartek: klucz w lochu 25 punktów, piętro Wieży 5. Piątek: atak na bossa klanowego 60 punktów. W te dni jedna osoba zdobywa najwyżej 300 punktów. Sobota: 3 ataki na obrońców wroga (pojedynki bohaterów jak na arenie). Niedziela: wynik, skrzynie dla wszystkich z punktami (zwycięzcy więcej, trzy najlepsze osoby w klanie — premia) i Doświadczenie klanu.
- **Sezon wojen i ranking klanów** — po każdej wojnie klan dostaje Puchary (wygrana 30, remis 15, porażka 5 i 1 za każde 1000 punktów klanu, do 20). Sezon trwa 28 dni, jak Przepustka Kowala i ligi areny. Po sezonie każdy, kto zdobył punkty w wojnie, dostaje Klejnoty i Monety według miejsca klanu, za który walczył (1. miejsce 150 Klejnotów i 800 Monet … pozostałe 15 i 100) — także gdy w międzyczasie zmienił klan. **Kodeks → Rankingi → Klany** pokazuje sezon wojen i Moc klanów (suma Mocy członków).
- **Smok** — Smocze Leże: co tydzień smok o czterech fazach, każda ze słabością na inny żywioł (przedmioty z tą domieszką: +10% obrażeń każdy, do +40%). 2 ataki dziennie. Przełamana faza daje skrzynię z rudą żywiołu na następną fazę, pokonany smok — wielką skrzynię ze Smoczą Stalą, Doświadczenie klanu i silniejszego smoka za tydzień.
- **Kuźnia** — Wspólna Kuźnia Klanu. 3 datki złota dziennie (koszt rośnie z postępem w kampanii); każdy datek daje klanowi 10 Doświadczenia, a tobie 5 Monet klanowych. Pokonany boss klanowy też daje Doświadczenie. Klan ma 10 poziomów, każdy z premią dla wszystkich członków (złoto, obrażenia, zdrowie, ruda, czas ulepszeń kuźni, nagrody offline). Poziom klanu wpisuje do zapisu serwer.
- **Boss** — wspólny boss klanu. 3 ataki dziennie, obrażenia = twoja Moc w rankingu (±15%), za atak Monety i złoto. Pokonany boss zostawia skrzynię każdemu, kto go atakował (pierwsze miejsce więcej i jajo), a następny jest silniejszy.
- **Pomoc** — prośba o pomoc przy ulepszeniu kuźni (każda pomoc −3% czasu, do 10 pomocy) i prośby o rudę (raz na 8 godzin). Pomoc i dary rudy dają Monety (10 nagradzanych dziennie). O pomoc poprosisz też w zakładce Kuźnia, w trakcie ulepszania.
- **Sklep** — towary za Monety klanowe z limitem tygodniowym (od poniedziałku); lepsze towary odblokowuje poziom klanu.

Dzienne limity i dni wojny liczą się od północy czasu UTC (w Polsce o 1:00 zimą, o 2:00 latem). Nagrody klanu (Monety, skrzynie, ruda od klanowiczów) czekają na serwerze, aż gra je odbierze i zapisze — żadna nie przepada ani nie przychodzi dwa razy.

### Nauka: gałąź Towarzysze

Czwarta gałąź Nauki (od 8. poziomu kuźni): Hodowca (do +100% szansy na jajo z bossów i lochów), Wylęgarnia (do −50% czasu wykluwania), Więź (do +20% siły chowańców i wierzchowców) i Stajnia (do −20% Kamieni na ich ulepszenia).

### Osiągnięcia i Kolekcja Kowala

- **Osiągnięcia** — czwarta zakładka w oknie Zadań: 13 długich celów po kilka progów (np. wykuj 100 / 1000 / 10 000 przedmiotów), za każdy próg Księgi, Kamienie i złoto, wyżej także Zwoje i jaja.
- **Kolekcja Kowala** — karta w Kodeksie: każdy nowy model przedmiotu (rodzaj × ruda, razem 310) daje na zawsze +0,05% obrażeń i zdrowia. Po dotknięciu rudy widać, których modeli jeszcze brakuje.

### Rudy i Boskie przedmioty

- **Nowe rudy:** Obsydian (od 17. poziomu kuźni, minimum Legendarny z lepszą jakością), Eteryt (od 23., minimum Mityczny) i bardzo rzadka **Boska Ruda** (od 25.). Obsydian i Eteryt wypadają w aktach III i IV i da się je rafinować (Adamantyt → Obsydian → Smocza Stal → Eteryt → Gwiezdny Kruszec).
- **Boski tylko z przeskoku:** żadna ruda nie daje Boskiego na pewno. Gwiezdny Kruszec daje najmniej Mityczny i kilka % szansy na Boski, Boska Ruda — kilkanaście %. Gwarancja przeskoku i ruda unikalna nie prowadzą do Boskiego.
- **Skąd Boska Ruda:** bossowie krain aktu IV (rzadko), skrzynia bossa lochu sezonowego (5%), ostatni próg każdego wydarzenia i 30. poziom złotej ścieżki Przepustki. Nie wypada z fal, nie da się jej rafinować ani poprosić o nią klanu.
- **Boski przedmiot** ma własne imię, złotą ramkę i Boską aurę: +3% obrażeń i zdrowia całego bohatera za każdy założony. Serwer sam ogłasza nowy Boski przedmiot na czacie globalnym, a inni gracze widzą komunikat w grze.
- Boskie przedmioty wykute przed tą aktualizacją (np. z Gwiezdnego Kruszcu) zostają bez zmian i dalej liczą się do rankingów. **Najpierw zaktualizuj serwer**, potem aplikację.

### Runy i przekuwanie

- **Runy slotów** (zakładka Bohater, od 10. poziomu kuźni): każdy slot ma runę do 30. poziomu, +1% głównej statystyki założonego tam przedmiotu za poziom. Runa zostaje przy zmianie przedmiotu i w nowym pokoleniu. Kosztuje złoto i rudę: poziomy 1–5 Miedź, 6–10 Żelazo, 11–15 Srebro, 16–20 Mithril, 21–25 Adamantyt, 26–30 Smocza Stal — tu przydaje się nadmiar starych rud.
- **Przekuwanie** (okno założonego przedmiotu, od 15. poziomu kuźni): jedna statystyka dodatkowa losowana od nowa za rudę przedmiotu i złoto; potem wybierasz starą albo nową wersję. Z serwerem losuje i podpisuje serwer, więc przedmiot dalej liczy się do rankingów.

### Dziedzictwo

Od 30. poziomu kuźni bohater może przejść na emeryturę (zakładka Bohater albo przycisk przy kuźni na najwyższym poziomie). Kuźnia, kampania, ekwipunek, złoto i rudy zaczynają się od nowa, a zostaje Nauka, umiejętności, chowańce, wierzchowce, zasoby rzadkie, Klejnoty, przepustka i klan. W zamian: Gwiazdy Mistrza (1 za kuźnię 30. poziomu i 1 za każde 4 pokonane krainy; każda +5% obrażeń i złota na zawsze) i Pamiątka Rodu — wybrany przedmiot w dodatkowym slocie, działający w 50%. Z serwerem nowe pokolenie zaczyna serwer, więc gwiazd nie da się dopisać.

### Sklep i Przepustka Kowala

Przycisk z Klejnotem na górze ekranu (obok czatu i zadań) otwiera **Sklep** z trzema zakładkami:

- **Sklep** — darmowy prezent dnia, nagrody za reklamy (×2 ruda albo ×2 złoto na godzinę, 5 Klejnotów raz dziennie), towary za Klejnoty z dziennym limitem (złoto, ruda, Księgi, Kamienie, Zwój, Siodło, jajo, komplet kluczy) i przyspieszenia (dokończenie ulepszenia kuźni albo badania: 1 Klejnot za 4 minuty).
- **Przepustka** — sezon 28 dni, 30 poziomów. Punkty za wytopy, wrogów, bossów, klucze w lochach i piętra Wieży (najwyżej 1500 dziennie). Darmowa ścieżka dla wszystkich, złota za 500 Klejnotów.
- **Klejnoty** — pakiety. Dopóki serwer ma tryb testowy (`TEST_SPEED` większe niż 1), pakiety są bez płatności — do sprawdzenia sklepu. Przy `TEST_SPEED=1` zakup testowy jest wyłączony, a płatności ruszą w aplikacji z Google Play.

Na polu walki co kilka minut pojawia się ikonka rudy albo złota z „×2” — po obejrzeniu reklamy (na razie testowej, 5 sekund) przez godzinę wpada dwa razy więcej rudy albo złota, także w nagrodach za nieobecność. Klejnoty trzyma serwer, więc nie znikają przy „Nowej grze”.

Płatności w Google Play (przy wydaniu w sklepie): w Google Play Console trzeba utworzyć produkty o identyfikatorach z `src/data/shop.ts` (`starter`, `gems_100` …) i konto usługi z dostępem do API, a jego adres i klucz podać Nakamie (`--iap.google.client_email`, `--iap.google.private_key`). Gra wyśle potwierdzenie zakupu do serwera (`iap_google`), a serwer sprawdzi je u Google i doda Klejnoty raz na zakup.


**Ikonki obok pola walki:** ×2 ruda i ×2 złoto za reklamę (godzina, kolejne reklamy przedłużają; zielona ikonka z minutami, gdy trwa) i Przepustka Kowala (poziom, czerwona kropka przy nagrodach). W oknie areny +1 walka za reklamę (2 dziennie). Limity reklam liczy serwer (`ad_reward`).
### Czat

Przycisk **Czat** na górze ekranu: kanał globalny i kanał klanu. Na globalnym piszesz od 5. poziomu kuźni (wcześniej tylko w klanie). Tryb wolny: 3 sekundy między wiadomościami na globalnym, 1 sekunda w klanie. Serwer zamienia wulgaryzmy na gwiazdki. Wiadomość innego gracza możesz wyciszyć (tylko na swoim urządzeniu) albo zgłosić. Gdy wykujesz przedmiot Mityczny lub Boski, na czacie klanu pojawia się jego karta, a przyciskiem pod przedmiotem możesz pochwalić się na czacie globalnym (raz na 10 minut). Nowy Boski przedmiot serwer ogłasza na czacie globalnym sam (raz na przedmiot).

Czat używa WebSocketu pod tym samym adresem co gra (`/ws` — nginx przekazuje go do Nakamy), więc nie trzeba otwierać nowych portów.

### Moderacja (konsola Nakamy, `http://ADRES-SERWERA:7351`)

- **Zgłoszenia:** Storage → kolekcja `reports` — kto zgłosił, czyja wiadomość i jej treść.
- **Blokada czatu:** Storage → kolekcja `chat`, klucz `bans` (serwer tworzy go przy starcie). Wpisz w wartości `{"ID-GRACZA": czas_końca_w_ms}` — np. `{"3f1c…": 4102444800000}` blokuje na zawsze, `{}` zdejmuje wszystkie blokady. ID gracza jest w zgłoszeniu (`sender`) i w zakładce Accounts.

## Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
| --- | --- | --- |
| `nakama` ciągle się restartuje, w logach `password authentication failed for user "nakama"` | `POSTGRES_PASSWORD` zmienione w `.env` po pierwszym uruchomieniu — baza pamięta stare hasło | `docker compose exec postgres psql -U nakama -d nakama -c "ALTER USER nakama PASSWORD '$(grep '^POSTGRES_PASSWORD=' .env \| cut -d= -f2)';"` a potem `docker compose restart nakama` |
| `nakama` ciągle się restartuje, w logach `Encryption key and refresh token encryption cannot match` | `NAKAMA_SESSION_KEY` i `NAKAMA_REFRESH_KEY` mają tę samą wartość | wygeneruj różne klucze: `for k in NAKAMA_SESSION_KEY NAKAMA_REFRESH_KEY NAKAMA_HTTP_KEY NAKAMA_CONSOLE_KEY; do sed -i "s/^$k=.*/$k=$(openssl rand -hex 16)/" .env; done` a potem `docker compose up -d` |
| W grze „Brak serwera”, w Kodeksie „serwer odrzucił klucz gry” | `NAKAMA_SERVER_KEY` zmieniony bez przebudowania gry | `docker compose up -d --build` |
| W Kodeksie „błąd serwera 502” | gra działa, ale Nakama nie wstała | `docker compose logs nakama` — przyczyna jest w ostatnich liniach |
| „Serwer odrzucił zapis: kuźnia rośnie szybciej, niż pozwalają czasy ulepszeń” | kuźnia urosła szybciej niż w normalnej grze (np. przestawiony zegar w telefonie bez połączenia) | nic nie rób — gra zapisuje lokalnie, a serwer przyjmie zapis, gdy upłynie tyle czasu, ile trwają ulepszenia |
| „Czat: brak połączenia”, a gra zapisuje na serwerze | nginx nie przekazuje WebSocketu | sprawdź, czy kontener `web` jest z tej wersji (`docker compose up -d --build`); przy własnym reverse proxy włącz przekazywanie WebSocketów dla `/ws` |
| Pomoc klanu nie skróciła ulepszenia | gra odświeża klan co 3 minuty | otwórz zakładkę Klan — odświeża się od razu |
| Moc w rankingu niższa niż w grze | część założonych przedmiotów powstała przed aktualizacją 3b albo bez ziaren serwera | wykuj nowe przedmioty — liczą się od razu |

Przyczynę braku połączenia gra pokazuje w zakładce Kodeks, w karcie **Serwer gry**.

## Bezpieczeństwo

- Nie wystawiaj portów 7350, 7351 i 8080 do internetu bez HTTPS (przekierowaniem portów w routerze). Publiczny adres z HTTPS daje Tailscale Funnel — patrz [TEST.md](TEST.md); na zewnątrz widać wtedy tylko grę (8080), a konsola i baza zostają w domu.
- Przed udostępnieniem gry innym graczom wyłącz tempo testowe: `TEST_SPEED=1` w `.env`.
- `NAKAMA_SERVER_KEY` jest wbudowany w grę — to normalne w Nakamie. Tajne są pozostałe klucze i hasła z `.env`; plik `.env` nie trafia do repozytorium.

## Praca nad serwerem bez Dockera

```bash
npm run build:server      # moduł → server/build/index.js
# Nakama uruchomiona z --runtime.path server/build --config server/nakama.yml
VITE_SERVER_URL=/ npm run dev   # gra łączy się z Nakamą przez proxy Vite (domyślnie 127.0.0.1:7350)
```
