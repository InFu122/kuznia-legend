# Serwer gry na Dockerze (CasaOS)

Serwer to trzy kontenery uruchamiane jednym poleceniem:

| Kontener | Co robi | Port |
| --- | --- | --- |
| `web` | gra w przeglądarce (nginx); przekazuje API Nakamy pod tym samym adresem | 8080 |
| `nakama` | serwer gry Nakama 3.30.0 z modułem Kuźni Legend (konta, zapis, rankingi) | 7350 (API), 7351 (konsola) |
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

Skrypt loguje się kontem testowym i sprawdza czas serwera, zapis i ranking.

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
- Zapis trafia na serwer co 30 sekund i przy wyjściu z gry. Serwer sprawdza go i odrzuca niemożliwe wartości (np. poziom kuźni 99 albo przedmiot Boski z Miedzi).
- Gdy na serwerze jest nowszy zapis z innego urządzenia, gra bierze nowszy.
- Dzienne resety (klucze, misje, kalendarz) liczą się od zegara serwera, więc przestawianie zegara w telefonie nic nie daje.
- Rankingi (Moc, Wieża Wyzwań co tydzień, postęp) liczy serwer z zapisu — gracz nie może wysłać sobie wyniku.
- Bez połączenia gra działa dalej i zapisuje lokalnie; co minutę próbuje połączyć się znowu.

## Bezpieczeństwo

- Nie wystawiaj portów 7350, 7351 i 8080 do internetu bez HTTPS. Publiczny adres z domeną i certyfikatem przygotujemy przed wydaniem aplikacji (etap 5).
- `NAKAMA_SERVER_KEY` jest wbudowany w grę — to normalne w Nakamie. Tajne są pozostałe klucze i hasła z `.env`; plik `.env` nie trafia do repozytorium.

## Praca nad serwerem bez Dockera

```bash
npm run build:server      # moduł → server/build/index.js
# Nakama uruchomiona z --runtime.path server/build --config server/nakama.yml
VITE_SERVER_URL=/ npm run dev   # gra łączy się z Nakamą przez proxy Vite (domyślnie 127.0.0.1:7350)
```
