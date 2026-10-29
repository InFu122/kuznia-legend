# Test na znajomych

Jak udostępnić grę kilku osobom spoza domu, zebrać ich uwagi i wydać aplikację na Androida.
Wszystko działa na serwerze domowym (CasaOS) — bez domeny i bez otwierania portów w routerze.

## 1. Aktualizacja serwera

```bash
cd ~/kuznia-legend
git pull && docker compose up -d --build
```

## 2. Tryb testowy wyłączony

Znajomi grają w normalnym tempie. W pliku `.env` ustaw:

```
TEST_SPEED=1
```

i uruchom `docker compose up -d`. Przełącznik tempa ×10/×50/×100 zniknie z Kodeksu.

Sprawdź też, czy wszystkie klucze i hasła w `.env` są twoje (nie przykładowe z `.env.example`).

## 3. Publiczny adres (Tailscale Funnel)

Do tej pory gra działała tylko w twojej sieci Tailscale (`tailscale serve`). Funnel udostępnia ten sam adres
każdemu w internecie, z certyfikatem HTTPS:

```bash
sudo tailscale funnel --bg 8080
```

Przy pierwszym razie Tailscale może pokazać link do włączenia Funnel w panelu — otwórz go i zatwierdź.
Adres gry zostaje ten sam: `https://adamserver.taild0a9c3.ts.net`.

- Na zewnątrz widać tylko grę (port 8080, nginx). Konsola Nakamy (7351) i baza danych zostają w domu.
- nginx ogranicza liczbę zapytań z jednego adresu, więc nikt nie zaleje serwera.
- Wyłączenie dostępu z internetu (w sieci Tailscale gra dalej działa): `sudo tailscale funnel --https=443 off`
  a potem znowu tylko dla siebie: `sudo tailscale serve --bg 8080`.

## 4. Jak znajomi zagrają

- **Telefon z Androidem albo iPhone — w przeglądarce:** otwierają adres gry. Gra działa od razu. Najlepiej dodać ją
  do ekranu głównego: na Androidzie w Chrome — menu ⋮ → „Zainstaluj aplikację” (albo przycisk „Zainstaluj grę”
  w Kodeksie), na iPhonie w Safari — „Udostępnij” → „Do ekranu początkowego”. Wtedy otwiera się jak aplikacja,
  na pełnym ekranie, i działa nawet chwilę bez internetu.
- **Android — aplikacja (APK):** patrz punkt 5. Daje też powiadomienia (kuźnia gotowa, koniec badania, jajo).
- **Komputer:** po prostu adres gry w przeglądarce.

W Kodeksie jest przycisk **Zaproś znajomych** — wysyła link do gry (na telefonie przez dowolny komunikator).

## 5. Aplikacja na Androida (APK)

APK buduje się samo w chmurze GitHuba po każdej zmianie gry (`.github/workflows/android.yml`).

Jednorazowo w repozytorium na GitHubie: **Settings → Secrets and variables → Actions → zakładka Variables →
New repository variable**:

| Nazwa | Wartość |
|---|---|
| `NAKAMA_SERVER_KEY` | ta sama wartość co `NAKAMA_SERVER_KEY` w `.env` na serwerze |
| `SERVER_URL` | (opcjonalnie) adres gry, domyślnie `https://adamserver.taild0a9c3.ts.net` |

Potem: zakładka **Actions → Android (APK testowe) → Run workflow** (albo poczekaj na następną zmianę w grze).
Po kilku minutach plik jest w zakładce **Releases → „Kuźnia Legend — Android (test)”** — ten link wysyłasz
znajomym. Instalacja: pobrać `kuznia-legend.apk` na telefonie, otworzyć i zezwolić na instalację z przeglądarki.
Nowsze wersje instalują się na starszych, postęp jest na serwerze.

Uwaga: wersja testowa jest podpisana kluczem testowym z repozytorium (`android/app/kuznia-test.keystore`).
Do Google Play przygotujemy osobny, tajny klucz.

## 6. Uwagi i błędy od testerów

W Kodeksie jest przycisk **Zgłoś uwagę lub błąd**. Gra sama wysyła też raporty błędów skryptu (najwyżej kilka
na sesję). Wszystkie zgłoszenia, najnowsze na górze, zobaczysz w przeglądarce pod adresem:

```
https://adamserver.taild0a9c3.ts.net/v2/rpc/feedback_list?http_key=TWÓJ_NAKAMA_HTTP_KEY&unwrap
```

(`NAKAMA_HTTP_KEY` z `.env` — nie wysyłaj nikomu tego linku). Te same zgłoszenia są w konsoli Nakamy:
Storage → kolekcja `feedback`.

Każde zgłoszenie ma: tekst, nick, wersję gry (widać ją też w Kodeksie), przeglądarkę, rozmiar ekranu,
poziom kuźni, krainę i Moc.

## 7. Nowe wersje w trakcie testu

Po `git pull && docker compose up -d --build` otwarta gra u znajomych w ciągu kilku minut pokazuje pasek
„Jest nowa wersja gry” z przyciskiem **Odśwież** (zapis zostaje). Aplikację na Androida trzeba pobrać
ponownie z Releases.
