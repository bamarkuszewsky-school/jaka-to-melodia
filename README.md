# Jaka to melodia? — szkolna wersja

Teleturniej muzyczny w przeglądarce: tablica dla widowni, panel hosta, przyciski zawodników na iPadach i nakładka do OBS / vMix.

Stos: **TypeScript + React + Vite**, stan gry na żywo w **Firebase Realtime Database**, logowanie ról przez **Firebase Authentication**, hosting na **GitHub Pages**.

## Co już działa (wersja 0.6)

- Ekran startowy z wyborem roli: **Zawodnik, Host, Tech Support, Tablica**.
- Logowanie hasłem — każda rola ma własne konto w Firebase.
- Wybór stanowiska (1–3) na iPadzie zawodnika, zapamiętywany na urządzeniu.
- **Test przycisków:** zawodnik wciska przycisk, host widzi kolejność i różnicę w milisekundach, tablica podświetla pierwsze stanowisko, nakładka do OBS pokazuje „Zgłasza się”.
- Lista urządzeń online (kto jest podłączony).
- Pełny ekran, blokada wygaszania ekranu (tam, gdzie przeglądarka pozwala).
- **Nazwy klas na stanowiskach** — host wpisuje je w panelu, widać je wszędzie.
- **Runda 1** według zasad TVP (punkty zamiast złotówek, 10 s na odpowiedź zamiast 5 s).
- **Runda 2** z malejącą stawką, eliminacją i dogrywką.
- **Czołówka** z logo szkoły, zgrana z podkładem — host puszcza ją jednym przyciskiem.
- **Runda 3 — licytacja nut** z nowym profilem **Muzyk** (nuty na tablecie przy pianinie).

## Runda 3 — licytacja nut

1. Po ogłoszeniu wyników rundy 2 host klika **Rozpocznij rundę 3** — grają dwie klasy, które przeszły dalej.
2. Na tablicy 6 ponumerowanych zagadek. Numery wybiera się **naprzemiennie**, zaczyna klasa z większą liczbą punktów.
3. Po wybraniu numeru widać **wykonawcę**, a host czyta **podpowiedź** (widzi ją w panelu).
4. **Licytacja na iPadach**: zaczyna klasa, która nie wybierała numeru. Od 7 nut w dół — można przebić (mniej nut) albo spasować („Graj, …!”). Zejście do 1 nuty kończy licytację. Host może wpisać ruch za klasę, jeśli licytują na głos.
5. **Muzyk** widzi na swoim tablecie nuty i duży napis „Zagraj 3 nuty”. Gra i klika **Zagrane** — rusza **10 s** na odpowiedź (host ma ten sam przycisk awaryjnie).
6. Trafienie: wygrana zagadka + punkty (200, jedna zagadka 400). Pudło: wygrana i punkty dla rywala.
7. Kto pierwszy wygra **3 zagadki**, przechodzi do finału.

W `pytania.json` lista `runda3` (dokładnie 6 zagadek):

```json
"runda3": [
  { "tytul": "…", "wykonawca": "…", "podpowiedz": "Anegdota do przeczytania", "nuty": "e01-r3-01.png" }
]
```

`nuty` to zrzut z MuseScore (PNG/JPG) w folderze edycji — najlepiej z ponumerowanymi nutami. Bez pola `wartosc` ostatnia zagadka jest za 400 pkt, reszta po 200; można też wpisać `"wartosc": 400` przy wybranej zagadce. Nuty trafiają do bazy tylko na czas zagadki i widzą je wyłącznie muzyk i host.

## Czołówka

1. Do folderu edycji wrzuć podkład jako `czolowka.mp3` (albo `czolowka.wav`).
2. Po wczytaniu folderu w panelu hosta pojawia się karta „Czołówka” → **▶ Puść czołówkę**.
3. Podkład gra z MacBooka, a animacja jednocześnie pokazuje się na tablicy i w nakładce OBS (`#/stream`).

Animacja jest ułożona pod bity obecnego podkładu (17,5 s, ok. 152 BPM) — czasy są w `src/lib/intro/timeline.ts`. Logo szkoły: `public/logo-szkoly.png`.

## Runda 1 — jak to działa

1. Host wczytuje folder edycji (karta „Edycja” → „Wybierz folder”).
2. „Rozpocznij rundę 1” — punkty się zerują, na tablicy pojawia się 5 haseł.
3. Zawodnik, który wybiera, wskazuje hasło — host klika kafelek, potem **▶ Graj utwór**.
4. Muzyka gra dokładnie 15 s, a wartość rośnie od **100 do 200 pkt** (co 10 pkt).
5. Pierwszy przycisk zatrzymuje muzykę i licznik; zawodnik ma **10 s** na tytuł.
6. Host klika **✓ Dobrze** — punkty trafiają do klasy, tytuł się odsłania, ta klasa wybiera następne hasło.
   Albo **✗ Źle** — klasa jest zablokowana do końca tej piosenki, muzyka leci od początku dla pozostałych, licznik znów od 100.
7. Jeśli przez 15 s nikt się nie zgłosi (albo wszyscy się pomylą) — host klika **Odsłoń tytuł**.

Wartość punktów liczy serwer (czas od startu muzyki do zgłoszenia), więc opóźnienia Wi‑Fi nie zmieniają wyniku.

## Runda 2 — jak to działa

1. Po rundzie 1 host klika **Rozpocznij rundę 2** — punkty zostają, na tablicy 3 hasła.
2. Pierwsze hasło wybiera klasa z **najmniejszą liczbą punktów** (potem — kto ostatnio odgadł).
3. Wartość **maleje od 200 do 100 pkt** (co 10 pkt, co 1,5 s) — im szybciej, tym więcej.
4. Zła odpowiedź: klasa zablokowana, a muzyka **gra dalej od miejsca zatrzymania** — pozostali walczą o aktualną, już niższą stawkę.
5. Po 3 hasłach odpada klasa z najmniejszą liczbą punktów; host klika **Ogłoś wyniki na tablicy**.
6. **Remis na ostatnim miejscu** → dogrywka (zasady rundy 2, bez punktów). Kategorię wybiera bezpieczna klasa, która sama nie gra. Kto odgadnie, przechodzi dalej. Hasła dogrywki są w liście `dogrywka2`.
7. Gdyby zabrakło haseł dogrywki — „Rozstrzygnij ręcznie” w panelu hosta.

## Edycja: folder z pytaniami i muzyką

Folder leży **tylko na MacBooku hosta** — nie wrzucamy go do repozytorium (jest publiczne, uczniowie podejrzeliby odpowiedzi). W folderze:

- `pytania.json` — lista haseł z odpowiedziami,
- pliki MP3 o nazwach podanych w `pytania.json`.

Wzór pliku jest w [`przyklad/pytania.json`](przyklad/pytania.json):

```json
{
  "edycja": "Edycja 1",
  "runda1": [
    { "haslo": "Królowa popu", "tytul": "…", "wykonawca": "…", "plik": "e01-r1-01.mp3", "start": 0 }
  ],
  "runda2": [
    { "haslo": "Filmowy hit", "tytul": "…", "wykonawca": "…", "plik": "e01-r2-01.mp3", "start": 0 }
  ],
  "dogrywka2": [
    { "haslo": "Z bajki", "tytul": "…", "wykonawca": "…", "plik": "e01-d2-01.mp3", "start": 0 }
  ]
}
```

| Pole | Co wpisać |
| --- | --- |
| `haslo` | Hasło na tablicy (wykonawca, gatunek, temat — np. „Włoskie słońce”) |
| `tytul`, `wykonawca` | Odpowiedź — widzi ją tylko host, na tablicy pojawia się po odsłonięciu |
| `plik` | Nazwa pliku MP3 w tym samym folderze (najlepiej numer, np. `e01-r1-01.mp3`) |
| `start` | Od której sekundy grać (0 = początek utworu; można pominąć) |

Runda 1: dokładnie 5 haseł. Runda 2: dokładnie 3 hasła. Dogrywka: od 0 do 5 haseł (zalecane 2–3). Po odświeżeniu strony host wybiera folder ponownie — stan gry i punkty zostają w bazie.

## Uruchomienie u siebie (WebStorm)

1. Zainstaluj [Node.js](https://nodejs.org) w wersji 22 lub nowszej.
2. W WebStormie: **File → Open** i wybierz ten folder.
3. W terminalu WebStorma:
   ```bash
   npm install
   npm run dev
   ```
4. Otwórz adres z terminala (zwykle `http://localhost:5173`).

Przydatne komendy:

| Komenda | Co robi |
| --- | --- |
| `npm run dev` | Podgląd na żywo podczas pisania |
| `npm run build` | Sprawdza typy i buduje wersję do publikacji (`dist/`) |
| `npm run preview` | Podgląd zbudowanej wersji |
| `npm run lint` | Szuka typowych błędów w kodzie |
| `npm test` | Testy logiki gry (punktacja, wczytywanie pytań) |

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
| Muzyk | `#/muzyk` | tablet przy pianinie (runda 3) |
| Nakładka OBS | `#/stream` | źródło przeglądarki w OBS / vMix, 1920×1080 |

## Ważne zasady

- **Muzyka nigdy nie trafia do repozytorium** — repo jest publiczne. Pliki `.mp3` są w `.gitignore`.
- **Hasła nie trafiają do kodu.** Konfiguracja Firebase w `src/lib/firebase.ts` nie jest tajna; przed obcymi chronią hasła i reguły bazy.
- iPady: otwórz stronę w Safari → Udostępnij → **Dodaj do ekranu początkowego**. Gra otworzy się bez paska Safari. Do tego włącz **Dostęp z przewodnikiem** (Ustawienia → Dostępność), żeby zawodnik nie wyszedł z gry.

## Struktura

```
src/
  lib/        Firebase, role, logowanie, obecność urządzeń, pełny ekran, test przycisków
  lib/game/   Zasady i stan gry: punktacja, pytania, akcje hosta i zawodnika, odtwarzacz
  components/ Rama widoków, ochrona tras, panele (host/, board/ — rundy 1–2)
  pages/      Ekran startowy, logowanie i pięć widoków
przyklad/pytania.json Wzór pliku z pytaniami (bez prawdziwych odpowiedzi)
database.rules.json   Reguły dostępu do bazy (wklejane w konsoli Firebase)
.github/workflows/    Automatyczna publikacja na GitHub Pages
```
