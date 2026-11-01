# Jaka to melodia? — szkolna wersja

Teleturniej muzyczny w przeglądarce: tablica dla widowni, panel hosta, przyciski zawodników na iPadach i nakładka do OBS / vMix.

Stos: **TypeScript + React + Vite**, stan gry na żywo w **Firebase Realtime Database**, logowanie ról przez **Firebase Authentication**, hosting na **GitHub Pages**.

## Co już działa (wersja 0.8)

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
- **Finał — 7 melodii w 30 sekund** z przyciskiem STOP na iPadzie finalisty.
- **Baza utworów** z folderu na MacBooku: start, refren, hasła, anegdoty, historia zagrań, losowanie edycji.
- **Ranking sezonu** z pokazem na tablicy i na live, **Zakończ rundę / Zakończ edycję**.
- **iPady zgłaszają się przy stanowiskach**, a host przypisuje im stanowisko i klasę.

## Runda 3 — licytacja nut

1. Po ogłoszeniu wyników rundy 2 host klika **Rozpocznij rundę 3** — grają dwie klasy, które przeszły dalej.
2. Na tablicy 6 ponumerowanych zagadek. Numery wybiera się **naprzemiennie**, zaczyna klasa z większą liczbą punktów.
3. Po wybraniu numeru widać **wykonawcę**, a host czyta **podpowiedź** (widzi ją w panelu).
4. **Licytacja na iPadach**: zaczyna klasa, która nie wybierała numeru. Od 7 nut w dół — można przebić (mniej nut) albo spasować („Graj, …!”). Zejście do 1 nuty kończy licytację. Host może wpisać ruch za klasę, jeśli licytują na głos.
5. **Muzyk** widzi na swoim tablecie nuty i duży napis „Zagraj 3 nuty”. Gra i klika **Zagrane** — rusza **10 s** na odpowiedź (host ma ten sam przycisk awaryjnie).
6. Trafienie: wygrana zagadka + punkty (200, jedna zagadka 400). Pudło: wygrana i punkty dla rywala.
7. Kto pierwszy wygra **3 zagadki**, przechodzi do finału.

Zagadki losuje aplikacja z folderu `RUNDA 3` (nuty PNG o tej samej nazwie co utwór). Anegdotę dla hosta wpisuje się w zakładce **Baza utworów**. Ostatnia z 6 zagadek jest za 400 pkt.

## Finał — 7 melodii w 30 sekund

1. Po rundzie 3 host klika **Rozpocznij finał**, a potem **Start finału** — rusza pierwsza melodia i zegar 30 s (widać go na tablicy z dziesiątymi sekundy).
2. Finalista ma na iPadzie duży przycisk **STOP**. Wciśnięcie zatrzymuje zegar i muzykę.
3. Zawodnik podaje tytuł (host: **Dobrze**) albo prosi o następną melodię (host: **Dalej**). W obu przypadkach od razu gra kolejna melodia i zegar rusza dalej.
4. Pominięte melodie wracają po przejściu całej siódemki, dopóki jest czas.
5. **250 pkt** za każdą odgadniętą melodię. **Komplet 7/7 = +1000 pkt bonusu** i tytuł **Mistrza edycji**.
6. **Zła odpowiedź kończy finał** — zdobyte punkty zostają.
7. Gdy zegar dojdzie do zera, muzyka staje, a zawodnik ma jeszcze **jedną, ostatnią szansę** na odpowiedź (bez „dalej”). Na odpowiedź jest 10 s.
8. Na koniec tablica odsłania wszystkie tytuły i pokazuje ranking klas.

Melodie finału losuje aplikacja z folderu `FINAŁ`.

## Czołówka

1. Do folderu edycji wrzuć podkład jako `czolowka.mp3` (albo `czolowka.wav`).
2. Po wczytaniu folderu w panelu hosta pojawia się karta „Czołówka” → **▶ Puść czołówkę**.
3. Podkład gra z MacBooka, a animacja jednocześnie pokazuje się na tablicy i w nakładce OBS (`#/stream`).

Animacja jest ułożona pod bity obecnego podkładu (17,5 s, ok. 152 BPM) — czasy są w `src/lib/intro/timeline.ts`. Logo szkoły: `public/logo-szkoly.png`.

## Runda 1 — jak to działa

1. Host wybiera folder z muzyką i losuje edycję (karta „Edycja”). Na kafelkach rundy 1 jest wykonawca.
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

## Baza utworów i edycje

Wszystkie utwory wszystkich edycji leżą w **jednym folderze na MacBooku hosta** (nigdy w repozytorium):

```
Muzyka/
  czolowka.wav
  RUNDA 1/Takie Tango - Budka Suflera.mp3
  RUNDA 2/…
  RUNDA 3/Takie Tango - Budka Suflera.png   ← nuty (MP3 obok opcjonalnie, na refren)
  FINAŁ/…
```

Nazwa pliku to **„Tytuł - Wykonawca”**. Utwory mogą być całe — start fragmentu ustawia się w aplikacji.

1. **Gra → Edycja → Wybierz folder z muzyką.** Nowe utwory same trafiają do bazy (Firebase, `/baza`, czyta tylko host).
2. **Baza utworów:** przy każdym utworze odtwarzacz, przyciski „= teraz” dla **startu** i **refrenu**, podgląd 15 s (rundy 1–2). Runda 2 — **hasło**, runda 3 — **anegdota**. Zmiany zapisują się od razu.
3. **Pobierz CSV / Kopiuj listę** — lista do arkusza albo na czat (np. żeby wymyślić hasła). **Wczytaj CSV** — wgrywa start, refren, hasła i anegdoty (po kolumnie `id`; puste komórki nic nie zmieniają; czas jako `83,5` albo `1:23,5`).
4. **Nowa edycja — losuj utwory:** 5 × runda 1 (na tablicy wykonawca zamiast hasła), 3 × runda 2 + 2 na dogrywkę, 6 × runda 3, 7 × finał. Losowane są tylko utwory gotowe i jeszcze niegrane; każdy można przelosować (↻).
5. **Zakończ rundę** — przerywa bieżącą rundę (niezagrane hasła są pomijane i wracają do puli). **Zakończ edycję** — wyniki klas idą do rankingu, zagrane utwory dostają wpis w historii (edycja, odgadnięty / nie, przez kogo) i wypadają z losowania. W bazie można je odznaczyć.
6. **Ranking** — wszystkie klasy z zakończonych edycji; przyciski **Pokaż na tablicy** i **Pokaż na live**. Edycję testową usuniesz w Baza utworów → Edycje.

Po odświeżeniu strony folder trzeba wybrać ponownie — edycja, punkty i stan gry zostają w bazie.

## iPady na stanowiskach

Zawodnik wciska na iPadzie **„Jestem przy stanowisku”**. Host widzi zgłoszenia po kolei (z kodem iPada), wybiera stanowisko i wpisuje klasę → **Przypisz**. iPad nie ma już przycisku zmiany stanowiska — odpiąć może go tylko host.

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
  lib/library/ Baza utworów: skan folderu, losowanie, CSV, ranking
  components/ Rama widoków, ochrona tras, panele (host/, board/ — rundy 1–2)
  pages/      Ekran startowy, logowanie i pięć widoków
przyklad/pytania.json Stary format edycji (v0.7, już nieużywany w panelu)
database.rules.json   Reguły dostępu do bazy (wklejane w konsoli Firebase)
.github/workflows/    Automatyczna publikacja na GitHub Pages
```
