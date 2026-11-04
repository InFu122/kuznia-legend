# Kuźnia Legend w Google Play — krok po kroku

Gra jest gotowa technicznie: płatności Google Play (sprawdzane przez serwer), reklamy z nagrodą AdMob ze zgodą RODO,
usuwanie konta w grze i przez stronę WWW, polityka prywatności, podpisany plik AAB z GitHub Actions oraz grafiki
i teksty karty sklepu (`store/`). Tu jest to, co musisz zrobić sam na kontach Google — w tej kolejności.

Szacunkowo: konfiguracja 1–2 wieczory, potem **14 dni testu zamkniętego** (wymóg Google dla nowych kont osobistych).

---

## 0. Decyzje na start (nieodwracalne)

- **Nazwa pakietu: `pl.kuznialegend.gra`.** Po pierwszym wgraniu do Google Play nie da się jej zmienić. Jeśli wolisz
  inną, zmień ją teraz w `capacitor.config.ts`, `android/app/build.gradle` (namespace i applicationId),
  ścieżce `android/app/src/main/java/...` oraz `PLAY_PACKAGE` w `server/src/play.ts`.
- **Konto deweloperskie:** osobiste (tylko dokument tożsamości) albo organizacji (firma, wymaga numeru D-U-N-S).
  Opłata jednorazowa 25 USD. Na koncie osobistym założonym po 13.11.2023 przed wydaniem publicznym musisz przeprowadzić
  **test zamknięty z co najmniej 12 testerami przez 14 dni bez przerwy** (krok 9).
- **Grupa docelowa: 16+** (zalecane). Gra ma czat z innymi graczami, zakupy i reklamy — przy grupie poniżej 13 lat
  obowiązują zasady programu „Rodzina” (inne reklamy, osobne zgody), a w Polsce zgodę na dane dziecka poniżej 16 lat
  daje rodzic. Polityka prywatności (`deploy/strony/polityka-prywatnosci.html`) mówi o 16 latach — zmień ją, jeśli
  wybierzesz inaczej.

## 1. Serwer gotowy dla graczy

W pliku `.env` na serwerze:

```
TEST_SPEED=1
OWNER_NAME=Imię i nazwisko (albo nazwa firmy) — administrator danych w polityce prywatności
CONTACT_EMAIL=adres do spraw graczy i danych (Google pokaże go też w karcie sklepu)
ADMOB_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX   ← po kroku 7, na razie zostaw puste
```

Potem `git pull && docker compose up -d --build`. Sprawdź w przeglądarce:

- `https://ADRES-GRY/polityka-prywatnosci.html` — polityka z twoimi danymi,
- `https://ADRES-GRY/usun-konto.html` — instrukcja usuwania konta,
- w grze Kodeks nie ma już przełącznika tempa testowego, a sklep nie daje Klejnotów za darmo.

`TEST_SPEED=1` jest ważne: przy trybie testowym serwer rozdaje pakiety Klejnotów bez płatności.

## 2. Klucz przesyłania (upload key) i GitHub

Klucz trzymasz u siebie — **nie wysyłaj go nikomu i nie wrzucaj do repozytorium**. Google Play podpisuje aplikację
własnym kluczem (Podpisywanie aplikacji przez Google Play), a twój klucz tylko potwierdza, że wgrywasz ty. Zgubiony
klucz przesyłania można zresetować przez Play Console.

Na serwerze (albo dowolnym komputerze z Dockerem), w pustym katalogu poza repozytorium:

```
docker run --rm -it -v "$PWD":/k -w /k eclipse-temurin:21 \
  keytool -genkeypair -v -keystore kuznia-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 kuznia-upload.jks > kuznia-upload.b64
```

keytool zapyta o hasło (wymyśl mocne, zapisz w menedżerze haseł) i dane (wystarczy imię i kraj PL).
Zrób kopię `kuznia-upload.jks` w bezpiecznym miejscu.

GitHub → repozytorium → Settings → Secrets and variables → Actions:

| Zakładka | Nazwa | Wartość |
|---|---|---|
| Secrets | `KL_UPLOAD_KEYSTORE_B64` | zawartość `kuznia-upload.b64` |
| Secrets | `KL_UPLOAD_STORE_PASSWORD` | hasło z keytool |
| Secrets | `KL_UPLOAD_KEY_ALIAS` | `upload` |
| Secrets | `KL_UPLOAD_KEY_PASSWORD` | to samo hasło |
| Variables | `NAKAMA_SERVER_KEY` | już jest (APK testowe) |
| Variables | `SERVER_URL` | adres gry z HTTPS |
| Variables | `ADMOB_APP_ID`, `ADMOB_REWARDED_ID` | po kroku 7 |

Potem usuń `kuznia-upload.b64`.

## 3. Pierwszy plik AAB

GitHub → Actions → **Google Play (AAB)** → Run workflow → wersja `1.0.0`. Po kilku minutach na dole strony
uruchomienia, w sekcji Artifacts, jest `kuznia-legend-aab` (zip z plikiem `.aab`).

Każde kolejne wgranie do Google Play musi mieć wyższy numer kompilacji — workflow nadaje go sam (1001, 1002, …).
Numer wersji widoczny dla graczy (1.0.0, 1.0.1, …) wpisujesz przy uruchomieniu.

## 4. Play Console: nowa aplikacja

[play.google.com/console](https://play.google.com/console) → Utwórz aplikację: nazwa „Kuźnia Legend”, język domyślny
polski, **Gra**, **Bezpłatna**. Potem Testowanie → **Test wewnętrzny** → Utwórz wersję → wgraj `.aab`
(Google zaproponuje Podpisywanie aplikacji przez Google Play — zaakceptuj). To pierwsze wgranie rezerwuje nazwę pakietu.

## 5. Treść aplikacji (Zasady → Treść aplikacji)

| Formularz | Odpowiedź |
|---|---|
| Polityka prywatności | `https://ADRES-GRY/polityka-prywatnosci.html` |
| Dostęp do aplikacji | Wszystkie funkcje dostępne bez specjalnego dostępu (konto zakłada się samo) |
| Reklamy | Tak, aplikacja zawiera reklamy |
| Identyfikator wyświetlania reklam | Tak — reklamy (AdMob) |
| Klasyfikacja treści | Kwestionariusz IARC, kategoria „Gra”: przemoc fantasy wobec potworów (pixel art, bez krwi), **interakcja użytkowników (czat)**, **zakupy cyfrowe**, brak hazardu (losowość wytopu to nie gra o pieniądze) |
| Grupa docelowa | 16 i więcej (patrz krok 0) |
| Aplikacja z wiadomościami | Nie |
| Usuwanie danych / konta | Tak, w aplikacji (Kodeks → Konto → Usuń konto) i przez stronę: `https://ADRES-GRY/usun-konto.html` |
| Aplikacje rządowe, finansowe, zdrowotne | Nie |

### Bezpieczeństwo danych

- Zbiera lub udostępnia dane: **Tak**. Szyfrowanie w transmisji: **Tak** (HTTPS). Możliwość usunięcia danych: **Tak**.
- Gra (twój serwer) **zbiera, nie udostępnia**:

| Typ danych | Cel | Wymagane? |
|---|---|---|
| Dane osobowe → Identyfikatory użytkownika (nick, identyfikator konta) | Działanie aplikacji, Zarządzanie kontem | Tak |
| Informacje finansowe → Historia zakupów | Działanie aplikacji, Zapobieganie oszustwom | Nie (tylko przy zakupie) |
| Wiadomości → Inne wiadomości w aplikacji (czat) | Działanie aplikacji | Nie |
| Aktywność w aplikacji → Interakcje z aplikacją (postęp gry) | Działanie aplikacji | Tak |
| Informacje o aplikacji i wydajności → Logi awarii, Diagnostyka (zgłoszenia błędów) | Działanie aplikacji | Nie |
| Urządzenie lub inne identyfikatory (losowy identyfikator urządzenia gry) | Działanie aplikacji, Zarządzanie kontem | Tak |

- Do tego dochodzi **pakiet SDK Google Mobile Ads** (AdMob): Google opisuje, co zbiera i udostępnia, na stronie
  „Google Mobile Ads SDK — ujawnianie danych w Google Play” (support.google.com/admob, szukaj „data disclosure”).
  W skrócie: przybliżona lokalizacja (z adresu IP), interakcje z aplikacją, diagnostyka, identyfikatory urządzenia
  (identyfikator reklamowy) — **udostępniane** w celu: reklamy, analityka, zapobieganie oszustwom. Zaznacz to zgodnie
  z aktualną stroną Google.

## 6. Produkty w aplikacji

Zarabianie → Produkty → Produkty w aplikacji. Wymaga profilu płatności (Ustawienia → Profil płatności, konto bankowe
do wypłat). Utwórz 6 produktów z tabeli w `store/opis.md` — **identyfikatory dokładnie jak w tabeli** — i aktywuj je.

Google pobiera 15% prowizji (do 1 mln USD przychodu rocznie).

## 7. Sprawdzanie zakupów przez serwer (konto usługi)

Serwer sprawdza każdy zakup u Google, zanim da Klejnoty — bez tego gra nie wyda pakietu (zakup czeka, a po 3 dniach
Google sam zwraca graczowi pieniądze).

1. [console.cloud.google.com](https://console.cloud.google.com) → nowy projekt (np. „kuznia-legend”) →
   Interfejsy API i usługi → Biblioteka → włącz **Google Play Android Developer API**.
2. Administracja → Konta usługi → Utwórz konto usługi (np. `kuznia-zakupy`), bez ról w projekcie →
   wejdź w nie → Klucze → Dodaj klucz → JSON. Pobierze się plik `.json`.
3. Play Console → **Użytkownicy i uprawnienia** → Zaproś nowych użytkowników → adres e-mail konta usługi
   (`kuznia-zakupy@….iam.gserviceaccount.com`) → uprawnienia aplikacji Kuźnia Legend: **Wyświetlanie danych finansowych**
   oraz **Zarządzanie zamówieniami i subskrypcjami**.
4. Na serwerze, obok `docker-compose.yml`: `mkdir -p sekrety` i zapisz plik jako `sekrety/google-play.json`
   (`chmod 600 sekrety/google-play.json`). Katalog `sekrety/` jest w `.gitignore`.
5. `docker compose up -d` (Nakama czyta plik przy każdym zakupie). Jeśli w logach Nakamy
   (`docker compose logs nakama | grep Zakup`) jest „brak pliku … albo Nakama nie może go odczytać”, ustaw
   `chmod 644 sekrety/google-play.json`.

Uprawnienia konta usługi potrafią zadziałać dopiero po kilku godzinach (czasem do doby). Do tego czasu zakup testowy
skończy się komunikatem „Nie udało się potwierdzić zakupu” — gra ponowi go sama przy następnym uruchomieniu.

## 8. AdMob (reklamy z nagrodą)

1. [admob.google.com](https://admob.google.com) → zarejestruj się tym samym kontem Google.
2. Aplikacje → Dodaj aplikację → Android → „Czy aplikacja jest w Google Play?” — na razie **Nie** (połączysz ją ze
   sklepem po wydaniu). Skopiuj **identyfikator aplikacji** (`ca-app-pub-…~…`) → zmienna GitHub `ADMOB_APP_ID`.
3. Jednostki reklamowe → Dodaj → **Z nagrodą** (nagroda: 1 „nagroda”, gra i tak daje swoją) → identyfikator
   (`ca-app-pub-…/…`) → zmienna GitHub `ADMOB_REWARDED_ID`.
4. Prywatność i wiadomości → **Przepisy europejskie (RODO)** → utwórz wiadomość dla aplikacji, język polski,
   opcje „Zgoda” i „Zarządzaj opcjami” → opublikuj. Bez tego gracze z UE dostaną tylko reklamy niespersonalizowane
   (albo żadne).
5. Konto → Informacje o koncie → **identyfikator wydawcy** (`pub-…`) → `ADMOB_PUBLISHER_ID` w `.env` na serwerze →
   `docker compose up -d --build`. Plik `https://ADRES-GRY/app-ads.txt` pojawi się sam. W karcie sklepu jako
   „Witryna” podaj `https://ADRES-GRY` (AdMob szuka `app-ads.txt` w głównym katalogu tej witryny).
6. Zbuduj nowy AAB (krok 3) — dopiero on ma prawdziwe reklamy.

Dopóki zmienne AdMob są puste, aplikacja pokazuje reklamy testowe Google (napis „Test Ad”) — tak też działa APK dla
znajomych. **Nie klikaj własnych prawdziwych reklam** (AdMob blokuje za to konto) — na swoim telefonie dodaj go jako
urządzenie testowe w AdMob → Ustawienia → Urządzenia testowe.

## 9. Testy

1. **Test wewnętrzny** (do 100 osób, bez przeglądu Google): Testowanie → Test wewnętrzny → Testerzy → lista adresów
   Gmail → wyślij im link „dołącz do testu”.
2. **Zakupy bez płacenia:** Ustawienia → **Testowanie licencji** → dodaj adresy Gmail testerów. Oni widzą przy zakupie
   „Karta testowa, zawsze zatwierdza” — Klejnoty dochodzą naprawdę, pieniądze nie schodzą.
   Sprawdź: zakup → Klejnoty → kupno tego samego pakietu drugi raz (gra musi „zużyć” zakup) → Pakiet Nowicjusza
   znika po zakupie.
3. **Test zamknięty** (wymóg dla konta osobistego): Testowanie → Test zamknięty → ta sama wersja → co najmniej
   **12 testerów** zapisanych przez **14 dni bez przerwy**. Potem Panel → „Ubiegaj się o dostęp do wersji produkcyjnej”
   (krótka ankieta o teście).
4. Wersja produkcyjna → kraje: na początek **Polska** (gra jest tylko po polsku) → wyślij do przeglądu
   (zwykle od kilku godzin do kilku dni).

**Przejście z APK dla znajomych:** APK z GitHub Releases jest podpisane innym kluczem niż wersja z Google Play, więc
telefon nie zainstaluje jednej na drugiej. Przed odinstalowaniem APK: Kodeks → Konto → **Pokaż kod**, a w wersji
z Google Play wpisz ten kod — postęp przejdzie razem z kontem.

## 10. Po wydaniu

- **Aktualizacja:** najpierw serwer (`git pull && docker compose up -d --build`), potem Actions → Google Play (AAB)
  z wyższym numerem wersji → Play Console → nowa wersja produkcyjna. Stara wersja gry musi dalej działać z nowym
  serwerem przez kilka dni (gracze aktualizują powoli).
- **Prośba o usunięcie konta e-mailem:** najpierw podgląd, potem usunięcie (klucz `NAKAMA_HTTP_KEY` z `.env`):
  ```
  curl -X POST "https://ADRES-GRY/v2/rpc/account_delete_admin?http_key=KLUCZ&unwrap" -d '{"name":"Nick"}'
  curl -X POST "https://ADRES-GRY/v2/rpc/account_delete_admin?http_key=KLUCZ&unwrap" -d '{"name":"Nick","confirm":true}'
  ```
- **Zwroty:** Play Console → Zarządzanie zamówieniami. Gra nie odbiera Klejnotów za zwrócone zakupy automatycznie —
  przy nadużyciach możesz usunąć konto gracza (jak wyżej).
- **Uwagi graczy:** `https://ADRES-GRY/v2/rpc/feedback_list?http_key=KLUCZ&unwrap`.
- **Serwer domowy:** gra z Google Play działa tylko, gdy serwer i Tailscale Funnel są włączone. Przy większej liczbie
  graczy rozważ serwer w chmurze (VPS) — wystarczy przenieść Docker, `.env`, `sekrety/` i bazę danych.

## Co jest w kodzie

| Element | Gdzie |
|---|---|
| Płatności (aplikacja) | `src/ui/billing.ts` — @capgo/native-purchases, zużycie zakupu dopiero po potwierdzeniu przez serwer, dokańczanie przerwanych zakupów |
| Płatności (serwer) | `server/src/shop.ts` (`iap_google`) i `server/src/play.ts` — sprawdzenie u Google, pakiet raz na zakup, zakup innego konta odrzucony |
| Reklamy | `src/ui/ads.ts` — @capacitor-community/admob, zgoda Google UMP, „Prywatność reklam” w Kodeksie |
| Usuwanie konta | `server/src/account.ts` (`account_delete`, `account_delete_admin`), Kodeks → Konto |
| Strony WWW | `deploy/strony/*.html` (wstawiane przy budowaniu: `OWNER_NAME`, `CONTACT_EMAIL`) + `app-ads.txt` |
| Podpisywanie i AAB | `android/app/build.gradle`, `.github/workflows/play.yml` |
| Karta sklepu | `store/` (teksty w `store/opis.md`) |
