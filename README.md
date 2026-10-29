# Jaka to melodia? — szkolna wersja

Teleturniej muzyczny w przeglądarce: tablica dla widowni, panel hosta, przyciski zawodników na iPadach i nakładka do OBS / vMix.

Stos: **TypeScript + React + Vite**, stan gry na żywo w **Firebase Realtime Database**, logowanie ról przez **Firebase Authentication**, hosting na **GitHub Pages**.

## Co już działa (wersja 0.1)

- Ekran startowy z wyborem roli: **Zawodnik, Host, Tech Support, Tablica**.
- Logowanie hasłem — każda rola ma własne konto w Firebase.
- Wybór stanowiska (1–3) na iPadzie zawodnika, zapamiętywany na urządzeniu.
- **Test przycisków:** zawodnik wciska przycisk, host widzi kolejność i różnicę w milisekundach, tablica podświetla pierwsze stanowisko, nakładka do OBS pokazuje „Zgłasza się”.
- Lista urządzeń online (kto jest podłączony).
- Pełny ekran, blokada wygaszania ekranu (tam, gdzie przeglądarka pozwala).

## Uruchomienie u siebie (WebStorm)

1. Zainstaluj [Node.js](https://nodejs.org) w wersji 22 lub nowszej.
2. W WebStormie: **File → Open** i wybierz ten folder.
3. W terminalu WebStorma:
   ```bash
   npm install
   
   ```
4. Otwórz adres z terminala (zwykle `http://localhost:5173`).

Przydatne komendy:

| Komenda | Co robi |
| --- | --- |
| `npm run dev` | Podgląd na żywo podczas pisania |
| `npm run build` | Sprawdza typy i buduje wersję do publikacji (`dist/`) |
| `npm run preview` | Podgląd zbudowanej wersji |
| `npm run lint` | Szuka typowych błędów w kodzie |

## Jednorazowa konfiguracja Firebase

1. **Reguły bazy** — w konsoli Firebase: Databases & Storage → Realtime Database → zakładka **Rules**. Wklej całą zawartość pliku `database.rules.json` i kliknij **Publish**. Bez tego baza nie wpuści nikogo.
2. **Konta ról** — Security → Authentication → Users. Muszą istnieć dokładnie te adresy (hasła wymyślasz sam):
   - `host@example.com`
   - `zawodnik@example.com`
   - `tech@example.com`
   - `tablica@example.com`

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie (np. `jaka-to-melodia`) i wypchnij ten folder na gałąź `main`.
2. W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Każdy push na `main` sam zbuduje i opublikuje stronę (zakładka **Actions** pokazuje postęp).
4. Adres gry: `https://<twój-login>.github.io/jaka-to-melodia/`

## Adresy widoków

| Widok | Adres (po `…/jaka-to-melodia/`) | Urządzenie |
| --- | --- | --- |
| Ekran startowy | `#/` | wszystkie |
| Host | `#/host` | MacBook |
| Zawodnik | `#/zawodnik` | iPady na stanowiskach |
| Tablica | `#/tablica` | tablica z Androidem |
| Tech Support | `#/tech` | laptop z OBS |
| Nakładka OBS | `#/stream` | źródło przeglądarki w OBS / vMix, 1920×1080 |

## Ważne zasady

- **Muzyka nigdy nie trafia do repozytorium** — repo jest publiczne. Pliki `.mp3` są w `.gitignore`.
- **Hasła nie trafiają do kodu.** Konfiguracja Firebase w `src/lib/firebase.ts` nie jest tajna; przed obcymi chronią hasła i reguły bazy.
- iPady: otwórz stronę w Safari → Udostępnij → **Dodaj do ekranu początkowego**. Gra otworzy się bez paska Safari. Do tego włącz **Dostęp z przewodnikiem** (Ustawienia → Dostępność), żeby zawodnik nie wyszedł z gry.

## Struktura

```
src/
  lib/        Firebase, role, logowanie, obecność urządzeń, pełny ekran, test przycisków
  components/ Rama widoków, ochrona tras, panele
  pages/      Ekran startowy, logowanie i pięć widoków
database.rules.json   Reguły dostępu do bazy (wklejane w konsoli Firebase)
.github/workflows/    Automatyczna publikacja na GitHub Pages
```
