/**
 * Typy stanu gry. Stan na żywo leży w Firebase pod /gra, pytania (z odpowiedziami)
 * tylko w pamięci panelu hosta — wczytane z folderu na MacBooku.
 */

/** Stanowisko jako klucz w bazie: '1' | '2' | '3'. */
export type StationKey = '1' | '2' | '3'
export const STATION_KEYS: readonly StationKey[] = ['1', '2', '3']

/** Rundy z tablicą haseł i przyciskami (3 i 4 dojdą później). */
export type RoundNo = 1 | 2

// ---------- Plik pytania.json (tylko u hosta) ----------

export interface Question {
  /** Hasło na tablicy, np. „Włoskie słońce”, „Królowa popu”. */
  haslo: string
  tytul: string
  wykonawca: string
  /** Nazwa pliku w tym samym folderze, np. „e01-r1-01.mp3”. */
  plik: string
  /** Sekunda, od której gra fragment (domyślnie 0 — początek utworu). */
  start: number
}

/** @deprecated nazwa z wersji 0.3 */
export type Round1Question = Question

/** Zagadka rundy 3 (licytacja nut) — nuty gra na żywo muzyk. */
export interface Round3Question {
  tytul: string
  wykonawca: string
  /** Podpowiedź, którą czyta prowadzący (anegdota, fakt o artyście). */
  podpowiedz: string
  /** Zrzut nut z MuseScore (plik w folderze edycji) — widzi go muzyk. */
  nuty?: string
  /** 200 albo 400 pkt. */
  wartosc: number
}

export interface QuestionSet {
  edycja: string
  /** 6 zagadek rundy 3 (puste, jeśli plik ich nie ma). */
  runda3: Round3Question[]
  runda1: Question[]
  /** 3 hasła rundy 2 (puste, jeśli plik ich nie ma). */
  runda2: Question[]
  /** Zapasowe hasła na dogrywkę po rundzie 2. */
  dogrywka2: Question[]
}

// ---------- Stan w bazie (/gra) ----------

/**
 * Fazy jednej piosenki:
 * wybrane  → host kliknął kafelek, piosenka jeszcze nie gra
 * gra      → muzyka gra, licznik się zmienia, przyciski aktywne
 * odpowiedz→ ktoś się zgłosił, ma 10 s na tytuł
 * brak     → minęło 15 s albo wszyscy się pomylili; czeka na odsłonięcie
 * odslona  → tytuł odsłonięty, widać wynik
 */
export type Phase = 'wybrane' | 'gra' | 'odpowiedz' | 'brak' | 'odslona'

export type TileState = 'ukryte' | 'odgadniete' | 'nieodgadniete'

export interface Tile {
  haslo: string
  stan: TileState
  /** Kto odgadł (tylko gdy stan = odgadniete). */
  stanowisko?: StationKey
  punkty?: number
  /** Odsłaniane dopiero po zakończeniu hasła. */
  tytul?: string
  wykonawca?: string
}

/** @deprecated nazwa z wersji 0.3 */
export type Round1Tile = Tile

export interface RoundState {
  hasla: Tile[]
  /** Kto wybiera następne hasło. */
  wybiera?: StationKey
  /** Runda 2: hasła dogrywki (remis na miejscu spadkowym). */
  dogrywki?: Tile[]
  /** Runda 2: kto wygrał dogrywkę (przechodzi dalej bez względu na punkty). */
  awans?: Partial<Record<StationKey, true>>
  /** Runda 2: kto odpada — zapisywane, gdy host ogłasza wyniki. */
  odpada?: StationKey
}

/** @deprecated nazwa z wersji 0.3 */
export type Round1State = RoundState

export interface LiveQuestion {
  runda: RoundNo
  /** Indeks hasła na tablicy (albo w liście dogrywki). */
  haslo: number
  /** Hasło z dogrywki po rundzie 2 (bez punktów — decyduje o awansie). */
  dogrywka?: boolean
  faza: Phase
  /** Czas serwera, kiedy muzyka zaczęła (albo wznowiła) granie. */
  start?: number
  /** Ile ms piosenki już zagrało przed `start` (runda 2: wznowienie po złej odpowiedzi). */
  przesuniecie?: number
  /** Ile ms grało do chwili zgłoszenia. */
  grane?: number
  /** Czas serwera, kiedy zaczęło się odliczanie 10 s na odpowiedź. */
  odpowiedzStart?: number
  /** Kto aktualnie odpowiada i za ile punktów. */
  odpowiada?: StationKey
  wartosc?: number
  /** Stanowiska, które nie mogą się zgłosić (pomyłka albo „nie gra w dogrywce”). */
  zablokowane?: Partial<Record<StationKey, true>>
  /** Stanowiska, które nie biorą udziału w tej piosence (dogrywka). */
  poza?: Partial<Record<StationKey, true>>
  /** Wynik po odsłonięciu. */
  wynik?: { stanowisko?: StationKey; punkty?: number; tytul: string; wykonawca: string }
}

export interface Buzz {
  stanowisko: StationKey
  czas: number
}

/** Czołówka: kiedy host ją puścił (czas serwera) i ile trwa. */
export interface IntroState {
  start: number
  dlugosc: number
}

// ---------- Runda 3 ----------

export interface Round3Tile {
  stan: TileState
  /** Po odsłonięciu. */
  wykonawca?: string
  tytul?: string
  /** Kto zdobył punkt za tę zagadkę i ile punktów. */
  stanowisko?: StationKey
  punkty?: number
  /** Czy zgadujący trafił (false = punkt dla rywala). */
  trafil?: boolean
  /** Kto zgadywał i po ilu nutach. */
  zgadywal?: StationKey
  nuty?: number
}

export interface Round3State {
  hasla: Round3Tile[]
  /** Dwie klasy w rundzie 3. */
  gracze: [StationKey, StationKey]
  wybiera: StationKey
  /** Wygrane zagadki (gra do 3). */
  wygrane: Partial<Record<StationKey, number>>
  /** Kto przechodzi do finału. */
  zwyciezca?: StationKey
}

export type Phase3 = 'licytacja' | 'granie' | 'odpowiedz' | 'odslona'

export interface Bidding {
  /** Czyja kolej w licytacji. */
  kolej: StationKey
  /** Aktualna najniższa oferta (brak = nikt jeszcze nie licytował, start od 7). */
  nuty?: number
  /** Kto złożył aktualną ofertę. */
  prowadzi?: StationKey
}

export interface LiveQuestion3 {
  haslo: number
  faza: Phase3
  /** Kto wybrał numer (następny numer wybiera rywal). */
  wybral: StationKey
  /** Wykonawca pokazywany po wybraniu numeru. */
  wykonawca: string
  wartosc: number
  licytacja: Bidding
  /** Kto zgaduje i po ilu nutach (po zakończeniu licytacji). */
  gra?: StationKey
  nuty?: number
  odpowiedzStart?: number
  wynik?: { tytul: string; wykonawca: string; stanowisko: StationKey; punkty: number; trafil: boolean }
}

/** Ruch zawodnika w licytacji (zapisuje iPad, przetwarza host). */
export interface BidMove {
  stanowisko: StationKey
  nuty?: number
  pas?: boolean
  czas: number
}

export interface GameState {
  runda?: number
  runda3?: Round3State
  pytanie3?: LiveQuestion3
  ruch?: BidMove
  /** Muzyk kliknął „Zagrane” (czas serwera). */
  zagrane?: number
  czolowka?: IntroState
  punkty: Record<StationKey, number>
  runda1?: RoundState
  runda2?: RoundState
  pytanie?: LiveQuestion
  zgloszenie?: Buzz
}
