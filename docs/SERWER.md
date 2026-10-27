# Serwer gry na Dockerze (CasaOS)

Serwer to trzy kontenery uruchamiane jednym poleceniem:

| Kontener | Co robi | Port |
| --- | --- | --- |
| `web` | gra w przeglądarce (nginx); przekazuje API Nakamy pod tym samym adresem | 8080 |
| `nakama` | serwer gry Nakama 3.30.0 z modułem Kuźni Legend (konta, zapis, wytop, Wielki Obieg, arena, rankingi) | 7350 (API), 7351 (konsola) |
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

## Jak gra korzysta z serwera

- Przy pierwszym uruchomieniu na urządzeniu gra zakłada konto sama (logowanie identyfikatorem urządzenia).
- Zapis trafia na serwer co 30 sekund i przy wyjściu z gry. Serwer sprawdza go i odrzuca niemożliwe wartości (np. poziom kuźni 99 albo przedmiot Boski z Miedzi) oraz kuźnię, która rośnie szybciej, niż pozwalają czasy ulepszeń.
- Gdy na serwerze jest nowszy zapis z innego urządzenia, gra bierze nowszy.
- Dzienne resety (klucze, misje, kalendarz) liczą się od zegara serwera, więc przestawianie zegara w telefonie nic nie daje.
- Rankingi (Moc, Wieża Wyzwań co tydzień, postęp, arena) liczy serwer z zapisu — gracz nie może wysłać sobie wyniku.
- Bez połączenia gra działa dalej i zapisuje lokalnie; co minutę próbuje połączyć się znowu.

### Wytop

Wynik każdego wytopu losuje się z ziarna, które wydaje serwer (gra trzyma zapas na kilkaset wytopów, więc kuje bez czekania i także bez połączenia). Ten sam wytop zawsze daje ten sam przedmiot — wczytanie starszego zapisu nie pozwala wylosować go jeszcze raz. Serwer odtwarza wytop z ziarna i sprawdza każdy założony przedmiot.

Do rankingu Mocy i na arenę liczą się tylko przedmioty, których pochodzenie serwer potwierdził: wykute z ziarnem albo znalezione w Obiegu. Przedmioty wykute przed tą aktualizacją działają w grze normalnie, ale do rankingu się nie liczą, dopóki ich nie wymienisz — przy auto-wytopie dzieje się to szybko. Kodeks pokazuje w karcie **Serwer gry**, ile założonych przedmiotów się nie liczy.

Z serwerem nie ma tempa testowego ×10.

### Grasz na telefonie i komputerze

1. Na urządzeniu, na którym masz postęp: **Kodeks → Konto → Pokaż kod**. Kod ma 8 znaków, działa 10 minut i tylko raz.
2. Na drugim urządzeniu: **Kodeks → Konto**, wpisz kod i potwierdź **Połącz z kontem z kodu**.

Od tej chwili oba urządzenia grają tym samym kowalem. Postęp z drugiego urządzenia (sprzed połączenia) zostaje zastąpiony, a jego konto znika z rankingów. Najlepiej grać na jednym urządzeniu naraz — przy równoczesnej grze na dwóch urządzeniach gra zachowa postęp tylko z jednego z nich.

### Wielki Obieg

Rzadkie i lepsze przedmioty, które sprzedajesz, z szansą 30% trafiają do wspólnej puli na serwerze. Skrzynie bossów i Zbrojownia innych graczy losują z niej przedmioty na miarę ich kuźni. Gdy ktoś znajdzie twój przedmiot, dostajesz Sławę kowala i wieść w Kodeksie. Gdy w puli brakuje przedmiotów innych graczy (np. grasz sam), skrzynie dostają przedmioty kowali-widm.

### Arena

Zakładka **Lochy → Arena** (po pokonaniu pierwszego bossa). Walczysz z kopiami bohaterów innych graczy z ich ostatniego zapisu; walkę liczy serwer, a gra ją odtwarza. 5 walk dziennie (nowe o północy czasu UTC), za wygraną ocena rośnie, za porażkę spada — także gdy ktoś zaatakuje ciebie. Gdy graczy jest mało, listę uzupełniają duchy areny (słabsza, równa i silniejsza kopia ciebie). Ranking areny jest w **Kodeks → Rankingi**.

## Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
| --- | --- | --- |
| `nakama` ciągle się restartuje, w logach `password authentication failed for user "nakama"` | `POSTGRES_PASSWORD` zmienione w `.env` po pierwszym uruchomieniu — baza pamięta stare hasło | `docker compose exec postgres psql -U nakama -d nakama -c "ALTER USER nakama PASSWORD '$(grep '^POSTGRES_PASSWORD=' .env \| cut -d= -f2)';"` a potem `docker compose restart nakama` |
| `nakama` ciągle się restartuje, w logach `Encryption key and refresh token encryption cannot match` | `NAKAMA_SESSION_KEY` i `NAKAMA_REFRESH_KEY` mają tę samą wartość | wygeneruj różne klucze: `for k in NAKAMA_SESSION_KEY NAKAMA_REFRESH_KEY NAKAMA_HTTP_KEY NAKAMA_CONSOLE_KEY; do sed -i "s/^$k=.*/$k=$(openssl rand -hex 16)/" .env; done` a potem `docker compose up -d` |
| W grze „Brak serwera”, w Kodeksie „serwer odrzucił klucz gry” | `NAKAMA_SERVER_KEY` zmieniony bez przebudowania gry | `docker compose up -d --build` |
| W Kodeksie „błąd serwera 502” | gra działa, ale Nakama nie wstała | `docker compose logs nakama` — przyczyna jest w ostatnich liniach |
| „Serwer odrzucił zapis: kuźnia rośnie szybciej, niż pozwalają czasy ulepszeń” | kuźnia urosła szybciej niż w normalnej grze (np. przestawiony zegar w telefonie bez połączenia) | nic nie rób — gra zapisuje lokalnie, a serwer przyjmie zapis, gdy upłynie tyle czasu, ile trwają ulepszenia |
| Moc w rankingu niższa niż w grze | część założonych przedmiotów powstała przed aktualizacją 3b albo bez ziaren serwera | wykuj nowe przedmioty — liczą się od razu |

Przyczynę braku połączenia gra pokazuje w zakładce Kodeks, w karcie **Serwer gry**.

## Bezpieczeństwo

- Nie wystawiaj portów 7350, 7351 i 8080 do internetu bez HTTPS. Publiczny adres z domeną i certyfikatem przygotujemy przed wydaniem aplikacji (etap 5).
- `NAKAMA_SERVER_KEY` jest wbudowany w grę — to normalne w Nakamie. Tajne są pozostałe klucze i hasła z `.env`; plik `.env` nie trafia do repozytorium.

## Praca nad serwerem bez Dockera

```bash
npm run build:server      # moduł → server/build/index.js
# Nakama uruchomiona z --runtime.path server/build --config server/nakama.yml
VITE_SERVER_URL=/ npm run dev   # gra łączy się z Nakamą przez proxy Vite (domyślnie 127.0.0.1:7350)
```
