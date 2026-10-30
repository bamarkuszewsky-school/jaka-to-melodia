/**
 * Typy stanu gry. Stan na żywo leży w Firebase pod /gra, pytania (z odpowiedziami)
 * tylko w pamięci panelu hosta — wczytane z folderu na MacBooku.
 */

/** Stanowisko jako klucz w bazie: '1' | '2' | '3'. */
export type StationKey = '1' | '2' | '3'
export const STATION_KEYS: readonly StationKey[] = ['1', '2', '3']

// ---------- Plik pytania.json (tylko u hosta) ----------

export interface Round1Question {
  /** Hasło na tablicy, np. „Włoskie słońce”, „Królowa popu”. */
  haslo: string
  tytul: string
  wykonawca: string
  /** Nazwa pliku w tym samym folderze, np. „e01-r1-01.mp3”. */
  plik: string
  /** Sekunda, od której gra fragment (domyślnie 0 — początek utworu). */
  start: number
}

export interface QuestionSet {
  edycja: string
  runda1: Round1Question[]
}

// ---------- Stan w bazie (/gra) ----------

/**
 * Fazy jednej piosenki:
 * wybrane  → host kliknął kafelek, piosenka jeszcze nie gra
 * gra      → muzyka gra, licznik rośnie, przyciski aktywne
 * odpowiedz→ ktoś się zgłosił, ma 10 s na tytuł
 * brak     → minęło 15 s albo wszyscy się pomylili; czeka na odsłonięcie
 * odslona  → tytuł odsłonięty, widać wynik
 */
export type Phase = 'wybrane' | 'gra' | 'odpowiedz' | 'brak' | 'odslona'

export type TileState = 'ukryte' | 'odgadniete' | 'nieodgadniete'

export interface Round1Tile {
  haslo: string
  stan: TileState
  /** Kto odgadł (tylko gdy stan = odgadniete). */
  stanowisko?: StationKey
  punkty?: number
  /** Odsłaniane dopiero po zakończeniu hasła. */
  tytul?: string
  wykonawca?: string
}

export interface Round1State {
  hasla: Round1Tile[]
  /** Kto wybiera następne hasło. */
  wybiera?: StationKey
}

export interface LiveQuestion {
  /** Indeks hasła na tablicy (0–4). */
  haslo: number
  faza: Phase
  /** Czas serwera, kiedy muzyka zaczęła grać (od nowa po złej odpowiedzi). */
  start?: number
  /** Czas serwera, kiedy zaczęło się odliczanie 10 s na odpowiedź. */
  odpowiedzStart?: number
  /** Kto aktualnie odpowiada i za ile punktów. */
  odpowiada?: StationKey
  wartosc?: number
  /** Stanowiska zablokowane do końca tej piosenki. */
  zablokowane?: Partial<Record<StationKey, true>>
  /** Wynik po odsłonięciu. */
  wynik?: { stanowisko?: StationKey; punkty?: number; tytul: string; wykonawca: string }
}

export interface Buzz {
  stanowisko: StationKey
  czas: number
}

export interface GameState {
  runda?: number
  punkty: Record<StationKey, number>
  runda1?: Round1State
  pytanie?: LiveQuestion
  zgloszenie?: Buzz
}
